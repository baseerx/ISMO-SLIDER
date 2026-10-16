export function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m ? (s ? `${m}m ${s}s` : `${m}m`) : `${s}s`;
}