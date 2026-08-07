import { Banknote, CreditCard, FilePlus2, Landmark, Plus, ReceiptText, WalletCards } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import PageHeader from '../../components/common/PageHeader.jsx';
import StatCard from '../../components/common/StatCard.jsx';
import DataTable from '../../components/common/DataTable.jsx';
import Modal from '../../components/common/Modal.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import { useFirebaseList } from '../../hooks/useFirebaseList.js';
import { addExpense, recordPayment, updateInvoiceStatus } from '../../services/hmsService.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { formatDateTime, formatMoney, todayDate } from '../../utils/format.js';

export default function AccountsDashboard() {
  const { user } = useAuth();
  const { data: invoices, loading } = useFirebaseList('accounts/invoices');
  const { data: expenses } = useFirebaseList('accounts/expenses');
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [saving, setSaving] = useState(false);
  const [expenseForm, setExpenseForm] = useState({ title: '', category: 'general', amount: '', paymentMethod: 'cash', note: '', date: todayDate() });
  const [paymentForm, setPaymentForm] = useState({ amount: '', paymentMethod: 'cash' });

  const today = todayDate();
  const validInvoices = invoices.filter((item) => item.status !== 'cancelled');
  const todayIncome = validInvoices.filter((item) => new Date(item.createdAt || 0).toISOString().slice(0, 10) === today).reduce((sum, item) => sum + Number(item.paid || 0), 0);
  const totalIncome = validInvoices.reduce((sum, item) => sum + Number(item.paid || 0), 0);
  const totalDue = validInvoices.reduce((sum, item) => sum + Number(item.due || 0), 0);
  const totalExpense = expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const netBalance = totalIncome - totalExpense;

  const openPayment = (row) => {
    setSelectedInvoice(row);
    setPaymentForm({ amount: row.due || '', paymentMethod: row.paymentMethod || 'cash' });
    setPaymentOpen(true);
  };

  const handlePayment = async () => {
    setSaving(true);
    try {
      await recordPayment(selectedInvoice.id, paymentForm.amount, paymentForm.paymentMethod, user);
      toast.success('Payment recorded');
      setPaymentOpen(false);
    } catch (error) {
      toast.error(error?.message || 'Payment failed');
    } finally {
      setSaving(false);
    }
  };

  const handleExpense = async () => {
    setSaving(true);
    try {
      await addExpense(expenseForm, user);
      toast.success('Expense saved');
      setExpenseForm({ title: '', category: 'general', amount: '', paymentMethod: 'cash', note: '', date: todayDate() });
      setExpenseOpen(false);
    } catch (error) {
      toast.error(error?.message || 'Expense failed');
    } finally {
      setSaving(false);
    }
  };

  const changeInvoice = async (row, status) => {
    const reason = status === 'cancelled' || status === 'refunded' ? window.prompt(`Reason for ${status}?`) : '';
    if ((status === 'cancelled' || status === 'refunded') && !reason) return;
    try {
      await updateInvoiceStatus(row.id, status, user, { reason });
      toast.success(`Invoice marked ${status}`);
    } catch (error) {
      toast.error(error?.message || 'Failed to update invoice');
    }
  };

  const invoiceColumns = [
    { key: 'patientName', label: 'Patient' },
    { key: 'type', label: 'Type' },
    { key: 'total', label: 'Total', render: (row) => formatMoney(row.total) },
    { key: 'paid', label: 'Paid', render: (row) => formatMoney(row.paid) },
    { key: 'due', label: 'Due', render: (row) => formatMoney(row.due) },
    { key: 'paymentMethod', label: 'Method' },
    { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    { key: 'createdAt', label: 'Created', render: (row) => formatDateTime(row.createdAt) },
    { key: 'actions', label: 'Actions', render: (row) => <div className="row-actions"><button onClick={() => openPayment(row)}>Payment</button><button onClick={() => changeInvoice(row, 'refunded')}>Refund</button><button className="danger" onClick={() => changeInvoice(row, 'cancelled')}>Cancel</button></div> },
  ];

  const expenseColumns = [
    { key: 'title', label: 'Title' },
    { key: 'category', label: 'Category' },
    { key: 'amount', label: 'Amount', render: (row) => formatMoney(row.amount) },
    { key: 'paymentMethod', label: 'Method' },
    { key: 'date', label: 'Date' },
  ];

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Accounts"
        title="Accounts & Billing"
        subtitle="Consultation invoices, pharmacy revenue, due collection, expenses and refunds."
        action={<button className="primary-btn" onClick={() => setExpenseOpen(true)}><Plus size={17} /> Add Expense</button>}
      />

      <div className="stats-grid four">
        <StatCard title="Today Income" value={formatMoney(todayIncome)} subtitle="Collected today" icon={Banknote} />
        <StatCard title="Total Income" value={formatMoney(totalIncome)} subtitle="All modules" icon={Landmark} tone="green" />
        <StatCard title="Total Due" value={formatMoney(totalDue)} subtitle="Pending payments" icon={WalletCards} tone="orange" />
        <StatCard title="Net Balance" value={formatMoney(netBalance)} subtitle="Income - expense" icon={CreditCard} tone="blue" />
      </div>

      <div className="panel-card">
        <div className="panel-header"><div><h3>Invoices</h3><p>Created from consultation and pharmacy modules.</p></div><ReceiptText size={22} /></div>
        <DataTable columns={invoiceColumns} rows={invoices} loading={loading} emptyText="No invoice created yet." />
      </div>

      <div className="panel-card">
        <div className="panel-header"><div><h3>Expenses</h3><p>Hospital operational expenses.</p></div><FilePlus2 size={22} /></div>
        <DataTable columns={expenseColumns} rows={expenses} emptyText="No expense added yet." />
      </div>

      <Modal open={expenseOpen} title="Add Expense" onClose={() => setExpenseOpen(false)}>
        <div className="form-grid">
          <label>Title<input value={expenseForm.title} onChange={(e) => setExpenseForm((p) => ({ ...p, title: e.target.value }))} placeholder="Salary, rent, purchase etc." /></label>
          <label>Category<select value={expenseForm.category} onChange={(e) => setExpenseForm((p) => ({ ...p, category: e.target.value }))}><option value="general">General</option><option value="salary">Salary</option><option value="rent">Rent</option><option value="purchase">Purchase</option><option value="utility">Utility</option><option value="maintenance">Maintenance</option></select></label>
          <label>Amount<input type="number" value={expenseForm.amount} onChange={(e) => setExpenseForm((p) => ({ ...p, amount: e.target.value }))} /></label>
          <label>Method<select value={expenseForm.paymentMethod} onChange={(e) => setExpenseForm((p) => ({ ...p, paymentMethod: e.target.value }))}><option value="cash">Cash</option><option value="bkash">bKash</option><option value="nagad">Nagad</option><option value="bank">Bank</option></select></label>
          <label>Date<input type="date" value={expenseForm.date} onChange={(e) => setExpenseForm((p) => ({ ...p, date: e.target.value }))} /></label>
          <label>Note<input value={expenseForm.note} onChange={(e) => setExpenseForm((p) => ({ ...p, note: e.target.value }))} /></label>
        </div>
        <div className="modal-actions"><button className="secondary-btn" onClick={() => setExpenseOpen(false)}>Cancel</button><button className="primary-btn" disabled={saving} onClick={handleExpense}>{saving ? 'Saving...' : 'Save Expense'}</button></div>
      </Modal>

      <Modal open={paymentOpen} title="Record Payment" onClose={() => setPaymentOpen(false)}>
        <div className="summary-card"><strong>{selectedInvoice?.patientName}</strong><span>Total: {formatMoney(selectedInvoice?.total)} · Due: {formatMoney(selectedInvoice?.due)}</span></div>
        <div className="form-grid">
          <label>Amount<input type="number" value={paymentForm.amount} onChange={(e) => setPaymentForm((p) => ({ ...p, amount: e.target.value }))} /></label>
          <label>Payment Method<select value={paymentForm.paymentMethod} onChange={(e) => setPaymentForm((p) => ({ ...p, paymentMethod: e.target.value }))}><option value="cash">Cash</option><option value="bkash">bKash</option><option value="nagad">Nagad</option><option value="card">Card</option><option value="bank">Bank</option></select></label>
        </div>
        <div className="modal-actions"><button className="secondary-btn" onClick={() => setPaymentOpen(false)}>Cancel</button><button className="primary-btn" disabled={saving} onClick={handlePayment}>{saving ? 'Saving...' : 'Save Payment'}</button></div>
      </Modal>
    </div>
  );
}
