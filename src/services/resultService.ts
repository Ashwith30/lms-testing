import { Attempt, User, Test } from '../types';
import { api } from './api';

export interface StudentResult extends Attempt {
  student: User;
  test: Test;
}

export const resultService = {
  getTrainerResults: async (): Promise<StudentResult[]> => {
    const attemptsRes = await api.get('/attempts');
    const attempts: Attempt[] = attemptsRes.data.filter((a: Attempt) => a.status === 'submitted' || a.status === 'auto_submitted');
    
    // We will fetch users and tests individually since we don't have a bulk API yet
    // In production, this would be a single JOIN endpoint
    const results: StudentResult[] = [];
    
    for (const attempt of attempts) {
      try {
        const uRes = await api.get(`/users/${attempt.studentId}`);
        const tRes = await api.get(`/tests`);
        const test = tRes.data.find((t: Test) => t.id === attempt.testId);
        if (test) {
          results.push({
            ...attempt,
            student: uRes.data,
            test: test
          });
        }
      } catch (e) {
        console.error("Error fetching related data for attempt", e);
      }
    }
    return results;
  },
  
  getStudentResults: async (studentId: string): Promise<StudentResult[]> => {
    const attemptsRes = await api.get(`/attempts?studentId=${studentId}`);
    const attempts: Attempt[] = attemptsRes.data.filter((a: Attempt) => a.status === 'submitted' || a.status === 'auto_submitted');
    
    const results: StudentResult[] = [];
    
    try {
      const uRes = await api.get(`/users/${studentId}`);
      const tRes = await api.get(`/tests`);
      
      for (const attempt of attempts) {
        const test = tRes.data.find((t: Test) => t.id === attempt.testId);
        if (test) {
          results.push({
            ...attempt,
            student: uRes.data,
            test: test
          });
        }
      }
    } catch (e) {
      console.error("Error fetching student results", e);
    }
    
    return results;
  },

  getAttemptDetails: async (attemptId: string): Promise<StudentResult | null> => {
    try {
      // Find attempt (assuming it belongs to the logged in user or trainer)
      // Since we don't have a GET /attempts/{id} we will fetch all and filter for now
      const attemptsRes = await api.get('/attempts');
      const attempt = attemptsRes.data.find((a: Attempt) => a.id === attemptId);
      
      if (!attempt) return null;
      
      const uRes = await api.get(`/users/${attempt.studentId}`);
      const tRes = await api.get(`/tests`);
      const test = tRes.data.find((t: Test) => t.id === attempt.testId);
      
      if (!test) return null;
      
      return {
        ...attempt,
        student: uRes.data,
        test: test
      };
    } catch (e) {
      return null;
    }
  }
};
