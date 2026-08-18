import { Material } from '../types';
import { api } from './api';

export const materialService = {
  // Trainer: get all their materials
  getTrainerMaterials: async (trainerId: string): Promise<Material[]> => {
    const res = await api.get(`/materials?uploadedBy=${trainerId}`);
    return res.data;
  },

  // Student: get released materials for their batch
  getStudentMaterials: async (studentId: string): Promise<Material[]> => {
    const res = await api.get(`/materials?studentId=${studentId}`);
    return res.data;
  },

  createMaterial: async (data: Omit<Material, 'id' | 'createdAt' | 'isReleased' | 'releasedAt'>): Promise<Material> => {
    const payload = {
      ...data,
      id: `mat-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    const res = await api.post('/materials', payload);
    return res.data;
  },

  toggleRelease: async (materialId: string, release: boolean): Promise<Material> => {
    const res = await api.put(`/materials/${materialId}`, { isReleased: release });
    return res.data;
  },

  updateMaterial: async (materialId: string, updates: Partial<Material>): Promise<Material> => {
    const res = await api.put(`/materials/${materialId}`, updates);
    return res.data;
  },

  deleteMaterial: async (materialId: string): Promise<void> => {
    await api.delete(`/materials/${materialId}`);
  },
};
