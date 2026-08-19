import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { authService } from '../../services/authService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Logo } from '../../components/ui/Logo';
import { ArrowLeft, GraduationCap } from 'lucide-react';

export const StudentLogin = () => {
  const [studentId, setStudentId] = useState('LMS001');
  const [password, setPassword] = useState('student123');
  const [isLoading, setIsLoading] = useState(false);
  
  const navigate = useNavigate();
  const { login } = useAuth();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const user = await authService.login(studentId, password);
      if (user && user.role === 'student') {
        login(user);
        navigate('/student/dashboard');
      } else {
        toast('Invalid credentials', 'error');
      }
    } catch (error) {
      toast('Invalid credentials', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f8fa] flex">
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-[45%] bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 relative overflow-hidden">
        <div className="absolute inset-0 bg-dots opacity-[0.06]"></div>
        <div className="relative z-10 flex flex-col justify-between p-10 w-full">
          <Logo size="md" variant="light" />
          <div>
            <div className="p-3 bg-white/10 rounded-xl w-fit mb-6 backdrop-blur-sm">
              <GraduationCap className="h-8 w-8 text-white/90" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-3 leading-tight">
              Your assessments,<br/>all in one place.
            </h2>
            <p className="text-blue-100/80 text-[15px] max-w-sm leading-relaxed">
              View scheduled tests, attempt assessments with live proctoring, and track your performance over time.
            </p>
          </div>
          <p className="text-blue-200/50 text-[12px]">&copy; {new Date().getFullYear()} Phonetic</p>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex flex-col justify-center px-6 sm:px-12 lg:px-16 py-12">
        <div className="w-full max-w-[380px] mx-auto lg:mx-0">
          <Link to="/" className="inline-flex items-center gap-1.5 text-[13px] text-[#9099a8] hover:text-[#5a6170] mb-8 transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to home
          </Link>

          <div className="lg:hidden mb-6">
            <Logo size="md" />
          </div>

          <h1 className="text-2xl font-bold text-[#1a1d23] mb-1 tracking-tight">Student sign in</h1>
          <p className="text-sm text-[#9099a8] mb-8">Enter your student ID and password to continue.</p>

          <form className="space-y-4" onSubmit={handleLogin}>
            <Input
              label="Student ID or Email"
              type="text"
              required
              value={studentId}
              onChange={e => setStudentId(e.target.value)}
              placeholder="e.g. LMS001"
            />
            <Input
              label="Password"
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter your password"
            />
            <Button type="submit" className="w-full" isLoading={isLoading}>
              Sign in
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-[#eef0f3] text-[13px] flex items-center justify-between">
            <span className="text-[#9099a8]">
              New here?{' '}
              <Link to="/student/register" className="font-medium text-blue-600 hover:text-blue-700">
                Create account
              </Link>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
