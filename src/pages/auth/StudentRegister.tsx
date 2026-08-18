import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';
import { authService } from '../../services/authService';
import { useToast } from '../../context/ToastContext';
import { Shield } from 'lucide-react';
import { Logo } from '../../components/ui/Logo';

export const StudentRegister = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [studentId, setStudentId] = useState('');
  const [department, setDepartment] = useState('');
  const [batch, setBatch] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !studentId || !department || !batch || !password) {
      toast('Please fill all fields', 'error');
      return;
    }

    setIsLoading(true);
    try {
      await authService.registerStudent({
        name,
        email,
        studentId,
        department,
        batch,
        password,
      });
      toast('Registration successful. Please log in.', 'success');
      navigate('/student/login');
    } catch (err: any) {
      toast(err.message || 'Failed to register', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center flex flex-col items-center justify-center">
        <Link to="/">
          <Logo size="lg" className="justify-center" />
        </Link>
        <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-slate-900">
          Student Registration
        </h2>
        <p className="mt-2 text-center text-sm text-slate-500">
          Register to access placement assessments and results
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <Card className="border border-slate-200 shadow-sm">
          <CardContent className="py-8 px-4 sm:px-10">
            <form className="space-y-6" onSubmit={handleSubmit}>
              <Input
                label="Full Name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your full name"
                required
              />

              <Input
                label="Email Address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                required
              />

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Student ID (LMS)"
                  type="text"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  placeholder="LMS001"
                  required
                />

                <Input
                  label="Department"
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="CSE"
                  required
                />
              </div>

              <Input
                label="Graduation Year Batch"
                type="text"
                value={batch}
                onChange={(e) => setBatch(e.target.value)}
                placeholder="2026"
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
                  Register Account
                </Button>
              </div>
            </form>

            <div className="mt-6 border-t border-slate-100 pt-6 text-center text-sm">
              <span className="text-slate-500">Already have an account?</span>{' '}
              <Link to="/student/login" className="font-semibold text-blue-600 hover:text-blue-500">
                Log in here
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
