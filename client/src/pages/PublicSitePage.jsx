import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Store, Phone, Mail, MapPin, Clock, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import { publishingService } from '../services/index.js';

export default function PublicSitePage() {
  const { slug } = useParams();
  const [siteData, setSiteData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function loadSite() {
      try {
        const res = await publishingService.getPublicSite(slug);
        if (res?.data) {
          setSiteData(res.data);
          document.title = `${res.data.businessName} | Official Website`;
        } else {
          setNotFound(true);
        }
      } catch (err) {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }
    loadSite();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center animate-spin">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="text-sm font-semibold text-ink-muted">Loading website...</div>
        </div>
      </div>
    );
  }

  if (notFound || !siteData) {
    return (
      <div className="min-h-screen bg-canvas flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 rounded-2xl bg-slate-200 text-slate-500 flex items-center justify-center mb-4">
          <Store className="w-6 h-6" />
        </div>
        <h1 className="text-xl font-bold text-ink mb-1">Website not found</h1>
        <p className="text-sm text-ink-muted max-w-sm mb-6">
          This business website is not published yet or the URL is incorrect.
        </p>
        <Link
          to="/"
          className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary-hover transition"
        >
          Go to Homepage
        </Link>
      </div>
    );
  }

  const { businessName, businessCategory, city, theme, sections = [] } = siteData;

  const getSection = (type) => sections.find((s) => s.type === type && s.enabled);

  const heroSec = getSection('hero');
  const aboutSec = getSection('about');
  const servicesSec = getSection('services');
  const productsSec = getSection('products');
  const hoursSec = getSection('hours');
  const contactSec = getSection('contact');
  const footerSec = getSection('footer');

  return (
    <div className="min-h-screen bg-white text-ink font-sans flex flex-col selection:bg-primary selection:text-white">
      {/* Public Navbar (UI Reference Page 7) */}
      <nav className="border-b border-slate-100 bg-white/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary font-bold text-lg flex items-center justify-center border border-primary/20">
              {businessName?.slice(0, 1).toUpperCase() || 'S'}
            </div>
            <div>
              <div className="font-bold text-base text-ink tracking-tight leading-none mb-1">
                {businessName}
              </div>
              <div className="text-[10px] font-bold text-ink-muted tracking-wider uppercase">
                {businessCategory || 'BUSINESS WEBSITE'}
              </div>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-ink-muted">
            <a href="#home" className="hover:text-primary transition font-semibold text-ink">
              Home
            </a>
            {aboutSec && (
              <a href="#about" className="hover:text-primary transition">
                About
              </a>
            )}
            {(servicesSec || productsSec) && (
              <a href="#offerings" className="hover:text-primary transition">
                Offerings
              </a>
            )}
            {hoursSec && (
              <a href="#hours" className="hover:text-primary transition">
                Hours
              </a>
            )}
            <a
              href="#contact"
              className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-sm transition"
            >
              Contact
            </a>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1">
        {/* Hero Section (UI Reference Page 7) */}
        {heroSec && (
          <section id="home" className="bg-primary-light/30 border-b border-slate-100 py-16 md:py-24">
            <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-12 gap-12 items-center">
              <div className="md:col-span-7">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase bg-white border border-primary/20 text-primary shadow-2xs mb-5">
                  <ShieldCheck className={`w-3.5 h-3.5 ${siteData.hasConfirmedProvenance ? 'text-success' : 'text-primary'}`} />
                  {siteData.hasConfirmedProvenance ? 'CONFIRMED & VERIFIED BUSINESS' : 'BUSINESS WEBSITE'}
                </div>
                <h1 className="text-3xl md:text-5xl font-extrabold text-ink tracking-tight leading-[1.15] mb-4">
                  {heroSec.content?.headline || `${businessName}, presented with clarity.`}
                </h1>
                <p className="text-base text-ink-muted leading-relaxed mb-8 max-w-lg">
                  {heroSec.content?.subheadline ||
                    'A verified business introduction using only confirmed business information.'}
                </p>
                <a
                  href="#contact"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary hover:bg-primary-hover text-white text-sm font-semibold shadow-sm transition"
                >
                  {heroSec.content?.primaryCtaLabel || 'Explore services'}
                  <ArrowRight className="w-4 h-4" />
                </a>
              </div>

              {/* Graphic Illustration Card (Page 7 UI Reference) */}
              <div className="md:col-span-5 flex justify-center">
                <div className="w-full max-w-sm aspect-4/3 rounded-2xl bg-white border border-slate-200/80 shadow-sm p-6 flex flex-col items-center justify-center relative overflow-hidden">
                  <div className="w-44 h-24 rounded-2xl bg-primary/20 border-2 border-primary/40 flex flex-col justify-between p-3 mb-3">
                    <div className="w-full h-3 rounded bg-primary/40" />
                    <div className="grid grid-cols-4 gap-2 h-10">
                      <div className="bg-white/80 rounded" />
                      <div className="bg-white/80 rounded" />
                      <div className="bg-white/80 rounded" />
                      <div className="bg-white/80 rounded" />
                    </div>
                  </div>
                  <div className="text-xs font-bold text-ink">{businessName}</div>
                  <div className="text-[11px] text-ink-muted">
                    {city ? `${city}, India` : 'Official Business'}
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* About Section */}
        {aboutSec && (
          <section id="about" className="py-16 md:py-20 border-b border-slate-100 bg-white">
            <div className="max-w-4xl mx-auto px-6">
              <div className="text-[11px] font-bold text-primary tracking-wider uppercase mb-2">
                ABOUT THE BUSINESS
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-ink mb-4">
                {aboutSec.content?.heading || 'A clear introduction'}
              </h2>
              <p className="text-sm md:text-base text-ink-muted leading-relaxed mb-8">
                {aboutSec.content?.description ||
                  'This section is populated strictly from owner-confirmed facts. Every detail is traceable to verified sources.'}
              </p>

              {/* 3 Overview feature badges */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50">
                  <Sparkles className="w-4 h-4 text-primary mb-2" />
                  <div className="text-xs font-bold text-ink">Products & services</div>
                  <div className="text-[11px] text-ink-muted">Only confirmed offerings</div>
                </div>
                <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50">
                  <Store className="w-4 h-4 text-primary mb-2" />
                  <div className="text-xs font-bold text-ink">Local presence</div>
                  <div className="text-[11px] text-ink-muted">
                    {city ? `Operating in ${city}` : 'Verified business'}
                  </div>
                </div>
                <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50">
                  <ShieldCheck className="w-4 h-4 text-success mb-2" />
                  <div className="text-xs font-bold text-ink">Contact</div>
                  <div className="text-[11px] text-ink-muted">Verified contact details</div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Offerings Section (Services or Products) */}
        {(servicesSec || productsSec) && (
          <section id="offerings" className="py-16 md:py-20 bg-slate-50/50 border-b border-slate-100">
            <div className="max-w-6xl mx-auto px-6">
              <div className="text-[11px] font-bold text-primary tracking-wider uppercase mb-2">
                WHAT WE DO
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-ink mb-8">
                {servicesSec?.content?.heading || productsSec?.content?.heading || 'Our Offerings'}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {(servicesSec?.content?.items || productsSec?.content?.items || []).map(
                  (item, i) => (
                    <div
                      key={i}
                      className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-2xs hover:shadow-sm transition"
                    >
                      <h3 className="text-base font-bold text-ink mb-2">{item.title}</h3>
                      <p className="text-xs text-ink-muted leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  )
                )}
              </div>
            </div>
          </section>
        )}

        {/* Contact Section */}
        {contactSec && (
          <section id="contact" className="py-16 md:py-20 bg-white">
            <div className="max-w-4xl mx-auto px-6">
              <div className="text-[11px] font-bold text-primary tracking-wider uppercase mb-2">
                GET IN TOUCH
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-ink mb-8">
                {contactSec.content?.heading || 'Contact Information'}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {contactSec.content?.phone && (
                  <div className="p-5 rounded-2xl border border-slate-200/80 bg-slate-50/50">
                    <Phone className="w-5 h-5 text-primary mb-3" />
                    <div className="text-xs font-bold text-ink-muted uppercase tracking-wider mb-1">
                      Phone
                    </div>
                    <a
                      href={`tel:${contactSec.content.phone}`}
                      className="text-sm font-bold text-ink hover:text-primary transition"
                    >
                      {contactSec.content.phone}
                    </a>
                  </div>
                )}

                {contactSec.content?.email && (
                  <div className="p-5 rounded-2xl border border-slate-200/80 bg-slate-50/50">
                    <Mail className="w-5 h-5 text-primary mb-3" />
                    <div className="text-xs font-bold text-ink-muted uppercase tracking-wider mb-1">
                      Email
                    </div>
                    <a
                      href={`mailto:${contactSec.content.email}`}
                      className="text-sm font-bold text-ink hover:text-primary transition"
                    >
                      {contactSec.content.email}
                    </a>
                  </div>
                )}

                {contactSec.content?.address && (
                  <div className="p-5 rounded-2xl border border-slate-200/80 bg-slate-50/50">
                    <MapPin className="w-5 h-5 text-primary mb-3" />
                    <div className="text-xs font-bold text-ink-muted uppercase tracking-wider mb-1">
                      Address
                    </div>
                    <div className="text-sm font-bold text-ink">
                      {contactSec.content.address}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Public Footer */}
      <footer className="border-t border-slate-100 bg-white py-8 text-center text-xs text-ink-muted">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            © {new Date().getFullYear()} {businessName}.{' '}
            {siteData.hasConfirmedProvenance
              ? 'Information confirmed by the business owner.'
              : 'Business website.'}
          </div>
          <div className="text-[11px] text-slate-400">
            Powered by <span className="font-semibold text-primary">AI Builds My Website</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
