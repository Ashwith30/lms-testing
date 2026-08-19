import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  LayoutDashboard, 
  Database, 
  Upload, 
  FileText, 
  Calendar, 
  CalendarClock,
  Users, 
  BarChart3, 
  BarChart,
  GraduationCap,
  LogOut 
} from 'lucide-react';

import { cn } from '../ui/Button';
import { Logo } from '../ui/Logo';

export const InstitutionSidebar = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const mainNav = [
    { label: 'Dashboard',        icon: LayoutDashboard, path: '/institution/dashboard' },
    { label: 'Students',         icon: Users,           path: '/institution/students' },
    { label: 'Faculty',          icon: GraduationCap,   path: '/institution/trainers' },
    { label: 'Upcoming Tests',   icon: CalendarClock,   path: '/institution/upcoming-tests' },
    { label: 'Results',          icon: BarChart,        path: '/institution/results' },
    { label: 'Analytics',        icon: BarChart3,       path: '/institution/analytics' },
  ];

  const secondaryNav = [
    { label: 'Tests',            icon: FileText,        path: '/institution/tests' },
    { label: 'Schedule Test',    icon: Calendar,        path: '/institution/tests/schedule' },
    { label: 'Question Banks',   icon: Database,        path: '/institution/question-bank' },
    { label: 'Upload Questions', icon: Upload,          path: '/institution/question-bank/upload' },
  ];

  const linkClasses = ({ isActive }: { isActive: boolean }) => cn(
    "flex items-center px-3 py-2 text-[13px] font-medium rounded-md transition-all duration-150 group relative",
    isActive 
      ? "bg-emerald-50/80 text-emerald-700 before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-[3px] before:rounded-full before:bg-emerald-600" 
      : "text-[#5a6170] hover:bg-[#f0f2f5] hover:text-[#1a1d23]"
  );

  return (
    <div className="flex flex-col w-[240px] bg-white border-r border-[#eef0f3] h-screen sticky top-0">
      <div className="p-5 pb-4">
        <Logo size="md" />
      </div>
      
      <div className="flex-1 overflow-y-auto">
        <nav className="px-3">
          <p className="px-3 mb-1.5 text-[10px] font-semibold text-[#9099a8] uppercase tracking-wider">Overview</p>
          <div className="mb-1">
            {mainNav.map((item) => (
              <NavLink key={item.path} to={item.path} className={linkClasses}>
                <item.icon className="mr-2.5 h-[18px] w-[18px] flex-shrink-0 opacity-60 group-hover:opacity-80" />
                {item.label}
              </NavLink>
            ))}
          </div>

          <div className="h-px bg-[#eef0f3] mx-1 my-3"></div>

          <p className="px-3 mb-1.5 text-[10px] font-semibold text-[#9099a8] uppercase tracking-wider">Assessment Tools</p>
          <div>
            {secondaryNav.map((item) => (
              <NavLink key={item.path} to={item.path} className={linkClasses}>
                <item.icon className="mr-2.5 h-[18px] w-[18px] flex-shrink-0 opacity-60 group-hover:opacity-80" />
                {item.label}
              </NavLink>
            ))}
          </div>
        </nav>
      </div>

      <div className="p-3 border-t border-[#eef0f3]">
        <button
          onClick={handleLogout}
          className="flex items-center w-full px-3 py-2 text-[13px] font-medium text-[#9099a8] rounded-md hover:bg-red-50 hover:text-red-600 transition-all duration-150 group"
        >
          <LogOut className="mr-2.5 h-[18px] w-[18px] flex-shrink-0 opacity-60 group-hover:opacity-100" />
          Log out
        </button>
      </div>
    </div>
  );
};
