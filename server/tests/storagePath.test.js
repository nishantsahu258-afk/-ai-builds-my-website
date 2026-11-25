import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import path from 'path';
import fs from 'fs/promises';
import { config } from '../src/config/index.js';
import { getStorageService } from '../src/integrations/storage/storage.service.js';

describe('Storage Path Resolution (PDF ENOENT regression)', () => {
  test('config.storage.uploadDir is an absolute path under server root', () => {
    assert.equal(path.isAbsolute(config.storage.uploadDir), true);
    assert.equal(config.storage.uploadDir.includes(`uploads${path.sep}uploads`), false);
  });

  test('getFilePath resolves relative storageKey, Windows separators, and legacy uploads/ prefix without duplication', async () => {
    const storage = getStorageService();
    const projectId = 'test-project-enoent';
    const fileName = 'sample-test.pdf';
    const projectDir = path.join(config.storage.uploadDir, projectId);
    const expectedPath = path.join(projectDir, fileName);

    await fs.mkdir(projectDir, { recursive: true });
    await fs.writeFile(expectedPath, Buffer.from('%PDF-1.4\n%EOF\n'));

    try {
      const resolvedFromRel = storage.getFilePath(`${projectId}/${fileName}`);
      const resolvedFromWin = storage.getFilePath(`${projectId}\\${fileName}`);
      const resolvedFromPrefixed = storage.getFilePath(`uploads/${projectId}/${fileName}`);

      assert.equal(path.resolve(resolvedFromRel), path.resolve(expectedPath));
      assert.equal(path.resolve(resolvedFromWin), path.resolve(expectedPath));
      assert.equal(path.resolve(resolvedFromPrefixed), path.resolve(expectedPath));
      assert.equal(resolvedFromRel.replace(/\\/g, '/').includes('uploads/uploads'), false);

      await fs.access(resolvedFromRel);
    } finally {
      await fs.rm(projectDir, { recursive: true, force: true });
    }
  });

  test('getFilePath rejects path traversal keys', () => {
    const storage = getStorageService();
    assert.throws(() => storage.getFilePath('../../etc/passwd'), /path traversal/i);
    assert.throws(() => storage.getFilePath('..\\..\\Windows\\win.ini'), /path traversal/i);
  });

  test('missing file fails fs.access cleanly', async () => {
    const storage = getStorageService();
    const missingPath = storage.getFilePath('nonexistent-proj/missing.pdf');
    await assert.rejects(() => fs.access(missingPath), { code: 'ENOENT' });
  });
});
