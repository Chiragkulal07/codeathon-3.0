import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useSocket } from '../context/SocketContext';
import {
  FolderLock,
  FileText,
  HardDrive,
  Link2,
  TrendingUp,
  Download,
  Clock,
  User,
  Globe,
  Sparkles,
  RefreshCw,
} from 'lucide-react';

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const val = parseFloat((bytes / Math.pow(k, i)).toFixed(2));
  return `${val} ${sizes[i]}`;
}

export default function DashboardView({ onNavigateToRooms, onNavigateToLinks }) {
  const { socket } = useSocket();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(14);
  const [error, setError] = useState('');

  useEffect(() => {
    loadDashboard(days);
  }, [days]);

  // Auto-refresh dashboard when files are uploaded, deleted, or downloaded
  useEffect(() => {
    if (!socket) return;
    const handleRefresh = () => {
      loadDashboard(days);
    };
    socket.on('file:uploaded', handleRefresh);
    socket.on('file:deleted', handleRefresh);
    socket.on('notification', handleRefresh);
    return () => {
      socket.off('file:uploaded', handleRefresh);
      socket.off('file:deleted', handleRefresh);
      socket.off('notification', handleRefresh);
    };
  }, [socket, days]);

  const loadDashboard = async (selectedDays) => {
    setLoading(true);
    try {
      const res = await api.getDashboard(selectedDays);
      setData(res);
    } catch (err) {
      setError(err.message || 'Failed to load analytics dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="page-body" style={{ textAlign: 'center', padding: '100px 0' }}>
        <div style={{ color: 'var(--text-subtle)', fontSize: '1.1rem' }}>
          Aggregating cloud analytics...
        </div>
      </div>
    );
  }

  const totals = data?.totals || {};
  const links = data?.links || {};
  const downloads = data?.downloads || { perDay: [], topFiles: [] };
  const recentActivity = data?.recentActivity || [];

  const maxDownloadCount = Math.max(
    ...downloads.perDay.map((d) => d.count),
    1
  );

  return (
    <div className="page-body">
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 28,
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.8rem', display: 'flex', alignItems: 'center', gap: 10 }}>
            Workspace Analytics <Sparkles size={22} style={{ color: 'var(--accent-amber)' }} />
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: 4 }}>
            Real-time telemetry, storage metrics, and secure file transfer audits
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={() => loadDashboard(days)}
            className="btn btn-secondary btn-sm"
            title="Refresh Analytics"
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            <span>Refresh</span>
          </button>

          <select
            className="select-field"
            style={{ width: '140px' }}
            value={days}
            onChange={(e) => setDays(parseInt(e.target.value))}
          >
            <option value="7">Last 7 Days</option>
            <option value="14">Last 14 Days</option>
            <option value="30">Last 30 Days</option>
            <option value="90">Last 90 Days</option>
          </select>
        </div>
      </div>

      {error && (
        <div
          style={{
            padding: '12px 16px',
            background: 'rgba(244, 63, 94, 0.15)',
            color: 'var(--accent-rose)',
            borderRadius: 'var(--radius-md)',
            marginBottom: 24,
          }}
        >
          {error}
        </div>
      )}

      {/* KPI Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 20,
          marginBottom: 30,
        }}
      >
        {/* Total Rooms */}
        <div
          className="glass-panel glass-panel-hover"
          style={{ padding: '22px', cursor: 'pointer' }}
          onClick={onNavigateToRooms}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>
              Active Rooms
            </span>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(99, 102, 241, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--primary)',
              }}
            >
              <FolderLock size={20} />
            </div>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800 }}>{totals.rooms || 0}</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-subtle)', marginTop: 4 }}>
            Collaboration workspaces
          </div>
        </div>

        {/* Total Files */}
        <div
          className="glass-panel glass-panel-hover"
          style={{ padding: '22px', cursor: 'pointer' }}
          onClick={onNavigateToRooms}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>
              Accessible Files
            </span>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(6, 182, 212, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-cyan)',
              }}
            >
              <FileText size={20} />
            </div>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800 }}>{totals.files || 0}</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-subtle)', marginTop: 4 }}>
            Files available to you
          </div>
        </div>

        {/* Total Storage */}
        <div className="glass-panel glass-panel-hover" style={{ padding: '22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>
              Storage Consumed
            </span>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(16, 185, 129, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-emerald)',
              }}
            >
              <HardDrive size={20} />
            </div>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800 }}>
            {formatBytes(totals.storageBytes)}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-subtle)', marginTop: 4 }}>
            {(totals.storageBytes || 0).toLocaleString()} bytes • My uploads: {formatBytes(totals.myStorageBytes)}
          </div>
        </div>

        {/* Share Links */}
        <div
          className="glass-panel glass-panel-hover"
          style={{ padding: '22px', cursor: 'pointer' }}
          onClick={onNavigateToLinks}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>
              Active Share Links
            </span>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(245, 158, 11, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-amber)',
              }}
            >
              <Link2 size={20} />
            </div>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800 }}>{links.active || 0}</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-subtle)', marginTop: 4 }}>
            {links.total || 0} generated total
          </div>
        </div>
      </div>

      {/* Main Grid: Downloads Chart & Top Files */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
          gap: 24,
          marginBottom: 30,
        }}
      >
        {/* Download Trend Graph */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 20,
            }}
          >
            <div>
              <h3 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                <TrendingUp size={18} style={{ color: 'var(--primary)' }} />
                Downloads Activity Trend
              </h3>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {downloads.total} total downloads in the last {days} days
              </div>
            </div>
          </div>

          {/* Activity Bar Chart */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              gap: 8,
              height: '180px',
              padding: '10px 0',
              borderBottom: '1px solid var(--border-glass)',
            }}
          >
            {downloads.perDay.map((d) => {
              const heightPercent = Math.max((d.count / maxDownloadCount) * 100, 6);
              return (
                <div
                  key={d.date}
                  title={`${d.date}: ${d.count} downloads`}
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    height: '100%',
                    justifyContent: 'flex-end',
                  }}
                >
                  <div
                    style={{
                      width: '100%',
                      maxWidth: '28px',
                      height: `${heightPercent}%`,
                      background:
                        d.count > 0
                          ? 'linear-gradient(180deg, var(--primary) 0%, #4338ca 100%)'
                          : 'rgba(255,255,255,0.04)',
                      borderRadius: '4px 4px 0 0',
                      transition: 'all 0.3s ease',
                      boxShadow: d.count > 0 ? '0 0 10px var(--primary-glow)' : 'none',
                    }}
                  />
                  <div
                    style={{
                      fontSize: '0.65rem',
                      color: 'var(--text-subtle)',
                      marginTop: 6,
                      transform: 'rotate(-45deg)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {d.date.slice(5)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Downloaded Files */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Download size={18} style={{ color: 'var(--accent-cyan)' }} /> Top Downloaded Files
          </h3>

          {downloads.topFiles.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-subtle)', fontSize: '0.85rem' }}>
              No file downloads recorded yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {downloads.topFiles.map((f, i) => (
                <div
                  key={f.fileId}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    background: 'var(--bg-tertiary)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-glass)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: '50%',
                        background: 'rgba(255,255,255,0.06)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '0.78rem',
                        color: 'var(--text-muted)',
                      }}
                    >
                      {i + 1}
                    </div>
                    <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>
                      {f.name || 'File #' + f.fileId.slice(-6)}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--accent-cyan)' }}>
                      {f.count}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>downloads</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity Audit Feed */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '1.1rem', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Clock size={18} style={{ color: 'var(--accent-emerald)' }} /> Recent Activity Stream
        </h3>

        {recentActivity.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-subtle)', fontSize: '0.85rem' }}>
            No recent activity recorded yet.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {recentActivity.map((act) => (
              <div
                key={act.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  background: 'var(--bg-tertiary)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-glass)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      background:
                        act.source === 'link'
                          ? 'rgba(99, 102, 241, 0.15)'
                          : 'rgba(16, 185, 129, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color:
                        act.source === 'link'
                          ? 'var(--primary)'
                          : 'var(--accent-emerald)',
                    }}
                  >
                    <Download size={15} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 600 }}>
                      <span style={{ color: '#fff' }}>{act.email}</span> downloaded{' '}
                      <span style={{ color: 'var(--primary)' }}>"{act.file || 'File'}"</span>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-subtle)', marginTop: 2 }}>
                      {new Date(act.at).toLocaleString()}
                    </div>
                  </div>
                </div>

                <span
                  className="badge"
                  style={{
                    background: act.source === 'link' ? 'rgba(99, 102, 241, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                    color: act.source === 'link' ? 'var(--primary)' : 'var(--accent-emerald)',
                    border: `1px solid ${act.source === 'link' ? 'rgba(99, 102, 241, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
                  }}
                >
                  via {act.source}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
