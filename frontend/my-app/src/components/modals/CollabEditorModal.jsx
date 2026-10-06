import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import {
  X,
  Code2,
  Users,
  Save,
  AlertTriangle,
  CheckCircle,
  Eye,
  PenTool,
} from 'lucide-react';

export default function CollabEditorModal({ isOpen, onClose, file }) {
  const { user } = useAuth();
  const { socket, addToast } = useSocket();

  const [content, setContent] = useState('');
  const [version, setVersion] = useState(1);
  const [canEdit, setCanEdit] = useState(false);
  const [viewers, setViewers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [conflictWarning, setConflictWarning] = useState(false);
  const [lastEditedBy, setLastEditedBy] = useState(null);
  const [error, setError] = useState('');

  const versionRef = useRef(version);
  versionRef.current = version;

  useEffect(() => {
    if (!isOpen || !file || !socket) return;

    setLoading(true);
    setError('');
    setConflictWarning(false);
    setLastEditedBy(null);

    // Join collaborative editing session
    socket.emit('file:join', { fileId: file.id }, (res) => {
      setLoading(false);
      if (res.ok) {
        setContent(res.content || '');
        setVersion(res.version);
        setCanEdit(res.canEdit);
        setViewers(res.viewers || []);
      } else {
        setError(res.error || 'Failed to open file for editing');
      }
    });

    // Listen to presence updates
    const handlePresence = (data) => {
      if (data.fileId === file.id) {
        setViewers(data.viewers || []);
      }
    };

    // Listen to live file updates from other collaborators
    const handleFileUpdated = (data) => {
      if (data.fileId === file.id) {
        setContent(data.content);
        setVersion(data.version);
        setLastEditedBy(data.by?.name || data.by?.email || 'Collaborator');
        setTimeout(() => setLastEditedBy(null), 4000);
      }
    };

    socket.on('presence:update', handlePresence);
    socket.on('file:updated', handleFileUpdated);

    return () => {
      socket.emit('file:leave', { fileId: file.id });
      socket.off('presence:update', handlePresence);
      socket.off('file:updated', handleFileUpdated);
    };
  }, [isOpen, file, socket]);

  const handleSave = async () => {
    if (!canEdit || saving || !socket) return;
    setSaving(true);
    setError('');
    setConflictWarning(false);

    socket.emit(
      'file:edit',
      { fileId: file.id, baseVersion: versionRef.current, content },
      (res) => {
        setSaving(false);
        if (res.ok) {
          setVersion(res.version);
          setSavedSuccess(true);
          setTimeout(() => setSavedSuccess(false), 2500);
          if (res.conflict) {
            setConflictWarning(true);
            addToast({
              title: 'Edit Merged with Conflict',
              message: 'Your edit was saved, but was based on an older version.',
              type: 'warning',
            });
          } else {
            addToast({
              title: 'Saved',
              message: 'Changes saved in real-time',
              type: 'success',
            });
          }
        } else {
          setError(res.error || 'Failed to save edits');
        }
      }
    );
  };

  if (!isOpen || !file) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-card" style={{ maxWidth: '900px', width: '95vw', height: '88vh' }}>
        {/* Editor Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
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
              <Code2 size={18} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h3 style={{ fontSize: '1.05rem' }}>{file.originalName}</h3>
                <span
                  style={{
                    fontSize: '0.7rem',
                    color: 'var(--text-subtle)',
                    background: 'rgba(255, 255, 255, 0.06)',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontFamily: 'monospace',
                  }}
                >
                  v{version}
                </span>
                {canEdit ? (
                  <span className="badge badge-editor" style={{ fontSize: '0.65rem' }}>
                    <PenTool size={10} /> Editor Mode
                  </span>
                ) : (
                  <span className="badge badge-viewer" style={{ fontSize: '0.65rem' }}>
                    <Eye size={10} /> Read Only
                  </span>
                )}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Real-time collaborative workspace
              </div>
            </div>
          </div>

          {/* Active Collaborators Presence & Close */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Viewers Avatars */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Users size={15} style={{ color: 'var(--accent-cyan)' }} />
              <div style={{ display: 'flex', alignItems: 'center' }}>
                {viewers.slice(0, 5).map((v, idx) => (
                  <div
                    key={v.userId || idx}
                    title={`${v.name || v.email} (${v.canEdit ? 'Editor' : 'Viewer'})`}
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: '50%',
                      background: v.canEdit ? 'var(--primary)' : 'var(--text-subtle)',
                      color: '#fff',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '2px solid var(--bg-secondary)',
                      marginLeft: idx > 0 ? -6 : 0,
                    }}
                  >
                    {(v.name || v.email)?.[0]?.toUpperCase()}
                  </div>
                ))}
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', marginLeft: 4 }}>
                {viewers.length} online
              </span>
            </div>

            <button onClick={onClose} className="btn btn-ghost btn-icon">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Conflict / Live Update Alert Notice */}
        {conflictWarning && (
          <div
            style={{
              padding: '8px 16px',
              background: 'rgba(245, 158, 11, 0.15)',
              borderBottom: '1px solid rgba(245, 158, 11, 0.3)',
              color: 'var(--accent-amber)',
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <AlertTriangle size={15} />
            Conflict resolved: Another collaborator edited while you had this open. Your changes were applied (v{version}).
          </div>
        )}

        {lastEditedBy && (
          <div
            style={{
              padding: '6px 16px',
              background: 'rgba(6, 182, 212, 0.12)',
              borderBottom: '1px solid rgba(6, 182, 212, 0.25)',
              color: 'var(--accent-cyan)',
              fontSize: '0.78rem',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <PenTool size={14} />
            Live sync: {lastEditedBy} updated the file content.
          </div>
        )}

        {/* Editor Body */}
        <div className="modal-body" style={{ padding: '16px', display: 'flex', flexDirection: 'column' }}>
          {error && (
            <div
              style={{
                padding: '10px 14px',
                background: 'rgba(244, 63, 94, 0.15)',
                color: 'var(--accent-rose)',
                borderRadius: 'var(--radius-sm)',
                marginBottom: 12,
                fontSize: '0.85rem',
              }}
            >
              {error}
            </div>
          )}

          {loading ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-subtle)' }}>
              Loading file stream...
            </div>
          ) : (
            <textarea
              className="code-editor-textarea"
              style={{ flex: 1, minHeight: '380px' }}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={!canEdit}
              placeholder={canEdit ? 'Type file contents here...' : 'Read-only mode'}
              spellCheck={false}
            />
          )}
        </div>

        {/* Editor Footer */}
        <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-subtle)', display: 'flex', alignItems: 'center', gap: 6 }}>
            {savedSuccess && (
              <span style={{ color: 'var(--accent-emerald)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <CheckCircle size={14} /> Saved to disk & synced
              </span>
            )}
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onClose} className="btn btn-secondary">
              Close
            </button>
            {canEdit && (
              <button
                onClick={handleSave}
                disabled={saving || loading}
                className="btn btn-primary"
              >
                <Save size={16} />
                <span>{saving ? 'Saving...' : 'Save & Broadcast'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
