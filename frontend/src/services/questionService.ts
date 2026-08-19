import { QuestionBank, Question } from '../types';
import { api } from './api';

export const questionService = {
  getQuestionBanks: async (uploadedBy?: string): Promise<QuestionBank[]> => {
    const url = uploadedBy ? `/question-banks?uploadedBy=${uploadedBy}` : '/question-banks';
    const res = await api.get(url);
    return res.data;
  },

  deleteQuestionBank: async (bankId: string): Promise<void> => {
    await api.delete(`/question-banks/${bankId}`);
  },

  getAllQuestions: async (): Promise<Question[]> => {
    const res = await api.get('/questions');
    return res.data;
  },

  deleteQuestion: async (questionId: string): Promise<void> => {
    await api.delete(`/questions/${questionId}`);
  },

  importQuestionBank: async (name: string, description: string, questions: Omit<Question, 'id' | 'questionBankId'>[], uploadedBy: string): Promise<QuestionBank> => {
    // 1. Create bank
    const newBank = {
      id: `qb-${Date.now()}`,
      name,
      description,
      uploadedBy,
      createdAt: new Date().toISOString(),
      questionCount: questions.length,
    };
    const bankRes = await api.post('/question-banks', newBank);

    // 2. Add questions
    const qPayload = questions.map((q, idx) => ({
      ...q,
      id: `q-${Date.now()}-${idx}`,
      questionBankId: bankRes.data.id,
    }));
    await api.post('/questions', qPayload);
    
    return bankRes.data;
  }
};
