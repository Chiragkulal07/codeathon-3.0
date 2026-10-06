import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import {
  UploadCloud,
  File,
  FileText,
  FileCode,
  FileArchive,
  Download,
  Trash2,
  Share2,
  ShieldCheck,
  Activity,
  Users,
  Edit,
  FolderOpen,
  Lock,
  MoreVertical,
  Plus,
  RefreshCw,
} from 'lucide-react';

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

const TEXT_EXTS = ['.txt', '.md', '.json', '.csv', '.js', '.html', '.css', '.xml', '.yml', '.yaml', '.log'];

function isEditable(file) {
  if (!file) return false;
  if (file.mimeType?.startsWith('text/') || file.mimeType === 'application/json') return true;
  const ext = file.originalName?.slice(file.originalName.lastIndexOf('.')).toLowerCase();
  return TEXT_EXTS.includes(ext);
}

function getFileIcon(file) {
  if (isEditable(file)) return <FileCode size={22} style={{ color: 'var(--accent-cyan)' }} />;
  if (file.mimeType?.startsWith('image/')) return <File size={22} style={{ color: 'var(--accent-purple)' }} />;
  if (file.originalName?.endsWith('.zip') || file.originalName?.endsWith('.tar'))
    return <FileArchive size={22} style={{ color: 'var(--accent-amber)' }} />;
  return <FileText size={22} style={{ color: 'var(--primary)' }} />;
}

