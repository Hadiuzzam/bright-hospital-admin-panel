import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import Topbar from './Topbar.jsx';

export default function DashboardLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="app-shell">
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
      {mobileOpen ? <button className="sidebar-overlay" onClick={() => setMobileOpen(false)} /> : null}
      <main className="main-area">
        <Topbar onMenu={() => setMobileOpen(true)} />
        <section className="content-area">
          <Outlet />
        </section>
      </main>
    </div>
  );
}
