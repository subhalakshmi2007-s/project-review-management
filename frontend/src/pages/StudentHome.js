import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FiGrid, FiClipboard, FiAward, FiBell, FiChevronsLeft, FiChevronsRight } from 'react-icons/fi';
import Navbar     from '../components/common/Navbar';
import MyReviews  from '../components/student/MyReviews';
import MyMarks    from '../components/student/MyMarks';
import Notices    from '../components/student/Notices';
import api        from '../services/api';
import { getUser } from '../services/auth';

const TABS = [
  { key: 'overview',       label: 'Overview',       icon: <FiGrid /> },
  { key: 'reviews',        label: 'My Reviews',      icon: <FiClipboard /> },
  { key: 'marks',          label: 'My Marks',        icon: <FiAward /> },
  { key: 'announcements',  label: 'Announcements',   icon: <FiBell /> },
];

export default function StudentHome() {
  const [searchParams] = useSearchParams();
  const [tab,   setTab]   = useState(() => searchParams.get('tab') || 'overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [stats, setStats] = useState({ total: 0, submitted: 0, marked: 0, announcements: 0 });
  const student = getUser();

  useEffect(() => {
    (async () => {
      try {
        const [rv, av, mv] = await Promise.all([
          api.get('/reviews/mine'),
          api.get('/announcements'),
          api.get('/marks/mine'),
        ]);
        setStats({
          total:         rv.data.length,
          submitted:     rv.data.filter(r => r.submitted).length,
          marked:        mv.data.length,
          announcements: av.data.length,
        });
      } catch (_) {}
    })();
  }, []);
  useEffect(() => {
    const requestedTab = searchParams.get('tab');
    if (TABS.some(item => item.key === requestedTab)) setTab(requestedTab);
  }, [searchParams]);

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
                <small>Member view</small>
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
          {TABS.map(t => (
            <button key={t.key}
              className={`sidebar-btn${tab === t.key ? ' active' : ''}`}
              onClick={() => setTab(t.key)}>
              <span className="sidebar-icon">{t.icon}</span>
              <span className="sidebar-label">{t.label}</span>
            </button>
          ))}
        </aside>

        <main className="page-body">
          {tab === 'overview' && (
            <>
              <div className="dashboard-shell">
                <div className="dashboard-banner">
                  <div className="dashboard-banner-copy">
                    <div className="workspace-eyebrow">MEMBER WORKSPACE <span>•</span> OVERVIEW</div>
                    <h1>Hello, {student?.name}</h1>
                    <p>Stay on top of your assigned reviews, feedback, and progress.</p>
                  </div>
                  <div className="workspace-date">
                    <span>Today</span>
                    <strong>{new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</strong>
                  </div>
                </div>

                <div className="stat-grid">
                  {[
                    { label: 'Reviews Assigned', value: stats.total,         color: 'var(--navy)', tab: 'reviews' },
                    { label: 'Submitted',         value: stats.submitted,     color: 'var(--green)', tab: 'reviews' },
                    { label: 'Marks Received',    value: stats.marked,        color: '#0284c7',     tab: 'marks' },
                    { label: 'Announcements',     value: stats.announcements, color: '#d97706',     tab: 'announcements' },
                  ].map(c => (
                    <div key={c.label} className="stat-card dashboard-card" style={{ borderTop: `4px solid ${c.color}` }}
                      onClick={() => setTab(c.tab)}>
                      <div className="stat-lbl">{c.label}</div>
                      <div className="stat-val" style={{ color: c.color }}>{c.value}</div>
                      <div className="stat-sub">Click to view →</div>
                    </div>
                  ))}
                </div>

                <div className="overview-grid">
                  <section className="panel overview-main-panel">
                    <div className="panel-head">
                      <h2 className="panel-title">How it works</h2>
                    </div>
                    <ol className="quick-list">
                      <li>Your guide assigns reviews to you with task instructions and a deadline.</li>
                      <li>Go to <strong>My Reviews</strong> — read the task and upload your PDF along with a task note.</li>
                      <li>After your guide grades it, go to <strong>My Marks</strong> to see your score and feedback.</li>
                      <li>Check <strong>Announcements</strong> for general notices from your guide.</li>
                    </ol>
                  </section>

                  <aside className="panel overview-side-panel">
                    <div className="panel-head">
                      <h2 className="panel-title">Progress status</h2>
                    </div>
                    <div className="metric-block">
                      <span>Submission progress</span>
                      <strong>{stats.total ? Math.round((stats.submitted / Math.max(stats.total, 1)) * 100) : 0}%</strong>
                      <small>{stats.submitted} of {stats.total} review tasks completed</small>
                    </div>
                    <div className="metric-block muted">
                      <span>Marks received</span>
                      <strong>{stats.marked}</strong>
                      <small>Feedback items available</small>
                    </div>
                    <div className="metric-block muted">
                      <span>Announcements</span>
                      <strong>{stats.announcements}</strong>
                      <small>New updates from your guide</small>
                    </div>
                  </aside>
                </div>
              </div>
            </>
          )}

          {tab === 'reviews'       && <div className="panel"><MyReviews /></div>}
          {tab === 'marks'         && <div className="panel"><MyMarks /></div>}
          {tab === 'announcements' && <div className="panel"><Notices /></div>}
        </main>
      </div>

      <footer className="app-footer">
        © {new Date().getFullYear()} ProReview — Project Review Management System
      </footer>
    </div>
  );
}
