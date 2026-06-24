// actionIdUtil.ts
//
// Stable, content-derived IDs for action plan items. The same title always
// produces the same ID (djb2 hash), so action-completion tracking — keyed by
// ID in actionCompletionService — survives across re-renders, re-audits, and
// risk-tier pool rotation. Without this, an index-based ID would silently
// break completion history every time the underlying pool selection changed.

export function stableActionId(prefix: string, title: string): string {
  let hash = 5381;
  const s = (title ?? '').toLowerCase().trim();
  for (let i = 0; i < s.length; i++) {
    hash = ((hash << 5) + hash + s.charCodeAt(i)) >>> 0; // djb2
  }
  return `${prefix}_${hash.toString(36)}`;
}
