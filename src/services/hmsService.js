import firebase, { auth, firestore, functions, storage } from '../config.js';

export const HOSPITAL_ID = import.meta.env.VITE_HOSPITAL_ID || 'bright_hospital';
const COLLECTION_ALIASES = {
  'pharmacy/medicines': 'pharmacyMedicines',
  'pharmacy/sales': 'pharmacySales',
  'pharmacy/purchases': 'pharmacyPurchases',
  'accounts/invoices': 'invoices',
  'accounts/payments': 'payments',
  'accounts/expenses': 'expenses',
  'sms/templates': 'smsTemplates',
  'sms/logs': 'smsLogs',
  medicines: 'pharmacyMedicines',
  machines: 'machines',
  labReports: 'labReports',
  labRequests: 'labRequests',
};

export const serverTime = () => Date.now();
export const callBackend = (name) => functions.httpsCallable(name);
export const cleanText = (value) => String(value ?? '').trim();
export const normalizeEmail = (value) => cleanText(value).toLowerCase();
export const money = (value) => Number(value || 0);

export function normalizeBDPhoneForHms(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (/^01[3-9]\d{8}$/.test(digits)) return { local: digits, phoneKey: `880${digits.slice(1)}` };
  if (/^1[3-9]\d{8}$/.test(digits)) return { local: `0${digits}`, phoneKey: `880${digits}` };
  if (/^8801[3-9]\d{8}$/.test(digits)) return { local: `0${digits.slice(3)}`, phoneKey: digits };
  return { local: digits, phoneKey: digits };
}

async function findPatientByPhone(phone) {
  const { local, phoneKey } = normalizeBDPhoneForHms(phone);
  const phoneFields = [
    ['phoneKey', phoneKey],
    ['phone', local],
    ['phoneDisplay', local],
    ['patientPhone', local],
  ].filter(([, value]) => value);

  for (const [field, value] of phoneFields) {
    const snapshot = await colRef('patients').where(field, '==', value).limit(1).get();
    if (!snapshot.empty) return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
  }
  return null;
}

async function ensureAppointmentPatient(data, user) {
  if (data.patientId) {
    const existing = await getItem('patients', data.patientId).catch(() => null);
    if (existing) return existing;
  }

  const existingByPhone = await findPatientByPhone(data.patientPhone || data.phone || data.phoneDisplay);
  if (existingByPhone) return existingByPhone;

  const { local, phoneKey } = normalizeBDPhoneForHms(data.patientPhone || data.phone || data.phoneDisplay);
  const patientName = cleanText(data.patientName) || 'Guest Patient';
  if (!local || !patientName) throw new Error('Patient name and phone are required');

  const patientId = `guest_${phoneKey || local}`;
  const patientRef = docRef('patients', patientId);
  const snapshot = await patientRef.get();
  const payload = {
    hospitalId: HOSPITAL_ID,
    patientId,
    patientUid: '',
    ownerUid: '',
    patientCode: snapshot.data()?.patientCode || `BH-G-${String(phoneKey || local).slice(-6)}`,
    name: patientName,
    email: normalizeEmail(data.email || ''),
    phone: local,
    phoneDisplay: local,
    phoneKey,
    age: cleanText(data.age || ''),
    gender: data.gender || 'Unknown',
    bloodGroup: data.bloodGroup || 'Unknown',
    address: cleanText(data.address || ''),
    emergencyContact: cleanText(data.emergencyContact || ''),
    source: 'admin_guest_booking',
    status: 'active',
    createdAt: snapshot.exists ? (snapshot.data().createdAt || serverTime()) : serverTime(),
    updatedAt: serverTime(),
    createdBy: snapshot.exists ? (snapshot.data().createdBy || user?.uid || 'admin') : (user?.uid || 'admin'),
    updatedBy: user?.uid || user?.id || user?.email || 'admin',
  };
  await patientRef.set(payload, { merge: true });
  return { id: patientId, ...payload };
}


export function makeIdFromText(value, fallback = 'item') {
  const slug = cleanText(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  return slug || fallback;
}

function parseCsv(value) {
  return cleanText(value).split(',').map((item) => item.trim()).filter(Boolean);
}

function parseDays(value) {
  return parseCsv(value).map((item) => Number(item)).filter((item) => Number.isInteger(item) && item >= 0 && item <= 6);
}

function scheduleSlotsFromData(data) {
  if (Array.isArray(data.scheduleSlots) && data.scheduleSlots.length) return data.scheduleSlots;
  const days = parseDays(data.slotDays);
  const times = parseCsv(data.slotTimes);
  return days.length && times.length ? [{ days, times }] : [];
}

export function mapCollection(collection) {
  return COLLECTION_ALIASES[collection] || collection;
}

export function hospitalDoc() {
  return firestore.collection('hospitals').doc(HOSPITAL_ID);
}

export function colRef(collection) {
  return hospitalDoc().collection(mapCollection(collection));
}

export function docRef(collection, id) {
  return colRef(collection).doc(id);
}

function byUpdatedDesc(a, b) {
  return Number(b.updatedAt || b.createdAt || 0) - Number(a.updatedAt || a.createdAt || 0);
}

function listFromSnapshot(snapshot) {
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })).sort(byUpdatedDesc);
}

