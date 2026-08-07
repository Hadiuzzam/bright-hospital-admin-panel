import { FileUp, HeartPulse, PlayCircle, Save, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import PageHeader from '../../components/common/PageHeader.jsx';
import DataTable from '../../components/common/DataTable.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import Modal from '../../components/common/Modal.jsx';
import { useFirebaseList } from '../../hooks/useFirebaseList.js';
import { addClinicalNote, changeAppointmentStatus, uploadPatientFile } from '../../services/hmsService.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { todayDate } from '../../utils/format.js';

export default function DoctorWorkspace() {
  const { user } = useAuth();
  const { data: appointments } = useFirebaseList('appointments');
  const { data: patients } = useFirebaseList('patients');
  const { data: doctors } = useFirebaseList('doctors');
  const { data: notes } = useFirebaseList('clinicalNotes');
  const { data: files } = useFirebaseList('patientFiles');
  const [query, setQuery] = useState('');
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [noteOpen, setNoteOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [noteForm, setNoteForm] = useState({ symptoms: '', diagnosis: '', prescription: '', advice: '', followUpDate: '' });
  const [uploadForm, setUploadForm] = useState({ category: 'prescription', note: '' });

  const doctorProfile = doctors.find((doctor) => doctor.id === user?.doctorId || doctor.email === user?.email);
  const visibleAppointments = useMemo(() => {
    return appointments.filter((item) => {
      const isDoctor = user?.role === 'doctor';
      const belongsToDoctor = !isDoctor || item.doctorId === doctorProfile?.id || item.doctorName === user?.name;
      const matchesDate = item.date === todayDate() || ['waiting', 'in_consultation', 'accepted'].includes(item.status);
      const text = `${item.patientName} ${item.patientPhone} ${item.reason} ${item.status}`.toLowerCase();
      return belongsToDoctor && matchesDate && text.includes(query.toLowerCase());
    });
  }, [appointments, doctorProfile?.id, query, user?.name, user?.role]);

  const selectedPatient = patients.find((patient) => patient.id === selectedAppointment?.patientId);
  const selectedNotes = selectedAppointment ? notes.filter((note) => note.patientId === selectedAppointment.patientId) : [];
  const selectedFiles = selectedAppointment ? files.filter((file) => file.patientId === selectedAppointment.patientId) : [];

  const setStatus = async (status) => {
    if (!selectedAppointment) return;
    try {
      await changeAppointmentStatus(selectedAppointment.id, status, user);
      setSelectedAppointment((prev) => ({ ...prev, status }));
      toast.success(`Marked ${status}`);
    } catch (error) {
      toast.error(error?.message || 'Status update failed');
    }
  };

  const handleNote = async () => {
    if (!selectedAppointment) return;
    setSaving(true);
    try {
      await addClinicalNote({
        ...noteForm,
        patientId: selectedAppointment.patientId,
        appointmentId: selectedAppointment.id,
        doctorId: selectedAppointment.doctorId || doctorProfile?.id,
        doctorName: selectedAppointment.doctorName || user?.name,
      }, user);
      toast.success('Doctor note/prescription saved');
      setNoteForm({ symptoms: '', diagnosis: '', prescription: '', advice: '', followUpDate: '' });
      setNoteOpen(false);
    } catch (error) {
      toast.error(error?.message || 'Failed to save note');
    } finally {
      setSaving(false);
    }
  };

  const handleUpload = async () => {
    if (!selectedAppointment) return;
    setSaving(true);
    try {
      await uploadPatientFile(selectedFile, {
        ...uploadForm,
        patientId: selectedAppointment.patientId,
        patientName: selectedAppointment.patientName,
        appointmentId: selectedAppointment.id,
        doctorId: selectedAppointment.doctorId || doctorProfile?.id,
      }, user);
      toast.success('File uploaded against patient');
      setSelectedFile(null);
      setUploadForm({ category: 'prescription', note: '' });
      setUploadOpen(false);
    } catch (error) {
      toast.error(error?.message || 'Upload failed');
    } finally {
      setSaving(false);
    }
  };

  const queueColumns = [
    { key: 'serialNo', label: 'Serial' },
    { key: 'patientName', label: 'Patient' },
    { key: 'patientPhone', label: 'Phone' },
    { key: 'time', label: 'Time' },
    { key: 'reason', label: 'Reason' },
    { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    { key: 'actions', label: 'Action', render: (row) => <button className="secondary-btn compact" onClick={() => setSelectedAppointment(row)}>Open</button> },
  ];

  const noteColumns = [
    { key: 'diagnosis', label: 'Diagnosis' },
    { key: 'prescription', label: 'Prescription' },
    { key: 'advice', label: 'Advice' },
    { key: 'followUpDate', label: 'Follow-up' },
  ];

  const fileColumns = [
    { key: 'fileName', label: 'File', render: (row) => <a className="table-link" href={row.fileUrl} target="_blank" rel="noreferrer">{row.fileName}</a> },
    { key: 'category', label: 'Category' },
    { key: 'note', label: 'Note' },
  ];

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Doctor Workspace"
        title="Consultation Queue"
        subtitle="Open patient, start consultation, add diagnosis/prescription and upload reports/files."
      />

      <div className="doctor-workspace-grid">
        <div className="panel-card">
          <div className="panel-header">
            <div><h3>Today / Active Queue</h3><p>{user?.role === 'doctor' ? 'Only your assigned patients are shown.' : 'Admin view shows all active patients.'}</p></div>
          </div>
          <div className="search-control"><Search size={18} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search queue" /></div>
          <DataTable columns={queueColumns} rows={visibleAppointments} emptyText="No active patient in queue." />
        </div>

        <div className="panel-card">
          <div className="panel-header compact">
            <div><h3>Patient Consultation</h3><p>Selected patient details and actions.</p></div>
          </div>

          {!selectedAppointment ? (
            <div className="empty-state"><HeartPulse size={32} /><h3>Select a patient</h3><p>Open a patient from the queue to start consultation.</p></div>
          ) : (
            <div className="consultation-panel">
              <div className="summary-card">
                <strong>{selectedAppointment.patientName}</strong>
                <span>{selectedPatient?.patientCode} · {selectedAppointment.patientPhone}</span>
                <StatusBadge status={selectedAppointment.status} />
              </div>
              <div className="row-actions consultation-actions">
                <button onClick={() => setStatus('in_consultation')}><PlayCircle size={15} /> Start</button>
                <button onClick={() => setNoteOpen(true)}><Save size={15} /> Add Note</button>
                <button onClick={() => setUploadOpen(true)}><FileUp size={15} /> Upload</button>
                <button onClick={() => setStatus('completed')}>Complete</button>
              </div>
              <h4>Previous Notes</h4>
              <DataTable columns={noteColumns} rows={selectedNotes} emptyText="No previous note." />
              <h4>Patient Files</h4>
              <DataTable columns={fileColumns} rows={selectedFiles} emptyText="No file uploaded." />
            </div>
          )}
        </div>
      </div>

      <Modal open={noteOpen} title="Add Diagnosis / Prescription" onClose={() => setNoteOpen(false)}>
        <div className="form-grid">
          <label className="span-2">Symptoms<textarea value={noteForm.symptoms} onChange={(e) => setNoteForm((p) => ({ ...p, symptoms: e.target.value }))} /></label>
          <label className="span-2">Diagnosis<textarea value={noteForm.diagnosis} onChange={(e) => setNoteForm((p) => ({ ...p, diagnosis: e.target.value }))} /></label>
          <label className="span-2">Prescription<textarea value={noteForm.prescription} onChange={(e) => setNoteForm((p) => ({ ...p, prescription: e.target.value }))} placeholder="Medicine and dose" /></label>
          <label>Follow-up Date<input type="date" value={noteForm.followUpDate} onChange={(e) => setNoteForm((p) => ({ ...p, followUpDate: e.target.value }))} /></label>
          <label>Advice<input value={noteForm.advice} onChange={(e) => setNoteForm((p) => ({ ...p, advice: e.target.value }))} /></label>
        </div>
        <div className="modal-actions"><button className="secondary-btn" onClick={() => setNoteOpen(false)}>Cancel</button><button className="primary-btn" disabled={saving} onClick={handleNote}>{saving ? 'Saving...' : 'Save Prescription'}</button></div>
      </Modal>

      <Modal open={uploadOpen} title="Upload Patient Document" onClose={() => setUploadOpen(false)}>
        <div className="form-grid">
          <label>Category<select value={uploadForm.category} onChange={(e) => setUploadForm((p) => ({ ...p, category: e.target.value }))}><option value="prescription">Prescription</option><option value="report">Report</option><option value="scan">Scan</option><option value="lab">Lab Report</option><option value="note">Other</option></select></label>
          <label>File<input type="file" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} /></label>
          <label className="span-2">Note<textarea value={uploadForm.note} onChange={(e) => setUploadForm((p) => ({ ...p, note: e.target.value }))} /></label>
        </div>
        <div className="modal-actions"><button className="secondary-btn" onClick={() => setUploadOpen(false)}>Cancel</button><button className="primary-btn" disabled={saving} onClick={handleUpload}>{saving ? 'Uploading...' : 'Upload File'}</button></div>
      </Modal>
    </div>
  );
}
