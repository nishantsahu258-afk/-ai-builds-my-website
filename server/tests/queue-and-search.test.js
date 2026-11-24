import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { addJob, sourceQueue, generationQueue } from '../src/queue/queue.js';
import { search } from '../src/integrations/search/search.service.js';

describe('5. In-Process Job Queue Engine (Zero Redis Dependency)', () => {
  test('dispatches job and returns in-process job ID without throwing', async () => {
    const jobId = await addJob(sourceQueue, 'process-source', {
      sourceId: 'dummy-source-id',
      projectId: 'dummy-project-id',
    });

    assert.ok(jobId);
    assert.match(jobId, /^inproc-/);
  });

  test('handles research and generation jobs in-process without crashing', async () => {
    const genJobId = await addJob(generationQueue, 'generate-website', {
      projectId: 'dummy-proj-id',
      jobId: null,
    });

    assert.ok(genJobId);
    assert.match(genJobId, /^inproc-/);
  });
});

describe('6. Tavily Search Integration Graceful Handling', () => {
  test('handles unconfigured or missing Tavily key without crashing', async () => {
    const res = await search('Sharma Electronics Durg');
    assert.equal(res.success, false);
    assert.ok(res.error);
    assert.equal(Array.isArray(res.results), true);
  });
});
