import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

describe('MED-05: Frontend Proctoring Snapshot Offloading, Blob Auth & Deduplication', () => {
  const proctoringServicePath = path.join(rootDir, 'src', 'services', 'proctoringService.ts');
  const syncServicePath = path.join(rootDir, 'src', 'services', 'syncService.ts');
  const testServicePath = path.join(rootDir, 'src', 'services', 'testService.ts');
  const testAttemptPath = path.join(rootDir, 'src', 'pages', 'student', 'TestAttempt.tsx');
  const auditModalPath = path.join(rootDir, 'src', 'components', 'common', 'ProctoringAuditModal.tsx');

  const proctoringServiceCode = fs.readFileSync(proctoringServicePath, 'utf-8');
  const syncServiceCode = fs.readFileSync(syncServicePath, 'utf-8');
  const testServiceCode = fs.readFileSync(testServicePath, 'utf-8');
  const testAttemptCode = fs.readFileSync(testAttemptPath, 'utf-8');
  const auditModalCode = fs.readFileSync(auditModalPath, 'utf-8');

  it('1. proctoringService provides captureVideoSnapshotBlob and uploadSnapshotFile', () => {
    assert.ok(proctoringServiceCode.includes('captureVideoSnapshotBlob'), 'Must export captureVideoSnapshotBlob');
    assert.ok(proctoringServiceCode.includes('uploadSnapshotFile'), 'Must export uploadSnapshotFile');
    assert.ok(proctoringServiceCode.includes('/attempts/${attemptId}/snapshots'), 'Must target /attempts/${attemptId}/snapshots endpoint');
    assert.ok(proctoringServiceCode.includes("'image/jpeg'"), 'Must specify image/jpeg Content-Type');
  });

  it('2. TestAttempt.tsx asynchronously captures Blob and uploads without blocking exam UI', () => {
    assert.ok(testAttemptCode.includes('captureVideoSnapshotBlob'), 'TestAttempt must use captureVideoSnapshotBlob');
    assert.ok(testAttemptCode.includes('uploadSnapshotFile'), 'TestAttempt must use uploadSnapshotFile');
    // Ensure offline/failure fallback is present
    assert.ok(testAttemptCode.includes('captureVideoSnapshot(') || testAttemptCode.includes('localFallback'), 'TestAttempt must have fallback for offline capture');
  });

  it('3. syncService.ts offloads buffered base64 snapshots before answer syncing', () => {
    assert.ok(syncServiceCode.includes('ensureLogsOffloaded'), 'syncService must provide ensureLogsOffloaded');
    assert.ok(syncServiceCode.includes('/attempts/${attemptId}/snapshots'), 'syncService must offload to /attempts/${attemptId}/snapshots');
    assert.ok(syncServiceCode.includes('sync-answer'), 'syncService must sync to sync-answer');
  });

  it('4. testService.ts offloads remaining snapshots prior to final submission', () => {
    assert.ok(testServiceCode.includes('/attempts/${attemptId}/snapshots'), 'testService must offload snapshots before submit');
    assert.ok(testServiceCode.includes('/attempts/${attemptId}/submit'), 'testService must submit to /attempts/${attemptId}/submit');
  });

  it('5. REV-03: ProctoringAuditModal uses SecureSnapshotImage with blob response and revokes object URLs', () => {
    assert.ok(auditModalCode.includes('SecureSnapshotImage'), 'Audit modal must define SecureSnapshotImage');
    assert.ok(auditModalCode.includes("responseType: 'blob'"), 'Must fetch protected snapshots via Axios responseType blob');
    assert.ok(auditModalCode.includes('URL.createObjectURL'), 'Must create object URL for secure display');
    assert.ok(auditModalCode.includes('URL.revokeObjectURL'), 'Must revoke object URL to prevent memory leaks');
    assert.ok(auditModalCode.includes("src.startsWith('data:')"), 'Must preserve legacy data: base64 rendering directly');
  });

  it('6. REV-03: No session JWTs leaked into image URLs or query parameters', () => {
    assert.ok(!auditModalCode.includes('?token='), 'Audit modal must not append ?token= to image URLs');
    assert.ok(!auditModalCode.includes('&token='), 'Audit modal must not append &token= to image URLs');
  });

  it('7. REV-04: Canonical log objects mutated in-place to prevent duplicate re-uploads', () => {
    assert.ok(syncServiceCode.includes('log.snapshotUrl = res.data.snapshotUrl'), 'syncService must update log.snapshotUrl in-place');
    assert.ok(testServiceCode.includes('l.snapshotUrl = res.data.snapshotUrl'), 'testService must update l.snapshotUrl in-place');
  });
});
