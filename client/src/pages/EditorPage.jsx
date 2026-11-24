import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Sparkles, Eye, ArrowUpRight, GripVertical, Check, RefreshCw, Save, CheckCircle2 } from 'lucide-react';
import Layout from '../components/common/Layout.jsx';
import StatusBadge from '../components/common/StatusBadge.jsx';
import { projectsService, websitesService } from '../services/index.js';
import { useToast } from '../context/ToastContext.jsx';

export default function EditorPage() {
  const { id: projectId } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [project, setProject] = useState(null);
  const [website, setWebsite] = useState(null);
  const [selectedSectionId, setSelectedSectionId] = useState('hero');
  const [editingContent, setEditingContent] = useState({});
  const [regenerating, setRegenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [customPrompt, setCustomPrompt] = useState('');

  const loadWebsiteData = async () => {
    try {
      const projRes = await projectsService.get(projectId);
      const proj = projRes?.data?.project;
      setProject(proj);

      let webId = proj?.currentWebsiteId?._id || proj?.currentWebsiteId;
      if (!webId) {
        addToast({ type: 'warning', message: 'No website generated yet. Generating now...' });
        navigate(`/projects/${projectId}/verify`);
        return;
      }

      const webRes = await websitesService.get(webId);
      const web = webRes?.data?.website;
      setWebsite(web);

      // Select first active section or hero
      const targetSec = web.sections.find((s) => s.id === selectedSectionId) || web.sections[0];
      if (targetSec) {
        setSelectedSectionId(targetSec.id);
        setEditingContent(targetSec.content || {});
      }
    } catch (err) {
      addToast({ type: 'error', message: err.message || 'Failed to load website' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWebsiteData();
  }, [projectId]);

  const selectedSection = website?.sections?.find((s) => s.id === selectedSectionId);

  const handleSelectSection = (sec) => {
    setSelectedSectionId(sec.id);
    setEditingContent(sec.content || {});
    setCustomPrompt('');
  };

  const handleContentChange = (field, value) => {
    setEditingContent((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSaveSection = async () => {
    if (!website || !selectedSectionId) return;
    setSaving(true);
    try {
      await websitesService.updateSection(website._id, selectedSectionId, {
        content: editingContent,
      });

      // Update local state
      setWebsite((prev) => ({
        ...prev,
        sections: prev.sections.map((s) =>
          s.id === selectedSectionId ? { ...s, content: editingContent } : s
        ),
      }));

      addToast({ type: 'success', message: 'Section changes saved' });
    } catch (err) {
      addToast({ type: 'error', message: err.message || 'Failed to save section' });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleSection = async (sectionId, e) => {
    e.stopPropagation();
    try {
      await websitesService.toggleSection(website._id, sectionId);
      setWebsite((prev) => ({
        ...prev,
        sections: prev.sections.map((s) =>
          s.id === sectionId ? { ...s, enabled: !s.enabled } : s
        ),
      }));
    } catch (err) {
      addToast({ type: 'error', message: 'Failed to toggle section' });
    }
  };

  const handleRegenerateSection = async () => {
    if (!website || !selectedSectionId) return;
    setRegenerating(true);
    try {
      const res = await websitesService.regenerateSection(
        website._id,
        selectedSectionId,
        customPrompt
      );

      const updatedSec = res?.data?.regeneratedSection;
      if (updatedSec) {
        setWebsite((prev) => ({
          ...prev,
          sections: prev.sections.map((s) => (s.id === selectedSectionId ? updatedSec : s)),
        }));
        setEditingContent(updatedSec.content || {});
      }

      addToast({
        type: 'success',
        message: `Regenerated "${selectedSection?.type || selectedSectionId}" without modifying other sections`,
      });
      setCustomPrompt('');
    } catch (err) {
      addToast({ type: 'error', message: err.message || 'Section regeneration failed' });
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <Layout breadcrumb={`Workspace / My websites / ${project?.businessId?.name || 'Editor'}`}>
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-ink">
              {project?.businessId?.name || 'Sharma Electronics'}
            </h1>
            <StatusBadge status="draft" label="DRAFT" />
          </div>
          <p className="text-xs text-ink-muted mt-0.5">
            Draft website / Last saved just now
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/projects/${projectId}/publish`)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-surface hover:bg-slate-50 text-ink text-xs font-semibold shadow-sm transition"
          >
            <Eye className="w-3.5 h-3.5" />
            Preview
          </button>

          <button
            onClick={() => navigate(`/projects/${projectId}/publish`)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-sm transition"
          >
            Publish <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 3-Column Visual Website Editor Layout (UI Reference Page 5) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Column 1: PAGE SECTIONS (3 cols) */}
        <div className="lg:col-span-3 bg-surface p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-bold text-ink uppercase tracking-wider">PAGE SECTIONS</h2>
            <span className="w-5 h-5 rounded-full bg-slate-100 text-ink text-xs font-bold flex items-center justify-center">
              {website?.sections?.length || 8}
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            {website?.sections?.map((sec) => {
              const isSelected = selectedSectionId === sec.id;

              return (
                <div
                  key={sec.id}
                  onClick={() => handleSelectSection(sec)}
                  className={`flex items-center justify-between p-3 rounded-xl border transition cursor-pointer ${
                    isSelected
                      ? 'bg-primary-light/40 border-primary text-primary font-bold'
                      : 'border-slate-100 hover:bg-slate-50 text-ink font-medium'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={sec.enabled}
                      onChange={(e) => handleToggleSection(sec.id, e)}
                      className="rounded text-primary focus:ring-primary cursor-pointer"
                    />
                    <span className="text-xs capitalize">{sec.id || sec.type}</span>
                  </div>
                  <GripVertical className="w-4 h-4 text-slate-300" />
                </div>
              );
            })}
          </div>
        </div>

        {/* Column 2: PAGE PREVIEW (5 cols) */}
        <div className="lg:col-span-5 bg-surface p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-bold text-ink uppercase tracking-wider">PAGE PREVIEW</h2>
            <span className="text-[10px] font-bold tracking-wider px-2 py-0.5 rounded bg-slate-100 text-ink-muted uppercase">
              DESKTOP
            </span>
          </div>

          {/* Interactive preview iframe/frame */}
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm flex flex-col min-h-[500px]">
            {/* Header/Navbar */}
            <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 font-bold text-ink">
                <div className="w-5 h-5 rounded bg-primary/20 text-primary flex items-center justify-center text-[10px]">
                  S
                </div>
                {project?.businessId?.name || 'Sharma Electronics'}
              </div>
              <div className="flex gap-2 text-[10px] text-ink-muted">
                <span>Home</span>
                <span>About</span>
                <span>Contact</span>
              </div>
            </div>

            {/* Dynamic sections rendering */}
            <div className="p-4 flex flex-col gap-4 overflow-y-auto max-h-[550px] custom-scrollbar">
              {website?.sections
                ?.filter((s) => s.enabled)
                .map((sec) => {
                  const isFocused = sec.id === selectedSectionId;

                  if (sec.type === 'hero') {
                    return (
                      <div
                        key={sec.id}
                        onClick={() => handleSelectSection(sec)}
                        className={`p-6 rounded-xl transition cursor-pointer ${
                          isFocused
                            ? 'ring-2 ring-primary bg-primary-light/40 border border-primary'
                            : 'bg-primary-light/20 border border-primary/10'
                        }`}
                      >
                        <div className="text-[9px] font-bold text-primary uppercase tracking-wider mb-1">
                          HERO SECTION
                        </div>
                        <h3 className="text-lg font-bold text-ink mb-1.5">
                          {sec.content?.headline || 'Your headline goes here'}
                        </h3>
                        <p className="text-xs text-ink-muted mb-3">
                          {sec.content?.subheadline ||
                            'A short description based on confirmed business information.'}
                        </p>
                        <button className="px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold shadow-sm">
                          {sec.content?.primaryCtaLabel || 'Primary action'}
                        </button>
                      </div>
                    );
                  }

                  if (sec.type === 'about') {
                    return (
                      <div
                        key={sec.id}
                        onClick={() => handleSelectSection(sec)}
                        className={`p-4 rounded-xl border transition cursor-pointer ${
                          isFocused
                            ? 'ring-2 ring-primary bg-slate-50 border-primary'
                            : 'bg-slate-50/50 border-slate-200'
                        }`}
                      >
                        <div className="text-xs font-bold text-ink mb-1">
                          {sec.content?.heading || 'About Us'}
                        </div>
                        <p className="text-xs text-ink-muted leading-relaxed">
                          {sec.content?.description ||
                            'Verified business story and details provided by business owner.'}
                        </p>
                      </div>
                    );
                  }

                  if (sec.type === 'services') {
                    return (
                      <div
                        key={sec.id}
                        onClick={() => handleSelectSection(sec)}
                        className={`p-4 rounded-xl border transition cursor-pointer ${
                          isFocused
                            ? 'ring-2 ring-primary bg-slate-50 border-primary'
                            : 'bg-slate-50/50 border-slate-200'
                        }`}
                      >
                        <div className="text-xs font-bold text-ink mb-2">
                          {sec.content?.heading || 'Services & Offerings'}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {sec.content?.items?.map((item, idx) => (
                            <div key={idx} className="p-2 bg-white rounded border border-slate-200 text-xs">
                              <div className="font-semibold text-ink">{item.title}</div>
                              <div className="text-[10px] text-ink-muted">{item.description}</div>
                            </div>
                          )) || (
                            <div className="text-xs text-ink-muted">Confirmed services appear here</div>
                          )}
                        </div>
                      </div>
                    );
                  }

                  if (sec.type === 'contact') {
                    return (
                      <div
                        key={sec.id}
                        onClick={() => handleSelectSection(sec)}
                        className={`p-4 rounded-xl border transition cursor-pointer ${
                          isFocused
                            ? 'ring-2 ring-primary bg-slate-50 border-primary'
                            : 'bg-slate-50/50 border-slate-200'
                        }`}
                      >
                        <div className="text-xs font-bold text-ink mb-2">
                          {sec.content?.heading || 'Contact'}
                        </div>
                        <div className="text-xs text-ink-muted flex flex-col gap-1">
                          {sec.content?.phone && <div>📞 {sec.content.phone}</div>}
                          {sec.content?.email && <div>✉️ {sec.content.email}</div>}
                          {sec.content?.address && <div>📍 {sec.content.address}</div>}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={sec.id}
                      onClick={() => handleSelectSection(sec)}
                      className={`p-3 rounded-xl border text-xs text-ink transition cursor-pointer ${
                        isFocused ? 'ring-2 ring-primary border-primary' : 'border-slate-200 bg-slate-50'
                      }`}
                    >
                      <div className="font-bold capitalize">{sec.id}</div>
                      <div className="text-ink-muted text-[11px] mt-0.5">Section enabled and verified</div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>

        {/* Column 3: EDIT SECTION (4 cols) */}
        <div className="lg:col-span-4 bg-surface p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-bold text-ink uppercase tracking-wider">
              EDIT {selectedSection?.id?.toUpperCase() || 'SECTION'}
            </h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-success-light text-success border border-success/30">
              FACT-SAFE
            </span>
          </div>

          <div className="flex flex-col gap-4">
            {/* Dynamic form controls based on selected section */}
            {selectedSection?.type === 'hero' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-ink-muted mb-1.5 uppercase tracking-wider">
                    Headline
                  </label>
                  <input
                    type="text"
                    value={editingContent.headline || ''}
                    onChange={(e) => handleContentChange('headline', e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink-muted mb-1.5 uppercase tracking-wider">
                    Subheading
                  </label>
                  <textarea
                    rows={3}
                    value={editingContent.subheadline || ''}
                    onChange={(e) => handleContentChange('subheadline', e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink-muted mb-1.5 uppercase tracking-wider">
                    Primary button label
                  </label>
                  <input
                    type="text"
                    value={editingContent.primaryCtaLabel || ''}
                    onChange={(e) => handleContentChange('primaryCtaLabel', e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
              </>
            )}

            {selectedSection?.type === 'about' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-ink-muted mb-1.5 uppercase tracking-wider">
                    Heading
                  </label>
                  <input
                    type="text"
                    value={editingContent.heading || ''}
                    onChange={(e) => handleContentChange('heading', e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink-muted mb-1.5 uppercase tracking-wider">
                    Description
                  </label>
                  <textarea
                    rows={4}
                    value={editingContent.description || ''}
                    onChange={(e) => handleContentChange('description', e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
              </>
            )}

            {selectedSection?.type === 'contact' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-ink-muted mb-1.5 uppercase tracking-wider">
                    Phone
                  </label>
                  <input
                    type="text"
                    value={editingContent.phone || ''}
                    onChange={(e) => handleContentChange('phone', e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink-muted mb-1.5 uppercase tracking-wider">
                    Email
                  </label>
                  <input
                    type="text"
                    value={editingContent.email || ''}
                    onChange={(e) => handleContentChange('email', e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink-muted mb-1.5 uppercase tracking-wider">
                    Address
                  </label>
                  <input
                    type="text"
                    value={editingContent.address || ''}
                    onChange={(e) => handleContentChange('address', e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
                  />
                </div>
              </>
            )}

            {/* Save Button */}
            <button
              onClick={handleSaveSection}
              disabled={saving}
              className="w-full py-2.5 rounded-xl border border-slate-200 bg-surface hover:bg-slate-50 text-ink text-xs font-semibold shadow-sm transition flex items-center justify-center gap-2"
            >
              <Save className="w-3.5 h-3.5 text-primary" />
              {saving ? 'Saving...' : 'Save changes'}
            </button>

            {/* AI Regeneration Area */}
            <div className="pt-4 border-t border-slate-100 flex flex-col gap-2">
              <label className="block text-[11px] font-semibold text-ink-muted">
                AI Instructions (Optional tone/style):
              </label>
              <input
                type="text"
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="e.g. Make it more welcoming and modern..."
                className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-primary"
              />

              <button
                onClick={handleRegenerateSection}
                disabled={regenerating}
                className="w-full py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-sm transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {regenerating ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Regenerating with Gemini...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    ✦ Regenerate this section
                  </>
                )}
              </button>
              <p className="text-[10px] text-ink-muted text-center mt-1">
                Only replaces this section. All other sections stay untouched.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
