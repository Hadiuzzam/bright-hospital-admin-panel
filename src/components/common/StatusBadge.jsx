export default function StatusBadge({ status }) {
  const normalized = String(status || '').toLowerCase().replaceAll(' ', '_');
  return <span className={`status-badge ${normalized}`}>{String(status || 'unknown').replaceAll('_', ' ')}</span>;
}
