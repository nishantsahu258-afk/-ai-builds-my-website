import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, ShieldCheck, FolderKanban, LogOut } from 'lucide-react';
import Layout from '../components/common/Layout.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { projectsService } from '../services/index.js';

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ total: 0, published: 0 });

  useEffect(() => {
    async function loadStats() {
      try {
        const res = await projectsService.list();
        const projects = res?.data?.projects || [];
        setStats({
          total: projects.length,
          published: projects.filter((p) => p.status === 'published').length,
        });
      } catch {
        // Ignore stats fetch errors on settings view
      }
    }
    loadStats();
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <Layout breadcrumb="Workspace / Settings">
      <div className="max-w-3xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-ink">Settings</h1>
          <p className="text-sm text-ink-muted mt-0.5">
            Your authenticated account and workspace details.
          </p>
        </div>

        {/* Account Card */}
        <div className="bg-surface rounded-2xl border border-slate-200/80 shadow-sm p-6 mb-6">
          <h2 className="text-base font-bold text-ink mb-4">Account Profile</h2>
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
              <User className="w-4 h-4 text-primary" />
              <div>
                <div className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider">Name</div>
                <div className="text-sm font-semibold text-ink">{user?.name || 'Not set'}</div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
              <Mail className="w-4 h-4 text-primary" />
              <div>
                <div className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider">Email</div>
                <div className="text-sm font-semibold text-ink">{user?.email || 'Not set'}</div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
              <ShieldCheck className="w-4 h-4 text-primary" />
              <div>
                <div className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider">Authentication</div>
                <div className="text-sm font-semibold text-ink">Active JWT session (httpOnly cookie)</div>
              </div>
            </div>
          </div>
        </div>

        {/* Workspace Summary */}
        <div className="bg-surface rounded-2xl border border-slate-200/80 shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-ink">Workspace Summary</h2>
            <button
              onClick={() => navigate('/projects')}
              className="text-xs font-semibold text-primary hover:underline"
            >
              View websites →
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-3">
              <FolderKanban className="w-5 h-5 text-primary" />
              <div>
                <div className="text-xs text-ink-muted">Total Projects</div>
                <div className="text-xl font-bold text-ink">{stats.total}</div>
              </div>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-success" />
              <div>
                <div className="text-xs text-ink-muted">Published Websites</div>
                <div className="text-xl font-bold text-ink">{stats.published}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Session Actions */}
        <div className="bg-surface rounded-2xl border border-slate-200/80 shadow-sm p-6 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-ink">Sign out</h3>
            <p className="text-xs text-ink-muted">Clear your current session and return to the login screen.</p>
          </div>
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold transition"
          >
            <LogOut className="w-4 h-4" />
            Log out
          </button>
        </div>
      </div>
    </Layout>
  );
}
