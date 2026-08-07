import { FileText, ExternalLink } from 'lucide-react';
import DataTable from '../../components/common/DataTable.jsx';
import PageHeader from '../../components/common/PageHeader.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useFirebaseList } from '../../hooks/useFirebaseList.js';
import { formatDateTime } from '../../utils/format.js';

export default function PatientReports() {
  const { user } = useAuth();
  const { data: files, loading } = useFirebaseList('patientFiles', { where: [['patientUid', '==', user.uid]] });

  return (
    <div className="page-stack">
      <PageHeader eyebrow="My reports" title="Reports, prescriptions & uploaded files" subtitle="Only files attached to your own patient profile are visible here." />
      <DataTable
        loading={loading}
        columns={[
          { key: 'fileName', label: 'File', render: (row) => <span className="file-name-cell"><FileText size={16} /> {row.fileName}</span> },
          { key: 'category', label: 'Category', render: (row) => <StatusBadge status={row.category} /> },
          { key: 'doctorId', label: 'Doctor/Source' },
          { key: 'createdAt', label: 'Uploaded', render: (row) => formatDateTime(row.createdAt) },
          { key: 'view', label: 'View', render: (row) => row.fileUrl ? <a className="secondary-btn mini" href={row.fileUrl} target="_blank" rel="noreferrer"><ExternalLink size={15} /> Open</a> : '-' },
        ]}
        rows={files}
        emptyText="No report or prescription has been uploaded yet."
      />
    </div>
  );
}
