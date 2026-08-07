import { Building2, Plus, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import PageHeader from '../../components/common/PageHeader.jsx';
import DataTable from '../../components/common/DataTable.jsx';
import Modal from '../../components/common/Modal.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import { useFirebaseList } from '../../hooks/useFirebaseList.js';
import { addDepartment, seedHospitalBasics, updateDepartment } from '../../services/hmsService.js';
import { useAuth } from '../../context/AuthContext.jsx';

const emptyDepartment = { id: '', nameEn: '', nameBn: '', order: 1, status: 'active', publicVisible: true };

export default function Departments() {
  const { user } = useAuth();
  const { data: departments, loading } = useFirebaseList('departments');
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyDepartment);

  const filtered = useMemo(() => departments.filter((item) => `${item.id} ${item.nameEn || item.name} ${item.nameBn} ${item.status}`.toLowerCase().includes(query.toLowerCase())), [departments, query]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await addDepartment(form, user);
      toast.success('Department saved');
      setForm(emptyDepartment);
      setOpen(false);
    } catch (error) {
      toast.error(error?.message || 'Department save failed');
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (row) => {
    try {
      await updateDepartment(row.id, { status: row.status === 'active' ? 'inactive' : 'active' }, user);
      toast.success('Department status updated');
    } catch (error) {
      toast.error(error?.message || 'Could not update department');
    }
  };

  const handleSeed = async () => {
    setSaving(true);
    try {
      await seedHospitalBasics(user);
      toast.success('Default departments and appointment types seeded');
    } catch (error) {
      toast.error(error?.message || 'Seed failed');
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'nameEn', label: 'English', render: (row) => row.nameEn || row.name },
    { key: 'nameBn', label: 'Bangla' },
    { key: 'order', label: 'Order' },
    { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    { key: 'actions', label: 'Actions', render: (row) => <div className="row-actions"><button onClick={() => toggleStatus(row)}>{row.status === 'active' ? 'Inactive' : 'Active'}</button></div> },
  ];

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Department Management"
        title="Departments"
        subtitle="Add or modify department English/Bangla names. Website and admin doctor dropdown will use these."
        action={<div className="page-action-group"><button className="secondary-btn" onClick={handleSeed}>Seed Defaults</button><button className="primary-btn" onClick={() => setOpen(true)}><Plus size={17} /> Add Department</button></div>}
      />
      <div className="toolbar-card"><div className="search-control"><Search size={18} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search department" /></div></div>
      <div className="panel-card">
        <div className="panel-header"><div><h3>Department List</h3><p>Keep IDs short like medicine, ent, neuro. Do not change IDs after doctors use them.</p></div><Building2 size={22} /></div>
        <DataTable columns={columns} rows={filtered} loading={loading} emptyText="No department found." />
      </div>
      <Modal open={open} title="Add Department" onClose={() => setOpen(false)}>
        <div className="form-grid">
          <label>Department ID<input value={form.id} onChange={(e) => setForm((p) => ({ ...p, id: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') }))} placeholder="medicine" /></label>
          <label>Order<input type="number" value={form.order} onChange={(e) => setForm((p) => ({ ...p, order: e.target.value }))} /></label>
          <label>English Name<input value={form.nameEn} onChange={(e) => setForm((p) => ({ ...p, nameEn: e.target.value }))} placeholder="Medicine" /></label>
          <label>Bangla Name<input value={form.nameBn} onChange={(e) => setForm((p) => ({ ...p, nameBn: e.target.value }))} placeholder="মেডিসিন" /></label>
          <label>Status<select value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
          <label>Show on Website<input type="checkbox" checked={form.publicVisible} onChange={(e) => setForm((p) => ({ ...p, publicVisible: e.target.checked }))} /></label>
        </div>
        <div className="modal-actions"><button className="secondary-btn" onClick={() => setOpen(false)}>Cancel</button><button className="primary-btn" disabled={saving} onClick={handleSave}>{saving ? 'Saving...' : 'Save Department'}</button></div>
      </Modal>
    </div>
  );
}
