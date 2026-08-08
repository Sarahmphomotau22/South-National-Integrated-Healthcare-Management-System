'use strict';
const express  = require('express');
const router   = express.Router();
const multer   = require('multer');
const path     = require('path');
const fs       = require('fs');
const { protect, authorize } = require('../middleware/auth');
const Patient  = require('../models/Patient');

router.use(protect);

// ── File upload config ──
const uploadDir = path.join(__dirname, '..', 'uploads', 'id-docs');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, 'id-' + req.user._id + '-' + Date.now() + ext);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.jpg','.jpeg','.png','.pdf'];
    allowed.includes(path.extname(file.originalname).toLowerCase())
      ? cb(null, true)
      : cb(new Error('Only JPG, PNG, and PDF files are allowed'));
  }
});

// ══════════════════════════════════════════════════════
// GET /api/v1/patients
// ══════════════════════════════════════════════════════
router.get('/', async (req, res, next) => {
  try {
    const { q, nationalId, search, facility, page = 1, limit = 20 } = req.query;

    // Patients see only their own record
    if (req.user.role === 'patient') {
      const record = await Patient.findOne({ user: req.user._id })
        .populate('primaryFacility', 'name');
      if (!record) return res.json({ success: true, data: [], meta: { total: 0 } });
      return res.json({ success: true, data: [record], meta: { total: 1 } });
    }

    // ── Exact nationalId lookup (receptionist walk-in search) ────────────────
    // Searches the PATIENT collection only — never returns staff user data.
    // We do NOT populate patient.user here to avoid leaking staff emails.
    const idSearch = (nationalId || '').trim().replace(/\s/g, '');
    if (idSearch) {

      // 1. Search Patient collection by nationalId (exact match)
      const patient = await Patient.findOne({ nationalId: idSearch })
        .lean();  // plain object, no virtuals, no populate

      if (patient) {
        return res.json({
          success: true,
          data: [{
            _id:        patient._id,
            user:       patient.user,        // ObjectId only — NOT populated
            firstName:  patient.firstName  || '',
            lastName:   patient.lastName   || '',
            // ✅ Use ONLY patient.email — never fall back to any User.email
            // The patient who registered may have no email on their Patient record,
            // but falling back to patient.user's email risks returning staff email.
            email:      patient.email      || '',
            phone:      patient.phone      || '',
            nationalId: patient.nationalId || idSearch,
            gender:     patient.gender     || '',
            dateOfBirth:patient.dateOfBirth|| null,
            medicalAid: patient.medicalAid || {},
            mrn:        patient.mrn        || '',
            age:        patient.age        || null,
            allergies:  patient.allergies  || [],
            bloodType:  patient.bloodType  || '',
          }]
        });
      }

      // 2. Fallback: check User model with role:'patient' ONLY
      //    This handles patients who registered but have no Patient record yet.
      //    role filter is critical — prevents returning any staff user.
      try {
        const User = require('../models/User');
        const userMatch = await User
          .findOne({ nationalId: idSearch, role: 'patient' })
          .select('firstName lastName email phone nationalId gender dateOfBirth')
          .lean();

        if (userMatch) {
          return res.json({
            success: true,
            data: [{
              _id:        userMatch._id,
              user:       userMatch._id,
              firstName:  userMatch.firstName  || '',
              lastName:   userMatch.lastName   || '',
              email:      userMatch.email      || '',
              phone:      userMatch.phone      || '',
              nationalId: userMatch.nationalId || idSearch,
              gender:     userMatch.gender     || '',
              dateOfBirth:userMatch.dateOfBirth|| null,
            }]
          });
        }
      } catch (_) {}

      // 3. Not found in either collection
      return res.json({ success: true, data: [] });
    }

    // ── General text search ──────────────────────────────────────────────────
    const term = (q || search || '').trim();
    const filter = {};
    if (facility) filter.primaryFacility = facility;
    if (term) {
      const re = new RegExp(term, 'i');
      filter.$or = [
        { firstName: re }, { lastName: re },
        { nationalId: re }, { mrn: re },
        { phone: re },      { email: re }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [data, total] = await Promise.all([
      Patient.find(filter)
        .skip(skip).limit(+limit)
        .populate('primaryFacility', 'name')
        .sort({ createdAt: -1 }),
      Patient.countDocuments(filter)
    ]);

    res.json({ success: true, data, meta: { total, page: +page, limit: +limit } });
  } catch (err) { next(err); }
});

// ── GET /api/v1/patients/me ──────────────────────────────────────────────────
router.get('/me', async (req, res, next) => {
  try {
    let patient = await Patient.findOne({ user: req.user._id })
      .populate('primaryFacility', 'name')
      .populate('registeredBy', 'firstName lastName');

    if (!patient) {
      const count = await Patient.countDocuments();
      const mrn   = 'MRN-' + String(count + 1).padStart(6, '0');
      const u     = req.user;
      patient = await Patient.create({
        user:        u._id,
        firstName:   u.firstName   || '',
        lastName:    u.lastName    || '',
        nationalId:  u.nationalId  || 'AUTO-' + String(u._id),
        dateOfBirth: u.dateOfBirth || new Date('1990-01-01'),
        gender:      u.gender      || 'prefer_not_to_say',
        phone:       u.phone       || '',
        email:       u.email       || '',
        mrn,
        isVerified: false,
        allergies:  [],
        conditions: []
      });
    }

    res.json({ success: true, data: patient });
  } catch (err) { next(err); }
});

// ── GET /api/v1/patients/:id ─────────────────────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const patient = await Patient.findById(req.params.id)
      .populate('primaryFacility', 'name')
      .populate('registeredBy', 'firstName lastName');
    if (!patient) return res.status(404).json({ success: false, message: 'Patient not found.' });
    if (req.user.role === 'patient' && String(patient.user) !== String(req.user._id))
      return res.status(403).json({ success: false, message: 'Access denied.' });
    res.json({ success: true, data: patient });
  } catch (err) { next(err); }
});

