import assert from 'node:assert/strict';
import { test, describe, beforeEach } from 'node:test';
import mongoose from 'mongoose';
import Project from '../src/models/Project.js';
import Fact from '../src/models/Fact.js';
import Source from '../src/models/Source.js';
import GenerationJob from '../src/models/GenerationJob.js';
import { generateWebsite } from '../src/modules/generation/generation.controller.js';
import { excludeSource } from '../src/modules/sources/sources.controller.js';

// In-memory mock storage
let _projects = [];
let _facts = [];
let _sources = [];
let _jobs = [];
let _dispatchedJobs = [];

function resetMocks() {
  _projects = [];
  _facts = [];
  _sources = [];
  _jobs = [];
  _dispatchedJobs = [];
}

// Mock static methods on models
Project.create = async (data) => {
  const doc = { _id: new mongoose.Types.ObjectId(), ...data, save: async () => {} };
  _projects.push(doc);
  return doc;
};
Project.findById = async (id) => _projects.find((p) => p._id.equals(id));
Project.findOne = async (filter) =>
  _projects.find((p) => {
    if (filter._id && !p._id.equals(filter._id)) return false;
    if (filter.ownerId && !p.ownerId.equals(filter.ownerId)) return false;
    return true;
  }) || null;

Fact.create = async (data) => {
  const doc = { _id: new mongoose.Types.ObjectId(), ...data };
  _facts.push(doc);
  return doc;
};
Fact.countDocuments = async (filter) => {
  return _facts.filter((f) => {
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
};
Fact.find = (filter) => ({
  lean: async () =>
    _facts.filter((f) => {
      if (filter.projectId && !f.projectId.equals(filter.projectId)) return false;
      if (filter.status && f.status !== filter.status) return false;
      return true;
    }),
});

Source.create = async (data) => {
  const doc = {
    _id: new mongoose.Types.ObjectId(),
    ...data,
    save: async function () {
      return this;
    },
  };
  _sources.push(doc);
  return doc;
};
Source.find = async (filter) => {
  return _sources
    .filter((s) => {
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
        } else if (s[key] !== val) {
          return false;
        }
      }
      return true;
    })
    .map((s) => ({ ...s }));
};
Source.findById = async (id) => _sources.find((s) => s._id.equals(id)) || null;

GenerationJob.create = async (data) => {
  const doc = { _id: new mongoose.Types.ObjectId(), ...data, save: async () => {} };
  _jobs.push(doc);
  return doc;
};

// Helpers to create entities
async function createProject() {
  return await Project.create({
    title: 'Test',
    ownerId: new mongoose.Types.ObjectId(),
    status: 'draft',
  });
}
async function createFact(projectId, status, extractionMethod = 'manual', overrides = {}) {
  return await Fact.create({
    projectId,
    key: overrides.key || 'businessName',
    selectedValue: overrides.selectedValue || 'Biz',
    status,
    // extractionMethod lives on candidates, not on the top-level Fact document
    candidates: [{ extractionMethod, value: overrides.selectedValue || 'Biz' }],
    evidence: null,
    ...overrides,
  });
}
async function createSource(projectId, relevance, excluded = false, extractionStatus = 'completed') {
  return await Source.create({
    projectId,
    type: 'website',
    relevance,
    excluded,
    extractionStatus,
  });
}

function mockReq(project, body = {}, params = {}) {
  return {
    project,
    user: { id: project.ownerId },
    body,
    params,
    _addJob: async (queue, name, payload) => {
      _dispatchedJobs.push({ name, payload });
      return 'mock-job-id';
    },
  };
}
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
const failNext = (err) => {
  if (err) throw err;
};

describe('Source exclusion and generation blocking logic', () => {
  beforeEach(() => resetMocks());

  test('1. Excluded mismatched source does not block generation when confirmed facts exist', async () => {
    const proj = await createProject();
    await createFact(proj._id, 'confirmed', 'manual');
    await createSource(proj._id, 'mismatched', true, 'completed');
    const req = mockReq(proj);
    const res = mockRes();
    await generateWebsite(req, res, failNext);
    assert.equal(res.statusCode, 202);
    assert.equal(_dispatchedJobs.length, 1);
  });

  test('2. Failed active (non-excluded) source blocks generation', async () => {
    const proj = await createProject();
    await createFact(proj._id, 'confirmed', 'manual');
    await createSource(proj._id, 'relevant', false, 'failed');
    const req = mockReq(proj);
    const res = mockRes();
    await generateWebsite(req, res, failNext);
    assert.equal(res.statusCode, 400);
    assert.match(res.body?.message || '', /Some sources are not ready or relevant/);
  });

  test('3. Unresolved fact conflict blocks generation even with excluded source', async () => {
    const proj = await createProject();
    await createFact(proj._id, 'conflict', 'manual');
    await createSource(proj._id, 'mismatched', true, 'completed');
    const req = mockReq(proj);
    const res = mockRes();
    await generateWebsite(req, res, failNext);
    assert.equal(res.statusCode, 400);
    assert.match(res.body?.message || '', /unresolved conflicting facts/);
  });

  test('4. excludeSource controller sets excluded=true without overwriting original relevance', async () => {
    const proj = await createProject();
    const src = await createSource(proj._id, 'mismatched', false, 'completed');
    const req = mockReq(proj, {}, { sourceId: src._id });
    const res = mockRes();
    await excludeSource(req, res, failNext);
    assert.equal(res.statusCode, 200);
    const refreshed = await Source.findById(src._id);
    assert.equal(refreshed.relevance, 'mismatched');
    assert.equal(refreshed.excluded, true);
  });

  test('5. Manual-only generation ignores failed/mismatched sources and non-manual facts', async () => {
    const proj = await createProject();
    await createFact(proj._id, 'confirmed', 'manual');
    await createFact(proj._id, 'conflict', 'llm');
    await createSource(proj._id, 'mismatched', false, 'failed');

    const req = mockReq(proj, { manualOnly: true });
    const res = mockRes();
    await generateWebsite(req, res, failNext);
    assert.equal(res.statusCode, 202);
    assert.equal(_dispatchedJobs.length, 1);
    assert.equal(_dispatchedJobs[0].payload.manualOnly, true);
  });

  test('6. Manual-only generation blocks when no confirmed manual facts exist', async () => {
    const proj = await createProject();
    await createFact(proj._id, 'confirmed', 'llm');

    const req = mockReq(proj, { manualOnly: true });
    const res = mockRes();
    await generateWebsite(req, res, failNext);
    assert.equal(res.statusCode, 400);
    assert.match(res.body?.message || '', /No confirmed manual facts available/);
  });
});
