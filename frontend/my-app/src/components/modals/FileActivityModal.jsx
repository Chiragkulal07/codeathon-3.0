import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { X, Activity, Download, Globe, Clock, User } from 'lucide-react';

export default function FileActivityModal({ isOpen, onClose, file }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && file) {
      loadLogs();
    }
  }, [isOpen, file]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const res = await api.getFileActivity(file.id);
      setLogs(res.logs || []);
    } catch (err) {
      setError(err.message || 'Failed to load file activity logs');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !file) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-card" style={{ maxWidth: '650px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Activity size={20} style={{ color: 'var(--accent-cyan)' }} />
            <div>
              <h3 style={{ fontSize: '1.1rem' }}>Download Activity & Audit Trail</h3>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{file.originalName}</div>
            </div>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-icon">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {error && (
            <div
              style={{
                padding: '10px 14px',
                background: 'rgba(244, 63, 94, 0.15)',
                color: 'var(--accent-rose)',
                borderRadius: 'var(--radius-sm)',
                marginBottom: 16,
                fontSize: '0.85rem',
              }}
            >
              {error}
            </div>
          )}

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-subtle)' }}>
              Loading audit logs...
            </div>
          ) : logs.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '40px',
                color: 'var(--text-subtle)',
                fontSize: '0.88rem',
              }}
            >
              No downloads recorded yet for this file.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {logs.map((log) => (
                <div
                  key={log.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    background: 'var(--bg-tertiary)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-glass)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: '50%',
                        background:
                          log.source === 'link'
                            ? 'rgba(99, 102, 241, 0.15)'
                            : 'rgba(16, 185, 129, 0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color:
                          log.source === 'link'
                            ? 'var(--primary)'
                            : 'var(--accent-emerald)',
                      }}
                    >
                      <Download size={16} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <User size={13} style={{ color: 'var(--text-subtle)' }} />
                        <span>{log.email}</span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', display: 'flex', alignItems: 'center', gap: 12, marginTop: 3 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Clock size={12} /> {new Date(log.at).toLocaleString()}
                        </span>
                        {log.ip && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Globe size={12} /> {log.ip}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <span
                    className="badge"
                    style={{
                      background: log.source === 'link' ? 'rgba(99, 102, 241, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                      color: log.source === 'link' ? 'var(--primary)' : 'var(--accent-emerald)',
                      border: `1px solid ${log.source === 'link' ? 'rgba(99, 102, 241, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
                    }}
                  >
                    via {log.source}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="btn btn-secondary">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