export function listenList(collection, callback, onError, options = {}) {
  let query = colRef(collection);
  if (options.where) {
    options.where.forEach(([field, operator, value]) => {
      query = query.where(field, operator, value);
    });
  }
  if (options.orderBy) {
    query = query.orderBy(options.orderBy.field, options.orderBy.direction || 'desc');
  } else if (!options.where?.length) {
    query = query.orderBy('updatedAt', 'desc');
  }
  if (options.limit) query = query.limit(options.limit);

  return query.onSnapshot(
    (snapshot) => callback(listFromSnapshot(snapshot)),
    (error) => onError?.(error),
  );
}

export function listenItem(collection, id, callback, onError) {
  if (!id) return () => {};
  return docRef(collection, id).onSnapshot(
    (snapshot) => callback(snapshot.exists ? { id: snapshot.id, ...snapshot.data() } : null),
    (error) => onError?.(error),
  );
}

export async function getList(collection, options = {}) {
  let query = colRef(collection);
  if (options.where) {
    options.where.forEach(([field, operator, value]) => {
      query = query.where(field, operator, value);
    });
  }
  const snapshot = await query.get();
  return listFromSnapshot(snapshot);
}

export async function getItem(collection, id) {
  const snapshot = await docRef(collection, id).get();
  return snapshot.exists ? { id: snapshot.id, ...snapshot.data() } : null;
}

function metaForCreate(user) {
  const now = serverTime();
  return {
    hospitalId: HOSPITAL_ID,
    createdAt: now,
    updatedAt: now,
    createdBy: user?.uid || user?.id || user?.email || 'system',
    updatedBy: user?.uid || user?.id || user?.email || 'system',
  };
}

function metaForUpdate(user) {
  return {
    updatedAt: serverTime(),
    updatedBy: user?.uid || user?.id || user?.email || 'system',
  };
}

export async function addRecord(collection, data, user) {
  const ref = await colRef(collection).add({ ...data, ...metaForCreate(user) });
  return { id: ref.id, ...data, ...metaForCreate(user) };
}

export async function setRecord(collection, id, data, user, merge = true) {
  const payload = merge ? { ...data, ...metaForUpdate(user), hospitalId: HOSPITAL_ID } : { ...data, ...metaForCreate(user) };
  await docRef(collection, id).set(payload, { merge });
  return { id, ...payload };
}

export async function updateRecord(collection, id, data, user) {
  await docRef(collection, id).update({ ...data, ...metaForUpdate(user) });
  return { id, ...data };
}

export async function deleteRecord(collection, id, user, reason = 'Deleted from dashboard') {
  const oldData = await getItem(collection, id);
  await docRef(collection, id).delete();
  await createAuditLog({
    action: `Deleted ${mapCollection(collection)} record`,
    module: mapCollection(collection),
    recordId: id,
    reason,
    before: oldData || null,
  }, user);
}

export async function createAuditLog(data, user) {
  return addRecord('auditLogs', {
    ...data,
    actorId: user?.uid || user?.id || 'system',
    actorName: user?.name || user?.displayName || 'System',
    actorRole: user?.role || 'system',
  }, user || { id: 'system', name: 'System', role: 'system' });
}

export async function loginWithEmail(email, password) {
  const credential = await auth.signInWithEmailAndPassword(normalizeEmail(email), password);
  const user = credential.user;
  const profile = await getItem('users', user.uid);
  if (!profile || profile.status !== 'active') {
    await auth.signOut();
    throw new Error('Your account is not active in Bright Hospital HMS. Ask admin to activate it.');
  }
  await updateRecord('users', user.uid, { lastLoginAt: serverTime() }, { uid: user.uid, email: user.email, role: profile.role });
  return { ...profile, uid: user.uid, id: user.uid, email: user.email };
}

export async function loginStaff(email, password) {
  const profile = await loginWithEmail(email, password);
  if (profile.role === 'patient') {
    await auth.signOut();
    throw new Error('This is a patient account. Use Patient Portal login.');
  }
  return profile;
}

export async function getCurrentUserProfile(firebaseUser) {
  if (!firebaseUser) return null;
  const profile = await getItem('users', firebaseUser.uid);
  if (!profile || profile.status !== 'active') return null;
  return { ...profile, uid: firebaseUser.uid, id: firebaseUser.uid, email: firebaseUser.email };
}

