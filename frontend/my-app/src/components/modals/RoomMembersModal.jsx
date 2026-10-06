import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import {
  X,
  UserPlus,
  Users,
  Shield,
  Trash2,
  Mail,
  Clock,
  Copy,
  Check,
} from 'lucide-react';

export default function RoomMembersModal({ isOpen, onClose, room, onRoomUpdated }) {
  const { user } = useAuth();
  const { addToast } = useSocket();
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('editor');
  const [inviting, setInviting] = useState(false);
  const [pendingInvites, setPendingInvites] = useState([]);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('members'); // 'members' | 'invites'

  const myRole = room?.myRole || 'viewer';
  const isOwner = myRole === 'owner';
  const isAdmin = isOwner || myRole === 'admin';

  useEffect(() => {
    if (isOpen && room && isAdmin) {
      loadPendingInvites();
    }
  }, [isOpen, room, isAdmin]);

  const loadPendingInvites = async () => {
    try {
      const res = await api.listRoomInvites(room.id);
      setPendingInvites(res.invites || []);
    } catch {
      // ignore
    }
  };

  const [copiedId, setCopiedId] = useState(false);

  const copyRoomId = () => {
    navigator.clipboard.writeText(room.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 3000);
    addToast({ title: 'Room ID Copied', message: `Copied ID: ${room.id}`, type: 'info' });
  };

  if (!isOpen || !room) return null;

  const handleSendInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setError('');

    try {
      await api.inviteMember(room.id, inviteEmail.trim(), inviteRole);
      addToast({
        title: 'Invite Sent',
        message: `Invitation sent to ${inviteEmail}`,
        type: 'success',
      });
      setInviteEmail('');
      loadPendingInvites();
    } catch (err) {
      setError(err.message || 'Failed to send invite');
    } finally {
      setInviting(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      const res = await api.changeMemberRole(room.id, userId, newRole);
      onRoomUpdated(res.room);
      addToast({ title: 'Role Updated', message: 'Member role changed', type: 'success' });
    } catch (err) {
      addToast({ title: 'Error', message: err.message, type: 'error' });
    }
  };

  const handleRemoveMember = async (userId, memberName) => {
    if (!window.confirm(`Are you sure you want to remove ${memberName || 'this member'}?`)) return;
    try {
      await api.removeMember(room.id, userId);
      const updated = {
        ...room,
        members: room.members.filter((m) => String(m.userId) !== String(userId)),
      };
      onRoomUpdated(updated);
      addToast({ title: 'Member Removed', message: 'Member was removed from the room', type: 'info' });
    } catch (err) {
      addToast({ title: 'Error', message: err.message, type: 'error' });
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card" style={{ maxWidth: '600px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Users size={20} style={{ color: 'var(--primary)' }} />
            <div>
              <h3 style={{ fontSize: '1.1rem' }}>Room Members & Invites</h3>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                <span>{room.name}</span>
                <span>•</span>
                <button
                  onClick={copyRoomId}
                  className="btn btn-ghost btn-sm"
                  style={{
                    fontSize: '0.72rem',
                    padding: '1px 6px',
                    background: 'rgba(99, 102, 241, 0.12)',
                    border: '1px solid rgba(99, 102, 241, 0.3)',
                    color: 'var(--primary)',
                    fontFamily: 'monospace',
                    gap: 4,
                  }}
                  title="Click to copy Room ID"
                >
                  {copiedId ? <Check size={11} /> : <Copy size={11} />}
                  <span>{copiedId ? 'Copied ID!' : `ID: ${room.id}`}</span>
                </button>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-icon">
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid var(--border-glass)',
            padding: '0 24px',
            background: 'rgba(0,0,0,0.1)',
          }}
        >
          <button
            onClick={() => setActiveTab('members')}
            className="btn btn-ghost"
            style={{
              borderRadius: 0,
              borderBottom: activeTab === 'members' ? '2px solid var(--primary)' : '2px solid transparent',
              color: activeTab === 'members' ? '#fff' : 'var(--text-muted)',
              padding: '12px 16px',
            }}
          >
            Members ({room.members?.length || 0})
          </button>
          {isAdmin && (
            <button
              onClick={() => setActiveTab('invites')}
              className="btn btn-ghost"
              style={{
                borderRadius: 0,
                borderBottom: activeTab === 'invites' ? '2px solid var(--primary)' : '2px solid transparent',
                color: activeTab === 'invites' ? '#fff' : 'var(--text-muted)',
                padding: '12px 16px',
              }}
            >
              Pending Invites ({pendingInvites.length})
            </button>
          )}
        </div>

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

          {/* Invite Form (Admins only) */}
          {isAdmin && (
            <form
              onSubmit={handleSendInvite}
              style={{
                background: 'var(--bg-tertiary)',
                padding: '14px',
                borderRadius: 'var(--radius-md)',
                marginBottom: 20,
                border: '1px solid var(--border-glass)',
              }}
            >
              <div style={{ fontSize: '0.82rem', fontWeight: 600, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                <UserPlus size={16} style={{ color: 'var(--accent-cyan)' }} /> Invite New Colleague
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <input
                  type="email"
                  placeholder="collaborator@example.com"
                  className="input-field"
                  style={{ flex: 1 }}
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                />
                <select
                  className="select-field"
                  style={{ width: '120px' }}
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                >
                  <option value="viewer">Viewer</option>
                  <option value="editor">Editor</option>
                  {isOwner && <option value="admin">Admin</option>}
                </select>
                <button type="submit" disabled={inviting || !inviteEmail.trim()} className="btn btn-primary btn-sm">
                  {inviting ? 'Sending...' : 'Invite'}
                </button>
              </div>
            </form>
          )}

          {activeTab === 'members' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {room.members?.map((m) => {
                const isSelf = String(m.userId) === String(user?.id);
                const isTargetOwner = m.role === 'owner';
                const canModifyRole = isAdmin && !isTargetOwner && !isSelf && (isOwner || m.role !== 'admin');
                const canRemove = !isTargetOwner && (isAdmin || isSelf) && (isOwner || m.role !== 'admin' || isSelf);

                return (
                  <div
                    key={m.userId}
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          background: 'rgba(255,255,255,0.06)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 600,
                          fontSize: '0.85rem',
                        }}
                      >
                        {m.email?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontSize: '0.88rem', fontWeight: 600 }}>
                          {m.email} {isSelf && <span style={{ color: 'var(--text-subtle)', fontSize: '0.75rem' }}>(You)</span>}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {canModifyRole ? (
                        <select
                          className="select-field"
                          style={{ padding: '4px 8px', fontSize: '0.78rem', width: '95px' }}
                          value={m.role}
                          onChange={(e) => handleRoleChange(m.userId, e.target.value)}
                        >
                          <option value="viewer">Viewer</option>
                          <option value="editor">Editor</option>
                          {isOwner && <option value="admin">Admin</option>}
                        </select>
                      ) : (
                        <span className={`badge badge-${m.role}`}>{m.role}</span>
                      )}

                      {canRemove && (
                        <button
                          onClick={() => handleRemoveMember(m.userId, m.email)}
                          className="btn btn-ghost btn-icon"
                          title={isSelf ? 'Leave Room' : 'Remove Member'}
                          style={{ padding: 6, color: 'var(--accent-rose)' }}
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'invites' && (
            <div>
              {pendingInvites.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-subtle)', fontSize: '0.85rem' }}>
                  No pending invites for this room.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {pendingInvites.map((inv) => (
                    <div
                      key={inv.id}
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Mail size={16} style={{ color: 'var(--accent-amber)' }} />
                        <div>
                          <div style={{ fontSize: '0.88rem', fontWeight: 600 }}>{inv.email}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-subtle)', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Clock size={12} /> Pending invitation
                          </div>
                        </div>
                      </div>
                      <span className={`badge badge-${inv.role}`}>{inv.role}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="btn btn-secondary">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
