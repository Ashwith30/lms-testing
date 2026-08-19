import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  LayoutDashboard, 
  FileText, 
  BarChart, 
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

  const mainNav = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/student/dashboard' },
    { label: 'My Tests',  icon: FileText,        path: '/student/tests' },
    { label: 'Results',   icon: BarChart,         path: '/student/results' },
  ];

  const secondaryNav = [
    { label: 'Analytics', icon: BarChart,        path: '/student/analytics' },
    { label: 'Materials', icon: BookOpen,         path: '/student/materials' },
    { label: 'Profile',   icon: User,             path: '/student/profile' },
  ];

  const linkClasses = ({ isActive }: { isActive: boolean }) => cn(
    "flex items-center px-3 py-2 text-[13px] font-medium rounded-md transition-all duration-150 group relative",
    isActive 
      ? "bg-blue-50/80 text-blue-700 before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-[3px] before:rounded-full before:bg-blue-600" 
      : "text-[#5a6170] hover:bg-[#f0f2f5] hover:text-[#1a1d23]"
  );

  return (
    <div className="flex flex-col w-[240px] bg-white border-r border-[#eef0f3] h-screen sticky top-0">
      <div className="p-5 pb-4">
        <Logo size="md" />
      </div>
      
      <div className="flex-1 overflow-y-auto">
        <nav className="px-3">
          <div className="mb-1">
            {mainNav.map((item) => (
              <NavLink key={item.path} to={item.path} className={linkClasses}>
                <item.icon className="mr-2.5 h-[18px] w-[18px] flex-shrink-0 opacity-60 group-hover:opacity-80" />
                {item.label}
              </NavLink>
            ))}
          </div>

          <div className="h-px bg-[#eef0f3] mx-1 my-3"></div>

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
