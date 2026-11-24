import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Upload, X, Check, Globe, Instagram, Facebook, MapPin, FileText, Image as ImageIcon } from 'lucide-react';
import Layout from '../components/common/Layout.jsx';
import { projectsService, sourcesService, generationService } from '../services/index.js';
import { useToast } from '../context/ToastContext.jsx';

export default function CreateWebsitePage() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Form State
  const [businessData, setBusinessData] = useState({
    businessName: '',
    category: 'Retail & Electronics',
    city: '',
    state: '',
    country: 'India',
    address: '',
    description: '',
  });

  const [onlinePresence, setOnlinePresence] = useState({
    instagram: '',
    facebook: '',
    googleBusiness: '',
    website: '',
  });

  const [files, setFiles] = useState([]);

  const handleFileSelect = (e) => {
    if (e.target.files) {
      const selected = Array.from(e.target.files);
      setFiles((prev) => [...prev, ...selected]);
    }
  };

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!businessData.businessName.trim()) {
      addToast({ type: 'warning', message: 'Please enter a business name' });
      setCurrentStep(1);
      return;
    }

    if (!businessData.city.trim()) {
      addToast({ type: 'warning', message: 'Please specify the business city' });
      setCurrentStep(1);
      return;
    }

    setLoading(true);
    try {
      // 1. Create Project and Business
      const projectRes = await projectsService.create(businessData);
      const projectId = projectRes?.data?.project?._id;

      // 2. Add online links
      const linksToAdd = [
        { url: onlinePresence.instagram, type: 'social' },
        { url: onlinePresence.facebook, type: 'social' },
        { url: onlinePresence.googleBusiness, type: 'google_listing' },
        { url: onlinePresence.website, type: 'website' },
      ].filter((l) => l.url && l.url.trim().length > 0);

      for (const link of linksToAdd) {
        try {
          await sourcesService.addLink(projectId, link);
        } catch (lErr) {
          console.warn('Could not add link source:', lErr.message);
        }
      }

      // 3. Upload files
      for (const file of files) {
        try {
          await sourcesService.uploadFile(projectId, file);
        } catch (fErr) {
          console.warn('Could not upload file source:', fErr.message);
        }
      }

      // 4. Trigger Web Research
      try {
        await generationService.startResearch(projectId);
      } catch (rErr) {
        console.warn('Research trigger notice:', rErr.message);
      }

      addToast({ type: 'success', message: 'Project created! Researching business facts...' });

      // Navigate to Screen 3: Research & Verify
      navigate(`/projects/${projectId}/verify`);
    } catch (err) {
      addToast({ type: 'error', message: err.message || 'Failed to create project' });
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    'Retail & Electronics',
    'Restaurant & Cafe',
    'Salon, Spa & Wellness',
    'Healthcare & Clinic',
    'Consulting & Professional Services',
    'Manufacturing & Industrial',
    'Real Estate & Construction',
    'Education & Coaching',
    'Automotive & Repair',
    'Other Business',
  ];

  return (
    <Layout breadcrumb="Workspace / My websites / Create">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ink">Create a new website</h1>
        <p className="text-sm text-ink-muted mt-0.5">
          Share whatever you have. You can add or verify details later.
        </p>
      </div>

      {/* Stepper Header (Page 2 UI Reference) */}
      <div className="flex items-center gap-6 mb-8 text-xs font-semibold text-ink-muted border-b border-slate-200/80 pb-4">
        {[
          { step: 1, label: 'Business details' },
          { step: 2, label: 'Online presence' },
          { step: 3, label: 'Files & photos' },
          { step: 4, label: 'Review' },
        ].map((item) => (
          <button
            key={item.step}
            onClick={() => setCurrentStep(item.step)}
            className={`flex items-center gap-2 transition ${
              currentStep === item.step
                ? 'text-primary font-bold'
                : currentStep > item.step
                ? 'text-ink'
                : 'text-slate-400'
            }`}
          >
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                currentStep === item.step
                  ? 'bg-primary text-white shadow-sm'
                  : currentStep > item.step
                  ? 'bg-slate-200 text-ink'
                  : 'bg-slate-100 text-slate-400'
              }`}
            >
              {currentStep > item.step ? <Check className="w-3.5 h-3.5" /> : item.step}
            </span>
            {item.label}
          </button>
        ))}
      </div>

      {/* Form Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Card 1: Business Basics */}
        <div className="bg-surface p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-ink mb-1">Business basics</h2>
            <p className="text-xs text-ink-muted mb-5">
              Tell us how customers know and find your business.
            </p>

            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-semibold text-ink-muted mb-1.5 uppercase tracking-wider">
                  Business name *
                </label>
                <input
                  type="text"
                  required
                  value={businessData.businessName}
                  onChange={(e) => setBusinessData({ ...businessData, businessName: e.target.value })}
                  placeholder="e.g. Sharma Electronics"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-muted mb-1.5 uppercase tracking-wider">
                  Business category
                </label>
                <select
                  value={businessData.category}
                  onChange={(e) => setBusinessData({ ...businessData, category: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-surface"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-ink-muted mb-1.5 uppercase tracking-wider">
                    City *
                  </label>
                  <input
                    type="text"
                    required
                    value={businessData.city}
                    onChange={(e) => setBusinessData({ ...businessData, city: e.target.value })}
                    placeholder="Durg"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink-muted mb-1.5 uppercase tracking-wider">
                    State
                  </label>
                  <input
                    type="text"
                    value={businessData.state}
                    onChange={(e) => setBusinessData({ ...businessData, state: e.target.value })}
                    placeholder="Chhattisgarh"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink-muted mb-1.5 uppercase tracking-wider">
                    Country
                  </label>
                  <input
                    type="text"
                    value={businessData.country}
                    onChange={(e) => setBusinessData({ ...businessData, country: e.target.value })}
                    placeholder="India"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Online Presence */}
        <div className="bg-surface p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-ink mb-1">Online presence</h2>
            <p className="text-xs text-ink-muted mb-5">
              Add links you already use for automated fact extraction.
            </p>

            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-semibold text-ink-muted mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
                  <Instagram className="w-3.5 h-3.5 text-pink-500" /> Instagram
                </label>
                <input
                  type="text"
                  value={onlinePresence.instagram}
                  onChange={(e) => setOnlinePresence({ ...onlinePresence, instagram: e.target.value })}
                  placeholder="https://instagram.com/yourbusiness"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-muted mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
                  <Facebook className="w-3.5 h-3.5 text-blue-600" /> Facebook
                </label>
                <input
                  type="text"
                  value={onlinePresence.facebook}
                  onChange={(e) => setOnlinePresence({ ...onlinePresence, facebook: e.target.value })}
                  placeholder="https://facebook.com/yourbusiness"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-muted mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-red-500" /> Google Business listing
                </label>
                <input
                  type="text"
                  value={onlinePresence.googleBusiness}
                  onChange={(e) => setOnlinePresence({ ...onlinePresence, googleBusiness: e.target.value })}
                  placeholder="Paste listing URL (maps.google.com/...)"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Files Banner Section */}
      <div className="bg-surface rounded-2xl border border-slate-200/80 p-5 shadow-sm mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-primary-light text-primary flex items-center justify-center flex-shrink-0">
            <Upload className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-ink">Add files, price lists, and business photos</h3>
            <p className="text-xs text-ink-muted">
              PDF, JPG, PNG • Files are private until your website is published.
            </p>
          </div>
        </div>

        <div>
          <label className="cursor-pointer px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-ink text-xs font-semibold transition shadow-sm inline-block">
            Choose files
            <input
              type="file"
              multiple
              accept=".pdf,image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Attached Files List */}
      {files.length > 0 && (
        <div className="bg-surface rounded-2xl border border-slate-200/80 p-4 mb-6">
          <div className="text-xs font-bold text-ink mb-3 uppercase tracking-wider">
            Selected documents & images ({files.length})
          </div>
          <div className="flex flex-wrap gap-2">
            {files.map((file, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium text-ink"
              >
                {file.type.includes('pdf') ? (
                  <FileText className="w-4 h-4 text-red-500" />
                ) : (
                  <ImageIcon className="w-4 h-4 text-primary" />
                )}
                <span className="truncate max-w-[200px]">{file.name}</span>
                <button
                  type="button"
                  onClick={() => removeFile(idx)}
                  className="text-slate-400 hover:text-red-500 ml-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer Navigation Bar */}
      <div className="flex justify-end">
        <button
          onClick={handleSubmit}
          disabled={loading || !businessData.businessName.trim() || !businessData.city.trim()}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-sm font-semibold shadow-sm transition disabled:opacity-50"
        >
          {loading ? 'Processing sources...' : 'Continue →'}
        </button>
      </div>
    </Layout>
  );
}
