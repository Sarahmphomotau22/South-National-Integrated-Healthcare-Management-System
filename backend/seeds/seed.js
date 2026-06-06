'use strict';
/**
 * seeds/seed.js
 * ─────────────────────────────────────────────────────────
 * Run once to populate your database with:
 *   - 5 facilities
 *   - 1 admin user per role (doctor, nurse, pharmacy, patient, admin)
 *   - Medications catalogue for Johannesburg CHC
 *
 * Usage:
 *   node seeds/seed.js          — seed
 *   node seeds/seed.js --clear  — drop all collections first
 * ─────────────────────────────────────────────────────────
 */

require('dotenv').config();
const mongoose   = require('mongoose');
const User       = require('../models/User');
const Patient    = require('../models/Patient');
const { Facility, Medication, Appointment, Prescription, LabOrder } = require('../models/index');

const CLEAR = process.argv.includes('--clear');

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  if (CLEAR) {
    await Promise.all([
      User.deleteMany({}),
      Patient.deleteMany({}),
      Facility.deleteMany({}),
      Medication.deleteMany({}),
      Appointment.deleteMany({}),
      Prescription.deleteMany({}),
      LabOrder.deleteMany({})
    ]);
    console.log('All collections cleared');
  }

  // ── 1. Facilities ──
  const facilitiesData = [
    { name: 'Johannesburg CHC',   type: 'CHC',      province: 'Gauteng',      address: '1 Main Rd, Johannesburg',    isOnline: true  },
    { name: 'Helen Joseph Hospital', type: 'regional', province: 'Gauteng',   address: '14 Perth Rd, Auckland Park', isOnline: true  },
    { name: 'Soweto Clinic',      type: 'clinic',   province: 'Gauteng',      address: '5 Kliptown Ave, Soweto',     isOnline: true  },
    { name: 'Bela-Bela Clinic',   type: 'clinic',   province: 'Limpopo',      address: 'Warmbaths, Limpopo',         isOnline: false },
    { name: 'Thohoyandou CHC',    type: 'CHC',      province: 'Limpopo',      address: 'Thohoyandou, Limpopo',       isOnline: false },
  ];

  const facilities = [];
  for (const f of facilitiesData) {
    const exists = await Facility.findOne({ name: f.name });
    facilities.push(exists || await Facility.create(f));
  }
  const jhbCHC = facilities[0];
  console.log(`Facilities: ${facilities.length} ready`);

  // ── 2. Users ──
  const usersData = [
    { firstName:'Admin',   lastName:'NIHMS',    email:'admin@nihms.gov.za',    password:'Demo@1234', role:'admin',    facility: jhbCHC._id, facilityName:'National' },
    { firstName:'Dr. Sipho', lastName:'Molefe', email:'doctor@nihms.gov.za',   password:'Demo@1234', role:'doctor',   facility: jhbCHC._id, facilityName:'Johannesburg CHC' },
    { firstName:'Ayanda',  lastName:'Nkosi',    email:'nurse@nihms.gov.za',    password:'Demo@1234', role:'nurse',    facility: jhbCHC._id, facilityName:'Johannesburg CHC' },
    { firstName:'Sandile', lastName:'Mahlangu', email:'pharmacy@nihms.gov.za', password:'Demo@1234', role:'pharmacy', facility: jhbCHC._id, facilityName:'Johannesburg CHC' },
    { firstName:'Nomsa',   lastName:'Dlamini',  email:'patient@nihms.gov.za',  password:'Demo@1234', role:'patient',  facility: jhbCHC._id, facilityName:'Johannesburg CHC' },
  ];

  const createdUsers = [];
  for (const u of usersData) {
    const exists = await User.findOne({ email: u.email });
    createdUsers.push(exists || await User.create(u));
  }
  console.log(`Users: ${createdUsers.length} ready`);

  // ── 3. Sample patients ──
  const patientUser = createdUsers.find(u => u.role === 'patient');
  const doctor      = createdUsers.find(u => u.role === 'doctor');

  const patientsData = [
    {
      user: patientUser._id,
      firstName:'Nomsa',   lastName:'Dlamini',   nationalId:'8203041234083',
      dateOfBirth: new Date('1982-03-04'), gender:'female', bloodType:'O+',
      phone:'+27820000001', address:'12 Soweto St, Johannesburg',
      allergies:['Penicillin'],
      conditions:[
        { icd10Code:'I10', name:'Essential hypertension', status:'active', diagnosedBy: doctor._id },
        { icd10Code:'E11', name:'Type 2 diabetes mellitus', status:'monitored', diagnosedBy: doctor._id }
      ],
      latestVitals:{ bp:{ systolic:148, diastolic:94 }, heartRate:88, temperature:36.8, spO2:98, weight:72, height:165, bmi:26.4 },
      primaryFacility: jhbCHC._id, registeredBy: doctor._id, isVerified: true
    },
    {
      firstName:'Sipho',   lastName:'Nkosi',     nationalId:'5607120987083',
      dateOfBirth: new Date('1956-07-12'), gender:'male', bloodType:'A+',
      phone:'+27820000002', address:'45 Alex Rd, Alexandra',
      allergies:[],
      conditions:[{ icd10Code:'I10', name:'Hypertension', status:'active', diagnosedBy: doctor._id }],
      latestVitals:{ bp:{ systolic:160, diastolic:100 }, heartRate:92, temperature:36.5, spO2:97, weight:88, height:178, bmi:27.8 },
      primaryFacility: jhbCHC._id, registeredBy: doctor._id, isVerified: true
    },
    {
      firstName:'Thabo',   lastName:'Sithole',   nationalId:'8812150011083',
      dateOfBirth: new Date('1988-12-15'), gender:'male', bloodType:'B+',
      phone:'+27820000003', address:'7 Mamelodi Ave, Pretoria',
      allergies:[],
      conditions:[{ icd10Code:'A15', name:'Pulmonary tuberculosis', status:'active', diagnosedBy: doctor._id }],
      latestVitals:{ bp:{ systolic:120, diastolic:80 }, heartRate:78, temperature:37.1, spO2:96, weight:65, height:172, bmi:22 },
      primaryFacility: jhbCHC._id, registeredBy: doctor._id, isVerified: true
    }
  ];

  let patientCount = 0;
  for (const p of patientsData) {
    const exists = await Patient.findOne({ nationalId: p.nationalId });
    if (!exists) { await Patient.create(p); patientCount++; }
  }
  console.log(`Patients: ${patientCount} created`);

  // ── 4. Medications ──
  const medsData = [
    { name:'Metformin',             genericName:'Metformin HCl',       strength:'850mg',  form:'tablet',  facility:jhbCHC._id, stockQty:1240, reorderLevel:200, maxStock:2000 },
    { name:'Amlodipine',            genericName:'Amlodipine Besylate', strength:'5mg',    form:'tablet',  facility:jhbCHC._id, stockQty:890,  reorderLevel:150, maxStock:1500 },
    { name:'Atorvastatin',          genericName:'Atorvastatin Calcium',strength:'40mg',   form:'tablet',  facility:jhbCHC._id, stockQty:430,  reorderLevel:100, maxStock:1000 },
    { name:'Hydrochlorothiazide',   genericName:'HCTZ',                strength:'25mg',   form:'tablet',  facility:jhbCHC._id, stockQty:220,  reorderLevel:80,  maxStock:800  },
    { name:'Amoxicillin',           genericName:'Amoxicillin',         strength:'500mg',  form:'capsule', facility:jhbCHC._id, stockQty:8,    reorderLevel:100, maxStock:500  },
    { name:'Rifampicin',            genericName:'Rifampicin',          strength:'600mg',  form:'tablet',  facility:jhbCHC._id, stockQty:95,   reorderLevel:60,  maxStock:300  },
    { name:'Isoniazid',             genericName:'Isoniazid',           strength:'300mg',  form:'tablet',  facility:jhbCHC._id, stockQty:88,   reorderLevel:60,  maxStock:300  },
    { name:'Paracetamol',           genericName:'Paracetamol',         strength:'500mg',  form:'tablet',  facility:jhbCHC._id, stockQty:2100, reorderLevel:300, maxStock:3000 },
    { name:'Dolutegravir',          genericName:'Dolutegravir',        strength:'50mg',   form:'tablet',  facility:jhbCHC._id, stockQty:312,  reorderLevel:100, maxStock:600  },
    { name:'Tenofovir/Emtricitabine',genericName:'TDF/FTC',            strength:'300/200mg',form:'tablet',facility:jhbCHC._id, stockQty:189,  reorderLevel:80,  maxStock:400  },
    { name:'Furosemide',            genericName:'Furosemide',          strength:'40mg',   form:'tablet',  facility:jhbCHC._id, stockQty:340,  reorderLevel:60,  maxStock:600  },
    { name:'Atenolol',              genericName:'Atenolol',            strength:'50mg',   form:'tablet',  facility:jhbCHC._id, stockQty:420,  reorderLevel:80,  maxStock:800  },
  ];

  let medCount = 0;
  for (const m of medsData) {
    const exists = await Medication.findOne({ name: m.name, facility: jhbCHC._id });
    if (!exists) { await Medication.create(m); medCount++; }
  }
  console.log(`Medications: ${medCount} created`);

  console.log('\nSeed complete.');
  console.log('─────────────────────────────────');
  console.log('Demo login credentials:');
  console.log('  admin@nihms.gov.za    / Demo@1234  (Admin)');
  console.log('  doctor@nihms.gov.za   / Demo@1234  (Doctor)');
  console.log('  nurse@nihms.gov.za    / Demo@1234  (Nurse)');
  console.log('  pharmacy@nihms.gov.za / Demo@1234  (Pharmacist)');
  console.log('  patient@nihms.gov.za  / Demo@1234  (Patient)');
  console.log('─────────────────────────────────\n');

  await mongoose.connection.close();
  process.exit(0);
}

run().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
