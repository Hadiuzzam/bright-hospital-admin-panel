import { CalendarCheck, CalendarPlus, FileText, WalletCards } from 'lucide-react';
import { Link } from 'react-router-dom';
import StatCard from '../../components/common/StatCard.jsx';
import DataTable from '../../components/common/DataTable.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useFirebaseList } from '../../hooks/useFirebaseList.js';
import { formatDate, formatMoney } from '../../utils/format.js';

export default function PatientPortalHome() {
  const { user } = useAuth();
  const ownWhere = { where: [['patientUid', '==', user.uid]] };
  const { data: appointments } = useFirebaseList('appointments', ownWhere);
  const { data: files } = useFirebaseList('patientFiles', ownWhere);
  const { data: invoices } = useFirebaseList('invoices', ownWhere);
  const due = invoices.reduce((sum, item) => sum + Number(item.due || 0), 0);

  return (
    <div className="page-stack">
      <div className="stats-grid">
        <StatCard title="My bookings" value={appointments.length} subtitle="All appointment requests" icon={CalendarCheck} />
        <StatCard title="Reports/files" value={files.length} subtitle="Uploaded by hospital" icon={FileText} tone="blue" />
        <StatCard title="Due amount" value={formatMoney(due)} subtitle="Your account balance" icon={WalletCards} tone="orange" />
      </div>

      <div className="quick-action-card">
        <div><h3>Need a doctor appointment?</h3><p>Search appointment type, choose doctor and request your preferred date/time.</p></div>
        <Link className="primary-btn" to="/portal/book"><CalendarPlus size={17} /> Book appointment</Link>
      </div>

      <DataTable
        columns={[
          { key: 'date', label: 'Date', render: (row) => formatDate(row.date) },
          { key: 'time', label: 'Time' },
          { key: 'doctorName', label: 'Doctor' },
          { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
        ]}
        rows={appointments.slice(0, 5)}
        emptyText="You have no appointment yet."
      />
    </div>
  );
}
