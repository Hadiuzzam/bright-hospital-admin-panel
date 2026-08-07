import { Award, CalendarClock, Eye, GraduationCap, Pencil, Phone, Plus, Search, Sparkles, Stethoscope, Upload } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import PageHeader from '../../components/common/PageHeader.jsx';
import DataTable from '../../components/common/DataTable.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import Modal from '../../components/common/Modal.jsx';
import { useFirebaseList } from '../../hooks/useFirebaseList.js';
import { createDoctor, updateDoctor, uploadDoctorImage } from '../../services/hmsService.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { formatMoney } from '../../utils/format.js';
import { departmentOptions, defaultDoctorSlots } from '../../data/hospitalOptions.js';

const emptyDoctor = {
  name: '',
  nameBn: '',
  email: '',
  phone: '',
  department: 'Medicine',
  departmentId: 'medicine',
  specialization: '',
  specializationBn: '',
  qualifications: '',
  services: '',
  servicesBn: '',
  consultationFee: '',
  followUpFee: '',
  commissionType: 'percentage',
  commissionValue: '',
  roomNo: '',
  schedule: 'Sat-Thu, 5 PM - 9 PM',
  scheduleBn: '',
  slotDays: '0,1,2,3,4,6',
  slotTimes: '5:00 PM,7:00 PM,9:00 PM',
  initials: '',
  password: '123456',
  publicVisible: true,
  featured: false,
  status: 'active',
};

function getDepartmentOptions(liveDepartments) {
  const mapped = liveDepartments.map((item) => ({ id: item.id, name: item.nameEn || item.name, nameEn: item.nameEn || item.name, nameBn: item.nameBn || '' }));
  return mapped.length ? mapped : departmentOptions;
}

function detailValue(value) {
  return value || '-';
}

