import React, { useState } from 'react';
import { api } from '../../api/client';
import { useSocket } from '../../context/SocketContext';
import {
  X,
  Link2,
  Lock,
  Download,
  Copy,
  Check,
  Calendar,
  Users,
  Pencil,
} from 'lucide-react';

export default function CreateShareLinkModal({ isOpen, onClose, file }) {
  const { addToast } = useSocket();
  const [expiresInMinutes, setExpiresInMinutes] = useState('1440'); // 24 hours
  const [usePassword, setUsePassword] = useState(false);
  const [password, setPassword] = useState('');
  const [useMaxDownloads, setUseMaxDownloads] = useState(false);
  const [maxDownloads, setMaxDownloads] = useState(5);
  const [useAllowedEmails, setUseAllowedEmails] = useState(false);
  const [allowedEmailsStr, setAllowedEmailsStr] = useState('');
  const [allowEdit, setAllowEdit] = useState(false);

  const [createdLink, setCreatedLink] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !file) return null;

  const handleReset = () => {
    setCreatedLink(null);
    setCopied(false);
    setError('');
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const payload = {
      expiresInMinutes: parseInt(expiresInMinutes),
      password: usePassword ? password : undefined,
      maxDownloads: useMaxDownloads ? parseInt(maxDownloads) : undefined,
      allowedEmails: useAllowedEmails
        ? allowedEmailsStr
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined,
      allowEdit,
    };

    try {
      const res = await api.createShareLink(file.id, payload);
      setCreatedLink(res.link);
      addToast({ title: 'Share Link Created', message: 'Link is active and ready to share', type: 'success' });
    } catch (err) {
      setError(err.message || 'Failed to create share link');
    } finally {
      setLoading(false);
    }
  };

  const fullShareUrl = createdLink
    ? `${window.location.origin}/s/${createdLink.code}`
    : '';

  const copyToClipboard = () => {
    navigator.clipboard.writeText(fullShareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
    addToast({ title: 'Copied', message: 'Link copied to clipboard', type: 'info' });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card" style={{ maxWidth: '540px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Link2 size={20} style={{ color: 'var(--primary)' }} />
            <div>
              <h3 style={{ fontSize: '1.1rem' }}>Create Secure Share Link</h3>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{file.originalName}</div>
            </div>
          </div>
          <button onClick={handleClose} className="btn btn-ghost btn-icon">
            <X size={18} />
          </button>
        </div>

        {createdLink ? (
          <div className="modal-body">
            <div style={{ textAlign: 'center', padding: '24px 16px', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: 'var(--radius-md)', marginBottom: 20 }}>
              <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--accent-emerald)', marginBottom: 6 }}>
                Share Link Generated!
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                {createdLink.allowEdit
                  ? 'Recipients can view AND edit this file inline.'
                  : 'Anyone with this link (and meeting access requirements) can download this file.'}
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">Share URL</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  readOnly
                  value={fullShareUrl}
                  className="input-field"
                  style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}
                />
                <button onClick={copyToClipboard} className="btn btn-primary" style={{ minWidth: '100px' }}>
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.8rem', color: 'var(--text-subtle)', marginTop: 14 }}>
              <div>• Expires: {new Date(createdLink.expiresAt).toLocaleString()}</div>
              {createdLink.passwordProtected && <div>• Password Protected: Yes</div>}
              {createdLink.maxDownloads && <div>• Max Downloads: {createdLink.maxDownloads}</div>}
              {createdLink.allowedEmails?.length > 0 && (
                <div>• Restricted to: {createdLink.allowedEmails.join(', ')}</div>
              )}
              {createdLink.allowEdit && (
                <div style={{ color: 'var(--accent-cyan)' }}>• ✏️ Editing Enabled: Recipients can edit this file</div>
              )}
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
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

              {/* Expiry Selector */}
              <div className="input-group">
                <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Calendar size={14} /> Link Expiration
                </label>
                <select
                  className="select-field"
                  value={expiresInMinutes}
                  onChange={(e) => setExpiresInMinutes(e.target.value)}
                >
                  <option value="60">1 Hour</option>
                  <option value="360">6 Hours</option>
                  <option value="1440">24 Hours (1 Day)</option>
                  <option value="4320">3 Days</option>
                  <option value="10080">7 Days</option>
                  <option value="43200">30 Days (Maximum)</option>
                </select>
              </div>

              {/* Password Option */}
              <div
                style={{
                  background: 'var(--bg-tertiary)',
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: 12,
                  border: '1px solid var(--border-glass)',
                }}
              >
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: '0.88rem', fontWeight: 600 }}>
                  <input
                    type="checkbox"
                    checked={usePassword}
                    onChange={(e) => setUsePassword(e.target.checked)}
                  />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Lock size={15} style={{ color: 'var(--accent-amber)' }} /> Password Protect Link
                  </div>
                </label>

                {usePassword && (
                  <div style={{ marginTop: 10 }}>
                    <input
                      type="password"
                      placeholder="Enter access password (min 4 characters)"
                      className="input-field"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      minLength={4}
                      required={usePassword}
                    />
                  </div>
                )}
              </div>

              {/* Max Downloads Limit */}
              <div
                style={{
                  background: 'var(--bg-tertiary)',
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: 12,
                  border: '1px solid var(--border-glass)',
                }}
              >
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: '0.88rem', fontWeight: 600 }}>
                  <input
                    type="checkbox"
                    checked={useMaxDownloads}
                    onChange={(e) => setUseMaxDownloads(e.target.checked)}
                  />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Download size={15} style={{ color: 'var(--accent-cyan)' }} /> Download Limit
                  </div>
                </label>

                {useMaxDownloads && (
                  <div style={{ marginTop: 10 }}>
                    <input
                      type="number"
                      min={1}
                      max={1000}
                      className="input-field"
                      value={maxDownloads}
                      onChange={(e) => setMaxDownloads(e.target.value)}
                      required={useMaxDownloads}
                    />
                  </div>
                )}
              </div>

              {/* Whitelisted Emails */}
              <div
                style={{
                  background: 'var(--bg-tertiary)',
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-glass)',
                }}
              >
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: '0.88rem', fontWeight: 600 }}>
                  <input
                    type="checkbox"
                    checked={useAllowedEmails}
                    onChange={(e) => setUseAllowedEmails(e.target.checked)}
                  />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Users size={15} style={{ color: 'var(--primary)' }} /> Restrict to Specific Emails
                  </div>
                </label>

                {useAllowedEmails && (
                  <div style={{ marginTop: 10 }}>
                    <input
                      type="text"
                      placeholder="client@acme.com, reviewer@test.com"
                      className="input-field"
                      value={allowedEmailsStr}
                      onChange={(e) => setAllowedEmailsStr(e.target.value)}
                      required={useAllowedEmails}
                    />
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-subtle)', marginTop: 4 }}>
                      Recipients will be required to log in with matching emails.
                    </div>
                  </div>
                )}
              </div>
              {/* Allow Editing toggle - only makes sense for text/code files */}
              <div
                style={{
                  background: allowEdit ? 'rgba(6, 182, 212, 0.08)' : 'var(--bg-tertiary)',
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: allowEdit ? '1px solid rgba(6, 182, 212, 0.35)' : '1px solid var(--border-glass)',
                  marginTop: 12,
                  transition: 'all 0.2s',
                }}
              >
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: '0.88rem', fontWeight: 600 }}>
                  <input
                    type="checkbox"
                    checked={allowEdit}
                    onChange={(e) => setAllowEdit(e.target.checked)}
                  />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Pencil size={15} style={{ color: 'var(--accent-cyan)' }} /> Allow Inline Editing
                  </div>
                </label>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-subtle)', marginTop: 6, paddingLeft: 28 }}>
                  Recipients can view and live-edit the file content directly in the browser (text/code files only).
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" onClick={handleClose} className="btn btn-ghost">
                Cancel
              </button>
              <button type="submit" disabled={loading} className="btn btn-primary">
                {loading ? 'Creating...' : 'Generate Link'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