// ── POST /api/v1/patients — register new patient (staff) ─────────────────────
router.post('/',
  authorize('nurse','doctor','admin','receptionist','facility_admin','super_admin'),
  async (req, res, next) => {
  try {
    if (req.body.nationalId) {
      const existing = await Patient.findOne({
        nationalId: req.body.nationalId.trim()
      });
      if (existing) {
        return res.status(409).json({
          success: false,
          message: 'A patient with this ID number already exists.',
          data: existing
        });
      }
    }
    const patient = await Patient.create({ ...req.body, registeredBy: req.user._id });
    res.status(201).json({ success: true, data: patient });
  } catch (err) { next(err); }
});

// ── PUT /api/v1/patients/:id ─────────────────────────────────────────────────
router.put('/:id',
  authorize('nurse','doctor','admin','facility_admin'),
  async (req, res, next) => {
  try {
    const patient = await Patient.findByIdAndUpdate(
      req.params.id, req.body, { new: true, runValidators: true }
    );
    if (!patient) return res.status(404).json({ success: false, message: 'Patient not found.' });
    res.json({ success: true, data: patient });
  } catch (err) { next(err); }
});

// ── PATCH /api/v1/patients/:id — staff partial update ────────────────────────
router.patch('/:id',
  authorize('nurse','doctor','admin','receptionist','facility_admin'),
  async (req, res, next) => {
  try {
    const patient = await Patient.findByIdAndUpdate(
      req.params.id, { $set: req.body }, { new: true, runValidators: true }
    );
    if (!patient) return res.status(404).json({ success: false, message: 'Patient not found.' });
    res.json({ success: true, data: patient });
  } catch (err) { next(err); }
});

// ── Phone normalisation ───────────────────────────────────────────────────────
function normalisePhone(phone) {
  if (!phone) return phone;
  const d = phone.replace(/[^0-9]/g, '');
  if (d.startsWith('27') && d.length >= 11) return '+' + d;
  if (d.startsWith('0')  && d.length === 10) return '+27' + d.slice(1);
  if (d.length === 9) return '+27' + d;
  return phone;
}

