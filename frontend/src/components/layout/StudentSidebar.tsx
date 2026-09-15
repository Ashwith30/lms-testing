import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  LayoutDashboard, 
  FileText, 
  Radio,
  Gamepad2,
  BarChart, 
  LineChart,
  User, 
  BookOpen,
  LogOut 
} from 'lucide-react';

import { cn } from '../ui/Button';
import { Logo } from '../ui/Logo';

export const StudentSidebar = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const navItems = [
    { label: 'Dashboard',    icon: LayoutDashboard, path: '/student/dashboard' },
    { label: 'My Tests',     icon: FileText,        path: '/student/tests' },
    { label: 'Analytics',    icon: LineChart,       path: '/student/analytics' },
    { label: 'Live Quizzes', icon: Radio,           path: '/student/live-quizzes' },
    { label: 'Games',        icon: Gamepad2,        path: '/student/games' },
    { label: 'Results',      icon: BarChart,        path: '/student/results' },
    { label: 'Materials',    icon: BookOpen,        path: '/student/materials' },
    { label: 'Profile',      icon: User,            path: '/student/profile' },
  ];

  const linkClasses = ({ isActive }: { isActive: boolean }) => cn(
    "flex items-center px-3.5 py-2.5 text-[13px] font-medium rounded-xl transition-all duration-150 group outline-none focus:outline-none",
    isActive 
      ? "bg-blue-50 text-blue-600 font-semibold" 
      : "text-slate-600 hover:bg-slate-100/70 hover:text-slate-900"
  );

  return (
    <div className="flex flex-col w-[240px] bg-white border-r border-slate-200/80 h-screen sticky top-0 shadow-xs select-none">
      <div className="p-5 pb-4">
        <Logo size="md" />
      </div>
      
      <div className="flex-1 overflow-y-auto">
        <nav className="px-3">
          <div className="space-y-1">
            {navItems.map((item) => (
              <NavLink key={item.path} to={item.path} className={linkClasses}>
                {({ isActive }) => (
                  <>
                    <item.icon className={cn(
                      "mr-2.5 h-[18px] w-[18px] flex-shrink-0 transition-opacity",
                      isActive ? "text-blue-600 opacity-100" : "opacity-60 group-hover:opacity-100"
                    )} />
                    <span>{item.label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </nav>
      </div>

      <div className="p-3 border-t border-slate-200/80">
        <button
          onClick={handleLogout}
          className="flex items-center w-full px-3.5 py-2.5 text-[13px] font-medium text-slate-500 rounded-xl hover:bg-red-50 hover:text-red-600 transition-all duration-150 group cursor-pointer outline-none focus:outline-none"
        >
          <LogOut className="mr-2.5 h-[18px] w-[18px] flex-shrink-0 opacity-60 group-hover:opacity-100" />
          Log out
        </button>
      </div>
    </div>
  );
};
