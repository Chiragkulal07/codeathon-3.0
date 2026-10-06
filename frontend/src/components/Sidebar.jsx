import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  FolderLock,
  Link2,
  Mail,
  Plus,
  Shield,
  Layers,
  LogOut,
  User,
} from 'lucide-react';

export default function Sidebar({
  activeView,
  setActiveView,
  rooms = [],
  currentRoomId,
  onSelectRoom,
  onOpenCreateRoom,
  pendingInvitesCount = 0,
}) {
  const { user, logout } = useAuth();

  return (
    <aside
      style={{
        width: '260px',
        borderRight: '1px solid var(--border-glass)',
        background: 'var(--bg-secondary)',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        flexShrink: 0,
      }}
    >
      {/* Brand Header */}
      <div
        style={{
          height: '64px',
          padding: '0 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          borderBottom: '1px solid var(--border-glass)',
        }}
      >
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: 'var(--radius-sm)',
            background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent-cyan) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 15px var(--primary-glow)',
          }}
        >
          <FolderLock size={20} color="#fff" />
        </div>
        <div>
          <div style={{ fontWeight: 800, fontSize: '1.05rem', letterSpacing: '-0.02em' }}>
            CloudVault
          </div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-subtle)', fontWeight: 600 }}>
            SECURE MERN COLLAB
          </div>
        </div>
      </div>

      {/* Main Navigation */}
      <div style={{ padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        <button
          onClick={() => setActiveView('dashboard')}
          className={`btn ${activeView === 'dashboard' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ width: '100%', justifyContent: 'flex-start', padding: '10px 14px' }}
        >
          <LayoutDashboard size={18} />
          <span>Dashboard</span>
        </button>

        <button
          onClick={() => setActiveView('rooms')}
          className={`btn ${activeView === 'rooms' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ width: '100%', justifyContent: 'flex-start', padding: '10px 14px' }}
        >
          <Layers size={18} />
          <span>Rooms & Files</span>
        </button>

        <button
          onClick={() => setActiveView('links')}
          className={`btn ${activeView === 'links' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ width: '100%', justifyContent: 'flex-start', padding: '10px 14px' }}
        >
          <Link2 size={18} />
          <span>Share Links</span>
        </button>

        <button
          onClick={() => setActiveView('invites')}
          className={`btn ${activeView === 'invites' ? 'btn-primary' : 'btn-ghost'}`}
          style={{
            width: '100%',
            justifyContent: 'space-between',
            padding: '10px 14px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Mail size={18} />
            <span>Invitations</span>
          </div>
          {pendingInvitesCount > 0 && (
            <span
              style={{
                background: 'var(--primary)',
                color: '#fff',
                fontSize: '0.7rem',
                fontWeight: 700,
                padding: '1px 7px',
                borderRadius: '9999px',
              }}
            >
              {pendingInvitesCount}
            </span>
          )}
        </button>
      </div>

      {/* Rooms Quick Switcher Section */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px',
          borderTop: '1px solid var(--border-glass)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '4px 8px',
            marginBottom: 8,
          }}
        >
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              color: 'var(--text-subtle)',
              letterSpacing: '0.06em',
            }}
          >
            My Rooms ({rooms.length})
          </span>
          <button
            onClick={onOpenCreateRoom}
            className="btn btn-ghost btn-icon"
            title="Create Room"
            style={{ padding: 4, color: 'var(--primary)' }}
          >
            <Plus size={16} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {rooms.map((room) => {
            const isSelected = activeView === 'rooms' && currentRoomId === room.id;
            return (
              <button
                key={room.id}
                onClick={() => {
                  onSelectRoom(room.id);
                  setActiveView('rooms');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  background: isSelected ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                  border: isSelected
                    ? '1px solid rgba(99, 102, 241, 0.3)'
                    : '1px solid transparent',
                  color: isSelected ? '#fff' : 'var(--text-muted)',
                  fontSize: '0.85rem',
                  fontWeight: isSelected ? 600 : 500,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s ease',
                }}
              >
                <span
                  style={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: '140px',
                  }}
                >
                  {room.name}
                </span>
                {room.myRole && (
                  <span
                    className={`badge badge-${room.myRole}`}
                    style={{ fontSize: '0.62rem', padding: '1px 6px' }}
                  >
                    {room.myRole}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* User Info & Direct Logout Footer */}
      <div
        style={{
          padding: '14px 16px',
          borderTop: '1px solid var(--border-glass)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(0, 0, 0, 0.25)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent-cyan) 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '0.8rem',
              color: '#fff',
              flexShrink: 0,
            }}
          >
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div
              style={{
                fontSize: '0.82rem',
                fontWeight: 600,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {user?.name}
            </div>
            <div
              style={{
                fontSize: '0.7rem',
                color: 'var(--text-subtle)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {user?.email}
            </div>
          </div>
        </div>

        <button
          onClick={logout}
          className="btn btn-ghost btn-icon"
          title="Sign Out / Logout"
          style={{ color: 'var(--accent-rose)', padding: '6px' }}
        >
          <LogOut size={16} />
        </button>
      </div>
    </aside>
  );
}