// ── PATCH /api/v1/patients/me/profile — patient edits own record ──────────────
router.patch('/me/profile', async (req, res, next) => {
  try {
    const allowed = [
      'phone','phoneAlt','email','address','nextOfKin','medicalAid',
      'profilePicture','firstName','lastName','dateOfBirth','gender',
      'nationalId','idType','bloodType','allergies'
    ];
    const updates = {};
    allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

    if (updates.phone)            updates.phone            = normalisePhone(updates.phone);
    if (updates.phoneAlt)         updates.phoneAlt         = normalisePhone(updates.phoneAlt);
    if (updates.nextOfKin?.phone) updates.nextOfKin.phone  = normalisePhone(updates.nextOfKin.phone);

    let patient = await Patient.findOne({ user: req.user._id });
    if (!patient) {
      const count = await Patient.countDocuments();
      const u     = req.user;
      patient = await Patient.create({
        user: u._id, firstName: u.firstName, lastName: u.lastName,
        nationalId: u.nationalId || 'AUTO-' + String(u._id),
        dateOfBirth: u.dateOfBirth || new Date('1990-01-01'),
        gender: u.gender || 'prefer_not_to_say',
        phone: u.phone || '', email: u.email || '',
        mrn: 'MRN-' + String(count + 1).padStart(6, '0'),
        isVerified: false, allergies: [], conditions: [],
        ...updates
      });
      return res.json({ success: true, data: patient, created: true });
    }

    const updated = await Patient.findOneAndUpdate(
      { user: req.user._id },
      { $set: updates },
      { new: true, runValidators: true }
    );
    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
});

// ── POST /api/v1/patients/me/upload-profile ───────────────────────────────────
router.post('/me/upload-profile', upload.single('profilePicture'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded.' });
    const url     = '/uploads/id-docs/' + req.file.filename;
    const patient = await Patient.findOneAndUpdate(
      { user: req.user._id },
      { profilePicture: { filename: req.file.originalname, url, uploadedAt: new Date() } },
      { new: true }
    );
    if (!patient) return res.status(404).json({ success: false, message: 'Patient record not found.' });
    res.json({ success: true, data: { url, filename: req.file.originalname } });
  } catch (err) { next(err); }
});

// ── POST /api/v1/patients/me/upload-id ───────────────────────────────────────
router.post('/me/upload-id', upload.single('idDocument'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded.' });
    const url     = '/uploads/id-docs/' + req.file.filename;
    const patient = await Patient.findOneAndUpdate(
      { user: req.user._id },
      { idDocument: { filename: req.file.originalname, url, uploadedAt: new Date() } },
      { new: true }
    );
    if (!patient) return res.status(404).json({ success: false, message: 'Patient record not found.' });
    res.json({ success: true, data: { url, filename: req.file.originalname } });
  } catch (err) { next(err); }
});

// ── POST /api/v1/patients/:id/upload-doc — staff uploads on behalf of patient ─
router.post('/:id/upload-doc',
  authorize('nurse','doctor','admin','receptionist','facility_admin'),
  upload.single('idDocument'),
  async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded.' });
    const url     = '/uploads/id-docs/' + req.file.filename;
    const patient = await Patient.findByIdAndUpdate(
      req.params.id,
      { idDocument: { filename: req.file.originalname, url, uploadedAt: new Date() } },
      { new: true }
    );
    if (!patient) return res.status(404).json({ success: false, message: 'Patient not found.' });
    res.json({ success: true, data: { url, filename: req.file.originalname } });
  } catch (err) { next(err); }
});

// ── DELETE /api/v1/patients/:id/remove-doc ───────────────────────────────────
router.delete('/:id/remove-doc',
  authorize('nurse','doctor','admin'),
  async (req, res, next) => {
  try {
    const patient = await Patient.findByIdAndUpdate(
      req.params.id, { $unset: { idDocument: 1 } }, { new: true }
    );
    if (!patient) return res.status(404).json({ success: false, message: 'Patient not found.' });
    res.json({ success: true, message: 'Document removed.' });
  } catch (err) { next(err); }
});


// POST /api/v1/patients/:id/vitals — doctor updates patient vitals
router.post('/:id/vitals', async (req, res, next) => {
  try {
    const Patient = require('../models/Patient');
    const patient = await Patient.findById(req.params.id);
    if (!patient) return res.status(404).json({ success: false, message: 'Patient not found' });

    // Merge new vitals with existing
    const existing = patient.latestVitals || {};
    const updated  = Object.assign({}, existing, req.body, { recordedAt: new Date() });

    patient.latestVitals = updated;
    await patient.save();

    res.json({ success: true, data: patient.latestVitals });
  } catch(err) { next(err); }
});

// PATCH /api/v1/patients/:id/vitals — same as POST (alias)
router.patch('/:id/vitals', async (req, res, next) => {
  try {
    const Patient = require('../models/Patient');
    const patient = await Patient.findById(req.params.id);
    if (!patient) return res.status(404).json({ success: false, message: 'Patient not found' });

    const existing = patient.latestVitals || {};
    patient.latestVitals = Object.assign({}, existing, req.body, { recordedAt: new Date() });
    await patient.save();

    res.json({ success: true, data: patient.latestVitals });
  } catch(err) { next(err); }
});

module.exports = router;
