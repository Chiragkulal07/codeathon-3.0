import React, { useState } from 'react';
import { api } from '../../api/client';
import { useSocket } from '../../context/SocketContext';
import { X, FolderPlus } from 'lucide-react';

export default function CreateRoomModal({ isOpen, onClose, onCreated }) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { addToast } = useSocket();

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError('');

    try {
      const res = await api.createRoom(name.trim());
      addToast({ title: 'Room Created', message: `Room "${res.room.name}" created successfully!`, type: 'success' });
      setName('');
      onCreated(res.room);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to create room');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card" style={{ maxWidth: '450px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <FolderPlus size={20} style={{ color: 'var(--primary)' }} />
            <h3 style={{ fontSize: '1.1rem' }}>Create New Room</h3>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-icon">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && (
              <div style={{ padding: '10px 14px', background: 'rgba(244, 63, 94, 0.15)', color: 'var(--accent-rose)', borderRadius: 'var(--radius-sm)', marginBottom: 16, fontSize: '0.85rem' }}>
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
            <button type="button" onClick={onClose} className="btn btn-ghost">
              Cancel
            </button>
            <button type="submit" disabled={loading || !name.trim()} className="btn btn-primary">
              {loading ? 'Creating...' : 'Create Room'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
