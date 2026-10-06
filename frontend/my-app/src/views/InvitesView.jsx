import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useSocket } from '../context/SocketContext';
import {
  Mail,
  Check,
  X,
  FolderPlus,
  RefreshCw,
  Sparkles,
  LogIn,
  KeyRound,
  Shield,
  ArrowRight,
  UserCheck,
} from 'lucide-react';

export default function InvitesView({ onInviteAccepted }) {
  const { addToast, socket } = useSocket();
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  // Manual Join state
  const [joinRoomIdInput, setJoinRoomIdInput] = useState('');
  const [joiningDirectly, setJoiningDirectly] = useState(false);
  const [joinError, setJoinError] = useState('');

  useEffect(() => {
    loadInvites();

    if (socket) {
      socket.on('invite:received', (newInvite) => {
        setInvites((prev) => [newInvite, ...prev.filter((i) => i.id !== newInvite.id)]);
        addToast({
          title: 'New Invitation!',
          message: `Invited to join "${newInvite.room?.name}"`,
          type: 'info',
        });
      });
      return () => {
        socket.off('invite:received');
      };
    }
  }, [socket]);

  const loadInvites = async () => {
    setLoading(true);
    try {
      const res = await api.getMyInvites();
      setInvites(res.invites || []);
    } catch (err) {
      addToast({ title: 'Error', message: err.message || 'Failed to fetch invites', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (invite) => {
    setProcessingId(invite.id);
    try {
      const res = await api.acceptInvite(invite.id);
      setInvites((prev) => prev.filter((i) => i.id !== invite.id));
      addToast({
        title: 'Joined Workspace!',
        message: `You successfully joined "${invite.room?.name}" as ${invite.role}`,
        type: 'success',
      });
      if (onInviteAccepted) onInviteAccepted(res.room);
    } catch (err) {
      addToast({ title: 'Error', message: err.message, type: 'error' });
    } finally {
      setProcessingId(null);
    }
  };

  const handleDecline = async (invite) => {
    setProcessingId(invite.id);
    try {
      await api.declineInvite(invite.id);
      setInvites((prev) => prev.filter((i) => i.id !== invite.id));
      addToast({ title: 'Invite Declined', message: 'Invitation declined', type: 'info' });
    } catch (err) {
      addToast({ title: 'Error', message: err.message, type: 'error' });
    } finally {
      setProcessingId(null);
    }
  };

  const handleDirectRoomJoin = async (e) => {
    e.preventDefault();
    if (!joinRoomIdInput.trim()) return;
    setJoiningDirectly(true);
    setJoinError('');

    try {
      const res = await api.joinRoom(joinRoomIdInput.trim());
      addToast({
        title: 'Joined Room!',
        message: res.message || 'Successfully joined room',
        type: 'success',
      });
      setJoinRoomIdInput('');
      if (onInviteAccepted && res.room) {
        onInviteAccepted(res.room);
      }
    } catch (err) {
      setJoinError(err.message || 'Failed to join room. Verify the Room ID.');
    } finally {
      setJoiningDirectly(false);
    }
  };

  return (
    <div className="page-body">
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: '1.8rem', display: 'flex', alignItems: 'center', gap: 12 }}>
          <Mail size={26} style={{ color: 'var(--primary)' }} /> Workspace Invitations & Quick Join
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: 4 }}>
          Join team workspaces shared with your email address or enter a Room ID directly
        </p>
      </div>

      {/* Direct Room ID Join Panel */}
      <div
        className="glass-panel"
        style={{
          padding: '22px 26px',
          marginBottom: 32,
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(6, 182, 212, 0.08) 100%)',
          border: '1px solid rgba(99, 102, 241, 0.25)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <KeyRound size={20} style={{ color: 'var(--accent-cyan)' }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: '1rem' }}>Have a Room ID or Join Code?</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Enter the Room ID shared by an admin to join their workspace immediately
            </div>
          </div>
        </div>

        {joinError && (
          <div
            style={{
              padding: '8px 12px',
              background: 'rgba(244, 63, 94, 0.15)',
              color: 'var(--accent-rose)',
              borderRadius: 'var(--radius-sm)',
              marginBottom: 12,
              fontSize: '0.82rem',
            }}
          >
            {joinError}
          </div>
        )}

        <form onSubmit={handleDirectRoomJoin} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Paste Room ID (e.g. 66f8e710a...)"
            className="input-field"
            style={{ flex: 1, minWidth: '240px', fontFamily: 'monospace' }}
            value={joinRoomIdInput}
            onChange={(e) => setJoinRoomIdInput(e.target.value)}
            required
          />
          <button
            type="submit"
            disabled={joiningDirectly || !joinRoomIdInput.trim()}
            className="btn btn-primary"
            style={{ padding: '10px 22px', fontWeight: 700 }}
          >
            {joiningDirectly ? (
              'Joining...'
            ) : (
              <>
                <LogIn size={16} /> <span>Join Room Now</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Invitations Section Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
        }}
      >
        <div style={{ fontSize: '1.15rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>Pending Email Invitations</span>
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '9999px',
              background: invites.length > 0 ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255,255,255,0.06)',
              color: invites.length > 0 ? 'var(--primary)' : 'var(--text-subtle)',
            }}
          >
            {invites.length}
          </span>
        </div>

        <button onClick={loadInvites} className="btn btn-ghost btn-sm" style={{ gap: 6 }}>
          <RefreshCw size={14} /> <span>Refresh</span>
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-subtle)' }}>
          Checking workspace invitations...
        </div>
      ) : invites.length === 0 ? (
        <div
          className="glass-panel"
          style={{ textAlign: 'center', padding: '70px 20px', color: 'var(--text-subtle)' }}
        >
          <Mail size={44} style={{ marginBottom: 12, opacity: 0.35 }} />
          <div style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-muted)' }}>
            No pending email invitations
          </div>
          <div style={{ fontSize: '0.82rem', marginTop: 4, maxWidth: '420px', margin: '6px auto 0 auto' }}>
            When a team admin invites your email to their room, it will show up here automatically with a join button.
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {invites.map((inv) => (
            <div
              key={inv.id}
              className="glass-panel glass-panel-hover"
              style={{
                padding: '20px 24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 16,
                borderLeft: '4px solid var(--primary)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 'var(--radius-md)',
                    background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(6, 182, 212, 0.2) 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--primary)',
                    boxShadow: '0 0 15px rgba(99, 102, 241, 0.2)',
                  }}
                >
                  <FolderPlus size={24} />
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: '1.15rem', fontWeight: 800 }}>
                      {inv.room?.name || 'Workspace Room'}
                    </span>
                    <span className={`badge badge-${inv.role}`} style={{ fontSize: '0.72rem' }}>
                      {inv.role} Role
                    </span>
                  </div>
                  <div style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginTop: 4 }}>
                    Invited by{' '}
                    <strong style={{ color: 'var(--text-main)' }}>
                      {inv.invitedBy?.name || inv.invitedBy?.email}
                    </strong>{' '}
                    • Received {new Date(inv.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button
                  onClick={() => handleDecline(inv)}
                  disabled={processingId === inv.id}
                  className="btn btn-ghost"
                  style={{ color: 'var(--accent-rose)' }}
                >
                  <X size={16} /> Decline
                </button>

                <button
                  onClick={() => handleAccept(inv)}
                  disabled={processingId === inv.id}
                  className="btn btn-primary"
                  style={{
                    padding: '10px 20px',
                    fontWeight: 700,
                    boxShadow: '0 4px 14px var(--primary-glow)',
                  }}
                >
                  <UserCheck size={16} />
                  <span>{processingId === inv.id ? 'Joining...' : 'Accept & Join Room'}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
