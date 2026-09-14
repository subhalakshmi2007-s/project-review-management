import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiBell, FiCheck, FiClock } from 'react-icons/fi';
import api from '../../services/api';
import { getRole } from '../../services/auth';

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const navigate = useNavigate();

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/notifications');
      setItems(data.items || []);
      setUnread(data.unread || 0);
    } catch (_) {}
  }, []);

  useEffect(() => {
    load();
    const timer = window.setInterval(load, 30000);
    return () => window.clearInterval(timer);
  }, [load]);

  const markRead = async (notification) => {
    if (!notification.is_read) {
      try { await api.patch(`/notifications/${notification.id}/read`); } catch (_) {}
      setItems(current => current.map(item => item.id === notification.id ? { ...item, is_read: true } : item));
      setUnread(current => Math.max(0, current - 1));
    }
    setOpen(false);
    navigate(`/${getRole()}`);
  };

  const markAllRead = async () => {
    try { await api.patch('/notifications/read-all'); } catch (_) {}
    setItems(current => current.map(item => ({ ...item, is_read: true })));
    setUnread(0);
  };

  return (
    <div className="notification-wrap">
      <button className="btn-nav-notifications" onClick={() => setOpen(value => !value)}
        title="Notifications" aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}
        aria-expanded={open}>
        <FiBell />
        {unread > 0 && <span className="notification-count">{unread > 9 ? '9+' : unread}</span>}
      </button>

      {open && (
        <div className="notification-menu">
          <div className="notification-menu-head">
            <div><strong>Notifications</strong><span>{unread ? `${unread} unread` : 'All caught up'}</span></div>
            {unread > 0 && <button onClick={markAllRead}><FiCheck /> Mark all read</button>}
          </div>
          <div className="notification-list">
            {items.length === 0
              ? <div className="notification-empty"><FiBell /><span>No notifications yet</span></div>
              : items.map(item => (
                <button key={item.id} className={`notification-item${item.is_read ? '' : ' unread'}`}
                  onClick={() => markRead(item)}>
                  <span className={`notification-dot notification-${item.kind}`} />
                  <span className="notification-copy"><strong>{item.title}</strong><span>{item.message}</span><small><FiClock /> {new Date(item.created_at).toLocaleString()}</small></span>
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}