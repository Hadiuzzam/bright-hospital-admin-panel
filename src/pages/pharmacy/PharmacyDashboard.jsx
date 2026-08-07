import { AlertTriangle, PackagePlus, Pill, Plus, ShoppingCart, Truck } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import PageHeader from '../../components/common/PageHeader.jsx';
import StatCard from '../../components/common/StatCard.jsx';
import DataTable from '../../components/common/DataTable.jsx';
import Modal from '../../components/common/Modal.jsx';
import { useFirebaseList } from '../../hooks/useFirebaseList.js';
import { addMedicine, addPurchaseStock, createPharmacySale, seedSamplePharmacyItems, updateMedicine } from '../../services/hmsService.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { formatMoney } from '../../utils/format.js';

const medFormEmpty = { name: '', genericName: '', category: 'Tablet', supplier: '', batchNo: '', expiryDate: '', purchasePrice: '', salePrice: '', stockQty: '', lowStockLimit: 10 };

export default function PharmacyDashboard() {
  const { user } = useAuth();
  const { data: medicines, loading } = useFirebaseList('pharmacy/medicines');
  const { data: patients } = useFirebaseList('patients');
  const { data: sales } = useFirebaseList('pharmacy/sales');
  const [addOpen, setAddOpen] = useState(false);
  const [saleOpen, setSaleOpen] = useState(false);
  const [stockOpen, setStockOpen] = useState(false);
  const [selectedMedicine, setSelectedMedicine] = useState(null);
  const [saving, setSaving] = useState(false);
  const [medForm, setMedForm] = useState(medFormEmpty);
  const [stockQty, setStockQty] = useState('');
  const [saleForm, setSaleForm] = useState({ patientId: '', walkInName: '', walkInPhone: '', discount: 0, paid: '', paymentMethod: 'cash', items: [{ medicineId: '', qty: 1 }] });

  const lowStock = medicines.filter((item) => Number(item.stockQty || 0) <= Number(item.lowStockLimit || 10));
  const todaySales = sales.reduce((sum, item) => sum + Number(item.paid || 0), 0);
  const suppliers = new Set(medicines.map((item) => item.supplier).filter(Boolean)).size;

  const saleTotals = useMemo(() => {
    const subtotal = saleForm.items.reduce((sum, item) => {
      const med = medicines.find((m) => m.id === item.medicineId);
      return sum + Number(item.qty || 0) * Number(med?.salePrice || 0);
    }, 0);
    const total = Math.max(subtotal - Number(saleForm.discount || 0), 0);
    return { subtotal, total };
  }, [saleForm, medicines]);

  const setSaleItem = (index, key, value) => {
    setSaleForm((prev) => ({
      ...prev,
      items: prev.items.map((item, itemIndex) => (itemIndex === index ? { ...item, [key]: value } : item)),
    }));
  };

  const handleMedicine = async () => {
    setSaving(true);
    try {
      await addMedicine(medForm, user);
      toast.success('Medicine added to Firebase');
      setMedForm(medFormEmpty);
      setAddOpen(false);
    } catch (error) {
      toast.error(error?.message || 'Failed to add medicine');
    } finally {
      setSaving(false);
    }
  };

  const handleStock = async () => {
    setSaving(true);
    try {
      await addPurchaseStock(selectedMedicine.id, stockQty, user);
      toast.success('Stock updated');
      setStockQty('');
      setSelectedMedicine(null);
      setStockOpen(false);
    } catch (error) {
      toast.error(error?.message || 'Stock update failed');
    } finally {
      setSaving(false);
    }
  };

  const handleSale = async () => {
    setSaving(true);
    try {
      const patient = patients.find((item) => item.id === saleForm.patientId);
      await createPharmacySale({
        ...saleForm,
        patientName: patient?.name || saleForm.walkInName || 'Walk-in Patient',
        patientPhone: patient?.phone || saleForm.walkInPhone || '',
        items: saleForm.items.map((item) => {
          const med = medicines.find((m) => m.id === item.medicineId);
          return { ...item, unitPrice: med?.salePrice || 0 };
        }),
        paid: saleForm.paid === '' ? saleTotals.total : saleForm.paid,
      }, user);
      toast.success('Pharmacy sale completed and stock reduced');
      setSaleForm({ patientId: '', walkInName: '', walkInPhone: '', discount: 0, paid: '', paymentMethod: 'cash', items: [{ medicineId: '', qty: 1 }] });
      setSaleOpen(false);
    } catch (error) {
      toast.error(error?.message || 'Sale failed');
    } finally {
      setSaving(false);
    }
  };

  const handleSeedMedicines = async () => {
    setSaving(true);
    try {
      await seedSamplePharmacyItems(user);
      toast.success('3 sample medicines added');
    } catch (error) {
      toast.error(error?.message || 'Could not seed medicines');
    } finally {
      setSaving(false);
    }
  };

  const toggleMedicine = async (row) => {
    try {
      await updateMedicine(row.id, { status: row.status === 'active' ? 'inactive' : 'active' }, user);
      toast.success('Medicine status updated');
    } catch (error) {
      toast.error(error?.message || 'Failed to update medicine');
    }
  };

  const columns = [
    { key: 'name', label: 'Medicine' },
    { key: 'genericName', label: 'Generic' },
    { key: 'batchNo', label: 'Batch' },
    { key: 'stockQty', label: 'Stock' },
    { key: 'expiryDate', label: 'Expiry' },
    { key: 'salePrice', label: 'Sale Price', render: (row) => formatMoney(row.salePrice) },
    { key: 'stockStatus', label: 'Alert', render: (row) => Number(row.stockQty || 0) <= Number(row.lowStockLimit || 10) ? <span className="stock-alert">Low Stock</span> : <span className="stock-ok">Healthy</span> },
    { key: 'actions', label: 'Actions', render: (row) => <div className="row-actions"><button onClick={() => { setSelectedMedicine(row); setStockOpen(true); }}>Add Stock</button><button onClick={() => toggleMedicine(row)}>{row.status === 'active' ? 'Inactive' : 'Active'}</button></div> },
  ];

  const salesColumns = [
    { key: 'patientName', label: 'Patient', render: (row) => <span><strong>{row.patientName || 'Walk-in Patient'}</strong><small className="cell-subtitle">{row.patientPhone || row.phone || ''}</small></span> },
    { key: 'items', label: 'Medicines Sold', render: (row) => <div className="medicine-sold-list">{(row.items || []).map((item) => <span key={`${row.id}-${item.medicineId || item.name}`}>{item.name} × {item.qty} = {formatMoney(item.total)}</span>)}</div> },
    { key: 'total', label: 'Total', render: (row) => formatMoney(row.total) },
    { key: 'paid', label: 'Paid', render: (row) => formatMoney(row.paid) },
    { key: 'due', label: 'Due', render: (row) => formatMoney(row.due) },
    { key: 'paymentMethod', label: 'Method' },
  ];

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Pharmacy"
        title="Pharmacy & Medicine Stock"
        subtitle="Manage medicine stock, purchase, expiry alert and pharmacy sales. Stock updates automatically after sale."
        action={<div className="page-action-group"><button className="secondary-btn" onClick={handleSeedMedicines}>Seed Demo Items</button><button className="secondary-btn" onClick={() => setSaleOpen(true)}><ShoppingCart size={17} /> New Sale</button><button className="primary-btn" onClick={() => setAddOpen(true)}><PackagePlus size={17} /> Add Medicine</button></div>}
      />

      <div className="stats-grid four">
        <StatCard title="Medicines" value={medicines.length} subtitle="Active inventory" icon={Pill} />
        <StatCard title="Low Stock" value={lowStock.length} subtitle="Needs purchase" icon={AlertTriangle} tone="orange" />
        <StatCard title="Sales" value={formatMoney(todaySales)} subtitle="All pharmacy sales" icon={ShoppingCart} tone="green" />
        <StatCard title="Suppliers" value={suppliers} subtitle="Saved vendors" icon={Truck} tone="blue" />
      </div>

      <div className="panel-card">
        <div className="panel-header"><div><h3>Medicine Inventory</h3><p>Stock will decrease automatically when pharmacy bill is confirmed.</p></div></div>
        <DataTable columns={columns} rows={medicines} loading={loading} emptyText="No medicine added yet." />
      </div>

      <div className="panel-card">
        <div className="panel-header"><div><h3>Recent Pharmacy Sales</h3><p>Every sale also creates an accounts invoice.</p></div></div>
        <DataTable columns={salesColumns} rows={sales} emptyText="No pharmacy sale yet." />
      </div>

      <Modal open={addOpen} title="Add Medicine" onClose={() => setAddOpen(false)}>
        <div className="form-grid">
          {[
            ['name', 'Medicine Name'], ['genericName', 'Generic Name'], ['category', 'Category'], ['supplier', 'Supplier'], ['batchNo', 'Batch No'], ['expiryDate', 'Expiry Date'], ['purchasePrice', 'Purchase Price'], ['salePrice', 'Sale Price'], ['stockQty', 'Opening Stock'], ['lowStockLimit', 'Low Stock Limit'],
          ].map(([key, label]) => (
            <label key={key}>{label}<input type={key === 'expiryDate' ? 'date' : ['purchasePrice', 'salePrice', 'stockQty', 'lowStockLimit'].includes(key) ? 'number' : 'text'} value={medForm[key]} onChange={(e) => setMedForm((p) => ({ ...p, [key]: e.target.value }))} /></label>
          ))}
        </div>
        <div className="modal-actions"><button className="secondary-btn" onClick={() => setAddOpen(false)}>Cancel</button><button className="primary-btn" disabled={saving} onClick={handleMedicine}>{saving ? 'Saving...' : 'Save Medicine'}</button></div>
      </Modal>

      <Modal open={stockOpen} title="Add Purchase Stock" onClose={() => setStockOpen(false)}>
        <div className="summary-card"><strong>{selectedMedicine?.name}</strong><span>Current stock: {selectedMedicine?.stockQty || 0}</span></div>
        <div className="form-grid"><label>Quantity to Add<input type="number" value={stockQty} onChange={(e) => setStockQty(e.target.value)} /></label></div>
        <div className="modal-actions"><button className="secondary-btn" onClick={() => setStockOpen(false)}>Cancel</button><button className="primary-btn" disabled={saving} onClick={handleStock}>{saving ? 'Saving...' : 'Update Stock'}</button></div>
      </Modal>

      <Modal open={saleOpen} title="New Pharmacy Sale" onClose={() => setSaleOpen(false)}>
        <div className="form-grid">
          <label className="span-2">Patient<select value={saleForm.patientId} onChange={(e) => setSaleForm((p) => ({ ...p, patientId: e.target.value }))}><option value="">Walk-in Patient</option>{patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.patientCode} - {patient.name}</option>)}</select></label>
          {!saleForm.patientId && <label>Walk-in Patient Name<input value={saleForm.walkInName} onChange={(e) => setSaleForm((p) => ({ ...p, walkInName: e.target.value }))} placeholder="Customer / patient name" /></label>}
          {!saleForm.patientId && <label>Walk-in Phone<input value={saleForm.walkInPhone} onChange={(e) => setSaleForm((p) => ({ ...p, walkInPhone: e.target.value }))} placeholder="01XXXXXXXXX" /></label>}
        </div>
        <div className="sale-items">
          {saleForm.items.map((item, index) => {
            const med = medicines.find((m) => m.id === item.medicineId);
            return (
              <div className="sale-item-row" key={index}>
                <select value={item.medicineId} onChange={(e) => setSaleItem(index, 'medicineId', e.target.value)}><option value="">Select medicine</option>{medicines.filter((m) => m.status !== 'inactive').map((medicine) => <option key={medicine.id} value={medicine.id}>{medicine.name} · stock {medicine.stockQty}</option>)}</select>
                <input type="number" min="1" value={item.qty} onChange={(e) => setSaleItem(index, 'qty', e.target.value)} />
                <span>{formatMoney(Number(item.qty || 0) * Number(med?.salePrice || 0))}</span>
              </div>
            );
          })}
          <button className="secondary-btn" onClick={() => setSaleForm((p) => ({ ...p, items: [...p.items, { medicineId: '', qty: 1 }] }))}><Plus size={15} /> Add Item</button>
        </div>
        <div className="form-grid">
          <label>Discount<input type="number" value={saleForm.discount} onChange={(e) => setSaleForm((p) => ({ ...p, discount: e.target.value }))} /></label>
          <label>Paid<input type="number" placeholder={String(saleTotals.total)} value={saleForm.paid} onChange={(e) => setSaleForm((p) => ({ ...p, paid: e.target.value }))} /></label>
          <label>Payment Method<select value={saleForm.paymentMethod} onChange={(e) => setSaleForm((p) => ({ ...p, paymentMethod: e.target.value }))}><option value="cash">Cash</option><option value="bkash">bKash</option><option value="nagad">Nagad</option><option value="card">Card</option><option value="bank">Bank</option></select></label>
          <label>Total<input disabled value={formatMoney(saleTotals.total)} /></label>
        </div>
        <div className="modal-actions"><button className="secondary-btn" onClick={() => setSaleOpen(false)}>Cancel</button><button className="primary-btn" disabled={saving} onClick={handleSale}>{saving ? 'Processing...' : 'Complete Sale'}</button></div>
      </Modal>
    </div>
  );
}