export async function registerPatientAccount(data) {
  const name = cleanText(data.name);
  const email = normalizeEmail(data.email);
  const phone = cleanText(data.phone);
  const password = String(data.password || '');
  if (!name || !email || !phone || password.length < 6) throw new Error('Name, email, phone and 6 digit password are required');

  const credential = await auth.createUserWithEmailAndPassword(email, password);
  const firebaseUser = credential.user;
  await firebaseUser.updateProfile({ displayName: name });
  const patientCode = `BH-${new Date().getFullYear()}-${firebaseUser.uid.slice(0, 5).toUpperCase()}`;
  const baseUser = { uid: firebaseUser.uid, email, role: 'patient', name };

  await firestore.runTransaction(async (transaction) => {
    const userRef = docRef('users', firebaseUser.uid);
    const patientRef = docRef('patients', firebaseUser.uid);
    const meta = metaForCreate(baseUser);
    transaction.set(userRef, {
      name,
      email,
      phone,
      role: 'patient',
      status: 'active',
      patientId: firebaseUser.uid,
      hospitalId: HOSPITAL_ID,
      createdAt: meta.createdAt,
      updatedAt: meta.updatedAt,
      createdBy: firebaseUser.uid,
      updatedBy: firebaseUser.uid,
    });
    transaction.set(patientRef, {
      patientCode,
      patientUid: firebaseUser.uid,
      ownerUid: firebaseUser.uid,
      name,
      email,
      phone,
      age: cleanText(data.age),
      gender: data.gender || 'Unknown',
      bloodGroup: data.bloodGroup || 'Unknown',
      address: cleanText(data.address),
      emergencyContact: cleanText(data.emergencyContact),
      status: 'active',
      hospitalId: HOSPITAL_ID,
      createdAt: meta.createdAt,
      updatedAt: meta.updatedAt,
      createdBy: firebaseUser.uid,
      updatedBy: firebaseUser.uid,
    });
  });

  return getCurrentUserProfile(firebaseUser);
}

export async function createStaffUser(data, user) {
  const payload = {
    name: cleanText(data.name),
    email: normalizeEmail(data.email),
    phone: cleanText(data.phone),
    role: data.role || 'staff',
    department: cleanText(data.department),
    status: data.status || 'active',
    doctorId: data.doctorId || '',
    password: data.password || '123456',
  };
  if (!payload.name || !payload.email || !payload.role) throw new Error('Name, email and role are required');
  if (!payload.password || String(payload.password).length < 6) throw new Error('Password must be at least 6 characters');

  const result = await callBackend('createStaffUser')({ hospitalId: HOSPITAL_ID, ...payload });
  const created = result.data?.user || result.data || {};
  await createAuditLog({ action: `Created staff user ${payload.name}`, module: 'users', recordId: created.uid || created.id || payload.email }, user);
  return { id: created.uid || created.id, ...created };
}

export async function toggleUserStatus(userId, status, user) {
  try {
    await callBackend('toggleUserStatus')({ hospitalId: HOSPITAL_ID, uid: userId, status });
  } catch (error) {
    await updateRecord('users', userId, { status }, user);
  }
  await createAuditLog({ action: `Changed user status to ${status}`, module: 'users', recordId: userId }, user);
}

export async function createPatient(data, user) {
  const patients = await getList('patients');
  const now = new Date();
  const code = `BH-${now.getFullYear()}-${String(patients.length + 1).padStart(4, '0')}`;
  const payload = {
    patientCode: code,
    patientUid: data.patientUid || '',
    ownerUid: data.ownerUid || data.patientUid || '',
    name: cleanText(data.name),
    email: normalizeEmail(data.email),
    phone: cleanText(data.phone),
    age: cleanText(data.age),
    gender: data.gender || 'Unknown',
    bloodGroup: data.bloodGroup || 'Unknown',
    address: cleanText(data.address),
    emergencyContact: cleanText(data.emergencyContact),
    status: 'active',
    lastVisit: data.lastVisit || '',
  };
  if (!payload.name || !payload.phone) throw new Error('Patient name and phone are required');
  const created = await addRecord('patients', payload, user);
  await createAuditLog({ action: `Registered patient ${payload.patientCode}`, module: 'patients', recordId: created.id }, user);
  return created;
}

export async function updatePatient(patientId, data, user) {
  await updateRecord('patients', patientId, data, user);
  await createAuditLog({ action: 'Updated patient profile', module: 'patients', recordId: patientId }, user);
}

export async function createDoctor(data, user) {
  const doctorIdFromInitials = cleanText(data.initials);
  const doctorRef = doctorIdFromInitials ? colRef('doctors').doc(doctorIdFromInitials) : colRef('doctors').doc();
  const departmentId = data.departmentId || data.appointmentTypeId || makeIdFromText(data.department, 'general');
  const payload = {
    name: cleanText(data.name),
    nameEn: cleanText(data.nameEn || data.name),
    nameBn: cleanText(data.nameBn),
    email: normalizeEmail(data.email),
    phone: cleanText(data.phone),
    department: data.department || data.departmentName || 'General',
    departmentId,
    appointmentTypeId: data.appointmentTypeId || departmentId,
    initials: cleanText(data.initials) || cleanText(data.name).split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase(),
    specialization: cleanText(data.specialization),
    specializationEn: cleanText(data.specializationEn || data.specialization),
    specializationBn: cleanText(data.specializationBn),
    qualifications: cleanText(data.qualifications || data.degree),
    degree: cleanText(data.degree || data.qualifications),
    consultationFee: money(data.consultationFee),
    followUpFee: money(data.followUpFee),
    commissionType: data.commissionType || 'percentage',
    commissionValue: money(data.commissionValue),
    roomNo: cleanText(data.roomNo),
    schedule: cleanText(data.schedule),
    scheduleEn: cleanText(data.scheduleEn || data.schedule),
    scheduleBn: cleanText(data.scheduleBn),
    scheduleSlots: scheduleSlotsFromData(data),
    slotDays: cleanText(data.slotDays),
    slotTimes: cleanText(data.slotTimes),
    services: cleanText(data.services),
    servicesEn: cleanText(data.servicesEn || data.services),
    servicesBn: cleanText(data.servicesBn),
    servicesList: parseCsv(data.servicesList || data.services),
    status: data.status || 'active',
    publicVisible: data.publicVisible !== false,
    featured: data.featured === true || data.featured === 'true',
    imageUrl: cleanText(data.imageUrl),
    imageData: cleanText(data.imageData),
  };
  if (!payload.name || !payload.specialization) throw new Error('Doctor name and specialization are required');

  await doctorRef.set({ ...payload, ...metaForCreate(user) });

  if (payload.email && data.password) {
    await callBackend('createStaffUser')({
      hospitalId: HOSPITAL_ID,
      name: payload.name,
      email: payload.email,
      phone: payload.phone,
      role: 'doctor',
      department: payload.department,
      status: payload.status,
      password: data.password,
      doctorId: doctorRef.id,
    });
  }

  await createAuditLog({ action: `Added doctor ${payload.name}`, module: 'doctors', recordId: doctorRef.id }, user);
  return { id: doctorRef.id, ...payload };
}

