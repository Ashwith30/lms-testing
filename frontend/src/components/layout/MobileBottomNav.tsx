import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../ui/Button';
import {
  LayoutDashboard,
  FileText,
  BarChart,
  BarChart3,
  User,
  BookOpen,
  Database,
  Users,
  Calendar,
  GraduationCap,
  CalendarClock,
  BookMarked,
  Upload,
  LogOut,
  MoreHorizontal,
  X,
} from 'lucide-react';
import type { Role } from '../../types';

interface NavItem {
  label: string;
  icon: React.FC<{ className?: string }>;
  path: string;
}

const getNavItems = (role: Role): { primary: NavItem[]; overflow: NavItem[] } => {
  switch (role) {
    case 'student':
      return {
        primary: [
          { label: 'Home', icon: LayoutDashboard, path: '/student/dashboard' },
          { label: 'Tests', icon: FileText, path: '/student/tests' },
          { label: 'Results', icon: BarChart, path: '/student/results' },
          { label: 'Profile', icon: User, path: '/student/profile' },
        ],
        overflow: [
          { label: 'Analytics', icon: BarChart3, path: '/student/analytics' },
          { label: 'Materials', icon: BookOpen, path: '/student/materials' },
        ],
      };
    case 'trainer':
      return {
        primary: [
          { label: 'Home', icon: LayoutDashboard, path: '/trainer/dashboard' },
          { label: 'Tests', icon: FileText, path: '/trainer/tests' },
          { label: 'Students', icon: Users, path: '/trainer/students' },
          { label: 'Results', icon: BarChart, path: '/trainer/results' },
        ],
        overflow: [
          { label: 'Schedule', icon: Calendar, path: '/trainer/tests/schedule' },
          { label: 'Question Banks', icon: Database, path: '/trainer/question-bank' },
          { label: 'Upload Questions', icon: Upload, path: '/trainer/question-bank/upload' },
          { label: 'Analytics', icon: BarChart3, path: '/trainer/analytics' },
          { label: 'Materials', icon: BookMarked, path: '/trainer/materials' },
        ],
      };
    case 'admin':
      return {
        primary: [
          { label: 'Home', icon: LayoutDashboard, path: '/admin/dashboard' },
          { label: 'Tests', icon: FileText, path: '/admin/tests' },
          { label: 'Students', icon: Users, path: '/admin/students' },
          { label: 'Results', icon: BarChart, path: '/admin/results' },
        ],
        overflow: [
          { label: 'Schedule', icon: Calendar, path: '/admin/tests/schedule' },
          { label: 'Question Banks', icon: Database, path: '/admin/question-bank' },
          { label: 'Upload Questions', icon: Upload, path: '/admin/question-bank/upload' },
          { label: 'Analytics', icon: BarChart3, path: '/admin/analytics' },
        ],
      };
    case 'institution':
      return {
        primary: [
          { label: 'Home', icon: LayoutDashboard, path: '/institution/dashboard' },
          { label: 'Students', icon: Users, path: '/institution/students' },
          { label: 'Results', icon: BarChart, path: '/institution/results' },
          { label: 'Analytics', icon: BarChart3, path: '/institution/analytics' },
        ],
        overflow: [
          { label: 'Faculty', icon: GraduationCap, path: '/institution/trainers' },
          { label: 'Upcoming', icon: CalendarClock, path: '/institution/upcoming-tests' },
          { label: 'Tests', icon: FileText, path: '/institution/tests' },
          { label: 'Schedule', icon: Calendar, path: '/institution/tests/schedule' },
          { label: 'Question Banks', icon: Database, path: '/institution/question-bank' },
          { label: 'Upload Questions', icon: Upload, path: '/institution/question-bank/upload' },
          { label: 'Materials', icon: BookMarked, path: '/institution/materials' },
        ],
      };
    default:
      return { primary: [], overflow: [] };
  }
};

export const MobileBottomNav = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isOverflowOpen, setIsOverflowOpen] = useState(false);

  if (!user) return null;

  const { primary, overflow } = getNavItems(user.role as Role);

  const handleLogout = () => {
    setIsOverflowOpen(false);
    logout();
    navigate('/');
  };

  const tabClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'flex flex-col items-center justify-center gap-0.5 flex-1 py-2 text-[10px] font-medium transition-colors relative',
      isActive
        ? 'text-blue-600'
        : 'text-[#9099a8]'
    );

  return (
    <>
      {/* Overflow drawer backdrop */}
      {isOverflowOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[9998] lg:hidden animate-fade"
          onClick={() => setIsOverflowOpen(false)}
        />
      )}

      {/* Overflow menu drawer (slides up from bottom) */}
      {isOverflowOpen && (
        <div className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+56px)] left-0 right-0 z-[9999] lg:hidden animate-in">
          <div className="mx-3 mb-2 bg-white rounded-2xl border border-[#e2e5ea] shadow-2xl overflow-hidden">
            {/* Drawer header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#eef0f3]">
              <span className="text-[13px] font-semibold text-[#1a1d23]">More</span>
              <button
                onClick={() => setIsOverflowOpen(false)}
                className="p-1 rounded-md text-[#9099a8] hover:bg-[#f0f2f5]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Overflow items as a grid */}
            <div className="grid grid-cols-3 gap-1 p-3">
              {overflow.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsOverflowOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'flex flex-col items-center gap-1.5 p-3 rounded-xl text-[11px] font-medium transition-colors',
                      isActive
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-[#5a6170] hover:bg-[#f0f2f5]'
                    )
                  }
                >
                  <item.icon className="h-5 w-5" />
                  <span className="text-center leading-tight">{item.label}</span>
                </NavLink>
              ))}
            </div>

            {/* Logout */}
            <div className="border-t border-[#eef0f3] p-3">
              <button
                onClick={handleLogout}
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-[13px] font-medium text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Log out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-[9997] lg:hidden bg-white/95 backdrop-blur-md border-t border-[#e2e5ea] shadow-[0_-2px_10px_rgba(0,0,0,0.06)]"
           style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="flex items-stretch h-14">
          {primary.map((item) => (
            <NavLink key={item.path} to={item.path} className={tabClass} end={item.path.endsWith('/dashboard')}>
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute top-0 left-1/2 -translate-x-1/2 h-[2px] w-8 bg-blue-600 rounded-full" />
                  )}
                  <item.icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </>
              )}
            </NavLink>
          ))}

          {/* More button */}
          {overflow.length > 0 && (
            <button
              onClick={() => setIsOverflowOpen(!isOverflowOpen)}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 flex-1 py-2 text-[10px] font-medium transition-colors',
                isOverflowOpen ? 'text-blue-600' : 'text-[#9099a8]'
              )}
            >
              <MoreHorizontal className="h-5 w-5" />
              <span>More</span>
            </button>
          )}
        </div>
      </nav>
    </>
  );
};
