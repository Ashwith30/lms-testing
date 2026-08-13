import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { authService } from '../../services/authService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

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
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md animate-in">
        <Link to="/">
          <h2 className="mt-6 text-center text-3xl font-extrabold text-blue-600 tracking-tight">
            LMS
          </h2>
        </Link>
        <h2 className="mt-2 text-center text-2xl font-bold text-slate-900">
          Sign in to your student account
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          Use LMS001 / student123 for demo
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md animate-in" style={{ animationDelay: '100ms' }}>
        <Card className="shadow-lg border-0 shadow-blue-900/5">
          <CardContent className="p-8">
            <form className="space-y-6" onSubmit={handleLogin}>
              <Input
                label="Student ID / Email"
                type="text"
                required
                value={studentId}
                onChange={e => setStudentId(e.target.value)}
              />
              <Input
                label="Password"
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
              <Button type="submit" className="w-full bg-slate-900 hover:bg-slate-800" isLoading={isLoading}>
                Login as Student
              </Button>
            </form>

            <div className="mt-6 border-t border-slate-100 pt-6 text-center text-sm">
              <span className="text-slate-500">New student?</span>{' '}
              <Link to="/student/register" className="font-semibold text-blue-600 hover:text-blue-500">
                Register here
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
