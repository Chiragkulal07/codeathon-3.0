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
  RefreshCw,
  Sparkles,
  FileOutput,
  Loader2,
  LogOut,
  UserPlus,
} from 'lucide-react';

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

const TEXT_EXTS = new Set([
  '.txt', '.md', '.json', '.csv', '.js', '.jsx', '.ts', '.tsx', '.html', '.css', '.scss',
  '.xml', '.yml', '.yaml', '.log', '.py', '.java', '.c', '.cpp', '.cs', '.php', '.rb',
  '.go', '.rs', '.sql', '.sh', '.env', '.config'
]);

function isEditable(file) {
  if (!file) return false;
  if (file.mimeType?.startsWith('text/') || file.mimeType === 'application/json') return true;
  const name = file.originalName || '';
  const dotIndex = name.lastIndexOf('.');
  if (dotIndex === -1) return false;
  const ext = name.slice(dotIndex).toLowerCase();
  return TEXT_EXTS.has(ext);
}

function getFileIcon(file) {
  if (isEditable(file)) return <FileCode size={24} style={{ color: 'var(--accent-cyan)' }} />;
  if (file.mimeType?.startsWith('image/')) return <File size={24} style={{ color: 'var(--accent-purple)' }} />;
  if (file.originalName?.endsWith('.zip') || file.originalName?.endsWith('.tar'))
    return <FileArchive size={24} style={{ color: 'var(--accent-amber)' }} />;
  return <FileText size={24} style={{ color: 'var(--primary)' }} />;
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
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const [convertingFileId, setConvertingFileId] = useState(null);

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

    socket.emit('room:join', { roomId: room.id });

    const handleFileUploaded = (data) => {
      setFiles((prev) => [data.file, ...prev.filter((f) => f.id !== data.file.id)]);
      addToast({
        title: 'New File Uploaded',
        message: `"${data.file.originalName}" was added to this room`,
        type: 'info',
      });
    };

    const handleFileDeleted = (data) => {
      setFiles((prev) => prev.filter((f) => f.id !== data.fileId));
      addToast({
        title: 'File Removed',
        message: 'A file was deleted from this room',
        type: 'info',
      });
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
      addToast({
        title: 'Upload Complete',
        message: `"${res.file.originalName}" uploaded successfully!`,
        type: 'success',
      });
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

  const handleDownloadFile = async (file) => {
    try {
      addToast({ title: 'Downloading', message: `Downloading "${file.originalName}"...`, type: 'info' });
      await api.downloadFileBlob(file.id, file.originalName);
      addToast({ title: 'Downloaded', message: `"${file.originalName}" saved successfully!`, type: 'success' });
    } catch (err) {
      addToast({ title: 'Download Failed', message: err.message, type: 'error' });
    }
  };

  const handleConvertToText = async (file) => {
    setConvertingFileId(file.id);
    addToast({ title: 'Converting', message: `Extracting text from "${file.originalName}"...`, type: 'info' });
    try {
      const res = await api.convertFileToText(file.id);
      setFiles((prev) => [res.file, ...prev]);
      addToast({
        title: 'Conversion Complete!',
        message: `"${res.file.originalName}" created. Opening editor...`,
        type: 'success',
      });
      onOpenEditor(res.file);
    } catch (err) {
      addToast({ title: 'Conversion Failed', message: err.message, type: 'error' });
    } finally {
      setConvertingFileId(null);
    }
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
    if (
      !window.confirm(
        `Permanently delete room "${room.name}" and all its files? This action cannot be undone.`
      )
    )
      return;
    try {
      await api.deleteRoom(room.id);
      addToast({ title: 'Room Deleted', message: `Room "${room.name}" was removed`, type: 'info' });
      onRoomDeleted(room.id);
    } catch (err) {
      addToast({ title: 'Error', message: err.message, type: 'error' });
    }
  };

  const handleLeaveRoom = async () => {
    if (
      !window.confirm(
        `Are you sure you want to leave "${room.name}"? You will need a new invite to rejoin.`
      )
    )
      return;
    try {
      await api.removeMember(room.id, user._id || user.id);
      addToast({ title: 'Left Room', message: `You left "${room.name}"`, type: 'info' });
      onRoomDeleted(room.id); // reuses same handler to remove room from list
    } catch (err) {
      addToast({ title: 'Error', message: err.message, type: 'error' });
    }
  };

  if (!room) {
    return (
      <div className="page-body" style={{ textAlign: 'center', padding: '100px 0' }}>
        <FolderOpen size={48} style={{ color: 'var(--text-subtle)', marginBottom: 16 }} />
        <div style={{ color: 'var(--text-muted)', fontSize: '1.1rem', marginBottom: 10 }}>
          Select or create a room from the sidebar to view files.
        </div>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-subtle)', marginBottom: 20 }}>
          Want to join a room? Ask the room owner to invite you via your email,
          then accept the invite from the <strong style={{ color: 'var(--primary)' }}>Invitations</strong> section in the sidebar.
        </div>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 20px',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(99, 102, 241, 0.12)',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            color: 'var(--primary)',
            fontSize: '0.88rem',
            fontWeight: 600,
          }}
        >
          <UserPlus size={18} />
          To join a room → Go to <strong style={{ marginLeft: 4 }}>Invitations</strong> in the sidebar
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
              width: 46,
              height: 46,
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
                <button type="submit" className="btn btn-primary btn-sm">
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingName(false)}
                  className="btn btn-ghost btn-sm"
                >
                  Cancel
                </button>
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
              {room.members?.length || 1} team members • Created{' '}
              {new Date(room.createdAt).toLocaleDateString()}
            </div>
          </div>
        </div>

        {/* Room Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <button onClick={onOpenMembers} className="btn btn-secondary">
            <Users size={16} />
            <span>Members ({room.members?.length || 0})</span>
          </button>

          {/* Non-owners: Leave Room */}
          {!isOwner && (
            <button
              onClick={handleLeaveRoom}
              className="btn btn-ghost"
              style={{ color: 'var(--accent-amber)', border: '1px solid rgba(245, 158, 11, 0.3)' }}
              title="Leave this room"
            >
              <LogOut size={16} />
              <span>Leave Room</span>
            </button>
          )}

          {/* Owners: Delete Room */}
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
              gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))',
              gap: 18,
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
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: 14,
                    border: editable ? '1px solid rgba(6, 182, 212, 0.25)' : '1px solid var(--border-glass)',
                  }}
                >
                  <div>
                    {/* Header: Icon, Name & Badges */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                      <div
                        style={{
                          width: 42,
                          height: 42,
                          borderRadius: 'var(--radius-sm)',
                          background: editable ? 'rgba(6, 182, 212, 0.12)' : 'rgba(255, 255, 255, 0.05)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          cursor: editable ? 'pointer' : 'default',
                        }}
                        onClick={() => editable && onOpenEditor(file)}
                        title={editable ? 'Click to open editor' : ''}
                      >
                        {getFileIcon(file)}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontWeight: 700,
                            fontSize: '0.92rem',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            cursor: editable ? 'pointer' : 'default',
                            color: editable ? '#fff' : 'var(--text-main)',
                          }}
                          title={file.originalName}
                          onClick={() => editable && onOpenEditor(file)}
                        >
                          {file.originalName}
                        </div>
                        <div
                          style={{
                            fontSize: '0.75rem',
                            color: 'var(--text-subtle)',
                            marginTop: 2,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                          }}
                        >
                          <span>{formatBytes(file.size)}</span>
                          <span>•</span>
                          <span>{new Date(file.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>

                      {file.restricted && (
                        <span
                          className="badge badge-restricted"
                          title="Restricted Access to specific users"
                          style={{ padding: '3px 6px' }}
                        >
                          <Lock size={12} />
                        </span>
                      )}
                    </div>

                    {/* Uploader info and Editable badge */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginTop: 12,
                        fontSize: '0.72rem',
                        color: 'var(--text-subtle)',
                      }}
                    >
                      <span>By: {file.uploader?.name || file.uploader?.email || 'Unknown'}</span>
                      {editable && (
                        <span
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            color: 'var(--accent-cyan)',
                            fontWeight: 600,
                            fontSize: '0.72rem',
                            background: 'rgba(6, 182, 212, 0.1)',
                            padding: '2px 8px',
                            borderRadius: '9999px',
                            border: '1px solid rgba(6, 182, 212, 0.25)',
                          }}
                        >
                          <Sparkles size={11} /> Realtime Editable
                        </span>
                      )}
                    </div>

                    {/* Prominent Big Edit Button for text/code files */}
                    {editable && (
                      <div style={{ marginTop: 12 }}>
                        <button
                          onClick={() => onOpenEditor(file)}
                          className="btn btn-primary btn-sm"
                          style={{
                            width: '100%',
                            background: 'linear-gradient(135deg, #0284c7 0%, #06b6d4 100%)',
                            boxShadow: '0 4px 12px rgba(6, 182, 212, 0.3)',
                            padding: '8px 12px',
                            fontWeight: 700,
                            fontSize: '0.82rem',
                          }}
                        >
                          <Edit size={15} />
                          <span>Open & Edit Code / Text Live</span>
                        </button>
                      </div>
                    )}

                    {/* Convert to text button for .docx, .pdf, etc */}
                    {!editable && canUpload && (
                      <div style={{ marginTop: 12 }}>
                        <button
                          onClick={() => handleConvertToText(file)}
                          disabled={convertingFileId === file.id}
                          className="btn btn-secondary btn-sm"
                          style={{
                            width: '100%',
                            background: 'rgba(245, 158, 11, 0.12)',
                            border: '1px solid rgba(245, 158, 11, 0.35)',
                            color: 'var(--accent-amber)',
                            padding: '8px 12px',
                            fontWeight: 700,
                            fontSize: '0.82rem',
                          }}
                        >
                          {convertingFileId === file.id ? (
                            <><Loader2 size={15} className="spin" /><span>Extracting Text...</span></>
                          ) : (
                            <><FileOutput size={15} /><span>Extract as .txt & Edit Live</span></>
                          )}
                        </button>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-subtle)', marginTop: 5, textAlign: 'center' }}>
                          Creates an editable .txt copy of this file
                        </div>
                      </div>
                    )}
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
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      {/* Direct Download */}
                      <button
                        onClick={() => handleDownloadFile(file)}
                        className="btn btn-secondary btn-icon"
                        title="Download File"
                      >
                        <Download size={15} />
                      </button>

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
