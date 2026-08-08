import React, { useState, useEffect, useCallback } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiUser } from 'react-icons/fi';
import { toast } from 'react-toastify';
import api from '../../services/api';

const EMPTY_ADD  = { name: '', email: '', password: '' };

export default function Students({ onRefresh }) {
  const [list,    setList]    = useState([]);
  const [open,    setOpen]    = useState(false);
  const [editing, setEditing] = useState(null);
  const [form,    setForm]    = useState(EMPTY_ADD);
  const [busy,    setBusy]    = useState(false);

  const load = useCallback(async () => {
    try { const { data } = await api.get('/students'); setList(data); onRefresh?.(); }
    catch { toast.error('Failed to load students'); }
  }, [onRefresh]);

  useEffect(() => { load(); }, [load]);

  const openAdd  = ()  => { setEditing(null); setForm(EMPTY_ADD); setOpen(true); };
  const openEdit = (s) => { setEditing(s); setForm({ name: s.name, email: s.email }); setOpen(true); };
  const close    = ()  => { setOpen(false); setEditing(null); setForm(EMPTY_ADD); };
  const set = (k, v)   => setForm(f => ({ ...f, [k]: v }));

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (editing) {
        await api.put(`/students/${editing.id}`, form);
        toast.success('Student updated');
      } else {
        await api.post('/students', form);
        toast.success('Student added');
      }
      close(); load();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setBusy(false); }
  };

  const remove = async (s) => {
    if (!window.confirm(`Delete student "${s.name}"?`)) return;
    try { await api.delete(`/students/${s.id}`); toast.success('Deleted'); load(); }
    catch { toast.error('Failed to delete'); }
  };

  return (
    <>
      <div className="panel-head">
        <h3 className="panel-title"><FiUser style={{ marginRight: 6, color: 'var(--navy)' }} />Students</h3>
        <button className="btn btn-primary" onClick={openAdd}><FiPlus /> Add Student</button>
      </div>

      <div className="tbl-wrap">
        <table>
          <thead><tr><th>#</th><th>Name</th><th>Email</th><th>Joined</th><th>Actions</th></tr></thead>
          <tbody>
            {list.length === 0
              ? <tr><td colSpan={5} className="text-center text-muted" style={{ padding: '2rem' }}>No students yet. Add your first student.</td></tr>
              : list.map((s, i) => (
                <tr key={s.id}>
                  <td>{i + 1}</td>
                  <td><strong>{s.name}</strong></td>
                  <td>{s.email}</td>
                  <td>{new Date(s.created_at).toLocaleDateString()}</td>
                  <td>
                    <button className="btn btn-info btn-sm" style={{ marginRight: 5 }} onClick={() => openEdit(s)}><FiEdit2 /></button>
                    <button className="btn btn-danger btn-sm" onClick={() => remove(s)}><FiTrash2 /></button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="overlay" onClick={close}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-hd">
              <h4>{editing ? 'Edit Student' : 'Add Student'}</h4>
              <button className="modal-close" onClick={close}>×</button>
            </div>
            <form onSubmit={save}>
              <div className="modal-bd">
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input className="form-control" type="text" placeholder="Student's full name"
                    value={form.name} onChange={e => set('name', e.target.value)} required autoFocus />
                </div>
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input className="form-control" type="email" placeholder="student@example.com"
                    value={form.email} onChange={e => set('email', e.target.value)} required />
                </div>
                {/* Password only shown when ADDING a new student */}
                {!editing && (
                  <div className="form-group">
                    <label className="form-label">Password <span className="text-muted text-sm">(min 6 characters)</span></label>
                    <input className="form-control" type="password"
                      placeholder="Set login password"
                      value={form.password || ''}
                      onChange={e => set('password', e.target.value)}
                      required />
                  </div>
                )}
              </div>
              <div className="modal-ft">
                <button type="button" className="btn btn-secondary" onClick={close}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={busy}>
                  {busy ? 'Saving…' : editing ? 'Update' : 'Add Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
