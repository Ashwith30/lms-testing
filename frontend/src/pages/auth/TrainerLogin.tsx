import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { authService } from '../../services/authService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Logo } from '../../components/ui/Logo';
import { ArrowLeft, BookOpen } from 'lucide-react';

export const TrainerLogin = () => {
  const [email, setEmail] = useState('trainer@lms.com');
  const [password, setPassword] = useState('trainer123');
  const [isLoading, setIsLoading] = useState(false);
  
  const navigate = useNavigate();
  const { login } = useAuth();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const user = await authService.login(email, password);
      if (user && user.role === 'trainer') {
        login(user);
        navigate('/trainer/dashboard');
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
      <div className="hidden lg:flex lg:w-[45%] bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 relative overflow-hidden">
        <div className="absolute inset-0 bg-dots opacity-[0.06]"></div>
        <div className="relative z-10 flex flex-col justify-between p-10 w-full">
          <Logo size="md" variant="light" />
          <div>
            <div className="p-3 bg-white/10 rounded-xl w-fit mb-6 backdrop-blur-sm">
              <BookOpen className="h-8 w-8 text-white/90" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-3 leading-tight">
              Build tests,<br/>track progress.
            </h2>
            <p className="text-indigo-100/80 text-[15px] max-w-sm leading-relaxed">
              Create question banks, schedule assessments for your batches, and review results with detailed analytics.
            </p>
          </div>
          <p className="text-indigo-200/50 text-[12px]">&copy; {new Date().getFullYear()} Phonetic</p>
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

          <h1 className="text-2xl font-bold text-[#1a1d23] mb-1 tracking-tight">Trainer sign in</h1>
          <p className="text-sm text-[#9099a8] mb-8">Access your dashboard and manage assessments.</p>

          <form className="space-y-4" onSubmit={handleLogin}>
            <Input
              label="Email"
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
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

          <div className="mt-6 pt-6 border-t border-[#eef0f3] text-[13px]">
            <Link to="/" className="font-medium text-blue-600 hover:text-blue-700">
              Back to home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
