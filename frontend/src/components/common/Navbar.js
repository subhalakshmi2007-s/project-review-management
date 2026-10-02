import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiLogOut, FiMoon, FiSun, FiUser } from 'react-icons/fi';
import { logout, getUser } from '../../services/auth';
import logo from '../../assets/logo.svg';
import HistoryControls from './HistoryControls';
import NotificationBell from './NotificationBell';

export default function Navbar() {
  const user = getUser();
  const roleLabel = { teacher: 'Guide', student: 'Member', admin: 'Admin' }[user?.role] || user?.role;
  const navigate = useNavigate();
  const [darkTheme, setDarkTheme] = useState(() => localStorage.getItem('prms_theme') === 'dark');

  useEffect(() => {
    document.body.classList.toggle('theme-dark', darkTheme);
    localStorage.setItem('prms_theme', darkTheme ? 'dark' : 'light');

    return () => document.body.classList.remove('theme-dark');
  }, [darkTheme]);

  const handleLogout = () => {
    logout();
    navigate('/', { replace: true });
  };

  return (
    <nav className="app-nav">
      <div className="nav-leading">
        <HistoryControls className="history-controls-on-dark" />
        <Link className="nav-brand" to="/">
          <img src={logo} alt="ProReview logo" />
          <div className="nav-brand-text">
            <div className="nav-brand-name"><span className="pro">PRO</span>REVIEW</div>
            <div className="nav-brand-sub">Project Review Management System</div>
          </div>
        </Link>
      </div>

      <div className="nav-right">
        <span className="nav-user">
          <FiUser style={{ marginRight: 4, verticalAlign: 'middle' }} />
          {user?.name}
          <span className="nav-role-badge">{roleLabel}</span>
        </span>
        <NotificationBell />
        <button className="btn-nav-theme" onClick={() => setDarkTheme(theme => !theme)}
          title={darkTheme ? 'Switch to light theme' : 'Switch to dark theme'}
          aria-label={darkTheme ? 'Switch to light theme' : 'Switch to dark theme'}>
          {darkTheme ? <FiSun /> : <FiMoon />}
        </button>
        <button className="btn-nav-logout" onClick={handleLogout}>
          <FiLogOut style={{ marginRight: 4, verticalAlign: 'middle' }} />
          Logout
        </button>
      </div>
    </nav>
  );
}
