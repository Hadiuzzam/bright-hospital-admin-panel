import { useState } from 'react';
import toast from 'react-hot-toast';
import { CalendarCheck, XCircle } from 'lucide-react';
import DataTable from '../../components/common/DataTable.jsx';
import PageHeader from '../../components/common/PageHeader.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useFirebaseList } from '../../hooks/useFirebaseList.js';
import { cancelPatientAppointment } from '../../services/hmsService.js';
import { formatDate, formatMoney } from '../../utils/format.js';

export default function PatientBookings() {
  const { user } = useAuth();
  const { data: bookings, loading } = useFirebaseList('appointments', { where: [['patientUid', '==', user.uid]] });
  const [busyId, setBusyId] = useState('');

  const handleCancel = async (booking) => {
    const reason = window.prompt('Cancel reason?');
    if (reason === null) return;
    setBusyId(booking.id);
    try {
      await cancelPatientAppointment(booking.id, reason, user);
      toast.success('Appointment cancelled');
    } catch (error) {
      toast.error(error?.message || 'Cannot cancel appointment');
    } finally {
      setBusyId('');
    }
  };

  return (
    <div className="page-stack">
      <PageHeader eyebrow="My records" title="My booking list" subtitle="You can see and cancel only your own requested bookings." />
      <DataTable
        loading={loading}
        columns={[
          { key: 'date', label: 'Date', render: (row) => formatDate(row.date) },
          { key: 'time', label: 'Time' },
          { key: 'doctorName', label: 'Doctor' },
          { key: 'department', label: 'Department' },
          { key: 'fee', label: 'Fee', render: (row) => formatMoney(row.fee) },
          { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
          { key: 'action', label: 'Action', render: (row) => ['completed', 'cancelled', 'cancelled_by_patient'].includes(row.status) ? '-' : <button className="danger-soft-btn" disabled={busyId === row.id} onClick={() => handleCancel(row)}><XCircle size={15} /> Cancel</button> },
        ]}
        rows={bookings}
        emptyText="No booking request found."
      />
    </div>
  );
}
