import { api } from './api';
import { NotificationItem, BatchNotificationPayload } from '../types';

export const notificationService = {
  getNotifications: async (): Promise<NotificationItem[]> => {
    const res = await api.get('/notifications');
    return res.data;
  },

  sendBatchNotification: async (payload: BatchNotificationPayload): Promise<NotificationItem> => {
    const res = await api.post('/notifications', payload);
    return res.data;
  },

  markAsRead: async (notificationId: string): Promise<void> => {
    await api.post(`/notifications/${notificationId}/read`);
  },

  markAllAsRead: async (): Promise<void> => {
    await api.post('/notifications/read-all');
  },

  deleteNotification: async (notificationId: string): Promise<void> => {
    await api.delete(`/notifications/${notificationId}`);
  },

  getBatches: async (): Promise<string[]> => {
    try {
      const res = await api.get('/batches');
      const names = res.data.map((b: any) => (typeof b === 'string' ? b : b.name || b.id)).filter(Boolean);
      const set = new Set<string>(['Class of 2026', 'Batch 2026', 'Batch 2027', ...names]);
      return Array.from(set);
    } catch {
      return ['Class of 2026', 'Batch 2026', 'Batch 2027'];
    }
  }
};
