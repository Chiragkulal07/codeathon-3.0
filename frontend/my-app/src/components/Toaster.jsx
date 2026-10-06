import React from 'react';
import { useSocket } from '../context/SocketContext';
import { Bell, CheckCircle, AlertCircle, Info, X } from 'lucide-react';

export default function Toaster() {
  const { toasts, removeToast } = useSocket();

  if (!toasts.length) return null;

  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div key={t.id} className="toast">
          <div style={{ color: t.type === 'error' ? 'var(--accent-rose)' : t.type === 'success' ? 'var(--accent-emerald)' : 'var(--primary)' }}>
            {t.type === 'error' ? (
              <AlertCircle size={20} />
            ) : t.type === 'success' ? (
              <CheckCircle size={20} />
            ) : (
              <Bell size={20} />
            )}
          </div>
          <div style={{ flex: 1 }}>
            {t.title && (
              <div style={{ fontWeight: 600, fontSize: '0.88rem', marginBottom: 2 }}>
                {t.title}
              </div>
            )}
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              {t.message}
            </div>
          </div>
          <button
            onClick={() => removeToast(t.id)}
            className="btn btn-ghost btn-icon"
            style={{ padding: 2, color: 'var(--text-subtle)' }}
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
