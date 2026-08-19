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
    <header className="bg-white/80 backdrop-blur-sm border-b border-[#e2e5ea] h-14 flex items-center justify-between px-6 sticky top-0 z-40">
      <div className="flex flex-1 items-center gap-4">
        <div className="relative max-w-sm w-full hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#9099a8]" />
          <input 
            type="text" 
            placeholder="Search..." 
            className="w-full pl-9 pr-4 py-1.5 bg-[#f0f2f5] border-0 rounded-md text-sm text-[#1a1d23] placeholder:text-[#9099a8] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white focus:shadow-sm transition-all duration-150"
          />
        </div>
      </div>
      
      <div className="flex items-center gap-3 relative" ref={dropdownRef}>
        {/* Bell Button */}
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className={`relative p-1.5 transition-colors rounded-md ${
            isOpen ? 'text-blue-600 bg-blue-50' : 'text-[#9099a8] hover:text-[#5a6170] hover:bg-[#f0f2f5]'
          }`}
        >
          <Bell className="h-[18px] w-[18px]" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 h-2 w-2 bg-blue-600 rounded-full ring-2 ring-white"></span>
          )}
        </button>

        {/* Notifications Dropdown Panel */}
        {isOpen && (
          <div className="absolute right-0 mt-2 top-full w-[360px] bg-white rounded-xl border border-[#e2e5ea] shadow-dropdown py-1 origin-top-right animate-in z-50">
            {/* Header */}
            <div className="px-4 py-2.5 flex items-center justify-between border-b border-[#eef0f3]">
              <span className="font-semibold text-[#1a1d23] text-[13px]">Notifications</span>
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
            <div className="max-h-72 overflow-y-auto">
              {notifications.length > 0 ? (
                notifications.map((notification) => (
                  <div 
                    key={notification.id}
                    onClick={() => handleToggleRead(notification.id)}
                    className={`flex items-start gap-2.5 px-4 py-3 hover:bg-[#f7f8fa] transition-colors cursor-pointer relative ${
                      !notification.isRead ? 'bg-blue-50/30' : ''
                    }`}
                  >
                    {renderIcon(notification.type)}
                    <div className="flex-1 min-w-0 pr-3">
                      <p className={`text-[13px] leading-snug ${!notification.isRead ? 'font-semibold text-[#1a1d23]' : 'text-[#5a6170]'}`}>
                        {notification.title}
                      </p>
                      <p className="text-xs text-[#9099a8] mt-0.5 leading-normal line-clamp-2">
                        {notification.description}
                      </p>
                      <span className="text-[10px] text-[#9099a8] mt-1 block">
                        {notification.time}
                      </span>
                    </div>

                    {/* Unread indicator dot */}
                    {!notification.isRead && (
                      <span className="absolute top-3.5 right-3 h-1.5 w-1.5 bg-blue-600 rounded-full"></span>
                    )}
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
          <div className="flex flex-col items-end">
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
