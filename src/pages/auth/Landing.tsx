import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Logo } from '../../components/ui/Logo';
import { ChevronDown, GraduationCap, BookOpen, ShieldCheck } from 'lucide-react';

export const Landing = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.defaultMuted = true;
      videoRef.current.muted = true;
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch((error) => {
          console.warn("Autoplay prevented:", error);
        });
      }
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden bg-slate-50">
      {/* Background Video - Unified for the entire page */}
      <video 
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover filter blur-xl scale-105 select-none pointer-events-none z-0"
        src="/hero-bg.mp4"
        autoPlay
        loop
        muted
        playsInline
      />
      {/* Overlay - Unified for the entire page */}
      <div className="absolute inset-0 bg-white/70 backdrop-blur-[2px] pointer-events-none z-0"></div>

      <header className="h-20 bg-transparent flex items-center justify-between px-8 relative z-30">
        <Logo size="lg" />
        
        <div 
          ref={dropdownRef}
          className="relative"
        >
          <Button 
            variant="outline" 
            className="flex items-center gap-2 pr-3 bg-white border-slate-300 hover:border-slate-400 text-slate-700 shadow-sm"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          >
            <span>Logins</span>
            <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </Button>

          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-72 bg-white/95 backdrop-blur-md rounded-xl border border-slate-200/80 shadow-lg py-2 origin-top-right transition-all duration-200 z-50 animate-in">
              <div className="px-3 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Select Portal
              </div>
              
              <Link 
                to="/student/login" 
                className="flex items-start gap-3 px-3 py-2.5 mx-2 rounded-lg hover:bg-slate-50 text-slate-700 hover:text-slate-900 transition-colors group"
                onClick={() => setIsDropdownOpen(false)}
              >
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-100 transition-colors">
                  <GraduationCap className="h-5 w-5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold">Student Login</span>
                  <span className="text-xs text-slate-500 mt-0.5">Take tests & view performance</span>
                </div>
              </Link>

              <Link 
                to="/trainer/login" 
                className="flex items-start gap-3 px-3 py-2.5 mx-2 rounded-lg hover:bg-slate-50 text-slate-700 hover:text-slate-900 transition-colors group"
                onClick={() => setIsDropdownOpen(false)}
              >
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg group-hover:bg-indigo-100 transition-colors">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold">Trainer Login</span>
                  <span className="text-xs text-slate-500 mt-0.5">Manage tests & students</span>
                </div>
              </Link>

              <div className="h-px bg-slate-100 my-1 mx-2"></div>

              <Link 
                to="/admin/login" 
                className="flex items-start gap-3 px-3 py-2.5 mx-2 rounded-lg hover:bg-slate-50 text-slate-700 hover:text-slate-900 transition-colors group"
                onClick={() => setIsDropdownOpen(false)}
              >
                <div className="p-2 bg-slate-50 text-slate-600 rounded-lg group-hover:bg-slate-100 transition-colors">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold">Administrator Portal</span>
                  <span className="text-xs text-slate-500 mt-0.5">Manage users & settings</span>
                </div>
              </Link>
            </div>
          )}
        </div>
      </header>
      
      <main className="flex-1 flex items-center justify-center relative z-10">
        <div className="max-w-3xl px-6 text-center animate-in">
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-slate-900 mb-6">
            Placement Testing, <br/><span className="text-blue-600">Simplified.</span>
          </h1>
          <p className="text-xl text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed">
            Create, schedule, conduct and evaluate placement assessments from one professional platform.
          </p>
        </div>
      </main>

      <footer className="h-12 bg-transparent flex items-center justify-center text-xs text-slate-400 relative z-10">
        <span>&copy; {new Date().getFullYear()} Phonetic. All rights reserved.</span>
      </footer>
    </div>
  );
};
