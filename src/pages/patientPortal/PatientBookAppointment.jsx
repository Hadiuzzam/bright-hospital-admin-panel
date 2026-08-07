import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { CalendarPlus, Search, Stethoscope } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useFirebaseList } from '../../hooks/useFirebaseList.js';
import { createPatientAppointment } from '../../services/hmsService.js';
import { formatMoney } from '../../utils/format.js';

export default function PatientBookAppointment() {
  const { user } = useAuth();
  const { data: types } = useFirebaseList('appointmentTypes');
  const { data: doctors } = useFirebaseList('doctors');
  const [selectedType, setSelectedType] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [form, setForm] = useState({ date: '', time: '', reason: '' });
  const [saving, setSaving] = useState(false);

  const activeDoctors = useMemo(() => doctors.filter((doctor) => doctor.status !== 'inactive'), [doctors]);
  const filteredDoctors = selectedType
    ? activeDoctors.filter(
        (doctor) =>
          String(doctor.appointmentTypeId || '').toLowerCase() === String(selectedType).toLowerCase()
          || String(doctor.department || '').toLowerCase() === String(selectedType).toLowerCase(),
      )
    : activeDoctors;

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await createPatientAppointment({ ...form, appointmentTypeId: selectedType, doctorId: selectedDoctor }, user);
      toast.success('Appointment request submitted. Hospital staff will accept/cancel it.');
      setSelectedDoctor('');
      setForm({ date: '', time: '', reason: '' });
    } catch (error) {
      toast.error(error?.message || 'Booking failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-stack">
      <PageHeader eyebrow="Patient booking" title="Search appointment type & book doctor" subtitle="Patient can create only own booking request. Staff will accept or cancel from HMS." />

      <div className="panel-card">
        <div className="section-title"><Search size={18} /> Search appointment type</div>
        <div className="appointment-type-grid">
          <button className={!selectedType ? 'selected' : ''} onClick={() => setSelectedType('')} type="button">All Doctors</button>
          {types.map((type) => (
            <button key={type.id} className={String(selectedType).toLowerCase() === String(type.id).toLowerCase() || String(selectedType).toLowerCase() === String(type.department).toLowerCase() ? 'selected' : ''} onClick={() => setSelectedType(type.department || type.id)} type="button">
              {type.name}<span>{type.department}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="doctor-card-grid">
        {filteredDoctors.map((doctor) => (
          <button key={doctor.id} className={`doctor-select-card ${selectedDoctor === doctor.id ? 'selected' : ''}`} onClick={() => setSelectedDoctor(doctor.id)} type="button">
            <div className="doctor-avatar"><Stethoscope size={24} /></div>
            <h3>{doctor.name}</h3>
            <p>{doctor.specialization}</p>
            <span>{doctor.department} • Room {doctor.roomNo || '-'}</span>
            <strong>{formatMoney(doctor.consultationFee)}</strong>
            <StatusBadge status={doctor.status || 'active'} />
          </button>
        ))}
      </div>

      <div className="panel-card">
        <div className="section-title"><CalendarPlus size={18} /> Booking details</div>
        <div className="form-grid three">
          <label>Date<input type="date" value={form.date} onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))} /></label>
          <label>Time<input type="time" value={form.time} onChange={(e) => setForm((p) => ({ ...p, time: e.target.value }))} /></label>
          <label>Reason<input value={form.reason} onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))} placeholder="Problem / symptoms" /></label>
        </div>
        <div className="modal-actions"><button className="primary-btn" disabled={saving || !selectedDoctor || !form.date || !form.time} onClick={handleSubmit}>{saving ? 'Requesting...' : 'Request Appointment'}</button></div>
      </div>
    </div>
  );
}
