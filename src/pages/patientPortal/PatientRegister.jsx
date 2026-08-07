import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, HeartPulse, Hospital, LockKeyhole, Mail, Phone, UserRound } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { roleHome } from '../../utils/permissions.js';

export default function PatientRegister() {
  const { user, patientSignup, authLoading } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', age: '', gender: 'Male', bloodGroup: 'Unknown', address: '' });

  if (user) return <Navigate to={roleHome[user.role] || '/'} replace />;

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const handleSubmit = async (event) => {
    event.preventDefault();
    const profile = await patientSignup(form);
    if (profile) navigate('/portal');
  };

  return (
    <div className="login-page patient-login-bg">
      <motion.div className="login-hero" initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }}>
        <div className="hero-badge"><HeartPulse size={18} /> Secure Patient Account</div>
        <h1>Create your Bright Hospital patient portal.</h1>
        <p>After registration, you can search appointment type, select doctor, request booking and view only your own report and payment details.</p>
      </motion.div>

      <motion.div className="login-card" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}>
        <div className="login-logo"><Hospital size={30} /><div><h2>Patient Register</h2><p>Firebase Auth + Firestore secured profile</p></div></div>
        <form onSubmit={handleSubmit} className="login-form">
          <label>Full name<div className="input-shell"><UserRound size={18} /><input value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="Patient name" /></div></label>
          <label>Email<div className="input-shell"><Mail size={18} /><input value={form.email} onChange={(e) => update('email', e.target.value)} placeholder="patient@email.com" type="email" /></div></label>
          <label>Phone<div className="input-shell"><Phone size={18} /><input value={form.phone} onChange={(e) => update('phone', e.target.value)} placeholder="01XXXXXXXXX" /></div></label>
          <label>Password<div className="input-shell"><LockKeyhole size={18} /><input value={form.password} onChange={(e) => update('password', e.target.value)} placeholder="minimum 6 characters" type="password" /></div></label>
          <div className="form-grid two">
            <label>Age<input value={form.age} onChange={(e) => update('age', e.target.value)} /></label>
            <label>Gender<select value={form.gender} onChange={(e) => update('gender', e.target.value)}><option>Male</option><option>Female</option><option>Other</option></select></label>
          </div>
          <label>Address<input value={form.address} onChange={(e) => update('address', e.target.value)} placeholder="Address" /></label>
          <button className="primary-btn full" type="submit" disabled={authLoading}>{authLoading ? 'Creating account...' : 'Create Patient Account'} <ArrowRight size={18} /></button>
        </form>
        <div className="auth-switch-box">Already have account? <Link to="/patient-login">Patient login</Link></div>
      </motion.div>
    </div>
  );
}
