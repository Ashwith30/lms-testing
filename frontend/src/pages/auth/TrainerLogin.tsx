import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { authService } from '../../services/authService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Logo } from '../../components/ui/Logo';
import { ArrowLeft, Sparkles } from 'lucide-react';
import phoneticLogoFull from '../../assets/phonetic-logo-full.png';

export const TrainerLogin = () => {
  const [email, setEmail] = useState('trainer@lms.com');
  const [password, setPassword] = useState('trainer123');
  const [isLoading, setIsLoading] = useState(false);
  
  const navigate = useNavigate();
  const { login } = useAuth();
  const { toast } = useToast();

  const fillDemo = () => {
    setEmail('trainer@lms.com');
    setPassword('trainer123');
    toast('Filled Demo Trainer credentials', 'success');
  };

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
    <div className="min-h-screen bg-white flex">
      {/* Left branding panel */}
      <div
        className="hidden lg:flex lg:w-[48%] relative overflow-hidden items-center justify-center"
        style={{ background: 'linear-gradient(160deg, #f0f9ff 0%, #e0f2fe 35%, #bae6fd 75%, #f0f9ff 100%)' }}
      >
        {/* Large decorative curved blobs */}
        <div
          className="absolute -bottom-32 -left-32 w-[500px] h-[500px] rounded-full"
          style={{ background: 'rgba(125, 211, 252, 0.4)' }}
        />
        <div
          className="absolute -top-20 -right-20 w-[350px] h-[350px] rounded-full"
          style={{ background: 'rgba(186, 230, 253, 0.5)' }}
        />
        <div
          className="absolute bottom-20 right-10 w-[200px] h-[200px] rounded-full"
          style={{ background: 'rgba(147, 197, 253, 0.35)' }}
        />

        {/* Logo + tagline */}
        <div className="relative z-10 flex flex-col items-center px-8 w-full max-w-[480px]">
          <img
            src={phoneticLogoFull}
            alt="Phonetic"
            className="w-[420px] max-w-[92%] xl:w-[460px] object-contain drop-shadow-sm"
          />
          <div className="mt-8 flex items-center gap-3 text-[13px] font-bold tracking-[0.22em] text-[#12396d] uppercase">
            <span>Learn</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#1e4e8c]" />
            <span>Practice</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#1e4e8c]" />
            <span>Grow</span>
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex flex-col justify-center px-6 sm:px-12 lg:px-16 xl:px-20 py-12">
        <div className="w-full max-w-[420px] mx-auto lg:mx-0">
          <Link to="/" className="inline-flex items-center gap-1.5 text-[13px] text-slate-400 hover:text-slate-600 mb-8 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>

          <div className="lg:hidden mb-6">
            <Logo size="md" />
          </div>

          <div className="flex items-center justify-between mb-2">
            <h1 className="text-[28px] font-bold text-slate-900 tracking-tight">Trainer sign in</h1>
            <button
              type="button"
              onClick={fillDemo}
              className="flex items-center gap-1.5 text-[12px] font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 rounded-lg transition-colors"
              title="Auto-fill demo trainer credentials"
            >
              <Sparkles className="h-3.5 w-3.5 text-blue-500" />
              <span>Fill Demo</span>
            </button>
          </div>
          <p className="text-[15px] text-slate-400 mb-6 leading-relaxed">Access your dashboard and manage assessments.</p>

          {/* Demo credential callout */}
          <div className="mb-6 p-3 bg-blue-50/70 border border-blue-100 rounded-xl flex items-center justify-between text-xs">
            <div>
              <span className="font-semibold text-blue-900">Demo Login:</span>{' '}
              <code className="text-blue-700 bg-white px-1.5 py-0.5 rounded border border-blue-200">trainer@lms.com</code>
            </div>
            <code className="text-blue-700 bg-white px-1.5 py-0.5 rounded border border-blue-200">trainer123</code>
          </div>

          <form className="space-y-4" onSubmit={handleLogin}>
            <Input
              label="Email"
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="trainer@lms.com"
            />
            <Input
              label="Password"
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter your password"
            />
            <Button
              type="submit"
              className="w-full !h-12 !rounded-xl !text-[15px] !font-semibold !shadow-lg !shadow-blue-500/20 hover:!shadow-blue-500/30"
              isLoading={isLoading}
            >
              Sign in
            </Button>
          </form>

          <div className="mt-8 text-center text-[14px]">
            <Link to="/" className="text-slate-400 hover:text-slate-600 transition-colors">
              Back to home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

