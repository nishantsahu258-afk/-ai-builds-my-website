import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, HelpCircle, Settings, LogOut, Store } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { projectsService } from '../../services/index.js';

export default function Navbar({ breadcrumb = 'Workspace / Overview' }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [projects, setProjects] = useState([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);

  const searchRef = useRef(null);
  const avatarRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setSearchOpen(false);
      }
      if (avatarRef.current && !avatarRef.current.contains(e.target)) {
        setAvatarOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const ensureProjectsLoaded = async () => {
    if (projects.length > 0) return;
    try {
      const res = await projectsService.list();
      setProjects(res?.data?.projects || []);
    } catch {
      // Ignore transient search fetch failure
    }
  };

  const filteredProjects = searchQuery.trim()
    ? projects.filter((p) => {
        const q = searchQuery.trim().toLowerCase();
        const name = (p.businessId?.name || p.title || '').toLowerCase();
        const city = (p.businessId?.city || '').toLowerCase();
        const category = (p.businessId?.category || '').toLowerCase();
        return name.includes(q) || city.includes(q) || category.includes(q);
      })
    : projects.slice(0, 5);

  const handleSelectProject = (project) => {
    setSearchOpen(false);
    setSearchQuery('');
    if (project.status === 'generated' || project.status === 'published') {
      navigate(`/projects/${project._id}/editor`);
    } else {
      navigate(`/projects/${project._id}/verify`);
    }
  };

  const handleLogout = async () => {
    setAvatarOpen(false);
    await logout();
    navigate('/login');
  };

  const getInitials = (name, email) => {
    const source = name || email || 'U';
    const parts = source.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return source.slice(0, 2).toUpperCase();
  };

  return (
    <header className="h-16 px-8 flex items-center justify-between border-b border-slate-200/80 bg-surface/80 backdrop-blur-sm sticky top-0 z-30">
      <div className="text-sm font-medium text-ink-muted">
        {breadcrumb}
      </div>

      <div className="flex items-center gap-4">
        {/* Search bar */}
        <div className="relative" ref={searchRef}>
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onFocus={() => {
              ensureProjectsLoaded();
              setSearchOpen(true);
            }}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setSearchOpen(true);
            }}
            placeholder="Search websites..."
            aria-label="Search websites"
            className="w-56 sm:w-64 pl-9 pr-3 py-1.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-slate-50/50"
          />

          {searchOpen && (
            <div className="absolute right-0 mt-2 w-72 bg-surface rounded-2xl shadow-lg border border-slate-200 py-2 z-40">
              <div className="px-3 py-1 text-[11px] font-semibold text-ink-muted uppercase tracking-wider">
                {searchQuery.trim() ? 'Matching projects' : 'Recent projects'}
              </div>
              {filteredProjects.length === 0 ? (
                <div className="px-3 py-3 text-xs text-ink-muted">
                  No matching projects found.
                </div>
              ) : (
                <div className="max-h-64 overflow-y-auto">
                  {filteredProjects.map((proj) => {
                    const name = proj.businessId?.name || proj.title;
                    return (
                      <button
                        key={proj._id}
                        onClick={() => handleSelectProject(proj)}
                        className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center gap-2.5 transition"
                      >
                        <div className="w-7 h-7 rounded-lg bg-primary-light text-primary flex items-center justify-center flex-shrink-0">
                          <Store className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-semibold text-ink truncate">{name}</div>
                          <div className="text-[11px] text-ink-muted truncate">
                            {proj.status === 'published' ? 'Published' : proj.status === 'generated' ? 'Generated' : 'Draft'}
                            {proj.businessId?.city ? ` • ${proj.businessId.city}` : ''}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Help icon */}
        <button
          onClick={() => navigate('/help')}
          className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-500 hover:text-ink hover:bg-slate-50 transition"
          title="Help Center"
          aria-label="Help Center"
        >
          <HelpCircle className="w-4 h-4" />
        </button>

        {/* Avatar Dropdown */}
        <div className="relative" ref={avatarRef}>
          <button
            onClick={() => setAvatarOpen((prev) => !prev)}
            className="w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-xs flex items-center justify-center border border-primary/20 hover:bg-primary/20 transition"
            title={user?.email || 'Account menu'}
            aria-label="Account menu"
          >
            {getInitials(user?.name, user?.email)}
          </button>

          {avatarOpen && (
            <div className="absolute right-0 mt-2 w-60 bg-surface rounded-2xl shadow-lg border border-slate-200 py-2 z-40">
              <div className="px-4 py-2.5 border-b border-slate-100">
                <div className="text-xs font-bold text-ink truncate">
                  {user?.name || 'Workspace User'}
                </div>
                <div className="text-[11px] text-ink-muted truncate">
                  {user?.email || ''}
                </div>
              </div>
              <button
                onClick={() => {
                  setAvatarOpen(false);
                  navigate('/settings');
                }}
                className="w-full px-4 py-2 text-left text-xs font-semibold text-ink hover:bg-slate-50 flex items-center gap-2 transition"
              >
                <Settings className="w-3.5 h-3.5 text-slate-500" />
                Settings
              </button>
              <button
                onClick={handleLogout}
                className="w-full px-4 py-2 text-left text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2 transition"
              >
                <LogOut className="w-3.5 h-3.5" />
                Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
