import { Activity, AlertTriangle, Cpu, Edit3, Plus, Search, Wrench } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import PageHeader from '../../components/common/PageHeader.jsx';
import StatCard from '../../components/common/StatCard.jsx';
import DataTable from '../../components/common/DataTable.jsx';
import Modal from '../../components/common/Modal.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import { useFirebaseList } from '../../hooks/useFirebaseList.js';
import { addMachine, seedSampleMachines, updateMachine } from '../../services/hmsService.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { formatMoney, todayDate } from '../../utils/format.js';
import { departmentOptions } from '../../data/hospitalOptions.js';

const emptyMachine = {
  name: '', category: 'Diagnostics', departmentId: 'diagnostics', department: 'Diagnostics', serialNo: '', condition: 'perfect', purchasePrice: '', currentValue: '', estimatedRepairCost: '', location: '', vendor: '', lastServiceDate: '', nextServiceDate: '', imageUrl: '', imageData: '', notes: '', status: 'active',
};

const conditionLabels = { perfect: 'Perfect', needs_repair: 'Needs Repair', under_maintenance: 'Under Maintenance', out_of_service: 'Out of Service' };

export default function MachinesDashboard() {
  const { user } = useAuth();
  const { data: machines, loading } = useFirebaseList('machines');
  const { data: liveDepartments } = useFirebaseList('departments');
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [repairOpen, setRepairOpen] = useState(false);
  const [repairTarget, setRepairTarget] = useState(null);
  const [repairForm, setRepairForm] = useState({ estimatedRepairCost: '', notes: '', nextServiceDate: '', location: '' });
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyMachine);

  const departments = liveDepartments.length ? liveDepartments : departmentOptions;
  const needsRepair = machines.filter((item) => item.condition === 'needs_repair' || Number(item.estimatedRepairCost || 0) > 0);
  const perfect = machines.filter((item) => item.condition === 'perfect');
  const totalValue = machines.reduce((sum, item) => sum + Number(item.currentValue || item.purchasePrice || 0), 0);
  const filtered = useMemo(() => machines.filter((item) => `${item.name} ${item.category} ${item.department} ${item.serialNo} ${item.condition}`.toLowerCase().includes(query.toLowerCase())), [machines, query]);

  const setDepartment = (departmentId) => {
    const department = departments.find((item) => item.id === departmentId);
    setForm((prev) => ({ ...prev, departmentId, department: department?.nameEn || department?.name || departmentId }));
  };

  const fillDemo = () => setForm({ ...emptyMachine, name: 'Digital X-ray Machine', category: 'Radiology', departmentId: 'diagnostics', department: 'Diagnostics', serialNo: 'BH-XRAY-002', condition: 'needs_repair', purchasePrice: '3200000', currentValue: '2500000', estimatedRepairCost: '85000', location: 'X-ray Room', vendor: 'Siemens Partner', lastServiceDate: '2026-06-12', nextServiceDate: '2026-07-25', notes: 'Detector calibration needed before heavy use.' });

  const openEdit = (machine) => {
    setSelectedMachine(machine);
    setForm({ ...emptyMachine, ...machine });
    setEditOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await addMachine(form, user);
      toast.success('Machine saved');
      setForm(emptyMachine);
      setOpen(false);
    } catch (error) {
      toast.error(error?.message || 'Machine save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleEditSave = async () => {
    if (!selectedMachine) return;
    setSaving(true);
    try {
      await updateMachine(selectedMachine.id, form, user);
      toast.success('Machine details updated');
      setForm(emptyMachine);
      setSelectedMachine(null);
      setEditOpen(false);
    } catch (error) {
      toast.error(error?.message || 'Machine update failed');
    } finally {
      setSaving(false);
    }
  };

  const handleSeed = async () => {
    setSaving(true);
    try {
      await seedSampleMachines(user);
      toast.success('3 demo machines added/updated');
    } catch (error) {
      toast.error(error?.message || 'Could not seed machines');
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (row) => {
    try {
      await updateMachine(row.id, { status: row.status === 'active' ? 'inactive' : 'active' }, user);
      toast.success('Machine status updated');
    } catch (error) {
      toast.error(error?.message || 'Could not update machine');
    }
  };

  const markFixed = async (row) => {
    try {
      await updateMachine(row.id, { condition: 'perfect', estimatedRepairCost: 0, lastServiceDate: todayDate(), notes: `${row.notes || ''}\nMarked fixed on ${todayDate()}`.trim() }, user);
      toast.success('Machine marked fixed/perfect');
    } catch (error) {
      toast.error(error?.message || 'Could not mark fixed');
    }
  };

  const openRepairModal = (row) => {
    setRepairTarget(row);
    setRepairForm({
      estimatedRepairCost: String(row.estimatedRepairCost || ''),
      notes: '',
      nextServiceDate: row.nextServiceDate || '',
      location: row.location || '',
    });
    setRepairOpen(true);
  };

  const submitRepairModal = async () => {
    if (!repairTarget) return;
    setSaving(true);
    try {
      const noteLine = repairForm.notes
        ? `${repairForm.notes}
Marked needs repair on ${todayDate()}`
        : `Marked needs repair on ${todayDate()}`;
      await updateMachine(repairTarget.id, {
        condition: 'needs_repair',
        estimatedRepairCost: Number(repairForm.estimatedRepairCost || 0),
        nextServiceDate: repairForm.nextServiceDate || repairTarget.nextServiceDate || '',
        location: repairForm.location || repairTarget.location || '',
        notes: `${repairTarget.notes || ''}
${noteLine}`.trim(),
      }, user);
      toast.success('Machine marked needs repair');
      setRepairTarget(null);
      setRepairOpen(false);
      setRepairForm({ estimatedRepairCost: '', notes: '', nextServiceDate: '', location: '' });
    } catch (error) {
      toast.error(error?.message || 'Could not mark repair');
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { key: 'name', label: 'Machine' },
    { key: 'category', label: 'Category' },
    { key: 'department', label: 'Department' },
    { key: 'serialNo', label: 'Serial' },
    { key: 'condition', label: 'Condition', render: (row) => <StatusBadge status={conditionLabels[row.condition] || row.condition} /> },
    { key: 'currentValue', label: 'Current Value', render: (row) => formatMoney(row.currentValue || row.purchasePrice) },
    { key: 'estimatedRepairCost', label: 'Repair Cost', render: (row) => formatMoney(row.estimatedRepairCost) },
    { key: 'nextServiceDate', label: 'Next Service' },
    { key: 'actions', label: 'Actions', render: (row) => <div className="row-actions"><button onClick={() => openEdit(row)}><Edit3 size={14} /> Edit</button>{row.condition === 'needs_repair' ? <button onClick={() => markFixed(row)}>Mark Fixed</button> : <button onClick={() => openRepairModal(row)}>Needs Repair</button>}<button onClick={() => toggleStatus(row)}>{row.status === 'active' ? 'Inactive' : 'Active'}</button></div> },
  ];

  const MachineForm = ({ mode }) => (
    <>
      {mode === 'add' && <div className="helper-card"><Wrench size={18} /><span>Demo includes price, repair cost and service date. You can use image URL/base64 for now.</span><button className="secondary-btn" onClick={fillDemo}>Fill Demo</button></div>}
      <div className="form-grid">
        <label>Name<input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="Ultrasound Machine" /></label>
        <label>Category<input value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))} placeholder="Diagnostics" /></label>
        <label>Department<select value={form.departmentId} onChange={(e) => setDepartment(e.target.value)}>{departments.map((department) => <option key={department.id} value={department.id}>{department.nameEn || department.name}</option>)}</select></label>
        <label>Serial No<input value={form.serialNo} onChange={(e) => setForm((p) => ({ ...p, serialNo: e.target.value }))} /></label>
        <label>Condition<select value={form.condition} onChange={(e) => setForm((p) => ({ ...p, condition: e.target.value }))}><option value="perfect">Perfect</option><option value="needs_repair">Needs Repair</option><option value="under_maintenance">Under Maintenance</option><option value="out_of_service">Out of Service</option></select></label>
        <label>Status<select value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
        <label>Purchase Price<input type="number" value={form.purchasePrice} onChange={(e) => setForm((p) => ({ ...p, purchasePrice: e.target.value }))} /></label>
        <label>Current/Perfect Price<input type="number" value={form.currentValue} onChange={(e) => setForm((p) => ({ ...p, currentValue: e.target.value }))} /></label>
        <label>Repair Cost<input type="number" value={form.estimatedRepairCost} onChange={(e) => setForm((p) => ({ ...p, estimatedRepairCost: e.target.value }))} /></label>
        <label>Location<input value={form.location} onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))} /></label>
        <label>Vendor<input value={form.vendor} onChange={(e) => setForm((p) => ({ ...p, vendor: e.target.value }))} /></label>
        <label>Last Service<input type="date" value={form.lastServiceDate} onChange={(e) => setForm((p) => ({ ...p, lastServiceDate: e.target.value }))} /></label>
        <label>Next Service<input type="date" value={form.nextServiceDate} onChange={(e) => setForm((p) => ({ ...p, nextServiceDate: e.target.value }))} /></label>
        <label className="span-2">Image URL or very small Base64<textarea value={form.imageUrl || form.imageData} onChange={(e) => setForm((p) => ({ ...p, imageUrl: e.target.value }))} placeholder="https://... or tiny data:image/png;base64,..." /></label>
        <label className="span-2">Notes<textarea value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} /></label>
      </div>
    </>
  );

  return (
    <div className="page-stack">
      <PageHeader eyebrow="Asset & Machine Management" title="Hospital Machines" subtitle="Track equipment price, condition, repair cost, service schedule, location and vendor details." action={<div className="page-action-group"><button className="secondary-btn" onClick={handleSeed}>Seed Demo Machines</button><button className="primary-btn" onClick={() => { setForm(emptyMachine); setOpen(true); }}><Plus size={17} /> Add Machine</button></div>} />
      <div className="stats-grid four"><StatCard title="Machines" value={machines.length} subtitle="Total assets" icon={Cpu} /><StatCard title="Perfect" value={perfect.length} subtitle="Running well" icon={Activity} tone="green" /><StatCard title="Needs Repair" value={needsRepair.length} subtitle="Repair required" icon={AlertTriangle} tone="orange" /><StatCard title="Asset Value" value={formatMoney(totalValue)} subtitle="Current/purchase value" icon={Wrench} tone="blue" /></div>
      <div className="toolbar-card"><div className="search-control"><Search size={18} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search machine, serial, department or condition" /></div></div>
      <div className="panel-card"><div className="panel-header"><div><h3>Machine List</h3><p>Use image URL now. Base64 is possible for tiny images, but Storage is better for production.</p></div></div><DataTable columns={columns} rows={filtered} loading={loading} emptyText="No machine added yet." /></div>
      <Modal open={open} title="Add Machine" onClose={() => setOpen(false)}><MachineForm mode="add" /><div className="modal-actions"><button className="secondary-btn" onClick={() => setOpen(false)}>Cancel</button><button className="primary-btn" disabled={saving} onClick={handleSave}>{saving ? 'Saving...' : 'Save Machine'}</button></div></Modal>
      <Modal open={editOpen} title="Edit Machine" onClose={() => setEditOpen(false)}><MachineForm mode="edit" /><div className="modal-actions"><button className="secondary-btn" onClick={() => setEditOpen(false)}>Cancel</button><button className="primary-btn" disabled={saving} onClick={handleEditSave}>{saving ? 'Saving...' : 'Update Machine'}</button></div></Modal>
      <Modal open={repairOpen} title="Mark Machine Needs Repair" onClose={() => setRepairOpen(false)} size="compact">
        <div className="repair-modal-card">
          <div className="repair-modal-head">
            <div className="repair-icon"><Wrench size={26} /></div>
            <div>
              <span className="soft-pill">Repair request</span>
              <h3>{repairTarget?.name || 'Machine'}</h3>
              <p>{repairTarget?.serialNo || 'No serial'} · {repairTarget?.department || 'Department'}</p>
            </div>
          </div>
          <div className="form-grid repair-form-grid">
            <label>Estimated Repair Cost<input type="number" value={repairForm.estimatedRepairCost} onChange={(e) => setRepairForm((p) => ({ ...p, estimatedRepairCost: e.target.value }))} placeholder="85000" autoFocus /></label>
            <label>Next Service / Check Date<input type="date" value={repairForm.nextServiceDate} onChange={(e) => setRepairForm((p) => ({ ...p, nextServiceDate: e.target.value }))} /></label>
            <label className="span-2">Location<input value={repairForm.location} onChange={(e) => setRepairForm((p) => ({ ...p, location: e.target.value }))} placeholder="X-ray room / OT / Lab" /></label>
            <label className="span-2">Repair Note<textarea value={repairForm.notes} onChange={(e) => setRepairForm((p) => ({ ...p, notes: e.target.value }))} placeholder="Write what problem happened, vendor note, parts needed..." /></label>
          </div>
          <div className="modal-actions"><button className="secondary-btn" onClick={() => setRepairOpen(false)}>Cancel</button><button className="primary-btn" disabled={saving} onClick={submitRepairModal}>{saving ? 'Saving...' : 'Save Repair Status'}</button></div>
        </div>
      </Modal>
    </div>
  );
}
