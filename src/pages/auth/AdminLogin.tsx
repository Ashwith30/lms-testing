import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';
import { authService } from '../../services/authService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

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
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link to="/" className="font-bold text-3xl text-blue-600 tracking-tight">LMS</Link>
        <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-slate-900">
          Admin Portal
        </h2>
        <p className="mt-2 text-center text-sm text-slate-500">
          System Administration & User Management
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <Card className="border border-slate-200 shadow-sm animate-in">
          <CardContent className="py-8 px-4 sm:px-10">
            <form className="space-y-6" onSubmit={handleSubmit}>
              <Input
                label="Admin Email Address"
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

              <div>
                <Button type="submit" className="w-full" isLoading={isLoading}>
                  Secure Authentication
                </Button>
              </div>
            </form>

            <div className="mt-6 border-t border-slate-100 pt-6 text-center text-sm">
              <span className="text-slate-500">Not an administrator?</span>{' '}
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
