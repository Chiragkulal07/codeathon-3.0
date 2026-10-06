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
        height: '64px',
        borderBottom: '1px solid var(--border-glass)',
        background: 'rgba(10, 13, 20, 0.8)',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}
    >
      {/* Left side: Room Indicator or Brand Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {currentRoom ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FolderOpen size={18} style={{ color: 'var(--primary)' }} />
            <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{currentRoom.name}</span>
            {currentRoom.myRole && (
              <span className={`badge badge-${currentRoom.myRole}`}>{currentRoom.myRole}</span>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.92rem' }}>
              CloudVault Workspace
            </span>
          </div>
        )}
      </div>

      {/* Right side: Live Status, Notifications, Profile */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {/* Live Socket Status */}
        <div
          title={connected ? 'Realtime Connected' : 'Disconnected'}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: '0.78rem',
            color: connected ? 'var(--accent-emerald)' : 'var(--text-subtle)',
            background: connected ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255, 255, 255, 0.05)',
            padding: '4px 10px',
            borderRadius: '9999px',
            border: `1px solid ${connected ? 'rgba(16, 185, 129, 0.25)' : 'transparent'}`,
          }}
        >
          {connected ? <Wifi size={14} /> : <WifiOff size={14} />}
          <span>{connected ? 'Live' : 'Offline'}</span>
        </div>

        {/* Notifications Popover */}
        <div style={{ position: 'relative' }} ref={notifRef}>
          <button
            onClick={() => setShowNotifications((prev) => !prev)}
            className="btn btn-secondary btn-icon"
            style={{ position: 'relative' }}
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: -4,
                  right: -4,
                  background: 'var(--accent-rose)',
                  color: '#fff',
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 10px rgba(244, 63, 94, 0.6)',
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
                top: 'calc(100% + 10px)',
                right: 0,
                width: '360px',
                maxHeight: '440px',
                display: 'flex',
                flexDirection: 'column',
                zIndex: 100,
                boxShadow: '0 20px 40px rgba(0,0,0,0.8)',
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
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Notifications</div>
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
                      padding: '30px 20px',
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
                        padding: '10px 12px',
                        borderRadius: 'var(--radius-sm)',
                        background: n.read ? 'transparent' : 'rgba(99, 102, 241, 0.08)',
                        borderLeft: n.read ? '3px solid transparent' : '3px solid var(--primary)',
                        marginBottom: 4,
                        cursor: 'pointer',
                        transition: 'background 0.2s',
                      }}
                    >
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-main)' }}>
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

        {/* User Profile Dropdown */}
        <div style={{ position: 'relative' }} ref={profileRef}>
          <button
            onClick={() => setShowProfile((prev) => !prev)}
            className="btn btn-secondary"
            style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <div
              style={{
                width: 26,
                height: 26,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent-cyan) 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '0.8rem',
                color: '#fff',
              }}
            >
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{user?.name}</span>
            <ChevronDown size={14} style={{ color: 'var(--text-subtle)' }} />
          </button>

          {showProfile && (
            <div
              className="glass-panel"
              style={{
                position: 'absolute',
                top: 'calc(100% + 10px)',
                right: 0,
                width: '220px',
                padding: '8px',
                zIndex: 100,
                boxShadow: '0 20px 40px rgba(0,0,0,0.8)',
              }}
            >
              <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-glass)' }}>
                <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{user?.name}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{user?.email}</div>
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
                <LogOut size={16} /> Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
