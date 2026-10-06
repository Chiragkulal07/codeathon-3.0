export const RANK = { viewer: 1, editor: 2, admin: 3, owner: 4 };

export const getMembership = (room, userId) =>
  room.members.find((m) => String(m.userId) === String(userId));

export const hasRole = (membership, minRole) =>
  !!membership && RANK[membership.role] >= RANK[minRole];

// admins/owner and the uploader always get in; a file with no grants is open to all
// room members; once grants exist, only the granted emails get in
export const canAccessFile = (membership, file, user) => {
  if (!membership) return false;
  if (hasRole(membership, 'admin')) return true;
  const uploaderId = file.uploaderId?._id ?? file.uploaderId;
  if (String(uploaderId) === String(user._id)) return true;
  if (!file.accessGrants.length) return true;
  return file.accessGrants.some((g) => g.email === user.email);
};