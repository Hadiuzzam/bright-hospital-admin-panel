import { CalendarDays, CalendarPlus, CheckCircle2, Clock, FileText, Filter, Search, UserPlus, XCircle } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import PageHeader from '../../components/common/PageHeader.jsx';
import DataTable from '../../components/common/DataTable.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import Modal from '../../components/common/Modal.jsx';
import StatCard from '../../components/common/StatCard.jsx';
import { useFirebaseList } from '../../hooks/useFirebaseList.js';
import { changeAppointmentStatus, createAppointment, createInvoice } from '../../services/hmsService.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { formatMoney, todayDate } from '../../utils/format.js';
import { departmentOptions } from '../../data/hospitalOptions.js';

const newForm = {
  patientId: '',
  patientName: '',
  patientPhone: '',
  doctorId: '',
  departmentId: '',
  date: todayDate(),
  time: '',
  reason: '',
  status: 'accepted',
  paymentStatus: 'unpaid',
};

const dayLabels = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function normalizePhone(value) {
  return String(value || '').replace(/\D/g, '').slice(0, 14);
}

function localDateValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDepartmentOptions(liveDepartments) {
  const mapped = liveDepartments.map((item) => ({
    id: item.id,
    name: item.nameEn || item.name,
    nameEn: item.nameEn || item.name,
    nameBn: item.nameBn || '',
  }));
  return mapped.length ? mapped : departmentOptions;
}

function doctorDisplayName(doctor) {
  return doctor?.nameEn || doctor?.name || doctor?.doctorName || 'Doctor';
}

function doctorDeptId(doctor) {
  return doctor?.departmentId || doctor?.appointmentTypeId || doctor?.departmentKey || '';
}

function scheduleSlotsForDoctor(doctor) {
  if (Array.isArray(doctor?.scheduleSlots) && doctor.scheduleSlots.length) return doctor.scheduleSlots;
  const days = String(doctor?.slotDays || '').split(',').map((item) => Number(item.trim())).filter((item) => Number.isInteger(item));
  const times = String(doctor?.slotTimes || '').split(',').map((item) => item.trim()).filter(Boolean);
  return days.length && times.length ? [{ days, times }] : [{ days: [0, 1, 2, 3, 4, 5, 6], times: ['9:00 AM'] }];
}

function dateOptionsForDoctor(doctor) {
  if (!doctor) return [];
  const slots = scheduleSlotsForDoctor(doctor);
  const dates = [];
  for (let offset = 0; offset < 35 && dates.length < 12; offset += 1) {
    const date = new Date();
    date.setDate(date.getDate() + offset);
    const day = date.getDay();
    const timeSlots = [...new Set(slots.filter((slot) => (slot.days || []).includes(day)).flatMap((slot) => slot.times || []))];
    if (timeSlots.length) {
      dates.push({ value: localDateValue(date), label: `${dayLabels[day]}, ${date.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })}`, timeSlots });
    }
  }
  return dates;
}

