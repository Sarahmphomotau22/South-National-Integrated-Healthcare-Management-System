'use strict';
const express  = require('express');
const router   = express.Router();
const multer   = require('multer');
const path     = require('path');
const fs       = require('fs');
const { protect, authorize } = require('../middleware/auth');
const Patient  = require('../models/Patient');

router.use(protect);

// ── File upload config (local storage — swap for S3 in production) ──
const uploadDir = path.join(__dirname, '..', 'uploads', 'id-docs');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename:    (req, file, cb) => {
    const ext  = path.extname(file.originalname);
    const name = `id-${req.user._id}-${Date.now()}${ext}`;
    cb(null, name);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },  // 5 MB max
  fileFilter: (_req, file, cb) => {
    const allowed = ['.jpg','.jpeg','.png','.pdf'];
    if (allowed.includes(path.extname(file.originalname).toLowerCase())) cb(null, true);
    else cb(new Error('Only JPG, PNG, and PDF files are allowed'));
  }
});

// GET /api/v1/patients — list / search
router.get('/', async (req, res, next) => {
  try {
    const { q, facility, page = 1, limit = 20 } = req.query;

    // Patients see only their own record
    if (req.user.role === 'patient') {
      const record = await Patient.findOne({ user: req.user._id }).populate('primaryFacility','name');
      if (!record) return res.json({ success: true, data: [], meta: { total: 0 } });
      return res.json({ success: true, data: [record], meta: { total: 1 } });
    }

    const filter = {};
    if (facility) filter.primaryFacility = facility;
    if (q) {
      filter.$or = [
        { firstName:  { $regex: q, $options: 'i' } },
        { lastName:   { $regex: q, $options: 'i' } },
        { nationalId: { $regex: q, $options: 'i' } },
        { mrn:        { $regex: q, $options: 'i' } },
        { phone:      { $regex: q, $options: 'i' } }
      ];
    }
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      Patient.find(filter).skip(skip).limit(+limit).populate('primaryFacility','name').sort({ createdAt: -1 }),
      Patient.countDocuments(filter)
    ]);
    res.json({ success: true, data, meta: { total, page: +page, limit: +limit } });
  } catch (err) { next(err); }
});

// GET /api/v1/patients/me — patient gets their own record (auto-creates if missing)
router.get('/me', async (req, res, next) => {
  try {
    let patient = await Patient.findOne({ user: req.user._id })
      .populate('primaryFacility','name')
      .populate('registeredBy','firstName lastName');

    if (!patient) {
      // Auto-create a basic record so the app works immediately after registration
      const count = await Patient.countDocuments();
      const mrn   = 'MRN-' + String(count + 1).padStart(6, '0');
      const user  = req.user;
      patient = await Patient.create({
        user:        user._id,
        firstName:   user.firstName   || '',
        lastName:    user.lastName    || '',
        nationalId:  user.nationalId  || `AUTO-${String(user._id)}`,
        dateOfBirth: user.dateOfBirth || new Date('1990-01-01'),
        gender:      user.gender      || 'prefer_not_to_say',
        phone:       user.phone       || '',
        email:       user.email       || '',
        mrn,
        isVerified:  false,
        allergies:   [],
        conditions:  []
      });
    }

    res.json({ success: true, data: patient });
  } catch (err) { next(err); }
});

// GET /api/v1/patients/:id
router.get('/:id', async (req, res, next) => {
  try {
    const patient = await Patient.findById(req.params.id)
      .populate('primaryFacility','name')
      .populate('registeredBy','firstName lastName');
    if (!patient) return res.status(404).json({ success: false, message: 'Patient not found.' });
    if (req.user.role === 'patient' && String(patient.user) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }
    res.json({ success: true, data: patient });
  } catch (err) { next(err); }
});

// POST /api/v1/patients — register new patient (nurse / doctor / admin)
router.post('/', authorize('nurse','doctor','admin'), async (req, res, next) => {
  try {
    const patient = await Patient.create({ ...req.body, registeredBy: req.user._id });
    res.status(201).json({ success: true, data: patient });
  } catch (err) { next(err); }
});

// PUT /api/v1/patients/:id — full update (staff)
router.put('/:id', authorize('nurse','doctor','admin'), async (req, res, next) => {
  try {
    const patient = await Patient.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!patient) return res.status(404).json({ success: false, message: 'Patient not found.' });
    res.json({ success: true, data: patient });
  } catch (err) { next(err); }
});

