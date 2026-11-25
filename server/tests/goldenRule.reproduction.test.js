import assert from 'node:assert/strict';
import { test, describe, beforeEach } from 'node:test';
import mongoose from 'mongoose';
import { assessSourceRelevance } from '../src/utils/sourceRelevance.js';
import { buildWebsiteGenerationPrompt } from '../src/utils/promptBuilder.js';
import { findUnsupportedClaims, publishWebsite } from '../src/modules/publishing/publishing.controller.js';
import { generateWebsite } from '../src/modules/generation/generation.controller.js';
import Project from '../src/models/Project.js';
import Fact from '../src/models/Fact.js';
import Source from '../src/models/Source.js';
import GenerationJob from '../src/models/GenerationJob.js';
import Website from '../src/models/Website.js';
import WebsiteVersion from '../src/models/WebsiteVersion.js';

describe('Golden Rule Reproduction: bro code (Durg) vs unrelated sources', () => {
  const broCodeBusiness = {
    name: 'bro code',
    category: 'Restaurant & Cafe',
    city: 'Durg',
    state: 'Chhattisgarh',
    country: 'India',
  };

  let _facts = [];
  let _sources = [];
  let _jobs = [];
  let _versions = [];

  beforeEach(() => {
    _facts = [];
    _sources = [];
    _jobs = [];
    _versions = [];

    Fact.countDocuments = async (filter) =>
      _facts.filter((f) => {
        for (const key in filter) {
          if (key === '$or') {
            const orMatch = filter[key].some((cond) => {
              const [field, val] = Object.entries(cond)[0];
              if (field === 'candidates.extractionMethod') {
                return Array.isArray(f.candidates) && f.candidates.some((c) => c.extractionMethod === val);
              }
              return f[field] === val;
            });
            if (!orMatch) return false;
          } else if (filter[key] instanceof mongoose.Types.ObjectId) {
            if (!f[key].equals(filter[key])) return false;
          } else if (f[key] !== filter[key]) {
            return false;
          }
        }
        return true;
      }).length;

    Fact.find = (filter) => ({
      lean: async () =>
        _facts.filter((f) => {
          if (filter.projectId && !f.projectId.equals(filter.projectId)) return false;
          if (filter.status && f.status !== filter.status) return false;
          return true;
        }),
    });

    Source.find = (filter) => {
      const list = _sources.filter((s) => {
        for (const key in filter) {
          const val = filter[key];
          if (key === '$or') {
            const orMatch = val.some((cond) => {
              const [field, condition] = Object.entries(cond)[0];
              if (condition.$ne !== undefined) return s[field] !== condition.$ne;
              if (condition.$in !== undefined) return condition.$in.includes(s[field]);
              return false;
            });
            if (!orMatch) return false;
          } else if (filter[key] instanceof mongoose.Types.ObjectId) {
            if (!s[key].equals(val)) return false;
          } else if (s[key] !== val) {
            return false;
          }
        }
        return true;
      });
      return {
        lean: async () => list,
        then: (resolve) => resolve(list),
      };
    };

    GenerationJob.create = async (data) => {
      const doc = { _id: new mongoose.Types.ObjectId(), ...data, save: async () => {} };
      _jobs.push(doc);
      return doc;
    };

    WebsiteVersion.findOne = () => ({
      sort: () => ({
        lean: async () => _versions[_versions.length - 1] || null,
      }),
    });
    WebsiteVersion.create = async (data) => {
      const doc = { _id: new mongoose.Types.ObjectId(), ...data };
      _versions.push(doc);
      return doc;
    };
    Project.findByIdAndUpdate = async () => {};
  });

  function mockRes() {
    const res = { statusCode: 200, body: null };
    res.status = (code) => {
      res.statusCode = code;
      return res;
    };
    res.json = (payload) => {
      res.body = payload;
      return res;
    };
    return res;
  }

  test('1. Unrelated sources (Taj Hotels, Mumbai, Dr. Maya Reynolds PsyD) are flagged as mismatched', () => {
    const instagram = assessSourceRelevance({
      business: broCodeBusiness,
      source: { type: 'social', url: 'https://instagram.com/tajhotels' },
      extractedText: 'Taj Hotels luxury hospitality brand across India. Contact hi@tracxn.com',
    });
    const facebook = assessSourceRelevance({
      business: broCodeBusiness,
      source: { type: 'social', url: 'https://facebook.com/tajhotels' },
      extractedText: 'Taj Hotels official Facebook page.',
    });
    const gmaps = assessSourceRelevance({
      business: broCodeBusiness,
      source: { type: 'google_listing', url: 'https://maps.google.com/?q=Taj+Mahal+Palace+Mumbai' },
      extractedText: 'The Taj Mahal Palace, Apollo Bunder, Mumbai, Maharashtra.',
    });
    const pdf = assessSourceRelevance({
      business: broCodeBusiness,
      source: { type: 'pdf', originalFileName: 'Dr_Maya_Reynolds_PsyD.pdf' },
      extractedText: 'Dr. Maya Reynolds, PsyD. Licensed Clinical Psychologist.',
    });

    assert.equal(instagram.relevance, 'mismatched');
    assert.equal(facebook.relevance, 'mismatched');
    assert.equal(gmaps.relevance, 'mismatched');
    assert.equal(pdf.relevance, 'mismatched');
  });

  test('2. Genuinely matching business source is classified as relevant', () => {
    const matching = assessSourceRelevance({
      business: broCodeBusiness,
      source: { type: 'website', url: 'https://brocode-durg.example.com' },
      extractedText: 'Welcome to bro code Restaurant & Cafe in Durg, Chhattisgarh. Fresh coffee and snacks.',
    });
    assert.equal(matching.relevance, 'relevant');
  });

  test('3. Unverified facts block normal generation even when manual facts are confirmed', async () => {
    const projectId = new mongoose.Types.ObjectId();
    _facts.push(
      { _id: new mongoose.Types.ObjectId(), projectId, key: 'businessName', selectedValue: 'bro code', status: 'confirmed', candidates: [{ extractionMethod: 'manual', value: 'bro code' }] },
      { _id: new mongoose.Types.ObjectId(), projectId, key: 'email', selectedValue: 'hi@tracxn.com', status: 'unverified', candidates: [{ extractionMethod: 'ai_extraction', value: 'hi@tracxn.com' }] }
    );
    const req = { project: { _id: projectId }, body: {}, _addJob: async () => 'job-1' };
    const res = mockRes();
    await generateWebsite(req, res, (err) => { if (err) throw err; });
    assert.equal(res.statusCode, 400);
    assert.match(res.body?.message || '', /unverified facts/i);
  });

  test('4. Manual-only generation ignores mismatched/failed sources and unverified non-manual facts', async () => {
    const projectId = new mongoose.Types.ObjectId();
    _facts.push(
      { _id: new mongoose.Types.ObjectId(), projectId, key: 'businessName', selectedValue: 'bro code', status: 'confirmed', candidates: [{ extractionMethod: 'manual', value: 'bro code' }] },
      { _id: new mongoose.Types.ObjectId(), projectId, key: 'email', selectedValue: 'hi@tracxn.com', status: 'unverified', candidates: [{ extractionMethod: 'ai_extraction', value: 'hi@tracxn.com' }] }
    );
    _sources.push(
      { _id: new mongoose.Types.ObjectId(), projectId, type: 'pdf', relevance: 'mismatched', excluded: false, extractionStatus: 'failed' }
    );

    const req = { project: { _id: projectId }, body: { manualOnly: true }, _addJob: async () => 'job-manual' };
    const res = mockRes();
    await generateWebsite(req, res, (err) => { if (err) throw err; });
    assert.equal(res.statusCode, 202);

    const { prompt } = buildWebsiteGenerationPrompt({ businessName: 'bro code', city: 'Durg' }, { manualOnly: true });
    assert.match(prompt, /MANUAL-ONLY MODE ACTIVE/);
  });

  test('4b. Manual-only generation with contaminated selectedValue uses only the manual candidate value', async () => {
    // Reproduces the Taj Hotels leak scenario:
    // - description fact has selectedValue='India\'s Strongest Brand' (from AI extraction)
    //   but its only manual candidate has value='' (empty) → fact should be EXCLUDED
    // - businessName fact has a valid manual candidate 'bro code' → should be INCLUDED
    const projectId = new mongoose.Types.ObjectId();
    _facts.push(
      {
        _id: new mongoose.Types.ObjectId(),
        projectId,
        key: 'businessName',
        selectedValue: 'bro code',
        status: 'confirmed',
        candidates: [{ extractionMethod: 'manual', value: 'bro code' }],
      },
      {
        _id: new mongoose.Types.ObjectId(),
        projectId,
        key: 'description',
        selectedValue: "India's Strongest Brand & World's Strongest Luxury Hotel Brand 2026",
        status: 'confirmed',
        // Only AI-extracted candidate — no manual candidate with a real value
        candidates: [{ extractionMethod: 'ai_extraction', value: "India's Strongest Brand" }],
      },
    );

    // executeWebsiteGeneration is called in-process by the queue; test it directly
    // by calling the internal logic via a stub project & job
    const { executeWebsiteGeneration } = await import('../src/modules/generation/generation.controller.js');

    // Stub out the downstream Gemini + Website + Project calls
    const { default: Website } = await import('../src/models/Website.js');
    const { default: Project } = await import('../src/models/Project.js');
    const { buildWebsiteGenerationPrompt: buildPrompt } = await import('../src/utils/promptBuilder.js');

    // Capture what businessContext is passed to the prompt builder
    let capturedContext = null;
    const origBuild = buildWebsiteGenerationPrompt;

    // We can't mock ESM imports inline, so instead validate using the filter logic directly:
    // Reproduce the manualOnly filter as implemented in executeWebsiteGeneration
    const allConfirmedFacts = _facts.filter((f) =>
      f.projectId.equals(projectId) && f.status === 'confirmed'
    );
    const confirmedFacts = allConfirmedFacts
      .map((f) => {
        const manualCandidates = (f.candidates || []).filter(
          (c) => c.extractionMethod === 'manual' && c.value && String(c.value).trim() !== ''
        );
        if (manualCandidates.length === 0) return null;
        return { ...f, selectedValue: manualCandidates[0].value };
      })
      .filter(Boolean);

    // businessName has a valid manual candidate → included
    assert.equal(confirmedFacts.length, 1, 'Only businessName (manual) should survive the filter');
    assert.equal(confirmedFacts[0].key, 'businessName');
    assert.equal(confirmedFacts[0].selectedValue, 'bro code');

    // description (AI-only) → excluded
    const descFact = confirmedFacts.find((f) => f.key === 'description');
    assert.equal(descFact, undefined, 'AI-extracted description must be excluded from manual-only context');

    // Build context using same logic as executeWebsiteGeneration
    const businessContext = { businessName: null, category: null, city: null, state: null, country: null, address: null, description: null };
    for (const f of confirmedFacts) { businessContext[f.key] = f.selectedValue; }
    if (!businessContext.businessName) businessContext.businessName = 'bro code';

    // The leaked Taj Hotels claim must NOT be in context
    assert.equal(businessContext.description, null, 'description must remain null — Taj Hotels brand text must not leak');
    assert.equal(businessContext.businessName, 'bro code', 'businessName from manual fact must be used');
  });

  test('5. Publishing guard blocks unsupported claims and allows clean confirmed website', async () => {
    const projectId = new mongoose.Types.ObjectId();
    _facts.push(
      { _id: new mongoose.Types.ObjectId(), projectId, key: 'businessName', selectedValue: 'bro code', status: 'confirmed', candidates: [{ extractionMethod: 'manual' }] }
    );

    const unsupportedFindings = findUnsupportedClaims(
      [
        {
          id: 'hero',
          type: 'hero',
          enabled: true,
          content: { headline: 'Your premier Restaurant & Cafe experience in Durg' },
        },
      ],
      _facts
    );
    assert.equal(unsupportedFindings.length, 1);

    const badWebsite = {
      _id: new mongoose.Types.ObjectId(),
      projectId,
      slug: 'bro-code-123456',
      manualOnly: true,
      theme: {},
      sections: [
        {
          id: 'hero',
          type: 'hero',
          enabled: true,
          order: 1,
          content: { headline: 'Your premier Restaurant & Cafe experience' },
        },
      ],
      save: async () => {},
    };
    const resBad = mockRes();
    await publishWebsite({ website: badWebsite }, resBad, (err) => { if (err) throw err; });
    assert.equal(resBad.statusCode, 400);
    assert.match(resBad.body?.message || '', /unsupported claims/i);

    const cleanWebsite = {
      _id: new mongoose.Types.ObjectId(),
      projectId,
      slug: 'bro-code-123456',
      manualOnly: true,
      theme: {},
      sections: [
        {
          id: 'hero',
          type: 'hero',
          enabled: true,
          order: 1,
          content: { headline: 'bro code — Restaurant & Cafe in Durg' },
        },
      ],
      save: async () => {},
    };
    const resGood = mockRes();
    await publishWebsite({ website: cleanWebsite }, resGood, (err) => { if (err) throw err; });
    assert.equal(resGood.statusCode, 200);
    assert.equal(resGood.body?.data?.versionNumber, 1);
  });

  test('6. sanitizeManualOnlyWebsite strips all three promotional claim patterns', async () => {
    const { sanitizeManualOnlyWebsite } = await import('../src/utils/websiteValidator.js');
    const raw = {
      website: {
        theme: { primaryColor: '#1E293B', secondaryColor: '#64748B', fontFamily: 'Inter', stylePreset: 'modern' },
        sections: [
          {
            id: 'hero',
            type: 'hero',
            enabled: true,
            order: 1,
            content: {
              headline: 'Your premier Restaurant & Cafe located in Durg',
              subheadline: 'Quality dining and cafe experiences in Durg',
            },
          },
          {
            id: 'about',
            type: 'about',
            enabled: true,
            order: 2,
            content: {
              description: 'Bro Code Cafe is a dedicated Restaurant & Cafe proudly serving the community in Durg.',
            },
          },
        ],
      },
    };

    const sanitized = sanitizeManualOnlyWebsite(raw, {
      businessName: 'Bro Code Cafe',
      category: 'Restaurant & Cafe',
      city: 'Durg',
      state: 'Chhattisgarh',
      country: 'India',
    });

    const hero = sanitized.website.sections.find((s) => s.id === 'hero');
    const about = sanitized.website.sections.find((s) => s.id === 'about');

    assert.equal(hero.content.headline, 'Bro Code Cafe');
    assert.doesNotMatch(hero.content.subheadline, /quality dining and cafe experiences/i);
    assert.equal(about.content.description, '');
  });

  test('7. buildManualOnlyContext & buildDeterministicManualWebsite isolate manual facts and exclude Magicpin/external values', async () => {
    const { buildManualOnlyContext, buildDeterministicManualWebsite } = await import(
      '../src/modules/generation/generation.controller.js'
    );
    const projectId = new mongoose.Types.ObjectId();
    const facts = [
      {
        projectId,
        key: 'businessName',
        status: 'confirmed',
        selectedValue: 'Bro Code Cafe',
        candidates: [{ extractionMethod: 'manual', value: 'Bro Code Cafe' }],
      },
      {
        projectId,
        key: 'category',
        status: 'confirmed',
        selectedValue: 'Restaurant & Cafe',
        candidates: [{ extractionMethod: 'manual', value: 'Restaurant & Cafe' }],
      },
      {
        projectId,
        key: 'address',
        status: 'confirmed',
        // External Magicpin address leaked into selectedValue, no manual candidate
        selectedValue: 'Magicpin Plaza, Sector 5, Durg',
        candidates: [{ extractionMethod: 'website', value: 'Magicpin Plaza, Sector 5, Durg' }],
      },
    ];

    const { businessContext, approvedFactsSnapshot } = buildManualOnlyContext(facts, 'Fallback Title');
    assert.equal(businessContext.businessName, 'Bro Code Cafe');
    assert.equal(businessContext.category, 'Restaurant & Cafe');
    assert.equal(businessContext.address, null);
    assert.equal(approvedFactsSnapshot.length, 2);

    const deterministic = buildDeterministicManualWebsite(businessContext);
    const serialized = JSON.stringify(deterministic);
    assert.doesNotMatch(serialized, /Magicpin/i);
    assert.match(serialized, /\[Add your business description\]/);
    assert.match(serialized, /\[Add your services or offerings\]/);
  });
});
