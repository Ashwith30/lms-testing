import { Attempt, User, Test } from '../types';
import { api } from './api';

export interface StudentResult extends Attempt {
  student: User;
  test: Test;
}

export const resultService = {
  getTrainerResults: async (): Promise<StudentResult[]> => {
    try {
      const [attemptsRes, usersRes, testsRes] = await Promise.all([
        api.get('/attempts'),
        api.get('/users/all'),
        api.get('/tests')
      ]);

      const attempts: Attempt[] = (attemptsRes.data || []).filter(
        (a: Attempt) => a.status === 'submitted' || a.status === 'auto_submitted'
      );
      const users: User[] = usersRes.data || [];
      const tests: Test[] = testsRes.data || [];

      const userMap = new Map(users.map(u => [u.id, u]));
      const testMap = new Map(tests.map(t => [t.id, t]));

      const results: StudentResult[] = [];
      for (const attempt of attempts) {
        const student = userMap.get(attempt.studentId);
        const test = testMap.get(attempt.testId);
        if (student && test) {
          results.push({
            ...attempt,
            student,
            test
          });
        }
      }
      return results;
    } catch (e) {
      console.error("Error fetching trainer results", e);
      return [];
    }
  },
  
  getStudentResults: async (studentId: string): Promise<StudentResult[]> => {
    try {
      const [attemptsRes, userRes, testsRes] = await Promise.all([
        api.get(`/attempts?studentId=${studentId}`),
        api.get(`/users/${studentId}`).catch(() => ({ data: null })),
        api.get('/tests')
      ]);

      const attempts: Attempt[] = (attemptsRes.data || []).filter(
        (a: Attempt) => a.status === 'submitted' || a.status === 'auto_submitted'
      );
      const student: User = userRes.data;
      const tests: Test[] = testsRes.data || [];
      const testMap = new Map(tests.map(t => [t.id, t]));

      const results: StudentResult[] = [];
      for (const attempt of attempts) {
        const test = testMap.get(attempt.testId);
        if (test) {
          results.push({
            ...attempt,
            student: student || { id: studentId, name: 'Student', email: '', role: 'student', createdAt: '' },
            test
          });
        }
      }
      return results;
    } catch (e) {
      console.error("Error fetching student results", e);
      return [];
    }
  },

  getAttemptDetails: async (attemptId: string): Promise<StudentResult | null> => {
    try {
      const attemptRes = await api.get(`/attempts/${attemptId}`);
      const attempt: Attempt = attemptRes.data;
      if (!attempt) return null;

      const [userRes, testRes] = await Promise.all([
        api.get(`/users/${attempt.studentId}`).catch(() => ({ data: null })),
        api.get(`/tests/${attempt.testId}`).catch(() => ({ data: null }))
      ]);

      if (!testRes.data) return null;

      return {
        ...attempt,
        student: userRes.data || { id: attempt.studentId, name: 'Student', email: '', role: 'student', createdAt: '' },
        test: testRes.data
      };
    } catch (e) {
      console.error("Error fetching attempt details", e);
      return null;
    }
  }
};
