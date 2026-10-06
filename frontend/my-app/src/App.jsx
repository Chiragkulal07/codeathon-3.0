import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { useSocket } from './context/SocketContext';
import { api } from './api/client';

import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Toaster from './components/Toaster';

import AuthView from './views/AuthView';
import DashboardView from './views/DashboardView';
import RoomView from './views/RoomView';
import LinksView from './views/LinksView';
import InvitesView from './views/InvitesView';
import PublicLinkView from './views/PublicLinkView';

import CreateRoomModal from './components/modals/CreateRoomModal';
import RoomMembersModal from './components/modals/RoomMembersModal';
import CreateShareLinkModal from './components/modals/CreateShareLinkModal';
import FileAccessModal from './components/modals/FileAccessModal';
import FileActivityModal from './components/modals/FileActivityModal';
import CollabEditorModal from './components/modals/CollabEditorModal';

export default function App() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const { addToast } = useSocket();

  // Route check for public share link `/s/:code`
  const path = window.location.pathname;
  const isPublicShareLink = path.startsWith('/s/');
  const publicShareCode = isPublicShareLink ? path.split('/s/')[1]?.split('/')[0] : null;

  const [activeView, setActiveView] = useState('dashboard'); // 'dashboard' | 'rooms' | 'links' | 'invites'
  const [rooms, setRooms] = useState([]);
  const [currentRoomId, setCurrentRoomId] = useState(null);
  const [currentRoom, setCurrentRoom] = useState(null);
  const [pendingInvitesCount, setPendingInvitesCount] = useState(0);

  // Modals state
  const [createRoomModalOpen, setCreateRoomModalOpen] = useState(false);
  const [membersModalOpen, setMembersModalOpen] = useState(false);
  const [shareLinkFile, setShareLinkFile] = useState(null);
  const [accessFile, setAccessFile] = useState(null);
  const [activityFile, setActivityFile] = useState(null);
  const [editorFile, setEditorFile] = useState(null);

  useEffect(() => {
    if (isAuthenticated) {
      loadRooms();
      loadPendingInvitesCount();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (currentRoomId && rooms.length) {
      loadFullRoomDetails(currentRoomId);
    }
  }, [currentRoomId]);

  const loadRooms = async () => {
    try {
      const res = await api.listRooms();
      const loadedRooms = res.rooms || [];
      setRooms(loadedRooms);
      if (loadedRooms.length > 0 && !currentRoomId) {
        setCurrentRoomId(loadedRooms[0].id);
      }
    } catch {
      // ignore
    }
  };

  const loadFullRoomDetails = async (roomId) => {
    try {
      const res = await api.getRoom(roomId);
      setCurrentRoom(res.room);
    } catch {
      // fallback to list room object if detail fails
      const fallback = rooms.find((r) => r.id === roomId);
      if (fallback) setCurrentRoom(fallback);
    }
  };

  const loadPendingInvitesCount = async () => {
    try {
      const res = await api.getMyInvites();
      setPendingInvitesCount(res.invites?.length || 0);
    } catch {
      // ignore
    }
  };

  const handleRoomCreated = (newRoom) => {
    setRooms((prev) => [newRoom, ...prev]);
    setCurrentRoomId(newRoom.id);
    setCurrentRoom(newRoom);
    setActiveView('rooms');
  };

  const handleRoomRenamed = (updatedRoom) => {
    setRooms((prev) =>
      prev.map((r) => (r.id === updatedRoom.id ? { ...r, name: updatedRoom.name } : r))
    );
    setCurrentRoom(updatedRoom);
  };

  const handleRoomDeleted = (deletedRoomId) => {
    const remaining = rooms.filter((r) => r.id !== deletedRoomId);
    setRooms(remaining);
    if (remaining.length > 0) {
      setCurrentRoomId(remaining[0].id);
    } else {
      setCurrentRoomId(null);
      setCurrentRoom(null);
    }
    setActiveView('dashboard');
  };

  const handleInviteAccepted = (joinedRoom) => {
    setRooms((prev) => [joinedRoom, ...prev.filter((r) => r.id !== joinedRoom.id)]);
    setCurrentRoomId(joinedRoom.id);
    setCurrentRoom(joinedRoom);
    loadPendingInvitesCount();
    setActiveView('rooms');
  };

  // If visiting public share link
  if (isPublicShareLink && publicShareCode) {
    return (
      <>
        <PublicLinkView code={publicShareCode} onGoHome={() => (window.location.pathname = '/')} />
        <Toaster />
      </>
    );
  }

  // Loading initial authentication
  if (authLoading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
        Initializing CloudVault Security...
      </div>
    );
  }

  // If unauthenticated, show Login/Register view
  if (!isAuthenticated) {
    return (
      <>
        <AuthView />
        <Toaster />
      </>
    );
  }

  return (
    <div className="app-container">
      {/* Sidebar */}
      <Sidebar
        activeView={activeView}
        setActiveView={setActiveView}
        rooms={rooms}
        currentRoomId={currentRoomId}
        onSelectRoom={(id) => {
          setCurrentRoomId(id);
          setActiveView('rooms');
        }}
        onOpenCreateRoom={() => setCreateRoomModalOpen(true)}
        pendingInvitesCount={pendingInvitesCount}
      />

      {/* Main Workspace Area */}
      <div className="main-content">
        <Navbar
          currentRoom={activeView === 'rooms' ? currentRoom : null}
          rooms={rooms}
          onSelectRoom={setCurrentRoomId}
        />

        {/* Dynamic Views */}
        {activeView === 'dashboard' && (
          <DashboardView
            onNavigateToRooms={() => setActiveView('rooms')}
            onNavigateToLinks={() => setActiveView('links')}
          />
        )}

        {activeView === 'rooms' && (
          <RoomView
            room={currentRoom}
            onOpenMembers={() => setMembersModalOpen(true)}
            onOpenCreateShareLink={(f) => setShareLinkFile(f)}
            onOpenFileAccess={(f) => setAccessFile(f)}
            onOpenFileActivity={(f) => setActivityFile(f)}
            onOpenEditor={(f) => setEditorFile(f)}
            onRoomDeleted={handleRoomDeleted}
            onRoomRenamed={handleRoomRenamed}
          />
        )}

        {activeView === 'links' && <LinksView />}

        {activeView === 'invites' && (
          <InvitesView onInviteAccepted={handleInviteAccepted} />
        )}
      </div>

      {/* Global Modals */}
      <CreateRoomModal
        isOpen={createRoomModalOpen}
        onClose={() => setCreateRoomModalOpen(false)}
        onCreated={handleRoomCreated}
      />

      <RoomMembersModal
        isOpen={membersModalOpen}
        onClose={() => setMembersModalOpen(false)}
        room={currentRoom}
        onRoomUpdated={(updated) => {
          setCurrentRoom(updated);
          setRooms((prev) =>
            prev.map((r) => (r.id === updated.id ? { ...r, members: updated.members } : r))
          );
        }}
      />

      <CreateShareLinkModal
        isOpen={!!shareLinkFile}
        onClose={() => setShareLinkFile(null)}
        file={shareLinkFile}
      />

      <FileAccessModal
        isOpen={!!accessFile}
        onClose={() => setAccessFile(null)}
        file={accessFile}
        onAccessUpdated={() => {
          // reload room files
        }}
      />

      <FileActivityModal
        isOpen={!!activityFile}
        onClose={() => setActivityFile(null)}
        file={activityFile}
      />

      <CollabEditorModal
        isOpen={!!editorFile}
        onClose={() => setEditorFile(null)}
        file={editorFile}
      />

      {/* Real-time Toaster */}
      <Toaster />
    </div>
  );
}
