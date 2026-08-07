import { Bell, LogOut, Menu, Search, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext.jsx';
import { roleLabels } from '../../utils/permissions.js';

export default function Topbar({ onMenu }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const handleSearch = (event) => {
    if (event.key === 'Enter' && search.trim()) {
      navigate('/patients');
      toast.success(`Search patients page for: ${search.trim()}`);
    }
  };

  return (
    <header className="topbar">
      <button className="mobile-menu-btn" onClick={onMenu} type="button">
        <Menu size={22} />
      </button>

      <div className="global-search">
        <Search size={18} />
        <input value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={handleSearch} placeholder="Search patient, phone, invoice, doctor..." />
      </div>

      <div className="topbar-actions">
        <button className="notification-btn" type="button" onClick={() => toast('Notifications will show live SMS, booking and stock alerts here.')}>
          <Bell size={19} />
          <span>Live</span>
        </button>
        <div className="user-pill">
          <div className="avatar">{user?.name?.charAt(0) || 'B'}</div>
          <div>
            <strong>{user?.name}</strong>
            <small><ShieldCheck size={13} /> {roleLabels[user?.role]}</small>
          </div>
        </div>
        <button className="logout-btn" onClick={logout} type="button">
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}
