import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { authService } from '../../services/authService';
import { useToast } from '../../context/ToastContext';
import { Logo } from '../../components/ui/Logo';
import { ArrowLeft } from 'lucide-react';
import phoneticLogoFull from '../../assets/phonetic-logo-full.png';

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
        <div className="w-full max-w-[460px] mx-auto lg:mx-0">
          <Link to="/student/login" className="inline-flex items-center gap-1.5 text-[13px] text-slate-400 hover:text-slate-600 mb-6 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Back to login
          </Link>

          <div className="lg:hidden mb-6">
            <Logo size="md" />
          </div>

          <h1 className="text-[28px] font-bold text-slate-900 tracking-tight mb-1">Create student account</h1>
          <p className="text-[15px] text-slate-400 mb-6 leading-relaxed">Fill in your details to start learning and taking tests.</p>

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

            <Button
              type="submit"
              className="w-full !h-12 !rounded-xl !text-[15px] !font-semibold !shadow-lg !shadow-blue-500/20 hover:!shadow-blue-500/30 cursor-pointer"
              isLoading={isLoading}
            >
              Create student account
            </Button>
          </form>

          <div className="mt-6 text-center text-[13px] text-slate-400">
            Already registered?{' '}
            <Link to="/student/login" className="font-semibold text-blue-600 hover:text-blue-700">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
