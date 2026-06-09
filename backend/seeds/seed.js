'use strict';
/**
 * seeds/seed.js — NIHMS Complete Database Seed
 * ─────────────────────────────────────────────────────────
 * Populates:
 *   - 10 SA health facilities across provinces
 *   - 12 users  (admin, 3 doctors, 2 nurses, 2 pharmacists, 4 patients)
 *   - 8  patients with full medical histories
 *   - 25 medications (SA EDL-aligned)
 *   - 20 appointments (mix of statuses & types)
 *   - 12 lab orders with results
 *   - 8  prescriptions
 *
 * Usage:
 *   node seeds/seed.js          — seed (skips existing records)
 *   node seeds/seed.js --clear  — wipe everything first, then seed
 *   node seeds/seed.js --fresh  — same as --clear
 * ─────────────────────────────────────────────────────────
 */

require('dotenv').config();
const mongoose = require('mongoose');

if (!process.env.MONGO_URI || process.env.MONGO_URI.includes('YOUR_')) {
  console.error('\n❌  MONGO_URI not set in .env\n');
  process.exit(1);
}

const CLEAR = process.argv.includes('--clear') || process.argv.includes('--fresh');

/* ─── helpers ─── */
const daysAgo   = n => new Date(Date.now() - n * 864e5);
const daysAhead = n => new Date(Date.now() + n * 864e5);
const atTime    = (date, h, m = 0) => { const d = new Date(date); d.setHours(h, m, 0, 0); return d; };

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('\n🌱  NIHMS Seeder connected to MongoDB\n');

  const User        = require('../models/User');
  const Patient     = require('../models/Patient');
  const { Facility, Appointment, Medication, Prescription, LabOrder } = require('../models/index');

  if (CLEAR) {
    await Promise.all([
      User.deleteMany({}), Patient.deleteMany({}),
      Facility.deleteMany({}), Medication.deleteMany({}),
      Appointment.deleteMany({}), Prescription.deleteMany({}),
      LabOrder.deleteMany({})
    ]);
    console.log('🗑   All collections cleared\n');
  }

  /* ════════════════════════════════════════
     1. FACILITIES
  ════════════════════════════════════════ */
  console.log('📍  Seeding facilities…');
  const facData = [
    { name:'Johannesburg CHC',            type:'CHC',      province:'Gauteng',       address:'1 Main Rd, Johannesburg 2000',            phone:'011 000 1001', isOnline:true  },
    { name:'Soweto Clinic',               type:'clinic',   province:'Gauteng',       address:'5 Kliptown Ave, Soweto 1804',              phone:'011 000 1002', isOnline:true  },
    { name:'Helen Joseph Hospital',       type:'regional', province:'Gauteng',       address:'14 Perth Rd, Auckland Park 2092',          phone:'011 489 1011', isOnline:true  },
    { name:'Chris Hani Baragwanath CHC',  type:'CHC',      province:'Gauteng',       address:'26 Chris Hani Rd, Diepkloof 1864',         phone:'011 933 8000', isOnline:true  },
    { name:'Thohoyandou CHC',             type:'CHC',      province:'Limpopo',       address:'Hospital St, Thohoyandou 0950',            phone:'015 000 2001', isOnline:true  },
    { name:'Bela-Bela Clinic',            type:'clinic',   province:'Limpopo',       address:'Warmbaths, Bela-Bela 0480',               phone:'014 000 2002', isOnline:false },
    { name:'Durban Central Clinic',       type:'clinic',   province:'KwaZulu-Natal', address:'391 Anton Lembede St, Durban 4001',        phone:'031 000 3001', isOnline:true  },
    { name:'King Edward VIII Hospital',   type:'regional', province:'KwaZulu-Natal', address:'Gate 3, Umbilo Rd, Durban 4001',           phone:'031 360 3111', isOnline:true  },
    { name:'Mitchell\'s Plain CHC',       type:'CHC',      province:'Western Cape',  address:'Merrydale Ave, Mitchell\'s Plain 7785',    phone:'021 000 4001', isOnline:true  },
    { name:'Khayelitsha District Hospital',type:'district',province:'Western Cape',  address:'Walter Sisulu Dr, Khayelitsha 7784',       phone:'021 360 5100', isOnline:true  },
  ];

  const facs = [];
  for (const f of facData) {
    const doc = await Facility.findOneAndUpdate({ name:f.name }, { $setOnInsert:f }, { upsert:true, new:true });
    facs.push(doc);
  }
  const [jhb, soweto, helenJoseph, bara, thoho, belaBela, durban, kingEdward, mitchells, khaye] = facs;
  console.log(`   ✔ ${facs.length} facilities ready`);

  /* ════════════════════════════════════════
     2. USERS
  ════════════════════════════════════════ */
  console.log('👤  Seeding users…');
  const userData = [
    // Admin
    { firstName:'Admin',       lastName:'NIHMS',      email:'admin@nihms.gov.za',       password:'Demo@1234', role:'admin',    facility:jhb._id,        facilityName:'National NIHMS',           nationalId:'7001015009087', phone:'+27110001000', gender:'male',   emailVerified:true, isVerified:true },
    // Doctors
    { firstName:'Sipho',       lastName:'Molefe',     email:'doctor@nihms.gov.za',      password:'Demo@1234', role:'doctor',   facility:jhb._id,        facilityName:'Johannesburg CHC',         nationalId:'6505125008087', phone:'+27820001001', gender:'male',   emailVerified:true, isVerified:true },
    { firstName:'Priya',       lastName:'Naidoo',     email:'drpriya@nihms.gov.za',     password:'Demo@1234', role:'doctor',   facility:helenJoseph._id,facilityName:'Helen Joseph Hospital',     nationalId:'7803045009087', phone:'+27820001002', gender:'female', emailVerified:true, isVerified:true },
    { firstName:'Andile',      lastName:'Zulu',       email:'drzulu@nihms.gov.za',      password:'Demo@1234', role:'doctor',   facility:bara._id,       facilityName:'Chris Hani Baragwanath',   nationalId:'7204075011087', phone:'+27820001003', gender:'male',   emailVerified:true, isVerified:true },
    // Nurses
    { firstName:'Ayanda',      lastName:'Nkosi',      email:'nurse@nihms.gov.za',       password:'Demo@1234', role:'nurse',    facility:jhb._id,        facilityName:'Johannesburg CHC',         nationalId:'8502115014087', phone:'+27820002001', gender:'female', emailVerified:true, isVerified:true },
    { firstName:'Lungile',     lastName:'Dube',       email:'nursedube@nihms.gov.za',   password:'Demo@1234', role:'nurse',    facility:soweto._id,     facilityName:'Soweto Clinic',            nationalId:'9006025016087', phone:'+27820002002', gender:'female', emailVerified:true, isVerified:true },
    // Pharmacists
    { firstName:'Sandile',     lastName:'Mahlangu',   email:'pharmacy@nihms.gov.za',    password:'Demo@1234', role:'pharmacy', facility:jhb._id,        facilityName:'Johannesburg CHC',         nationalId:'8304085009087', phone:'+27820003001', gender:'male',   emailVerified:true, isVerified:true },
    { firstName:'Fatima',      lastName:'Patel',      email:'fpatel@nihms.gov.za',      password:'Demo@1234', role:'pharmacy', facility:helenJoseph._id,facilityName:'Helen Joseph Hospital',     nationalId:'8807095012087', phone:'+27820003002', gender:'female', emailVerified:true, isVerified:true },
    // Patients
    { firstName:'Nomsa',       lastName:'Dlamini',    email:'patient@nihms.gov.za',     password:'Demo@1234', role:'patient',  facility:jhb._id,        facilityName:'Johannesburg CHC',         nationalId:'8203041234083', phone:'+27820000001', gender:'female', emailVerified:true, isVerified:true },
    { firstName:'Lerato',      lastName:'Mokoena',    email:'lerato@nihms.gov.za',      password:'Demo@1234', role:'patient',  facility:soweto._id,     facilityName:'Soweto Clinic',            nationalId:'9504152345086', phone:'+27820000002', gender:'female', emailVerified:true, isVerified:true },
    { firstName:'Thabo',       lastName:'Sithole',    email:'thabo@nihms.gov.za',       password:'Demo@1234', role:'patient',  facility:bara._id,       facilityName:'Chris Hani Baragwanath',   nationalId:'8812150011083', phone:'+27820000003', gender:'male',   emailVerified:true, isVerified:true },
    { firstName:'Siphamandla', lastName:'Mthembu',    email:'sipham@nihms.gov.za',      password:'Demo@1234', role:'patient',  facility:durban._id,     facilityName:'Durban Central Clinic',    nationalId:'9101180023087', phone:'+27820000004', gender:'male',   emailVerified:true, isVerified:true },
  ];

  const users = {};
  for (const u of userData) {
    let doc = await User.findOne({ email:u.email });
    if (!doc) doc = await User.create(u);
    users[u.email] = doc;
  }
  const doctor    = users['doctor@nihms.gov.za'];
  const drPriya   = users['drpriya@nihms.gov.za'];
  const drZulu    = users['drzulu@nihms.gov.za'];
  const patNomsa  = users['patient@nihms.gov.za'];
  const patLerato = users['lerato@nihms.gov.za'];
  const patThabo  = users['thabo@nihms.gov.za'];
  const patSipham = users['sipham@nihms.gov.za'];
  console.log(`   ✔ ${Object.keys(users).length} users ready`);

  /* ════════════════════════════════════════
     3. PATIENTS
  ════════════════════════════════════════ */
  console.log('🧑‍⚕️  Seeding patients…');
  const patientData = [
    {
      user:patNomsa._id, firstName:'Nomsa', lastName:'Dlamini', fullName:'Nomsa Dlamini',
      nationalId:'8203041234083', dateOfBirth:new Date('1982-03-04'), age:44, gender:'female',
      bloodType:'O+', phone:'+27820000001', email:'patient@nihms.gov.za',
      address:{ street:'12 Soweto St', suburb:'Soweto', city:'Johannesburg', province:'Gauteng', postalCode:'1804' },
      nextOfKin:{ name:'Thandi Dlamini', relationship:'Sister', phone:'+27720001001' },
      medicalAid:{ hasAid:true, provider:'Discovery Health', memberNumber:'DH1234567', plan:'Essential', dependantCode:'00', mainMember:'Nomsa Dlamini' },
      allergies:['Penicillin'],
      conditions:[
        { icd10Code:'I10', name:'Essential hypertension',     status:'active',   diagnosedBy:doctor._id },
        { icd10Code:'E11', name:'Type 2 diabetes mellitus',   status:'monitored',diagnosedBy:doctor._id },
      ],
      latestVitals:{ bp:{ systolic:148, diastolic:94 }, heartRate:88, temperature:36.8, spO2:98, weight:72, height:165, bmi:26.4 },
      primaryFacility:jhb._id, registeredBy:doctor._id, mrn:'MRN-000001', isVerified:true
    },
    {
      user:patLerato._id, firstName:'Lerato', lastName:'Mokoena', fullName:'Lerato Mokoena',
      nationalId:'9504152345086', dateOfBirth:new Date('1995-04-15'), age:31, gender:'female',
      bloodType:'A+', phone:'+27820000002', email:'lerato@nihms.gov.za',
      address:{ street:'45 Kliptown Rd', suburb:'Kliptown', city:'Johannesburg', province:'Gauteng', postalCode:'1811' },
      nextOfKin:{ name:'David Mokoena', relationship:'Father', phone:'+27820009002' },
      medicalAid:{ hasAid:false },
      allergies:[],
      conditions:[
        { icd10Code:'B20', name:'HIV disease (on ARVs)',       status:'chronic',  diagnosedBy:drPriya._id },
      ],
      latestVitals:{ bp:{ systolic:118, diastolic:76 }, heartRate:72, temperature:36.6, spO2:99, weight:58, height:162, bmi:22.1 },
      primaryFacility:soweto._id, registeredBy:drPriya._id, mrn:'MRN-000002', isVerified:true
    },
    {
      user:patThabo._id, firstName:'Thabo', lastName:'Sithole', fullName:'Thabo Sithole',
      nationalId:'8812150011083', dateOfBirth:new Date('1988-12-15'), age:37, gender:'male',
      bloodType:'B+', phone:'+27820000003', email:'thabo@nihms.gov.za',
      address:{ street:'7 Mamelodi Ave', suburb:'Mamelodi East', city:'Pretoria', province:'Gauteng', postalCode:'0122' },
      nextOfKin:{ name:'Zanele Sithole', relationship:'Spouse', phone:'+27820009003' },
      medicalAid:{ hasAid:false },
      allergies:['Sulfonamides'],
      conditions:[
        { icd10Code:'A15', name:'Pulmonary tuberculosis (DOTS)', status:'active', diagnosedBy:drZulu._id },
      ],
      latestVitals:{ bp:{ systolic:122, diastolic:80 }, heartRate:80, temperature:37.3, spO2:96, weight:65, height:172, bmi:22.0 },
      primaryFacility:bara._id, registeredBy:drZulu._id, mrn:'MRN-000003', isVerified:true
    },
    {
      user:patSipham._id, firstName:'Siphamandla', lastName:'Mthembu', fullName:'Siphamandla Mthembu',
      nationalId:'9101180023087', dateOfBirth:new Date('1991-01-18'), age:35, gender:'male',
      bloodType:'AB+', phone:'+27820000004', email:'sipham@nihms.gov.za',
      address:{ street:'22 Umlazi Rd', suburb:'Umlazi', city:'Durban', province:'KwaZulu-Natal', postalCode:'4066' },
      nextOfKin:{ name:'Bongiwe Mthembu', relationship:'Mother', phone:'+27820009004' },
      medicalAid:{ hasAid:true, provider:'Bonitas', memberNumber:'BON9876543', plan:'Primary', dependantCode:'00', mainMember:'Siphamandla Mthembu' },
      allergies:['Aspirin'],
      conditions:[
        { icd10Code:'J45', name:'Asthma',                      status:'chronic',  diagnosedBy:drPriya._id },
        { icd10Code:'K21', name:'Gastro-oesophageal reflux',   status:'monitored',diagnosedBy:drPriya._id },
      ],
      latestVitals:{ bp:{ systolic:125, diastolic:82 }, heartRate:76, temperature:36.7, spO2:97, weight:80, height:176, bmi:25.8 },
      primaryFacility:durban._id, registeredBy:drPriya._id, mrn:'MRN-000004', isVerified:true
    },
    // Extra patients (no user account — walk-ins / registered by staff)
    {
      firstName:'Sipho', lastName:'Nkosi', fullName:'Sipho Nkosi',
      nationalId:'5607120987083', dateOfBirth:new Date('1956-07-12'), age:69, gender:'male',
      bloodType:'A+', phone:'+27820000005',
      address:{ street:'45 Alex Rd', suburb:'Alexandra', city:'Johannesburg', province:'Gauteng', postalCode:'2090' },
      nextOfKin:{ name:'Winnie Nkosi', relationship:'Spouse', phone:'+27820009005' },
      medicalAid:{ hasAid:false },
      allergies:[],
      conditions:[
        { icd10Code:'I10', name:'Hypertension',    status:'active',   diagnosedBy:doctor._id },
        { icd10Code:'I25', name:'Ischaemic heart disease', status:'monitored', diagnosedBy:doctor._id },
      ],
      latestVitals:{ bp:{ systolic:162, diastolic:102 }, heartRate:94, temperature:36.5, spO2:97, weight:88, height:178, bmi:27.8 },
      primaryFacility:jhb._id, registeredBy:doctor._id, mrn:'MRN-000005', isVerified:true
    },
    {
      firstName:'Naledi', lastName:'Khumalo', fullName:'Naledi Khumalo',
      nationalId:'9908204321086', dateOfBirth:new Date('1999-08-20'), age:26, gender:'female',
      bloodType:'O-', phone:'+27820000006',
      address:{ street:'3 Diepsloot Rd', suburb:'Diepsloot', city:'Johannesburg', province:'Gauteng', postalCode:'2189' },
      nextOfKin:{ name:'Maria Khumalo', relationship:'Mother', phone:'+27820009006' },
      medicalAid:{ hasAid:false },
      allergies:[],
      conditions:[
        { icd10Code:'F32', name:'Depressive episode',  status:'active', diagnosedBy:drPriya._id },
      ],
      latestVitals:{ bp:{ systolic:110, diastolic:70 }, heartRate:68, temperature:36.4, spO2:100, weight:55, height:160, bmi:21.5 },
      primaryFacility:soweto._id, registeredBy:drPriya._id, mrn:'MRN-000006', isVerified:false
    },
    {
      firstName:'Thabiso', lastName:'Molapo', fullName:'Thabiso Molapo',
      nationalId:'7805145678089', dateOfBirth:new Date('1978-05-14'), age:48, gender:'male',
      bloodType:'B-', phone:'+27820000007',
      address:{ street:'9 Tembisa Rd', suburb:'Tembisa', city:'Ekurhuleni', province:'Gauteng', postalCode:'1632' },
      nextOfKin:{ name:'Grace Molapo', relationship:'Spouse', phone:'+27820009007' },
      medicalAid:{ hasAid:true, provider:'Gems (Government)', memberNumber:'GEM12345', plan:'Emerald', dependantCode:'01' },
      allergies:['Codeine'],
      conditions:[
        { icd10Code:'E11', name:'Type 2 diabetes',        status:'active',   diagnosedBy:drZulu._id },
        { icd10Code:'I10', name:'Hypertension',            status:'active',   diagnosedBy:drZulu._id },
        { icd10Code:'N18', name:'Chronic kidney disease stage 3', status:'monitored', diagnosedBy:drZulu._id },
      ],
      latestVitals:{ bp:{ systolic:156, diastolic:98 }, heartRate:86, temperature:36.9, spO2:96, weight:95, height:174, bmi:31.4 },
      primaryFacility:bara._id, registeredBy:drZulu._id, mrn:'MRN-000007', isVerified:true
    },
    {
      firstName:'Precious', lastName:'Dube', fullName:'Precious Dube',
      nationalId:'8705286543082', dateOfBirth:new Date('1987-05-28'), age:39, gender:'female',
      bloodType:'A-', phone:'+27820000008',
      address:{ street:'14 Katlehong St', suburb:'Katlehong', city:'Ekurhuleni', province:'Gauteng', postalCode:'1832' },
      nextOfKin:{ name:'John Dube', relationship:'Spouse', phone:'+27820009008' },
      medicalAid:{ hasAid:false },
      allergies:[],
      conditions:[
        { icd10Code:'O26', name:'Pregnancy — 28 weeks', status:'active', diagnosedBy:drPriya._id },
      ],
      latestVitals:{ bp:{ systolic:116, diastolic:74 }, heartRate:82, temperature:36.6, spO2:99, weight:74, height:163, bmi:27.9 },
      primaryFacility:helenJoseph._id, registeredBy:drPriya._id, mrn:'MRN-000008', isVerified:true
    },
  ];

  let pCreated = 0, pSkipped = 0;
  const patients = {};
  for (const p of patientData) {
    const existing = await Patient.findOne({ nationalId:p.nationalId });
    if (existing) { patients[p.nationalId] = existing; pSkipped++; continue; }
    const doc = await Patient.create(p);
    patients[p.nationalId] = doc;
    pCreated++;
  }
  const pNomsa  = patients['8203041234083'];
  const pLerato = patients['9504152345086'];
  const pThabo  = patients['8812150011083'];
  const pSipham = patients['9101180023087'];
  const pSipho  = patients['5607120987083'];
  const pThabiso= patients['7805145678089'];
  const pPrecious=patients['8705286543082'];
  console.log(`   ✔ ${pCreated} patients created, ${pSkipped} already existed`);

  /* ════════════════════════════════════════
     4. MEDICATIONS (SA EDL-aligned)
  ════════════════════════════════════════ */
  console.log('💊  Seeding medications…');
  const medData = [
    // Hypertension
    { name:'Amlodipine',             genericName:'Amlodipine Besylate',      strength:'5mg',      form:'tablet',  facility:jhb._id, stockQty:890,  reorderLevel:150, maxStock:1500, unitPrice:1.20,  category:'Cardiovascular' },
    { name:'Hydrochlorothiazide',    genericName:'HCTZ',                     strength:'25mg',     form:'tablet',  facility:jhb._id, stockQty:720,  reorderLevel:100, maxStock:1200, unitPrice:0.80,  category:'Cardiovascular' },
    { name:'Enalapril',              genericName:'Enalapril Maleate',         strength:'10mg',     form:'tablet',  facility:jhb._id, stockQty:560,  reorderLevel:100, maxStock:1000, unitPrice:1.50,  category:'Cardiovascular' },
    { name:'Atenolol',               genericName:'Atenolol',                  strength:'50mg',     form:'tablet',  facility:jhb._id, stockQty:420,  reorderLevel:80,  maxStock:800,  unitPrice:1.10,  category:'Cardiovascular' },
    // Diabetes
    { name:'Metformin',              genericName:'Metformin HCl',             strength:'850mg',    form:'tablet',  facility:jhb._id, stockQty:1240, reorderLevel:200, maxStock:2000, unitPrice:0.90,  category:'Endocrine' },
    { name:'Glibenclamide',          genericName:'Glibenclamide',             strength:'5mg',      form:'tablet',  facility:jhb._id, stockQty:340,  reorderLevel:60,  maxStock:600,  unitPrice:1.30,  category:'Endocrine' },
    // Cholesterol
    { name:'Atorvastatin',           genericName:'Atorvastatin Calcium',      strength:'40mg',     form:'tablet',  facility:jhb._id, stockQty:430,  reorderLevel:100, maxStock:1000, unitPrice:2.10,  category:'Cardiovascular' },
    // TB DOTS
    { name:'Rifampicin',             genericName:'Rifampicin',                strength:'600mg',    form:'tablet',  facility:jhb._id, stockQty:95,   reorderLevel:60,  maxStock:300,  unitPrice:4.50,  category:'Antimicrobial' },
    { name:'Isoniazid',              genericName:'Isoniazid',                 strength:'300mg',    form:'tablet',  facility:jhb._id, stockQty:88,   reorderLevel:60,  maxStock:300,  unitPrice:2.20,  category:'Antimicrobial' },
    { name:'Pyrazinamide',           genericName:'Pyrazinamide',              strength:'500mg',    form:'tablet',  facility:jhb._id, stockQty:72,   reorderLevel:40,  maxStock:200,  unitPrice:3.10,  category:'Antimicrobial' },
    { name:'Ethambutol',             genericName:'Ethambutol HCl',            strength:'400mg',    form:'tablet',  facility:jhb._id, stockQty:65,   reorderLevel:40,  maxStock:200,  unitPrice:2.80,  category:'Antimicrobial' },
    // ARVs
    { name:'Dolutegravir',           genericName:'Dolutegravir',              strength:'50mg',     form:'tablet',  facility:jhb._id, stockQty:312,  reorderLevel:100, maxStock:600,  unitPrice:8.50,  category:'Antiretroviral' },
    { name:'Tenofovir/Emtricitabine',genericName:'TDF/FTC',                   strength:'300/200mg',form:'tablet',  facility:jhb._id, stockQty:289,  reorderLevel:80,  maxStock:500,  unitPrice:12.00, category:'Antiretroviral' },
    { name:'Lamivudine',             genericName:'Lamivudine 3TC',            strength:'150mg',    form:'tablet',  facility:jhb._id, stockQty:180,  reorderLevel:60,  maxStock:400,  unitPrice:6.00,  category:'Antiretroviral' },
    // Analgesics & Antibiotics
    { name:'Paracetamol',            genericName:'Paracetamol',               strength:'500mg',    form:'tablet',  facility:jhb._id, stockQty:2100, reorderLevel:300, maxStock:3000, unitPrice:0.40,  category:'Analgesic' },
    { name:'Ibuprofen',              genericName:'Ibuprofen',                 strength:'400mg',    form:'tablet',  facility:jhb._id, stockQty:890,  reorderLevel:150, maxStock:1500, unitPrice:0.70,  category:'Analgesic' },
    { name:'Amoxicillin',            genericName:'Amoxicillin',               strength:'500mg',    form:'capsule', facility:jhb._id, stockQty:8,    reorderLevel:100, maxStock:500,  unitPrice:1.80,  category:'Antimicrobial' },
    { name:'Doxycycline',            genericName:'Doxycycline HCl',           strength:'100mg',    form:'capsule', facility:jhb._id, stockQty:210,  reorderLevel:50,  maxStock:400,  unitPrice:2.30,  category:'Antimicrobial' },
    // Mental health
    { name:'Fluoxetine',             genericName:'Fluoxetine HCl',            strength:'20mg',     form:'capsule', facility:jhb._id, stockQty:144,  reorderLevel:40,  maxStock:300,  unitPrice:3.50,  category:'Psychiatric' },
    { name:'Amitriptyline',          genericName:'Amitriptyline HCl',         strength:'25mg',     form:'tablet',  facility:jhb._id, stockQty:198,  reorderLevel:40,  maxStock:350,  unitPrice:2.40,  category:'Psychiatric' },
    // Respiratory
    { name:'Salbutamol Inhaler',     genericName:'Salbutamol Sulphate',       strength:'100mcg',   form:'inhaler', facility:jhb._id, stockQty:86,   reorderLevel:30,  maxStock:200,  unitPrice:28.00, category:'Respiratory' },
    { name:'Beclomethasone Inhaler', genericName:'Beclomethasone Dipropionate',strength:'200mcg',  form:'inhaler', facility:jhb._id, stockQty:55,   reorderLevel:20,  maxStock:150,  unitPrice:45.00, category:'Respiratory' },
    // Other
    { name:'Furosemide',             genericName:'Furosemide',                strength:'40mg',     form:'tablet',  facility:jhb._id, stockQty:340,  reorderLevel:60,  maxStock:600,  unitPrice:1.10,  category:'Cardiovascular' },
    { name:'Omeprazole',             genericName:'Omeprazole',                strength:'20mg',     form:'capsule', facility:jhb._id, stockQty:422,  reorderLevel:80,  maxStock:800,  unitPrice:2.60,  category:'Gastrointestinal' },
    { name:'Folic Acid',             genericName:'Folic Acid',                strength:'5mg',      form:'tablet',  facility:jhb._id, stockQty:680,  reorderLevel:100, maxStock:1200, unitPrice:0.30,  category:'Vitamin' },
  ];

  let mCreated = 0, mSkipped = 0;
  const meds = {};
  for (const m of medData) {
    const existing = await Medication.findOne({ name:m.name, facility:jhb._id });
    if (existing) { meds[m.name] = existing; mSkipped++; continue; }
    const doc = await Medication.create(m);
    meds[m.name] = doc;
    mCreated++;
  }
  console.log(`   ✔ ${mCreated} medications created, ${mSkipped} already existed`);

  /* ════════════════════════════════════════
     5. APPOINTMENTS
  ════════════════════════════════════════ */
  console.log('📅  Seeding appointments…');

  const mkAppt = (data) => Appointment.create({
    queueToken:   data.token,
    visitType:    data.type || 'consultation',
    scheduledAt:  data.date,
    status:       data.status,
    reason:       data.reason,
    patient:      data.patient,
    doctor:       data.doctor,
    facility:     data.facility,
    triageLevel:  data.triage || 3,
    reminder24Sent: data.status === 'completed',
    reminder1Sent:  data.status === 'completed',
    rescheduleReason: data.rescheduleReason || null,
    isWalkIn:     data.walkIn || false,
  });

  const apptDefs = [
    // Completed past appointments
    { token:'A-01', type:'consultation', date:atTime(daysAgo(30),9),   status:'collected', reason:'Hypertension review — BP poorly controlled',                    patient:pNomsa._id,   doctor:doctor._id,  facility:jhb._id,        triage:3 },
    { token:'A-02', type:'lab',          date:atTime(daysAgo(25),8),   status:'collected', reason:'HbA1c and fasting glucose check',                               patient:pNomsa._id,   doctor:doctor._id,  facility:jhb._id,        triage:3 },
    { token:'A-03', type:'consultation', date:atTime(daysAgo(20),10),  status:'collected', reason:'ARV adherence review — CD4 and viral load results',             patient:pLerato._id,  doctor:drPriya._id, facility:soweto._id,     triage:3 },
    { token:'A-04', type:'consultation', date:atTime(daysAgo(14),9,30),status:'collected', reason:'DOTS treatment review — month 2',                               patient:pThabo._id,   doctor:drZulu._id,  facility:bara._id,       triage:2 },
    { token:'A-05', type:'consultation', date:atTime(daysAgo(10),11),  status:'collected', reason:'Asthma management — salbutamol overuse',                        patient:pSipham._id,  doctor:drPriya._id, facility:durban._id,     triage:3 },
    { token:'A-06', type:'consultation', date:atTime(daysAgo(7),14),   status:'collected', reason:'Routine BP and diabetes follow-up — Sipho Nkosi',               patient:pSipho._id,   doctor:doctor._id,  facility:jhb._id,        triage:3 },
    { token:'A-07', type:'consultation', date:atTime(daysAgo(5),9),    status:'collected', reason:'Renal function and blood pressure review',                      patient:pThabiso._id, doctor:drZulu._id,  facility:bara._id,       triage:2 },
    { token:'A-08', type:'consultation', date:atTime(daysAgo(3),10),   status:'collected', reason:'Antenatal visit — 28 weeks',                                    patient:pPrecious._id,doctor:drPriya._id, facility:helenJoseph._id,triage:3 },
    // Cancelled
    { token:'A-09', type:'consultation', date:atTime(daysAgo(15),8),   status:'cancelled', reason:'Hypertension check — cancelled by patient',                    patient:pNomsa._id,   doctor:doctor._id,  facility:jhb._id,        triage:3, rescheduleReason:'Transport issue' },
    // Upcoming confirmed
    { token:'A-10', type:'consultation', date:atTime(daysAhead(2),9),  status:'confirmed', reason:'Hypertension 3-month review and script renewal',               patient:pNomsa._id,   doctor:doctor._id,  facility:jhb._id,        triage:3 },
    { token:'A-11', type:'telemedicine', date:atTime(daysAhead(3),10), status:'confirmed', reason:'ARV follow-up telemedicine — viral load results discussion',   patient:pLerato._id,  doctor:drPriya._id, facility:soweto._id,     triage:3 },
    { token:'A-12', type:'consultation', date:atTime(daysAhead(4),8),  status:'confirmed', reason:'DOTS month 3 review — sputum culture results',                 patient:pThabo._id,   doctor:drZulu._id,  facility:bara._id,       triage:2 },
    { token:'A-13', type:'telemedicine', date:atTime(daysAhead(5),14), status:'pending',   reason:'Mental health follow-up — anxiety and depression management',  patient:pSipham._id,  doctor:drPriya._id, facility:durban._id,     triage:3 },
    { token:'A-14', type:'lab',          date:atTime(daysAhead(1),7,30),status:'confirmed', reason:'Fasting lipid profile and HbA1c',                             patient:pThabiso._id, doctor:drZulu._id,  facility:bara._id,       triage:3 },
    { token:'A-15', type:'consultation', date:atTime(daysAhead(7),9),  status:'confirmed', reason:'32-week antenatal visit — glucose tolerance test',             patient:pPrecious._id,doctor:drPriya._id, facility:helenJoseph._id,triage:3 },
    // Walk-in today
    { token:'W-01', type:'consultation', date:atTime(new Date(),8),     status:'in_progress',reason:'Walk-in — chest pain and shortness of breath',              patient:pSipho._id,   doctor:doctor._id,  facility:jhb._id,        triage:1, walkIn:true },
    { token:'W-02', type:'consultation', date:atTime(new Date(),9),     status:'pending',  reason:'Walk-in — fever and cough 3 days',                            patient:pThabo._id,   doctor:drZulu._id,  facility:bara._id,       triage:2, walkIn:true },
  ];

  let aCreated = 0, aSkipped = 0;
  for (const a of apptDefs) {
    const exists = await Appointment.findOne({ queueToken:a.token, patient:a.patient });
    if (!exists) { await mkAppt(a); aCreated++; } else aSkipped++;
  }
  console.log(`   ✔ ${aCreated} appointments created, ${aSkipped} already existed`);

  /* ════════════════════════════════════════
     6. LAB ORDERS
  ════════════════════════════════════════ */
  console.log('🧪  Seeding lab orders…');
  const labDefs = [
    { patient:pNomsa._id,   facility:jhb._id,   orderedBy:doctor._id, priority:'routine', status:'collected',
      tests:[{name:'HbA1c',result:'8.2%',referenceRange:'<7%',flag:'high',status:'collected'},{name:'Fasting glucose',result:'11.4 mmol/L',referenceRange:'3.9–6.1 mmol/L',flag:'high',status:'collected'},{name:'Urea & electrolytes',result:'Normal',referenceRange:'Normal',flag:'normal',status:'collected'}],
      notes:'HbA1c elevated — increase Metformin and reinforce diet counselling', createdAt:daysAgo(25) },
    { patient:pNomsa._id,   facility:jhb._id,   orderedBy:doctor._id, priority:'routine', status:'collected',
      tests:[{name:'Lipid profile',result:'LDL 4.2 mmol/L, HDL 1.0 mmol/L, TG 2.8 mmol/L',referenceRange:'LDL <3.0, HDL >1.0, TG <1.7',flag:'high',status:'collected'}],
      notes:'LDL and triglycerides elevated — initiate Atorvastatin', createdAt:daysAgo(15) },
    { patient:pLerato._id,  facility:soweto._id,orderedBy:drPriya._id, priority:'urgent', status:'collected',
      tests:[{name:'CD4 count',result:'420 cells/µL',referenceRange:'>500 cells/µL',flag:'low',status:'collected'},{name:'HIV viral load',result:'<20 copies/mL (undetectable)',referenceRange:'Undetectable target',flag:'normal',status:'collected'}],
      notes:'CD4 improving — viral load suppressed. Continue DTG/TDF/FTC', createdAt:daysAgo(20) },
    { patient:pThabo._id,   facility:bara._id,  orderedBy:drZulu._id, priority:'urgent', status:'collected',
      tests:[{name:'Sputum culture',result:'MTB detected — rifampicin sensitive',referenceRange:'No growth',flag:'high',status:'collected'},{name:'LFT',result:'ALT 48 U/L (slightly elevated)',referenceRange:'7–40 U/L',flag:'high',status:'collected'}],
      notes:'Culture confirms drug-sensitive TB. Continue RHZE — monitor LFTs monthly', createdAt:daysAgo(14) },
    { patient:pSipham._id,  facility:durban._id,orderedBy:drPriya._id, priority:'routine', status:'collected',
      tests:[{name:'Peak flow rate',result:'320 L/min',referenceRange:'>450 L/min for age/height',flag:'low',status:'collected'},{name:'FBC',result:'Eosinophils 0.9×10⁹/L',referenceRange:'0.0–0.4×10⁹/L',flag:'high',status:'collected'}],
      notes:'Reduced peak flow and eosinophilia consistent with asthma. Step up therapy', createdAt:daysAgo(10) },
    { patient:pThabiso._id, facility:bara._id,  orderedBy:drZulu._id, priority:'urgent', status:'collected',
      tests:[{name:'eGFR',result:'42 mL/min/1.73m²',referenceRange:'>60 mL/min/1.73m²',flag:'low',status:'collected'},{name:'Serum creatinine',result:'178 µmol/L',referenceRange:'60–110 µmol/L',flag:'high',status:'collected'},{name:'Urine albumin:creatinine',result:'45 mg/mmol',referenceRange:'<3 mg/mmol',flag:'high',status:'collected'}],
      notes:'CKD stage 3 confirmed — refer nephrology, avoid NSAIDs and nephrotoxic drugs', createdAt:daysAgo(7) },
    { patient:pPrecious._id,facility:helenJoseph._id,orderedBy:drPriya._id, priority:'routine', status:'collected',
      tests:[{name:'FBC',result:'Hb 10.2 g/dL',referenceRange:'12–16 g/dL',flag:'low',status:'collected'},{name:'Ferritin',result:'8 µg/L',referenceRange:'12–150 µg/L',flag:'low',status:'collected'},{name:'Blood group',result:'A negative',referenceRange:'N/A',flag:'normal',status:'collected'}],
      notes:'Iron deficiency anaemia in pregnancy — start oral iron supplementation', createdAt:daysAgo(3) },
    // Pending
    { patient:pNomsa._id,   facility:jhb._id,   orderedBy:doctor._id, priority:'routine', status:'ordered',
      tests:[{name:'HbA1c',status:'ordered'},{name:'Urea & electrolytes',status:'ordered'},{name:'Fasting glucose',status:'ordered'}],
      notes:'3-month diabetes review', createdAt:daysAgo(1) },
    { patient:pThabiso._id, facility:bara._id,  orderedBy:drZulu._id, priority:'urgent', status:'in_lab',
      tests:[{name:'Fasting lipid profile',status:'in_lab'},{name:'HbA1c',status:'in_lab'},{name:'eGFR',status:'in_lab'}],
      notes:'Urgent — renal and metabolic panel', createdAt:new Date() },
  ];

  let lCreated = 0, lSkipped = 0;
  for (const l of labDefs) {
    const exists = await LabOrder.findOne({ patient:l.patient, createdAt:{ $gte: new Date(l.createdAt - 36e5) } });
    if (!exists) {
      const doc = new LabOrder(l);
      doc.createdAt = l.createdAt;
      await doc.save();
      lCreated++;
    } else lSkipped++;
  }
  console.log(`   ✔ ${lCreated} lab orders created, ${lSkipped} already existed`);

  /* ════════════════════════════════════════
     7. PRESCRIPTIONS
  ════════════════════════════════════════ */
  console.log('📋  Seeding prescriptions…');
  const mkRx = async (data) => {
    const exists = await Prescription.findOne({ patient:data.patient, 'lines.medicationName':data.lines[0].medicationName });
    if (exists) return false;
    const doc = new Prescription({ ...data, status:'pending', prescribedBy:data.doctor });
    doc.createdAt = data.createdAt || new Date();
    await doc.save();
    return true;
  };

  const rxDefs = [
    { patient:pNomsa._id,  doctor:doctor._id,  facility:jhb._id,  createdAt:daysAgo(30),
      lines:[
        { medicationName:'Metformin',           dosage:'850mg twice daily with meals', frequency:'twice daily', durationDays:90, quantity:180, medicationId:meds['Metformin']?._id },
        { medicationName:'Amlodipine',          dosage:'5mg once daily',              frequency:'once daily',   durationDays:90, quantity:90,  medicationId:meds['Amlodipine']?._id },
        { medicationName:'Hydrochlorothiazide', dosage:'25mg in the morning',         frequency:'once daily',   durationDays:90, quantity:90,  medicationId:meds['Hydrochlorothiazide']?._id },
      ] },
    { patient:pNomsa._id,  doctor:doctor._id,  facility:jhb._id,  createdAt:daysAgo(15),
      lines:[
        { medicationName:'Atorvastatin', dosage:'40mg at night', frequency:'once daily', durationDays:90, quantity:90, medicationId:meds['Atorvastatin']?._id },
      ] },
    { patient:pLerato._id, doctor:drPriya._id, facility:soweto._id, createdAt:daysAgo(20),
      lines:[
        { medicationName:'Dolutegravir',           dosage:'50mg once daily', frequency:'once daily', durationDays:90, quantity:90,  medicationId:meds['Dolutegravir']?._id },
        { medicationName:'Tenofovir/Emtricitabine',dosage:'300/200mg once daily', frequency:'once daily', durationDays:90, quantity:90, medicationId:meds['Tenofovir/Emtricitabine']?._id },
      ] },
    { patient:pThabo._id, doctor:drZulu._id,  facility:bara._id, createdAt:daysAgo(14),
      lines:[
        { medicationName:'Rifampicin',   dosage:'600mg once daily on empty stomach', frequency:'once daily', durationDays:180, quantity:180, medicationId:meds['Rifampicin']?._id },
        { medicationName:'Isoniazid',    dosage:'300mg once daily',                  frequency:'once daily', durationDays:180, quantity:180, medicationId:meds['Isoniazid']?._id },
        { medicationName:'Pyrazinamide', dosage:'500mg three times daily',           frequency:'3x daily',   durationDays:60,  quantity:180, medicationId:meds['Pyrazinamide']?._id },
        { medicationName:'Ethambutol',   dosage:'400mg twice daily',                 frequency:'twice daily',durationDays:60,  quantity:120, medicationId:meds['Ethambutol']?._id },
      ] },
    { patient:pSipham._id, doctor:drPriya._id, facility:durban._id, createdAt:daysAgo(10),
      lines:[
        { medicationName:'Salbutamol Inhaler',     dosage:'2 puffs up to 4x daily as needed', frequency:'as needed', durationDays:90, quantity:2, medicationId:meds['Salbutamol Inhaler']?._id },
        { medicationName:'Beclomethasone Inhaler', dosage:'2 puffs twice daily',               frequency:'twice daily',durationDays:90, quantity:2, medicationId:meds['Beclomethasone Inhaler']?._id },
        { medicationName:'Omeprazole',             dosage:'20mg before breakfast',             frequency:'once daily', durationDays:30, quantity:30, medicationId:meds['Omeprazole']?._id },
      ] },
    { patient:pThabiso._id, doctor:drZulu._id, facility:bara._id, createdAt:daysAgo(7),
      lines:[
        { medicationName:'Metformin',  dosage:'850mg twice daily with meals', frequency:'twice daily', durationDays:90, quantity:180, medicationId:meds['Metformin']?._id },
        { medicationName:'Enalapril',  dosage:'10mg once daily',              frequency:'once daily',   durationDays:90, quantity:90,  medicationId:meds['Enalapril']?._id },
        { medicationName:'Furosemide', dosage:'40mg in the morning',          frequency:'once daily',   durationDays:90, quantity:90,  medicationId:meds['Furosemide']?._id },
      ] },
    { patient:pPrecious._id, doctor:drPriya._id, facility:helenJoseph._id, createdAt:daysAgo(3),
      lines:[
        { medicationName:'Folic Acid',  dosage:'5mg once daily',          frequency:'once daily', durationDays:90, quantity:90, medicationId:meds['Folic Acid']?._id },
        { medicationName:'Paracetamol', dosage:'500mg up to 4x daily PRN',frequency:'as needed',  durationDays:30, quantity:60, medicationId:meds['Paracetamol']?._id },
      ] },
    { patient:pSipho._id, doctor:doctor._id, facility:jhb._id, createdAt:daysAgo(6),
      lines:[
        { medicationName:'Amlodipine',    dosage:'5mg once daily',  frequency:'once daily', durationDays:90, quantity:90, medicationId:meds['Amlodipine']?._id },
        { medicationName:'Atenolol',      dosage:'50mg once daily', frequency:'once daily', durationDays:90, quantity:90, medicationId:meds['Atenolol']?._id },
        { medicationName:'Atorvastatin',  dosage:'40mg at night',   frequency:'once daily', durationDays:90, quantity:90, medicationId:meds['Atorvastatin']?._id },
      ] },
  ];

  let rxCreated = 0;
  for (const rx of rxDefs) {
    const created = await mkRx(rx);
    if (created) rxCreated++;
  }
  console.log(`   ✔ ${rxCreated} prescriptions created`);

  /* ─── Summary ─── */
  console.log('\n✅  NIHMS seed complete!\n');
  console.log('═══════════════════════════════════════════════════════');
  console.log('  Demo login credentials (password: Demo@1234)');
  console.log('───────────────────────────────────────────────────────');
  console.log('  ROLE        EMAIL');
  console.log('  Admin       admin@nihms.gov.za');
  console.log('  Doctor      doctor@nihms.gov.za       (Dr. Sipho Molefe — JHB CHC)');
  console.log('  Doctor      drpriya@nihms.gov.za      (Dr. Priya Naidoo — Helen Joseph)');
  console.log('  Doctor      drzulu@nihms.gov.za       (Dr. Andile Zulu — Bara)');
  console.log('  Nurse       nurse@nihms.gov.za        (Ayanda Nkosi — JHB CHC)');
  console.log('  Pharmacist  pharmacy@nihms.gov.za     (Sandile Mahlangu — JHB CHC)');
  console.log('  Patient     patient@nihms.gov.za      (Nomsa Dlamini — hypertension + diabetes)');
  console.log('  Patient     lerato@nihms.gov.za       (Lerato Mokoena — HIV on ARVs)');
  console.log('  Patient     thabo@nihms.gov.za        (Thabo Sithole — TB on DOTS)');
  console.log('  Patient     sipham@nihms.gov.za       (Siphamandla Mthembu — asthma)');
  console.log('═══════════════════════════════════════════════════════\n');

  await mongoose.connection.close();
  process.exit(0);
}

run().catch(err => {
  console.error('\n❌  Seed error:', err.message, '\n', err.stack);
  process.exit(1);
});
