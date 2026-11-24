import React from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Globe, FileText, Settings, HelpCircle, BookOpen, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const navItems = [
    { label: 'Overview', to: '/', icon: LayoutDashboard },
    { label: 'Websites', to: '/projects', icon: Globe },
    { label: 'Sources', to: '/sources', icon: FileText },
    { label: 'Settings', to: '/settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-sidebar text-slate-300 flex flex-col min-h-screen border-r border-slate-800 select-none">
      {/* Brand Header */}
      <div className="p-6 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white font-bold text-lg shadow-md">
          A
        </div>
        <div className="leading-tight">
          <div className="text-white font-bold text-sm tracking-wide">AI BUILDS</div>
          <div className="text-[11px] text-slate-400 font-medium tracking-wider">MY WEBSITE</div>
        </div>
      </div>

      {/* Main Navigation */}
      <div className="px-4 py-3 flex-1 flex flex-col gap-6">
        <div>
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-3 mb-2">
            Workspace
          </div>
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.to === '/'
                  ? location.pathname === '/'
                  : location.pathname.startsWith(item.to);

              return (
                <NavLink
                  key={item.label}
                  to={item.to}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-slate-800/80 text-white shadow-sm ring-1 ring-slate-700/50'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-primary' : 'text-slate-400'}`} />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>
        </div>

        <div>
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-3 mb-2">
            Resources
          </div>
          <nav className="flex flex-col gap-1">
            <a
              href="https://ai-builds-my-website.docs"
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.preventDefault()}
              className="flex items-center gap-3 px-3 py-2 text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-800/30 rounded-xl transition"
            >
              <HelpCircle className="w-4 h-4 text-slate-400" />
              Help center
            </a>
            <a
              href="https://ai-builds-my-website.docs"
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.preventDefault()}
              className="flex items-center gap-3 px-3 py-2 text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-800/30 rounded-xl transition"
            >
              <BookOpen className="w-4 h-4 text-slate-400" />
              Documentation
            </a>
          </nav>
        </div>
      </div>

      {/* User Footer */}
      <div className="p-4 border-t border-slate-800/80">
        <div className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-800/50 transition">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-slate-700 text-slate-200 font-semibold text-xs flex items-center justify-center border border-slate-600">
              {getInitials(user?.name || 'Alex Smith')}
            </div>
            <div className="leading-tight">
              <div className="text-white text-xs font-semibold">{user?.name || 'Alex Smith'}</div>
              <div className="text-[11px] text-slate-400">Free workspace</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Log out"
            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
