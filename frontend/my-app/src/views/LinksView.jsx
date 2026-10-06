import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useSocket } from '../context/SocketContext';
import {
  Link2,
  Search,
  Copy,
  Check,
  Ban,
  Lock,
  Download,
  Calendar,
  Layers,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default function LinksView() {
  const { addToast } = useSocket();
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState(''); // '' | 'active' | 'expired' | 'revoked'
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    loadLinks();
  }, [page, status]);

  const loadLinks = async () => {
    setLoading(true);
    try {
      const res = await api.listAllLinks({
        page,
        limit: 10,
        status: status || undefined,
        q: search || undefined,
      });
      setLinks(res.links || []);
      setTotalPages(res.totalPages || 1);
      setTotal(res.total || 0);
    } catch (err) {
      addToast({ title: 'Error', message: err.message || 'Failed to fetch links', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    loadLinks();
  };

  const handleCopyLink = (code, id) => {
    const fullUrl = `${window.location.origin}/s/${code}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
    addToast({ title: 'Copied', message: 'Link copied to clipboard', type: 'info' });
  };

  const handleRevoke = async (linkId) => {
    if (!window.confirm('Revoke this share link immediately?')) return;
    try {
      await api.revokeShareLink(linkId);
      setLinks((prev) =>
        prev.map((l) => (l.id === linkId ? { ...l, status: 'revoked' } : l))
      );
      addToast({ title: 'Link Revoked', message: 'The link is no longer accessible', type: 'info' });
    } catch (err) {
      addToast({ title: 'Error', message: err.message, type: 'error' });
    }
  };

  return (
    <div className="page-body">
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.8rem', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Link2 size={24} style={{ color: 'var(--accent-amber)' }} /> Secure Share Links History
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: 4 }}>
          Search, manage, monitor, and revoke all active and historical download links
        </p>
      </div>

      {/* Filters & Search Toolbar */}
      <div
        className="glass-panel"
        style={{
          padding: '16px 20px',
          marginBottom: 24,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        {/* Status Filter Tabs */}
        <div style={{ display: 'flex', gap: 6 }}>
          {[
            { label: 'All Links', value: '' },
            { label: 'Active', value: 'active' },
            { label: 'Expired', value: 'expired' },
            { label: 'Revoked', value: 'revoked' },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => {
                setStatus(tab.value);
                setPage(1);
              }}
              className={`btn btn-sm ${status === tab.value ? 'btn-primary' : 'btn-ghost'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: 8 }}>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="Search by file name..."
              className="input-field"
              style={{ paddingLeft: '34px', width: '240px', fontSize: '0.85rem' }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Search
              size={15}
              style={{
                position: 'absolute',
                left: 10,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-subtle)',
              }}
            />
          </div>
          <button type="submit" className="btn btn-secondary btn-sm">
            Search
          </button>
        </form>
      </div>

      {/* Links List Table */}
      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-subtle)' }}>
            Loading links...
          </div>
        ) : links.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-subtle)' }}>
            No share links found matching the criteria.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr
                  style={{
                    borderBottom: '1px solid var(--border-glass)',
                    background: 'rgba(0,0,0,0.15)',
                    fontSize: '0.78rem',
                    color: 'var(--text-subtle)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  <th style={{ padding: '14px 18px' }}>File & Room</th>
                  <th style={{ padding: '14px 18px' }}>Status</th>
                  <th style={{ padding: '14px 18px' }}>Downloads</th>
                  <th style={{ padding: '14px 18px' }}>Security</th>
                  <th style={{ padding: '14px 18px' }}>Expires</th>
                  <th style={{ padding: '14px 18px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {links.map((link) => (
                  <tr
                    key={link.id}
                    style={{
                      borderBottom: '1px solid var(--border-glass)',
                      fontSize: '0.88rem',
                      transition: 'background 0.15s',
                    }}
                  >
                    {/* File & Room */}
                    <td style={{ padding: '14px 18px' }}>
                      <div style={{ fontWeight: 600 }}>{link.file?.name || 'Deleted File'}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                        <Layers size={12} /> {link.room?.name || 'Unknown Room'} • {formatBytes(link.file?.size)}
                      </div>
                    </td>

                    {/* Status */}
                    <td style={{ padding: '14px 18px' }}>
                      <span className={`badge badge-${link.status}`}>{link.status}</span>
                    </td>

                    {/* Downloads */}
                    <td style={{ padding: '14px 18px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Download size={14} style={{ color: 'var(--text-subtle)' }} />
                        <span>
                          {link.downloadCount}
                          {link.maxDownloads ? ` / ${link.maxDownloads}` : ' (unlimited)'}
                        </span>
                      </div>
                    </td>

                    {/* Security */}
                    <td style={{ padding: '14px 18px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {link.passwordProtected && (
                          <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.15)', color: 'var(--accent-amber)' }}>
                            <Lock size={10} /> PW
                          </span>
                        )}
                        {link.allowedEmails?.length > 0 && (
                          <span className="badge" style={{ background: 'rgba(99, 102, 241, 0.15)', color: 'var(--primary)' }}>
                            Whitelist ({link.allowedEmails.length})
                          </span>
                        )}
                        {!link.passwordProtected && !link.allowedEmails?.length && (
                          <span style={{ color: 'var(--text-subtle)', fontSize: '0.8rem' }}>Public</span>
                        )}
                      </div>
                    </td>

                    {/* Expiry */}
                    <td style={{ padding: '14px 18px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Calendar size={13} style={{ color: 'var(--text-subtle)' }} />
                        <span>{new Date(link.expiresAt).toLocaleDateString()}</span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                        {link.status === 'active' && (
                          <>
                            <button
                              onClick={() => handleCopyLink(link.code, link.id)}
                              className="btn btn-secondary btn-sm"
                              title="Copy Public Link"
                            >
                              {copiedId === link.id ? <Check size={14} /> : <Copy size={14} />}
                              <span>{copiedId === link.id ? 'Copied' : 'Copy'}</span>
                            </button>

                            <button
                              onClick={() => handleRevoke(link.id)}
                              className="btn btn-ghost btn-sm"
                              title="Revoke Link"
                              style={{ color: 'var(--accent-rose)' }}
                            >
                              <Ban size={14} />
                              <span>Revoke</span>
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        <div
          style={{
            padding: '14px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderTop: '1px solid var(--border-glass)',
            background: 'rgba(0,0,0,0.1)',
            fontSize: '0.82rem',
            color: 'var(--text-muted)',
          }}
        >
          <div>
            Showing {links.length} of {total} total links
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="btn btn-secondary btn-icon"
              style={{ padding: '4px 8px' }}
            >
              <ChevronLeft size={16} />
            </button>
            <span>
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="btn btn-secondary btn-icon"
              style={{ padding: '4px 8px' }}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
