export function linkStatus(link) {
  if (link.status === 'revoked') return 'revoked';
  if (link.expiresAt <= new Date()) return 'expired';
  if (link.maxDownloads != null && link.downloadCount >= link.maxDownloads) return 'expired';
  return 'active';
}