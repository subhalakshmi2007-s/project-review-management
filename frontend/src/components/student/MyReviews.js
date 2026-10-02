import React, { useState, useEffect, useCallback } from 'react';
import { FiUpload, FiDownload, FiClipboard } from 'react-icons/fi';
import { toast } from 'react-toastify';
import api from '../../services/api';
import { openPdfFromApi } from '../../services/pdfViewer';

const STATUS_BADGE = {
  marked:    <span className="badge badge-success">Marked</span>,
  submitted: <span className="badge badge-info">Submitted</span>,
  overdue:   <span className="badge badge-danger">Overdue</span>,
  pending:   <span className="badge badge-warning">Pending</span>,
};

export default function MyReviews() {
  const [reviews, setReviews] = useState([]);
  const [open,    setOpen]    = useState(false);
  const [active,  setActive]  = useState(null);
  const [file,    setFile]    = useState(null);
  const [reviewNumber, setReviewNumber] = useState('');
  const [deadline, setDeadline] = useState('');
  const [title,   setTitle]   = useState('');
  const [details, setDetails] = useState('');
  const [note,    setNote]    = useState('');
  const [busy,    setBusy]    = useState(false);

  const load = useCallback(async () => {
    try { const { data } = await api.get('/reviews/mine'); setReviews(data); }
    catch { toast.error('Failed to load reviews'); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openSubmit = (r) => {
    setActive(r);
    setFile(null);
    setReviewNumber(String(r.review_number || ''));
    setDeadline(r.deadline ? new Date(r.deadline).toISOString().slice(0, 10) : '');
    setTitle(r.title || '');
    setDetails(r.description || '');
    setNote(r.task_note || '');
    setOpen(true);
  };
  const openCreate = () => {
    setActive(null);
    setFile(null);
    setReviewNumber('');
    setDeadline('');
    setTitle('');
    setDetails('');
    setNote('');
    setOpen(true);
  };
  const close = () => {
    setOpen(false);
    setActive(null);
    setFile(null);
    setReviewNumber('');
    setDeadline('');
    setTitle('');
    setDetails('');
    setNote('');
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!file) { toast.error('Please select a PDF file'); return; }
    if (!active && (!reviewNumber || !deadline || !title.trim() || !details.trim())) {
      toast.error('Review number, date, title and description are required');
      return;
    }
    setBusy(true);
    const fd = new FormData();
    fd.append('file', file);
    if (active) {
      fd.append('title', title.trim());
      fd.append('description', details.trim());
      fd.append('task_note', note);
    } else {
      fd.append('review_number', reviewNumber);
      fd.append('deadline', deadline);
      fd.append('title', title.trim());
      fd.append('description', details.trim());
      fd.append('task_note', note);
    }
    try {
      if (active) {
        await api.post(`/reviews/${active.id}/submit`, fd);
        toast.success(active.submitted ? 'Submission updated successfully!' : 'Submitted successfully!');
      } else {
        await api.post('/reviews', fd);
        toast.success('Review submitted successfully!');
      }
      close(); load();
    } catch (err) { toast.error(err.response?.data?.error || 'Submission failed'); }
    finally { setBusy(false); }
  };

  return (
    <>
      <div className="panel-head">
        <h3 className="panel-title"><FiClipboard style={{ marginRight: 6, color: 'var(--navy)' }} />My Reviews</h3>
        <button className="btn btn-primary btn-sm" onClick={openCreate}>Add Review</button>
      </div>

      {reviews.length === 0
        ? <div className="alert alert-info">No reviews assigned to you yet. Check back later.</div>
        : reviews.map(r => (
          <div key={r.id} className="review-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '.5rem' }}>
              <div>
                <span className="badge badge-navy" style={{ marginRight: 8 }}>Review {r.review_number}</span>
                <h5 style={{ display: 'inline', fontSize: '.95rem' }}>{r.title}</h5>
              </div>
              {STATUS_BADGE[r.status]}
            </div>

            <p style={{ marginTop: 8, fontSize: '.875rem', color: '#475569', lineHeight: 1.55 }}>
              <strong>Task:</strong> {r.description}
            </p>

            <div style={{ display: 'flex', gap: '1.5rem', fontSize: '.82rem', color: '#64748b', marginBottom: 8 }}>
              <span>🏆 Marks: {r.total_marks !== null && r.total_marks !== undefined && Number(r.total_marks) > 0 ? r.total_marks : '—'}</span>
              <span>📅 Review Date: {new Date(r.deadline).toLocaleDateString()}</span>
              {r.marks_obtained !== null && r.marks_obtained !== undefined && Number(r.marks_obtained) >= 0 && Number(r.total_marks) > 0 && (
                <span style={{ color: 'var(--green)', fontWeight: 700 }}>
                  ✅ Scored: {r.marks_obtained} / {r.total_marks}
                </span>
              )}
            </div>

            {r.feedback && (
              <div className="alert alert-success" style={{ fontSize: '.85rem', padding: '8px 12px' }}>
                <strong>Guide Feedback:</strong> {r.feedback}
              </div>
            )}

            <div style={{ display: 'flex', gap: '.6rem', flexWrap: 'wrap' }}>
              {r.status !== 'marked' && r.status !== 'overdue' && (
                <button className="btn btn-primary btn-sm" onClick={() => openSubmit(r)}>
                  <FiUpload /> {r.submitted ? 'Update Submission' : 'Submit'}
                </button>
              )}
              {r.submitted && (
                <button
                  type="button"
                  className="btn btn-info btn-sm"
                  onClick={() => openPdfFromApi(r.pdf_file)}
                >
                  <FiDownload /> View My PDF
                </button>
              )}
            </div>
          </div>
        ))
      }

      {/* Submit modal */}
      {open && (
        <div className="overlay" onClick={close}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-hd">
              <h4>{active ? `Submit — ${active.title}` : 'Add New Review'}</h4>
              <button className="modal-close" onClick={close}>×</button>
            </div>
            <form onSubmit={submit}>
              <div className="modal-bd">
                {active && (
                  <div className="alert alert-info" style={{ fontSize: '.85rem' }}>
                    <strong>Task Instructions:</strong> {active.description}
                  </div>
                )}
                {!active && (
                  <>
                    <div className="form-group">
                      <label className="form-label">Review Number</label>
                      <input className="form-control" type="number" min="1" value={reviewNumber} onChange={e => setReviewNumber(e.target.value)} required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Review Date</label>
                      <input className="form-control" type="date" value={deadline} onChange={e => setDeadline(e.target.value)} required />
                    </div>
                  </>
                )}
                <div className="form-group">
                  <label className="form-label">Review Title</label>
                  <input className="form-control" type="text"
                    placeholder="Give this review a clear task title…"
                    value={title} onChange={e => setTitle(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Task Details <span className="text-muted text-sm">(what did you complete)</span></label>
                  <textarea className="form-control" rows={4}
                    placeholder="Describe what you completed for this review…"
                    value={details} onChange={e => setDetails(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Task Note <span className="text-muted text-sm">(optional)</span></label>
                  <textarea className="form-control" rows={4}
                    placeholder="Briefly describe the tasks you completed for this review…"
                    value={note} onChange={e => setNote(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Upload PDF <span className="text-muted text-sm">(required)</span></label>
                  <div className="upload-zone" onClick={() => document.getElementById('pdf-input').click()}>
                    <FiUpload size={28} color="var(--navy)" />
                    <p>{file ? file.name : 'Click to select a PDF file'}</p>
                  </div>
                  <input id="pdf-input" type="file" accept=".pdf" style={{ display: 'none' }}
                    onChange={e => setFile(e.target.files[0])} />
                </div>
              </div>
              <div className="modal-ft">
                <button type="button" className="btn btn-secondary" onClick={close}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={busy || !file}>
                  <FiUpload /> {busy ? 'Uploading…' : active ? 'Submit Review' : 'Create Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
