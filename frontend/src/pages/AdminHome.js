import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { FiActivity, FiBarChart2, FiBell, FiClipboard, FiGrid, FiTrash2, FiTrendingUp, FiUsers, FiChevronsLeft, FiChevronsRight } from 'react-icons/fi';
import Navbar from '../components/common/Navbar';
import Results from '../components/teacher/Results';
import api from '../services/api';
import { getUser } from '../services/auth';

const initialData = {
  site: { name: 'ProReview', description: '', registration: '' },
  counts: { users: 0, teachers: 0, students: 0, reviews: 0, submissions: 0, announcements: 0 },
  recent_users: [],
  accounts: [],
  registration_trend: [],
};

const formatDate = date => date.toISOString().slice(0, 10);
const today = new Date();
const defaultStart = new Date(today);
defaultStart.setDate(today.getDate() - 13);

function RegistrationChart({ data, role }) {
  const width = 800;
  const height = 300;
  const padding = { top: 18, right: 20, bottom: 38, left: 34 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const metricLabel = role === 'users' ? 'All users' : role[0].toUpperCase() + role.slice(1);
  const values = data.map(item => item[role]);
  const maxValue = Math.max(1, ...values);
  const x = index => padding.left + (data.length > 1 ? index / (data.length - 1) : 0) * chartWidth;
  const y = value => padding.top + chartHeight - (value / maxValue) * chartHeight;
  const points = key => data.map((item, index) => `${x(index)},${y(item[key])}`).join(' ');

  return (
    <div className="line-chart" role="img" aria-label={`${metricLabel} registrations over the selected date range`}>
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        {[0, 0.5, 1].map(ratio => (
          <line key={ratio} x1={padding.left} x2={width - padding.right}
            y1={y(maxValue * ratio)} y2={y(maxValue * ratio)} className="chart-grid-line" />
        ))}
        <text x={padding.left - 8} y={y(maxValue) + 4} textAnchor="end" className="chart-axis-label">{maxValue}</text>
        <text x={padding.left - 8} y={y(0) + 4} textAnchor="end" className="chart-axis-label">0</text>
        <polyline points={points(role)} className={`chart-line chart-line-${role}`} />
        {data.map((item, index) => (
          <text key={item.date} x={x(index)} y={height - 12} textAnchor="middle" className="chart-axis-label">
            {index % 2 === 0 ? item.label : ''}
          </text>
        ))}
      </svg>
      <div className="chart-legend">
        <span><i className={`chart-key ${role}`} />{metricLabel}</span>
        <strong className="chart-total">{values.reduce((total, value) => total + value, 0)} registrations</strong>
      </div>
    </div>
  );
}

export default function AdminHome() {
  const [data, setData] = useState(initialData);
  const [error, setError] = useState('');
  const [page, setPage] = useState('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [startDate, setStartDate] = useState(formatDate(defaultStart));
  const [endDate, setEndDate] = useState(formatDate(today));
  const [role, setRole] = useState('users');
  const [appliedRange, setAppliedRange] = useState({ start: formatDate(defaultStart), end: formatDate(today) });
  const admin = getUser();

  const loadOverview = () => {
    api.get('/admin/overview', { params: { start_date: appliedRange.start, end_date: appliedRange.end } })
      .then(response => setData(response.data))
      .catch(() => setError('Unable to load the administration overview.'));
  };

  useEffect(() => {
    loadOverview();
  }, [appliedRange]); // eslint-disable-line react-hooks/exhaustive-deps

  const removeAccount = async account => {
    if (!window.confirm(`Delete ${account.role} account "${account.name}"? This also removes their reviews and related records.`)) return;
    try {
      await api.delete(`/admin/users/${account.id}`);
      toast.success(`${account.role} account deleted`);
      loadOverview();
    } catch (requestError) {
      toast.error(requestError.response?.data?.error || 'Failed to delete account');
    }
  };

  const applyDateRange = event => {
    event.preventDefault();
    if (startDate > endDate) {
      setError('Start date must be before or equal to end date.');
      return;
    }
    setError('');
    setAppliedRange({ start: startDate, end: endDate });
  };

  const cards = [
    { label: 'Guides', value: data.counts.teachers, color: 'var(--navy)', icon: <FiUsers /> },
    { label: 'Members', value: data.counts.students, color: 'var(--green)', icon: <FiUsers /> },
    { label: 'Total Users', value: data.counts.users, color: '#0284c7', icon: <FiActivity /> },
    { label: 'Reviews', value: data.counts.reviews, color: '#7c3aed', icon: <FiClipboard /> },
    { label: 'Submissions', value: data.counts.submissions, color: '#d97706', icon: <FiBarChart2 /> },
    { label: 'Announcements', value: data.counts.announcements, color: '#be123c', icon: <FiBell /> },
  ];

  const chartData = data.registration_trend.map(item => ({
    ...item,
    label: new Date(`${item.date}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
  }));

  const renderOverview = () => (
    <>
      <div className="stat-grid">
        {cards.map(card => (
          <div key={card.label} className="stat-card" style={{ borderTop: `4px solid ${card.color}` }}>
            <div className="admin-stat-icon" style={{ color: card.color }}>{card.icon}</div>
            <div className="stat-lbl">{card.label}</div>
            <div className="stat-val" style={{ color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      <div className="admin-grid">
        <section className="panel">
          <div className="panel-head"><h2 className="panel-title">Website details</h2></div>
          <dl className="admin-details">
            <div><dt>Platform</dt><dd>{data.site.name}</dd></div>
            <div><dt>Purpose</dt><dd>{data.site.description}</dd></div>
            <div><dt>How users join</dt><dd>{data.site.registration}</dd></div>
            <div><dt>Account types</dt><dd>Administrators, guides, and members</dd></div>
          </dl>
        </section>

        <section className="panel">
          <div className="panel-head"><h2 className="panel-title">User accounts</h2></div>
          <div className="tbl-wrap">
            <table>
              <thead><tr><th>Name</th><th>Role</th><th>Joined</th><th>Action</th></tr></thead>
              <tbody>
                {data.accounts.map(user => (
                  <tr key={user.id}>
                    <td><strong>{user.name}</strong><br /><small className="text-muted">{user.email}</small></td>
                    <td><span className={`badge badge-${user.role === 'teacher' ? 'info' : user.role === 'student' ? 'success' : 'navy'}`}>{user.role === 'teacher' ? 'Guide' : user.role === 'student' ? 'Member' : 'Admin'}</span></td>
                    <td>{new Date(user.created_at).toLocaleDateString()}</td>
                    <td><button className="btn btn-danger btn-sm" onClick={() => removeAccount(user)} title={`Delete ${user.role} account`}><FiTrash2 /> Delete</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  );

  const renderAnalytics = () => (
    <section className="panel analytics-panel">
      <div className="panel-head">
        <div>
          <h2 className="panel-title">Registration trend</h2>
          <p className="panel-caption">New {role === 'users' ? 'user' : role === 'teachers' ? 'guide' : 'member'} accounts created in the selected date range.</p>
        </div>
        <FiTrendingUp className="analytics-heading-icon" />
      </div>
      <form className="analytics-filters" onSubmit={applyDateRange}>
        <div className="form-group">
          <label className="form-label" htmlFor="analytics-role">Show</label>
          <select id="analytics-role" className="form-select" value={role} onChange={event => setRole(event.target.value)}>
            <option value="users">All users</option>
            <option value="teachers">Guides</option>
            <option value="students">Members</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="analytics-start-date">From</label>
          <input id="analytics-start-date" className="form-control" type="date" value={startDate}
            onChange={event => setStartDate(event.target.value)} max={endDate} />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="analytics-end-date">To</label>
          <input id="analytics-end-date" className="form-control" type="date" value={endDate}
            onChange={event => setEndDate(event.target.value)} min={startDate} />
        </div>
        <button className="btn btn-primary analytics-filter-button" type="submit">Update chart</button>
      </form>
      <div className="chart-wrap">
        <RegistrationChart data={chartData} role={role} />
      </div>
      <div className="analytics-note">The chart reflects account creation dates stored by ProReview.</div>
    </section>
  );

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      <div className="layout-wrap dashboard-layout">
        <aside className={`sidebar chat-sidebar${sidebarCollapsed ? ' collapsed' : ''}`}>
          <div className="sidebar-header">
            <div className="sidebar-brand">
              <span className="sidebar-brand-mark">P</span>
              <div className="sidebar-brand-copy">
                <strong>ProReview</strong>
                <small>Admin center</small>
              </div>
            </div>
            <button
              type="button"
              className="sidebar-toggle"
              onClick={() => setSidebarCollapsed(value => !value)}
              aria-label="Toggle sidebar"
            >
              {sidebarCollapsed ? <FiChevronsRight /> : <FiChevronsLeft />}
            </button>
          </div>
          <button className={`sidebar-btn${page === 'overview' ? ' active' : ''}`} onClick={() => setPage('overview')}><span className="sidebar-icon"><FiGrid /></span><span className="sidebar-label">Overview</span></button>
          <button className={`sidebar-btn${page === 'analytics' ? ' active' : ''}`} onClick={() => setPage('analytics')}><span className="sidebar-icon"><FiTrendingUp /></span><span className="sidebar-label">Analytics</span></button>
          <button className={`sidebar-btn${page === 'results' ? ' active' : ''}`} onClick={() => setPage('results')}><span className="sidebar-icon"><FiBarChart2 /></span><span className="sidebar-label">Results</span></button>
        </aside>
        <main className="page-body">
          <div className="workspace-heading">
            <div>
              <div className="workspace-eyebrow">ADMINISTRATION <span>•</span> SITE OVERVIEW</div>
              <h1>Welcome, {admin?.name}</h1>
              <p>Monitor membership and activity across the ProReview platform.</p>
            </div>
            <div className="workspace-date">
              <span>Today</span>
              <strong>{new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</strong>
            </div>
          </div>

          {error && <div className="alert alert-danger">{error}</div>}

          {page === 'overview' && (
            <div className="dashboard-shell">
              {renderOverview()}
            </div>
          )}
          {page === 'analytics' && renderAnalytics()}
          {page === 'results' && <div className="panel"><Results endpoint="/admin/results" /></div>}
        </main>
      </div>
      <footer className="app-footer">© {new Date().getFullYear()} ProReview — Project Review Management System</footer>
    </div>
  );
}