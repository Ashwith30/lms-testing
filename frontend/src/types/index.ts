export type Role = 'trainer' | 'student' | 'admin' | 'institution';

export interface StudentProfile {
  userId: string;
  firstName: string;
  lastName: string;
  studentNumber?: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  departmentId?: string;
  primaryBatchId?: string;
  enrollmentDate?: string;
}

export interface TrainerProfile {
  userId: string;
  firstName: string;
  lastName: string;
  employeeId?: string;
  specialization?: string;
  phoneNumber?: string;
  hireDate?: string;
}

export interface InstitutionProfile {
  userId: string;
  institutionName: string;
  contactPersonName?: string;
  supportEmail?: string;
  website?: string;
  address?: string;
}

export interface User {
  id: string;
  email: string;
  role: Role;
  status?: string;
  lastLoginAt?: string;
  createdAt?: string;
  updatedAt?: string;
  student_profile?: StudentProfile;
  trainer_profile?: TrainerProfile;
  institution_profile?: InstitutionProfile;
  
  // Backward compatibility properties added by backend
  name: string;
  studentId?: string;
  department?: string;
  batch?: string;
  password?: string;
}

export interface Department {
  id: string;
  institutionId?: string;
  name: string;
  code?: string;
}

export interface Batch {
  id: string;
  departmentId: string;
  name: string;
  startDate?: string;
  endDate?: string;
}

export interface Course {
  id: string;
  name: string;
  description?: string;
  durationWeeks?: number;
}

export interface Topic {
  id: string;
  courseId: string;
  name: string;
  orderIndex: number;
}

export interface TrainerAssignment {
  id: string;
  trainerId: string;
  batchId?: string;
  institutionId?: string;
  topicId?: string;
  courseId?: string;
  startDate?: string;
  endDate?: string;
}

export interface StudentEnrollment {
  id: string;
  studentId: string;
  courseId: string;
  status: string;
  enrollmentDate: string;
  completionDate?: string;
}

export interface QuestionBank {
  id: string;
  name: string;
  description?: string;
  courseId?: string;
  topicId?: string;
  ownerId: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  questionCount?: number;
}

export interface QuestionOption {
  id: string;
  questionId: string;
  optionText: string;
  isCorrect: boolean;
  orderIndex: number;
}

export interface Question {
  id: string;
  questionBankId: string;
  type?: string;
  text?: string;
  mediaUrl?: string;
  difficulty: string;
  marks: number;
  explanation?: string;
  tags?: string;
  options: any;
  
  // Backward compatibility
  question: string;
  correctAnswer: string;
  category: string;
}

export interface ProctoringProfile {
  id: string;
  name: string;
  fullscreenRequired: boolean;
  cameraRequired: boolean;
  microphoneRequired: boolean;
  tabSwitchLimit: number;
  requireIDVerification: boolean;
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

export interface Test {
  id: string;
  title: string;
  courseId?: string;
  topicId?: string;
  description?: string;
  passingPercentage?: number;
  totalMarks: number;
  authorId?: string;
  status: string;
  proctoringProfileId?: string;
  createdAt: string;
  
  // Backward compatibility properties
  questionIds: string[];
  settings: TestSettings;
  createdBy?: string;
}

export interface Schedule {
  id: string;
  testId: string;
  startTime: string;
  endTime: string;
  durationMinutes?: number;
  attemptsAllowed?: number;
  
  // Backward compatibility
  assignedBatch?: string;
  assignedStudents: string[];
}

export interface ScheduleAssignment {
  id: string;
  scheduleId: string;
  assigneeType: string;
  assigneeId: string;
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
  trustScore: number;
}

export interface AnswerRecord {
  questionId: string;
  selectedOption: 'A' | 'B' | 'C' | 'D' | null;
  status: 'not_visited' | 'visited' | 'answered' | 'marked';
}

export interface ViolationLog {
  id: string;
  timestamp: string;
  type: ViolationType;
  reason: string;
  snapshotUrl?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface Attempt {
  id: string;
  studentId: string;
  scheduleId?: string;
  status: string;
  startedAt: string;
  submittedAt?: string;
  score?: number;
  percentage?: number;
  ipAddress?: string;
  deviceInfo?: string;
  
  // Backward compatibility
  testId: string;
  answers: Record<string, AnswerRecord>;
  violations: number;
  violationLogs?: ViolationLog[];
  proctoringSummary?: ProctoringSummary;
  expiresAt?: string;
}

export interface ProctoringLog {
  id: string;
  attemptId: string;
  timestamp: string;
  violationType: string;
  screenshotUrl?: string;
  severity?: string;
}

export interface Answer {
  id: string;
  attemptId: string;
  questionId: string;
  selectedOptionIds?: string;
  subjectiveText?: string;
  timeTakenSeconds?: number;
  isCorrect?: boolean;
}

export interface Material {
  id: string;
  title: string;
  description?: string;
  type: string;
  courseId?: string;
  topicId?: string;
  contentUrl?: string;
  authorId?: string;
  createdAt: string;
  updatedAt?: string;
  
  // Backward compatibility
  url?: string;
  content?: string;
  uploadedBy: string;
  isReleased: boolean;
  releasedAt?: string;
  assignedBatch?: string;
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

export interface NotificationItem {
  id: string;
  title: string;
  description: string;
  time: string;
  isRead: boolean;
  type: 'info' | 'success' | 'alert';
  link?: string;
}
