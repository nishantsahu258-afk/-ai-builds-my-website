import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Link as LinkIcon, Image, Globe, RefreshCw, Ban, Search, ExternalLink } from 'lucide-react';
import Layout from '../components/common/Layout.jsx';
import StatusBadge from '../components/common/StatusBadge.jsx';
import { projectsService, sourcesService } from '../services/index.js';
import { useToast } from '../context/ToastContext.jsx';

export default function SourcesPage() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [busyId, setBusyId] = useState(null);

  const loadAllSources = async () => {
    setLoading(true);
    try {
      const projRes = await projectsService.list();
      const projects = projRes?.data?.projects || [];

      const results = await Promise.all(
        projects.map(async (p) => {
          try {
            const sRes = await sourcesService.list(p._id);
            const list = sRes?.data?.sources || [];
            return list.map((src) => ({
              ...src,
              projectTitle: p.businessId?.name || p.title,
              projectId: p._id,
            }));
          } catch {
            return [];
          }
        })
      );

      setSources(results.flat().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
    } catch (err) {
      addToast({ type: 'error', message: err.message || 'Failed to load sources' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllSources();
  }, []);

  const handleRetry = async (sourceId) => {
    setBusyId(sourceId);
    try {
      const res = await sourcesService.retry(sourceId);
      const updated = res?.data;
      setSources((prev) =>
        prev.map((s) => (s._id === sourceId ? { ...s, ...updated } : s))
      );
      addToast({ type: 'success', message: 'Source re-queued for extraction' });
    } catch (err) {
      addToast({ type: 'error', message: err.message || 'Could not retry source' });
    } finally {
      setBusyId(null);
    }
  };

  const handleExclude = async (sourceId) => {
    setBusyId(sourceId);
    try {
      const res = await sourcesService.exclude(sourceId);
      const updated = res?.data;
      setSources((prev) =>
        prev.map((s) => (s._id === sourceId ? { ...s, ...updated, excluded: true } : s))
      );
      addToast({ type: 'success', message: 'Source excluded from generation' });
    } catch (err) {
      addToast({ type: 'error', message: err.message || 'Could not exclude source' });
    } finally {
      setBusyId(null);
    }
  };

  const filteredSources = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return sources.filter((s) => {
      if (statusFilter === 'excluded' && !s.excluded) return false;
      if (statusFilter !== 'all' && statusFilter !== 'excluded' && s.extractionStatus !== statusFilter) {
        return false;
      }
      if (!q) return true;
      const name = (s.fileName || s.url || s.title || s.type || '').toLowerCase();
      const proj = (s.projectTitle || '').toLowerCase();
      return name.includes(q) || proj.includes(q);
    });
  }, [sources, searchQuery, statusFilter]);

  const getTypeIcon = (type) => {
    if (type === 'image') return Image;
    if (type === 'website' || type === 'social' || type === 'google_listing') return LinkIcon;
    return FileText;
  };

  const getStatusBadgeProps = (status) => {
    if (status === 'completed') return { status: 'completed', label: 'Completed' };
    if (status === 'failed') return { status: 'failed', label: 'Failed' };
    if (status === 'processing' || status === 'pending') return { status: 'processing', label: status === 'pending' ? 'Pending' : 'Processing' };
    return { status: 'draft', label: status || 'Unknown' };
  };

  const getRelevanceBadgeProps = (relevance, excluded) => {
    if (excluded) return { status: 'draft', label: 'Excluded' };
    if (relevance === 'relevant') return { status: 'completed', label: 'Relevant' };
    if (relevance === 'mismatched') return { status: 'failed', label: 'Mismatched' };
    if (relevance === 'needs_review') return { status: 'warning', label: 'Needs review' };
    return { status: 'draft', label: relevance || 'Unassessed' };
  };

  return (
    <Layout breadcrumb="Workspace / Sources">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-ink">Sources</h1>
          <p className="text-sm text-ink-muted mt-0.5">
            All uploaded files, links, and business profiles across your projects.
          </p>
        </div>
        <button
          onClick={loadAllSources}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-surface hover:bg-slate-50 text-xs font-semibold text-ink transition self-start"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="bg-surface rounded-2xl border border-slate-200/80 p-4 mb-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by source name, URL, or project..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-slate-50/50"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {[
            { id: 'all', label: 'All' },
            { id: 'completed', label: 'Completed' },
            { id: 'failed', label: 'Failed' },
            { id: 'pending', label: 'Pending' },
            { id: 'excluded', label: 'Excluded' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                statusFilter === tab.id
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-slate-100 text-ink-muted hover:bg-slate-200/70'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-surface rounded-2xl border border-slate-200 p-5 h-20 animate-pulse" />
          ))}
        </div>
      ) : filteredSources.length === 0 ? (
        <div className="bg-surface rounded-2xl border border-dashed border-slate-300 p-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-primary-light text-primary flex items-center justify-center mx-auto mb-3">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-ink mb-1">No sources found</h3>
          <p className="text-sm text-ink-muted max-w-sm mx-auto">
            {sources.length === 0
              ? 'Upload a PDF/image or add a website link when creating a project to see sources here.'
              : 'No sources match your current filter.'}
          </p>
        </div>
      ) : (
        <div className="bg-surface rounded-2xl border border-slate-200/80 shadow-sm overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200/80 text-[11px] font-bold text-ink-muted uppercase tracking-wider bg-slate-50/60">
                <th className="py-3.5 px-4">Source</th>
                <th className="py-3.5 px-4">Type</th>
                <th className="py-3.5 px-4">Project</th>
                <th className="py-3.5 px-4">Extraction</th>
                <th className="py-3.5 px-4">Relevance</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredSources.map((src) => {
                const Icon = getTypeIcon(src.type);
                const sourceName = src.fileName || src.url || src.title || 'Manual business input';
                const statusBadge = getStatusBadgeProps(src.extractionStatus);
                const relevanceBadge = getRelevanceBadgeProps(src.relevance, src.excluded);

                return (
                  <tr key={src._id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-primary-light text-primary flex items-center justify-center flex-shrink-0">
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-ink truncate" title={sourceName}>
                            {sourceName}
                          </div>
                          {src.errorMessage && (
                            <div className="text-[11px] text-red-600 truncate" title={src.errorMessage}>
                              {src.errorMessage}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-xs font-medium text-ink-muted uppercase">
                      {src.type}
                    </td>
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => navigate(`/projects/${src.projectId}/verify`)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                      >
                        <Globe className="w-3.5 h-3.5" />
                        {src.projectTitle}
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={statusBadge.status} label={statusBadge.label} />
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={relevanceBadge.status} label={relevanceBadge.label} />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        {src.type !== 'manual' && (
                          <button
                            onClick={() => handleRetry(src._id)}
                            disabled={busyId === src._id}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-semibold text-ink hover:bg-slate-100 disabled:opacity-50 transition"
                          >
                            <RefreshCw className={`w-3 h-3 ${busyId === src._id ? 'animate-spin' : ''}`} />
                            Retry
                          </button>
                        )}
                        {!src.excluded && src.type !== 'manual' && (
                          <button
                            onClick={() => handleExclude(src._id)}
                            disabled={busyId === src._id}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-red-200 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50 transition"
                          >
                            <Ban className="w-3 h-3" />
                            Exclude
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Layout>
  );
}
