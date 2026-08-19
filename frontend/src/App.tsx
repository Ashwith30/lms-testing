import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { DashboardLayout } from './components/layout/DashboardLayout';

import { TrainerDashboard } from './pages/trainer/Dashboard';
import { QuestionBanks } from './pages/trainer/QuestionBanks';
import { QuestionBankUpload } from './pages/trainer/QuestionBankUpload';
import { Tests as TrainerTests } from './pages/trainer/Tests';
import { CreateTest } from './pages/trainer/CreateTest';
import { ScheduleTest } from './pages/trainer/ScheduleTest';
import { Results as TrainerResults } from './pages/trainer/Results';
import { TrainerMaterials } from './pages/trainer/Materials';
import { TrainerAnalytics } from './pages/trainer/Analytics';
import { TrainerStudents } from './pages/trainer/Students';

import { StudentDashboard } from './pages/student/Dashboard';
import { TestDetails } from './pages/student/TestDetails';
import { TestAttempt } from './pages/student/TestAttempt';
import { TestResult } from './pages/student/TestResult';
import { StudentResults } from './pages/student/Results';
import { StudentProfile } from './pages/student/Profile';
import { StudentMaterials } from './pages/student/Materials';
import { StudentAnalytics } from './pages/student/Analytics';

import { InstitutionDashboard } from './pages/institution/Dashboard';
import { InstitutionStudents } from './pages/institution/Students';
import { InstitutionTrainers } from './pages/institution/Trainers';
import { InstitutionUpcomingTests } from './pages/institution/UpcomingTests';
import { InstitutionAnalytics } from './pages/institution/Analytics';

import { Landing } from './pages/auth/Landing';
import { TrainerLogin } from './pages/auth/TrainerLogin';
import { StudentLogin } from './pages/auth/StudentLogin';
import { StudentRegister } from './pages/auth/StudentRegister';
import { AdminLogin } from './pages/auth/AdminLogin';
import { InstitutionLogin } from './pages/auth/InstitutionLogin';

import { AdminDashboard } from './pages/admin/Dashboard';
import { AdminAnalytics } from './pages/admin/Analytics';

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Auth Routes */}
            <Route path="/" element={<Landing />} />
            <Route path="/trainer/login" element={<TrainerLogin />} />
            <Route path="/student/login" element={<StudentLogin />} />
            <Route path="/student/register" element={<StudentRegister />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/institution/login" element={<InstitutionLogin />} />

            {/* Admin Routes - Strictly Protected */}
            <Route element={<ProtectedRoute allowedRole="admin" />}>
              <Route element={<DashboardLayout />}>
                <Route path="/admin/dashboard" element={<AdminDashboard />} />
                <Route path="/admin/question-bank" element={<QuestionBanks />} />
                <Route path="/admin/question-bank/upload" element={<QuestionBankUpload />} />
                <Route path="/admin/tests" element={<TrainerTests />} />
                <Route path="/admin/tests/create" element={<CreateTest />} />
                <Route path="/admin/tests/:id/edit" element={<CreateTest />} />
                <Route path="/admin/tests/schedule" element={<ScheduleTest />} />
                <Route path="/admin/tests/schedule/:scheduleId/edit" element={<ScheduleTest />} />
                <Route path="/admin/analytics" element={<AdminAnalytics />} />
                <Route path="/admin/students" element={<TrainerStudents />} />
                <Route path="/admin/results" element={<TrainerResults />} />
                <Route path="/admin/materials" element={<TrainerMaterials />} />
              </Route>
            </Route>

            {/* Institution Routes - Strictly Protected */}
            <Route element={<ProtectedRoute allowedRole="institution" />}>
              <Route element={<DashboardLayout />}>
                <Route path="/institution/dashboard" element={<InstitutionDashboard />} />
                <Route path="/institution/question-bank" element={<QuestionBanks />} />
                <Route path="/institution/question-bank/upload" element={<QuestionBankUpload />} />
                <Route path="/institution/tests" element={<TrainerTests />} />
                <Route path="/institution/tests/create" element={<CreateTest />} />
                <Route path="/institution/tests/:id/edit" element={<CreateTest />} />
                <Route path="/institution/tests/schedule" element={<ScheduleTest />} />
                <Route path="/institution/tests/schedule/:scheduleId/edit" element={<ScheduleTest />} />
                <Route path="/institution/upcoming-tests" element={<InstitutionUpcomingTests />} />
                <Route path="/institution/students" element={<InstitutionStudents />} />
                <Route path="/institution/analytics" element={<InstitutionAnalytics />} />
                <Route path="/institution/results" element={<TrainerResults />} />
                <Route path="/institution/trainers" element={<InstitutionTrainers />} />
                <Route path="/institution/materials" element={<TrainerMaterials />} />
              </Route>
            </Route>

            {/* Trainer Routes - Strictly Protected */}
            <Route element={<ProtectedRoute allowedRole="trainer" />}>
              <Route element={<DashboardLayout />}>
                <Route path="/trainer/dashboard" element={<TrainerDashboard />} />
                <Route path="/trainer/question-bank" element={<QuestionBanks />} />
                <Route path="/trainer/question-bank/upload" element={<QuestionBankUpload />} />
                <Route path="/trainer/tests" element={<TrainerTests />} />
                <Route path="/trainer/tests/create" element={<CreateTest />} />
                <Route path="/trainer/tests/:id/edit" element={<CreateTest />} />
                <Route path="/trainer/tests/schedule" element={<ScheduleTest />} />
                <Route path="/trainer/tests/schedule/:scheduleId/edit" element={<ScheduleTest />} />
                <Route path="/trainer/analytics" element={<TrainerAnalytics />} />
                <Route path="/trainer/materials" element={<TrainerMaterials />} />
                <Route path="/trainer/students" element={<TrainerStudents />} />
                <Route path="/trainer/results" element={<TrainerResults />} />
              </Route>
            </Route>

            {/* Student Routes - Strictly Protected */}
            <Route element={<ProtectedRoute allowedRole="student" />}>
              <Route element={<DashboardLayout />}>
                <Route path="/student/dashboard" element={<StudentDashboard />} />
                <Route path="/student/tests" element={<StudentDashboard />} />
                <Route path="/student/tests/:id" element={<TestDetails />} />
                <Route path="/student/analytics" element={<StudentAnalytics />} />
                <Route path="/student/materials" element={<StudentMaterials />} />
                <Route path="/student/results" element={<StudentResults />} />
                <Route path="/student/profile" element={<StudentProfile />} />
              </Route>

              {/* Fullscreen Test Interface (Outside Layout) */}
              <Route path="/student/tests/:id/attempt" element={<TestAttempt />} />
              <Route path="/student/results/:id" element={<TestResult />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
