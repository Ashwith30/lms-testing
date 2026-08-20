import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Search, Check, AlertCircle, Info, CheckCircle2, ArrowRight } from 'lucide-react';
import { Logo } from '../ui/Logo';
import { useAuth } from '../../context/AuthContext';

export interface Notification {
  id: string;
  title: string;
  description: string;
  time: string;
  isRead: boolean;
  type: 'info' | 'success' | 'alert';
  link?: string;
}

const mockNotifications: Record<string, Notification[]> = {
  student: [
    {
      id: 's1',
      title: 'New Assessment Scheduled',
      description: 'Aptitude Assessment 1 is scheduled for Aug 20, 10:00 AM.',
      time: '2 hours ago',
      isRead: false,
      type: 'info',
      link: '/student/tests'
    },
    {
      id: 's2',
      title: 'Results Published',
      description: 'Your results for "Python Basics Quiz" are now available.',
      time: '1 day ago',
      isRead: false,
      type: 'success',
      link: '/student/results'
    },
    {
      id: 's3',
      title: 'System Announcement',
      description: 'Platform maintenance tonight between 12:00 AM and 2:00 AM.',
      time: '2 days ago',
      isRead: true,
      type: 'alert',
      link: '/student/dashboard'
    }
  ],
  trainer: [
    {
      id: 't1',
      title: 'Assessment Attempted',
      description: 'Ashwith completed the Aptitude Assessment 1.',
      time: '1 hour ago',
      isRead: false,
      type: 'success',
      link: '/trainer/results'
    },
    {
      id: 't2',
      title: 'New Registration',
      description: 'Student Ramesh Kumar has registered for your CSE batch.',
      time: '5 hours ago',
      isRead: false,
      type: 'info',
      link: '/trainer/students'
    },
    {
      id: 't3',
      title: 'Question Bank Complete',
      description: 'Successfully parsed 50 questions from Excel import.',
      time: '2 days ago',
      isRead: true,
      type: 'success',
      link: '/trainer/question-bank'
    }
  ],
  admin: [
    {
      id: 'a1',
      title: 'Security Notice',
      description: 'Multiple failed login attempts detected on trainer accounts.',
      time: '30 mins ago',
      isRead: false,
      type: 'alert',
      link: '/admin/analytics'
    },
    {
      id: 'a2',
      title: 'Database Backup Success',
      description: 'Nightly database snapshot has been successfully stored.',
      time: '12 hours ago',
      isRead: true,
      type: 'success',
      link: '/admin/dashboard'
    }
  ],
  institution: [
    {
      id: 'i1',
      title: 'Batch Performance Review',
      description: 'CSE 2026 Batch average score reached 78.5% across all assessments.',
      time: '1 hour ago',
      isRead: false,
      type: 'success',
      link: '/institution/analytics'
    },
    {
      id: 'i2',
      title: 'New Assessment Created',
      description: 'Dr. Sarah Jenkins published "DSA Midterm Assessment".',
      time: '3 hours ago',
      isRead: false,
      type: 'info',
      link: '/institution/upcoming-tests'
    },
    {
      id: 'i3',
      title: 'Integrity Alert',
      description: '2 tab switch violations recorded during recent online assessment.',
      time: '1 day ago',
      isRead: true,
      type: 'alert',
      link: '/institution/results'
    }
  ]
};

