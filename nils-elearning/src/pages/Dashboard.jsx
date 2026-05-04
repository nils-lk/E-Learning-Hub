import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import AdminDashboard from './AdminDashboard';
import LecturerDashboard from './LecturerDashboard';
import SuperAdminDashboard from './SuperAdminDashboard';
import StudentDashboard from './StudentDashboard';

// Role-based dashboard router
const Dashboard = () => {
  const { role, loading } = useAuth();

  if (loading) return <LoadingSpinner fullscreen />;

  switch (role) {
    case 'superadmin': return <SuperAdminDashboard />;
    case 'admin':      return <AdminDashboard />;
    case 'lecturer':   return <LecturerDashboard />;
    case 'user':       return <StudentDashboard />;
    default:           return <Navigate to="/login" replace />;
  }
};

export default Dashboard;
