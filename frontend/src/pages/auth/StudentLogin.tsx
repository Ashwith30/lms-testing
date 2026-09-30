import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { authService } from '../../services/authService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Logo } from '../../components/ui/Logo';
import { ArrowLeft, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import phoneticLogoFull from '../../assets/phonetic-logo-full.jpg';

export const StudentLogin = () => {
  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
    <div className="min-h-screen bg-white flex">
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-[48%] relative overflow-hidden items-center justify-center"
        style={{ background: 'linear-gradient(160deg, #eef4ff 0%, #e4edff 40%, #dde7ff 70%, #eef3ff 100%)' }}
      >
        {/* Large decorative curved blobs like the reference */}
        <div
          className="absolute -bottom-32 -left-32 w-[500px] h-[500px] rounded-full"
          style={{ background: 'rgba(186, 210, 255, 0.45)' }}
        />
        <div
          className="absolute -top-20 -right-20 w-[350px] h-[350px] rounded-full"
          style={{ background: 'rgba(196, 216, 255, 0.35)' }}
        />
        <div
          className="absolute bottom-20 right-10 w-[200px] h-[200px] rounded-full"
          style={{ background: 'rgba(176, 204, 255, 0.25)' }}
        />

        {/* Logo + tagline */}
        <div className="relative z-10 flex flex-col items-center px-10">
          <img
            src={phoneticLogoFull}
            alt="Phonetic"
            className="w-[340px] max-w-[85%] object-contain"
            style={{ mixBlendMode: 'multiply' }}
          />
          <div className="mt-8 flex items-center gap-3 text-[13px] font-semibold tracking-[0.2em] text-blue-400/80 uppercase">
            <span>Learn</span>
            <span className="w-1.5 h-1.5 rounded-full bg-blue-300/60" />
            <span>Practice</span>
            <span className="w-1.5 h-1.5 rounded-full bg-blue-300/60" />
            <span>Grow</span>
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex flex-col justify-center px-6 sm:px-12 lg:px-16 xl:px-20 py-12">
        <div className="w-full max-w-[420px] mx-auto lg:mx-0">
          {/* Back link */}
          <Link to="/" className="inline-flex items-center gap-1.5 text-[13px] text-slate-400 hover:text-slate-600 mb-10 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>

          {/* Mobile logo */}
          <div className="lg:hidden mb-8">
            <Logo size="md" />
          </div>

          {/* Heading */}
          <h1 className="text-[28px] font-bold text-slate-900 tracking-tight mb-2">
            Student sign in
          </h1>
          <p className="text-[15px] text-slate-400 mb-8 leading-relaxed">
            Enter your student ID or email and password to continue.
          </p>

          <form className="space-y-5" onSubmit={handleLogin}>
            {/* Student ID / Email field */}
            <div>
              <label className="block text-[13px] font-semibold text-slate-600 mb-2">
                Student ID or Email
              </label>
              <div className="relative">
                <div className="absolute left-0 top-0 bottom-0 w-11 flex items-center justify-center pointer-events-none">
                  <Mail className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type="text"
                  required
                  value={studentId}
                  onChange={e => setStudentId(e.target.value)}
                  placeholder="e.g. LMS001 or ashwith@example.com"
                  className="w-full h-12 pl-11 pr-4 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                />
              </div>
            </div>

            {/* Password field */}
            <div>
              <label className="block text-[13px] font-semibold text-slate-600 mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute left-0 top-0 bottom-0 w-11 flex items-center justify-center pointer-events-none">
                  <Lock className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full h-12 pl-11 pr-12 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-0 top-0 bottom-0 w-12 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Sign in button */}
            <Button
              type="submit"
              className="w-full !h-12 !rounded-xl !text-[15px] !font-semibold !shadow-lg !shadow-blue-500/20 hover:!shadow-blue-500/30"
              isLoading={isLoading}
            >
              Sign in
            </Button>
          </form>

          {/* Bottom link */}
          <div className="mt-8 text-center text-[14px]">
            <span className="text-slate-400">
              New here?{' '}
              <Link to="/student/register" className="font-semibold text-blue-600 hover:text-blue-700 transition-colors">
                Create account
              </Link>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
