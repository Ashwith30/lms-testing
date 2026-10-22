import { api } from './api';
import { AnswerRecord, ViolationLog, ProctoringSummary } from '../types';

export type SyncStatus = 'synced' | 'syncing' | 'offline' | 'error';

interface PendingSyncItem {
  id: string;
  attemptId: string;
  questionId?: string;
  selectedOption?: string | null;
  status?: string;
  violations?: number;
  violationLogs?: ViolationLog[];
  proctoringSummary?: ProctoringSummary;
  timestamp: string;
}

class AttemptSyncEngine {
  private queue: PendingSyncItem[] = [];
  private isFlushing = false;
  private statusListeners: ((status: SyncStatus, pendingCount: number) => void)[] = [];
  private currentStatus: SyncStatus = 'synced';

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.notifyStatus('syncing');
        this.flushQueue();
      });

      window.addEventListener('offline', () => {
        this.notifyStatus('offline');
      });
    }
  }

  public subscribeStatus(listener: (status: SyncStatus, pendingCount: number) => void) {
    this.statusListeners.push(listener);
    listener(this.currentStatus, this.queue.length);
    return () => {
      this.statusListeners = this.statusListeners.filter(l => l !== listener);
    };
  }

  private notifyStatus(status: SyncStatus) {
    this.currentStatus = status;
    this.statusListeners.forEach(l => l(status, this.queue.length));
  }

  /**
   * Save answer locally for 0ms optimistic resilience
   */
  public saveAnswerLocal(attemptId: string, answers: Record<string, AnswerRecord>) {
    try {
      localStorage.setItem(`lms_attempt_${attemptId}_answers`, JSON.stringify(answers));
    } catch (e) {
      console.warn('LocalStorage save error:', e);
    }
  }

  /**
   * Retrieve locally cached answers
   */
  public getLocalAnswers(attemptId: string): Record<string, AnswerRecord> | null {
    try {
      const data = localStorage.getItem(`lms_attempt_${attemptId}_answers`);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  /**
   * Automatically offloads any buffered base64 snapshots to the snapshot storage endpoint,
   * converting them into lightweight relative URL references before syncing to the database.
   */
  private async ensureLogsOffloaded(attemptId: string, logs?: ViolationLog[]): Promise<ViolationLog[] | undefined> {
    if (!logs || logs.length === 0) return logs;
    let modified = false;
    const resolved: ViolationLog[] = [];

    for (const log of logs) {
      if (log.snapshotUrl && log.snapshotUrl.startsWith('data:')) {
        try {
          const res = await api.post(`/attempts/${attemptId}/snapshots`, { image: log.snapshotUrl });
          if (res.data?.snapshotUrl) {
            log.snapshotUrl = res.data.snapshotUrl;
            resolved.push(log);
            modified = true;
            continue;
          }
        } catch (e) {
          console.warn('Deferred snapshot upload failed, retaining offline proof:', e);
        }
      }
      resolved.push(log);
    }
    return modified ? resolved : logs;
  }

  /**
   * Directly sync answer to the database
   */
  public async syncAnswerDirect(
    attemptId: string,
    questionId: string,
    selectedOption: string | null,
    status: string,
    violations?: number,
    violationLogs?: ViolationLog[],
    proctoringSummary?: ProctoringSummary
  ): Promise<boolean> {
    const item: PendingSyncItem = {
      id: `${Date.now()}-${Math.random()}`,
      attemptId,
      questionId,
      selectedOption,
      status,
      violations,
      violationLogs,
      proctoringSummary,
      timestamp: new Date().toISOString()
    };

    if (!navigator.onLine) {
      this.queue.push(item);
      this.notifyStatus('offline');
      return false;
    }

    this.notifyStatus('syncing');
    try {
      const cleanLogs = await this.ensureLogsOffloaded(attemptId, violationLogs);
      await api.post(`/attempts/${attemptId}/sync-answer`, {
        questionId,
        selectedOption,
        status,
        violations,
        violationLogs: cleanLogs,
        proctoringSummary
      });
      this.notifyStatus('synced');
      return true;
    } catch (err) {
      console.warn('Direct answer sync failed, queued for retry:', err);
      this.queue.push(item);
      this.notifyStatus('offline');
      return false;
    }
  }

  /**
   * Direct sync of proctoring violations to DB
   */
  public async syncViolationsDirect(
    attemptId: string,
    violations: number,
    violationLogs: ViolationLog[],
    proctoringSummary?: ProctoringSummary
  ): Promise<boolean> {
    if (!navigator.onLine) {
      this.queue.push({
        id: `${Date.now()}-${Math.random()}`,
        attemptId,
        violations,
        violationLogs,
        proctoringSummary,
        timestamp: new Date().toISOString()
      });
      this.notifyStatus('offline');
      return false;
    }

    try {
      const cleanLogs = await this.ensureLogsOffloaded(attemptId, violationLogs);
      await api.post(`/attempts/${attemptId}/sync-answer`, {
        violations,
        violationLogs: cleanLogs,
        proctoringSummary
      });
      return true;
    } catch (err) {
      console.warn('Violation sync failed:', err);
      return false;
    }
  }

  /**
   * Flush queued pending changes when network is restored
   */
  public async flushQueue() {
    if (this.isFlushing || this.queue.length === 0 || !navigator.onLine) return;
    this.isFlushing = true;
    this.notifyStatus('syncing');

    try {
      while (this.queue.length > 0) {
        const item = this.queue[0];
        const cleanLogs = await this.ensureLogsOffloaded(item.attemptId, item.violationLogs);
        await api.post(`/attempts/${item.attemptId}/sync-answer`, {
          questionId: item.questionId,
          selectedOption: item.selectedOption,
          status: item.status,
          violations: item.violations,
          violationLogs: cleanLogs,
          proctoringSummary: item.proctoringSummary
        });
        this.queue.shift();
      }
      this.notifyStatus('synced');
    } catch (e) {
      console.warn('Queue flush encountered error:', e);
      this.notifyStatus('offline');
    } finally {
      this.isFlushing = false;
    }
  }

  /**
   * Clean up attempt cached data upon normal submit
   */
  public clearLocalAttempt(attemptId: string) {
    try {
      localStorage.removeItem(`lms_attempt_${attemptId}_answers`);
    } catch {}
  }
}

export const syncService = new AttemptSyncEngine();
