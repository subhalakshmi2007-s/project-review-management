import React, { useState, useEffect, useCallback } from 'react';
import { FiAward } from 'react-icons/fi';
import { toast } from 'react-toastify';
import api from '../../services/api';

export default function MyMarks() {
  const [marks, setMarks] = useState([]);

  const load = useCallback(async () => {
    try { const { data } = await api.get('/marks/mine'); setMarks(data); }
    catch { toast.error('Failed to load marks'); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const total   = marks.reduce((s, m) => s + m.marks_obtained, 0);
  const maxTotal = marks.reduce((s, m) => s + m.total_marks, 0);
  const pct     = maxTotal > 0 ? Math.round((total / maxTotal) * 100) : 0;

  return (
    <>
      <div className="panel-head">
        <h3 className="panel-title"><FiAward style={{ marginRight: 6, color: 'var(--navy)' }} />My Marks</h3>
      </div>

      {marks.length === 0
        ? <div className="alert alert-info">No marks assigned yet. Submit your reviews first.</div>
        : <>
          {/* Summary bar */}
          <div className="panel" style={{ marginBottom: '1rem', background: 'var(--light-navy)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontWeight: 700 }}>Overall Score</span>
              <span style={{ fontWeight: 800, color: 'var(--navy)' }}>{total} / {maxTotal} ({pct}%)</span>
            </div>
            <div className="bar-bg"><div className="bar-fill" style={{ width: `${pct}%` }} /></div>
          </div>

          <div className="tbl-wrap">
            <table>
              <thead>
                <tr><th>Review</th><th>Marks</th><th>Out of</th><th>%</th><th>Feedback</th></tr>
              </thead>
              <tbody>
                {marks.map(m => {
                  const p = Math.round((m.marks_obtained / m.total_marks) * 100);
                  return (
                    <tr key={m.id}>
                      <td>
                        <span className="badge badge-navy" style={{ marginRight: 6 }}>R{m.review_number}</span>
                        {m.review_title}
                      </td>
                      <td><strong style={{ color: p >= 50 ? 'var(--green)' : '#dc2626' }}>{m.marks_obtained}</strong></td>
                      <td>{m.total_marks}</td>
                      <td>
                        <span className={`badge ${p >= 75 ? 'badge-success' : p >= 50 ? 'badge-info' : 'badge-danger'}`}>
                          {p}%
                        </span>
                      </td>
                      <td style={{ fontSize: '.85rem', color: '#475569' }}>{m.feedback || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      }
    </>
  );
}
