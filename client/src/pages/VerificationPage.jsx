import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, AlertTriangle, FileText, Globe, RefreshCw, ArrowRight, Plus, MapPin } from 'lucide-react';
import Layout from '../components/common/Layout.jsx';
import StatusBadge from '../components/common/StatusBadge.jsx';
import { factsService, sourcesService, projectsService, generationService } from '../services/index.js';
import { useToast } from '../context/ToastContext.jsx';

export default function VerificationPage() {
  const { id: projectId } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [project, setProject] = useState(null);
  const [sources, setSources] = useState([]);
  const [facts, setFacts] = useState([]);
  const [selectedConflictFact, setSelectedConflictFact] = useState(null);
  const [selectedCandidateIndex, setSelectedCandidateIndex] = useState(0);
  const [manualValue, setManualValue] = useState('');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const generationLockRef = useRef(false);

  // Manual fact addition
  const [showAddFact, setShowAddFact] = useState(false);
  const [newFactKey, setNewFactKey] = useState('phone');
  const [newFactValue, setNewFactValue] = useState('');

  const loadData = async () => {
    try {
      const [projRes, sourcesRes, factsRes] = await Promise.all([
        projectsService.get(projectId),
        sourcesService.list(projectId),
        factsService.list(projectId),
      ]);

      const proj = projRes?.data?.project;
      setProject(proj);
      setSources(sourcesRes?.data?.sources || []);

      const loadedFacts = factsRes?.data?.facts || [];
      setFacts(loadedFacts);

      // Auto-select the first conflict fact if none selected
      const firstConflict = loadedFacts.find((f) => f.status === 'conflict');
      if (firstConflict && !selectedConflictFact) {
        setSelectedConflictFact(firstConflict);
        setSelectedCandidateIndex(0);
      }
    } catch (err) {
      addToast({ type: 'error', message: err.message || 'Failed to load verification data' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 4000); // Polling while sources are extracted
    return () => clearInterval(interval);
  }, [projectId]);

  const conflicts = facts.filter((f) => f.status === 'conflict');
  const unverifiedFacts = facts.filter((f) => f.status === 'unverified');
  const confirmedFacts = facts.filter((f) => f.status === 'confirmed');
  const confirmedCount = confirmedFacts.length;
  const manualConfirmedCount = confirmedFacts.filter((f) =>
    f.candidates?.some((c) => c.extractionMethod === 'manual')
  ).length;
  const blockingSources = sources.filter(
    (s) =>
      !s.excluded &&
      (s.relevance !== 'relevant' || ['pending', 'processing', 'failed'].includes(s.extractionStatus))
  );
  const allVerifiedAndReady =
    facts.length > 0 &&
    confirmedCount > 0 &&
    conflicts.length === 0 &&
    unverifiedFacts.length === 0 &&
    blockingSources.length === 0;

  const handleConfirmConflict = async () => {
    if (!selectedConflictFact) return;

    let chosenValue = null;
    if (manualValue.trim()) {
      chosenValue = manualValue.trim();
    } else {
      const candidate = selectedConflictFact.candidates?.[selectedCandidateIndex];
      chosenValue = candidate?.value || selectedConflictFact.selectedValue;
    }

    try {
      await factsService.confirm(selectedConflictFact._id, { value: chosenValue });
      addToast({ type: 'success', message: `Confirmed "${selectedConflictFact.key}"` });
      setManualValue('');

      // Refresh facts and select next conflict if any
      const updatedFactsRes = await factsService.list(projectId);
      const updatedFacts = updatedFactsRes?.data?.facts || [];
      setFacts(updatedFacts);

      const nextConflict = updatedFacts.find((f) => f.status === 'conflict');
      setSelectedConflictFact(nextConflict || null);
      setSelectedCandidateIndex(0);
    } catch (err) {
      addToast({ type: 'error', message: err.message || 'Failed to confirm fact' });
    }
  };

  const handleDirectConfirm = async (factId, value) => {
    try {
      await factsService.confirm(factId, { value });
      addToast({ type: 'success', message: 'Fact confirmed' });
      await loadData();
    } catch (err) {
      addToast({ type: 'error', message: err.message || 'Confirmation failed' });
    }
  };

  const handleDirectReject = async (factId) => {
    try {
      await factsService.reject(factId);
      addToast({ type: 'info', message: 'Fact rejected' });
      await loadData();
    } catch (err) {
      addToast({ type: 'error', message: err.message || 'Rejection failed' });
    }
  };

  const handleRetrySource = async (sourceId) => {
    try {
      await sourcesService.retry(sourceId);
      addToast({ type: 'info', message: 'Source re-queued for extraction' });
      await loadData();
    } catch (err) {
      addToast({ type: 'error', message: err.message || 'Could not retry source' });
    }
  };

  const handleExcludeSource = async (sourceId) => {
    try {
      await sourcesService.exclude(sourceId);
      addToast({ type: 'success', message: 'Source excluded from generation' });
      await loadData();
    } catch (err) {
      addToast({ type: 'error', message: err.message || 'Could not exclude source' });
    }
  };

  const handleAddManualFact = async (e) => {
    e.preventDefault();
    if (!newFactValue.trim()) return;

    try {
      await factsService.addManual(projectId, { key: newFactKey, value: newFactValue.trim() });
      addToast({ type: 'success', message: `Added fact: ${newFactKey}` });
      setNewFactValue('');
      setShowAddFact(false);
      await loadData();
    } catch (err) {
      addToast({ type: 'error', message: err.message || 'Failed to add fact' });
    }
  };

  const handleStartGeneration = async (manualOnly = false) => {
    if (generationLockRef.current || generating) return;

    if (!manualOnly) {
      if (conflicts.length > 0) {
        addToast({
          type: 'warning',
          message: `Please resolve ${conflicts.length} conflicting facts before generating`,
        });
        return;
      }
      if (unverifiedFacts.length > 0) {
        addToast({
          type: 'warning',
          message: `Please confirm or reject ${unverifiedFacts.length} unverified facts before generating`,
        });
        return;
      }
      if (blockingSources.length > 0) {
        addToast({
          type: 'warning',
          message: 'Retry or exclude failed/mismatched sources, or choose Manual-only generation.',
        });
        return;
      }
    }

    generationLockRef.current = true;
    setGenerating(true);
    try {
      const genRes = await generationService.generate(projectId, { manualOnly });
      const jobId = genRes?.data?.jobId;
      addToast({
        type: 'success',
        message: manualOnly ? 'Manual-only generation started!' : 'Generation started!',
      });
      navigate(`/projects/${projectId}/generate?jobId=${jobId}${manualOnly ? '&manualOnly=true' : ''}`);
    } catch (err) {
      const code = err?.code;
      const msg =
        code === 'AI_RATE_LIMITED'
          ? 'AI generation rate limit reached. Please wait a few minutes before generating again.'
          : code === 'APP_RATE_LIMITED'
          ? 'Too many API requests. Please wait a moment and try again.'
          : err?.message || 'Generation failed';
      addToast({ type: 'error', message: msg });
      generationLockRef.current = false;
      setGenerating(false);
    }
  };

  return (
    <Layout breadcrumb="Workspace / My websites / Verify">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-ink">Review business information</h1>
          <p className="text-sm text-ink-muted mt-0.5">
            We found details across your submitted sources. Confirm what is correct.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {loading ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-primary-light text-primary border border-primary/30">
              <RefreshCw className="w-4 h-4 animate-spin" />
              Loading facts…
            </span>
          ) : facts.length === 0 ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-warning-light text-warning border border-warning/30">
              <AlertTriangle className="w-4 h-4" />
              No facts available – add manually or wait for extraction
            </span>
          ) : conflicts.length > 0 || unverifiedFacts.length > 0 ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-warning-light text-warning border border-warning/30">
              <AlertTriangle className="w-4 h-4" />
              {confirmedCount} Confirmed • {unverifiedFacts.length} Unverified • {conflicts.length} Conflicts
            </span>
          ) : blockingSources.length > 0 ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-warning-light text-warning border border-warning/30">
              <AlertTriangle className="w-4 h-4" />
              {blockingSources.length} Source(s) Need Review
            </span>
          ) : allVerifiedAndReady ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-success-light text-success border border-success/30">
              <CheckCircle2 className="w-4 h-4" />
              ALL FACTS VERIFIED ({confirmedCount})
            </span>
          ) : null}

          <button
            onClick={() => handleStartGeneration(false)}
            disabled={generating || !allVerifiedAndReady}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-sm transition disabled:opacity-40"
          >
            {generating ? 'Starting...' : 'Generate website →'}
          </button>
        </div>
      </div>

      {/* 3-Column Layout (UI Reference Page 3) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Column 1: SOURCES (3 cols) */}
        <div className="lg:col-span-3 bg-surface p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-bold text-ink uppercase tracking-wider">SOURCES</h2>
              <span className="w-5 h-5 rounded-full bg-slate-100 text-ink text-xs font-bold flex items-center justify-center">
                {sources.length + 1}
              </span>
            </div>

            <div className="flex flex-col gap-3">
              {/* Initial profile source */}
              <div className="p-3 rounded-xl border border-slate-200/80 bg-slate-50/50">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-xs text-ink">Business profile</span>
                  <span className="text-[10px] font-semibold text-success">Completed</span>
                </div>
                <div className="text-[11px] text-ink-muted">Manual input</div>
              </div>

              {/* Dynamic sources */}
              {sources.map((src) => {
                const isCompleted = src.extractionStatus === 'completed';
                const isFailed = src.extractionStatus === 'failed';
                const isMismatched = src.relevance === 'mismatched';
                const isExcluded = Boolean(src.excluded);

                const badgeLabel = isExcluded
                  ? 'Excluded'
                  : isFailed
                  ? 'Failed'
                  : isMismatched
                  ? 'Mismatched'
                  : src.relevance === 'needs_review'
                  ? 'Needs review'
                  : isCompleted
                  ? 'Relevant'
                  : 'Processing';

                const badgeClass = isExcluded
                  ? 'text-slate-500'
                  : isFailed || isMismatched
                  ? 'text-red-600'
                  : src.relevance === 'needs_review'
                  ? 'text-warning'
                  : isCompleted
                  ? 'text-success'
                  : 'text-primary';

                return (
                  <div
                    key={src._id}
                    className={`p-3 rounded-xl border ${
                      isExcluded
                        ? 'border-slate-200/60 bg-slate-100/60 opacity-75'
                        : isFailed || isMismatched
                        ? 'border-red-200 bg-red-50/40'
                        : 'border-slate-200/80 bg-slate-50/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1 gap-2">
                      <span className="font-semibold text-xs text-ink truncate max-w-[130px]">
                        {src.originalFileName || src.type.replace('_', ' ')}
                      </span>
                      <span className={`text-[10px] font-semibold ${badgeClass}`}>
                        {badgeLabel}
                      </span>
                    </div>
                    <div className="text-[11px] text-ink-muted truncate mb-1">
                      {src.url || `${src.mimeType || 'Uploaded file'}`}
                    </div>
                    {(src.relevanceReason || src.errorMessage) && (
                      <div className="text-[10px] text-red-600/90 leading-snug mb-2">
                        {src.errorMessage || src.relevanceReason}
                      </div>
                    )}
                    {src.type !== 'manual' && (
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => handleRetrySource(src._id)}
                          className="text-[10px] font-semibold text-primary hover:underline"
                        >
                          Retry
                        </button>
                        {!isExcluded && (
                          <button
                            type="button"
                            onClick={() => handleExcludeSource(src._id)}
                            className="text-[10px] font-semibold text-red-600 hover:underline"
                          >
                            Exclude
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-ink-muted flex items-center gap-1.5">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-primary" />
            Live sync with background jobs
          </div>
        </div>

        {/* Column 2: EXTRACTED FACTS (5 cols) */}
        <div className="lg:col-span-5 bg-surface p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-bold text-ink uppercase tracking-wider">
              EXTRACTED FACTS
            </h2>
            <span className="text-[11px] font-semibold text-success">Source-backed</span>
          </div>

          <div className="flex flex-col gap-3">
            {facts.length === 0 ? (
              <div className="text-center py-8 text-xs text-ink-muted">
                Extracting facts from sources...
              </div>
            ) : (
              facts.map((fact) => {
                const isConflict = fact.status === 'conflict';
                const isConfirmed = fact.status === 'confirmed';
                const isSelected = selectedConflictFact?._id === fact._id;

                return (
                  <div
                    key={fact._id}
                    onClick={() => isConflict && setSelectedConflictFact(fact)}
                    className={`p-3.5 rounded-xl border transition cursor-pointer ${
                      isSelected
                        ? 'border-primary ring-2 ring-primary/20 bg-primary-light/10'
                        : isConflict
                        ? 'border-warning/40 bg-warning-light/30'
                        : 'border-slate-200/80 hover:bg-slate-50/50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <span className="text-xs font-semibold text-ink-muted capitalize">
                        {fact.key.replace(/([A-Z])/g, ' $1')}
                      </span>
                      <StatusBadge status={fact.status} />
                    </div>

                    <div className="text-sm font-bold text-ink">
                      {isConflict ? (
                        <span className="text-warning text-xs font-semibold">
                          {fact.candidates?.length || 2} different values found
                        </span>
                      ) : Array.isArray(fact.selectedValue) ? (
                        fact.selectedValue.join(', ')
                      ) : (
                        String(fact.selectedValue || 'Not specified')
                      )}
                    </div>

                    {/* Excerpt if available */}
                    {isConflict && fact.candidates && (
                      <div className="mt-2 text-[11px] text-ink-muted flex flex-col gap-1 border-t border-warning/20 pt-1.5">
                        {fact.candidates.slice(0, 2).map((cand, idx) => (
                          <div key={idx} className="truncate">
                            <span className="font-semibold text-ink">
                              {cand.sourceURL ? 'Web/Social' : 'Source'}:
                            </span>{' '}
                            {String(cand.value)}
                          </div>
                        ))}
                      </div>
                    )}

                    {!isConflict && !isConfirmed && fact.status !== 'rejected' && (
                      <div className="mt-2 flex items-center gap-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDirectConfirm(fact._id, fact.selectedValue);
                          }}
                          className="text-[11px] text-primary hover:underline font-semibold"
                        >
                          ✓ Confirm this value
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDirectReject(fact._id);
                          }}
                          className="text-[11px] text-red-600 hover:underline font-semibold"
                        >
                          ✕ Reject
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}

            {/* Manual Fact Add Button */}
            <button
              onClick={() => setShowAddFact(!showAddFact)}
              className="mt-2 text-xs font-semibold text-primary hover:text-primary-hover flex items-center justify-center gap-1.5 py-2 rounded-xl border border-dashed border-primary/40 hover:bg-primary-light/20 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              Add custom business detail
            </button>

            {showAddFact && (
              <form onSubmit={handleAddManualFact} className="p-3 bg-slate-50 rounded-xl border border-slate-200 mt-2 flex flex-col gap-2">
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={newFactKey}
                    onChange={(e) => setNewFactKey(e.target.value)}
                    className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200"
                  >
                    <option value="phone">Phone number</option>
                    <option value="email">Email</option>
                    <option value="address">Address</option>
                    <option value="hours">Business hours</option>
                    <option value="services">Services</option>
                  </select>
                  <input
                    type="text"
                    required
                    placeholder="Enter value..."
                    value={newFactValue}
                    onChange={(e) => setNewFactValue(e.target.value)}
                    className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200"
                  />
                </div>
                <button
                  type="submit"
                  className="py-1.5 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary-hover transition"
                >
                  Save & confirm
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Column 3: ACTION REQUIRED (4 cols) */}
        <div className="lg:col-span-4 bg-surface p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="mb-4">
              <span className="text-[10px] font-bold text-ink-muted uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200">
                ACTION REQUIRED
              </span>
            </div>

            {selectedConflictFact ? (
              <div>
                <div className="text-[11px] font-bold text-primary uppercase tracking-wider mb-1">
                  {selectedConflictFact.key}
                </div>
                <h3 className="text-sm font-bold text-ink mb-4">
                  Which {selectedConflictFact.key} should appear on the website?
                </h3>

                {/* Candidate choices */}
                <div className="flex flex-col gap-2.5 mb-4">
                  {selectedConflictFact.candidates?.map((candidate, idx) => {
                    const isSelected = selectedCandidateIndex === idx && !manualValue;

                    return (
                      <div
                        key={idx}
                        onClick={() => {
                          setSelectedCandidateIndex(idx);
                          setManualValue('');
                        }}
                        className={`p-3 rounded-xl border transition cursor-pointer flex items-start gap-3 ${
                          isSelected
                            ? 'border-primary ring-2 ring-primary/20 bg-primary-light/10'
                            : 'border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="candidateChoice"
                          checked={isSelected}
                          onChange={() => {
                            setSelectedCandidateIndex(idx);
                            setManualValue('');
                          }}
                          className="mt-0.5 text-primary focus:ring-primary"
                        />
                        <div className="flex-1">
                          <div className="text-xs font-bold text-ink">
                            {String(candidate.value)}
                          </div>
                          <div className="text-[11px] text-ink-muted mt-0.5">
                            {candidate.sourceURL ? 'From online link' : candidate.evidenceExcerpt || 'From document'}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Manual entry option */}
                  <div className="mt-2">
                    <label className="block text-[11px] font-semibold text-ink-muted mb-1">
                      Or type a custom value:
                    </label>
                    <input
                      type="text"
                      value={manualValue}
                      onChange={(e) => setManualValue(e.target.value)}
                      placeholder="Enter verified correct value..."
                      className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>
                </div>

                <button
                  onClick={handleConfirmConflict}
                  className="w-full py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-sm transition"
                >
                  Confirm selection
                </button>
                <p className="text-[11px] text-ink-muted text-center mt-2">
                  You can edit this later.
                </p>
              </div>
            ) : unverifiedFacts.length > 0 ? (
              <div className="text-center py-8">
                <AlertTriangle className="w-8 h-8 text-warning mx-auto mb-2" />
                <h3 className="text-sm font-bold text-ink mb-1">
                  {unverifiedFacts.length} unverified fact{unverifiedFacts.length > 1 ? 's' : ''}
                </h3>
                <p className="text-xs text-ink-muted mb-5">
                  Review and confirm or reject each unverified fact before generating your website.
                </p>
              </div>
            ) : blockingSources.length > 0 ? (
              <div className="text-center py-8">
                <AlertTriangle className="w-8 h-8 text-warning mx-auto mb-2" />
                <h3 className="text-sm font-bold text-ink mb-1">
                  {blockingSources.length} source{blockingSources.length > 1 ? 's' : ''} need attention
                </h3>
                <p className="text-xs text-ink-muted mb-5">
                  Retry or exclude failed/mismatched sources in the left column, or generate using only your confirmed manual facts.
                </p>
                {manualConfirmedCount > 0 && (
                  <button
                    onClick={() => handleStartGeneration(true)}
                    disabled={generating}
                    className="w-full px-4 py-2.5 rounded-xl border border-primary text-primary hover:bg-primary-light/40 text-xs font-semibold transition"
                  >
                    Generate with Manual Facts Only →
                  </button>
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <CheckCircle2 className="w-8 h-8 text-success mx-auto mb-2" />
                <h3 className="text-sm font-bold text-ink mb-1">All facts verified</h3>
                <p className="text-xs text-ink-muted mb-5">
                  All {confirmedCount} facts are confirmed. You can proceed to AI generation.
                </p>
                <button
                  onClick={() => handleStartGeneration(false)}
                  disabled={generating || !allVerifiedAndReady}
                  className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-sm transition disabled:opacity-40"
                >
                  Generate website now →
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
