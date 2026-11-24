import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Clock, AlertCircle, ArrowRight, Store, Sparkles, RefreshCw } from 'lucide-react';
import Layout from '../components/common/Layout.jsx';
import StatusBadge from '../components/common/StatusBadge.jsx';
import { generationService, projectsService } from '../services/index.js';
import { useToast } from '../context/ToastContext.jsx';

export default function GenerationPage() {
  const { id: projectId } = useParams();
  const [searchParams] = useSearchParams();
  const jobId = searchParams.get('jobId');
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [project, setProject] = useState(null);
  const [job, setJob] = useState(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const pollJobStatus = async () => {
    try {
      if (jobId) {
        const res = await generationService.getJobStatus(jobId);
        const currentJob = res?.data?.job;
        setJob(currentJob);

        if (currentJob?.status === 'completed') {
          setIsCompleted(true);
        } else if (currentJob?.status === 'failed') {
          setErrorMsg(currentJob.error || 'AI Generation encountered an error');
        }
      }

      const pRes = await projectsService.get(projectId);
      const proj = pRes?.data?.project;
      setProject(proj);

      if (proj?.status === 'generated' || proj?.status === 'published') {
        setIsCompleted(true);
      }
    } catch (err) {
      console.warn('Poll error:', err.message);
    }
  };

  useEffect(() => {
    pollJobStatus();
    const interval = setInterval(() => {
      if (!isCompleted && !errorMsg) {
        pollJobStatus();
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [projectId, jobId, isCompleted, errorMsg]);

  const handleRetry = async () => {
    setErrorMsg(null);
    try {
      const res = await generationService.generate(projectId);
      const newJobId = res?.data?.jobId;
      addToast({ type: 'info', message: 'Retrying generation...' });
      navigate(`/projects/${projectId}/generate?jobId=${newJobId}`, { replace: true });
    } catch (err) {
      addToast({ type: 'error', message: err.message || 'Retry failed' });
    }
  };

  const steps = [
    { title: 'Business details verified', state: 'completed' },
    { title: 'Reading uploaded files', state: 'completed' },
    { title: 'Researching public sources', state: 'completed' },
    {
      title: 'Generating website sections',
      state: isCompleted ? 'completed' : errorMsg ? 'failed' : 'in_progress',
    },
    {
      title: 'Validating and saving',
      state: isCompleted ? 'completed' : 'queued',
    },
  ];

  return (
    <Layout breadcrumb="Workspace / My websites / Generate">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-ink">Your website is taking shape</h1>
          <p className="text-sm text-ink-muted mt-0.5">
            We are turning verified business information into editable website sections.
          </p>
        </div>

        <div>
          {isCompleted ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-success-light text-success border border-success/30">
              <CheckCircle2 className="w-4 h-4" />
              WEBSITE READY
            </span>
          ) : errorMsg ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-red-50 text-red-600 border border-red-200">
              <AlertCircle className="w-4 h-4" />
              FAILED
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-primary-light text-primary border border-primary/30">
              <Sparkles className="w-4 h-4 animate-spin" />
              GENERATING
            </span>
          )}
        </div>
      </div>

      {/* 2-Column Progress & Preview Layout (UI Reference Page 4) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: GENERATION PROGRESS (5 cols) */}
        <div className="lg:col-span-5 bg-surface p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xs font-bold text-ink uppercase tracking-wider">
                GENERATION PROGRESS
              </h2>
              <span className="text-[11px] font-mono font-semibold text-slate-400">
                Job #{jobId ? jobId.slice(-6).toUpperCase() : 'GEN-1042'}
              </span>
            </div>

            {/* Checklist */}
            <div className="flex flex-col gap-4 mb-6">
              {steps.map((st, i) => {
                const isStepCompleted = st.state === 'completed';
                const isStepInProgress = st.state === 'in_progress';
                const isStepFailed = st.state === 'failed';

                return (
                  <div key={i} className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {isStepCompleted && (
                        <div className="w-5 h-5 rounded-full bg-success text-white flex items-center justify-center">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </div>
                      )}
                      {isStepInProgress && (
                        <div className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center animate-pulse">
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        </div>
                      )}
                      {isStepFailed && (
                        <div className="w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center">
                          <AlertCircle className="w-3.5 h-3.5" />
                        </div>
                      )}
                      {st.state === 'queued' && (
                        <div className="w-5 h-5 rounded-full border border-slate-300 bg-white" />
                      )}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-ink leading-tight">{st.title}</div>
                      <div
                        className={`text-[11px] font-medium ${
                          isStepCompleted
                            ? 'text-success'
                            : isStepInProgress
                            ? 'text-primary'
                            : isStepFailed
                            ? 'text-red-500'
                            : 'text-slate-400'
                        }`}
                      >
                        {isStepCompleted
                          ? 'Completed'
                          : isStepInProgress
                          ? 'In progress'
                          : isStepFailed
                          ? 'Failed'
                          : 'Queued'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {errorMsg && (
              <div className="p-4 bg-red-50 rounded-xl border border-red-200 text-xs text-red-700 mb-4">
                <div className="font-bold mb-1">Generation paused:</div>
                <div>{errorMsg}</div>
                <button
                  onClick={handleRetry}
                  className="mt-3 px-4 py-1.5 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 transition"
                >
                  Retry Generation
                </button>
              </div>
            )}
          </div>

          <div>
            <div className="p-3 bg-primary-light/40 rounded-xl border border-primary/20 text-xs text-ink-muted mb-4">
              Your uploaded files and confirmed facts are saved.
            </div>

            {isCompleted && (
              <button
                onClick={() => navigate(`/projects/${projectId}/editor`)}
                className="w-full py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-sm transition flex items-center justify-center gap-2"
              >
                Open website editor <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Right Column: LIVE PREVIEW DRAFT (7 cols) */}
        <div className="lg:col-span-7 bg-surface p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-bold text-ink uppercase tracking-wider">LIVE PREVIEW</h2>
              <StatusBadge status="draft" label="DRAFT" />
            </div>

            {/* Mockup website frame */}
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-inner">
              {/* Fake browser header */}
              <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 font-bold text-ink">
                  <div className="w-5 h-5 rounded bg-primary/20 text-primary flex items-center justify-center text-[10px]">
                    S
                  </div>
                  {project?.businessId?.name || 'Business Name'}
                </div>
                <div className="flex gap-3 text-[11px] text-ink-muted">
                  <span>Home</span>
                  <span>About</span>
                  <span>Contact</span>
                </div>
              </div>

              {/* Fake hero section */}
              <div className="p-8 bg-primary-light/30 border-b border-slate-100">
                <div className="text-[10px] font-bold text-primary uppercase tracking-wider mb-2">
                  YOUR BUSINESS, ONLINE
                </div>
                <h3 className="text-xl font-bold text-ink mb-2 max-w-md">
                  A website headline built from your confirmed details.
                </h3>
                <p className="text-xs text-ink-muted mb-4 max-w-sm">
                  {project?.businessId?.description ||
                    'Your verified business introduction appears here.'}
                </p>
                <button className="px-3.5 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold shadow-sm">
                  Contact business
                </button>
              </div>

              {/* Fake blocks */}
              <div className="p-6 grid grid-cols-2 gap-4">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                  <div className="text-xs font-bold text-ink mb-1">About your business</div>
                  <div className="text-[11px] text-ink-muted">Based on verified facts</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                  <div className="text-xs font-bold text-ink mb-1">Products & services</div>
                  <div className="text-[11px] text-ink-muted">Added from your sources</div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 text-center">
            {isCompleted ? (
              <p className="text-xs text-success font-semibold">
                ✓ Ready for editing and publishing
              </p>
            ) : (
              <p className="text-xs text-slate-400">
                Live preview refreshes as sections are generated...
              </p>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