// Phone normalisation helper
function normalisePhone(phone) {
  if (!phone) return phone;
  const digits = phone.replace(/[^0-9]/g, '');
  if (digits.startsWith('27') && digits.length >= 11) return '+' + digits;
  if (digits.startsWith('0') && digits.length === 10) return '+27' + digits.slice(1);
  if (digits.length === 9) return '+27' + digits;
  return phone;
}

// PATCH /api/v1/patients/me/profile — patient edits their own allowed fields
router.patch('/me/profile', async (req, res, next) => {
  try {
    const allowed = ['phone','phoneAlt','email','address','nextOfKin','medicalAid','profilePicture',
                     'firstName','lastName','dateOfBirth','gender','nationalId','idType','bloodType','allergies'];
    const updates = {};
    allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

    // Normalise phone numbers
    if (updates.phone)              updates.phone              = normalisePhone(updates.phone);
    if (updates.phoneAlt)           updates.phoneAlt           = normalisePhone(updates.phoneAlt);
    if (updates.nextOfKin?.phone)   updates.nextOfKin.phone   = normalisePhone(updates.nextOfKin.phone);

    // Auto-create patient record if missing (handles users who registered before this feature)
    let patient = await Patient.findOne({ user: req.user._id });

    if (!patient) {
      const count = await Patient.countDocuments();
      const mrn   = 'MRN-' + String(count + 1).padStart(6, '0');
      const user  = req.user;
      patient = await Patient.create({
        user:        user._id,
        firstName:   user.firstName,
        lastName:    user.lastName,
        nationalId:  user.nationalId || `AUTO-${String(user._id)}`,
        dateOfBirth: user.dateOfBirth || new Date('1990-01-01'),
        gender:      user.gender || 'prefer_not_to_say',
        phone:       user.phone || '',
        email:       user.email || '',
        mrn,
        isVerified:  false,
        allergies:   [],
        conditions:  [],
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

// POST /api/v1/patients/me/upload-profile — patient uploads profile picture
router.post('/me/upload-profile', upload.single('profilePicture'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded.' });
    const url = `/uploads/id-docs/${req.file.filename}`;
    const patient = await Patient.findOneAndUpdate(
      { user: req.user._id },
      { profilePicture: { filename: req.file.originalname, url, uploadedAt: new Date() } },
      { new: true }
    );
    if (!patient) return res.status(404).json({ success: false, message: 'Patient record not found.' });
    res.json({ success: true, data: { url, filename: req.file.originalname } });
  } catch (err) { next(err); }
});

// POST /api/v1/patients/me/upload-id — patient uploads ID document
router.post('/me/upload-id', upload.single('idDocument'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded.' });
    const url = `/uploads/id-docs/${req.file.filename}`;
    const patient = await Patient.findOneAndUpdate(
      { user: req.user._id },
      { idDocument: { filename: req.file.originalname, url, uploadedAt: new Date() } },
      { new: true }
    );
    if (!patient) return res.status(404).json({ success: false, message: 'Patient record not found.' });
    res.json({ success: true, data: { url, filename: req.file.originalname } });
  } catch (err) { next(err); }
});

// POST /api/v1/patients/:id/upload-doc — staff uploads doc on behalf of patient
router.post('/:id/upload-doc', authorize('nurse','doctor','admin'), upload.single('idDocument'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded.' });
    const url = `/uploads/id-docs/${req.file.filename}`;
    const patient = await Patient.findByIdAndUpdate(
      req.params.id,
      { idDocument: { filename: req.file.originalname, url, uploadedAt: new Date() } },
      { new: true }
    );
    if (!patient) return res.status(404).json({ success: false, message: 'Patient not found.' });
    res.json({ success: true, data: { url, filename: req.file.originalname } });
  } catch (err) { next(err); }
});

// DELETE /api/v1/patients/:id/remove-doc — staff removes uploaded document
router.delete('/:id/remove-doc', authorize('nurse','doctor','admin'), async (req, res, next) => {
  try {
    const patient = await Patient.findByIdAndUpdate(
      req.params.id,
      { $unset: { idDocument: 1 } },
      { new: true }
    );
    if (!patient) return res.status(404).json({ success: false, message: 'Patient not found.' });
    res.json({ success: true, message: 'Document removed.' });
  } catch (err) { next(err); }
});

module.exports = router;
