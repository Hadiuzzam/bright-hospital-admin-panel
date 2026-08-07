import { FlaskConical, FilePlus2, FileText, Plus, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import PageHeader from '../../components/common/PageHeader.jsx';
import StatCard from '../../components/common/StatCard.jsx';
import DataTable from '../../components/common/DataTable.jsx';
import Modal from '../../components/common/Modal.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import { useFirebaseList } from '../../hooks/useFirebaseList.js';
import { addLabReport, addLabRequest } from '../../services/hmsService.js';
import { useAuth } from '../../context/AuthContext.jsx';

const emptyRequest = { patientId: '', patientName: '', testName: '', doctorName: '', requestedDate: new Date().toISOString().slice(0, 10), note: '', status: 'requested' };
const emptyReport = { requestId: '', patientId: '', patientName: '', testName: '', resultSummary: '', fileUrl: '', fileData: '', reportDate: new Date().toISOString().slice(0, 10), status: 'ready' };

export default function LabDashboard() {
  const { user } = useAuth();
  const { data: patients } = useFirebaseList('patients');
  const { data: requests, loading: requestLoading } = useFirebaseList('labRequests');
  const { data: reports, loading: reportLoading } = useFirebaseList('labReports');
  const [query, setQuery] = useState('');
  const [requestOpen, setRequestOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [requestForm, setRequestForm] = useState(emptyRequest);
  const [reportForm, setReportForm] = useState(emptyReport);

  const pending = requests.filter((item) => item.status !== 'reported' && item.status !== 'cancelled');
  const filteredRequests = useMemo(() => requests.filter((item) => `${item.patientName} ${item.testName} ${item.doctorName} ${item.status}`.toLowerCase().includes(query.toLowerCase())), [requests, query]);
  const filteredReports = useMemo(() => reports.filter((item) => `${item.patientName} ${item.testName} ${item.resultSummary}`.toLowerCase().includes(query.toLowerCase())), [reports, query]);

  const setRequestPatient = (patientId) => {
    const patient = patients.find((item) => item.id === patientId);
    setRequestForm((prev) => ({ ...prev, patientId, patientUid: patient?.patientUid || patient?.ownerUid || patient?.id || '', ownerUid: patient?.ownerUid || patient?.patientUid || patient?.id || '', patientName: patient?.name || '' }));
  };

  const setReportRequest = (requestId) => {
    const request = requests.find((item) => item.id === requestId);
    setReportForm((prev) => ({
      ...prev,
      requestId,
      patientId: request?.patientId || '',
      patientUid: request?.patientUid || request?.ownerUid || '',
      ownerUid: request?.ownerUid || request?.patientUid || '',
      patientName: request?.patientName || '',
      testName: request?.testName || '',
    }));
  };

  const handleRequest = async () => {
    setSaving(true);
    try {
      await addLabRequest(requestForm, user);
      toast.success('Lab request created');
      setRequestForm(emptyRequest);
      setRequestOpen(false);
    } catch (error) {
      toast.error(error?.message || 'Could not create request');
    } finally {
      setSaving(false);
    }
  };

  const handleReport = async () => {
    setSaving(true);
    try {
      await addLabReport(reportForm, user);
      toast.success('Lab report saved');
      setReportForm(emptyReport);
      setReportOpen(false);
    } catch (error) {
      toast.error(error?.message || 'Could not save report');
    } finally {
      setSaving(false);
    }
  };

  const requestColumns = [
    { key: 'patientName', label: 'Patient' },
    { key: 'testName', label: 'Test' },
    { key: 'doctorName', label: 'Doctor' },
    { key: 'requestedDate', label: 'Date' },
    { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
  ];
  const reportColumns = [
    { key: 'patientName', label: 'Patient' },
    { key: 'testName', label: 'Test' },
    { key: 'reportDate', label: 'Report Date' },
    { key: 'resultSummary', label: 'Summary' },
    { key: 'fileUrl', label: 'File', render: (row) => row.fileUrl ? <a className="table-link" href={row.fileUrl} target="_blank" rel="noreferrer">Open</a> : '-' },
  ];

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Lab & Reports"
        title="Laboratory"
        subtitle="Create lab requests, upload report link/base64 summary, and let patients view their own reports."
        action={<div className="page-action-group"><button className="secondary-btn" onClick={() => setReportOpen(true)}><FilePlus2 size={17} /> Add Report</button><button className="primary-btn" onClick={() => setRequestOpen(true)}><Plus size={17} /> New Request</button></div>}
      />
      <div className="stats-grid four">
        <StatCard title="Requests" value={requests.length} subtitle="Total lab requests" icon={FlaskConical} />
        <StatCard title="Pending" value={pending.length} subtitle="Needs report" icon={FileText} tone="orange" />
        <StatCard title="Reports" value={reports.length} subtitle="Ready reports" icon={FilePlus2} tone="green" />
        <StatCard title="Patients" value={patients.length} subtitle="Linked profiles" icon={Search} tone="blue" />
      </div>
      <div className="toolbar-card"><div className="search-control"><Search size={18} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search patient, test or doctor" /></div></div>
      <div className="panel-card"><div className="panel-header"><div><h3>Lab Requests</h3><p>Doctor/admin/reception can create requests.</p></div></div><DataTable columns={requestColumns} rows={filteredRequests} loading={requestLoading} emptyText="No lab request yet." /></div>
      <div className="panel-card"><div className="panel-header"><div><h3>Reports</h3><p>Patients can view their own linked reports from website portal.</p></div></div><DataTable columns={reportColumns} rows={filteredReports} loading={reportLoading} emptyText="No report uploaded yet." /></div>

      <Modal open={requestOpen} title="New Lab Request" onClose={() => setRequestOpen(false)}>
        <div className="form-grid">
          <label>Patient<select value={requestForm.patientId} onChange={(e) => setRequestPatient(e.target.value)}><option value="">Select patient</option>{patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.patientCode || patient.id} - {patient.name}</option>)}</select></label>
          <label>Patient Name<input value={requestForm.patientName} onChange={(e) => setRequestForm((p) => ({ ...p, patientName: e.target.value }))} /></label>
          <label>Test Name<input value={requestForm.testName} onChange={(e) => setRequestForm((p) => ({ ...p, testName: e.target.value }))} placeholder="CBC / X-ray / Ultrasound" /></label>
          <label>Doctor Name<input value={requestForm.doctorName} onChange={(e) => setRequestForm((p) => ({ ...p, doctorName: e.target.value }))} /></label>
          <label>Date<input type="date" value={requestForm.requestedDate} onChange={(e) => setRequestForm((p) => ({ ...p, requestedDate: e.target.value }))} /></label>
          <label>Status<select value={requestForm.status} onChange={(e) => setRequestForm((p) => ({ ...p, status: e.target.value }))}><option value="requested">Requested</option><option value="sample_collected">Sample Collected</option><option value="processing">Processing</option></select></label>
          <label className="span-2">Note<textarea value={requestForm.note} onChange={(e) => setRequestForm((p) => ({ ...p, note: e.target.value }))} /></label>
        </div>
        <div className="modal-actions"><button className="secondary-btn" onClick={() => setRequestOpen(false)}>Cancel</button><button className="primary-btn" disabled={saving} onClick={handleRequest}>{saving ? 'Saving...' : 'Save Request'}</button></div>
      </Modal>

      <Modal open={reportOpen} title="Add Lab Report" onClose={() => setReportOpen(false)}>
        <div className="form-grid">
          <label>Link Request<select value={reportForm.requestId} onChange={(e) => setReportRequest(e.target.value)}><option value="">Manual report</option>{requests.map((request) => <option key={request.id} value={request.id}>{request.patientName} - {request.testName}</option>)}</select></label>
          <label>Patient Name<input value={reportForm.patientName} onChange={(e) => setReportForm((p) => ({ ...p, patientName: e.target.value }))} /></label>
          <label>Test Name<input value={reportForm.testName} onChange={(e) => setReportForm((p) => ({ ...p, testName: e.target.value }))} /></label>
          <label>Report Date<input type="date" value={reportForm.reportDate} onChange={(e) => setReportForm((p) => ({ ...p, reportDate: e.target.value }))} /></label>
          <label className="span-2">Report URL or tiny Base64<textarea value={reportForm.fileUrl || reportForm.fileData} onChange={(e) => setReportForm((p) => ({ ...p, fileUrl: e.target.value }))} /></label>
          <label className="span-2">Result Summary<textarea value={reportForm.resultSummary} onChange={(e) => setReportForm((p) => ({ ...p, resultSummary: e.target.value }))} /></label>
        </div>
        <div className="modal-actions"><button className="secondary-btn" onClick={() => setReportOpen(false)}>Cancel</button><button className="primary-btn" disabled={saving} onClick={handleReport}>{saving ? 'Saving...' : 'Save Report'}</button></div>
      </Modal>
    </div>
  );
}
