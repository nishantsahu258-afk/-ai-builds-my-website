import React from 'react';
import { Search, HelpCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';

export default function Navbar({ breadcrumb = 'Workspace / My websites' }) {
  const { user } = useAuth();

  const getInitials = (name) => {
    if (!name) return 'AS';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <header className="h-16 px-8 flex items-center justify-between border-b border-slate-200/80 bg-surface/80 backdrop-blur-sm sticky top-0 z-30">
      <div className="text-sm font-medium text-ink-muted">
        {breadcrumb}
      </div>

      <div className="flex items-center gap-4">
        {/* Search bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search..."
            className="w-56 pl-9 pr-3 py-1.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-slate-50/50"
          />
        </div>

        {/* Help icon */}
        <button
          className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:text-ink hover:bg-slate-50 transition"
          title="Help"
        >
          <HelpCircle className="w-4 h-4" />
        </button>

        {/* Avatar */}
        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-xs flex items-center justify-center border border-primary/20">
          {getInitials(user?.name)}
        </div>
      </div>
    </header>
  );
}
