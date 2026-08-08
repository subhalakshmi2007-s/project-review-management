import React, { useState, useEffect, useCallback } from 'react';
import { FiAward, FiCheckSquare } from 'react-icons/fi';
import { toast } from 'react-toastify';
import api from '../../services/api';

export default function Marks() {
  const [rows,    setRows]    = useState([]);
  const [open,    setOpen]    = useState(false);
  const [active,  setActive]  = useState(null);   // review row being marked
  const [form,    setForm]    = useState({ marks_obtained: '', feedback: '' });
  const [busy,    setBusy]    = useState(false);

  const load = useCallback(async () => {
    try { const { data } = await api.get('/marks/summary'); setRows(data); }
    catch { toast.error('Failed to load marks summary'); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openMark = (row) => {
    setActive(row);
    setForm({ marks_obtained: row.marks_obtained ?? '', feedback: row.feedback ?? '' });
    setOpen(true);
  };
  const close = () => { setOpen(false); setActive(null); };

  const save = async (e) => {
    e.preventDefault(); setBusy(true);
    try {
      await api.post(`/marks/${active.id}`, {
        marks_obtained: parseFloat(form.marks_obtained),
        feedback: form.feedback,
      });
      toast.success(active.marks_obtained !== null ? 'Marks updated' : 'Marks assigned');
      close(); load();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setBusy(false); }
  };

  const pct = (row) => row.marks_obtained !== null
    ? Math.round((row.marks_obtained / row.total_marks) * 100) : null;

  return (
    <>
      <div className="panel-head">
        <h3 className="panel-title"><FiAward style={{ marginRight: 6, color: 'var(--navy)' }} />Marks</h3>
      </div>

      <div className="tbl-wrap">
        <table>
          <thead>
            <tr><th>Review</th><th>Student</th><th>Total</th><th>Obtained</th><th>Progress</th><th>Status</th><th>Action</th></tr>
          </thead>
          <tbody>
            {rows.length === 0
              ? <tr><td colSpan={7} className="text-center text-muted" style={{ padding: '2rem' }}>No reviews yet.</td></tr>
              : rows.map(r => {
                const p = pct(r);
                return (
                  <tr key={r.id}>
                    <td><span className="badge badge-navy">R{r.review_number}</span> {r.title}</td>
                    <td>{r.student_name}</td>
                    <td>{r.total_marks}</td>
                    <td><strong>{r.marks_obtained !== null ? r.marks_obtained : '—'}</strong></td>
                    <td style={{ minWidth: 120 }}>
                      {p !== null && <>
                        <span className="text-sm text-muted">{p}%</span>
                        <div className="bar-bg"><div className="bar-fill" style={{ width: `${p}%` }} /></div>
                      </>}
                    </td>
                    <td>
                      {r.status === 'marked'    && <span className="badge badge-success">Marked</span>}
                      {r.status === 'submitted' && <span className="badge badge-info">Submitted</span>}
                      {r.status === 'overdue'   && <span className="badge badge-danger">Overdue</span>}
                      {r.status === 'pending'   && <span className="badge badge-warning">Pending</span>}
                    </td>
                    <td>
                      {r.submitted && (
                        <button className="btn btn-success btn-sm" onClick={() => openMark(r)}>
                          <FiCheckSquare /> {r.marks_obtained !== null ? 'Edit' : 'Mark'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {open && active && (
        <div className="overlay" onClick={close}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-hd">
              <h4>Assign Marks — {active.student_name}</h4>
              <button className="modal-close" onClick={close}>×</button>
            </div>
            <form onSubmit={save}>
              <div className="modal-bd">
                <div className="alert alert-info">
                  <strong>{active.title}</strong> · Total marks: {active.total_marks}
                </div>
                <div className="form-group">
                  <label className="form-label">Marks Obtained <span className="text-muted text-sm">(max {active.total_marks})</span></label>
                  <input className="form-control" type="number" min="0" max={active.total_marks} step="0.5"
                    value={form.marks_obtained} onChange={e => setForm(f => ({ ...f, marks_obtained: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Feedback <span className="text-muted text-sm">(optional)</span></label>
                  <textarea className="form-control" rows={3} placeholder="Comments for the student…"
                    value={form.feedback} onChange={e => setForm(f => ({ ...f, feedback: e.target.value }))} />
                </div>
              </div>
              <div className="modal-ft">
                <button type="button" className="btn btn-secondary" onClick={close}>Cancel</button>
                <button type="submit" className="btn btn-success" disabled={busy}>{busy ? 'Saving…' : 'Save Marks'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
