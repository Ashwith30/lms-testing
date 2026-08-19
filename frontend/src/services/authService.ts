import { User } from '../types';
import { api } from './api';

export const authService = {
  login: async (identifier: string, password: string): Promise<User | null> => {
    try {
      const response = await api.post('/auth/login', { identifier, password });
      const data = response.data;
      if (data.token && data.user) {
        localStorage.setItem('lms_token', data.token);
        localStorage.setItem('lms_current_user', data.user.id);
        return data.user;
      }
      return data;
    } catch (e: any) {
      throw new Error(e.response?.data?.detail || 'Invalid credentials');
    }
  },
  
  getCurrentUser: async (): Promise<User | null> => {
    const userId = localStorage.getItem('lms_current_user');
    const token = localStorage.getItem('lms_token');
    if (!userId || !token) return null;
    try {
      const response = await api.get(`/users/${userId}`);
      return response.data;
    } catch (e) {
      localStorage.removeItem('lms_current_user');
      localStorage.removeItem('lms_token');
      return null;
    }
  },

  setCurrentUser: (user: User | null) => {
    if (user) {
      localStorage.setItem('lms_current_user', user.id);
    } else {
      localStorage.removeItem('lms_current_user');
      localStorage.removeItem('lms_token');
    }
  },

  logout: () => {
    localStorage.removeItem('lms_current_user');
    localStorage.removeItem('lms_token');
  },

  registerStudent: async (studentData: Omit<User, 'id' | 'role' | 'createdAt'>): Promise<User> => {
    try {
      const response = await api.post('/auth/register/student', studentData);
      return response.data;
    } catch (e: any) {
      throw new Error(e.response?.data?.detail || 'Failed to register student');
    }
  },

  registerTrainer: async (trainerData: { name: string; email: string; password?: string; department?: string }): Promise<User> => {
    try {
      const response = await api.post('/auth/register/trainer', trainerData);
      return response.data;
    } catch (e: any) {
      throw new Error(e.response?.data?.detail || 'Failed to register trainer');
    }
  }
};
