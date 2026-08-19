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
      await api.post(`/attempts/${attemptId}/sync-answer`, {
        questionId,
        selectedOption,
        status,
        violations,
        violationLogs,
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
      await api.post(`/attempts/${attemptId}/sync-answer`, {
        violations,
        violationLogs,
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
        await api.post(`/attempts/${item.attemptId}/sync-answer`, {
          questionId: item.questionId,
          selectedOption: item.selectedOption,
          status: item.status,
          violations: item.violations,
          violationLogs: item.violationLogs,
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
