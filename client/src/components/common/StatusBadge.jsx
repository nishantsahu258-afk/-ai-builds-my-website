import React from 'react';

export default function StatusBadge({ status, label }) {
  const normalized = (status || '').toLowerCase();

  let style = 'bg-slate-100 text-slate-600 border-slate-200';
  let dotColor = 'bg-slate-400';
  let defaultLabel = status || 'Draft';

  if (normalized === 'published' || normalized === 'confirmed' || normalized === 'completed' || normalized === 'live') {
    style = 'bg-success-light text-success border-success/30';
    dotColor = 'bg-success';
    defaultLabel = normalized === 'confirmed' ? 'CONFIRMED' : normalized === 'published' ? 'Published' : 'Live';
  } else if (normalized === 'conflict' || normalized === 'needs review' || normalized === 'failed') {
    style = 'bg-warning-light text-warning border-warning/40';
    dotColor = 'bg-warning';
    defaultLabel = normalized === 'conflict' ? 'CONFLICT' : 'Needs review';
  } else if (normalized === 'draft' || normalized === 'generated') {
    style = 'bg-primary-light text-primary border-primary/30';
    dotColor = 'bg-primary';
    defaultLabel = 'Draft';
  } else if (normalized === 'processing' || normalized === 'in progress') {
    style = 'bg-blue-50 text-blue-600 border-blue-200';
    dotColor = 'bg-blue-500 animate-pulse';
    defaultLabel = 'In progress';
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${style}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
      {label || defaultLabel}
    </span>
  );
}
