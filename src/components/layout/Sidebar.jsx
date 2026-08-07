import { NavLink } from 'react-router-dom';
import {
  Activity,
  CalendarCheck,
  FileCog,
  HeartPulse,
  Hospital,
  Landmark,
  FlaskConical,
  Cpu,
  LayoutDashboard,
  Pill,
  Settings,
  ShieldCheck,
  Stethoscope,
  UsersRound,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { canAccess, roleLabels } from '../../utils/permissions.js';

const navSections = [
  {
    title: 'Hospital',
    items: [
      { key: 'dashboard', label: 'Dashboard', to: '/', icon: LayoutDashboard },
      { key: 'patients', label: 'Patients', to: '/patients', icon: UsersRound },
      { key: 'appointments', label: 'Appointments', to: '/appointments', icon: CalendarCheck },
      { key: 'doctors', label: 'Doctors', to: '/doctors', icon: Stethoscope },
      { key: 'doctorWorkspace', label: 'Doctor Workspace', to: '/doctor-workspace', icon: HeartPulse },
      { key: 'pharmacy', label: 'Pharmacy', to: '/pharmacy', icon: Pill },
      { key: 'lab', label: 'Lab', to: '/lab', icon: FlaskConical },
      { key: 'machines', label: 'Machines', to: '/machines', icon: Cpu },
      { key: 'accounts', label: 'Accounts', to: '/accounts', icon: Landmark },
    ],
  },
  {
    title: 'System',
    items: [
      { key: 'settings', label: 'Staff Users', to: '/settings/staff', icon: ShieldCheck },
      { key: 'settings', label: 'Roles & Access', to: '/settings/roles', icon: FileCog },
      { key: 'settings', label: 'SMS Settings', to: '/settings/sms', icon: Settings },
      { key: 'settings', label: 'Departments', to: '/settings/departments', icon: Hospital },
    ],
  },
];

export default function Sidebar({ mobileOpen, setMobileOpen }) {
  const { user } = useAuth();

  return (
    <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
      <div className="brand-box">
        <div className="brand-icon">
          <Hospital size={28} />
        </div>
        <div>
          <h2>Bright HMS</h2>
          <p>Hospital Management</p>
        </div>
      </div>

      <div className="role-chip">
        <Activity size={16} />
        {roleLabels[user?.role] || 'Staff'}
      </div>

      <nav className="sidebar-nav">
        {navSections.map((section) => {
          const items = section.items.filter((item) => canAccess(user?.role, item.key));
          if (items.length === 0) return null;
          return (
            <div key={section.title} className="nav-section">
              <span>{section.title}</span>
              {items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={`${item.to}-${item.label}`}
                    to={item.to}
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
                    end={item.to === '/'}
                  >
                    <Icon size={19} />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
