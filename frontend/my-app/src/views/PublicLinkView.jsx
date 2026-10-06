import React, { useState, useEffect } from 'react';
import { api, getStoredTokens } from '../api/client';
import {
  FolderLock,
  Download,
  Lock,
  Calendar,
  AlertCircle,
  FileCheck,
  Shield,
  Clock,
} from 'lucide-react';

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default function PublicLinkView({ code, onGoHome }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    resolveLink();
  }, [code]);

  const resolveLink = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.resolvePublicLink(code);
      setData(res);
    } catch (err) {
      setError(err.message || 'This link is invalid, expired, or revoked.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (e) => {
    if (e) e.preventDefault();
    if (data?.requiresPassword && !password) return;

    setDownloading(true);
    setError('');

    try {
      const downloadUrl = api.downloadPublicLinkUrl(code);
      const headers = {};
      const { accessToken } = getStoredTokens();
      if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
      if (password) headers['x-link-password'] = password;

      const res = await fetch(downloadUrl, {
        method: data?.requiresPassword ? 'POST' : 'GET',
        headers: {
          ...headers,
          ...(data?.requiresPassword ? { 'Content-Type': 'application/json' } : {}),
        },
        body: data?.requiresPassword ? JSON.stringify({ password }) : undefined,
      });

      if (!res.ok) {
        let errMessage = 'Download failed';
        try {
          const errJson = await res.json();
          errMessage = errJson.message || errMessage;
        } catch {
          // ignore
        }
        throw new Error(errMessage);
      }

      // Trigger native browser download via blob
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = data?.file?.name || 'downloaded-file';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(err.message || 'Download failed');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100vw',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        position: 'relative',
        zIndex: 10,
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '480px',
          padding: '36px 32px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.9), 0 0 30px var(--primary-glow)',
        }}
      >
        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div
            style={{
              width: 50,
              height: 50,
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent-cyan) 100%)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 25px var(--primary-glow)',
              marginBottom: 14,
            }}
          >
            <FolderLock size={26} color="#fff" />
          </div>
          <h2 style={{ fontSize: '1.45rem', fontWeight: 800 }}>CloudVault Secure Share</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: 3 }}>
            Encrypted End-to-End File Delivery
          </p>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-subtle)' }}>
            Verifying share link security token...
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div
              style={{
                width: 46,
                height: 46,
                borderRadius: '50%',
                background: 'rgba(244, 63, 94, 0.15)',
                color: 'var(--accent-rose)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 14,
              }}
            >
              <AlertCircle size={24} />
            </div>
            <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#fff', marginBottom: 6 }}>
              Link Inactive
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 24 }}>
              {error}
            </div>
            <button onClick={onGoHome} className="btn btn-secondary">
              Go to Workspace
            </button>
          </div>
        ) : (
          <div>
            {/* File Details Card */}
            <div
              style={{
                background: 'var(--bg-tertiary)',
                padding: '18px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-glass)',
                marginBottom: 20,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(99, 102, 241, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--primary)',
                  }}
                >
                  <FileCheck size={20} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: '0.98rem',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {data.file?.name}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-subtle)', marginTop: 2 }}>
                    {formatBytes(data.file?.size)}
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                  fontSize: '0.78rem',
                  color: 'var(--text-muted)',
                  borderTop: '1px solid var(--border-glass)',
                  paddingTop: 10,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Clock size={13} style={{ color: 'var(--text-subtle)' }} />
                  <span>Expires: {new Date(data.expiresAt).toLocaleString()}</span>
                </div>
                {data.downloadsLeft !== null && (
                  <div>• Downloads Remaining: {data.downloadsLeft}</div>
                )}
                {data.requiresLogin && (
                  <div style={{ color: 'var(--accent-amber)' }}>
                    • Restricted: You must be logged in with an authorized email.
                  </div>
                )}
              </div>
            </div>

            {/* Password Form if Required */}
            {data.requiresPassword ? (
              <form onSubmit={handleDownload}>
                <div className="input-group">
                  <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Lock size={14} style={{ color: 'var(--accent-amber)' }} /> Password Required
                  </label>
                  <input
                    type="password"
                    placeholder="Enter link password"
                    className="input-field"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoFocus
                  />
                </div>

                <button
                  type="submit"
                  disabled={downloading || !password}
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '12px' }}
                >
                  <Download size={16} />
                  <span>{downloading ? 'Decrypting & Downloading...' : 'Unlock & Download File'}</span>
                </button>
              </form>
            ) : (
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="btn btn-primary"
                style={{ width: '100%', padding: '12px' }}
              >
                <Download size={16} />
                <span>{downloading ? 'Downloading...' : 'Download File'}</span>
              </button>
            )}

            <div
              style={{
                marginTop: 22,
                textAlign: 'center',
                fontSize: '0.75rem',
                color: 'var(--text-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              <Shield size={13} style={{ color: 'var(--accent-emerald)' }} />
              Protected by CloudVault Security Protocol
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
