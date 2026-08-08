import React, { useState, useEffect } from 'react';
import { FiGrid, FiClipboard, FiAward, FiBell } from 'react-icons/fi';
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
  const [tab,   setTab]   = useState('overview');
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

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      <div className="layout-wrap">
        <aside className="sidebar">
          {TABS.map(t => (
            <button key={t.key}
              className={`sidebar-btn${tab === t.key ? ' active' : ''}`}
              onClick={() => setTab(t.key)}>
              {t.icon} {t.label}
            </button>
          ))}
        </aside>

        <main className="page-body">
          {tab === 'overview' && (
            <>
              <h2 style={{ fontWeight: 800, marginBottom: '1.2rem' }}>
                Hello, {student?.name} 👋
              </h2>

              <div className="stat-grid">
                {[
                  { label: 'Reviews Assigned', value: stats.total,         color: 'var(--navy)', tab: 'reviews' },
                  { label: 'Submitted',         value: stats.submitted,     color: 'var(--green)', tab: 'reviews' },
                  { label: 'Marks Received',    value: stats.marked,        color: '#0284c7',     tab: 'marks' },
                  { label: 'Announcements',     value: stats.announcements, color: '#d97706',     tab: 'announcements' },
                ].map(c => (
                  <div key={c.label} className="stat-card" style={{ borderTop: `4px solid ${c.color}` }}
                    onClick={() => setTab(c.tab)}>
                    <div className="stat-lbl">{c.label}</div>
                    <div className="stat-val" style={{ color: c.color }}>{c.value}</div>
                    <div className="stat-sub">Click to view →</div>
                  </div>
                ))}
              </div>

              <div className="panel">
                <h5 style={{ fontWeight: 700, marginBottom: 8 }}>How it works</h5>
                <ol style={{ paddingLeft: '1.2rem', margin: 0, lineHeight: 2.1, color: '#475569', fontSize: '.9rem' }}>
                  <li>Your teacher assigns reviews to you with task instructions and a deadline.</li>
                  <li>Go to <strong>My Reviews</strong> — read the task and upload your PDF along with a task note.</li>
                  <li>After your teacher grades it, go to <strong>My Marks</strong> to see your score and feedback.</li>
                  <li>Check <strong>Announcements</strong> for general notices from your teacher.</li>
                </ol>
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
