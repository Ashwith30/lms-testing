import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { authService } from '../../services/authService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Logo } from '../../components/ui/Logo';
import { ArrowLeft, ShieldCheck } from 'lucide-react';

export const AdminLogin = () => {
  const { login } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast('Please enter credentials', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const loggedUser = await authService.login(email, password);
      if (loggedUser) {
        if (loggedUser.role !== 'admin') {
          toast('Authorized administrators only', 'error');
          return;
        }
        login(loggedUser);
        toast('Logged in as administrator', 'success');
        navigate('/admin/dashboard');
      } else {
        toast('Invalid credentials', 'error');
      }
    } catch (err: any) {
      toast(err.message || 'Login failed', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f8fa] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-[400px]">
        <Link to="/" className="inline-flex items-center gap-1.5 text-[13px] text-[#9099a8] hover:text-[#5a6170] mb-8 transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to home
        </Link>

        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-slate-100 rounded-lg">
            <ShieldCheck className="h-5 w-5 text-slate-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#1a1d23] tracking-tight">Admin</h1>
            <p className="text-[12px] text-[#9099a8]">System administration</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-[#e2e5ea] shadow-soft p-6">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@lms.com"
              required
            />
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
            <Button type="submit" className="w-full" isLoading={isLoading}>
              Sign in
            </Button>
          </form>
        </div>

        <div className="mt-4 text-center">
          <Link to="/" className="text-[13px] text-[#9099a8] hover:text-[#5a6170] transition-colors">
            Not an admin? Go back
          </Link>
        </div>
      </div>
    </div>
  );
};
