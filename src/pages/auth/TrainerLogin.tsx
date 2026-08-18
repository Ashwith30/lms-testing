import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { authService } from '../../services/authService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Logo } from '../../components/ui/Logo';

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
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md animate-in flex flex-col items-center justify-center">
        <Link to="/">
          <Logo size="lg" className="justify-center mt-6" />
        </Link>
        <h2 className="mt-2 text-center text-2xl font-bold text-slate-900">
          Sign in to your trainer account
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          Use trainer@lms.com / trainer123 for demo
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md animate-in" style={{ animationDelay: '100ms' }}>
        <Card className="shadow-lg border-0 shadow-blue-900/5">
          <CardContent className="p-8">
            <form className="space-y-6" onSubmit={handleLogin}>
              <Input
                label="Email / Username"
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
              <Input
                label="Password"
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
              <Button type="submit" className="w-full" isLoading={isLoading}>
                Login as Trainer
              </Button>
            </form>

            <div className="mt-6 border-t border-slate-100 pt-6 text-center text-sm">
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
