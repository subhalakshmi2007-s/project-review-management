import React, { useState, useEffect } from 'react';
import { FiRefreshCw, FiCopy, FiKey } from 'react-icons/fi';
import { toast } from 'react-toastify';
import api from '../../services/api';

export default function JoinCode() {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get('/auth/join-code').then(r => setCode(r.data.join_code)).catch(() => {});
  }, []);

  const refresh = async () => {
    if (!window.confirm('Generate a new join code? The old one will stop working.')) return;
    setBusy(true);
    try {
      const { data } = await api.post('/auth/refresh-code');
      setCode(data.join_code);
      toast.success('New join code generated');
    } catch { toast.error('Failed to refresh code'); }
    finally { setBusy(false); }
  };

  const copy = () => {
    navigator.clipboard.writeText(code);
    toast.success('Code copied to clipboard');
  };

  return (
    <>
      <div className="panel-head">
        <h3 className="panel-title"><FiKey style={{ marginRight: 6, color: 'var(--navy)' }} />Your Join Code</h3>
      </div>

      <div className="code-box mb-3">
        <div className="code">{code || '…'}</div>
        <p>Share this code with students so they can register and join your class</p>
      </div>

      <div style={{ display: 'flex', gap: '.75rem' }}>
        <button className="btn btn-outline" onClick={copy} disabled={!code}>
          <FiCopy /> Copy Code
        </button>
        <button className="btn btn-warning" onClick={refresh} disabled={busy}>
          <FiRefreshCw /> {busy ? 'Refreshing…' : 'Generate New Code'}
        </button>
      </div>

      <div className="alert alert-warn mt-3">
        <strong>Note:</strong> Refreshing generates a new code. Students who haven't registered yet
        will need the new code. Students already registered are unaffected.
      </div>
    </>
  );
}
