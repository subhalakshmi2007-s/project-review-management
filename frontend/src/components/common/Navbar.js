import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FiLogOut, FiUser } from 'react-icons/fi';
import { logout, getUser } from '../../services/auth';
import logo from '../../assets/logo.svg';

export default function Navbar() {
  const user = getUser();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <nav className="app-nav">
      <a className="nav-brand" href="#">
        <img src={logo} alt="ProReview logo" />
        <div className="nav-brand-text">
          <div className="nav-brand-name"><span className="pro">PRO</span>REVIEW</div>
          <div className="nav-brand-sub">Project Review Management System</div>
        </div>
      </a>

      <div className="nav-right">
        <span className="nav-user">
          <FiUser style={{ marginRight: 4, verticalAlign: 'middle' }} />
          {user?.name}
          <span className="nav-role-badge">{user?.role}</span>
        </span>
        <button className="btn-nav-logout" onClick={handleLogout}>
          <FiLogOut style={{ marginRight: 4, verticalAlign: 'middle' }} />
          Logout
        </button>
      </div>
    </nav>
  );
}
