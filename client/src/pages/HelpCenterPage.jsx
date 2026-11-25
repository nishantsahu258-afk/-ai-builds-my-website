import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HelpCircle, ChevronDown, ChevronUp, ArrowRight } from 'lucide-react';
import Layout from '../components/common/Layout.jsx';

const FAQS = [
  {
    q: '1. How do I create a new business website?',
    a: 'Click "Create website" from Overview or Websites. Enter your business name, category, location, and optional contact details. You can also add public website/social links or upload PDFs and photos.',
  },
  {
    q: '2. How does source research & extraction work?',
    a: 'Uploaded PDFs and images are parsed and inspected for business facts (services, hours, contact details). Added links are fetched safely and assessed for relevance against your business name, location, and category.',
  },
  {
    q: '3. What should I do if a source is marked Mismatched or Failed?',
    a: 'On the Verify Facts page or the global Sources page, you can Retry a failed source or Exclude a mismatched/unwanted source. Excluding a source keeps it out of generation without blocking your project.',
  },
  {
    q: '4. How do I verify facts and resolve conflicts?',
    a: 'Review each extracted fact on the Verification screen. Confirm accurate facts, reject incorrect ones, and resolve any conflicting values before generating your website. You can also add confirmed manual facts at any time.',
  },
  {
    q: '5. What is Manual-Only generation?',
    a: 'If external sources fail or you prefer to rely solely on information you entered yourself, you can choose Manual-Only generation. It uses only your confirmed manual facts and never invents missing details.',
  },
  {
    q: '6. How do I edit and publish my website?',
    a: 'After generation completes, open the Visual Editor to edit text, toggle section visibility, reorder sections, update theme colors, or regenerate a single section. When ready, go to Publish to make your /sites/:slug URL live.',
  },
];

export default function HelpCenterPage() {
  const navigate = useNavigate();
  const [openIdx, setOpenIdx] = useState(0);

  return (
    <Layout breadcrumb="Resources / Help Center">
      <div className="max-w-3xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-ink">Help Center</h1>
            <p className="text-sm text-ink-muted mt-0.5">
              Guides and answers for creating, researching, verifying, generating, editing, and publishing websites.
            </p>
          </div>
          <button
            onClick={() => navigate('/docs')}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 bg-surface hover:bg-slate-50 text-xs font-semibold text-ink transition self-start"
          >
            Read Documentation
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-3">
          {FAQS.map((item, idx) => {
            const isOpen = openIdx === idx;
            return (
              <div
                key={item.q}
                className="bg-surface rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden"
              >
                <button
                  onClick={() => setOpenIdx(isOpen ? -1 : idx)}
                  className="w-full p-5 flex items-center justify-between gap-4 text-left hover:bg-slate-50/60 transition"
                >
                  <div className="flex items-center gap-3">
                    <HelpCircle className="w-4 h-4 text-primary flex-shrink-0" />
                    <span className="text-sm font-bold text-ink">{item.q}</span>
                  </div>
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  )}
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 pt-1 text-sm text-ink-muted leading-relaxed border-t border-slate-100">
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </Layout>
  );
}
