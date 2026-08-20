import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Logo } from '../../components/ui/Logo';
import { ChevronDown, GraduationCap, BookOpen, Building2, ShieldCheck, ArrowRight, Sparkles } from 'lucide-react';

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

  const portals = [
    {
      to: '/student/login',
      icon: GraduationCap,
      label: 'Student Portal',
      desc: 'Take tests & view results',
      color: 'text-blue-600 bg-blue-50',
      border: 'hover:border-blue-300',
      demo: 'LMS001 / student123'
    },
    {
      to: '/trainer/login',
      icon: BookOpen,
      label: 'Trainer Portal',
      desc: 'Create tests & manage questions',
      color: 'text-indigo-600 bg-indigo-50',
      border: 'hover:border-indigo-300',
      demo: 'trainer@lms.com / trainer123'
    },
    {
      to: '/institution/login',
      icon: Building2,
      label: 'Institution Portal',
      desc: 'Campus & batch oversight',
      color: 'text-emerald-600 bg-emerald-50',
      border: 'hover:border-emerald-300',
      demo: 'institution@lms.com / institution123'
    },
    {
      to: '/admin/login',
      icon: ShieldCheck,
      label: 'Admin Portal',
      desc: 'System & platform control',
      color: 'text-slate-600 bg-slate-100',
      border: 'hover:border-slate-300',
      demo: 'admin@lms.com / admin123'
    },
  ];

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden bg-[#f7f8fa]">
      {/* Background Video */}
      <video 
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover filter blur-xl scale-105 select-none pointer-events-none z-0 opacity-60"
        src="/hero-bg.mp4"
        autoPlay
        loop
        muted
        playsInline
      />
      {/* Overlay */}
      <div className="absolute inset-0 bg-white/75 backdrop-blur-[2px] pointer-events-none z-0"></div>

      <header className="h-16 flex items-center justify-between px-6 lg:px-10 relative z-30">
        <Logo size="md" />
        
        <div ref={dropdownRef} className="relative">
          <Button 
            variant="outline" 
            size="sm"
            className="flex items-center gap-1.5 bg-white/90 border-[#e2e5ea] text-[#5a6170] shadow-sm hover:shadow-md"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          >
            <span>Sign in</span>
            <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </Button>

          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl border border-[#e2e5ea] shadow-dropdown py-1.5 origin-top-right animate-in z-50">
              <div className="px-3 py-1.5 border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-amber-500" />
                <span>Select Demo Portal</span>
              </div>
              {portals.map((p) => (
                <Link 
                  key={p.to}
                  to={p.to}
                  className="flex items-center gap-3 px-3 py-2.5 mx-1.5 rounded-lg hover:bg-[#f7f8fa] text-[#1a1d23] transition-colors group"
                  onClick={() => setIsDropdownOpen(false)}
                >
                  <div className={`p-1.5 rounded-md ${p.color}`}>
                    <p.icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[13px] font-medium block">{p.label}</span>
                    <span className="text-[10px] text-slate-400 block font-mono">{p.demo}</span>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-[#9099a8] opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              ))}
            </div>
          )}
        </div>
      </header>
      
      <main className="flex-1 flex flex-col justify-center px-6 lg:px-10 relative z-10 py-8 max-w-5xl mx-auto w-full">
        <div className="animate-in mb-8">
          <p className="text-[13px] font-medium text-blue-600 mb-3 tracking-wide uppercase">Placement Assessment Platform</p>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[#1a1d23] mb-4 leading-[1.15] sm:leading-[1.1]">
            Run placement tests<br className="hidden sm:inline" /> without the headache.
          </h1>
          <p className="text-base sm:text-lg text-[#5a6170] max-w-xl leading-relaxed">
            Create assessments, schedule them for your cohorts, and get real-time analytics with proctoring telemetry.
          </p>
        </div>

        {/* Quick Demo Portal Access Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {portals.map((p) => (
            <Link
              key={p.to}
              to={p.to}
              className={`bg-white/90 backdrop-blur-sm p-4 rounded-xl border border-[#e2e5ea] ${p.border} shadow-sm hover:shadow-md transition-all group flex flex-col justify-between`}
            >
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <div className={`p-2 rounded-lg ${p.color}`}>
                    <p.icon className="h-5 w-5" />
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-slate-600 transition-colors" />
                </div>
                <h3 className="font-bold text-slate-800 text-sm">{p.label}</h3>
                <p className="text-[12px] text-slate-500 mt-0.5">{p.desc}</p>
              </div>

              <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[10px] uppercase font-semibold text-slate-400">Demo Fill:</span>
                <span className="text-[11px] font-mono text-slate-600 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">{p.demo.split(' / ')[0]}</span>
              </div>
            </Link>
          ))}
        </div>
      </main>

      <footer className="h-12 flex items-center px-6 lg:px-10 text-[12px] text-[#9099a8] relative z-10 justify-between">
        <span>&copy; {new Date().getFullYear()} Phonetic</span>
        <div className="flex items-center gap-4">
          <span className="hover:text-[#5a6170] cursor-pointer transition-colors">Privacy</span>
          <span className="hover:text-[#5a6170] cursor-pointer transition-colors">Terms</span>
        </div>
      </footer>
    </div>
  );
};
