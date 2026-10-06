import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useSocket } from '../context/SocketContext';
import { Mail, Check, X, Shield, Clock, FolderPlus } from 'lucide-react';

export default function InvitesView({ onInviteAccepted }) {
  const { addToast } = useSocket();
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => {
    loadInvites();
  }, []);

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
        title: 'Invite Accepted',
        message: `You joined "${invite.room.name}" as ${invite.role}`,
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

  return (
    <div className="page-body">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.8rem', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Mail size={24} style={{ color: 'var(--primary)' }} /> Room Invitations
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: 4 }}>
          Review and respond to collaboration requests from other team members
        </p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-subtle)' }}>
          Checking inbox...
        </div>
      ) : invites.length === 0 ? (
        <div
          className="glass-panel"
          style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--text-subtle)' }}
        >
          <Mail size={44} style={{ marginBottom: 12, opacity: 0.4 }} />
          <div style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-muted)' }}>
            No pending invitations
          </div>
          <div style={{ fontSize: '0.82rem', marginTop: 4 }}>
            When someone invites you to their workspace, it will show up here.
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {invites.map((inv) => (
            <div
              key={inv.id}
              className="glass-panel"
              style={{
                padding: '20px 24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 16,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(99, 102, 241, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--primary)',
                  }}
                >
                  <FolderPlus size={22} />
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                      {inv.room?.name || 'Workspace Room'}
                    </span>
                    <span className={`badge badge-${inv.role}`}>{inv.role} Role</span>
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 4 }}>
                    Invited by{' '}
                    <strong style={{ color: 'var(--text-main)' }}>
                      {inv.invitedBy?.name || inv.invitedBy?.email}
                    </strong>{' '}
                    • {new Date(inv.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>

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
                >
                  <Check size={16} /> Accept & Join
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
