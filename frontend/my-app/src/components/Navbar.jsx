import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import {
  Bell,
  CheckCheck,
  LogOut,
  User,
  Wifi,
  WifiOff,
  FolderOpen,
  ChevronDown,
  Shield,
  Sparkles,
} from 'lucide-react';

export default function Navbar({ currentRoom, rooms = [], onSelectRoom }) {
  const { user, logout } = useAuth();
  const { connected, notifications, unreadCount, markAsRead, markAllAsRead } = useSocket();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const notifRef = useRef(null);
  const profileRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setShowProfile(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header
      style={{
        height: '66px',
        borderBottom: '1px solid var(--border-glass)',
        background: 'rgba(7, 9, 14, 0.82)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 28px',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}
    >
      {/* Left side: Active Room Indicator & Role Badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {currentRoom ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(99, 102, 241, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--primary)',
              }}
            >
              <FolderOpen size={18} />
            </div>
            <span style={{ fontWeight: 700, fontSize: '1rem' }}>{currentRoom.name}</span>
            {currentRoom.myRole && (
              <span className={`badge badge-${currentRoom.myRole}`}>{currentRoom.myRole}</span>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sparkles size={18} style={{ color: 'var(--primary)' }} />
            <span style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.98rem' }}>
              CloudVault Collab Workspace
            </span>
          </div>
        )}
      </div>

      {/* Right side: Live Telemetry, Notifications & User Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        {/* Live Socket Connection Badge */}
        <div
          title={connected ? 'Real-time Socket Connected' : 'Disconnected from Socket Server'}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: '0.78rem',
            fontWeight: 600,
            color: connected ? 'var(--accent-emerald)' : 'var(--text-subtle)',
            background: connected ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255, 255, 255, 0.04)',
            padding: '5px 12px',
            borderRadius: '9999px',
            border: `1px solid ${connected ? 'rgba(16, 185, 129, 0.3)' : 'var(--border-glass)'}`,
            boxShadow: connected ? '0 0 12px rgba(16, 185, 129, 0.2)' : 'none',
          }}
        >
          {connected ? <div className="live-dot" /> : <WifiOff size={14} />}
          <span>{connected ? 'Live Sync' : 'Offline'}</span>
        </div>

        {/* Notifications Popover */}
        <div style={{ position: 'relative' }} ref={notifRef}>
          <button
            onClick={() => setShowNotifications((prev) => !prev)}
            className="btn btn-secondary btn-icon"
            style={{ position: 'relative', width: 38, height: 38, borderRadius: '50%' }}
            title="Notifications"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: -2,
                  right: -2,
                  background: 'var(--accent-rose)',
                  color: '#fff',
                  fontSize: '0.65rem',
                  fontWeight: 800,
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 10px rgba(244, 63, 94, 0.7)',
                }}
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div
              className="glass-panel"
              style={{
                position: 'absolute',
                top: 'calc(100% + 12px)',
                right: 0,
                width: '360px',
                maxHeight: '440px',
                display: 'flex',
                flexDirection: 'column',
                zIndex: 100,
                boxShadow: '0 20px 45px rgba(0,0,0,0.85)',
              }}
            >
              <div
                style={{
                  padding: '14px 18px',
                  borderBottom: '1px solid var(--border-glass)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>Notifications</div>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="btn btn-ghost btn-sm"
                    style={{ fontSize: '0.75rem', padding: '2px 8px' }}
                  >
                    <CheckCheck size={14} /> Mark all read
                  </button>
                )}
              </div>

              <div style={{ overflowY: 'auto', flex: 1, padding: '8px' }}>
                {notifications.length === 0 ? (
                  <div
                    style={{
                      padding: '36px 20px',
                      textAlign: 'center',
                      color: 'var(--text-subtle)',
                      fontSize: '0.85rem',
                    }}
                  >
                    No notifications yet
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => !n.read && markAsRead(n.id)}
                      style={{
                        padding: '10px 14px',
                        borderRadius: 'var(--radius-sm)',
                        background: n.read ? 'transparent' : 'rgba(99, 102, 241, 0.08)',
                        borderLeft: n.read ? '3px solid transparent' : '3px solid var(--primary)',
                        marginBottom: 4,
                        cursor: 'pointer',
                        transition: 'background 0.2s',
                      }}
                    >
                      <div style={{ fontSize: '0.84rem', color: 'var(--text-main)', lineHeight: 1.4 }}>
                        {n.message}
                      </div>
                      <div
                        style={{
                          fontSize: '0.7rem',
                          color: 'var(--text-subtle)',
                          marginTop: 4,
                        }}
                      >
                        {new Date(n.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Profile Pill */}
        <div style={{ position: 'relative' }} ref={profileRef}>
          <button
            onClick={() => setShowProfile((prev) => !prev)}
            className="btn btn-secondary"
            style={{
              padding: '5px 12px 5px 6px',
              borderRadius: '9999px',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent-cyan) 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '0.82rem',
                color: '#fff',
                boxShadow: '0 0 10px var(--primary-glow)',
              }}
            >
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{user?.name}</span>
            <ChevronDown size={14} style={{ color: 'var(--text-subtle)' }} />
          </button>

          {showProfile && (
            <div
              className="glass-panel"
              style={{
                position: 'absolute',
                top: 'calc(100% + 12px)',
                right: 0,
                width: '230px',
                padding: '8px',
                zIndex: 100,
                boxShadow: '0 20px 45px rgba(0,0,0,0.85)',
              }}
            >
              <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-glass)' }}>
                <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>{user?.name}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user?.email}
                </div>
              </div>
              <button
                onClick={logout}
                className="btn btn-ghost"
                style={{
                  width: '100%',
                  justifyContent: 'flex-start',
                  marginTop: 6,
                  color: 'var(--accent-rose)',
                  fontSize: '0.85rem',
                }}
              >
                <LogOut size={16} /> Sign Out
              </button>
            </div>
          )}
        </div>

        {/* Direct One-Click Logout Button */}
        <button
          onClick={logout}
          className="btn btn-danger btn-sm"
          title="Sign out of your account"
          style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
        >
          <LogOut size={15} />
          <span>Logout</span>
        </button>
      </div>
    </header>
  );
}
