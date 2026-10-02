import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import { isLoggedIn, getRole } from './services/auth';

import AuthPage       from './pages/AuthPage';
import LandingPage    from './pages/LandingPage';
import TeacherHome    from './pages/TeacherHome';
import StudentHome    from './pages/StudentHome';
import AdminHome      from './pages/AdminHome';

const Guard = ({ role, children }) => {
  if (!isLoggedIn())     return <Navigate to="/login" replace />;
  if (getRole() !== role) return <Navigate to={`/${getRole()}`} replace />;
  return children;
};

export default function App() {
  return (
    <BrowserRouter>
      <ToastContainer position="top-right" autoClose={3000} />
      <Routes>
        <Route path="/login"   element={<AuthPage mode="login" />} />
        <Route path="/register-teacher" element={<AuthPage mode="register-teacher" />} />
        <Route path="/register-student" element={<AuthPage mode="register-student" />} />

        <Route path="/teacher" element={<Guard role="teacher"><TeacherHome /></Guard>} />
        <Route path="/student" element={<Guard role="student"><StudentHome /></Guard>} />
        <Route path="/admin" element={<Guard role="admin"><AdminHome /></Guard>} />

        <Route path="/" element={<LandingPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
