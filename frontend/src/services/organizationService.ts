import { api } from './api';

export interface InstitutionData {
  id: string;
  name: string;
  contactPersonName?: string;
  supportEmail?: string;
  website?: string;
  address?: string;
  studentCount?: number;
  departmentCount?: number;
  status: string;
  createdAt?: string;
}

export interface DepartmentData {
  id: string;
  name: string;
  code: string;
  institutionId?: string;
}

export interface BatchData {
  id: string;
  name: string;
  year?: number;
  departmentId?: string;
  institutionId?: string;
}

export const organizationService = {
  // Authenticated Admin / Institution endpoints
  getInstitutions: async (): Promise<InstitutionData[]> => {
    const res = await api.get('/institutions');
    return res.data;
  },

  createInstitution: async (data: {
    name: string;
    email: string;
    password?: string;
    contactPersonName?: string;
    website?: string;
    address?: string;
    status?: string;
  }): Promise<InstitutionData> => {
    const res = await api.post('/institutions', data);
    return res.data;
  },

  updateInstitution: async (
    id: string,
    data: Partial<InstitutionData>
  ): Promise<InstitutionData> => {
    const res = await api.put(`/institutions/${id}`, data);
    return res.data;
  },

  deleteInstitution: async (id: string): Promise<void> => {
    await api.delete(`/institutions/${id}`);
  },

  // Public / Registration Discovery endpoints
  getPublicInstitutions: async (): Promise<{ id: string; name: string }[]> => {
    const res = await api.get('/auth/institutions');
    return res.data;
  },

  getPublicDepartments: async (institutionId: string): Promise<DepartmentData[]> => {
    const res = await api.get(`/auth/institutions/${institutionId}/departments`);
    return res.data;
  },

  getPublicBatches: async (departmentId: string): Promise<BatchData[]> => {
    const res = await api.get(`/auth/departments/${departmentId}/batches`);
    return res.data;
  },
};
