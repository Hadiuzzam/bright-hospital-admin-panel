import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Activity, ArrowRight, HeartPulse, Hospital, LockKeyhole, Mail, ShieldCheck, Stethoscope } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { roleHome } from '../../utils/permissions.js';

const demoLogins = [
  ['Super Admin', 'super@bright.com'],
  ['Admin', 'admin@bright.com'],
  ['Reception', 'reception@bright.com'],
  ['Doctor', 'doctor@bright.com'],
  ['Pharmacy', 'pharmacy@bright.com'],
  ['Accounts', 'accounts@bright.com'],
];

export default function Login() {
  const { user, login, authLoading } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: 'super@bright.com', password: '123456' });

  if (user) return <Navigate to={roleHome[user.role] || '/'} replace />;

  const handleSubmit = async (event) => {
    event.preventDefault();
    const ok = await login(form);
    if (ok) navigate('/');
  };

  return (
    <div className="login-page">
      <motion.div
        className="login-hero"
        initial={{ opacity: 0, x: -24 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.45 }}
      >
        <div className="hero-badge">
          <ShieldCheck size={18} /> Internal Staff Only
        </div>
        <h1>Bright Hospital Management System</h1>
        <p>
          Premium role-based dashboard for appointments, doctors, patients, pharmacy, accounts,
          file uploads, SMS alerts and complete hospital operations.
        </p>

        <div className="floating-metrics">
          <div>
            <HeartPulse />
            <span>Live patient queue</span>
          </div>
          <div>
            <Stethoscope />
            <span>Doctor workspace</span>
          </div>
          <div>
            <Activity />
            <span>Audit & access logs</span>
          </div>
        </div>
      </motion.div>

      <motion.div
        className="login-card"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.1 }}
      >
        <div className="login-logo">
          <Hospital size={30} />
          <div>
            <h2>Staff Login</h2>
            <p>Use your assigned hospital account</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <label>
            Email address
            <div className="input-shell">
              <Mail size={18} />
              <input
                value={form.email}
                onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                placeholder="staff@bright.com"
                type="email"
              />
            </div>
          </label>
          <label>
            Password
            <div className="input-shell">
              <LockKeyhole size={18} />
              <input
                value={form.password}
                onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                placeholder="••••••••"
                type="password"
              />
            </div>
          </label>
          <button className="primary-btn full" type="submit" disabled={authLoading}>
            {authLoading ? 'Checking Firebase...' : 'Enter HMS Dashboard'} <ArrowRight size={18} />
          </button>
        </form>

        <div className="demo-box">
          <strong>Demo accounts</strong>
          <p>Password for all: 123456</p>
          <div className="demo-grid">
            {demoLogins.map(([label, email]) => (
              <button key={email} type="button" onClick={() => setForm({ email, password: '123456' })}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
