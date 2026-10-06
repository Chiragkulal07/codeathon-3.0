import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  FolderLock,
  Link2,
  Mail,
  Plus,
  Layers,
  LogOut,
  FolderPlus,
  Sparkles,
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
        zIndex: 60,
      }}
    >
      {/* Brand Header */}
      <div
        style={{
          height: '66px',
          padding: '0 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          borderBottom: '1px solid var(--border-glass)',
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 'var(--radius-sm)',
            background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent-cyan) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 16px var(--primary-glow)',
          }}
        >
          <FolderLock size={20} color="#fff" />
        </div>
        <div>
          <div style={{ fontWeight: 800, fontSize: '1.1rem', letterSpacing: '-0.02em', background: 'linear-gradient(135deg, #fff 0%, #cbd5e1 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            CloudVault
          </div>
          <div style={{ fontSize: '0.66rem', color: 'var(--accent-cyan)', fontWeight: 700, letterSpacing: '0.06em' }}>
            ENTERPRISE COLLAB
          </div>
        </div>
      </div>

      {/* Main Navigation */}
      <div style={{ padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        <button
          onClick={() => setActiveView('dashboard')}
          className={`btn ${activeView === 'dashboard' ? 'btn-primary' : 'btn-ghost'}`}
          style={{
            width: '100%',
            justifyContent: 'flex-start',
            padding: '10px 14px',
            borderLeft: activeView === 'dashboard' ? '3px solid #fff' : '3px solid transparent',
          }}
        >
          <LayoutDashboard size={18} />
          <span>Dashboard</span>
        </button>

        <button
          onClick={() => setActiveView('rooms')}
          className={`btn ${activeView === 'rooms' ? 'btn-primary' : 'btn-ghost'}`}
          style={{
            width: '100%',
            justifyContent: 'flex-start',
            padding: '10px 14px',
            borderLeft: activeView === 'rooms' ? '3px solid #fff' : '3px solid transparent',
          }}
        >
          <Layers size={18} />
          <span>Rooms & Files</span>
        </button>

        <button
          onClick={() => setActiveView('links')}
          className={`btn ${activeView === 'links' ? 'btn-primary' : 'btn-ghost'}`}
          style={{
            width: '100%',
            justifyContent: 'flex-start',
            padding: '10px 14px',
            borderLeft: activeView === 'links' ? '3px solid #fff' : '3px solid transparent',
          }}
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
            borderLeft: activeView === 'invites' ? '3px solid #fff' : '3px solid transparent',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Mail size={18} />
            <div style={{ textAlign: 'left' }}>
              <div>Invitations</div>
              <div style={{ fontSize: '0.65rem', color: activeView === 'invites' ? 'rgba(255,255,255,0.7)' : 'var(--text-subtle)', fontWeight: 400 }}>
                Accept & Join Rooms
              </div>
            </div>
          </div>
          {pendingInvitesCount > 0 && (
            <span
              style={{
                background: 'var(--accent-rose)',
                color: '#fff',
                fontSize: '0.7rem',
                fontWeight: 800,
                padding: '2px 8px',
                borderRadius: '9999px',
                boxShadow: '0 0 10px rgba(244, 63, 94, 0.6)',
                animation: 'pulse 2s infinite',
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
            My Workspaces ({rooms.length})
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

        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
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
                  padding: '9px 12px',
                  borderRadius: 'var(--radius-sm)',
                  background: isSelected ? 'rgba(99, 102, 241, 0.18)' : 'transparent',
                  border: isSelected
                    ? '1px solid rgba(99, 102, 241, 0.35)'
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
          background: 'rgba(0, 0, 0, 0.3)',
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
              fontSize: '0.82rem',
              color: '#fff',
              flexShrink: 0,
            }}
          >
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div
              style={{
                fontSize: '0.84rem',
                fontWeight: 700,
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
