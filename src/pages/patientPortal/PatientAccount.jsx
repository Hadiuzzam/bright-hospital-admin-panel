import { WalletCards } from 'lucide-react';
import DataTable from '../../components/common/DataTable.jsx';
import PageHeader from '../../components/common/PageHeader.jsx';
import StatCard from '../../components/common/StatCard.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useFirebaseList } from '../../hooks/useFirebaseList.js';
import { formatDateTime, formatMoney } from '../../utils/format.js';

export default function PatientAccount() {
  const { user } = useAuth();
  const { data: invoices, loading } = useFirebaseList('invoices', { where: [['patientUid', '==', user.uid]] });
  const paid = invoices.reduce((sum, item) => sum + Number(item.paid || 0), 0);
  const due = invoices.reduce((sum, item) => sum + Number(item.due || 0), 0);
  const total = invoices.reduce((sum, item) => sum + Number(item.total || 0), 0);

  return (
    <div className="page-stack">
      <PageHeader eyebrow="My account" title="Invoices & payment details" subtitle="Patient can read only own invoices and due details." />
      <div className="stats-grid">
        <StatCard title="Total billed" value={formatMoney(total)} subtitle="All invoices" icon={WalletCards} />
        <StatCard title="Paid" value={formatMoney(paid)} subtitle="Received by hospital" icon={WalletCards} tone="green" />
        <StatCard title="Due" value={formatMoney(due)} subtitle="Pending amount" icon={WalletCards} tone="orange" />
      </div>
      <DataTable
        loading={loading}
        columns={[
          { key: 'createdAt', label: 'Date', render: (row) => formatDateTime(row.createdAt) },
          { key: 'type', label: 'Type' },
          { key: 'total', label: 'Total', render: (row) => formatMoney(row.total) },
          { key: 'paid', label: 'Paid', render: (row) => formatMoney(row.paid) },
          { key: 'due', label: 'Due', render: (row) => formatMoney(row.due) },
          { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
        ]}
        rows={invoices}
        emptyText="No invoice found."
      />
    </div>
  );
}
