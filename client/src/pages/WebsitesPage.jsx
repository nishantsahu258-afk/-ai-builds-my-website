import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Store, Edit, CheckCircle2, Trash2, Globe } from 'lucide-react';
import Layout from '../components/common/Layout.jsx';
import StatusBadge from '../components/common/StatusBadge.jsx';
import { projectsService } from '../services/index.js';
import { useToast } from '../context/ToastContext.jsx';

export default function WebsitesPage() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    async function load() {
      try {
        const res = await projectsService.list();
        setProjects(res?.data?.projects || []);
      } catch (err) {
        addToast({ type: 'error', message: err.message || 'Failed to load websites' });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [addToast]);

  const filteredProjects = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return projects.filter((p) => {
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'published' && p.status === 'published') ||
        (statusFilter === 'generated' && p.status === 'generated') ||
        (statusFilter === 'draft' && (p.status === 'draft' || p.status === 'review'));

      if (!matchesStatus) return false;
      if (!q) return true;

      const businessName = (p.businessId?.name || p.title || '').toLowerCase();
      const city = (p.businessId?.city || '').toLowerCase();
      const category = (p.businessId?.category || '').toLowerCase();
      return businessName.includes(q) || city.includes(q) || category.includes(q);
    });
  }, [projects, searchQuery, statusFilter]);

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this website project?')) return;
    try {
      await projectsService.delete(id);
      setProjects((prev) => prev.filter((p) => p._id !== id));
      addToast({ type: 'success', message: 'Project deleted' });
    } catch (err) {
      addToast({ type: 'error', message: err.message || 'Could not delete project' });
    }
  };

  const getOpenPath = (project) => {
    if (project.status === 'generated' || project.status === 'published') {
      return `/projects/${project._id}/editor`;
    }
    return `/projects/${project._id}/verify`;
  };

  return (
    <Layout breadcrumb="Workspace / Websites">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-ink">Websites</h1>
          <p className="text-sm text-ink-muted mt-0.5">
            All website projects in your workspace. Open any project to verify facts or edit its website.
          </p>
        </div>
        <button
          onClick={() => navigate('/projects/new')}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-sm font-semibold shadow-sm transition self-start"
        >
          <Plus className="w-4 h-4" />
          Create website
        </button>
      </div>

      {/* Search and Status Filters */}
      <div className="bg-surface rounded-2xl border border-slate-200/80 p-4 mb-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter by business name, city, or category..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-slate-50/50"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {[
            { id: 'all', label: 'All' },
            { id: 'published', label: 'Published' },
            { id: 'generated', label: 'Generated' },
            { id: 'draft', label: 'Draft / Review' },
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

      {/* Websites List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-surface rounded-2xl border border-slate-200 p-5 h-20 animate-pulse" />
          ))}
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="bg-surface rounded-2xl border border-dashed border-slate-300 p-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-primary-light text-primary flex items-center justify-center mx-auto mb-3">
            <Globe className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-ink mb-1">
            {projects.length === 0 ? 'No websites yet' : 'No matching websites'}
          </h3>
          <p className="text-sm text-ink-muted max-w-sm mx-auto mb-5">
            {projects.length === 0
              ? 'Create your first business website project to get started.'
              : 'Try adjusting your search or status filter.'}
          </p>
          {projects.length === 0 && (
            <button
              onClick={() => navigate('/projects/new')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-hover shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              Create website
            </button>
          )}
        </div>
      ) : (
        <div className="bg-surface rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="divide-y divide-slate-100">
            {filteredProjects.map((project) => {
              const businessName = project.businessId?.name || project.title;
              const locationStr = [project.businessId?.city, project.businessId?.state]
                .filter(Boolean)
                .join(', ');
              const isEditorReady = project.status === 'generated' || project.status === 'published';

              return (
                <div
                  key={project._id}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/60 transition"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-11 h-11 rounded-xl bg-primary-light text-primary flex items-center justify-center flex-shrink-0">
                      <Store className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h3 className="font-bold text-ink text-sm truncate">{businessName}</h3>
                        <StatusBadge
                          status={project.status === 'published' ? 'published' : project.status === 'generated' ? 'completed' : 'draft'}
                          label={
                            project.status === 'published'
                              ? 'Published'
                              : project.status === 'generated'
                              ? 'Generated'
                              : 'Draft'
                          }
                        />
                      </div>
                      <div className="text-xs text-ink-muted mt-1 flex items-center gap-2 flex-wrap">
                        <span>{project.businessId?.category || 'Business'}</span>
                        {locationStr && <span>• {locationStr}</span>}
                        <span>• Updated {new Date(project.updatedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      onClick={() => navigate(`/projects/${project._id}/verify`)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-ink hover:bg-slate-100 transition"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-slate-500" />
                      Verify facts
                    </button>
                    <button
                      onClick={() => navigate(getOpenPath(project))}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold transition"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      {isEditorReady ? 'Open editor' : 'Continue setup'}
                    </button>
                    <button
                      onClick={() => handleDelete(project._id)}
                      title="Delete project"
                      className="p-1.5 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Layout>
  );
}
