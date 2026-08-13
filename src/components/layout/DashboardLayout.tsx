import React from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { TrainerSidebar } from './TrainerSidebar';
import { StudentSidebar } from './StudentSidebar';
import { AdminSidebar } from './AdminSidebar';
import { Navbar } from './Navbar';

export const DashboardLayout = () => {
  const { user } = useAuth();

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {user?.role === 'admin' ? (
        <AdminSidebar />
      ) : user?.role === 'trainer' ? (
        <TrainerSidebar />
      ) : (
        <StudentSidebar />
      )}
      
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar />
        <main className="flex-1 overflow-y-auto p-6 lg:p-8 animate-in">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