export async function updateDoctor(doctorId, data, user) {
  await updateRecord('doctors', doctorId, data, user);
  await createAuditLog({ action: 'Updated doctor profile', module: 'doctors', recordId: doctorId }, user);
}

export async function uploadDoctorImage(file, doctorId) {
  if (!file) throw new Error('Choose a doctor image first');
  if (!file.type?.startsWith('image/')) throw new Error('Doctor photo must be an image file');
  if (file.size > 8 * 1024 * 1024) throw new Error('Doctor photo must be smaller than 8 MB');
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const safeDoctorId = cleanText(doctorId).replace(/[^a-zA-Z0-9_-]/g, '_') || `doctor_${Date.now()}`;
  const storagePath = `hospitals/${HOSPITAL_ID}/doctor-images/${safeDoctorId}/${Date.now()}_${safeName}`;
  const snapshot = await storage.ref(storagePath).put(file, { contentType: file.type });
  return { imageUrl: await snapshot.ref.getDownloadURL(), imageStoragePath: storagePath };
}

export async function createAppointment(data, user) {
  const patient = await ensureAppointmentPatient(data, user);
  const todayAppointments = (await getList('appointments')).filter((item) => item.date === data.date);
  const serialNo = String(todayAppointments.length + 1).padStart(3, '0');
  const patientUid = patient.patientUid || patient.ownerUid || '';
  const payload = {
    patientId: patient.id || data.patientId,
    patientUid,
    ownerUid: patientUid,
    patientName: patient.name || data.patientName || '',
    patientPhone: patient.phone || data.patientPhone || '',
    phone: patient.phoneKey || data.phone || data.patientPhone || '',
    phoneDisplay: patient.phoneDisplay || patient.phone || data.patientPhone || '',
    patientRegistered: Boolean(patientUid),
    doctorId: data.doctorId,
    doctorInitials: data.doctorInitials || '',
    doctorName: data.doctorName || '',
    department: data.department || '',
    departmentId: data.departmentId || data.appointmentTypeId || data.department || '',
    departmentName: data.departmentName || data.department || '',
    departmentNameBn: data.departmentNameBn || '',
    appointmentTypeId: data.appointmentTypeId || data.departmentId || data.department || '',
    date: data.date,
    time: data.time,
    appointmentDate: data.date,
    appointmentTime: data.time,
    reason: cleanText(data.reason),
    fee: money(data.fee),
    serialNo,
    source: data.source || 'admin_panel',
    bookingType: data.bookingType || 'admin',
    status: data.status || 'accepted',
    paymentStatus: data.paymentStatus || 'unpaid',
  };
  if (!payload.patientId || !payload.patientName || !payload.patientPhone || !payload.doctorId || !payload.date || !payload.time) {
    throw new Error('Patient name, phone, doctor, date and time are required');
  }
  const created = await addRecord('appointments', payload, user);
  await updateRecord('patients', payload.patientId, { lastVisit: payload.date }, user).catch(() => {});
  await createAuditLog({ action: `Created appointment serial ${serialNo}`, module: 'appointments', recordId: created.id }, user);
  return created;
}

export async function createPatientAppointment(data, user) {
  const doctor = await getItem('doctors', data.doctorId);
  if (!doctor) throw new Error('Doctor not found');
  const patient = await getItem('patients', user.uid);
  if (!patient) throw new Error('Patient profile not found');
  return createAppointment({
    patientId: user.uid,
    patientUid: user.uid,
    ownerUid: user.uid,
    patientName: patient.name || user.name,
    patientPhone: patient.phone || user.phone,
    doctorId: data.doctorId,
    doctorName: doctor.name,
    department: doctor.department || data.department || '',
    appointmentTypeId: data.appointmentTypeId || doctor.appointmentTypeId || doctor.department || '',
    date: data.date,
    time: data.time,
    reason: data.reason,
    fee: doctor.consultationFee || 0,
    status: 'requested',
    paymentStatus: 'unpaid',
  }, user);
}

