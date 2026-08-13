import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Role } from '../types';

interface ProtectedRouteProps {
  allowedRole: Role;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRole }) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50">Loading...</div>;
  }

  if (!user) {
    // Not logged in, redirect to respective login
    const loginPath = allowedRole === 'trainer' ? '/trainer/login' : '/student/login';
    return <Navigate to={loginPath} state={{ from: location }} replace />;
  }

  if (user.role !== allowedRole) {
    // Logged in but wrong role
    const dashboardPath = user.role === 'trainer' ? '/trainer/dashboard' : '/student/dashboard';
    return <Navigate to={dashboardPath} replace />;
  }

  return <Outlet />;
};
