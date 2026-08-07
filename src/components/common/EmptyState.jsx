import { Inbox } from 'lucide-react';

export default function EmptyState({ title = 'No data yet', text = 'Create your first record to see it here.' }) {
  return (
    <div className="empty-state">
      <Inbox size={32} />
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}
