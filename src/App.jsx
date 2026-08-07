import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import DashboardLayout from './components/layout/DashboardLayout.jsx';
import Login from './pages/auth/Login.jsx';
import PatientLogin from './pages/patientPortal/PatientLogin.jsx';
import PatientRegister from './pages/patientPortal/PatientRegister.jsx';
import PatientPortalLayout from './pages/patientPortal/PatientPortalLayout.jsx';
import PatientPortalHome from './pages/patientPortal/PatientPortalHome.jsx';
import PatientBookAppointment from './pages/patientPortal/PatientBookAppointment.jsx';
import PatientBookings from './pages/patientPortal/PatientBookings.jsx';
import PatientReports from './pages/patientPortal/PatientReports.jsx';
import PatientAccount from './pages/patientPortal/PatientAccount.jsx';
import DashboardHome from './pages/dashboard/DashboardHome.jsx';
import PatientsList from './pages/patients/PatientsList.jsx';
import PatientProfile from './pages/patients/PatientProfile.jsx';
import AppointmentsList from './pages/appointments/AppointmentsList.jsx';
import DoctorsList from './pages/doctors/DoctorsList.jsx';
import DoctorWorkspace from './pages/doctors/DoctorWorkspace.jsx';
import PharmacyDashboard from './pages/pharmacy/PharmacyDashboard.jsx';
import LabDashboard from './pages/lab/LabDashboard.jsx';
import MachinesDashboard from './pages/machines/MachinesDashboard.jsx';
import AccountsDashboard from './pages/accounts/AccountsDashboard.jsx';
import StaffUsers from './pages/settings/StaffUsers.jsx';
import RolesPermissions from './pages/settings/RolesPermissions.jsx';
import SmsSettings from './pages/settings/SmsSettings.jsx';
import Departments from './pages/settings/Departments.jsx';
import { canAccess, isStaffRole, roleHome } from './utils/permissions.js';

function SplashGuard({ children }) {
  const { authReady } = useAuth();
  if (!authReady) return <div className="loading-screen">Checking secure Firebase session...</div>;
  return children;
}

function ProtectedStaffRoute({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'patient') return <Navigate to="/portal" replace />;
  if (!isStaffRole(user.role)) return <Navigate to="/login" replace />;
  return children;
}

function ProtectedPatientRoute({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/patient-login" replace />;
  if (user.role !== 'patient') return <Navigate to={roleHome[user.role] || '/'} replace />;
  return children;
}

function RoleRoute({ accessKey, children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!canAccess(user.role, accessKey)) return <Navigate to={roleHome[user.role] || '/'} replace />;
  return children;
}

export default function App() {
  return (
    <SplashGuard>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/patient-login" element={<PatientLogin />} />
        <Route path="/patient-register" element={<PatientRegister />} />

        <Route
          path="/portal"
          element={
            <ProtectedPatientRoute>
              <PatientPortalLayout />
            </ProtectedPatientRoute>
          }
        >
          <Route index element={<PatientPortalHome />} />
          <Route path="book" element={<PatientBookAppointment />} />
          <Route path="bookings" element={<PatientBookings />} />
          <Route path="reports" element={<PatientReports />} />
          <Route path="account" element={<PatientAccount />} />
        </Route>

        <Route
          path="/"
          element={
            <ProtectedStaffRoute>
              <DashboardLayout />
            </ProtectedStaffRoute>
          }
        >
          <Route index element={<RoleRoute accessKey="dashboard"><DashboardHome /></RoleRoute>} />
          <Route path="patients" element={<RoleRoute accessKey="patients"><PatientsList /></RoleRoute>} />
          <Route path="patients/:patientId" element={<RoleRoute accessKey="patients"><PatientProfile /></RoleRoute>} />
          <Route path="appointments" element={<RoleRoute accessKey="appointments"><AppointmentsList /></RoleRoute>} />
          <Route path="doctors" element={<RoleRoute accessKey="doctors"><DoctorsList /></RoleRoute>} />
          <Route path="doctor-workspace" element={<RoleRoute accessKey="doctorWorkspace"><DoctorWorkspace /></RoleRoute>} />
          <Route path="pharmacy" element={<RoleRoute accessKey="pharmacy"><PharmacyDashboard /></RoleRoute>} />
          <Route path="lab" element={<RoleRoute accessKey="lab"><LabDashboard /></RoleRoute>} />
          <Route path="machines" element={<RoleRoute accessKey="machines"><MachinesDashboard /></RoleRoute>} />
          <Route path="accounts" element={<RoleRoute accessKey="accounts"><AccountsDashboard /></RoleRoute>} />
          <Route path="settings/staff" element={<RoleRoute accessKey="settings"><StaffUsers /></RoleRoute>} />
          <Route path="settings/roles" element={<RoleRoute accessKey="settings"><RolesPermissions /></RoleRoute>} />
          <Route path="settings/sms" element={<RoleRoute accessKey="settings"><SmsSettings /></RoleRoute>} />
          <Route path="settings/departments" element={<RoleRoute accessKey="settings"><Departments /></RoleRoute>} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </SplashGuard>
  );
}
