import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowUpRight, CheckCircle2, Copy, Check, ExternalLink, Globe } from 'lucide-react';
import Layout from '../components/common/Layout.jsx';
import StatusBadge from '../components/common/StatusBadge.jsx';
import { projectsService, websitesService, publishingService } from '../services/index.js';
import { useToast } from '../context/ToastContext.jsx';

export default function PublishPage() {
  const { id: projectId } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [project, setProject] = useState(null);
  const [website, setWebsite] = useState(null);
  const [versions, setVersions] = useState([]);
  const [publishing, setPublishing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [publishedUrl, setPublishedUrl] = useState('');

  const loadData = async () => {
    try {
      const projRes = await projectsService.get(projectId);
      const proj = projRes?.data?.project;
      setProject(proj);

      let webId = proj?.currentWebsiteId?._id || proj?.currentWebsiteId;
      if (!webId) {
        navigate(`/projects/${projectId}/editor`);
        return;
      }

      const webRes = await websitesService.get(webId);
      const web = webRes?.data?.website;
      setWebsite(web);

      if (web?.slug) {
        setPublishedUrl(`${window.location.origin}/sites/${web.slug}`);
      }

      const vRes = await publishingService.getVersions(webId);
      setVersions(vRes?.data?.versions || []);
    } catch (err) {
      addToast({ type: 'error', message: err.message || 'Failed to load publishing data' });
    }
  };

  useEffect(() => {
    loadData();
  }, [projectId]);

  const handlePublish = async () => {
    if (!website) return;
    setPublishing(true);
    try {
      const res = await publishingService.publish(website._id);
      const publicUrl = res?.data?.publicUrl || `${window.location.origin}/sites/${res?.data?.slug}`;
      setPublishedUrl(publicUrl);

      addToast({ type: 'success', message: 'Website published successfully!' });
      await loadData();
    } catch (err) {
      addToast({ type: 'error', message: err.message || 'Publishing failed' });
    } finally {
      setPublishing(false);
    }
  };

  const handleCopyUrl = () => {
    if (!publishedUrl) return;
    navigator.clipboard.writeText(publishedUrl);
    setCopied(true);
    addToast({ type: 'info', message: 'Public URL copied to clipboard' });
    setTimeout(() => setCopied(false), 2000);
  };

  const isPublished = website?.status === 'published';

  return (
    <Layout breadcrumb={`Workspace / My websites / ${project?.businessId?.name || 'Publish'}`}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-ink">Ready to publish?</h1>
          <p className="text-sm text-ink-muted mt-0.5">
            Review your public page and choose a URL for this business.
          </p>
        </div>

        <div>
          {isPublished ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-success-light text-success border border-success/30">
              <CheckCircle2 className="w-4 h-4" />
              LIVE ON WEB
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-primary-light text-primary border border-primary/30">
              READY FOR REVIEW
            </span>
          )}
        </div>
      </div>

      {/* 2-Column Publishing Layout (UI Reference Page 6) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: WEBSITE PREVIEW (7 cols) */}
        <div className="lg:col-span-7 bg-surface p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-bold text-ink uppercase tracking-wider">
                WEBSITE PREVIEW
              </h2>
              <span className="text-[11px] font-semibold text-primary">
                {isPublished ? `VERSION ${versions.length}` : `DRAFT VERSION ${versions.length + 1}`}
              </span>
            </div>

            {/* Preview Frame */}
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
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

              {/* Sections Snapshot Preview */}
              <div className="p-8 bg-primary-light/30 border-b border-slate-100">
                <div className="text-[10px] font-bold text-primary uppercase tracking-wider mb-2">
                  PREVIEW CONTENT
                </div>
                <h3 className="text-xl font-bold text-ink mb-2">
                  {website?.sections?.find((s) => s.id === 'hero')?.content?.headline ||
                    'Your business website is ready for review.'}
                </h3>
                <p className="text-xs text-ink-muted mb-4 max-w-sm">
                  {website?.sections?.find((s) => s.id === 'hero')?.content?.subheadline ||
                    'Check every detail before publishing to customers.'}
                </p>
                <button className="px-3.5 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold shadow-sm">
                  {website?.sections?.find((s) => s.id === 'hero')?.content?.primaryCtaLabel ||
                    'View details'}
                </button>
              </div>

              <div className="p-6 grid grid-cols-2 gap-4">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                  <div className="text-xs font-bold text-ink mb-1">About</div>
                  <div className="text-[11px] text-ink-muted">Verified information only</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                  <div className="text-xs font-bold text-ink mb-1">Contact</div>
                  <div className="text-[11px] text-ink-muted">Only confirmed details</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: PUBLISH SETTINGS (5 cols) */}
        <div className="lg:col-span-5 bg-surface p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-xs font-bold text-ink uppercase tracking-wider mb-4">
              PUBLISH SETTINGS
            </h2>

            {/* Public website URL */}
            <div className="mb-6">
              <label className="block text-xs font-semibold text-ink-muted mb-1.5 uppercase tracking-wider">
                Public website URL
              </label>
              <div className="flex items-center gap-2">
                <div className="flex-1 flex items-center px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs text-ink font-mono overflow-hidden">
                  <span className="truncate">{publishedUrl}</span>
                </div>
                <button
                  onClick={handleCopyUrl}
                  className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-ink-muted hover:text-ink transition"
                  title="Copy URL"
                >
                  {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <div className="mt-2">
                <span className="text-[11px] font-semibold text-success bg-success-light px-2 py-0.5 rounded-full border border-success/30">
                  ✓ URL AVAILABLE
                </span>
              </div>
            </div>

            {/* Publishing checklist */}
            <div className="mb-6">
              <div className="text-xs font-bold text-ink mb-2">Publishing checklist</div>
              <div className="flex flex-col gap-2 text-xs text-ink">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-success" />
                  Business identity verified
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-success" />
                  Conflicting facts resolved
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-success" />
                  Website content saved
                </div>
              </div>
            </div>

            {/* Published version info */}
            <div className="mb-6 text-xs text-ink-muted">
              <span className="font-semibold text-ink">Published version:</span>{' '}
              {versions.length > 0
                ? `Version ${versions[0].versionNumber} (${new Date(
                    versions[0].publishedAt
                  ).toLocaleDateString()})`
                : 'No version published yet'}
            </div>

            {/* Publish action button */}
            <button
              onClick={handlePublish}
              disabled={publishing}
              className="w-full py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-sm transition flex items-center justify-center gap-2"
            >
              {publishing ? (
                'Creating version snapshot...'
              ) : isPublished ? (
                <>
                  Republish website <ArrowUpRight className="w-4 h-4" />
                </>
              ) : (
                <>
                  Publish website <ArrowUpRight className="w-4 h-4" />
                </>
              )}
            </button>

            {isPublished && (
              <a
                href={`/sites/${website?.slug}`}
                target="_blank"
                rel="noreferrer"
                className="mt-3 w-full py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-ink text-xs font-semibold shadow-sm transition flex items-center justify-center gap-2"
              >
                Open public website <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