export async function changeAppointmentStatus(appointmentId, status, user, extra = {}) {
  const payload = { status, ...extra };
  if (status === 'cancelled' || status === 'cancelled_by_patient') {
    payload.cancelledAt = serverTime();
    payload.cancelledBy = user?.uid || user?.id || user?.email;
  }
  if (status === 'completed') {
    payload.completedAt = serverTime();
    payload.completedBy = user?.uid || user?.id || user?.email;
  }
  await updateRecord('appointments', appointmentId, payload, user);
  await createAuditLog({ action: `Appointment status changed to ${status}`, module: 'appointments', recordId: appointmentId, reason: extra.cancelReason || '' }, user);
}

export async function cancelPatientAppointment(appointmentId, reason, user) {
  await changeAppointmentStatus(appointmentId, 'cancelled_by_patient', user, { cancelReason: cleanText(reason) || 'Cancelled by patient' });
}

export async function createInvoice(data, user) {
  const total = money(data.total ?? data.subtotal);
  const paid = money(data.paid);
  const due = Math.max(total - paid, 0);
  const payload = {
    patientId: data.patientId || '',
    patientUid: data.patientUid || data.ownerUid || '',
    ownerUid: data.ownerUid || data.patientUid || '',
    patientName: data.patientName || '',
    appointmentId: data.appointmentId || '',
    saleId: data.saleId || '',
    type: data.type || 'consultation',
    items: data.items || [],
    subtotal: money(data.subtotal ?? total),
    discount: money(data.discount),
    total,
    paid,
    due,
    paymentMethod: data.paymentMethod || 'cash',
    status: due <= 0 ? 'paid' : paid > 0 ? 'partial' : 'due',
  };
  const created = await addRecord('invoices', payload, user);
  await createAuditLog({ action: `Created ${payload.type} invoice`, module: 'accounts', recordId: created.id }, user);
  return created;
}

export async function updateInvoiceStatus(invoiceId, status, user, extra = {}) {
  await updateRecord('invoices', invoiceId, { status, ...extra }, user);
  await createAuditLog({ action: `Invoice status changed to ${status}`, module: 'accounts', recordId: invoiceId, reason: extra.reason || '' }, user);
}

export async function recordPayment(invoiceId, amount, paymentMethod, user) {
  const invoice = await getItem('invoices', invoiceId);
  if (!invoice) throw new Error('Invoice not found');
  const paid = money(invoice.paid) + money(amount);
  const due = Math.max(money(invoice.total) - paid, 0);
  await updateRecord('invoices', invoiceId, {
    paid,
    due,
    paymentMethod: paymentMethod || invoice.paymentMethod || 'cash',
    status: due <= 0 ? 'paid' : 'partial',
  }, user);
  await addRecord('payments', {
    invoiceId,
    patientId: invoice.patientId || '',
    patientUid: invoice.patientUid || invoice.ownerUid || '',
    ownerUid: invoice.ownerUid || invoice.patientUid || '',
    patientName: invoice.patientName || '',
    amount: money(amount),
    paymentMethod: paymentMethod || 'cash',
    type: invoice.type || 'payment',
  }, user);
  await createAuditLog({ action: `Recorded payment Tk ${money(amount)}`, module: 'accounts', recordId: invoiceId }, user);
}

export async function addExpense(data, user) {
  const payload = {
    title: cleanText(data.title),
    category: data.category || 'general',
    amount: money(data.amount),
    paymentMethod: data.paymentMethod || 'cash',
    note: cleanText(data.note),
    date: data.date || new Date().toISOString().slice(0, 10),
  };
  if (!payload.title || payload.amount <= 0) throw new Error('Expense title and amount are required');
  const created = await addRecord('expenses', payload, user);
  await createAuditLog({ action: `Added expense ${payload.title}`, module: 'accounts', recordId: created.id }, user);
  return created;
}

export async function addMedicine(data, user) {
  const payload = {
    name: cleanText(data.name),
    genericName: cleanText(data.genericName),
    category: data.category || 'General',
    supplier: cleanText(data.supplier),
    batchNo: cleanText(data.batchNo),
    expiryDate: data.expiryDate || '',
    purchasePrice: money(data.purchasePrice),
    salePrice: money(data.salePrice),
    stockQty: money(data.stockQty),
    lowStockLimit: money(data.lowStockLimit || 10),
    status: data.status || 'active',
  };
  if (!payload.name || payload.salePrice <= 0) throw new Error('Medicine name and sale price are required');
  const created = await addRecord('pharmacyMedicines', payload, user);
  await createAuditLog({ action: `Added medicine ${payload.name}`, module: 'pharmacy', recordId: created.id }, user);
  return created;
}

export async function updateMedicine(medicineId, data, user) {
  await updateRecord('pharmacyMedicines', medicineId, data, user);
  await createAuditLog({ action: 'Updated medicine stock/item', module: 'pharmacy', recordId: medicineId }, user);
}

