import React from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { TrainerSidebar } from './TrainerSidebar';
import { StudentSidebar } from './StudentSidebar';
import { AdminSidebar } from './AdminSidebar';
import { InstitutionSidebar } from './InstitutionSidebar';
import { Navbar } from './Navbar';
import { MobileBottomNav } from './MobileBottomNav';

export const DashboardLayout = () => {
  const { user } = useAuth();

  return (
    <div className="flex h-screen bg-[#f7f8fa] overflow-hidden">
      {/* Sidebar — hidden on mobile, visible on lg: */}
      <div className="hidden lg:block">
        {user?.role === 'admin' ? (
          <AdminSidebar />
        ) : user?.role === 'institution' ? (
          <InstitutionSidebar />
        ) : user?.role === 'trainer' ? (
          <TrainerSidebar />
        ) : (
          <StudentSidebar />
        )}
      </div>
      
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 pb-20 lg:pb-8">
          <div className="max-w-[1400px] w-full">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile bottom tab bar */}
      <MobileBottomNav />
    </div>
  );
};
