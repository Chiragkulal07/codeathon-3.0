import React, { useState, useEffect, useRef } from 'react';
import { api, getStoredTokens } from '../api/client';
import {
  FolderLock,
  Download,
  Lock,
  AlertCircle,
  FileCheck,
  Shield,
  Clock,
  Eye,
  Pencil,
  Save,
  FileText,
  Check,
  Copy,
  ExternalLink,
} from 'lucide-react';

const TEXT_MIMES = new Set([
  'text/plain','text/markdown','text/csv','text/html','text/css',
  'text/javascript','application/json','application/xml',
]);
function isTextMime(mimeType) {
  if (!mimeType) return false;
  if (mimeType.startsWith('text/')) return true;
  return TEXT_MIMES.has(mimeType);
}

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default function PublicLinkView({ code, embedded = false, onGoHome }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState('');
  const [passwordSubmitted, setPasswordSubmitted] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');

  // Inline view/edit
  const [fileContent, setFileContent] = useState(null);
  const [editedContent, setEditedContent] = useState('');
  const [mode, setMode] = useState('view'); // 'view' | 'edit'
  const [loadingContent, setLoadingContent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => { resolveLink(); }, [code]);

  useEffect(() => {
    if (!data) return;
    if (isTextMime(data.file?.mimeType) && !data.requiresPassword) {
      loadContent();
    }
  }, [data]);

  const resolveLink = async () => {
    setLoading(true); setError('');
    try { const res = await api.resolvePublicLink(code); setData(res); }
    catch (err) { setError(err.message || 'This link is invalid, expired, or revoked.'); }
    finally { setLoading(false); }
  };

  const loadContent = async (pw) => {
    setLoadingContent(true);
    try {
      const res = await api.readPublicLinkContent(code, pw || password || undefined);
      setFileContent(res.content);
      setEditedContent(res.content);
    } catch (err) { setError(err.message); }
    finally { setLoadingContent(false); }
  };

  const handlePasswordUnlock = async (e) => {
    e.preventDefault();
    const isText = isTextMime(data?.file?.mimeType);
    if (isText) { await loadContent(password); }
    setPasswordSubmitted(true);
  };

  const handleDownload = async () => {
    setDownloading(true); setError('');
    try {
      const headers = {};
      const { accessToken } = getStoredTokens();
      if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
      if (password) headers['x-link-password'] = password;
      const res = await fetch(api.downloadPublicLinkUrl(code), {
        method: data?.requiresPassword ? 'POST' : 'GET',
        headers: { ...headers, ...(data?.requiresPassword ? { 'Content-Type': 'application/json' } : {}) },
        body: data?.requiresPassword ? JSON.stringify({ password }) : undefined,
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.message || 'Download failed');
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = data?.file?.name || 'file';
      document.body.appendChild(a); a.click();
      window.URL.revokeObjectURL(url); document.body.removeChild(a);
    } catch (err) { setError(err.message); }
    finally { setDownloading(false); }
  };

  const copyContent = () => {
    navigator.clipboard.writeText(mode === 'edit' ? editedContent : fileContent ?? '');
    setCopied(true); setTimeout(() => setCopied(false), 2500);
  };

  const handleSaveFile = async () => {
    setSaving(true);
    setError('');
    try {
      await api.savePublicLinkContent(code, editedContent, password);
      setFileContent(editedContent);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err.message || 'Failed to save file');
    } finally {
      setSaving(false);
    }
  };

  const isText = data ? isTextMime(data.file?.mimeType) : false;
  const showInline = isText && fileContent !== null;
  const canEdit = data?.allowEdit && isText;

  return (
    <div style={{
      minHeight: embedded ? 'auto' : '100vh',
      width: embedded ? '100%' : '100vw',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justify: showInline || embedded ? 'flex-start' : 'center',
      padding: embedded ? '8px 0 24px 0' : '24px',
      position: 'relative',
      zIndex: 10,
    }}>
      {/* Header */}
      <div style={{ width: '100%', maxWidth: showInline ? '960px' : '480px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-sm)', background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent-cyan) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 15px var(--primary-glow)' }}>
            <FolderLock size={18} color="#fff" />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>CloudVault Shared File</div>
            {data?.file?.name && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{data.file.name}</div>}
          </div>
        </div>
        <button onClick={onGoHome} className="btn btn-ghost btn-sm">
          <ExternalLink size={14} /> {embedded ? 'Back to Dashboard' : 'Open Workspace'}
        </button>
      </div>

      <div className="glass-panel" style={{ width: '100%', maxWidth: showInline ? '960px' : '480px', padding: showInline ? 0 : '36px 32px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.9), 0 0 30px var(--primary-glow)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-subtle)' }}>Verifying share link...</div>
        ) : error && !showInline ? (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ width: 46, height: 46, borderRadius: '50%', background: 'rgba(244,63,94,0.15)', color: 'var(--accent-rose)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
              <AlertCircle size={24} />
            </div>
            <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 6 }}>Link Inactive</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 24 }}>{error}</div>
            <button onClick={onGoHome} className="btn btn-secondary">{embedded ? 'Back to Dashboard' : 'Go to Workspace'}</button>
          </div>
        ) : showInline ? (
          /* ── INLINE PREVIEW / EDIT ── */
          <div>
            {/* Toolbar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', borderBottom: '1px solid var(--border-glass)', flexWrap: 'wrap', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <FileText size={16} style={{ color: 'var(--accent-cyan)' }} />
                <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>{data.file?.name}</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-subtle)' }}>{formatBytes(data.file?.size)}</span>
                {canEdit && (
                  <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '2px 7px', borderRadius: '9999px', background: 'rgba(6,182,212,0.15)', color: 'var(--accent-cyan)', border: '1px solid rgba(6,182,212,0.3)' }}>
                    ✏️ Editing Enabled
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {canEdit && (
                  <>
                    <button onClick={() => setMode(mode === 'edit' ? 'view' : 'edit')} className={`btn btn-sm ${mode === 'edit' ? 'btn-primary' : 'btn-secondary'}`}>
                      {mode === 'edit' ? <Eye size={13} /> : <Pencil size={13} />}
                      <span>{mode === 'edit' ? 'Preview' : 'Edit'}</span>
                    </button>
                    {mode === 'edit' && (
                      <button onClick={handleSaveFile} disabled={saving} className="btn btn-sm btn-ghost" style={{ color: 'var(--accent-emerald)' }}>
                        {saved ? <><Check size={13} /><span>Saved!</span></> : <><Save size={13} /><span>{saving ? 'Saving...' : 'Save File'}</span></>}
                      </button>
                    )}
                  </>
                )}
                <button onClick={copyContent} className="btn btn-ghost btn-sm">
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
                <button onClick={handleDownload} disabled={downloading} className="btn btn-sm btn-secondary">
                  <Download size={13} /><span>{downloading ? '...' : 'Download'}</span>
                </button>
              </div>
            </div>

            {error && <div style={{ padding: '10px 18px', background: 'rgba(244,63,94,0.12)', color: 'var(--accent-rose)', fontSize: '0.84rem' }}>{error}</div>}

            {/* Content */}
            {mode === 'edit' && canEdit ? (
              <textarea
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                spellCheck={false}
                style={{ width: '100%', minHeight: '65vh', padding: '20px', background: 'var(--bg-primary)', color: 'var(--text-main)', fontFamily: "'Fira Code','Cascadia Code','Consolas',monospace", fontSize: '0.88rem', lineHeight: 1.7, border: 'none', outline: 'none', resize: 'vertical', display: 'block' }}
              />
            ) : (
              <pre style={{ margin: 0, padding: '20px', minHeight: '65vh', maxHeight: '75vh', overflowY: 'auto', fontFamily: "'Fira Code','Cascadia Code','Consolas',monospace", fontSize: '0.88rem', lineHeight: 1.7, color: 'var(--text-main)', background: 'var(--bg-primary)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {loadingContent ? 'Loading...' : fileContent}
              </pre>
            )}

            {/* Footer */}
            <div style={{ padding: '8px 18px', borderTop: '1px solid var(--border-glass)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Shield size={11} style={{ color: 'var(--accent-emerald)' }} /> Protected by CloudVault</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Clock size={11} /> Expires: {new Date(data.expiresAt).toLocaleString()}</div>
            </div>
          </div>
        ) : (
          /* ── DOWNLOAD / PASSWORD FLOW ── */
          <div>
            <div style={{ background: 'var(--bg-tertiary)', padding: '18px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-glass)', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-sm)', background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                  <FileCheck size={20} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.98rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{data?.file?.name}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-subtle)', marginTop: 2 }}>{formatBytes(data?.file?.size)}</div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.78rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-glass)', paddingTop: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Clock size={13} style={{ color: 'var(--text-subtle)' }} /><span>Expires: {new Date(data?.expiresAt).toLocaleString()}</span></div>
                {data?.downloadsLeft !== null && <div>• Downloads Remaining: {data?.downloadsLeft}</div>}
                {data?.requiresLogin && <div style={{ color: 'var(--accent-amber)' }}>• Restricted: Login with authorized email required.</div>}
              </div>
            </div>

            {error && <div style={{ padding: '10px 14px', background: 'rgba(244,63,94,0.15)', color: 'var(--accent-rose)', borderRadius: 'var(--radius-sm)', marginBottom: 16, fontSize: '0.85rem' }}>{error}</div>}

            {data?.requiresPassword && !passwordSubmitted ? (
              <form onSubmit={handlePasswordUnlock}>
                <div className="input-group">
                  <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Lock size={14} style={{ color: 'var(--accent-amber)' }} /> Password Required
                  </label>
                  <input type="password" placeholder="Enter link password" className="input-field" value={password} onChange={(e) => setPassword(e.target.value)} required autoFocus />
                </div>
                <button type="submit" disabled={!password} className="btn btn-primary" style={{ width: '100%', padding: '12px' }}>
                  <Lock size={16} /><span>Unlock {isText ? '& Preview' : '& Download'}</span>
                </button>
              </form>
            ) : (
              <button onClick={handleDownload} disabled={downloading} className="btn btn-primary" style={{ width: '100%', padding: '12px' }}>
                <Download size={16} /><span>{downloading ? 'Downloading...' : 'Download File'}</span>
              </button>
            )}

            <div style={{ marginTop: 22, textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Shield size={13} style={{ color: 'var(--accent-emerald)' }} /> Protected by CloudVault Security Protocol
            </div>
          </div>
        )}
      </div>
    </div>
  );
}