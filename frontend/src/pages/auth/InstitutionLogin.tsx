import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';
import { authService } from '../../services/authService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Logo } from '../../components/ui/Logo';
import { Building2 } from 'lucide-react';

export const InstitutionLogin = () => {
  const { login } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [email, setEmail] = useState('institution@lms.com');
  const [password, setPassword] = useState('institution123');
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
        if (loggedUser.role !== 'institution') {
          toast('Authorized institution administrators only', 'error');
          return;
        }
        login(loggedUser);
        toast('Logged in as institution administrator', 'success');
        navigate('/institution/dashboard');
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
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center flex flex-col items-center justify-center animate-in">
        <Link to="/">
          <Logo size="lg" className="justify-center" />
        </Link>
        <div className="mt-6 flex items-center justify-center gap-2">
          <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
            <Building2 className="h-6 w-6" />
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">
            Institution Portal
          </h2>
        </div>
        <p className="mt-2 text-center text-sm text-slate-500">
          College & University Academic Oversight
        </p>
        <p className="mt-1 text-center text-xs text-slate-400">
          Demo: institution@lms.com / institution123
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md animate-in" style={{ animationDelay: '100ms' }}>
        <Card className="border border-slate-200 shadow-sm">
          <CardContent className="py-8 px-4 sm:px-10">
            <form className="space-y-6" onSubmit={handleSubmit}>
              <Input
                label="Institution Email Address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="institution@lms.com"
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

              <div>
                <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" isLoading={isLoading}>
                  Access Institution Dashboard
                </Button>
              </div>
            </form>

            <div className="mt-6 border-t border-slate-100 pt-6 text-center text-sm">
              <span className="text-slate-500">Need another portal?</span>{' '}
              <Link to="/" className="font-semibold text-blue-600 hover:text-blue-500">
                Return home
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
