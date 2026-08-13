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

import { StudentDashboard } from './pages/student/Dashboard';
import { TestDetails } from './pages/student/TestDetails';
import { TestAttempt } from './pages/student/TestAttempt';
import { TestResult } from './pages/student/TestResult';
import { StudentResults } from './pages/student/Results';
import { StudentProfile } from './pages/student/Profile';

import { Landing } from './pages/auth/Landing';
import { TrainerLogin } from './pages/auth/TrainerLogin';
import { StudentLogin } from './pages/auth/StudentLogin';
import { StudentRegister } from './pages/auth/StudentRegister';
import { AdminLogin } from './pages/auth/AdminLogin';

import { AdminDashboard } from './pages/admin/Dashboard';
import { TrainerStudents } from './pages/trainer/Students';

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/trainer/login" element={<TrainerLogin />} />
            <Route path="/student/login" element={<StudentLogin />} />
            <Route path="/student/register" element={<StudentRegister />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            
            {/* Dashboard Routes */}
            <Route element={<DashboardLayout />}>
              {/* Admin Routes */}
              <Route element={<ProtectedRoute allowedRole="admin" />}>
                <Route path="/admin/dashboard" element={<AdminDashboard />} />
              </Route>

              {/* Trainer Routes */}
              <Route element={<ProtectedRoute allowedRole="trainer" />}>
                <Route path="/trainer/dashboard" element={<TrainerDashboard />} />
                <Route path="/trainer/question-bank" element={<QuestionBanks />} />
                <Route path="/trainer/question-bank/upload" element={<QuestionBankUpload />} />
                <Route path="/trainer/tests" element={<TrainerTests />} />
                <Route path="/trainer/tests/create" element={<CreateTest />} />
                <Route path="/trainer/tests/schedule" element={<ScheduleTest />} />
                <Route path="/trainer/students" element={<TrainerStudents />} />
                <Route path="/trainer/results" element={<TrainerResults />} />
              </Route>

              {/* Student Routes */}
              <Route element={<ProtectedRoute allowedRole="student" />}>
                <Route path="/student/dashboard" element={<StudentDashboard />} />
                <Route path="/student/tests" element={<StudentDashboard />} /> {/* Using dashboard for tests list for prototype */}
                <Route path="/student/tests/:id" element={<TestDetails />} />
                <Route path="/student/results" element={<StudentResults />} />
                <Route path="/student/profile" element={<StudentProfile />} />
              </Route>
            </Route>
            
            {/* Fullscreen Test Interface (Outside Layout) */}
            <Route element={<ProtectedRoute allowedRole="student" />}>
              <Route path="/student/tests/:id/attempt" element={<TestAttempt />} />
              <Route path="/student/results/:id" element={<TestResult />} />
            </Route>
            
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
