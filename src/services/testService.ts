import { Test, Schedule, Attempt, Question } from '../types';
import { api } from './api';

export const testService = {
  getTrainerTests: async (): Promise<Test[]> => {
    const res = await api.get('/tests');
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

  scheduleTest: async (schedule: Omit<Schedule, 'id'>): Promise<Schedule> => {
    const newSchedule = {
      ...schedule,
      id: `s-${Date.now()}`,
    };
    const res = await api.post('/schedules', newSchedule);
    
    // Update test status to Scheduled
    await api.put(`/tests/${schedule.testId}`, { status: 'Scheduled' });
    
    return res.data;
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
        isAvailable: now >= s.startTime && now <= s.endTime && (!attempt || attempt.status !== 'submitted')
      };
    }).filter(item => item.test);
  },

  getTestDetails: async (testId: string): Promise<Test | undefined> => {
    const testsRes = await api.get('/tests');
    return testsRes.data.find((t: Test) => t.id === testId);
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
      if (existingAttempt.status === 'submitted') {
        throw new Error('Test already submitted');
      }
      return existingAttempt; // Resume
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + test.settings.duration * 60000);

    const initialAnswers: Record<string, any> = {};
    test.questionIds.forEach(id => {
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

  submitAttempt: async (attemptId: string): Promise<Attempt> => {
    // Fetch attempt
    const attemptsRes = await api.get(`/attempts`);
    const attempt = attemptsRes.data.find((a: Attempt) => a.id === attemptId);
    if (!attempt) throw new Error('Attempt not found');
    
    const test = await testService.getTestDetails(attempt.testId);
    const questionsRes = await api.get('/questions');
    
    let score = 0;
    
    if (test) {
      const testQuestions = questionsRes.data.filter((q: Question) => test.questionIds.includes(q.id));
      
      testQuestions.forEach((q: Question) => {
        const answer = attempt.answers[q.id];
        if (answer && answer.selectedOption === q.correctAnswer) {
          score += q.marks;
        } else if (answer && answer.selectedOption && test.settings.negativeMarking) {
          score -= (q.marks * 0.25); // Assume 25% negative marking
        }
      });
    }
    
    const percentage = test ? Math.max(0, (score / test.totalMarks) * 100) : 0;
    
    const updates = {
      status: 'submitted',
      submittedAt: new Date().toISOString(),
      score,
      percentage
    };
    
    const res = await api.put(`/attempts/${attempt.id}`, updates);
    return res.data;
  }
};
