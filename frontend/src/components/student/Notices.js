import React, { useState, useEffect, useCallback } from 'react';
import { FiBell } from 'react-icons/fi';
import { toast } from 'react-toastify';
import api from '../../services/api';

export default function Notices() {
  const [list, setList] = useState([]);

  const load = useCallback(async () => {
    try { const { data } = await api.get('/announcements'); setList(data); }
    catch { toast.error('Failed to load announcements'); }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <>
      <div className="panel-head">
        <h3 className="panel-title"><FiBell style={{ marginRight: 6, color: 'var(--navy)' }} />Announcements</h3>
      </div>

      {list.length === 0
        ? <div className="alert alert-info">No announcements from your teacher yet.</div>
        : list.map(a => (
          <div key={a.id} className="ann-card">
            <h5>{a.title}</h5>
            <p>{a.content}</p>
            <span className="ann-meta">
              Posted by {a.teacher_name} · {new Date(a.created_at).toLocaleString()}
            </span>
          </div>
        ))
      }
    </>
  );
}
