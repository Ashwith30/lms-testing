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

  const navItems = [
    { label: 'Dashboard',        icon: LayoutDashboard, path: '/institution/dashboard' },
    { label: 'Question Banks',   icon: Database,        path: '/institution/question-bank' },
    { label: 'Upload Questions', icon: Upload,          path: '/institution/question-bank/upload' },
    { label: 'Tests',            icon: FileText,        path: '/institution/tests' },
    { label: 'Schedule Test',    icon: Calendar,        path: '/institution/tests/schedule' },
    { label: 'Upcoming Tests',   icon: CalendarClock,   path: '/institution/upcoming-tests' },
    { label: 'Students',         icon: Users,           path: '/institution/students' },
    { label: 'Analytics',        icon: BarChart3,       path: '/institution/analytics' },
    { label: 'Results',          icon: BarChart,        path: '/institution/results' },
    { label: 'Faculty / Trainers', icon: GraduationCap, path: '/institution/trainers' },
  ];

  return (
    <div className="flex flex-col w-64 bg-white border-r border-slate-200 h-screen sticky top-0">
      <div className="p-6">
        <Logo size="md" />
      </div>
      
      <div className="flex-1 overflow-y-auto py-4">
        <nav className="space-y-1 px-4">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => cn(
                "flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors group",
                isActive 
                  ? "bg-emerald-50 text-emerald-700" 
                  : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              <item.icon className={cn("mr-3 h-5 w-5 flex-shrink-0", 
                "text-slate-400 group-hover:text-slate-500",
                "[[aria-current=page]_&]:text-emerald-600"
              )} />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="p-4 border-t border-slate-200">
        <button
          onClick={handleLogout}
          className="flex items-center w-full px-3 py-2 text-sm font-medium text-slate-700 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors group"
        >
          <LogOut className="mr-3 h-5 w-5 flex-shrink-0 text-slate-400 group-hover:text-red-500" />
          Logout
        </button>
      </div>
    </div>
  );
};
