import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Role } from '../types';

interface ProtectedRouteProps {
  allowedRole?: Role;
  allowedRoles?: Role[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRole, allowedRoles }) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin inline-block h-8 w-8 border-4 border-slate-200 border-t-blue-600 rounded-full" />
      </div>
    );
  }

  const roles = allowedRoles || (allowedRole ? [allowedRole] : []);

  if (!user) {
    // Not logged in, redirect to respective portal login based on the route being accessed
    let loginPath = '/student/login';
    if (roles.includes('trainer')) {
      loginPath = '/trainer/login';
    } else if (roles.includes('admin')) {
      loginPath = '/admin/login';
    }
    return <Navigate to={loginPath} state={{ from: location }} replace />;
  }

  if (roles.length > 0 && !roles.includes(user.role)) {
    // Logged in but unauthorized role: redirect to their own dashboard
    let dashboardPath = '/student/dashboard';
    if (user.role === 'trainer') {
      dashboardPath = '/trainer/dashboard';
    } else if (user.role === 'admin') {
      dashboardPath = '/admin/dashboard';
    }
    return <Navigate to={dashboardPath} replace />;
  }

  return <Outlet />;
};
