import { Plus, Search, ShieldCheck } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import PageHeader from '../../components/common/PageHeader.jsx';
import DataTable from '../../components/common/DataTable.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import Modal from '../../components/common/Modal.jsx';
import { useFirebaseList } from '../../hooks/useFirebaseList.js';
import { createStaffUser, toggleUserStatus } from '../../services/hmsService.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { roleLabels } from '../../utils/permissions.js';
import { formatDateTime } from '../../utils/format.js';
import { departmentOptions } from '../../data/hospitalOptions.js';

const emptyStaff = { name: '', email: '', phone: '', password: '123456', role: 'receptionist', department: 'Reception', status: 'active' };

export default function StaffUsers() {
  const { user } = useAuth();
  const { data: users, loading } = useFirebaseList('users');
  const { data: liveDepartments } = useFirebaseList('departments');
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyStaff);

  const departments = liveDepartments.length ? liveDepartments : departmentOptions;
  const staffOnly = useMemo(() => users.filter((item) => item.role !== 'patient'), [users]);
  const patientCount = users.length - staffOnly.length;

  const filtered = useMemo(() => staffOnly.filter((staff) => `${staff.name} ${staff.email} ${staff.role} ${staff.department}`.toLowerCase().includes(query.toLowerCase())), [staffOnly, query]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await createStaffUser(form, user);
      toast.success('Staff user saved to Firebase');
      setForm(emptyStaff);
      setOpen(false);
    } catch (error) {
      toast.error(error?.message || 'Failed to add staff');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (row) => {
    try {
      await toggleUserStatus(row.id, row.status === 'active' ? 'inactive' : 'active', user);
      toast.success('Staff status updated');
    } catch (error) {
      toast.error(error?.message || 'Failed to update staff');
    }
  };

  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    { key: 'role', label: 'Role', render: (row) => roleLabels[row.role] || row.role },
    { key: 'department', label: 'Department' },
    { key: 'lastLoginAt', label: 'Last Login', render: (row) => formatDateTime(row.lastLoginAt) },
    { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    { key: 'actions', label: 'Actions', render: (row) => <div className="row-actions"><button onClick={() => handleToggle(row)}>{row.status === 'active' ? 'Block' : 'Unblock'}</button></div> },
  ];

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="System Access"
        title="Staff Users"
        subtitle="Create internal staff accounts only. Patient accounts are hidden here and managed from the patient module."
        action={<button className="primary-btn" onClick={() => setOpen(true)}><Plus size={17} /> Add Staff</button>}
      />

      <div className="toolbar-card">
        <div className="search-control"><Search size={18} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search staff, role, email" /></div>
        <span className="soft-pill">Patients hidden: {patientCount}</span>
      </div>

      <div className="panel-card">
        <div className="panel-header"><div><h3>Internal Staff Accounts</h3><p>Only active staff can log in to the HMS dashboard.</p></div><ShieldCheck size={22} /></div>
        <DataTable columns={columns} rows={filtered} loading={loading} emptyText="No staff user found." />
      </div>

      <Modal open={open} title="Add Staff User" onClose={() => setOpen(false)}>
        <div className="form-grid">
          <label>Name<input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} /></label>
          <label>Email<input type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} /></label>
          <label>Phone<input value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} /></label>
          <label>Password<input value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} /></label>
          <label>Role<select value={form.role} onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}><option value="super_admin">Super Admin</option><option value="admin">Admin</option><option value="receptionist">Receptionist</option><option value="doctor">Doctor</option><option value="nurse">Nurse</option><option value="pharmacy">Pharmacy</option><option value="accounts">Accounts</option><option value="lab">Lab</option><option value="staff">General Staff</option></select></label>
          <label>Department<select value={form.department} onChange={(e) => setForm((p) => ({ ...p, department: e.target.value }))}><option value="Reception">Reception</option><option value="Management">Management</option><option value="Accounts">Accounts</option><option value="Pharmacy">Pharmacy</option>{departments.map((department) => <option key={department.id} value={department.nameEn || department.name}>{department.nameEn || department.name}</option>)}</select></label>
        </div>
        <div className="modal-actions"><button className="secondary-btn" onClick={() => setOpen(false)}>Cancel</button><button className="primary-btn" disabled={saving} onClick={handleSave}>{saving ? 'Saving...' : 'Save Staff'}</button></div>
      </Modal>
    </div>
  );
}
