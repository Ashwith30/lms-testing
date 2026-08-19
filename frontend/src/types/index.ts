export type Role = 'trainer' | 'student' | 'admin' | 'institution';

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

export type ViolationType = 
  | 'TAB_SWITCH'
  | 'WINDOW_BLUR'
  | 'APP_SWITCH_GESTURE'
  | 'FULLSCREEN_EXIT'
  | 'FACE_MISSING'
  | 'MULTIPLE_FACES'
  | 'PHONE_DETECTED'
  | 'DEVTOOLS_OPEN'
  | 'SHORTCUT_BLOCKED'
  | 'CONTEXT_MENU_BLOCKED';

export interface ViolationLog {
  id: string;
  timestamp: string;
  type: ViolationType;
  reason: string;
  snapshotUrl?: string; // base64 JPEG thumbnail of camera evidence
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface ProctoringSummary {
  tabSwitches: number;
  windowBlurs: number;
  appSwitchGestures: number;
  fullscreenExits: number;
  faceMissingIncidents: number;
  multipleFacesIncidents: number;
  phoneDetectedIncidents: number;
  devtoolsIncidents: number;
  shortcutsBlocked: number;
  totalViolations: number;
  trustScore: number; // 0-100%
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
  violationLogs?: ViolationLog[];
  proctoringSummary?: ProctoringSummary;
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

