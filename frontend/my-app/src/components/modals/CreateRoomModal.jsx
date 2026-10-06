import React, { useState } from 'react';
import { api } from '../../api/client';
import { useSocket } from '../../context/SocketContext';
import { X, FolderPlus, Copy, Check, ArrowRight } from 'lucide-react';

export default function CreateRoomModal({ isOpen, onClose, onCreated }) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [createdRoom, setCreatedRoom] = useState(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const { addToast } = useSocket();

  if (!isOpen) return null;

  const handleClose = () => {
    setName('');
    setCreatedRoom(null);
    setCopied(false);
    setError('');
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError('');

    try {
      const res = await api.createRoom(name.trim());
      addToast({ title: 'Room Created', message: `Room "${res.room.name}" created successfully!`, type: 'success' });
      setCreatedRoom(res.room);
    } catch (err) {
      setError(err.message || 'Failed to create room');
    } finally {
      setLoading(false);
    }
  };

  const copyRoomId = () => {
    if (!createdRoom) return;
    navigator.clipboard.writeText(createdRoom.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
    addToast({ title: 'Room ID Copied', message: `Copied ID: ${createdRoom.id}`, type: 'info' });
  };

  const handleFinish = () => {
    if (createdRoom) {
      onCreated(createdRoom);
    }
    handleClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card" style={{ maxWidth: '480px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <FolderPlus size={20} style={{ color: 'var(--primary)' }} />
            <h3 style={{ fontSize: '1.1rem' }}>Create New Room</h3>
          </div>
          <button onClick={handleClose} className="btn btn-ghost btn-icon">
            <X size={18} />
          </button>
        </div>

        {createdRoom ? (
          <div className="modal-body">
            <div
              style={{
                textAlign: 'center',
                padding: '20px 16px',
                background: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                borderRadius: 'var(--radius-md)',
                marginBottom: 20,
              }}
            >
              <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--accent-emerald)', marginBottom: 4 }}>
                ✨ Room Created Successfully!
              </div>
              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)', marginTop: 4 }}>
                {createdRoom.name}
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">Shareable Room ID</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  readOnly
                  value={createdRoom.id}
                  className="input-field"
                  style={{ fontFamily: 'monospace', fontSize: '0.88rem', fontWeight: 600 }}
                />
                <button onClick={copyRoomId} className="btn btn-primary" style={{ minWidth: '100px' }}>
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  <span>{copied ? 'Copied' : 'Copy ID'}</span>
                </button>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', marginTop: 6 }}>
                Share this Room ID with colleagues so they can quickly join from their Invitations tab.
              </div>
            </div>

            <div className="modal-footer" style={{ padding: '16px 0 0 0' }}>
              <button onClick={handleFinish} className="btn btn-primary" style={{ width: '100%', padding: '12px' }}>
                <span>Open Workspace Room</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
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

              <div className="input-group">
                <label className="input-label">Room / Workspace Name</label>
                <input
                  type="text"
                  placeholder="e.g. Q4 Security Audit, Product Launch..."
                  className="input-field"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={60}
                  required
                  autoFocus
                />
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" onClick={handleClose} className="btn btn-ghost">
                Cancel
              </button>
              <button type="submit" disabled={loading || !name.trim()} className="btn btn-primary">
                {loading ? 'Creating...' : 'Create Room'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
