import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarPlus, FileUp, HeartPulse, Phone, Save, UserRound } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import PageHeader from '../../components/common/PageHeader.jsx';
import DataTable from '../../components/common/DataTable.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import Modal from '../../components/common/Modal.jsx';
import { useFirebaseItem } from '../../hooks/useFirebaseItem.js';
import { useFirebaseList } from '../../hooks/useFirebaseList.js';
import { addClinicalNote, createAppointment, updatePatient, uploadPatientFile } from '../../services/hmsService.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { formatDateTime, formatMoney, todayDate } from '../../utils/format.js';

export default function PatientProfile() {
  const { patientId } = useParams();
  const { user } = useAuth();
  const { data: patient, loading } = useFirebaseItem('patients', patientId);
  const { data: appointments } = useFirebaseList('appointments');
  const { data: doctors } = useFirebaseList('doctors');
  const { data: files } = useFirebaseList('patientFiles');
  const { data: notes } = useFirebaseList('clinicalNotes');

  const [appointmentOpen, setAppointmentOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [appointmentForm, setAppointmentForm] = useState({ doctorId: '', date: todayDate(), time: '', reason: '', status: 'accepted' });
  const [uploadForm, setUploadForm] = useState({ category: 'report', note: '' });
  const [noteForm, setNoteForm] = useState({ appointmentId: '', doctorId: '', symptoms: '', diagnosis: '', prescription: '', advice: '', followUpDate: '' });

  const patientAppointments = useMemo(() => appointments.filter((item) => item.patientId === patientId), [appointments, patientId]);
  const patientFiles = useMemo(() => files.filter((item) => item.patientId === patientId), [files, patientId]);
  const patientNotes = useMemo(() => notes.filter((item) => item.patientId === patientId), [notes, patientId]);

  if (loading) return <div className="panel-card">Loading patient profile...</div>;
  if (!patient) return <div className="panel-card">Patient not found.</div>;

  const selectedDoctor = doctors.find((doctor) => doctor.id === appointmentForm.doctorId);

  const handleCreateAppointment = async () => {
    setSaving(true);
    try {
      await createAppointment({
        ...appointmentForm,
        patientId,
        patientName: patient.name,
        patientPhone: patient.phone,
        doctorName: selectedDoctor?.name || '',
        department: selectedDoctor?.department || '',
        fee: selectedDoctor?.consultationFee || 0,
      }, user);
      toast.success('Appointment created for this patient');
      setAppointmentForm({ doctorId: '', date: todayDate(), time: '', reason: '', status: 'accepted' });
      setAppointmentOpen(false);
    } catch (error) {
      toast.error(error?.message || 'Failed to create appointment');
    } finally {
      setSaving(false);
    }
  };

  const handleUpload = async () => {
    setSaving(true);
    try {
      await uploadPatientFile(selectedFile, { ...uploadForm, patientId, patientName: patient.name }, user);
      toast.success('File uploaded and linked with patient');
      setSelectedFile(null);
      setUploadForm({ category: 'report', note: '' });
      setUploadOpen(false);
    } catch (error) {
      toast.error(error?.message || 'Upload failed');
    } finally {
      setSaving(false);
    }
  };

  const handleNote = async () => {
    setSaving(true);
    try {
      const doctor = doctors.find((item) => item.id === noteForm.doctorId);
      await addClinicalNote({ ...noteForm, patientId, doctorName: doctor?.name || user?.name }, user);
      toast.success('Clinical note saved');
      setNoteForm({ appointmentId: '', doctorId: '', symptoms: '', diagnosis: '', prescription: '', advice: '', followUpDate: '' });
      setNoteOpen(false);
    } catch (error) {
      toast.error(error?.message || 'Failed to save note');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePatient = async () => {
    setSaving(true);
    try {
      await updatePatient(patientId, editForm, user);
      toast.success('Patient profile updated');
      setEditOpen(false);
    } catch (error) {
      toast.error(error?.message || 'Failed to update patient');
    } finally {
      setSaving(false);
    }
  };

  const appointmentColumns = [
    { key: 'date', label: 'Date' },
    { key: 'time', label: 'Time' },
    { key: 'doctorName', label: 'Doctor' },
    { key: 'reason', label: 'Reason' },
    { key: 'fee', label: 'Fee', render: (row) => formatMoney(row.fee) },
    { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
  ];

  const fileColumns = [
    { key: 'fileName', label: 'File', render: (row) => <a className="table-link" href={row.fileUrl} target="_blank" rel="noreferrer">{row.fileName}</a> },
    { key: 'category', label: 'Category' },
    { key: 'note', label: 'Note' },
    { key: 'createdAt', label: 'Uploaded', render: (row) => formatDateTime(row.createdAt) },
  ];

  const noteColumns = [
    { key: 'doctorName', label: 'Doctor' },
    { key: 'diagnosis', label: 'Diagnosis' },
    { key: 'prescription', label: 'Prescription' },
    { key: 'followUpDate', label: 'Follow-up' },
    { key: 'createdAt', label: 'Created', render: (row) => formatDateTime(row.createdAt) },
  ];

  return (
    <div className="page-stack">
      <Link className="back-link" to="/patients"><ArrowLeft size={17} /> Back to patients</Link>
      <PageHeader
        eyebrow={patient.patientCode}
        title={patient.name}
        subtitle="Complete patient profile, appointments, files and doctor notes."
        action={<button className="secondary-btn" onClick={() => { setEditForm(patient); setEditOpen(true); }}><Save size={17} /> Edit Profile</button>}
      />

      <div className="profile-grid">
        <div className="profile-card main-profile">
          <div className="patient-avatar"><UserRound size={38} /></div>
          <h2>{patient.name}</h2>
          <p><Phone size={15} /> {patient.phone}</p>
          <div className="profile-meta">
            <span>Age: <strong>{patient.age || '-'}</strong></span>
            <span>Gender: <strong>{patient.gender || '-'}</strong></span>
            <span>Blood: <strong>{patient.bloodGroup || '-'}</strong></span>
            <span>Address: <strong>{patient.address || '-'}</strong></span>
          </div>
        </div>

        <button className="mini-action-card" onClick={() => setAppointmentOpen(true)}><CalendarPlus size={28} /><strong>New Appointment</strong><span>Create booking for this patient</span></button>
        <button className="mini-action-card" onClick={() => setUploadOpen(true)}><FileUp size={28} /><strong>Upload File</strong><span>Report, prescription or document</span></button>
        <button className="mini-action-card" onClick={() => setNoteOpen(true)}><HeartPulse size={28} /><strong>Clinical Note</strong><span>Diagnosis and prescription</span></button>
      </div>

      <div className="panel-card">
        <div className="panel-header"><div><h3>Appointment History</h3><p>All bookings linked with this patient.</p></div></div>
        <DataTable columns={appointmentColumns} rows={patientAppointments} emptyText="No appointment yet." />
      </div>

      <div className="panel-card">
        <div className="panel-header"><div><h3>Doctor Notes & Prescriptions</h3><p>Clinical notes saved by doctors/staff.</p></div></div>
        <DataTable columns={noteColumns} rows={patientNotes} emptyText="No clinical note yet." />
      </div>

      <div className="panel-card">
        <div className="panel-header"><div><h3>Uploaded Files</h3><p>Firebase Storage files linked to this patient.</p></div></div>
        <DataTable columns={fileColumns} rows={patientFiles} emptyText="No patient file uploaded yet." />
      </div>

      <Modal open={appointmentOpen} title="Create Appointment" onClose={() => setAppointmentOpen(false)}>
        <div className="form-grid">
          <label>Doctor<select value={appointmentForm.doctorId} onChange={(event) => setAppointmentForm((p) => ({ ...p, doctorId: event.target.value }))}><option value="">Select doctor</option>{doctors.map((doctor) => <option key={doctor.id} value={doctor.id}>{doctor.name} - {doctor.specialization}</option>)}</select></label>
          <label>Date<input type="date" value={appointmentForm.date} onChange={(event) => setAppointmentForm((p) => ({ ...p, date: event.target.value }))} /></label>
          <label>Time<input type="time" value={appointmentForm.time} onChange={(event) => setAppointmentForm((p) => ({ ...p, time: event.target.value }))} /></label>
          <label>Status<select value={appointmentForm.status} onChange={(event) => setAppointmentForm((p) => ({ ...p, status: event.target.value }))}><option value="accepted">Accepted</option><option value="pending">Pending</option></select></label>
          <label className="span-2">Reason<textarea value={appointmentForm.reason} onChange={(event) => setAppointmentForm((p) => ({ ...p, reason: event.target.value }))} placeholder="Symptoms/reason" /></label>
        </div>
        <div className="modal-actions"><button className="secondary-btn" onClick={() => setAppointmentOpen(false)}>Cancel</button><button className="primary-btn" disabled={saving} onClick={handleCreateAppointment}>{saving ? 'Saving...' : 'Save Appointment'}</button></div>
      </Modal>

      <Modal open={uploadOpen} title="Upload Patient File" onClose={() => setUploadOpen(false)}>
        <div className="form-grid">
          <label>Category<select value={uploadForm.category} onChange={(event) => setUploadForm((p) => ({ ...p, category: event.target.value }))}><option value="prescription">Prescription</option><option value="report">Report</option><option value="lab">Lab Report</option><option value="scan">Scan</option><option value="discharge">Discharge</option><option value="note">Other Note</option></select></label>
          <label>Choose File<input type="file" onChange={(event) => setSelectedFile(event.target.files?.[0] || null)} /></label>
          <label className="span-2">Note<textarea value={uploadForm.note} onChange={(event) => setUploadForm((p) => ({ ...p, note: event.target.value }))} placeholder="Small note about this file" /></label>
        </div>
        <div className="modal-actions"><button className="secondary-btn" onClick={() => setUploadOpen(false)}>Cancel</button><button className="primary-btn" disabled={saving} onClick={handleUpload}>{saving ? 'Uploading...' : 'Upload to Firebase'}</button></div>
      </Modal>

      <Modal open={noteOpen} title="Add Clinical Note" onClose={() => setNoteOpen(false)}>
        <div className="form-grid">
          <label>Doctor<select value={noteForm.doctorId} onChange={(event) => setNoteForm((p) => ({ ...p, doctorId: event.target.value }))}><option value="">Select doctor</option>{doctors.map((doctor) => <option key={doctor.id} value={doctor.id}>{doctor.name}</option>)}</select></label>
          <label>Appointment<select value={noteForm.appointmentId} onChange={(event) => setNoteForm((p) => ({ ...p, appointmentId: event.target.value }))}><option value="">Optional</option>{patientAppointments.map((item) => <option key={item.id} value={item.id}>{item.date} {item.time} - {item.doctorName}</option>)}</select></label>
          <label className="span-2">Symptoms<textarea value={noteForm.symptoms} onChange={(event) => setNoteForm((p) => ({ ...p, symptoms: event.target.value }))} /></label>
          <label className="span-2">Diagnosis<textarea value={noteForm.diagnosis} onChange={(event) => setNoteForm((p) => ({ ...p, diagnosis: event.target.value }))} /></label>
          <label className="span-2">Prescription<textarea value={noteForm.prescription} onChange={(event) => setNoteForm((p) => ({ ...p, prescription: event.target.value }))} /></label>
          <label>Follow-up Date<input type="date" value={noteForm.followUpDate} onChange={(event) => setNoteForm((p) => ({ ...p, followUpDate: event.target.value }))} /></label>
          <label>Advice<input value={noteForm.advice} onChange={(event) => setNoteForm((p) => ({ ...p, advice: event.target.value }))} /></label>
        </div>
        <div className="modal-actions"><button className="secondary-btn" onClick={() => setNoteOpen(false)}>Cancel</button><button className="primary-btn" disabled={saving} onClick={handleNote}>{saving ? 'Saving...' : 'Save Note'}</button></div>
      </Modal>

      <Modal open={editOpen} title="Edit Patient Profile" onClose={() => setEditOpen(false)}>
        <div className="form-grid">
          <label>Name<input value={editForm.name || ''} onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))} /></label>
          <label>Phone<input value={editForm.phone || ''} onChange={(e) => setEditForm((p) => ({ ...p, phone: e.target.value }))} /></label>
          <label>Age<input value={editForm.age || ''} onChange={(e) => setEditForm((p) => ({ ...p, age: e.target.value }))} /></label>
          <label>Blood Group<input value={editForm.bloodGroup || ''} onChange={(e) => setEditForm((p) => ({ ...p, bloodGroup: e.target.value }))} /></label>
          <label className="span-2">Address<input value={editForm.address || ''} onChange={(e) => setEditForm((p) => ({ ...p, address: e.target.value }))} /></label>
        </div>
        <div className="modal-actions"><button className="secondary-btn" onClick={() => setEditOpen(false)}>Cancel</button><button className="primary-btn" disabled={saving} onClick={handleUpdatePatient}>{saving ? 'Saving...' : 'Update Patient'}</button></div>
      </Modal>
    </div>
  );
}
