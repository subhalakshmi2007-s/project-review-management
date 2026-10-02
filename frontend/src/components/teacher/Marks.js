import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { FiAward, FiCheckSquare, FiSearch, FiX } from 'react-icons/fi';
import { toast } from 'react-toastify';
import api from '../../services/api';

export default function Marks() {
  const [rows,       setRows]       = useState([]);
  const [open,       setOpen]       = useState(false);
  const [active,     setActive]     = useState(null);   // review row being marked
  const [form,       setForm]       = useState({ total_marks: '', marks_obtained: '', feedback: '' });
  const [busy,       setBusy]       = useState(false);
  const [searchText, setSearchText] = useState('');
  const [markFilter, setMarkFilter] = useState('all');
  const [markValue,  setMarkValue]  = useState('');

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/marks/summary');
      setRows(data);
    }
    catch { toast.error('Failed to load marks summary'); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filteredRows = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    const threshold = Number(markValue);

    return rows.filter((r) => {
      const matchSearch =
        !q ||
        (r.student_name || '').toLowerCase().includes(q) ||
        (r.title || '').toLowerCase().includes(q);

      if (!matchSearch) return false;

      if (markFilter === 'all' || markValue === '' || Number.isNaN(threshold)) {
        return true;
      }

      if (r.marks_obtained === null || r.marks_obtained === undefined) return false;
      const obtained = Number(r.marks_obtained);
      if (markFilter === 'less') return obtained < threshold;
      if (markFilter === 'greater') return obtained > threshold;
      return true;
    });
  }, [rows, searchText, markFilter, markValue]);

  const clearFilters = () => {
    setSearchText('');
    setMarkFilter('all');
    setMarkValue('');
  };

  const isFiltering = searchText || markFilter !== 'all' || markValue !== '';

  const formatMarks = (value) => {
    if (value === null || value === undefined || value === '' || Number(value) <= 0 || Number.isNaN(Number(value))) {
      return '—';
    }
    return value;
  };

  const openMark = (row) => {
    setActive(row);
    setForm({
      total_marks: row.total_marks ?? '',
      marks_obtained: row.marks_obtained ?? '',
      feedback: row.feedback ?? '',
    });
    setOpen(true);
  };
  const close = () => { setOpen(false); setActive(null); };

  const save = async (e) => {
    e.preventDefault(); setBusy(true);
    try {
      const totalMarks = parseFloat(form.total_marks);
      const obtained = parseFloat(form.marks_obtained);

      if (form.total_marks === '' || Number.isNaN(totalMarks) || totalMarks <= 0) {
        toast.error('Total marks are required and must be greater than 0');
        setBusy(false);
        return;
      }

      if (form.marks_obtained === '' || Number.isNaN(obtained) || obtained < 0 || obtained > totalMarks) {
        toast.error(`Obtained marks must be between 0 and ${totalMarks}`);
        setBusy(false);
        return;
      }

      await api.post(`/marks/${active.id}`, {
        total_marks: totalMarks,
        marks_obtained: obtained,
        feedback: form.feedback,
      });
      toast.success(active.marks_obtained !== null ? 'Marks updated' : 'Marks assigned');
      close(); load();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setBusy(false); }
  };

  return (
    <>
      <div className="panel-head">
        <h3 className="panel-title"><FiAward style={{ marginRight: 6, color: 'var(--navy)' }} />Review</h3>
      </div>

      {rows.length > 0 && (
        <div style={{
          display: 'flex', gap: '.75rem', flexWrap: 'wrap',
          alignItems: 'center', marginBottom: '1rem',
          background: 'var(--light-navy)', borderRadius: 10,
          padding: '.75rem 1rem',
        }}>
          <div style={{ position: 'relative', flex: '1 1 220px', minWidth: 180 }}>
            <FiSearch style={{
              position: 'absolute', left: 10, top: '50%',
              transform: 'translateY(-50%)', color: '#64748b', fontSize: '.9rem',
            }} />
            <input
              className="form-control"
              style={{ paddingLeft: 32, height: 38 }}
              type="text"
              placeholder="Search by student or review…"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </div>

          <div style={{ flex: '1 1 180px', minWidth: 170 }}>
            <select
              className="form-select"
              style={{ height: 38 }}
              value={markFilter}
              onChange={(e) => setMarkFilter(e.target.value)}
            >
              <option value="all">All marks</option>
              <option value="less">Marks less than</option>
              <option value="greater">Marks greater than</option>
            </select>
          </div>

          <div style={{ position: 'relative', flex: '1 1 180px', minWidth: 170 }}>
            <FiSearch style={{
              position: 'absolute', left: 10, top: '50%',
              transform: 'translateY(-50%)', color: '#64748b', fontSize: '.9rem',
            }} />
            <input
              className="form-control"
              style={{ paddingLeft: 32, height: 38 }}
              type="number"
              min="0"
              step="0.5"
              placeholder="Enter marks value"
              value={markValue}
              onChange={(e) => setMarkValue(e.target.value)}
              disabled={markFilter === 'all'}
            />
          </div>

          {isFiltering && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={clearFilters}
              title="Clear marks filter"
              style={{ height: 38, whiteSpace: 'nowrap' }}
            >
              <FiX /> Clear
            </button>
          )}
        </div>
      )}

      <div className="tbl-wrap">
        <table>
          <thead>
            <tr><th>Review</th><th>Member</th><th>Total</th><th>Obtained</th><th>Status</th><th>Action</th></tr>
          </thead>
          <tbody>
            {filteredRows.length === 0
              ? <tr><td colSpan={6} className="text-center text-muted" style={{ padding: '2rem' }}>
                  {isFiltering
                    ? <>No marks match your filter. <button className="btn btn-secondary btn-sm" onClick={clearFilters} style={{ marginLeft: 8 }}><FiX /> Clear filters</button></>
                    : 'No reviews yet.'}
                </td></tr>
              : filteredRows.map(r => (
                  <tr key={r.id}>
                    <td><span className="badge badge-navy">R{r.review_number}</span> {r.title}</td>
                    <td>{r.student_name}</td>
                    <td>{formatMarks(r.total_marks)}</td>
                    <td><strong>{r.marks_obtained !== null && r.marks_obtained !== undefined && !Number.isNaN(Number(r.marks_obtained)) ? r.marks_obtained : '—'}</strong></td>
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
                ))}
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
                  <strong>{active.title}</strong>
                </div>
                <div className="form-group">
                  <label className="form-label">Total Marks</label>
                  <input className="form-control" type="number" min="1" step="0.5"
                    value={form.total_marks} onChange={e => setForm(f => ({ ...f, total_marks: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Member Obtained Marks</label>
                  <input className="form-control" type="number" min="0" max={Number(form.total_marks) || 0} step="0.5"
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