export default function RoomView({
  room,
  onOpenMembers,
  onOpenCreateShareLink,
  onOpenFileAccess,
  onOpenFileActivity,
  onOpenEditor,
  onRoomDeleted,
  onRoomRenamed,
}) {
  const { user } = useAuth();
  const { socket, addToast } = useSocket();

  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [activeMenuFileId, setActiveMenuFileId] = useState(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState('');

  const fileInputRef = useRef(null);

  const myRole = room?.myRole || 'viewer';
  const isOwner = myRole === 'owner';
  const isAdmin = isOwner || myRole === 'admin';
  const canUpload = isAdmin || myRole === 'editor';

  useEffect(() => {
    if (!room) return;
    loadFiles();
    setIsEditingName(false);
    setNewName(room.name);

    if (!socket) return;

    // Join room channel for live updates
    socket.emit('room:join', { roomId: room.id });

    const handleFileUploaded = (data) => {
      setFiles((prev) => [data.file, ...prev.filter((f) => f.id !== data.file.id)]);
      addToast({ title: 'New File Uploaded', message: `"${data.file.originalName}" was added to this room`, type: 'info' });
    };

    const handleFileDeleted = (data) => {
      setFiles((prev) => prev.filter((f) => f.id !== data.fileId));
      addToast({ title: 'File Removed', message: 'A file was deleted from this room', type: 'info' });
    };

    const handleAccessChanged = (data) => {
      setFiles((prev) =>
        prev.map((f) => (f.id === data.fileId ? { ...f, restricted: data.restricted } : f))
      );
    };

    socket.on('file:uploaded', handleFileUploaded);
    socket.on('file:deleted', handleFileDeleted);
    socket.on('file:access-changed', handleAccessChanged);

    return () => {
      socket.off('file:uploaded', handleFileUploaded);
      socket.off('file:deleted', handleFileDeleted);
      socket.off('file:access-changed', handleAccessChanged);
    };
  }, [room, socket]);

  const loadFiles = async () => {
    if (!room) return;
    setLoading(true);
    try {
      const res = await api.listFiles(room.id);
      setFiles(res.files || []);
    } catch (err) {
      addToast({ title: 'Error', message: err.message || 'Failed to load files', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (selectedFile) => {
    if (!selectedFile) return;
    if (selectedFile.size > 25 * 1024 * 1024) {
      addToast({ title: 'File Too Large', message: 'Maximum file size is 25 MB', type: 'error' });
      return;
    }

    setUploading(true);
    try {
      const res = await api.uploadFile(room.id, selectedFile);
      setFiles((prev) => [res.file, ...prev.filter((f) => f.id !== res.file.id)]);
      addToast({ title: 'Upload Complete', message: `"${res.file.originalName}" uploaded successfully!`, type: 'success' });
    } catch (err) {
      addToast({ title: 'Upload Failed', message: err.message, type: 'error' });
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (!canUpload) return;
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleDeleteFile = async (file) => {
    if (!window.confirm(`Delete file "${file.originalName}"?`)) return;
    try {
      await api.deleteFile(file.id);
      setFiles((prev) => prev.filter((f) => f.id !== file.id));
      addToast({ title: 'Deleted', message: 'File deleted from storage', type: 'info' });
    } catch (err) {
      addToast({ title: 'Error', message: err.message, type: 'error' });
    }
  };

  const handleDownloadFile = (file) => {
    window.location.href = api.downloadFileUrl(file.id);
  };

  const handleSaveRoomName = async (e) => {
    e.preventDefault();
    if (!newName.trim() || newName.trim() === room.name) {
      setIsEditingName(false);
      return;
    }
    try {
      const res = await api.updateRoom(room.id, newName.trim());
      onRoomRenamed(res.room);
      setIsEditingName(false);
      addToast({ title: 'Room Updated', message: 'Room renamed successfully', type: 'success' });
    } catch (err) {
      addToast({ title: 'Error', message: err.message, type: 'error' });
    }
  };

  const handleDeleteRoom = async () => {
    if (!window.confirm(`Permanently delete room "${room.name}" and all its files? This action cannot be undone.`)) return;
    try {
      await api.deleteRoom(room.id);
      addToast({ title: 'Room Deleted', message: `Room "${room.name}" was removed`, type: 'info' });
      onRoomDeleted(room.id);
    } catch (err) {
      addToast({ title: 'Error', message: err.message, type: 'error' });
    }
  };

  if (!room) {
    return (
      <div className="page-body" style={{ textAlign: 'center', padding: '100px 0' }}>
        <FolderOpen size={48} style={{ color: 'var(--text-subtle)', marginBottom: 16 }} />
        <div style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>
          Select or create a room from the sidebar to view files.
        </div>
      </div>
    );
  }

  return (
    <div className="page-body">
      {/* Room Header & Toolbar */}
      <div
        className="glass-panel"
        style={{
          padding: '24px 28px',
          marginBottom: 26,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
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
            <FolderOpen size={24} />
          </div>

          <div>
            {isEditingName ? (
              <form onSubmit={handleSaveRoomName} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="text"
                  className="input-field"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  autoFocus
                  style={{ width: '220px', padding: '6px 10px' }}
                />
                <button type="submit" className="btn btn-primary btn-sm">Save</button>
                <button type="button" onClick={() => setIsEditingName(false)} className="btn btn-ghost btn-sm">Cancel</button>
              </form>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <h1 style={{ fontSize: '1.5rem' }}>{room.name}</h1>
                <span className={`badge badge-${myRole}`}>{myRole}</span>
                {isAdmin && (
                  <button
                    onClick={() => setIsEditingName(true)}
                    className="btn btn-ghost btn-icon"
                    title="Rename Room"
                    style={{ padding: 4 }}
                  >
                    <Edit size={14} />
                  </button>
                )}
              </div>
            )}
            <div style={{ fontSize: '0.8rem', color: 'var(--text-subtle)', marginTop: 2 }}>
              {room.members?.length || 1} team members • Created {new Date(room.createdAt).toLocaleDateString()}
            </div>
          </div>
        </div>

        {/* Room Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={onOpenMembers} className="btn btn-secondary">
            <Users size={16} />
            <span>Members ({room.members?.length || 0})</span>
          </button>

          {isOwner && (
            <button onClick={handleDeleteRoom} className="btn btn-danger">
              <Trash2 size={16} />
              <span>Delete Room</span>
            </button>
          )}
        </div>
      </div>

      {/* Upload Zone (For Editors & Admins) */}
      {canUpload && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${dragActive ? 'var(--primary)' : 'var(--border-glass)'}`,
            borderRadius: 'var(--radius-lg)',
            padding: '30px 20px',
            textAlign: 'center',
            background: dragActive ? 'rgba(99, 102, 241, 0.08)' : 'var(--bg-glass-card)',
            backdropFilter: 'blur(10px)',
            cursor: uploading ? 'wait' : 'pointer',
            marginBottom: 28,
            transition: 'all 0.2s ease',
          }}
        >
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
            disabled={uploading}
          />
          <div
            style={{
              width: 46,
              height: 46,
              borderRadius: '50%',
              background: 'rgba(99, 102, 241, 0.15)',
              color: 'var(--primary)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 10,
            }}
          >
            <UploadCloud size={24} />
          </div>
          <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>
            {uploading ? 'Uploading & Encrypting...' : 'Click to Upload or Drag & Drop File'}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-subtle)', marginTop: 4 }}>
            Up to 25 MB • Text, Code, Documents, Media & Archives supported
          </div>
        </div>
      )}

      {/* Files Grid */}
      <div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 16,
          }}
        >
          <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>
            Files in Room ({files.length})
          </div>
          <button onClick={loadFiles} className="btn btn-ghost btn-icon" title="Refresh files">
            <RefreshCw size={16} />
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-subtle)' }}>
            Loading files...
          </div>
        ) : files.length === 0 ? (
          <div
            className="glass-panel"
            style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-subtle)' }}
          >
            <FileText size={40} style={{ marginBottom: 12, opacity: 0.5 }} />
            <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-muted)' }}>
              No files in this room yet
            </div>
            <div style={{ fontSize: '0.8rem', marginTop: 4 }}>
              {canUpload ? 'Drop a file above to upload.' : 'You will see files here once uploaded.'}
            </div>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 16,
            }}
          >
            {files.map((file) => {
              const editable = isEditable(file);
              const isUploader = String(file.uploader?.id) === String(user?.id);
              const canDelete = isUploader || isAdmin;

              return (
                <div
                  key={file.id}
                  className="glass-panel glass-panel-hover"
                  style={{
                    padding: '18px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: 14,
                  }}
                >
                  <div>
                    {/* Header: Icon, Name & Lock Badge */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                      <div
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: 'var(--radius-sm)',
                          background: 'rgba(255, 255, 255, 0.05)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        {getFileIcon(file)}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontWeight: 600,
                            fontSize: '0.9rem',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                          title={file.originalName}
                        >
                          {file.originalName}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', marginTop: 2 }}>
                          {formatBytes(file.size)} • {new Date(file.createdAt).toLocaleDateString()}
                        </div>
                      </div>

                      {file.restricted && (
                        <span
                          className="badge badge-restricted"
                          title="Restricted Access"
                          style={{ padding: '3px 6px' }}
                        >
                          <Lock size={12} />
                        </span>
                      )}
                    </div>

                    <div style={{ fontSize: '0.72rem', color: 'var(--text-subtle)', marginTop: 10 }}>
                      Uploaded by: {file.uploader?.name || file.uploader?.email || 'Unknown'}
                    </div>
                  </div>

                  {/* Actions Grid */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderTop: '1px solid var(--border-glass)',
                      paddingTop: 12,
                    }}
                  >
                    <div style={{ display: 'flex', gap: 4 }}>
                      {/* Direct Download */}
                      <button
                        onClick={() => handleDownloadFile(file)}
                        className="btn btn-secondary btn-icon"
                        title="Download File"
                      >
                        <Download size={15} />
                      </button>

                      {/* Live Collab Editor (if text/code file) */}
                      {editable && (
                        <button
                          onClick={() => onOpenEditor(file)}
                          className="btn btn-secondary btn-icon"
                          title="Open Live Collaborative Editor"
                          style={{ color: 'var(--accent-cyan)' }}
                        >
                          <Edit size={15} />
                        </button>
                      )}

                      {/* Create Share Link (Admin only) */}
                      {isAdmin && (
                        <button
                          onClick={() => onOpenCreateShareLink(file)}
                          className="btn btn-secondary btn-icon"
                          title="Create Share Link"
                          style={{ color: 'var(--accent-amber)' }}
                        >
                          <Share2 size={15} />
                        </button>
                      )}

                      {/* Per-File Access Grants (Admin only) */}
                      {isAdmin && (
                        <button
                          onClick={() => onOpenFileAccess(file)}
                          className="btn btn-secondary btn-icon"
                          title="Manage Access Grants"
                          style={{ color: 'var(--accent-purple)' }}
                        >
                          <ShieldCheck size={15} />
                        </button>
                      )}

                      {/* Download Activity / Audit Log (Admin only) */}
                      {isAdmin && (
                        <button
                          onClick={() => onOpenFileActivity(file)}
                          className="btn btn-secondary btn-icon"
                          title="Download Audit Logs"
                        >
                          <Activity size={15} />
                        </button>
                      )}
                    </div>

                    {/* Delete File */}
                    {canDelete && (
                      <button
                        onClick={() => handleDeleteFile(file)}
                        className="btn btn-ghost btn-icon"
                        title="Delete File"
                        style={{ color: 'var(--accent-rose)' }}
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
      </div>
    </div>
  );
}
