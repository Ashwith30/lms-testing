import { QuestionBank, Question } from '../types';
import { api } from './api';

export const questionService = {
  getQuestionBanks: async (): Promise<QuestionBank[]> => {
    const res = await api.get('/question-banks');
    return res.data;
  },

  getAllQuestions: async (): Promise<Question[]> => {
    const res = await api.get('/questions');
    return res.data;
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
