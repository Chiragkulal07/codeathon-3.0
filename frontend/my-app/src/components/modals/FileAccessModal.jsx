import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { useSocket } from '../../context/SocketContext';
import { X, ShieldCheck, UserPlus, Trash2, Lock, Unlock } from 'lucide-react';

export default function FileAccessModal({ isOpen, onClose, file, onAccessUpdated }) {
  const { addToast } = useSocket();
  const [grants, setGrants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('viewer');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && file) {
      loadGrants();
    }
  }, [isOpen, file]);

  const loadGrants = async () => {
    setLoading(true);
    try {
      const res = await api.getFileAccess(file.id);
      setGrants(res.accessGrants || []);
    } catch (err) {
      setError(err.message || 'Failed to load file access grants');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !file) return null;

  const handleGrant = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitting(true);
    setError('');

    try {
      const res = await api.grantFileAccess(file.id, email.trim(), role);
      setGrants(res.accessGrants);
      setEmail('');
      addToast({ title: 'Access Granted', message: `Granted ${role} access to ${email}`, type: 'success' });
      if (onAccessUpdated) onAccessUpdated();
    } catch (err) {
      setError(err.message || 'Failed to grant access');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevoke = async (grantEmail) => {
    try {
      const res = await api.revokeFileAccess(file.id, grantEmail);
      setGrants(res.accessGrants);
      addToast({ title: 'Access Revoked', message: `Revoked access for ${grantEmail}`, type: 'info' });
      if (onAccessUpdated) onAccessUpdated();
    } catch (err) {
      addToast({ title: 'Error', message: err.message, type: 'error' });
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card" style={{ maxWidth: '540px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ShieldCheck size={20} style={{ color: 'var(--accent-purple)' }} />
            <div>
              <h3 style={{ fontSize: '1.1rem' }}>Granular File Access Control</h3>
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

          <div
            style={{
              padding: '12px 14px',
              borderRadius: 'var(--radius-md)',
              background: grants.length > 0 ? 'rgba(239, 68, 68, 0.08)' : 'rgba(16, 185, 129, 0.08)',
              border: `1px solid ${grants.length > 0 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)'}`,
              marginBottom: 18,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            {grants.length > 0 ? (
              <Lock size={18} style={{ color: 'var(--accent-rose)' }} />
            ) : (
              <Unlock size={18} style={{ color: 'var(--accent-emerald)' }} />
            )}
            <div style={{ fontSize: '0.82rem' }}>
              {grants.length > 0 ? (
                <span>
                  <strong>Restricted File:</strong> Only the uploader, room admins, and explicit grant holders below can access this file.
                </span>
              ) : (
                <span>
                  <strong>Open Access:</strong> All members in this room can view/download this file according to their room role.
                </span>
              )}
            </div>
          </div>

          {/* Add Grant Form */}
          <form
            onSubmit={handleGrant}
            style={{
              background: 'var(--bg-tertiary)',
              padding: '12px',
              borderRadius: 'var(--radius-md)',
              marginBottom: 18,
              border: '1px solid var(--border-glass)',
            }}
          >
            <div style={{ fontSize: '0.82rem', fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <UserPlus size={15} style={{ color: 'var(--primary)' }} /> Add Exclusive Member Grant
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="email"
                placeholder="member@room.com"
                className="input-field"
                style={{ flex: 1 }}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <select className="select-field" style={{ width: '110px' }} value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="viewer">Viewer</option>
                <option value="editor">Editor</option>
              </select>
              <button type="submit" disabled={submitting || !email.trim()} className="btn btn-primary btn-sm">
                {submitting ? 'Granting...' : 'Grant'}
              </button>
            </div>
          </form>

          {/* Existing Grants List */}
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-subtle)', textTransform: 'uppercase', marginBottom: 8 }}>
              Explicit Access Grants ({grants.length})
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-subtle)' }}>Loading grants...</div>
            ) : grants.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-subtle)', fontSize: '0.85rem' }}>
                No explicit grants. File is accessible to all room members.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {grants.map((g) => (
                  <div
                    key={g.email}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      background: 'var(--bg-tertiary)',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-glass)',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 600 }}>{g.email}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-subtle)' }}>
                        Granted {new Date(g.grantedAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className={`badge badge-${g.role}`}>{g.role}</span>
                      <button
                        onClick={() => handleRevoke(g.email)}
                        className="btn btn-ghost btn-icon"
                        title="Revoke Grant"
                        style={{ padding: 4, color: 'var(--accent-rose)' }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="btn btn-secondary">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
