import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { useSocket } from '../../context/SocketContext';
import {
  X,
  Share2,
  Link2,
  Lock,
  Download,
  Copy,
  Check,
  Calendar,
  Users,
  Pencil,
  ShieldCheck,
  UserPlus,
  Trash2,
  Unlock,
} from 'lucide-react';

export default function UnifiedShareModal({ isOpen, onClose, file, onAccessUpdated }) {
  const { addToast } = useSocket();
  const [activeTab, setActiveTab] = useState('link'); // 'link' | 'access'

  // --- Share Link Tab State ---
  const [expiresInMinutes, setExpiresInMinutes] = useState('1440'); // 24 hours
  const [usePassword, setUsePassword] = useState(false);
  const [password, setPassword] = useState('');
  const [useMaxDownloads, setUseMaxDownloads] = useState(false);
  const [maxDownloads, setMaxDownloads] = useState(5);
  const [useAllowedEmails, setUseAllowedEmails] = useState(false);
  const [allowedEmailsStr, setAllowedEmailsStr] = useState('');
  const [allowEdit, setAllowEdit] = useState(false);
  const [createdLink, setCreatedLink] = useState(null);
  const [linkLoading, setLinkLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [linkError, setLinkError] = useState('');

  // --- Direct Access Grants Tab State ---
  const [grants, setGrants] = useState([]);
  const [grantsLoading, setGrantsLoading] = useState(true);
  const [grantEmail, setGrantEmail] = useState('');
  const [grantRole, setGrantRole] = useState('viewer');
  const [grantSubmitting, setGrantSubmitting] = useState(false);
  const [grantError, setGrantError] = useState('');

  useEffect(() => {
    if (isOpen && file) {
      setCreatedLink(null);
      setLinkError('');
      setGrantError('');
      loadGrants();
    }
  }, [isOpen, file]);

  const loadGrants = async () => {
    setGrantsLoading(true);
    try {
      const res = await api.getFileAccess(file.id);
      setGrants(res.accessGrants || []);
    } catch {
      // ignore
    } finally {
      setGrantsLoading(false);
    }
  };

  if (!isOpen || !file) return null;

  const handleCreateLink = async (e) => {
    e.preventDefault();
    setLinkLoading(true);
    setLinkError('');

    const payload = {
      expiresInMinutes: parseInt(expiresInMinutes),
      password: usePassword ? password : undefined,
      maxDownloads: useMaxDownloads ? parseInt(maxDownloads) : undefined,
      allowedEmails: useAllowedEmails
        ? allowedEmailsStr.split(',').map((s) => s.trim()).filter(Boolean)
        : undefined,
      allowEdit,
    };

    try {
      const res = await api.createShareLink(file.id, payload);
      setCreatedLink(res.link);
      addToast({ title: 'Share Link Ready', message: 'Share link created successfully!', type: 'success' });
    } catch (err) {
      setLinkError(err.message || 'Failed to generate share link');
    } finally {
      setLinkLoading(false);
    }
  };

  const fullShareUrl = createdLink ? `${window.location.origin}/s/${createdLink.code}` : '';

  const copyToClipboard = () => {
    navigator.clipboard.writeText(fullShareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
    addToast({ title: 'Link Copied', message: 'Share URL copied to clipboard', type: 'info' });
  };

  const handleGrantAccess = async (e) => {
    e.preventDefault();
    if (!grantEmail.trim()) return;
    setGrantSubmitting(true);
    setGrantError('');

    try {
      const res = await api.grantFileAccess(file.id, grantEmail.trim(), grantRole);
      setGrants(res.accessGrants);
      setGrantEmail('');
      addToast({ title: 'Access Granted', message: `Granted ${grantRole} role to ${grantEmail}`, type: 'success' });
      if (onAccessUpdated) onAccessUpdated();
    } catch (err) {
      setGrantError(err.message || 'Failed to grant access');
    } finally {
      setGrantSubmitting(false);
    }
  };

  const handleRevokeAccess = async (emailToRevoke) => {
    try {
      const res = await api.revokeFileAccess(file.id, emailToRevoke);
      setGrants(res.accessGrants);
      addToast({ title: 'Access Revoked', message: `Revoked access for ${emailToRevoke}`, type: 'info' });
      if (onAccessUpdated) onAccessUpdated();
    } catch (err) {
      addToast({ title: 'Error', message: err.message, type: 'error' });
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card" style={{ maxWidth: '580px' }}>
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 'var(--radius-sm)',
                background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent-cyan) 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 12px var(--primary-glow)',
              }}
            >
              <Share2 size={18} color="#fff" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem' }}>File Sharing & Access Control</h3>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{file.originalName}</div>
            </div>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-icon">
            <X size={18} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid var(--border-glass)',
            padding: '0 24px',
            background: 'rgba(0,0,0,0.15)',
          }}
        >
          <button
            onClick={() => setActiveTab('link')}
            className="btn btn-ghost"
            style={{
              borderRadius: 0,
              borderBottom: activeTab === 'link' ? '2px solid var(--accent-cyan)' : '2px solid transparent',
              color: activeTab === 'link' ? '#fff' : 'var(--text-muted)',
              padding: '12px 18px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Link2 size={16} style={{ color: 'var(--accent-cyan)' }} /> Share Link Generator
          </button>
          <button
            onClick={() => setActiveTab('access')}
            className="btn btn-ghost"
            style={{
              borderRadius: 0,
              borderBottom: activeTab === 'access' ? '2px solid var(--accent-purple)' : '2px solid transparent',
              color: activeTab === 'access' ? '#fff' : 'var(--text-muted)',
              padding: '12px 18px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <ShieldCheck size={16} style={{ color: 'var(--accent-purple)' }} /> Direct Email Access ({grants.length})
          </button>
        </div>

        <div className="modal-body">
          {/* TAB 1: SHARE LINK */}
          {activeTab === 'link' && (
            <div>
              {createdLink ? (
                <div>
                  <div
                    style={{
                      textAlign: 'center',
                      padding: '20px',
                      background: 'rgba(6, 182, 212, 0.1)',
                      border: '1px solid rgba(6, 182, 212, 0.3)',
                      borderRadius: 'var(--radius-md)',
                      marginBottom: 20,
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--accent-cyan)', marginBottom: 6 }}>
                      ✨ Share Link Ready!
                    </div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      {createdLink.allowEdit
                        ? 'Recipients can view AND edit this file directly in their browser.'
                        : 'Recipients can view or download this file via this secure link.'}
                    </div>
                  </div>

                  <div className="input-group">
                    <label className="input-label">Sharable URL</label>
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
                        <span>{copied ? 'Copied!' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6,
                      fontSize: '0.8rem',
                      color: 'var(--text-subtle)',
                      marginTop: 16,
                      background: 'var(--bg-tertiary)',
                      padding: '12px 16px',
                      borderRadius: 'var(--radius-md)',
                    }}
                  >
                    <div>• Expiration: {new Date(createdLink.expiresAt).toLocaleString()}</div>
                    {createdLink.passwordProtected && <div>• Password Protection: Active</div>}
                    {createdLink.maxDownloads && <div>• Download Limit: {createdLink.maxDownloads} downloads max</div>}
                    {createdLink.allowedEmails?.length > 0 && (
                      <div>• Allowed Emails: {createdLink.allowedEmails.join(', ')}</div>
                    )}
                    {createdLink.allowEdit && (
                      <div style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>
                        • ✏️ Inline Editing Permission Granted
                      </div>
                    )}
                  </div>

                  <div style={{ marginTop: 20, textAlign: 'right' }}>
                    <button onClick={() => setCreatedLink(null)} className="btn btn-secondary">
                      Create Another Link
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleCreateLink}>
                  {linkError && (
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
                      {linkError}
                    </div>
                  )}

                  {/* Expiration */}
                  <div className="input-group">
                    <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Calendar size={14} /> Link Expiration Time
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
                        <Lock size={15} style={{ color: 'var(--accent-amber)' }} /> Password Protection
                      </div>
                    </label>
                    {usePassword && (
                      <div style={{ marginTop: 10 }}>
                        <input
                          type="password"
                          placeholder="Enter link password (min 4 characters)"
                          className="input-field"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          minLength={4}
                          required={usePassword}
                        />
                      </div>
                    )}
                  </div>

                  {/* Download Limit */}
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

                  {/* Whitelist Emails */}
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
                          placeholder="friend@gmail.com, colleague@company.com"
                          className="input-field"
                          value={allowedEmailsStr}
                          onChange={(e) => setAllowedEmailsStr(e.target.value)}
                          required={useAllowedEmails}
                        />
                      </div>
                    )}
                  </div>

                  {/* Allow Editing Toggle */}
                  <div
                    style={{
                      background: allowEdit ? 'rgba(6, 182, 212, 0.08)' : 'var(--bg-tertiary)',
                      padding: '12px 14px',
                      borderRadius: 'var(--radius-md)',
                      border: allowEdit ? '1px solid rgba(6, 182, 212, 0.35)' : '1px solid var(--border-glass)',
                      marginBottom: 20,
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
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-subtle)', marginTop: 4, paddingLeft: 28 }}>
                      Grant recipients permission to view AND edit this file directly in their browser.
                    </div>
                  </div>

                  <div className="modal-footer" style={{ padding: 0 }}>
                    <button type="button" onClick={onClose} className="btn btn-ghost">
                      Cancel
                    </button>
                    <button type="submit" disabled={linkLoading} className="btn btn-primary">
                      {linkLoading ? 'Generating...' : 'Generate Share Link'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* TAB 2: DIRECT USER ACCESS GRANTS */}
          {activeTab === 'access' && (
            <div>
              {grantError && (
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
                  {grantError}
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
                      <strong>Restricted File:</strong> Access is limited to uploader, room admins, and explicit email grant holders below.
                    </span>
                  ) : (
                    <span>
                      <strong>Open Room Access:</strong> All room members can access this file according to their room role.
                    </span>
                  )}
                </div>
              </div>

              {/* Add Grant Form */}
              <form
                onSubmit={handleGrantAccess}
                style={{
                  background: 'var(--bg-tertiary)',
                  padding: '14px',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: 18,
                  border: '1px solid var(--border-glass)',
                }}
              >
                <div style={{ fontSize: '0.82rem', fontWeight: 600, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <UserPlus size={15} style={{ color: 'var(--accent-purple)' }} /> Grant User File Access
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="email"
                    placeholder="user@example.com"
                    className="input-field"
                    style={{ flex: 1 }}
                    value={grantEmail}
                    onChange={(e) => setGrantEmail(e.target.value)}
                    required
                  />
                  <select
                    className="select-field"
                    style={{ width: '110px' }}
                    value={grantRole}
                    onChange={(e) => setGrantRole(e.target.value)}
                  >
                    <option value="viewer">Viewer</option>
                    <option value="editor">Editor</option>
                  </select>
                  <button type="submit" disabled={grantSubmitting || !grantEmail.trim()} className="btn btn-primary btn-sm">
                    {grantSubmitting ? 'Granting...' : 'Grant'}
                  </button>
                </div>
              </form>

              {/* Existing Grants List */}
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-subtle)', textTransform: 'uppercase', marginBottom: 8 }}>
                  Active Grants ({grants.length})
                </div>

                {grantsLoading ? (
                  <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-subtle)' }}>Loading grants...</div>
                ) : grants.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-subtle)', fontSize: '0.85rem' }}>
                    No explicit grants set.
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
                          padding: '10px 14px',
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
                            onClick={() => handleRevokeAccess(g.email)}
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

              <div className="modal-footer" style={{ padding: '20px 0 0 0' }}>
                <button onClick={onClose} className="btn btn-secondary">
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
