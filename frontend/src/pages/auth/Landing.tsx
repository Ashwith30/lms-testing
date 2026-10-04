import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Logo } from '../../components/ui/Logo';
import { GraduationCap, BookOpen, Building2, ShieldCheck, X, ArrowRight } from 'lucide-react';

export const Landing = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const [isPortalModalOpen, setIsPortalModalOpen] = useState(false);

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
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        setIsPortalModalOpen(false);
      }
    };
    if (isPortalModalOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isPortalModalOpen]);

  const portals = [
    {
      to: '/student/login',
      icon: GraduationCap,
      label: 'Student Portal',
      desc: 'Take tests & view results',
      color: 'text-blue-600 bg-blue-50',
    },
    {
      to: '/trainer/login',
      icon: BookOpen,
      label: 'Trainer Portal',
      desc: 'Create tests & manage questions',
      color: 'text-sky-600 bg-sky-50',
    },
    {
      to: '/institution/login',
      icon: Building2,
      label: 'Institution Portal',
      desc: 'Campus & batch oversight',
      color: 'text-emerald-600 bg-emerald-50',
    },
    {
      to: '/admin/login',
      icon: ShieldCheck,
      label: 'Admin Portal',
      desc: 'System & platform control',
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
      </header>
      
      <main className="flex-1 flex flex-col justify-center items-center text-center px-6 lg:px-10 relative z-10 py-8 max-w-5xl mx-auto w-full">
        <div className="animate-in flex flex-col items-center">
          <p className="text-[13px] font-medium text-blue-600 mb-3 tracking-wide uppercase">Placement Assessment Platform</p>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[#1a1d23] mb-4 leading-[1.15] sm:leading-[1.1]">
            Run placement tests<br className="hidden sm:inline" /> without the headache.
          </h1>
          <p className="text-base sm:text-lg text-[#5a6170] max-w-xl mx-auto leading-relaxed mb-8">
            Create assessments, schedule them for your cohorts, and get real-time analytics with proctoring telemetry.
          </p>

          {/* Centered Sign In CTA Button */}
          <Button
            className="!h-12 !px-8 !rounded-xl !text-[15px] !font-semibold !bg-blue-600 hover:!bg-blue-700 !text-white !shadow-lg !shadow-blue-500/25 hover:!shadow-blue-500/35 flex items-center gap-2 cursor-pointer"
            onClick={() => setIsPortalModalOpen(true)}
          >
            <span>Sign in</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </main>

      {/* Portal Selector Modal */}
      {isPortalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            ref={modalRef}
            className="w-full max-w-lg bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 relative animate-in zoom-in-95 duration-200"
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Choose your portal</h3>
                <p className="text-xs text-slate-500 mt-0.5">Select your role to continue to the platform</p>
              </div>
              <button
                onClick={() => setIsPortalModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
              {portals.map((p) => (
                <Link
                  key={p.to}
                  to={p.to}
                  className="flex flex-col p-4 rounded-xl border border-slate-200/80 hover:border-blue-400 hover:bg-blue-50/40 text-slate-800 transition-all group"
                  onClick={() => setIsPortalModalOpen(false)}
                >
                  <div className={`p-2.5 rounded-xl w-fit mb-3 ${p.color}`}>
                    <p.icon className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                    {p.label}
                  </span>
                  <span className="text-xs text-slate-400 mt-1 leading-normal">
                    {p.desc}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

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

