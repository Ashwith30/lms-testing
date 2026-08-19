import { Test, Schedule, Attempt, Question } from '../types';
import { api } from './api';

export const testService = {
  getTrainerTests: async (trainerId?: string): Promise<Test[]> => {
    const url = trainerId ? `/tests?createdBy=${trainerId}` : '/tests';
    const res = await api.get(url);
    return res.data;
  },

  createTest: async (test: Omit<Test, 'id' | 'createdAt'>): Promise<Test> => {
    const newTest = {
      ...test,
      id: `t-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    const res = await api.post('/tests', newTest);
    return res.data;
  },

  updateTest: async (testId: string, updates: Partial<Test>): Promise<Test> => {
    const res = await api.put(`/tests/${testId}`, updates);
    return res.data;
  },

  deleteTest: async (testId: string): Promise<void> => {
    await api.delete(`/tests/${testId}`);
  },

  scheduleTest: async (schedule: Omit<Schedule, 'id'>): Promise<Schedule> => {
    const newSchedule = {
      ...schedule,
      id: `s-${Date.now()}`,
    };
    const res = await api.post('/schedules', newSchedule);
    return res.data;
  },

  updateSchedule: async (scheduleId: string, updates: Partial<Schedule>): Promise<Schedule> => {
    const res = await api.put(`/schedules/${scheduleId}`, updates);
    return res.data;
  },

  getScheduleById: async (scheduleId: string): Promise<Schedule | undefined> => {
    try {
      const res = await api.get(`/schedules/${scheduleId}`);
      return res.data;
    } catch {
      return undefined;
    }
  },

  deleteSchedule: async (scheduleId: string): Promise<void> => {
    await api.delete(`/schedules/${scheduleId}`);
  },

  getBatches: async (): Promise<string[]> => {
    try {
      const res = await api.get('/batches');
      return res.data;
    } catch {
      return [];
    }
  },

  getStudentUpcomingTests: async (studentId: string) => {
    const schedulesRes = await api.get('/schedules');
    const testsRes = await api.get('/tests');
    const attemptsRes = await api.get(`/attempts?studentId=${studentId}`);
    
    const schedules: Schedule[] = schedulesRes.data;
    const tests: Test[] = testsRes.data;
    const attempts: Attempt[] = attemptsRes.data;

    const now = new Date().toISOString();
    
    return schedules.map(s => {
      const test = tests.find(t => t.id === s.testId);
      const attempt = attempts.find(a => a.testId === s.testId);
      
      return {
        schedule: s,
        test: test as Test,
        attempt,
        isAvailable: now >= s.startTime && now <= s.endTime && (!attempt || (attempt.status !== 'submitted' && attempt.status !== 'auto_submitted'))
      };
    }).filter(item => item.test);
  },

  getTestDetails: async (testId: string): Promise<Test | undefined> => {
    try {
      const res = await api.get(`/tests/${testId}`);
      return res.data;
    } catch {
      const testsRes = await api.get('/tests');
      return testsRes.data.find((t: Test) => t.id === testId);
    }
  },

  getTestSchedule: async (testId: string): Promise<Schedule | undefined> => {
    const schedulesRes = await api.get('/schedules');
    return schedulesRes.data.find((s: Schedule) => s.testId === testId);
  },
  
  getQuestionsForTest: async (testId: string): Promise<Question[]> => {
    const test = await testService.getTestDetails(testId);
    if (!test) return [];
    
    const allQsRes = await api.get('/questions');
    return allQsRes.data.filter((q: Question) => test.questionIds.includes(q.id));
  },

  startAttempt: async (studentId: string, testId: string): Promise<Attempt> => {
    const test = await testService.getTestDetails(testId);
    if (!test) throw new Error('Test not found');

    const attemptsRes = await api.get(`/attempts?studentId=${studentId}`);
    const existingAttempt = attemptsRes.data.find((a: Attempt) => a.testId === testId);
    
    if (existingAttempt) {
      if (existingAttempt.status === 'submitted' || existingAttempt.status === 'auto_submitted') {
        throw new Error('Test already submitted');
      }
      return existingAttempt; // Resume
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + (test.settings?.duration || 30) * 60000);

    const initialAnswers: Record<string, any> = {};
    (test.questionIds || []).forEach(id => {
      initialAnswers[id] = { questionId: id, selectedOption: null, status: 'not_visited' };
    });

    const newAttempt = {
      id: `att-${Date.now()}`,
      studentId,
      testId,
      startedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      answers: initialAnswers,
      violations: 0,
      status: 'in_progress'
    };

    const res = await api.post('/attempts', newAttempt);
    return res.data;
  },

  updateAttempt: async (attemptId: string, updates: Partial<Attempt>) => {
    await api.put(`/attempts/${attemptId}`, updates);
  },

  submitAttempt: async (
    attemptId: string, 
    isAutoSubmit: boolean = false, 
    currentAnswers?: Record<string, any>, 
    violations?: number,
    violationLogs?: import('../types').ViolationLog[],
    proctoringSummary?: import('../types').ProctoringSummary
  ): Promise<Attempt> => {
    // Submit to server for secure server-side scoring & completion
    const payload: any = { isAutoSubmit };
    if (currentAnswers) payload.answers = currentAnswers;
    if (violations !== undefined) payload.violations = violations;
    if (violationLogs) payload.violationLogs = violationLogs;
    if (proctoringSummary) payload.proctoringSummary = proctoringSummary;

    const res = await api.post(`/attempts/${attemptId}/submit`, payload);
    return res.data;
  },

  getStudentDashboardData: async (studentId: string) => {
    const res = await api.get(`/student/dashboard/${studentId}`);
    return res.data as {
      upcoming_tests: {
        schedule: import('../types').Schedule;
        test: import('../types').Test;
        attempt?: import('../types').Attempt;
        isAvailable: boolean;
      }[];
      past_exams: {
        attempt: import('../types').Attempt;
        test: import('../types').Test;
      }[];
      stats: {
        totalCompleted: number;
        averageScore: number;
        highestScore: number;
      };
    };
  },

  getStudentAnalytics: async (studentId: string) => {
    const res = await api.get(`/student/analytics/${studentId}`);
    return res.data;
  }
};
