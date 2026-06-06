'use strict';

const { validationResult } = require('express-validator');

/**
 * Runs after express-validator checks.
 * Returns 422 with all validation errors if any exist.
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      message: errors.array().map(e => e.msg).join('. '),
      errors:  errors.array()
    });
  }
  next();
};

module.exports = validate;
