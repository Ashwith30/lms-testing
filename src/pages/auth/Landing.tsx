import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';

export const Landing = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-8">
        <div className="font-bold text-3xl tracking-tight text-blue-600">LMS</div>
        <div className="flex gap-4">
          <Link to="/trainer/login">
            <Button variant="ghost">Trainer Login</Button>
          </Link>
          <Link to="/student/login">
            <Button variant="outline">Student Login</Button>
          </Link>
        </div>
      </header>
      
      <main className="flex-1 flex items-center justify-center relative overflow-hidden">
        {/* Background blobs */}
        <div className="absolute top-0 -left-4 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-2xl opacity-30 animate-blob"></div>
        <div className="absolute top-0 -right-4 w-72 h-72 bg-indigo-300 rounded-full mix-blend-multiply filter blur-2xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-blue-400 rounded-full mix-blend-multiply filter blur-2xl opacity-30 animate-blob animation-delay-4000"></div>
        
        <div className="max-w-3xl px-6 text-center relative z-10 animate-in">
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-slate-900 mb-6">
            Placement Testing, <br/><span className="text-blue-600">Simplified.</span>
          </h1>
          <p className="text-xl text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed">
            Create, schedule, conduct and evaluate placement assessments from one professional platform.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link to="/trainer/login">
              <Button size="lg" className="w-full sm:w-auto min-w-[200px]">Trainer Login</Button>
            </Link>
            <Link to="/student/login">
              <Button size="lg" variant="outline" className="w-full sm:w-auto min-w-[200px] bg-white">Student Login</Button>
            </Link>
            <Link to="/student/register">
              <Button size="lg" variant="ghost" className="w-full sm:w-auto min-w-[200px] text-blue-600 hover:text-blue-700">Student Registration</Button>
            </Link>
          </div>
        </div>
      </main>

      <footer className="h-12 bg-white border-t border-slate-200 flex items-center justify-center text-xs text-slate-400">
        <Link to="/admin/login" className="hover:text-slate-600 transition-colors font-medium">
          Administrator Portal
        </Link>
      </footer>
    </div>
  );
};
