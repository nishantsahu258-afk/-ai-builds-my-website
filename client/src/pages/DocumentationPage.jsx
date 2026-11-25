import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, ShieldCheck, Layers, FileCheck2, Sparkles, Globe } from 'lucide-react';
import Layout from '../components/common/Layout.jsx';

export default function DocumentationPage() {
  const navigate = useNavigate();

  const sections = [
    {
      icon: ShieldCheck,
      title: '1. The Golden Rule: Fact-Safe Generation',
      body: 'AI Builds My Website never invents phone numbers, addresses, prices, opening hours, reviews, or awards. Only facts confirmed by the business owner are passed into website generation.',
    },
    {
      icon: Layers,
      title: '2. End-to-End Workflow',
      body: '1) Create a project with core business details -> 2) Submit optional PDFs, photos, and links -> 3) Review source relevance and verify extracted facts -> 4) Generate structured website sections -> 5) Customize in the Visual Editor -> 6) Publish to a public /sites/:slug URL.',
    },
    {
      icon: FileCheck2,
      title: '3. Source Relevance & Exclusion',
      body: 'Each external source is checked against your business name, location, and category and labeled Relevant, Needs review, Mismatched, or Failed. You can Retry failed extractions or Exclude irrelevant sources without losing their original relevance status.',
    },
    {
      icon: Sparkles,
      title: '4. Website Generation & Section Regeneration',
      body: 'Websites are generated as validated JSON sections (Hero, About, Services, Contact, etc.) rather than raw unvetted HTML. In the editor, you can regenerate individual sections without altering the rest of the page.',
    },
    {
      icon: Globe,
      title: '5. Publishing & Version Snapshots',
      body: 'Publishing creates an immutable version snapshot and serves the site at /sites/:slug without requiring visitor authentication. Unpublishing takes the public page offline while preserving your draft.',
    },
  ];

  return (
    <Layout breadcrumb="Resources / Documentation">
      <div className="max-w-3xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-ink flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-primary" />
              Documentation
            </h1>
            <p className="text-sm text-ink-muted mt-0.5">
              Architecture, features, and operational guide for AI Builds My Website.
            </p>
          </div>
          <button
            onClick={() => navigate('/projects/new')}
            className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-sm transition self-start"
          >
            Create website
          </button>
        </div>

        <div className="space-y-4">
          {sections.map((sec) => {
            const Icon = sec.icon;
            return (
              <div
                key={sec.title}
                className="bg-surface rounded-2xl border border-slate-200/80 shadow-sm p-6"
              >
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-primary-light text-primary flex items-center justify-center">
                    <Icon className="w-4 h-4" />
                  </div>
                  <h2 className="text-base font-bold text-ink">{sec.title}</h2>
                </div>
                <p className="text-sm text-ink-muted leading-relaxed">{sec.body}</p>
              </div>
            );
          })}
        </div>
      </div>
    </Layout>
  );
}
