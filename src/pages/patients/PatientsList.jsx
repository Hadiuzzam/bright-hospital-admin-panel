import { Link } from 'react-router-dom';
import { Download, Search, UserPlus } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import PageHeader from '../../components/common/PageHeader.jsx';
import DataTable from '../../components/common/DataTable.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import Modal from '../../components/common/Modal.jsx';
import { useFirebaseList } from '../../hooks/useFirebaseList.js';
import { createPatient } from '../../services/hmsService.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { exportCsv, formatDateTime } from '../../utils/format.js';

const emptyForm = {
  name: '',
  phone: '',
  age: '',
  gender: 'Male',
  bloodGroup: 'Unknown',
  address: '',
  emergencyContact: '',
};

export default function PatientsList() {
  const { user } = useAuth();
  const { data: patients, loading } = useFirebaseList('patients');
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const filtered = useMemo(() => {
    return patients.filter((patient) => {
      const text = `${patient.name} ${patient.phone} ${patient.patientCode} ${patient.bloodGroup}`.toLowerCase();
      return text.includes(query.toLowerCase());
    });
  }, [patients, query]);

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await createPatient(form, user);
      toast.success('Patient saved to Firebase');
      setForm(emptyForm);
      setOpen(false);
    } catch (error) {
      toast.error(error?.message || 'Failed to save patient');
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { key: 'patientCode', label: 'Patient Code' },
    { key: 'name', label: 'Name', render: (row) => <Link className="table-link" to={`/patients/${row.id}`}>{row.name}</Link> },
    { key: 'phone', label: 'Phone' },
    { key: 'age', label: 'Age' },
    { key: 'gender', label: 'Gender' },
    { key: 'bloodGroup', label: 'Blood' },
    { key: 'lastVisit', label: 'Last Visit', render: (row) => row.lastVisit || '-' },
    { key: 'createdAt', label: 'Created', render: (row) => formatDateTime(row.createdAt) },
    { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
  ];

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Patient Management"
        title="Patients"
        subtitle="Register, search and open the complete medical timeline of every patient. Data is loaded from Firebase."
        action={<button className="primary-btn" onClick={() => setOpen(true)}><UserPlus size={17} /> Add Patient</button>}
      />

      <div className="toolbar-card">
        <div className="search-control">
          <Search size={18} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name, phone or patient code" />
        </div>
        <button className="secondary-btn" onClick={() => exportCsv('bright-hospital-patients.csv', filtered)}><Download size={17} /> Export List</button>
      </div>

      <DataTable columns={columns} rows={filtered} loading={loading} emptyText="No patient registered yet. Click Add Patient." />

      <Modal open={open} title="Add New Patient" onClose={() => setOpen(false)}>
        <div className="form-grid">
          <label>Name<input value={form.name} onChange={(event) => setField('name', event.target.value)} placeholder="Patient full name" /></label>
          <label>Phone<input value={form.phone} onChange={(event) => setField('phone', event.target.value)} placeholder="01XXXXXXXXX" /></label>
          <label>Age<input value={form.age} onChange={(event) => setField('age', event.target.value)} placeholder="Age" /></label>
          <label>Gender<select value={form.gender} onChange={(event) => setField('gender', event.target.value)}><option>Male</option><option>Female</option><option>Other</option></select></label>
          <label>Blood Group<select value={form.bloodGroup} onChange={(event) => setField('bloodGroup', event.target.value)}><option>B+</option><option>O+</option><option>A+</option><option>AB+</option><option>A-</option><option>B-</option><option>O-</option><option>AB-</option><option>Unknown</option></select></label>
          <label>Emergency Contact<input value={form.emergencyContact} onChange={(event) => setField('emergencyContact', event.target.value)} placeholder="Optional contact" /></label>
          <label className="span-2">Address<input value={form.address} onChange={(event) => setField('address', event.target.value)} placeholder="Patient address" /></label>
        </div>
        <div className="modal-actions">
          <button className="secondary-btn" onClick={() => setOpen(false)}>Cancel</button>
          <button className="primary-btn" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Patient'}</button>
        </div>
      </Modal>
    </div>
  );
}
