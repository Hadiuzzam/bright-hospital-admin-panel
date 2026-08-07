import { MessageSquareText, Send } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import PageHeader from '../../components/common/PageHeader.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import { useFirebaseList } from '../../hooks/useFirebaseList.js';
import { useFirebaseItem } from '../../hooks/useFirebaseItem.js';
import { logSms, saveGatewaySettings, saveSmsTemplate } from '../../services/hmsService.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { formatDateTime } from '../../utils/format.js';
import DataTable from '../../components/common/DataTable.jsx';

export default function SmsSettings() {
  const { user } = useAuth();
  const { data: templates } = useFirebaseList('sms/templates');
  const { data: gateway } = useFirebaseItem('settings', 'smsGateway');
  const { data: logs } = useFirebaseList('sms/logs');
  const [gatewayForm, setGatewayForm] = useState(null);
  const [testForm, setTestForm] = useState({ phone: '', message: '' });

  const currentGateway = gatewayForm || gateway || { gatewayName: 'MiMSMS Non-Masking', senderType: 'non_masking', endpoint: '/api/sms/send' };

  const handleGatewaySave = async () => {
    try {
      await saveGatewaySettings(currentGateway, user);
      setGatewayForm(null);
      toast.success('SMS gateway settings saved');
    } catch (error) {
      toast.error(error?.message || 'Failed to save SMS gateway');
    }
  };

  const handleTemplateUpdate = async (template) => {
    try {
      await saveSmsTemplate(template.id, { body: template.body, status: template.status, name: template.name, trigger: template.trigger }, user);
      toast.success(`${template.name} template updated`);
    } catch (error) {
      toast.error(error?.message || 'Template update failed');
    }
  };

  const handleTestLog = async () => {
    try {
      await logSms({ phone: testForm.phone, message: testForm.message, gateway: currentGateway.gatewayName }, user);
      toast.success('Test SMS saved to Firebase log. Backend API will send real SMS later.');
      setTestForm({ phone: '', message: '' });
    } catch (error) {
      toast.error(error?.message || 'Failed to create SMS log');
    }
  };

  const logColumns = [
    { key: 'phone', label: 'Phone' },
    { key: 'message', label: 'Message' },
    { key: 'gateway', label: 'Gateway' },
    { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    { key: 'createdAt', label: 'Created', render: (row) => formatDateTime(row.createdAt) },
  ];

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="SMS & OTP"
        title="Message Configuration"
        subtitle="Save gateway settings and editable SMS templates. Real sending must be done from backend so API keys stay private."
      />

      <div className="panel-card">
        <div className="panel-header">
          <div><h3>Gateway Setup</h3><p>Use MiMSMS/Twilio/local SMS gateway from backend API only.</p></div>
          <button className="primary-btn" onClick={handleGatewaySave}>Save Gateway</button>
        </div>
        <div className="form-grid">
          <label>Gateway Name<input value={currentGateway.gatewayName || ''} onChange={(e) => setGatewayForm((p) => ({ ...(p || currentGateway), gatewayName: e.target.value }))} /></label>
          <label>Sender Type<select value={currentGateway.senderType || 'non_masking'} onChange={(e) => setGatewayForm((p) => ({ ...(p || currentGateway), senderType: e.target.value }))}><option value="non_masking">Non-Masking</option><option value="masking">Masking</option></select></label>
          <label className="span-2">Backend SMS Endpoint<input value={currentGateway.endpoint || ''} onChange={(e) => setGatewayForm((p) => ({ ...(p || currentGateway), endpoint: e.target.value }))} /></label>
        </div>
      </div>

      <div className="sms-template-grid">
        {templates.map((template) => (
          <TemplateCard key={template.id} template={template} onSave={handleTemplateUpdate} />
        ))}
      </div>

      <div className="panel-card">
        <div className="panel-header"><div><h3>Test SMS Log</h3><p>This saves a log in Firebase. Later backend will read/send it through MiMSMS.</p></div><Send size={22} /></div>
        <div className="form-grid">
          <label>Phone<input value={testForm.phone} onChange={(e) => setTestForm((p) => ({ ...p, phone: e.target.value }))} placeholder="01XXXXXXXXX" /></label>
          <label>Message<input value={testForm.message} onChange={(e) => setTestForm((p) => ({ ...p, message: e.target.value }))} placeholder="Test message" /></label>
        </div>
        <div className="modal-actions"><button className="primary-btn" onClick={handleTestLog}>Save Test SMS Log</button></div>
      </div>

      <div className="panel-card">
        <div className="panel-header"><div><h3>SMS Logs</h3><p>Queued/sent message logs.</p></div></div>
        <DataTable columns={logColumns} rows={logs} emptyText="No SMS log yet." />
      </div>
    </div>
  );
}

function TemplateCard({ template, onSave }) {
  const [local, setLocal] = useState(template);

  return (
    <div className="sms-card">
      <div className="sms-card-top">
        <MessageSquareText size={21} />
        <StatusBadge status={local.status} />
      </div>
      <h3>{local.name}</h3>
      <span>{local.trigger}</span>
      <textarea value={local.body || ''} onChange={(e) => setLocal((p) => ({ ...p, body: e.target.value }))} />
      <select value={local.status || 'active'} onChange={(e) => setLocal((p) => ({ ...p, status: e.target.value }))}>
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
      </select>
      <button className="secondary-btn" onClick={() => onSave(local)}>Update Template</button>
    </div>
  );
}
