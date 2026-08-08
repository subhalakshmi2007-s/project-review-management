import React, { useState, useEffect, useCallback } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiBell } from 'react-icons/fi';
import { toast } from 'react-toastify';
import api from '../../services/api';

const EMPTY = { title: '', content: '' };

export default function Announcements() {
  const [list,    setList]    = useState([]);
  const [open,    setOpen]    = useState(false);
  const [editing, setEditing] = useState(null);
  const [form,    setForm]    = useState(EMPTY);
  const [busy,    setBusy]    = useState(false);

  const load = useCallback(async () => {
    try { const { data } = await api.get('/announcements'); setList(data); }
    catch { toast.error('Failed to load announcements'); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd  = () => { setEditing(null); setForm(EMPTY); setOpen(true); };
  const openEdit = (a) => { setEditing(a); setForm({ title: a.title, content: a.content }); setOpen(true); };
  const close    = () => { setOpen(false); setEditing(null); setForm(EMPTY); };
  const set = (k, v)  => setForm(f => ({ ...f, [k]: v }));

  const save = async (e) => {
    e.preventDefault(); setBusy(true);
    try {
      if (editing) { await api.put(`/announcements/${editing.id}`, form); toast.success('Updated'); }
      else          { await api.post('/announcements', form);              toast.success('Posted'); }
      close(); load();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setBusy(false); }
  };

  const remove = async (a) => {
    if (!window.confirm(`Delete "${a.title}"?`)) return;
    try { await api.delete(`/announcements/${a.id}`); toast.success('Deleted'); load(); }
    catch { toast.error('Failed'); }
  };

  return (
    <>
      <div className="panel-head">
        <h3 className="panel-title"><FiBell style={{ marginRight: 6, color: 'var(--navy)' }} />Announcements</h3>
        <button className="btn btn-primary" onClick={openAdd}><FiPlus /> New Announcement</button>
      </div>

      {list.length === 0
        ? <div className="alert alert-info">No announcements yet. Post one to notify all your students.</div>
        : list.map(a => (
          <div key={a.id} className="ann-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <h5>{a.title}</h5>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <button className="btn btn-warning btn-sm" onClick={() => openEdit(a)}><FiEdit2 /></button>
                <button className="btn btn-danger  btn-sm" onClick={() => remove(a)}><FiTrash2 /></button>
              </div>
            </div>
            <p>{a.content}</p>
            <span className="ann-meta">Posted by {a.teacher_name} · {new Date(a.created_at).toLocaleString()}</span>
          </div>
        ))
      }

      {open && (
        <div className="overlay" onClick={close}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-hd">
              <h4>{editing ? 'Edit Announcement' : 'New Announcement'}</h4>
              <button className="modal-close" onClick={close}>×</button>
            </div>
            <form onSubmit={save}>
              <div className="modal-bd">
                <div className="form-group">
                  <label className="form-label">Title</label>
                  <input className="form-control" type="text" placeholder="Announcement title"
                    value={form.title} onChange={e => set('title', e.target.value)} required autoFocus />
                </div>
                <div className="form-group">
                  <label className="form-label">Message</label>
                  <textarea className="form-control" rows={5} placeholder="Type your message to students…"
                    value={form.content} onChange={e => set('content', e.target.value)} required />
                </div>
              </div>
              <div className="modal-ft">
                <button type="button" className="btn btn-secondary" onClick={close}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : editing ? 'Update' : 'Post'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