export const Navbar = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Initialize notifications based on user role
  useEffect(() => {
    const role = user?.role || 'student';
    const initialList = mockNotifications[role] || mockNotifications.student;
    setNotifications(initialList);
  }, [user]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleMarkAllRead = (e: React.MouseEvent) => {
    e.stopPropagation();
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const handleNotificationClick = (notification: Notification) => {
    // Mark as read
    setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, isRead: true } : n));
    // Close dropdown
    setIsOpen(false);
    // Redirect to the referenced page
    if (notification.link) {
      navigate(notification.link);
    }
  };

  const renderIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return (
          <div className="p-1.5 rounded-md bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="h-3.5 w-3.5" />
          </div>
        );
      case 'alert':
        return (
          <div className="p-1.5 rounded-md bg-amber-50 text-amber-600">
            <AlertCircle className="h-3.5 w-3.5" />
          </div>
        );
      case 'info':
      default:
        return (
          <div className="p-1.5 rounded-md bg-blue-50 text-blue-600">
            <Info className="h-3.5 w-3.5" />
          </div>
        );
    }
  };

  return (
    <header className="bg-white/80 backdrop-blur-sm border-b border-[#e2e5ea] h-14 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-40">
      <div className="flex flex-1 items-center gap-3 sm:gap-4">
        {/* Logo visible on mobile (sidebar hidden) */}
        <div className="lg:hidden">
          <Logo size="sm" />
        </div>
        <div className="relative max-w-sm w-full hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#9099a8]" />
          <input 
            type="text" 
            placeholder="Search..." 
            className="w-full pl-9 pr-4 py-1.5 bg-[#f0f2f5] border-0 rounded-md text-sm text-[#1a1d23] placeholder:text-[#9099a8] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white focus:shadow-sm transition-all duration-150"
          />
        </div>
      </div>
      
      <div className="flex items-center gap-2 sm:gap-3 relative" ref={dropdownRef}>
        {/* Bell Button */}
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className={`relative p-1.5 transition-colors rounded-md ${
            isOpen ? 'text-blue-600 bg-blue-50' : 'text-[#9099a8] hover:text-[#5a6170] hover:bg-[#f0f2f5]'
          }`}
          title="Notifications"
        >
          <Bell className="h-[18px] w-[18px]" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 h-2 w-2 bg-blue-600 rounded-full ring-2 ring-white"></span>
          )}
        </button>

        {/* Notifications Dropdown Panel */}
        {isOpen && (
          <div className="absolute right-0 mt-2 top-full w-[calc(100vw-2rem)] sm:w-[360px] max-w-[360px] bg-white rounded-xl border border-[#e2e5ea] shadow-dropdown py-1 origin-top-right animate-in z-50">
            {/* Header */}
            <div className="px-4 py-2.5 flex items-center justify-between border-b border-[#eef0f3]">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-[#1a1d23] text-[13px]">Notifications</span>
                {unreadCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-600 border border-blue-100">
                    {unreadCount} new
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button 
                  onClick={handleMarkAllRead}
                  className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer font-medium"
                >
                  <Check className="h-3 w-3" /> Mark all read
                </button>
              )}
            </div>

            {/* List */}
            <div className="max-h-80 overflow-y-auto divide-y divide-[#f5f6f8]">
              {notifications.length > 0 ? (
                notifications.map((notification) => (
                  <div 
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        handleNotificationClick(notification);
                      }
                    }}
                    className={`group flex items-start gap-2.5 px-4 py-3 hover:bg-[#f7f8fa] transition-colors cursor-pointer relative ${
                      !notification.isRead ? 'bg-blue-50/30' : ''
                    }`}
                  >
                    {renderIcon(notification.type)}
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="flex items-center justify-between gap-1">
                        <p className={`text-[13px] leading-snug group-hover:text-blue-600 transition-colors ${!notification.isRead ? 'font-semibold text-[#1a1d23]' : 'text-[#5a6170]'}`}>
                          {notification.title}
                        </p>
                      </div>
                      <p className="text-xs text-[#9099a8] mt-0.5 leading-normal line-clamp-2">
                        {notification.description}
                      </p>
                      <span className="text-[10px] text-[#9099a8] mt-1 block">
                        {notification.time}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 self-center">
                      {/* Unread indicator dot */}
                      {!notification.isRead && (
                        <span className="h-2 w-2 bg-blue-600 rounded-full" title="Unread"></span>
                      )}
                      <ArrowRight className="h-3.5 w-3.5 text-[#9099a8] opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-[#9099a8] flex flex-col items-center justify-center gap-1.5">
                  <Bell className="h-6 w-6 text-[#e2e5ea]" />
                  <span className="text-[13px]">All caught up!</span>
                </div>
              )}
            </div>
          </div>
        )}
        
        <div className="h-6 w-px bg-[#eef0f3] mx-0.5"></div>
        
        {/* User Profile Info */}
        <div className="flex items-center gap-2.5">
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-[13px] font-medium text-[#1a1d23] leading-tight">{user?.name}</span>
            <span className="text-[11px] text-[#9099a8] capitalize leading-tight">{user?.role}</span>
          </div>
          <div className="h-8 w-8 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center text-white text-[13px] font-semibold shadow-sm">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
        </div>
      </div>
    </header>
  );
};