function doctorMonogram(doctor) {
  const words = String(doctor?.name || doctor?.nameEn || '')
    .replace(/^dr\.?\s*/i, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return (words.slice(0, 2).map((word) => word[0]).join('') || doctor?.initials || 'DR').slice(0, 2).toUpperCase();
}

export default function DoctorsList() {
  const { user } = useAuth();
  const { data: doctors, loading } = useFirebaseList('doctors');
  const { data: appointments } = useFirebaseList('appointments');
  const { data: patients } = useFirebaseList('patients');
  const { data: liveDepartments } = useFirebaseList('departments');
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [editingDoctorId, setEditingDoctorId] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyDoctor);

  const departments = getDepartmentOptions(liveDepartments);
  const filtered = useMemo(() => doctors.filter((doctor) => `${doctor.name} ${doctor.nameBn} ${doctor.department} ${doctor.specialization} ${doctor.qualifications} ${doctor.services} ${doctor.phone}`.toLowerCase().includes(query.toLowerCase())), [doctors, query]);
  const previewDoctors = filtered;

  const setDepartment = (departmentId) => {
    const department = departments.find((item) => item.id === departmentId);
    setForm((prev) => ({ ...prev, departmentId, appointmentTypeId: departmentId, department: department?.nameEn || department?.name || departmentId }));
  };

  const closeDoctorForm = () => {
    setOpen(false);
    setEditingDoctorId('');
    setImageFile(null);
    setImagePreview('');
    setForm(emptyDoctor);
  };

  const openAddDoctor = () => {
    setEditingDoctorId('');
    setImageFile(null);
    setImagePreview('');
    setForm(emptyDoctor);
    setOpen(true);
  };

  const openEditDoctor = (doctor) => {
    setEditingDoctorId(doctor.id);
    setImageFile(null);
    setImagePreview(doctor.imageUrl || doctor.imageData || '');
    const editableFields = Object.fromEntries(
      Object.keys(emptyDoctor).map((key) => [key, doctor[key] ?? emptyDoctor[key]])
    );
    setForm({
      ...editableFields,
      name: doctor.name || doctor.nameEn || '',
      specialization: doctor.specialization || doctor.specializationEn || '',
      qualifications: doctor.qualifications || doctor.degree || '',
      schedule: doctor.schedule || doctor.scheduleEn || '',
      services: doctor.services || doctor.servicesEn || '',
      consultationFee: doctor.consultationFee || '',
      followUpFee: doctor.followUpFee || '',
      commissionValue: doctor.commissionValue || '',
    });
    setOpen(true);
  };

  const chooseDoctorImage = (file) => {
    setImageFile(file || null);
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImagePreview(String(reader.result || ''));
    reader.readAsDataURL(file);
  };

  const fillDemoDoctor = () => {
    setForm({
      ...emptyDoctor,
      name: 'Dr. Md. Abdullah Al Mamun',
      nameBn: 'ডা. মোঃ আব্দুল্লাহ আল মামুন',
      email: 'mamun@brighthospital.com',
      phone: '01700000001',
      department: 'Medicine',
      departmentId: 'medicine',
      specialization: 'Diabetes, Medicine, Mother & Child Disease Specialist',
      specializationBn: 'ডায়াবেটিস, মেডিসিন এবং মা ও শিশু রোগ অভিজ্ঞ',
      qualifications: 'MBBS, PGT (Medicine), CCD (Diabetes), CMU (Ultra)',
      services: 'Diabetes, blood pressure, respiratory illness, mother and child care',
      servicesBn: 'ডায়াবেটিস, উচ্চ রক্তচাপ, শ্বাসকষ্ট, মা ও শিশু, মেডিসিন সেবা',
      consultationFee: '500',
      followUpFee: '300',
      roomNo: '203',
      schedule: 'Daily 9 AM - 3 PM (Saturday closed)',
      scheduleBn: 'প্রতিদিন সকাল ৯টা হতে দুপুর ৩টা পর্যন্ত (শনিবার বন্ধ)',
      slotDays: '0,1,2,3,4,5',
      slotTimes: '9:00 AM,11:00 AM,1:00 PM,3:00 PM',
      initials: 'AM',
      featured: true,
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const uploadId = editingDoctorId || form.initials || form.name;
      const uploaded = imageFile ? await uploadDoctorImage(imageFile, uploadId) : {};
      const payload = { ...form, ...uploaded };
      if (editingDoctorId) {
        await updateDoctor(editingDoctorId, payload, user);
        toast.success('Doctor details updated');
      } else {
        await createDoctor(payload, user);
        toast.success('Doctor saved to Firebase');
      }
      closeDoctorForm();
    } catch (error) {
      toast.error(error?.message || 'Failed to save doctor');
    } finally {
      setSaving(false);
    }
  };

  const doctorPatientRows = selectedDoctor
    ? appointments
        .filter((item) => item.doctorId === selectedDoctor.id || item.doctorInitials === selectedDoctor.initials)
        .map((item) => ({ ...item, patient: patients.find((patient) => patient.id === item.patientId) }))
    : [];

  const toggleStatus = async (doctor) => {
    try {
      await updateDoctor(doctor.id, { status: doctor.status === 'active' ? 'inactive' : 'active' }, user);
      toast.success('Doctor status updated');
    } catch (error) {
      toast.error(error?.message || 'Status update failed');
    }
  };

  const columns = [
    { key: 'name', label: 'Doctor' },
    { key: 'department', label: 'Department' },
    { key: 'specialization', label: 'Specialization' },
    { key: 'qualifications', label: 'Degree' },
    { key: 'consultationFee', label: 'Fee', render: (row) => formatMoney(row.consultationFee) },
    { key: 'roomNo', label: 'Room' },
    { key: 'schedule', label: 'Schedule' },
    { key: 'todayPatients', label: 'Patients', render: (row) => appointments.filter((item) => item.doctorId === row.id || item.doctorInitials === row.initials).length },
    { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div className="row-actions">
          <button onClick={() => { setSelectedDoctor(row); setDetailsOpen(true); }}><Eye size={14} /> View</button>
          <button onClick={() => toggleStatus(row)}>{row.status === 'active' ? 'Deactivate' : 'Activate'}</button>
        </div>
      ),
    },
  ];

  const patientColumns = [
    { key: 'patientName', label: 'Patient' },
    { key: 'patientPhone', label: 'Phone', render: (row) => row.patientPhone || row.phoneDisplay || row.phone || '-' },
    { key: 'date', label: 'Date', render: (row) => row.date || row.appointmentDate || '-' },
    { key: 'time', label: 'Time', render: (row) => row.time || row.appointmentTime || '-' },
    { key: 'reason', label: 'Reason' },
    { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
  ];

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Doctor Management"
        title="Doctors"
        subtitle="Manage doctors, departments, degree, special services, consultation fee, schedule and assigned patient history."
        action={<button className="primary-btn" onClick={openAddDoctor}><Plus size={17} /> Add Doctor</button>}
      />

      <div className="doctor-card-grid all-doctors-preview">
        {previewDoctors.map((doctor) => (
          <article className="doctor-card" key={doctor.id} onClick={() => { setSelectedDoctor(doctor); setDetailsOpen(true); }}>
            <div className="doctor-card-actions"><button type="button" onClick={(event) => { event.stopPropagation(); openEditDoctor(doctor); }}><Pencil size={14} /> Edit</button></div>
            <div className="doctor-card-identity">
              <div className={`doctor-avatar ${doctor.imageUrl ? 'has-image' : 'has-monogram'}`}><span>{doctorMonogram(doctor)}</span>{doctor.imageUrl ? <img src={doctor.imageUrl} alt={doctor.name} /> : null}</div>
              <div><h3>{doctor.name}</h3><p>{doctor.specialization}</p></div>
            </div>
            <small>{doctor.qualifications || doctor.degree}</small>
            <StatusBadge status={doctor.status} />
            <div className="doctor-card-footer"><span>Room {doctor.roomNo || '-'}</span><strong>{formatMoney(doctor.consultationFee)}</strong></div>
          </article>
        ))}
      </div>

      <div className="toolbar-card"><div className="search-control"><Search size={18} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search doctor by name, department, degree or specialization" /></div></div>

      <DataTable columns={columns} rows={filtered} loading={loading} emptyText="No doctor added yet." />

      <Modal open={open} title={editingDoctorId ? 'Edit Doctor' : 'Add Doctor'} onClose={closeDoctorForm}>
        <div className="helper-card"><Sparkles size={18} /><span>Demo: select department from dropdown, write schedule text for display, and write slot days/times for website date-time dropdown.</span><button className="secondary-btn" onClick={fillDemoDoctor}>Fill Demo</button></div>
        <div className="form-grid">
          <div className="span-2 doctor-image-upload">
            <span className="doctor-image-label">Doctor image</span>
            <div className="doctor-image-picker">
              <div className="doctor-image-preview">{imagePreview ? <img src={imagePreview} alt="Doctor preview" /> : <Stethoscope size={30} />}</div>
              <div className="doctor-upload-copy">
                <input id="doctor-image-input" className="visually-hidden-file" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => chooseDoctorImage(event.target.files?.[0])} />
                <label className="doctor-upload-button" htmlFor="doctor-image-input"><Upload size={17} /> {imageFile ? 'Change selected image' : imagePreview ? 'Replace portrait' : 'Upload portrait'}</label>
                <strong>{imageFile?.name || (imagePreview ? 'Current portrait will be kept' : 'No portrait selected')}</strong>
                <small>JPG, PNG or WebP · maximum 8 MB · stored securely in Firebase</small>
              </div>
            </div>
          </div>
          <label>Name<input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="Dr. Name" /></label>
          <label>Name Bangla<input value={form.nameBn || ''} onChange={(e) => setForm((p) => ({ ...p, nameBn: e.target.value }))} placeholder="ডা. ..." /></label>
          <label>Email/Login<input value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} placeholder="doctor@hospital.com" /></label>
          <label>Password<input value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} /></label>
          <label>Phone<input value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} /></label>
          <label>Department<select value={form.departmentId} onChange={(e) => setDepartment(e.target.value)}>{departments.map((department) => <option key={department.id} value={department.id}>{department.nameEn || department.name}</option>)}</select></label>
          <label>Specialization<input value={form.specialization} onChange={(e) => setForm((p) => ({ ...p, specialization: e.target.value }))} /></label>
          <label>Specialization Bangla<input value={form.specializationBn || ''} onChange={(e) => setForm((p) => ({ ...p, specializationBn: e.target.value }))} /></label>
          <label className="span-2">Degree / Qualifications<textarea value={form.qualifications || ''} onChange={(e) => setForm((p) => ({ ...p, qualifications: e.target.value }))} placeholder="MBBS (DU), FCPS, BCS (Health)" /></label>
          <label>Consultation Fee<input type="number" value={form.consultationFee} onChange={(e) => setForm((p) => ({ ...p, consultationFee: e.target.value }))} /></label>
          <label>Follow-up Fee<input type="number" value={form.followUpFee} onChange={(e) => setForm((p) => ({ ...p, followUpFee: e.target.value }))} /></label>
          <label>Commission Type<select value={form.commissionType} onChange={(e) => setForm((p) => ({ ...p, commissionType: e.target.value }))}><option value="percentage">Percentage</option><option value="fixed">Fixed</option></select></label>
          <label>Commission Value<input type="number" value={form.commissionValue} onChange={(e) => setForm((p) => ({ ...p, commissionValue: e.target.value }))} /></label>
          <label>Room No<input value={form.roomNo} onChange={(e) => setForm((p) => ({ ...p, roomNo: e.target.value }))} /></label>
          <label>Initials<input value={form.initials || ''} onChange={(e) => setForm((p) => ({ ...p, initials: e.target.value.toUpperCase() }))} placeholder="AM" /></label>
          <label className="span-2">Schedule English<input value={form.schedule || ''} onChange={(e) => setForm((p) => ({ ...p, schedule: e.target.value }))} placeholder="Daily 9 AM - 3 PM (Saturday closed)" /></label>
          <label className="span-2">Schedule Bangla<input value={form.scheduleBn || ''} onChange={(e) => setForm((p) => ({ ...p, scheduleBn: e.target.value }))} placeholder="প্রতিদিন সকাল ৯টা হতে দুপুর ৩টা পর্যন্ত" /></label>
          <label>Slot Preset<select value={`${form.slotDays}|${form.slotTimes}`} onChange={(e) => { const item = defaultDoctorSlots.find((slot) => `${slot.days}|${slot.times}` === e.target.value); if (item) setForm((p) => ({ ...p, schedule: p.schedule || item.label, slotDays: item.days, slotTimes: item.times })); }}><option value={`${form.slotDays}|${form.slotTimes}`}>Keep custom/manual</option>{defaultDoctorSlots.map((slot) => <option key={slot.label} value={`${slot.days}|${slot.times}`}>{slot.label}</option>)}</select></label>
          <label>Manual Slot Days<input value={form.slotDays || ''} onChange={(e) => setForm((p) => ({ ...p, slotDays: e.target.value }))} placeholder="0,1,2,3,4,6" /></label>
          <label className="span-2">Manual Slot Times<input value={form.slotTimes || ''} onChange={(e) => setForm((p) => ({ ...p, slotTimes: e.target.value }))} placeholder="9:00 AM,11:00 AM,1:00 PM" /></label>
          <label className="span-2">Special Services English<textarea value={form.services || ''} onChange={(e) => setForm((p) => ({ ...p, services: e.target.value }))} placeholder="1) Diabetes care 2) High blood pressure 3) Mother and child care" /></label>
          <label className="span-2">Special Services Bangla<textarea value={form.servicesBn || ''} onChange={(e) => setForm((p) => ({ ...p, servicesBn: e.target.value }))} /></label>
          <label className="check-label"><input type="checkbox" checked={Boolean(form.featured)} onChange={(e) => setForm((p) => ({ ...p, featured: e.target.checked }))} /> Featured on top</label>
          <label className="check-label"><input type="checkbox" checked={form.publicVisible !== false} onChange={(e) => setForm((p) => ({ ...p, publicVisible: e.target.checked }))} /> Public Website Visible</label>
        </div>
        <div className="form-help"><strong>Schedule slot days:</strong> 0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday. Website appointment date/time will be generated from these values.</div>
        <div className="modal-actions"><button className="secondary-btn" onClick={closeDoctorForm}>Cancel</button><button className="primary-btn" disabled={saving} onClick={handleSave}>{saving ? 'Saving...' : editingDoctorId ? 'Update Doctor' : 'Save Doctor'}</button></div>
      </Modal>

      <Modal open={detailsOpen} title="Doctor Details & Patients" onClose={() => setDetailsOpen(false)} size="doctor-wide">
        {selectedDoctor ? (
          <div className="doctor-details-modal compact-details-modal">
            <div className="doctor-profile-layout">
              <div className="doctor-hero-card doctor-hero-flat">
                <div className={`doctor-hero-portrait ${selectedDoctor.imageUrl ? 'has-image' : 'has-monogram'}`}><span>{doctorMonogram(selectedDoctor)}</span>{selectedDoctor.imageUrl ? <img src={selectedDoctor.imageUrl} alt={selectedDoctor.name} /> : null}</div>
                <div className="doctor-hero-copy">
                  <span className="soft-pill">{selectedDoctor.department || 'Department'}</span>
                  <h2>{selectedDoctor.name}</h2>
                  {selectedDoctor.nameBn ? <p>{selectedDoctor.nameBn}</p> : null}
                  <strong>{selectedDoctor.specialization || 'Specialist Doctor'}</strong>
                  {selectedDoctor.specializationBn ? <small>{selectedDoctor.specializationBn}</small> : null}
                </div>
                <StatusBadge status={selectedDoctor.status} />
                <button className="doctor-detail-edit" type="button" onClick={() => { setDetailsOpen(false); openEditDoctor(selectedDoctor); }}><Pencil size={15} /> Edit doctor</button>
              </div>

              <div className="doctor-info-grid doctor-info-grid-compact">
                <div className="doctor-detail-wide"><GraduationCap size={18} /><span>Degree / Qualifications</span><strong>{detailValue(selectedDoctor.qualifications || selectedDoctor.degree)}</strong></div>
                <div className="doctor-detail-wide"><Award size={18} /><span>Special services</span><strong>{detailValue(selectedDoctor.services)}</strong>{selectedDoctor.servicesBn ? <small>{selectedDoctor.servicesBn}</small> : null}</div>
                <div className="doctor-detail-wide"><CalendarClock size={18} /><span>Chamber schedule</span><strong>{detailValue(selectedDoctor.schedule)}</strong>{selectedDoctor.scheduleBn ? <small>{selectedDoctor.scheduleBn}</small> : null}</div>
                <div><CalendarClock size={18} /><span>Booking days</span><strong>{detailValue(selectedDoctor.slotDays)}</strong></div>
                <div><CalendarClock size={18} /><span>Booking times</span><strong>{detailValue(selectedDoctor.slotTimes)}</strong></div>
                <div><Phone size={18} /><span>Phone</span><strong>{detailValue(selectedDoctor.phone)}</strong></div>
                <div><Stethoscope size={18} /><span>Room</span><strong>{detailValue(selectedDoctor.roomNo)}</strong></div>
                <div><CalendarClock size={18} /><span>Consultation fee</span><strong>{selectedDoctor.consultationFee ? formatMoney(selectedDoctor.consultationFee) : '-'}</strong></div>
                <div><CalendarClock size={18} /><span>Follow-up fee</span><strong>{selectedDoctor.followUpFee ? formatMoney(selectedDoctor.followUpFee) : '-'}</strong></div>
              </div>
            </div>

            <div className="doctor-linked-panel">
              <div className="panel-header compact-panel-header">
                <div>
                  <h3>Linked patient appointments</h3>
                  <p>All appointments connected with this doctor.</p>
                </div>
                <span className="soft-pill">{doctorPatientRows.length} visits</span>
              </div>
              <DataTable columns={patientColumns} rows={doctorPatientRows} emptyText="No patient appointment linked with this doctor yet." />
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
