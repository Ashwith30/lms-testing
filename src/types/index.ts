export type Role = 'trainer' | 'student' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  studentId?: string;
  department?: string;
  batch?: string;
  password?: string;
  createdAt: string;
}

export interface Question {
  id: string;
  question: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correctAnswer: 'A' | 'B' | 'C' | 'D';
  category: string;
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Mixed';
  marks: number;
  explanation?: string;
  questionBankId: string;
}

export interface QuestionBank {
  id: string;
  name: string;
  description: string;
  uploadedBy: string; // Trainer ID
  createdAt: string;
  questionCount: number;
}

export interface TestSettings {
  duration: number; // minutes
  attemptsAllowed: number;
  negativeMarking: boolean;
  randomizeQuestions: boolean;
  randomizeOptions: boolean;
  showResultImmediately: boolean;
  allowBackNavigation: boolean;
  fullscreenRequired: boolean;
  autoSubmit: boolean;
  enableCalculator: boolean;
  enablePalette: boolean;
}

export type TestStatus = 'Draft' | 'Scheduled' | 'Live' | 'Completed' | 'Archived';

export interface Test {
  id: string;
  title: string;
  description: string;
  questionIds: string[];
  totalMarks: number;
  settings: TestSettings;
  createdBy: string;
  status: TestStatus;
  createdAt: string;
}

export interface Schedule {
  id: string;
  testId: string;
  startTime: string; // ISO String
  endTime: string; // ISO String
  assignedStudents: string[]; // 'all' or list of student IDs
  assignedBatch?: string;
}

export interface AnswerRecord {
  questionId: string;
  selectedOption: 'A' | 'B' | 'C' | 'D' | null;
  status: 'not_visited' | 'visited' | 'answered' | 'marked';
}

export interface Attempt {
  id: string;
  studentId: string;
  testId: string;
  startedAt: string;
  expiresAt: string;
  submittedAt?: string;
  answers: Record<string, AnswerRecord>;
  score?: number;
  percentage?: number;
  violations: number;
  status: 'in_progress' | 'submitted' | 'auto_submitted';
}

export interface Material {
  id: string;
  title: string;
  description?: string;
  type: 'pdf' | 'video' | 'link' | 'note';
  url?: string;
  content?: string;
  uploadedBy: string;
  isReleased: boolean;
  releasedAt?: string;
  assignedBatch?: string;
  createdAt: string;
}