export async function addPurchaseStock(medicineId, qty, user) {
  const medicine = await getItem('pharmacyMedicines', medicineId);
  if (!medicine) throw new Error('Medicine not found');
  const newQty = money(medicine.stockQty) + money(qty);
  await updateMedicine(medicineId, { stockQty: newQty }, user);
  await addRecord('pharmacyPurchases', {
    medicineId,
    medicineName: medicine.name,
    qty: money(qty),
    purchasePrice: money(medicine.purchasePrice),
    total: money(medicine.purchasePrice) * money(qty),
  }, user);
}

export async function createPharmacySale(data, user) {
  const items = (data.items || []).filter((item) => item.medicineId && money(item.qty) > 0);
  if (!items.length) throw new Error('Add at least one medicine');

  const saleRef = colRef('pharmacySales').doc();
  const invoiceRef = colRef('invoices').doc();
  let resultSale = null;

  await firestore.runTransaction(async (transaction) => {
    let subtotal = 0;
    const finalItems = [];
    const medicineDocs = [];

    for (const item of items) {
      const ref = docRef('pharmacyMedicines', item.medicineId);
      const snap = await transaction.get(ref);
      if (!snap.exists) throw new Error('Medicine not found');
      const medicine = { id: snap.id, ...snap.data() };
      const qty = money(item.qty);
      if (money(medicine.stockQty) < qty) throw new Error(`${medicine.name} stock is not enough`);
      const unitPrice = money(item.unitPrice || medicine.salePrice);
      const lineTotal = qty * unitPrice;
      subtotal += lineTotal;
      finalItems.push({ medicineId: item.medicineId, name: medicine.name, qty, unitPrice, total: lineTotal });
      medicineDocs.push({ ref, medicine, qty });
    }

    const discount = money(data.discount);
    const total = Math.max(subtotal - discount, 0);
    const paid = money(data.paid ?? total);
    const due = Math.max(total - paid, 0);
    const patientUid = data.patientUid || data.ownerUid || '';
    const common = {
      patientId: data.patientId || patientUid || '',
      patientUid,
      ownerUid: patientUid,
      patientName: data.patientName || 'Walk-in Patient',
      patientPhone: data.patientPhone || data.phone || '',
      items: finalItems,
      subtotal,
      discount,
      total,
      paid,
      due,
      paymentMethod: data.paymentMethod || 'cash',
      status: due <= 0 ? 'paid' : 'partial',
      ...metaForCreate(user),
    };

    medicineDocs.forEach(({ ref, medicine, qty }) => {
      transaction.update(ref, { stockQty: money(medicine.stockQty) - qty, ...metaForUpdate(user) });
    });
    transaction.set(saleRef, common);
    transaction.set(invoiceRef, { ...common, saleId: saleRef.id, type: 'pharmacy' });
    resultSale = { id: saleRef.id, ...common };
  });

  await createAuditLog({ action: `Created pharmacy sale Tk ${resultSale.total}`, module: 'pharmacy', recordId: saleRef.id }, user);
  return resultSale;
}

export async function addClinicalNote(data, user) {
  const payload = {
    patientId: data.patientId,
    patientUid: data.patientUid || data.ownerUid || '',
    ownerUid: data.ownerUid || data.patientUid || '',
    appointmentId: data.appointmentId || '',
    doctorId: data.doctorId || user?.doctorId || '',
    doctorName: data.doctorName || user?.name || '',
    symptoms: cleanText(data.symptoms),
    diagnosis: cleanText(data.diagnosis),
    prescription: cleanText(data.prescription),
    advice: cleanText(data.advice),
    followUpDate: data.followUpDate || '',
    status: 'active',
  };
  if (!payload.patientId || !payload.diagnosis) throw new Error('Patient and diagnosis are required');
  const created = await addRecord('clinicalNotes', payload, user);
  await createAuditLog({ action: `Added clinical note for patient`, module: 'clinicalNotes', recordId: created.id, patientId: payload.patientId }, user);
  return created;
}

export async function uploadPatientFile(file, data, user) {
  if (!file) throw new Error('Choose a file first');
  if (!data.patientId) throw new Error('Patient is required');
  const fileRef = colRef('patientFiles').doc();
  const patientUid = data.patientUid || data.ownerUid || data.patientId;
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const category = data.category || 'report';
  const baseFolder = category === 'prescription' ? 'prescriptions' : category === 'lab_report' ? 'lab-reports' : 'patient-files';
  const storagePath = `hospitals/${HOSPITAL_ID}/${baseFolder}/${patientUid}/${fileRef.id}_${safeName}`;
  const snapshot = await storage.ref(storagePath).put(file);
  const fileUrl = await snapshot.ref.getDownloadURL();
  const payload = {
    patientId: data.patientId,
    patientUid,
    ownerUid: patientUid,
    patientName: data.patientName || '',
    appointmentId: data.appointmentId || '',
    doctorId: data.doctorId || user?.doctorId || '',
    category,
    note: cleanText(data.note),
    fileName: file.name,
    fileType: file.type,
    fileSize: file.size,
    fileUrl,
    storagePath,
    status: 'active',
  };
  await fileRef.set({ ...payload, ...metaForCreate(user) });
  await createAuditLog({ action: `Uploaded ${payload.category} file`, module: 'patientFiles', recordId: fileRef.id, patientId: data.patientId }, user);
  return { id: fileRef.id, ...payload };
}

