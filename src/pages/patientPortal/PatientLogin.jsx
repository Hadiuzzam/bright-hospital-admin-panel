import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, CalendarCheck, FileText, HeartPulse, Hospital, LockKeyhole, Mail, WalletCards } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { roleHome } from '../../utils/permissions.js';

export default function PatientLogin() {
  const { user, login, authLoading } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });

  if (user) return <Navigate to={roleHome[user.role] || '/'} replace />;

  const handleSubmit = async (event) => {
    event.preventDefault();
    const profile = await login(form);
    if (profile) navigate(profile.role === 'patient' ? '/portal' : roleHome[profile.role] || '/');
  };

  return (
    <div className="login-page patient-login-bg">
      <motion.div className="login-hero" initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }}>
        <div className="hero-badge"><HeartPulse size={18} /> Bright Hospital Patient Portal</div>
        <h1>Book doctor appointments and view your reports securely.</h1>
        <p>Patients can request appointments, track booking status, view own lab reports, prescriptions, invoices and payment history only.</p>
        <div className="floating-metrics">
          <div><CalendarCheck /><span>Book appointment</span></div>
          <div><FileText /><span>View own reports</span></div>
          <div><WalletCards /><span>Account details</span></div>
        </div>
      </motion.div>

      <motion.div className="login-card" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}>
        <div className="login-logo">
          <Hospital size={30} />
          <div><h2>Patient Login</h2><p>Access your own Bright Hospital records</p></div>
        </div>
        <form onSubmit={handleSubmit} className="login-form">
          <label>Email address<div className="input-shell"><Mail size={18} /><input value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} placeholder="patient@email.com" type="email" /></div></label>
          <label>Password<div className="input-shell"><LockKeyhole size={18} /><input value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} placeholder="••••••••" type="password" /></div></label>
          <button className="primary-btn full" type="submit" disabled={authLoading}>{authLoading ? 'Checking Firebase Auth...' : 'Enter Patient Portal'} <ArrowRight size={18} /></button>
        </form>
        <div className="auth-switch-box">New patient? <Link to="/patient-register">Create patient portal account</Link><br />Hospital staff? <Link to="/login">Go to staff login</Link></div>
      </motion.div>
    </div>
  );
}
