'use strict';

const jwt    = require('jsonwebtoken');
const User   = require('../models/User');
const logger = require('../utils/logger');

/* ─── Role hierarchy ─────────────────────────────────────────
   Higher number = more permissions.
   authorize() accepts role names OR minimum level numbers.
──────────────────────────────────────────────────────────── */
const ROLE_HIERARCHY = {
  super_admin:    10,
  admin:          10,   // legacy alias for super_admin
  facility_admin:  8,
  doctor:          7,
  nurse:           5,
  receptionist:    4,
  lab_worker:      4,
  pharmacy:        4,
  finance:         4,
  patient:         1,
};

/**
 * getRoleLevel(role) — returns numeric level for a role string
 */
function getRoleLevel(role) {
  return ROLE_HIERARCHY[role] ?? 0;
}

/**
 * protect — verify JWT and attach req.user
 */
const protect = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided.' });
    }

    const token   = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id)
      .select('-password -refreshToken -otpHash -otpExpires');

    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'User not found or account deactivated.' });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expired.' });
    }
    next(err);
  }
};

/**
 * authorize(...roles) — restrict access to specific roles OR a minimum level.
 *
 * Usage examples:
 *   authorize('admin')
 *   authorize('doctor', 'nurse', 'facility_admin', 'super_admin')
 *   authorize({ minLevel: 5 })   — nurse level and above
 *   authorizeLevel(5)            — shorthand for minLevel
 *
 * New aliases also accepted:
 *   authorize('super_admin')     — system-wide admin
 *   authorize('facility_admin')  — facility manager
 *   authorize('receptionist')    — front desk
 *   authorize('lab_worker')      — lab technician
 *   authorize('finance')         — billing / finance
 */
const authorize = (...roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Not authenticated.' });
  }

  const userRole  = req.user.role;
  const userLevel = getRoleLevel(userRole);

  // Support { minLevel: N } object as first argument
  if (roles.length === 1 && typeof roles[0] === 'object' && roles[0].minLevel !== undefined) {
    if (userLevel >= roles[0].minLevel) return next();
    return res.status(403).json({
      success: false,
      message: `Requires permission level ${roles[0].minLevel}. Your role '${userRole}' has level ${userLevel}.`
    });
  }

  // Standard role list check — also allows any role with HIGHER level
  // e.g. authorize('nurse') also allows doctor, facility_admin, super_admin
  const minRequired = Math.min(...roles.map(r => getRoleLevel(r)));

  // Check: user's role is in the explicit list OR user has higher-level role
  const allowed = roles.includes(userRole) || userLevel > minRequired;

  if (!allowed) {
    logger.warn(`[Auth] Forbidden: role '${userRole}' (level ${userLevel}) tried to access route requiring: [${roles.join(', ')}]`);
    return res.status(403).json({
      success: false,
      message: `Role '${userRole}' is not permitted to access this resource.`
    });
  }

  next();
};

/**
 * authorizeLevel(n) — shorthand: allow any role at level n or above
 * e.g. authorizeLevel(5) allows nurse, doctor, facility_admin, super_admin
 */
const authorizeLevel = (minLevel) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Not authenticated.' });
  }
  const userLevel = getRoleLevel(req.user.role);
  if (userLevel >= minLevel) return next();
  return res.status(403).json({
    success: false,
    message: `Requires permission level ${minLevel}. Your role '${req.user.role}' has level ${userLevel}.`
  });
};

/**
 * isSuperAdmin — middleware: only super_admin or admin
 */
const isSuperAdmin = (req, res, next) => {
  if (getRoleLevel(req.user?.role) >= 10) return next();
  return res.status(403).json({ success: false, message: 'Super admin access required.' });
};

/**
 * isFacilityAdmin — middleware: facility_admin and above
 */
const isFacilityAdmin = (req, res, next) => {
  if (getRoleLevel(req.user?.role) >= 8) return next();
  return res.status(403).json({ success: false, message: 'Facility admin access required.' });
};

/**
 * isStaff — middleware: any staff role (not patient)
 */
const isStaff = (req, res, next) => {
  if (getRoleLevel(req.user?.role) >= 4) return next();
  return res.status(403).json({ success: false, message: 'Staff access required.' });
};

module.exports = {
  protect,
  authorize,
  authorizeLevel,
  isSuperAdmin,
  isFacilityAdmin,
  isStaff,
  getRoleLevel,
  ROLE_HIERARCHY,
};
