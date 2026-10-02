import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FiMail, FiLock, FiUser, FiKey, FiLogIn, FiUserPlus, FiEye, FiEyeOff } from 'react-icons/fi';
import { loginUser, registerTeacher, registerStudent } from '../services/auth';
import logo from '../assets/logo.svg';
import HistoryControls from '../components/common/HistoryControls';

export default function AuthPage({ mode }) {
  const navigate = useNavigate();
  const [form, setForm]       = useState({ name: '', email: '', password: '', join_code: '' });
  const [busy, setBusy]       = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [joinCode, setJoinCode] = useState('');   // shown after teacher registers

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === 'login') {
        const user = await loginUser(form.email, form.password);
        toast.success(`Welcome back, ${user.name}!`);
        navigate(`/${user.role}`);
      } else if (mode === 'register-teacher') {
        const data = await registerTeacher(form.name, form.email, form.password);
        setJoinCode(data.join_code);
        toast.success('Guide account created!');
        // don't navigate yet — show join code first
      } else {
        const user = await registerStudent(form.name, form.email, form.password, form.join_code);
        toast.success(`Welcome, ${user.name}!`);
        navigate('/student');
      }
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.message ||
        'Something went wrong. Check your credentials and try again.';
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  // ── After teacher registers — show join code screen ────────────────────
  if (joinCode) {
    return (
      <div className="auth-page">
        <div className="auth-topbar"><HistoryControls /></div>
        <div className="auth-card">
          <div className="auth-logo"><img src={logo} alt="logo" /></div>
          <div className="auth-title"><span className="pro">PRO</span><span className="rev">REVIEW</span></div>
          <p className="auth-sub">Account Created!</p>

          <div className="alert alert-success" style={{ textAlign: 'center' }}>
            Your guide account is ready. Share the code below with your members.
          </div>

          <div className="code-box mb-4">
            <div className="code">{joinCode}</div>
            <p>Members enter this code when registering</p>
          </div>

          <button className="btn btn-primary w-100" style={{ justifyContent: 'center' }}
            onClick={() => navigate('/teacher')}>
            Go to Dashboard →
          </button>
        </div>
      </div>
    );
  }

  // ── Form ───────────────────────────────────────────────────────────────
  const titles = {
    'login':            { h: 'Sign In',             sub: 'Login to your account' },
    'register-teacher': { h: 'Guide Registration', sub: 'Create a guide account' },
    'register-student': { h: 'Member Registration', sub: 'Join with your guide\'s code' },
  };
  const t = titles[mode];

  return (
    <div className="auth-page">
      <div className="auth-topbar"><HistoryControls /></div>
      <div className="auth-card">
        <div className="auth-logo"><img src={logo} alt="logo" /></div>
        <div className="auth-title"><span className="pro">PRO</span><span className="rev">REVIEW</span></div>
        <p className="auth-sub">{t.sub}</p>

        <form onSubmit={handleSubmit}>
          {/* Name — register screens only */}
          {mode !== 'login' && (
            <div className="form-group">
              <label className="form-label"><FiUser style={{ marginRight: 5 }} />Full Name</label>
              <input className="form-control" type="text" placeholder="Your full name"
                value={form.name} onChange={e => set('name', e.target.value)} required />
            </div>
          )}

          <div className="form-group">
            <label className="form-label"><FiMail style={{ marginRight: 5 }} />Email Address</label>
            <input className="form-control" type="email" placeholder="email@example.com"
              value={form.email} onChange={e => set('email', e.target.value)} required />
          </div>

          <div className="form-group">
            <label className="form-label"><FiLock style={{ marginRight: 5 }} />Password
              {mode !== 'login' && <span className="text-muted text-sm"> (min 6 characters)</span>}
            </label>
            <div className="password-field">
              <input className="form-control" type={showPassword ? 'text' : 'password'} placeholder="Enter password"
                value={form.password} onChange={e => set('password', e.target.value)} required />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(value => !value)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>
          </div>

          {/* Join code — student register only */}
          {mode === 'register-student' && (
            <div className="form-group">
              <label className="form-label"><FiKey style={{ marginRight: 5 }} />Guide Join Code</label>
              <input className="form-control" type="text" placeholder="e.g. ABC12345"
                value={form.join_code} onChange={e => set('join_code', e.target.value.toUpperCase())}
                maxLength={8} required style={{ letterSpacing: '4px', fontWeight: 700 }} />
              <p className="text-muted text-sm mt-1">Ask your guide for this code to join their class.</p>
            </div>
          )}

          <button className="btn btn-primary w-100 mt-2" style={{ justifyContent: 'center', padding: '10px' }}
            type="submit" disabled={busy}>
            {mode === 'login' ? <><FiLogIn /> {busy ? 'Signing in…' : 'Sign In'}</> :
              <><FiUserPlus /> {busy ? 'Creating…' : 'Create Account'}</>}
          </button>
        </form>

        {/* Navigation links */}
        <div className="text-center mt-3 text-sm text-muted">
          {mode === 'login' && <>
            <Link to="/register-student">Join as Member</Link>
            {' · '}
            <Link to="/register-teacher">Register as Guide</Link>
          </>}
          {mode === 'register-teacher' && <>
            Already have an account? <Link to="/login">Sign In</Link>
          </>}
          {mode === 'register-student' && <>
            Already have an account? <Link to="/login">Sign In</Link>
          </>}
        </div>
      </div>
    </div>
  );
}
