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

  const getInitials = (name, email) => {
    const source = name || email || 'U';
    const parts = source.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return source.slice(0, 2).toUpperCase();
  };

  const workspaceItems = [
    { label: 'Overview', to: '/', icon: LayoutDashboard },
    { label: 'Websites', to: '/projects', icon: Globe },
    { label: 'Sources', to: '/sources', icon: FileText },
    { label: 'Settings', to: '/settings', icon: Settings },
  ];

  const resourceItems = [
    { label: 'Help Center', to: '/help', icon: HelpCircle },
    { label: 'Documentation', to: '/docs', icon: BookOpen },
  ];

  const isRouteActive = (to) => {
    if (to === '/') return location.pathname === '/';
    return location.pathname === to || location.pathname.startsWith(`${to}/`);
  };

  return (
    <aside className="w-64 bg-sidebar text-slate-300 flex flex-col min-h-screen border-r border-slate-800 select-none">
      {/* Brand Header */}
      <div
        onClick={() => navigate('/')}
        className="p-6 flex items-center gap-3 cursor-pointer"
      >
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
            {workspaceItems.map((item) => {
              const Icon = item.icon;
              const isActive = isRouteActive(item.to);

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
            {resourceItems.map((item) => {
              const Icon = item.icon;
              const isActive = isRouteActive(item.to);

              return (
                <NavLink
                  key={item.label}
                  to={item.to}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-slate-800/80 text-white shadow-sm ring-1 ring-slate-700/50'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-primary' : 'text-slate-400'}`} />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>
        </div>
      </div>

      {/* User Footer */}
      <div className="p-4 border-t border-slate-800/80">
        <div className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-800/50 transition">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-full bg-slate-700 text-slate-200 font-semibold text-xs flex items-center justify-center border border-slate-600 flex-shrink-0">
              {getInitials(user?.name, user?.email)}
            </div>
            <div className="leading-tight min-w-0">
              <div className="text-white text-xs font-semibold truncate">
                {user?.name || user?.email || 'Account'}
              </div>
              <div className="text-[11px] text-slate-400 truncate">
                {user?.email || 'Authenticated'}
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Log out"
            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition flex-shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
