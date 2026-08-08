import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiClipboard, FiEye, FiDownload, FiSearch, FiX } from 'react-icons/fi';
import { toast } from 'react-toastify';
import api from '../../services/api';

const EMPTY = { title: '', description: '', review_number: '1', total_marks: '', deadline: '', student_id: '' };

const STATUS_BADGE = {
  marked:    <span className="badge badge-success">Marked</span>,
  submitted: <span className="badge badge-info">Submitted</span>,
  overdue:   <span className="badge badge-danger">Overdue</span>,
  pending:   <span className="badge badge-warning">Pending</span>,
};

export default function Reviews() {
  const [reviews,       setReviews]       = useState([]);
  const [students,      setStudents]      = useState([]);
  const [open,          setOpen]          = useState(false);
  const [editing,       setEditing]       = useState(null);
  const [form,          setForm]          = useState(EMPTY);
  const [busy,          setBusy]          = useState(false);
  const [subView,       setSubView]       = useState(null);

  // ── Filter state ──────────────────────────────────────────────────────────
  const [searchText,    setSearchText]    = useState('');
  const [filterStatus,  setFilterStatus]  = useState('');   // '', 'pending', 'submitted', 'marked', 'overdue'
  const [filterStudent, setFilterStudent] = useState('');   // student id or ''

  const load = useCallback(async () => {
    try {
      const [rv, sv] = await Promise.all([api.get('/reviews'), api.get('/students')]);
      setReviews(rv.data);
      setStudents(sv.data);
    } catch { toast.error('Failed to load'); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Filtered list (client-side) ───────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return reviews.filter(r => {
      const matchText =
        !q ||
        r.student_name.toLowerCase().includes(q) ||
        r.title.toLowerCase().includes(q);
      const matchStatus  = !filterStatus  || r.status === filterStatus;
      const matchStudent = !filterStudent || String(r.student_id) === filterStudent;
      return matchText && matchStatus && matchStudent;
    });
  }, [reviews, searchText, filterStatus, filterStudent]);

  const clearFilters = () => {
    setSearchText('');
    setFilterStatus('');
    setFilterStudent('');
  };

  const isFiltering = searchText || filterStatus || filterStudent;

  // ── Modal helpers ─────────────────────────────────────────────────────────
  const openAdd  = () => { setEditing(null); setForm(EMPTY); setOpen(true); };
  const openEdit = (r) => {
    setEditing(r);
    setForm({
      title: r.title, description: r.description,
      review_number: r.review_number, total_marks: r.total_marks,
      deadline: r.deadline.slice(0, 16), student_id: r.student_id,
    });
    setOpen(true);
  };
  const close = () => { setOpen(false); setEditing(null); setForm(EMPTY); };
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const save = async (e) => {
    e.preventDefault(); setBusy(true);
    try {
      if (editing) { await api.put(`/reviews/${editing.id}`, form); toast.success('Review updated'); }
      else          { await api.post('/reviews', form);              toast.success('Review created'); }
      close(); load();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setBusy(false); }
  };

  const remove = async (r) => {
    if (!window.confirm(`Delete review "${r.title}"?`)) return;
    try { await api.delete(`/reviews/${r.id}`); toast.success('Deleted'); load(); }
    catch { toast.error('Failed to delete'); }
  };

  const viewSub = async (r) => {
    try { const { data } = await api.get(`/reviews/${r.id}/submission`); setSubView(data); }
    catch (err) {
      if (err.response?.status === 404) toast.info('No submission yet for this review');
      else toast.error('Failed to load submission');
    }
  };

  return (
    <>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="panel-head">
        <h3 className="panel-title">
          <FiClipboard style={{ marginRight: 6, color: 'var(--navy)' }} />
          Reviews
          {filtered.length !== reviews.length && (
            <span className="badge badge-navy" style={{ marginLeft: 8, fontSize: '.75rem' }}>
              {filtered.length} / {reviews.length}
            </span>
          )}
        </h3>
        <button className="btn btn-primary" onClick={openAdd} disabled={students.length === 0}>
          <FiPlus /> Create Review
        </button>
      </div>

      {students.length === 0 && (
        <div className="alert alert-warn">Add students first before creating reviews.</div>
      )}

      {/* ── Filter bar ──────────────────────────────────────────────────── */}
      {reviews.length > 0 && (
        <div style={{
          display: 'flex', gap: '.75rem', flexWrap: 'wrap',
          alignItems: 'center', marginBottom: '1rem',
          background: 'var(--light-navy)', borderRadius: 10,
          padding: '.75rem 1rem',
        }}>
          {/* Search by student name or title */}
          <div style={{ position: 'relative', flex: '1 1 200px', minWidth: 180 }}>
            <FiSearch style={{
              position: 'absolute', left: 10, top: '50%',
              transform: 'translateY(-50%)', color: '#64748b', fontSize: '.9rem',
            }} />
            <input
              className="form-control"
              style={{ paddingLeft: 32, height: 38 }}
              type="text"
              placeholder="Search by student or title…"
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
            />
          </div>

          {/* Filter by student dropdown */}
          <select
            className="form-select"
            style={{ flex: '1 1 160px', minWidth: 150, height: 38 }}
            value={filterStudent}
            onChange={e => setFilterStudent(e.target.value)}
          >
            <option value="">All Students</option>
            {students.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>

          {/* Filter by status */}
          <select
            className="form-select"
            style={{ flex: '1 1 130px', minWidth: 120, height: 38 }}
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="submitted">Submitted</option>
            <option value="marked">Marked</option>
            <option value="overdue">Overdue</option>
          </select>

          {/* Clear filters button — only shown when active */}
          {isFiltering && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={clearFilters}
              title="Clear all filters"
              style={{ height: 38, whiteSpace: 'nowrap' }}
            >
              <FiX /> Clear
            </button>
          )}
        </div>
      )}

      {/* ── Table ───────────────────────────────────────────────────────── */}
      <div className="tbl-wrap">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Title</th>
              <th>Assigned To</th>
              <th>Marks</th>
              <th>Deadline</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center text-muted" style={{ padding: '2rem' }}>
                  {isFiltering
                    ? <>No reviews match your filter. <button className="btn btn-secondary btn-sm" onClick={clearFilters} style={{ marginLeft: 8 }}><FiX /> Clear filters</button></>
                    : 'No reviews yet.'}
                </td>
              </tr>
            ) : filtered.map((r, i) => (
              <tr key={r.id}>
                <td><span className="badge badge-navy">R{r.review_number}</span></td>
                <td><strong>{r.title}</strong></td>
                <td>
                  <span style={{
                    background: 'var(--light-navy)', color: 'var(--navy)',
                    borderRadius: 20, padding: '2px 10px', fontSize: '.8rem', fontWeight: 600,
                  }}>
                    {r.student_name}
                  </span>
                </td>
                <td>{r.total_marks}</td>
                <td style={{ whiteSpace: 'nowrap', fontSize: '.82rem' }}>
                  {new Date(r.deadline).toLocaleString()}
                </td>
                <td>{STATUS_BADGE[r.status] || r.status}</td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  {r.submitted && (
                    <button className="btn btn-info btn-sm" style={{ marginRight: 4 }}
                      title="View submission" onClick={() => viewSub(r)}>
                      <FiEye />
                    </button>
                  )}
                  <button className="btn btn-warning btn-sm" style={{ marginRight: 4 }}
                    title="Edit" onClick={() => openEdit(r)}>
                    <FiEdit2 />
                  </button>
                  <button className="btn btn-danger btn-sm"
                    title="Delete" onClick={() => remove(r)}>
                    <FiTrash2 />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Create / Edit modal ──────────────────────────────────────────── */}
      {open && (
        <div className="overlay" onClick={close}>
          <div className="modal-box lg" onClick={e => e.stopPropagation()}>
            <div className="modal-hd">
              <h4>{editing ? 'Edit Review' : 'Create Review'}</h4>
              <button className="modal-close" onClick={close}>×</button>
            </div>
            <form onSubmit={save}>
              <div className="modal-bd">
                <div className="form-group">
                  <label className="form-label">Review Title</label>
                  <input className="form-control" type="text" placeholder="e.g. Phase 1 Review"
                    value={form.title} onChange={e => set('title', e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">
                    Task Instructions <span className="text-muted text-sm">(what student must do)</span>
                  </label>
                  <textarea className="form-control" rows={4}
                    placeholder="Describe what the student should complete and submit…"
                    value={form.description} onChange={e => set('description', e.target.value)} required />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Review Number</label>
                    <input className="form-control" type="number" min="1"
                      value={form.review_number} onChange={e => set('review_number', e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Total Marks</label>
                    <input className="form-control" type="number" min="1" step="0.5" placeholder="e.g. 100"
                      value={form.total_marks} onChange={e => set('total_marks', e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Deadline</label>
                    <input className="form-control" type="datetime-local"
                      value={form.deadline} onChange={e => set('deadline', e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Assign to Student</label>
                    <select className="form-select" value={form.student_id}
                      onChange={e => set('student_id', e.target.value)} required disabled={!!editing}>
                      <option value="">Select student…</option>
                      {students.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                    {editing && (
                      <p className="text-muted text-sm mt-1">Student cannot be changed after creation.</p>
                    )}
                  </div>
                </div>
              </div>
              <div className="modal-ft">
                <button type="button" className="btn btn-secondary" onClick={close}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={busy}>
                  {busy ? 'Saving…' : editing ? 'Update' : 'Create Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Submission viewer ────────────────────────────────────────────── */}
      {subView && (
        <div className="overlay" onClick={() => setSubView(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-hd">
              <h4>Submission — {subView.student_name}</h4>
              <button className="modal-close" onClick={() => setSubView(null)}>×</button>
            </div>
            <div className="modal-bd">
              <p><strong>Task Note:</strong></p>
              <p style={{ color: '#475569', fontSize: '.9rem', lineHeight: 1.6 }}>
                {subView.task_note || <em>No task note provided</em>}
              </p>
              <p className="text-muted text-sm">
                Submitted: {new Date(subView.submitted_at).toLocaleString()}
              </p>
              <a className="btn btn-info mt-2"
                href={`http://localhost:5000/api/reviews/uploads/${subView.pdf_file}`}
                target="_blank" rel="noreferrer">
                <FiDownload /> View PDF
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
