import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Logo } from '../../components/ui/Logo';
import { ChevronDown, GraduationCap, BookOpen, Building2, ShieldCheck, ArrowRight } from 'lucide-react';

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
      label: 'Student',
      desc: 'Take tests & view results',
      color: 'text-blue-600 bg-blue-50',
    },
    {
      to: '/trainer/login',
      icon: BookOpen,
      label: 'Trainer',
      desc: 'Manage tests & students',
      color: 'text-indigo-600 bg-indigo-50',
    },
    {
      to: '/institution/login',
      icon: Building2,
      label: 'Institution',
      desc: 'Academic oversight',
      color: 'text-emerald-600 bg-emerald-50',
    },
    {
      to: '/admin/login',
      icon: ShieldCheck,
      label: 'Admin',
      desc: 'System management',
      color: 'text-slate-600 bg-slate-100',
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
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl border border-[#e2e5ea] shadow-dropdown py-1.5 origin-top-right animate-in z-50">
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
                    <span className="text-[11px] text-[#9099a8]">{p.desc}</span>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-[#9099a8] opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              ))}
            </div>
          )}
        </div>
      </header>
      
      <main className="flex-1 flex items-center relative z-10">
        <div className="max-w-2xl px-6 lg:px-10 animate-in">
          <p className="text-[13px] font-medium text-blue-600 mb-3 tracking-wide uppercase">Placement Assessment Platform</p>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-[#1a1d23] mb-4 leading-[1.1]">
            Run placement tests<br/>without the headache.
          </h1>
          <p className="text-lg text-[#5a6170] mb-8 max-w-lg leading-relaxed">
            Create assessments, schedule them for your batches, and get results — all from one place. Built for trainers who have better things to do.
          </p>
          <div className="flex items-center gap-3">
            <Link to="/student/login">
              <Button size="lg">
                Get started
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
            <Link to="/trainer/login">
              <Button variant="ghost" size="lg" className="text-[#5a6170]">
                I'm a trainer
              </Button>
            </Link>
          </div>
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
