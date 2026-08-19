import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { authService } from '../../services/authService';
import { useToast } from '../../context/ToastContext';
import { Logo } from '../../components/ui/Logo';
import { ArrowLeft } from 'lucide-react';

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
    <div className="min-h-screen bg-[#f7f8fa] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-[440px]">
        <Link to="/student/login" className="inline-flex items-center gap-1.5 text-[13px] text-[#9099a8] hover:text-[#5a6170] mb-6 transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to login
        </Link>

        <div className="mb-6">
          <Logo size="md" />
        </div>

        <h1 className="text-2xl font-bold text-[#1a1d23] mb-1 tracking-tight">Create your account</h1>
        <p className="text-sm text-[#9099a8] mb-6">Fill in your details to get started with assessments.</p>

        <div className="bg-white rounded-xl border border-[#e2e5ea] shadow-soft p-6">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <Input
              label="Full name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
              required
            />

            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="john@example.com"
              required
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Student ID"
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
              label="Batch year"
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
              placeholder="At least 6 characters"
              required
            />

            <Button type="submit" className="w-full" isLoading={isLoading}>
              Create account
            </Button>
          </form>
        </div>

        <div className="mt-4 text-center text-[13px] text-[#9099a8]">
          Already registered?{' '}
          <Link to="/student/login" className="font-medium text-blue-600 hover:text-blue-700">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
};
