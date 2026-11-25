import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Store, MoreHorizontal, Sparkles, ExternalLink, Edit, Trash2 } from 'lucide-react';
import Layout from '../components/common/Layout.jsx';
import StatusBadge from '../components/common/StatusBadge.jsx';
import { projectsService } from '../services/index.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

export default function DashboardPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeMenuId, setActiveMenuId] = useState(null);

  const fetchProjects = async () => {
    try {
      const res = await projectsService.list();
      setProjects(res?.data?.projects || []);
    } catch (err) {
      addToast({ type: 'error', message: err.message || 'Failed to load projects' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const publishedCount = projects.filter((p) => p.status === 'published').length;
  const draftCount = projects.filter((p) => p.status !== 'published').length;

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this project?')) return;
    try {
      await projectsService.delete(id);
      addToast({ type: 'success', message: 'Project deleted' });
      setProjects((prev) => prev.filter((p) => p._id !== id));
    } catch (err) {
      addToast({ type: 'error', message: err.message || 'Could not delete project' });
    }
  };

  const handleCardClick = (project) => {
    if (project.status === 'draft') {
      navigate(`/projects/${project._id}/verify`);
    } else if (project.status === 'review') {
      navigate(`/projects/${project._id}/verify`);
    } else if (project.status === 'generated' || project.status === 'published') {
      navigate(`/projects/${project._id}/editor`);
    } else {
      navigate(`/projects/${project._id}`);
    }
  };

  return (
    <Layout breadcrumb="Workspace / My websites">
      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-ink">
            Good morning, {user?.name?.split(' ')[0] || 'there'}
          </h1>
          <p className="text-sm text-ink-muted mt-0.5">
            Turn the information you already have into a website.
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

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        {/* Total Projects */}
        <div className="bg-surface p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-start justify-between">
          <div>
            <div className="text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-2">
              TOTAL PROJECTS
            </div>
            <div className="text-3xl font-extrabold text-ink tracking-tight">
              {String(projects.length).padStart(2, '0')}
            </div>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary-light text-primary border border-primary/20">
            +{projects.length > 0 ? projects.length : 0} this month
          </span>
        </div>

        {/* Published */}
        <div className="bg-surface p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-start justify-between">
          <div>
            <div className="text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-2">
              PUBLISHED
            </div>
            <div className="text-3xl font-extrabold text-ink tracking-tight">
              {String(publishedCount).padStart(2, '0')}
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-success-light text-success border border-success/30">
            <span className="w-1.5 h-1.5 rounded-full bg-success" />
            Live
          </span>
        </div>

        {/* Drafts */}
        <div className="bg-surface p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-start justify-between">
          <div>
            <div className="text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-2">
              DRAFTS
            </div>
            <div className="text-3xl font-extrabold text-ink tracking-tight">
              {String(draftCount).padStart(2, '0')}
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-warning-light text-warning border border-warning/40">
            <span className="w-1.5 h-1.5 rounded-full bg-warning" />
            In progress
          </span>
        </div>
      </div>

      {/* Recent Websites Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-ink">Recent websites</h2>
          <button
            onClick={() => navigate('/projects')}
            className="text-xs font-semibold text-primary cursor-pointer hover:underline"
          >
            View all →
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-surface rounded-2xl border border-slate-200 p-4 h-48 animate-pulse" />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="bg-surface rounded-2xl border border-dashed border-slate-300 p-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-primary-light text-primary flex items-center justify-center mx-auto mb-3">
              <Store className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-ink mb-1">No websites created yet</h3>
            <p className="text-sm text-ink-muted max-w-sm mx-auto mb-5">
              Enter your business details, upload price lists or photos, and generate your ready-to-publish website.
            </p>
            <button
              onClick={() => navigate('/projects/new')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-hover shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              Create your first website
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {projects.map((project) => {
              const businessName = project.businessId?.name || project.title;
              const locationStr = [project.businessId?.city, project.businessId?.state]
                .filter(Boolean)
                .join(', ');

              return (
                <div
                  key={project._id}
                  onClick={() => handleCardClick(project)}
                  className="bg-surface rounded-2xl border border-slate-200/80 shadow-sm p-4 hover:shadow-md hover:border-slate-300 transition cursor-pointer group flex flex-col justify-between"
                >
                  {/* Thumbnail Banner */}
                  <div className="h-28 rounded-xl bg-primary-light/60 border border-primary/10 relative overflow-hidden flex items-center justify-center mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-10 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
                        <Store className="w-6 h-6" />
                      </div>
                    </div>
                    <div className="absolute top-3 right-3 w-7 h-7 rounded-full bg-primary/20" />
                  </div>

                  <div>
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="font-bold text-ink text-sm group-hover:text-primary transition truncate">
                        {businessName}
                      </h3>
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuId(activeMenuId === project._id ? null : project._id);
                          }}
                          className="text-slate-400 hover:text-ink p-1 rounded-lg"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                        {activeMenuId === project._id && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="absolute right-0 top-6 z-20 w-36 bg-surface rounded-xl shadow-lg border border-slate-200 py-1 text-xs font-medium"
                          >
                            <button
                              onClick={() => {
                                setActiveMenuId(null);
                                navigate(`/projects/${project._id}/editor`);
                              }}
                              className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2"
                            >
                              <Edit className="w-3.5 h-3.5" /> Edit site
                            </button>
                            <button
                              onClick={(e) => handleDelete(project._id, e)}
                              className="w-full text-left px-3 py-1.5 hover:bg-red-50 text-red-600 flex items-center gap-2"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-ink-muted mb-3 truncate">
                      {locationStr || 'Location unverified'}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <StatusBadge
                      status={project.status === 'published' ? 'published' : 'draft'}
                      label={project.status === 'published' ? 'Published' : 'Draft'}
                    />
                    <span className="text-[11px] text-slate-400 font-medium">
                      {new Date(project.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Start with what you have Banner */}
      <div className="bg-primary-light/60 rounded-2xl border border-primary/20 p-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center flex-shrink-0 shadow-sm">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-ink">Start with what you have</h3>
            <p className="text-xs text-ink-muted">
              Add a link, upload a PDF, or simply enter a business name.
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate('/projects/new')}
          className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold transition shadow-sm whitespace-nowrap"
        >
          Create project
        </button>
      </div>
    </Layout>
  );
}