export async function saveSmsTemplate(templateId, data, user) {
  await setRecord('smsTemplates', templateId, data, user, true);
  await createAuditLog({ action: `Updated SMS template ${templateId}`, module: 'sms', recordId: templateId }, user);
}

export async function saveGatewaySettings(data, user) {
  await setRecord('settings', 'smsGateway', data, user, true);
  await createAuditLog({ action: 'Updated SMS gateway settings', module: 'sms' }, user);
}

export async function logSms(data, user) {
  return addRecord('smsLogs', {
    phone: cleanText(data.phone),
    message: cleanText(data.message),
    status: data.status || 'queued_for_backend',
    gateway: data.gateway || 'MiMSMS',
  }, user);
}

export async function addDepartment(data, user) {
  const id = makeIdFromText(data.id || data.nameEn || data.name, 'department');
  const payload = {
    name: cleanText(data.name || data.nameEn),
    nameEn: cleanText(data.nameEn || data.name),
    nameBn: cleanText(data.nameBn),
    status: data.status || 'active',
    order: Number(data.order || 0),
    publicVisible: data.publicVisible !== false,
  };
  if (!payload.nameEn) throw new Error('Department English name is required');
  await setRecord('departments', id, payload, user, true);
  await setRecord('appointmentTypes', id, {
    name: `${payload.nameEn} Consultation`,
    nameEn: `${payload.nameEn} Consultation`,
    nameBn: payload.nameBn,
    departmentId: id,
    department: payload.nameEn,
    status: payload.status,
  }, user, true);
  await createAuditLog({ action: `Saved department ${payload.nameEn}`, module: 'departments', recordId: id }, user);
  return { id, ...payload };
}

export async function updateDepartment(departmentId, data, user) {
  await updateRecord('departments', departmentId, data, user);
  await createAuditLog({ action: 'Updated department', module: 'departments', recordId: departmentId }, user);
}

export async function addMachine(data, user) {
  const payload = {
    name: cleanText(data.name),
    category: cleanText(data.category),
    departmentId: data.departmentId || makeIdFromText(data.department, 'general'),
    department: cleanText(data.department),
    serialNo: cleanText(data.serialNo),
    condition: data.condition || 'perfect',
    purchasePrice: money(data.purchasePrice),
    currentValue: money(data.currentValue),
    estimatedRepairCost: money(data.estimatedRepairCost),
    location: cleanText(data.location),
    vendor: cleanText(data.vendor),
    lastServiceDate: data.lastServiceDate || '',
    nextServiceDate: data.nextServiceDate || '',
    imageUrl: cleanText(data.imageUrl),
    imageData: cleanText(data.imageData),
    notes: cleanText(data.notes),
    status: data.status || 'active',
  };
  if (!payload.name) throw new Error('Machine name is required');
  const created = await addRecord('machines', payload, user);
  await createAuditLog({ action: `Added machine ${payload.name}`, module: 'machines', recordId: created.id }, user);
  return created;
}

export async function updateMachine(machineId, data, user) {
  await updateRecord('machines', machineId, data, user);
  await createAuditLog({ action: 'Updated machine', module: 'machines', recordId: machineId }, user);
}

export async function addLabRequest(data, user) {
  const payload = {
    patientId: data.patientId || '',
    patientUid: data.patientUid || data.ownerUid || '',
    ownerUid: data.ownerUid || data.patientUid || '',
    patientName: cleanText(data.patientName),
    testName: cleanText(data.testName),
    doctorName: cleanText(data.doctorName),
    status: data.status || 'requested',
    note: cleanText(data.note),
    requestedDate: data.requestedDate || new Date().toISOString().slice(0, 10),
  };
  if (!payload.patientName || !payload.testName) throw new Error('Patient name and test name are required');
  const created = await addRecord('labRequests', payload, user);
  await createAuditLog({ action: `Created lab request ${payload.testName}`, module: 'lab', recordId: created.id }, user);
  return created;
}

export async function addLabReport(data, user) {
  const payload = {
    requestId: data.requestId || '',
    patientId: data.patientId || '',
    patientUid: data.patientUid || data.ownerUid || '',
    ownerUid: data.ownerUid || data.patientUid || '',
    patientName: cleanText(data.patientName),
    testName: cleanText(data.testName),
    resultSummary: cleanText(data.resultSummary),
    fileUrl: cleanText(data.fileUrl),
    fileData: cleanText(data.fileData),
    status: data.status || 'ready',
    reportDate: data.reportDate || new Date().toISOString().slice(0, 10),
  };
  if (!payload.patientName || !payload.testName) throw new Error('Patient name and test name are required');
  const created = await addRecord('labReports', payload, user);
  if (payload.requestId) await updateRecord('labRequests', payload.requestId, { status: 'reported' }, user).catch(() => {});
  await createAuditLog({ action: `Uploaded lab report ${payload.testName}`, module: 'lab', recordId: created.id }, user);
  return created;
}

