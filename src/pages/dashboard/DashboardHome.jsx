import {
  AlertTriangle,
  CalendarCheck,
  FileText,
  HeartPulse,
  Landmark,
  Pill,
  Stethoscope,
  UsersRound,
} from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import PageHeader from '../../components/common/PageHeader.jsx';
import StatCard from '../../components/common/StatCard.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import DataTable from '../../components/common/DataTable.jsx';
import { useFirebaseList } from '../../hooks/useFirebaseList.js';
import { formatMoney, todayDate } from '../../utils/format.js';

export default function DashboardHome() {
  const { data: patients, loading: patientsLoading } = useFirebaseList('patients');
  const { data: appointments, loading: appointmentsLoading } = useFirebaseList('appointments');
  const { data: doctors } = useFirebaseList('doctors');
  const { data: medicines } = useFirebaseList('pharmacy/medicines');
  const { data: invoices } = useFirebaseList('accounts/invoices');
  const { data: files } = useFirebaseList('patientFiles');

  const today = todayDate();
  const todaysAppointments = appointments.filter((item) => item.date === today);
  const waiting = todaysAppointments.filter((item) => ['accepted', 'waiting', 'in_consultation'].includes(item.status));
  const lowStock = medicines.filter((item) => Number(item.stockQty || 0) <= Number(item.lowStockLimit || 10));
  const todayIncome = invoices
    .filter((item) => new Date(item.createdAt || 0).toISOString().slice(0, 10) === today && item.status !== 'cancelled')
    .reduce((sum, item) => sum + Number(item.paid || 0), 0);
  const totalDue = invoices.filter((item) => item.status !== 'cancelled').reduce((sum, item) => sum + Number(item.due || 0), 0);

  const last7 = [...Array(7)].map((_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    const key = date.toISOString().slice(0, 10);
    return {
      day: date.toLocaleDateString('en-US', { weekday: 'short' }),
      appointments: appointments.filter((item) => item.date === key).length,
      income: invoices
        .filter((item) => new Date(item.createdAt || 0).toISOString().slice(0, 10) === key)
        .reduce((sum, item) => sum + Number(item.paid || 0), 0),
    };
  });

  const columns = [
    { key: 'serialNo', label: 'Serial' },
    { key: 'patientName', label: 'Patient' },
    { key: 'doctorName', label: 'Doctor' },
    { key: 'time', label: 'Time' },
    { key: 'fee', label: 'Fee', render: (row) => formatMoney(row.fee) },
    { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
  ];

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Live Firebase Dashboard"
        title="Hospital Operations Overview"
        subtitle="Realtime data for patients, appointments, doctors, pharmacy stock, accounts and medical files."
      />

      <div className="stats-grid four">
        <StatCard title="Patients" value={patients.length} subtitle="Registered records" icon={UsersRound} />
        <StatCard title="Today Queue" value={waiting.length} subtitle={`${todaysAppointments.length} total today`} icon={CalendarCheck} tone="blue" />
        <StatCard title="Today Income" value={formatMoney(todayIncome)} subtitle="Collected amount" icon={Landmark} tone="green" />
        <StatCard title="Total Due" value={formatMoney(totalDue)} subtitle="Pending collection" icon={AlertTriangle} tone="orange" />
      </div>

      <div className="dashboard-grid">
        <div className="panel-card wide">
          <div className="panel-header">
            <div>
              <h3>7 Day Appointment Trend</h3>
              <p>Realtime chart from Firebase appointment records.</p>
            </div>
            <HeartPulse size={24} />
          </div>
          <div className="chart-box">
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={last7}>
                <defs>
                  <linearGradient id="appointmentsFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5a4" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="#0ea5a4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="day" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Area type="monotone" dataKey="appointments" stroke="#0ea5a4" fill="url(#appointmentsFill)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="panel-card">
          <div className="panel-header compact">
            <div>
              <h3>System Health</h3>
              <p>Current live modules</p>
            </div>
          </div>
          <div className="activity-list">
            <div><Stethoscope size={18} /><span>{doctors.filter((d) => d.status === 'active').length} active doctors</span></div>
            <div><Pill size={18} /><span>{lowStock.length} low stock medicines</span></div>
            <div><FileText size={18} /><span>{files.length} uploaded patient files</span></div>
            <div><CalendarCheck size={18} /><span>{appointments.filter((a) => a.status === 'cancelled').length} cancelled bookings</span></div>
          </div>
        </div>
      </div>

      <div className="panel-card">
        <div className="panel-header">
          <div>
            <h3>Today&apos;s Appointments</h3>
            <p>Accept, cancel and complete from Appointments page.</p>
          </div>
        </div>
        <DataTable columns={columns} rows={todaysAppointments} loading={patientsLoading || appointmentsLoading} emptyText="No appointment created for today yet." />
      </div>
    </div>
  );
}