export default function AppointmentsList() {
  const { user } = useAuth();
  const { data: appointments, loading } = useFirebaseList('appointments');
  const { data: patients } = useFirebaseList('patients');
  const { data: doctors } = useFirebaseList('doctors');
  const { data: liveDepartments } = useFirebaseList('departments');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [doctorFilter, setDoctorFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState(todayDate());
  const [open, setOpen] = useState(false);
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(newForm);
  const [invoiceForm, setInvoiceForm] = useState({ paid: '', paymentMethod: 'cash' });

  const departments = getDepartmentOptions(liveDepartments);
  const apptDate = (item) => item.date || item.appointmentDate || '';
  const apptTime = (item) => item.time || item.appointmentTime || '';
  const apptPhone = (item) => item.patientPhone || item.phoneDisplay || item.phone || '';
  const apptDepartmentId = (item) => item.departmentId || item.appointmentTypeId || item.department || '';
  const todayAppointments = appointments.filter((item) => apptDate(item) === todayDate());
  const completed = appointments.filter((item) => item.status === 'completed');
  const cancelled = appointments.filter((item) => ['cancelled', 'cancelled_by_patient'].includes(item.status));
  const waiting = appointments.filter((item) => ['requested', 'pending', 'accepted', 'waiting', 'in_consultation'].includes(item.status));

  const filtered = useMemo(() => {
    return appointments.filter((item) => {
      const text = `${item.patientName} ${apptPhone(item)} ${item.doctorName} ${apptDate(item)} ${item.status} ${item.departmentName || item.department}`.toLowerCase();
      const matchesText = text.includes(query.toLowerCase());
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
      const matchesDoctor = doctorFilter === 'all' || item.doctorId === doctorFilter || item.doctorInitials === doctorFilter;
      const matchesDepartment = departmentFilter === 'all' || apptDepartmentId(item) === departmentFilter || item.department === departmentFilter;
      const matchesDate = !dateFilter || apptDate(item) === dateFilter;
      return matchesText && matchesStatus && matchesDoctor && matchesDepartment && matchesDate;
    });
  }, [appointments, query, statusFilter, doctorFilter, departmentFilter, dateFilter]);

  const selectedDepartment = departments.find((department) => department.id === form.departmentId) || null;
  const doctorOptions = useMemo(() => {
    if (!form.departmentId) return doctors;
    return doctors.filter((doctor) => doctorDeptId(doctor) === form.departmentId || doctor.department === selectedDepartment?.nameEn || doctor.department === selectedDepartment?.name);
  }, [doctors, form.departmentId, selectedDepartment]);
  const selectedDoctor = doctors.find((doctor) => doctor.id === form.doctorId || doctor.initials === form.doctorId);
  const dateChoices = useMemo(() => dateOptionsForDoctor(selectedDoctor), [selectedDoctor]);
  const timeChoices = dateChoices.find((item) => item.value === form.date)?.timeSlots || [];
  const matchedPatient = useMemo(() => {
    const phone = normalizePhone(form.patientPhone);
    if (!phone) return null;
    return patients.find((patient) => {
      const patientPhones = [patient.phone, patient.phoneDisplay, patient.phoneKey, patient.patientPhone].map(normalizePhone);
      return patientPhones.some((item) => item === phone || item.endsWith(phone) || phone.endsWith(item));
    }) || null;
  }, [form.patientPhone, patients]);

  const setDepartment = (departmentId) => {
    setForm((prev) => ({ ...prev, departmentId, doctorId: '', date: todayDate(), time: '' }));
  };

  const setDoctor = (doctorId) => {
    const doctor = doctors.find((item) => item.id === doctorId || item.initials === doctorId);
    setForm((prev) => ({
      ...prev,
      doctorId,
      departmentId: doctorDeptId(doctor) || prev.departmentId,
      date: todayDate(),
      time: '',
      fee: doctor?.consultationFee || 0,
    }));
  };

  const handlePhoneChange = (value) => {
    const phone = normalizePhone(value);
    const found = patients.find((patient) => {
      const patientPhones = [patient.phone, patient.phoneDisplay, patient.phoneKey, patient.patientPhone].map(normalizePhone);
      return patientPhones.some((item) => item === phone || item.endsWith(phone) || phone.endsWith(item));
    });
    setForm((prev) => ({
      ...prev,
      patientPhone: value,
      patientId: found?.id || '',
      patientName: found?.name || prev.patientName,
    }));
  };

  const handleCreate = async () => {
    if (!form.patientName || !form.patientPhone || !form.doctorId || !form.date || !form.time) {
      toast.error('Patient name, phone, doctor, date and time are required');
      return;
    }
    setSaving(true);
    try {
      const doctor = selectedDoctor;
      const department = departments.find((item) => item.id === form.departmentId);
      const patient = matchedPatient || patients.find((item) => item.id === form.patientId);
      await createAppointment({
        ...form,
        patientId: patient?.id || '',
        patientName: patient?.name || form.patientName,
        patientPhone: patient?.phone || form.patientPhone,
        patientUid: patient?.patientUid || patient?.ownerUid || patient?.uid || '',
        ownerUid: patient?.ownerUid || patient?.patientUid || patient?.uid || '',
        doctorName: doctorDisplayName(doctor),
        doctorInitials: doctor?.initials || '',
        department: department?.nameEn || department?.name || doctor?.department || '',
        departmentName: department?.nameEn || department?.name || doctor?.department || '',
        departmentNameBn: department?.nameBn || '',
        departmentId: form.departmentId || doctorDeptId(doctor),
        appointmentTypeId: form.departmentId || doctorDeptId(doctor),
        fee: doctor?.consultationFee || 0,
      }, user);
      toast.success(patient ? 'Appointment created for existing patient' : 'Appointment created with new guest patient');
      setForm(newForm);
      setOpen(false);
    } catch (error) {
      toast.error(error?.message || 'Failed to create appointment');
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (row, status) => {
    try {
      let extra = {};
      if (status === 'cancelled') {
        const cancelReason = window.prompt('Cancellation reason?');
        if (!cancelReason) return;
        extra = { cancelReason };
      }
      await changeAppointmentStatus(row.id, status, user, extra);
      toast.success(`Appointment marked ${status}`);
    } catch (error) {
      toast.error(error?.message || 'Status update failed');
    }
  };

  const openInvoice = (row) => {
    setSelectedAppointment(row);
    setInvoiceForm({ paid: row.fee || '', paymentMethod: 'cash' });
    setInvoiceOpen(true);
  };

  const handleInvoice = async () => {
    if (!selectedAppointment) return;
    setSaving(true);
    try {
      await createInvoice({
        type: 'consultation',
        patientId: selectedAppointment.patientId,
        patientUid: selectedAppointment.patientUid || selectedAppointment.ownerUid || '',
        ownerUid: selectedAppointment.ownerUid || selectedAppointment.patientUid || '',
        patientName: selectedAppointment.patientName,
        appointmentId: selectedAppointment.id,
        items: [{ name: `Consultation - ${selectedAppointment.doctorName}`, qty: 1, unitPrice: selectedAppointment.fee || 0, total: selectedAppointment.fee || 0 }],
        subtotal: selectedAppointment.fee || 0,
        total: selectedAppointment.fee || 0,
        paid: invoiceForm.paid,
        paymentMethod: invoiceForm.paymentMethod,
      }, user);
      await changeAppointmentStatus(selectedAppointment.id, selectedAppointment.status, user, { paymentStatus: 'invoiced' });
      toast.success('Consultation invoice created');
      setInvoiceOpen(false);
    } catch (error) {
      toast.error(error?.message || 'Invoice failed');
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { key: 'serialNo', label: 'Serial' },
    { key: 'patientName', label: 'Patient' },
    { key: 'patientPhone', label: 'Phone', render: (row) => apptPhone(row) },
    { key: 'doctorName', label: 'Doctor' },
    { key: 'departmentName', label: 'Department', render: (row) => row.departmentName || row.department || '-' },
    { key: 'date', label: 'Date', render: (row) => apptDate(row) },
    { key: 'time', label: 'Time', render: (row) => apptTime(row) },
    { key: 'fee', label: 'Fee', render: (row) => formatMoney(row.fee) },
    { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div className="row-actions">
          {['requested', 'pending'].includes(row.status) && <button onClick={() => updateStatus(row, 'accepted')}>Accept</button>}
          {row.status !== 'cancelled' && row.status !== 'completed' && <button onClick={() => updateStatus(row, 'waiting')}>Waiting</button>}
          {row.status !== 'cancelled' && row.status !== 'completed' && <button onClick={() => updateStatus(row, 'in_consultation')}>Start</button>}
          {row.status !== 'cancelled' && row.status !== 'completed' && <button onClick={() => updateStatus(row, 'completed')}>Complete</button>}
          {row.status !== 'cancelled' && row.status !== 'completed' && <button className="danger" onClick={() => updateStatus(row, 'cancelled')}>Cancel</button>}
          <button onClick={() => openInvoice(row)}>Invoice</button>
        </div>
      ),
    },
  ];

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Bookings & Queue"
        title="Appointments"
        subtitle="Default view is today. Filter by doctor, department, date and status for quick reception/admin control."
        action={<button className="primary-btn" onClick={() => setOpen(true)}><CalendarPlus size={17} /> New Appointment</button>}
      />

      <div className="stats-grid four">
        <StatCard title="Today" value={todayAppointments.length} subtitle="appointments" icon={Clock} />
        <StatCard title="Active Queue" value={waiting.length} subtitle="waiting/accepted" icon={CheckCircle2} tone="blue" />
        <StatCard title="Completed" value={completed.length} subtitle="all time" icon={FileText} tone="green" />
        <StatCard title="Cancelled" value={cancelled.length} subtitle="all time" icon={XCircle} tone="orange" />
      </div>

      <div className="toolbar-card appointment-filters">
        <div className="search-control"><Search size={18} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search patient, doctor, date or status" /></div>
        <label className="mini-filter"><Filter size={15} /> Date<input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} /></label>
        <select className="filter-select" value={doctorFilter} onChange={(e) => setDoctorFilter(e.target.value)}>
          <option value="all">All Doctors</option>
          {doctors.map((doctor) => <option key={doctor.id} value={doctor.id}>{doctorDisplayName(doctor)}</option>)}
        </select>
        <select className="filter-select" value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)}>
          <option value="all">All Departments</option>
          {departments.map((department) => <option key={department.id} value={department.id}>{department.nameEn || department.name}</option>)}
        </select>
        <select className="filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All Status</option>
          <option value="requested">Requested</option>
          <option value="accepted">Accepted</option>
          <option value="waiting">Waiting</option>
          <option value="in_consultation">In Consultation</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
          <option value="cancelled_by_patient">Patient Cancelled</option>
        </select>
        <button className="secondary-btn" onClick={() => { setDateFilter(todayDate()); setDoctorFilter('all'); setDepartmentFilter('all'); setStatusFilter('all'); setQuery(''); }}>Reset</button>
      </div>

      <DataTable columns={columns} rows={filtered} loading={loading} emptyText="No appointment found for selected filters." />

      <Modal open={open} title="New Appointment" onClose={() => setOpen(false)}>
        <div className="appointment-wizard">
          <div className="wizard-banner">
            <CalendarDays size={24} />
            <div><strong>Reception booking</strong><span>Enter phone first. The system will detect existing patient, otherwise create a guest patient.</span></div>
          </div>
          <div className="form-grid">
            <label>Patient Phone<input value={form.patientPhone} onChange={(e) => handlePhoneChange(e.target.value)} placeholder="01XXXXXXXXX" /></label>
            <label>Patient Name<input value={form.patientName} onChange={(e) => setForm((p) => ({ ...p, patientName: e.target.value, patientId: matchedPatient?.id || p.patientId }))} placeholder="Patient name" /></label>
            <label>Department<select value={form.departmentId} onChange={(e) => setDepartment(e.target.value)}><option value="">Choose department</option>{departments.map((department) => <option key={department.id} value={department.id}>{department.nameEn || department.name}</option>)}</select></label>
            <label>Doctor<select value={form.doctorId} onChange={(e) => setDoctor(e.target.value)}><option value="">Choose doctor</option>{doctorOptions.map((doctor) => <option key={doctor.id} value={doctor.id}>{doctorDisplayName(doctor)} · {doctor.specializationEn || doctor.specialization || 'Specialist'}</option>)}</select></label>
            <label>Date<select value={form.date} onChange={(e) => setForm((p) => ({ ...p, date: e.target.value, time: '' }))}><option value="">Choose available date</option>{dateChoices.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
            <label>Time<select value={form.time} onChange={(e) => setForm((p) => ({ ...p, time: e.target.value }))}><option value="">Choose time</option>{timeChoices.map((time) => <option key={time} value={time}>{time}</option>)}</select></label>
            <label>Status<select value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}><option value="accepted">Accepted</option><option value="requested">Requested</option><option value="waiting">Waiting</option></select></label>
            <label>Fee<input disabled value={selectedDoctor ? formatMoney(selectedDoctor.consultationFee) : 'Select doctor first'} /></label>
            <label className="span-2">Reason<textarea value={form.reason} onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))} placeholder="Symptoms / reason / note" /></label>
          </div>
          {form.patientPhone ? (
            <div className={matchedPatient ? 'patient-match found' : 'patient-match guest'}>
              <UserPlus size={18} />
              {matchedPatient ? <span>Existing patient detected: <strong>{matchedPatient.patientCode || matchedPatient.id} · {matchedPatient.name}</strong></span> : <span>No existing patient found. This booking will create a <strong>guest patient</strong> from phone and name.</span>}
            </div>
          ) : null}
        </div>
        <div className="modal-actions"><button className="secondary-btn" onClick={() => setOpen(false)}>Cancel</button><button className="primary-btn" disabled={saving} onClick={handleCreate}>{saving ? 'Creating...' : 'Create Appointment'}</button></div>
      </Modal>

      <Modal open={invoiceOpen} title="Create Consultation Invoice" onClose={() => setInvoiceOpen(false)}>
        <div className="summary-card"><strong>{selectedAppointment?.patientName}</strong><span>{selectedAppointment?.doctorName} · {selectedAppointment?.date} {selectedAppointment?.time}</span><b>{formatMoney(selectedAppointment?.fee)}</b></div>
        <div className="form-grid"><label>Paid Amount<input type="number" value={invoiceForm.paid} onChange={(e) => setInvoiceForm((p) => ({ ...p, paid: e.target.value }))} /></label><label>Payment Method<select value={invoiceForm.paymentMethod} onChange={(e) => setInvoiceForm((p) => ({ ...p, paymentMethod: e.target.value }))}><option value="cash">Cash</option><option value="bkash">bKash</option><option value="nagad">Nagad</option><option value="card">Card</option><option value="bank">Bank</option></select></label></div>
        <div className="modal-actions"><button className="secondary-btn" onClick={() => setInvoiceOpen(false)}>Cancel</button><button className="primary-btn" disabled={saving} onClick={handleInvoice}>{saving ? 'Saving...' : 'Create Invoice'}</button></div>
      </Modal>
    </div>
  );
}
