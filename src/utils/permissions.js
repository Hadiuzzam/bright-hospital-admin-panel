export const roleLabels = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  receptionist: 'Receptionist',
  doctor: 'Doctor',
  nurse: 'Nurse',
  pharmacy: 'Pharmacy Staff',
  accounts: 'Accounts Staff',
  lab: 'Lab Staff',
  patient: 'Patient',
};

export const roleHome = {
  super_admin: '/',
  admin: '/',
  receptionist: '/appointments',
  doctor: '/doctor-workspace',
  pharmacy: '/pharmacy',
  accounts: '/accounts',
  nurse: '/patients',
  lab: '/lab',
  patient: '/portal',
};

export const staffRoles = ['super_admin', 'admin', 'receptionist', 'doctor', 'nurse', 'pharmacy', 'accounts', 'lab', 'staff'];

export const navPermissions = {
  dashboard: ['super_admin', 'admin', 'receptionist', 'doctor', 'pharmacy', 'accounts', 'nurse', 'lab'],
  patients: ['super_admin', 'admin', 'receptionist', 'doctor', 'nurse', 'lab'],
  appointments: ['super_admin', 'admin', 'receptionist', 'doctor'],
  doctors: ['super_admin', 'admin', 'receptionist'],
  doctorWorkspace: ['doctor', 'super_admin', 'admin'],
  pharmacy: ['super_admin', 'admin', 'pharmacy'],
  accounts: ['super_admin', 'admin', 'accounts'],
  lab: ['super_admin', 'admin', 'lab'],
  machines: ['super_admin', 'admin'],
  settings: ['super_admin', 'admin'],
  patientPortal: ['patient'],
};

export function canAccess(role, key) {
  return navPermissions[key]?.includes(role);
}

export function isStaffRole(role) {
  return staffRoles.includes(role);
}
