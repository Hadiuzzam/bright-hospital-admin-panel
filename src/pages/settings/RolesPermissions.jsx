import { ShieldCheck, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import PageHeader from '../../components/common/PageHeader.jsx';
import { roleLabels, navPermissions } from '../../utils/permissions.js';
import { seedHospitalBasics } from '../../services/hmsService.js';
import { useAuth } from '../../context/AuthContext.jsx';

const modules = [
  ['dashboard', 'Dashboard'],
  ['patients', 'Patients'],
  ['appointments', 'Appointments'],
  ['doctors', 'Doctors'],
  ['doctorWorkspace', 'Doctor Workspace'],
  ['pharmacy', 'Pharmacy'],
  ['accounts', 'Accounts'],
  ['settings', 'Settings'],
  ['patientPortal', 'Patient Portal'],
];

export default function RolesPermissions() {
  const roles = Object.keys(roleLabels);
  const { user } = useAuth();

  const handleSeed = async () => {
    try {
      await seedHospitalBasics(user);
      toast.success('Departments, appointment types and SMS templates seeded');
    } catch (error) {
      toast.error(error?.message || 'Seed failed. Check Firestore rules.');
    }
  };

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Access Control"
        title="Roles & Access"
        subtitle="Frontend module access plus Firestore security rules protect staff and patient data. Patient can only read own bookings, reports and invoices."
        action={<button className="primary-btn" onClick={handleSeed}><Sparkles size={17} /> Seed Hospital Basics</button>}
      />

      <div className="permission-grid">
        {roles.map((role) => (
          <div className="permission-card" key={role}>
            <div className="permission-title"><ShieldCheck size={20} /><h3>{roleLabels[role]}</h3></div>
            {modules.map(([key, label]) => {
              const allowed = navPermissions[key]?.includes(role);
              return (
                <div className="permission-row" key={key}>
                  <span>{label}</span>
                  <strong className={allowed ? 'allowed' : 'blocked'}>{allowed ? 'Allowed' : 'Blocked'}</strong>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