export async function seedSamplePharmacyItems(user) {
  const { sampleMedicines } = await import('../data/hospitalOptions.js');
  const batch = firestore.batch();
  const base = metaForCreate(user);
  sampleMedicines.forEach((medicine) => {
    batch.set(docRef('pharmacyMedicines', makeIdFromText(medicine.name, 'medicine')), { ...medicine, ...base }, { merge: true });
  });
  await batch.commit();
  await createAuditLog({ action: 'Seeded sample pharmacy medicines', module: 'pharmacy' }, user);
}

export async function seedSampleMachines(user) {
  const { sampleMachines } = await import('../data/hospitalOptions.js');
  const batch = firestore.batch();
  const base = metaForCreate(user);
  sampleMachines.forEach((machine) => {
    batch.set(docRef('machines', makeIdFromText(machine.serialNo || machine.name, 'machine')), { ...machine, ...base }, { merge: true });
  });
  await batch.commit();
  await createAuditLog({ action: 'Seeded sample hospital machines', module: 'machines' }, user);
}

export async function seedHospitalBasics(user) {
  const now = serverTime();
  const base = { hospitalId: HOSPITAL_ID, createdAt: now, updatedAt: now, createdBy: user?.uid || 'seed', updatedBy: user?.uid || 'seed' };
  const batch = firestore.batch();
  const departments = {
    medicine: { name: 'Medicine', nameEn: 'Medicine', nameBn: 'মেডিসিন', status: 'active', order: 1 },
    ent: { name: 'ENT / Head-Neck', nameEn: 'ENT / Head-Neck', nameBn: 'নাক, কান, গলা / হেড-নেক', status: 'active', order: 2 },
    surgery: { name: 'Surgery', nameEn: 'Surgery', nameBn: 'সার্জারি', status: 'active', order: 3 },
    gynecology: { name: 'Gynecology & Obstetrics', nameEn: 'Gynecology & Obstetrics', nameBn: 'প্রসূতি ও গাইনি', status: 'active', order: 4 },
    pediatrics: { name: 'Child & Adolescent', nameEn: 'Child & Adolescent', nameBn: 'শিশু ও কিশোর', status: 'active', order: 5 },
    skin: { name: 'Skin & Allergy', nameEn: 'Skin & Allergy', nameBn: 'চর্ম ও এলার্জি', status: 'active', order: 6 },
    orthopedic: { name: 'Orthopedic / Trauma', nameEn: 'Orthopedic / Trauma', nameBn: 'অর্থোপেডিক / ট্রমা', status: 'active', order: 7 },
    neuro: { name: 'Neuro / Rehabilitation', nameEn: 'Neuro / Rehabilitation', nameBn: 'নিউরো / রিহ্যাবিলিটেশন', status: 'active', order: 8 },
    cardiology: { name: 'Cardiology', nameEn: 'Cardiology', nameBn: 'হৃদরোগ', status: 'active', order: 9 },
    diagnostics: { name: 'Diagnostics', nameEn: 'Diagnostics', nameBn: 'ডায়াগনস্টিকস', status: 'active', order: 10 },
  };
  const appointmentTypes = Object.fromEntries(Object.entries(departments).map(([id, department]) => [id, {
    name: `${department.nameEn} Consultation`,
    nameEn: `${department.nameEn} Consultation`,
    nameBn: department.nameBn,
    departmentId: id,
    department: department.nameEn,
    status: department.status,
  }]));
  const templates = {
    appointment_created: {
      name: 'Appointment Created',
      trigger: 'When staff/patient creates appointment',
      status: 'active',
      body: 'Dear {patientName}, your appointment request at {hospitalName} with Dr. {doctorName} is for {date} at {time}. Serial: {serialNo}.',
    },
    appointment_cancelled: {
      name: 'Appointment Cancelled',
      trigger: 'When appointment is cancelled',
      status: 'active',
      body: 'Dear {patientName}, your appointment at {hospitalName} on {date} has been cancelled. Reason: {reason}.',
    },
    payment_received: {
      name: 'Payment Received',
      trigger: 'When payment is collected',
      status: 'active',
      body: 'Dear {patientName}, Bright Hospital received Tk {amount}. Due: Tk {due}. Thank you.',
    },
    report_ready: {
      name: 'Report Ready',
      trigger: 'When report/file is uploaded',
      status: 'active',
      body: 'Dear {patientName}, your report is ready at Bright Hospital. Please check your portal or collect it from counter.',
    },
  };

  Object.entries(departments).forEach(([id, item]) => batch.set(docRef('departments', id), { ...item, ...base }, { merge: true }));
  Object.entries(appointmentTypes).forEach(([id, item]) => batch.set(docRef('appointmentTypes', id), { ...item, ...base }, { merge: true }));
  Object.entries(templates).forEach(([id, item]) => batch.set(docRef('smsTemplates', id), { ...item, ...base }, { merge: true }));
  batch.set(docRef('settings', 'hospital'), { name: 'Bright Hospital', phone: '01700000000', address: 'Bangladesh', status: 'active', ...base }, { merge: true });
  batch.set(docRef('settings', 'smsGateway'), { gatewayName: 'MiMSMS Non-Masking', senderType: 'non_masking', endpoint: '/api/sms/send', status: 'backend_required', ...base }, { merge: true });
  await batch.commit();
  await createAuditLog({ action: 'Seeded hospital departments, appointment types and SMS templates', module: 'system' }, user);
}
