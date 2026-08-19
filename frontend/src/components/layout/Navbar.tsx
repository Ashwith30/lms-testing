import React, { useState, useEffect, useRef } from 'react';
import { Bell, Search, Check, AlertCircle, Info, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface Notification {
  id: string;
  title: string;
  description: string;
  time: string;
  isRead: boolean;
  type: 'info' | 'success' | 'alert';
}

const mockNotifications: Record<string, Notification[]> = {
  student: [
    {
      id: 's1',
      title: 'New Assessment Scheduled',
      description: 'Aptitude Assessment 1 is scheduled for Aug 20, 10:00 AM.',
      time: '2 hours ago',
      isRead: false,
      type: 'info'
    },
    {
      id: 's2',
      title: 'Results Published',
      description: 'Your results for "Python Basics Quiz" are now available.',
      time: '1 day ago',
      isRead: false,
      type: 'success'
    },
    {
      id: 's3',
      title: 'System Announcement',
      description: 'Platform maintenance tonight between 12:00 AM and 2:00 AM.',
      time: '2 days ago',
      isRead: true,
      type: 'alert'
    }
  ],
  trainer: [
    {
      id: 't1',
      title: 'Assessment Attempted',
      description: 'Ashwith completed the Aptitude Assessment 1.',
      time: '1 hour ago',
      isRead: false,
      type: 'success'
    },
    {
      id: 't2',
      title: 'New Registration',
      description: 'Student Ramesh Kumar has registered for your CSE batch.',
      time: '5 hours ago',
      isRead: false,
      type: 'info'
    },
    {
      id: 't3',
      title: 'Question Bank Complete',
      description: 'Successfully parsed 50 questions from Excel import.',
      time: '2 days ago',
      isRead: true,
      type: 'success'
    }
  ],
  admin: [
    {
      id: 'a1',
      title: 'Security Notice',
      description: 'Multiple failed login attempts detected on trainer accounts.',
      time: '30 mins ago',
      isRead: false,
      type: 'alert'
    },
    {
      id: 'a2',
      title: 'Database Backup Success',
      description: 'Nightly database snapshot has been successfully stored.',
      time: '12 hours ago',
      isRead: true,
      type: 'success'
    }
  ],
  institution: [
    {
      id: 'i1',
      title: 'Batch Performance Review',
      description: 'CSE 2026 Batch average score reached 78.5% across all assessments.',
      time: '1 hour ago',
      isRead: false,
      type: 'success'
    },
    {
      id: 'i2',
      title: 'New Assessment Created',
      description: 'Dr. Sarah Jenkins published "DSA Midterm Assessment".',
      time: '3 hours ago',
      isRead: false,
      type: 'info'
    },
    {
      id: 'i3',
      title: 'Integrity Alert',
      description: '2 tab switch violations recorded during recent online assessment.',
      time: '1 day ago',
      isRead: true,
      type: 'alert'
    }
  ]
};

export const Navbar = () => {
  const { user } = useAuth();
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

  const handleMarkAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const handleToggleRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: !n.isRead } : n));
  };

  const renderIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return (
          <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
            <CheckCircle2 className="h-4 w-4" />
          </div>
        );
      case 'alert':
        return (
          <div className="p-1.5 rounded-lg bg-red-50 text-red-600">
            <AlertCircle className="h-4 w-4" />
          </div>
        );
      case 'info':
      default:
        return (
          <div className="p-1.5 rounded-lg bg-slate-100 text-slate-600">
            <Info className="h-4 w-4" />
          </div>
        );
    }
  };

  return (
    <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-6 sticky top-0 z-40">
      <div className="flex flex-1 items-center gap-4">
        <div className="relative max-w-md w-full hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search..." 
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
          />
        </div>
      </div>
      
      <div className="flex items-center gap-4 relative" ref={dropdownRef}>
        {/* Bell Button */}
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className={`relative p-2 transition-colors rounded-full hover:bg-slate-100 ${
            isOpen ? 'text-blue-600 bg-slate-100' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-red-600 rounded-full animate-pulse"></span>
          )}
        </button>

        {/* Notifications Dropdown Panel */}
        {isOpen && (
          <div className="absolute right-0 mt-2 top-full w-96 bg-white rounded-xl border border-slate-200 shadow-lg py-2 origin-top-right transition-all duration-200 z-50 animate-in">
            {/* Header */}
            <div className="px-4 py-2.5 flex items-center justify-between border-b border-slate-100">
              <span className="font-bold text-slate-900 text-sm">Notifications</span>
              {unreadCount > 0 && (
                <button 
                  onClick={handleMarkAllRead}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                >
                  <Check className="h-3.5 w-3.5" /> Mark all read
                </button>
              )}
            </div>

            {/* List */}
            <div className="max-h-80 overflow-y-auto">
              {notifications.length > 0 ? (
                notifications.map((notification) => (
                  <div 
                    key={notification.id}
                    onClick={() => handleToggleRead(notification.id)}
                    className={`flex items-start gap-3 p-4 border-b border-slate-100 last:border-b-0 hover:bg-slate-50 transition-colors cursor-pointer relative ${
                      !notification.isRead ? 'bg-blue-50/20' : ''
                    }`}
                  >
                    {renderIcon(notification.type)}
                    <div className="flex-1 min-w-0 pr-4">
                      <p className={`text-sm ${!notification.isRead ? 'font-bold text-slate-900' : 'text-slate-700'}`}>
                        {notification.title}
                      </p>
                      <p className="text-xs text-slate-500 mt-1 leading-normal">
                        {notification.description}
                      </p>
                      <span className="text-[10px] text-slate-400 mt-1.5 block">
                        {notification.time}
                      </span>
                    </div>

                    {/* Unread indicator dot */}
                    {!notification.isRead && (
                      <span className="absolute top-4 right-4 h-2 w-2 bg-blue-600 rounded-full"></span>
                    )}
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                  <Bell className="h-8 w-8 text-slate-300" />
                  <span className="text-sm">All caught up!</span>
                </div>
              )}
            </div>
          </div>
        )}
        
        <div className="h-8 w-px bg-slate-200 mx-1"></div>
        
        {/* User Profile Info */}
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end">
            <span className="text-sm font-medium text-slate-900">{user?.name}</span>
            <span className="text-xs text-slate-500 capitalize">{user?.role}</span>
          </div>
          <div className="h-9 w-9 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
        </div>
      </div>
    </header>
  );
};
