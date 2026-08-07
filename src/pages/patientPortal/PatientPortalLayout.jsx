import { NavLink, Outlet } from 'react-router-dom';
import { CalendarPlus, FileText, HeartPulse, Home, LogOut, WalletCards } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';

export default function PatientPortalLayout() {
  const { user, logout } = useAuth();
  const links = [
    { to: '/portal', label: 'Home', icon: Home, end: true },
    { to: '/portal/book', label: 'Book Appointment', icon: CalendarPlus },
    { to: '/portal/bookings', label: 'My Bookings', icon: HeartPulse },
    { to: '/portal/reports', label: 'Reports', icon: FileText },
    { to: '/portal/account', label: 'Account', icon: WalletCards },
  ];

  return (
    <div className="patient-portal-shell">
      <header className="patient-portal-topbar">
        <div className="patient-brand"><HeartPulse /><div><strong>Bright Hospital</strong><span>Patient Portal</span></div></div>
        <nav>
          {links.map((link) => {
            const Icon = link.icon;
            return <NavLink key={link.to} to={link.to} end={link.end}><Icon size={17} /> {link.label}</NavLink>;
          })}
        </nav>
        <button className="secondary-btn" onClick={logout}><LogOut size={16} /> Logout</button>
      </header>
      <main className="patient-portal-content">
        <div className="patient-welcome-strip">
          <div><span>Welcome</span><h2>{user?.name || 'Patient'}</h2></div>
          <p>Your personal records are protected by Firebase Auth and Firestore security rules.</p>
        </div>
        <Outlet />
      </main>
    </div>
  );
}
