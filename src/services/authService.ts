import { User } from '../types';
import { api } from './api';

export const authService = {
  login: async (identifier: string, password: string): Promise<User | null> => {
    try {
      const response = await api.post('/auth/login', { identifier, password });
      return response.data;
    } catch (e) {
      throw new Error('Invalid credentials');
    }
  },
  
  getCurrentUser: async (): Promise<User | null> => {
    const userId = localStorage.getItem('lms_current_user');
    if (!userId) return null;
    try {
      const response = await api.get(`/users/${userId}`);
      return response.data;
    } catch (e) {
      return null;
    }
  },

  setCurrentUser: (user: User | null) => {
    if (user) {
      localStorage.setItem('lms_current_user', user.id);
    } else {
      localStorage.removeItem('lms_current_user');
    }
  },

  registerStudent: async (studentData: Omit<User, 'id' | 'role' | 'createdAt'>): Promise<User> => {
    try {
      const response = await api.post('/auth/register/student', studentData);
      return response.data;
    } catch (e: any) {
      throw new Error(e.response?.data?.detail || 'Failed to register student');
    }
  },

  registerTrainer: async (trainerData: { name: string; email: string; password?: string }): Promise<User> => {
    try {
      const response = await api.post('/auth/register/trainer', trainerData);
      return response.data;
    } catch (e: any) {
      throw new Error(e.response?.data?.detail || 'Failed to register trainer');
    }
  }
};
