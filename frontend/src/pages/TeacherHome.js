import React, { useState, useEffect } from 'react';
import { FiGrid, FiUsers, FiClipboard, FiBell, FiAward, FiKey } from 'react-icons/fi';
import Navbar       from '../components/common/Navbar';
import Students     from '../components/teacher/Students';
import Reviews      from '../components/teacher/Reviews';
import Announcements from '../components/teacher/Announcements';
import Marks        from '../components/teacher/Marks';
import JoinCode     from '../components/teacher/JoinCode';
import api          from '../services/api';
import { getUser }  from '../services/auth';

const TABS = [
  { key: 'overview',       label: 'Overview',       icon: <FiGrid /> },
  { key: 'students',       label: 'Students',        icon: <FiUsers /> },
  { key: 'reviews',        label: 'Reviews',         icon: <FiClipboard /> },
  { key: 'announcements',  label: 'Announcements',   icon: <FiBell /> },
  { key: 'marks',          label: 'Marks',           icon: <FiAward /> },
  { key: 'joincode',       label: 'Join Code',       icon: <FiKey /> },
];

export default function TeacherHome() {
  const [tab,   setTab]   = useState('overview');
  const [stats, setStats] = useState({ students: 0, reviews: 0, submitted: 0, announcements: 0 });
  const teacher = getUser();

  const fetchStats = async () => {
    try {
      const [sv, rv, av] = await Promise.all([
        api.get('/students'), api.get('/reviews'), api.get('/announcements'),
      ]);
      setStats({
        students:      sv.data.length,
        reviews:       rv.data.length,
        submitted:     rv.data.filter(r => r.submitted).length,
        announcements: av.data.length,
      });
    } catch (_) {}
  };

  useEffect(() => { fetchStats(); }, []);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      <div className="layout-wrap">
        {/* Sidebar */}
        <aside className="sidebar">
          {TABS.map(t => (
            <button key={t.key}
              className={`sidebar-btn${tab === t.key ? ' active' : ''}`}
              onClick={() => setTab(t.key)}>
              {t.icon} {t.label}
            </button>
          ))}
        </aside>

        {/* Main */}
        <main className="page-body">
          {tab === 'overview' && (
            <>
              <h2 style={{ fontWeight: 800, marginBottom: '1.2rem' }}>
                Welcome, {teacher?.name} 👋
              </h2>

              <div className="stat-grid">
                {[
                  { label: 'Students',     value: stats.students,      color: 'var(--navy)',  tab: 'students' },
                  { label: 'Reviews',      value: stats.reviews,       color: '#0284c7',      tab: 'reviews' },
                  { label: 'Submissions',  value: stats.submitted,     color: 'var(--green)', tab: 'marks' },
                  { label: 'Announcements',value: stats.announcements, color: '#d97706',      tab: 'announcements' },
                ].map(c => (
                  <div key={c.label} className="stat-card" style={{ borderTop: `4px solid ${c.color}` }}
                    onClick={() => setTab(c.tab)}>
                    <div className="stat-lbl">{c.label}</div>
                    <div className="stat-val" style={{ color: c.color }}>{c.value}</div>
                    <div className="stat-sub">Click to manage →</div>
                  </div>
                ))}
              </div>

              <div className="panel">
                <h5 style={{ fontWeight: 700, marginBottom: 8 }}>Quick Guide</h5>
                <ol style={{ paddingLeft: '1.2rem', margin: 0, lineHeight: 2.1, color: '#475569', fontSize: '.9rem' }}>
                  <li>Go to <strong>Join Code</strong> — share your code with students so they can register.</li>
                  <li>Go to <strong>Students</strong> — or let students self-register using your join code.</li>
                  <li>Go to <strong>Reviews</strong> — create reviews for individual students with marks &amp; deadlines.</li>
                  <li>Go to <strong>Announcements</strong> — post notices visible to all your students.</li>
                  <li>Go to <strong>Marks</strong> — once students submit, assign marks and feedback.</li>
                </ol>
              </div>
            </>
          )}

          {tab === 'students'      && <div className="panel"><Students onRefresh={fetchStats} /></div>}
          {tab === 'reviews'       && <div className="panel"><Reviews /></div>}
          {tab === 'announcements' && <div className="panel"><Announcements /></div>}
          {tab === 'marks'         && <div className="panel"><Marks /></div>}
          {tab === 'joincode'      && <div className="panel"><JoinCode /></div>}
        </main>
      </div>

      <footer className="app-footer">
        © {new Date().getFullYear()} ProReview — Project Review Management System
      </footer>
    </div>
  );
}
