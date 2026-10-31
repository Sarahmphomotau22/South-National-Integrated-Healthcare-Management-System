'use strict';
/**
 * routes/messages.js
 * Internal staff messaging — mount at /api/v1/messages
 */
const express = require('express');
const router  = express.Router();
const mongoose = require('mongoose');
const { protect } = require('../middleware/auth');
const Message = require('../models/Message');
const logger  = require('../utils/logger');

router.use(protect);

/* ─────────────────────────────────────────────────────────────────────────────
   GET /api/v1/messages
   Query params:
     recipientRole  — filter by role (e.g. RECEPTIONIST)
     recipientId    — filter by specific user ID
     senderRole     — filter sent messages by role
     senderId       — filter sent messages by user ID
     limit          — max results (default 50)
     skip           — offset for pagination
     threadId       — fetch replies in a thread
───────────────────────────────────────────────────────────────────────────── */
router.get('/', async (req, res, next) => {
  try {
    const {
      recipientRole, recipientId,
      senderRole, senderId,
      threadId, limit = 50, skip = 0,
    } = req.query;

    const filter = {};

    // Thread view — fetch root message + all replies in a thread
    if (threadId) {
      const tid = mongoose.Types.ObjectId.isValid(threadId)
        ? new mongoose.Types.ObjectId(threadId) : null;
      filter.$or = [
        { _id: tid },
        { threadId: tid },
      ];
    } else {
      // ── Recipient filter ──────────────────────────────────────────────────────
      // When both recipientId and recipientRole are provided, match either
      // (a message may be addressed by ID only, or by role only, or both).
      const recipClauses = [];
      if (recipientId && mongoose.Types.ObjectId.isValid(recipientId)) {
        recipClauses.push({ recipientId: new mongoose.Types.ObjectId(recipientId) });
      }
      if (recipientRole) {
        recipClauses.push({ recipientRole: recipientRole });
      }
      if (recipClauses.length === 1) {
        Object.assign(filter, recipClauses[0]);
      } else if (recipClauses.length === 2) {
        filter.$or = recipClauses;
      }

      // ── Sender filter (sent-folder queries) ──────────────────────────────────
      if (senderRole) filter.senderRole = senderRole;
      if (senderId && mongoose.Types.ObjectId.isValid(senderId)) {
        filter.senderId = new mongoose.Types.ObjectId(senderId);
      }

      // ── Exclude soft-deleted messages ────────────────────────────────────────
      // (threadId: null/$exists check removed — it excluded valid root messages
      //  saved with threadId:null by Mongoose)
      filter.deletedBySender    = { $ne: true };
      filter.deletedByRecipient = { $ne: true };
    }

    const msgs = await Message.find(filter)
      .sort({ sentAt: -1 })
      .skip(Number(skip))
      .limit(Math.min(Number(limit), 200))
      .lean();

    // Shape for frontend
    const shaped = msgs.map(m => ({
      id:          m._id,
      _id:         m._id,
      senderId:    m.senderId,
      from:        m.senderName,
      fromRole:    m.senderRole,
      role:        m.senderRole,
      recipientId: m.recipientId,
      to:          m.recipientName || m.recipientRole,
      recipientRole: m.recipientRole,
      subject:     m.subject || '(No subject)',
      body:        m.body,
      text:        m.body,
      priority:    m.priority || 'Normal',
      status:      m.status,
      readStatus:  m.readStatus,
      unread:      m.readStatus === 'unread',
      time:        new Date(m.sentAt).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' }),
      sentAt:      m.sentAt,
      threadId:    m.threadId,
      createdAt:   m.createdAt,
    }));

    res.json({ success: true, data: shaped, total: shaped.length });
  } catch (err) { next(err); }
});

/* ─────────────────────────────────────────────────────────────────────────────
   POST /api/v1/messages
   Create a new message (or reply)
───────────────────────────────────────────────────────────────────────────── */
router.post('/', async (req, res, next) => {
  try {
    const {
      senderRole, senderName,
      recipientRole, recipientId, recipientName,
      subject, body,
      priority = 'Normal',
      threadId, replyTo,
      sentAt,
    } = req.body;

    if (!senderName || !senderRole) {
      return res.status(422).json({ success: false, message: 'senderName and senderRole are required.' });
    }
    if (!body || !body.trim()) {
      return res.status(422).json({ success: false, message: 'Message body is required.' });
    }
    if (!recipientRole && !recipientId) {
      return res.status(422).json({ success: false, message: 'recipientRole or recipientId is required.' });
    }

    const msg = await Message.create({
      senderId:      req.user?._id || null,
      senderName:    senderName.trim(),
      senderRole,
      recipientId:   recipientId && mongoose.Types.ObjectId.isValid(recipientId)
                       ? new mongoose.Types.ObjectId(recipientId) : undefined,
      recipientRole: recipientRole || undefined,
      recipientName: recipientName || recipientRole || undefined,
      subject:       (subject || '(No subject)').trim(),
      body:          body.trim(),
      priority,
      status:        'sent',
      readStatus:    'unread',
      sentAt:        sentAt ? new Date(sentAt) : new Date(),
      threadId:      threadId && mongoose.Types.ObjectId.isValid(threadId)
                       ? new mongoose.Types.ObjectId(threadId) : undefined,
      replyTo:       replyTo && mongoose.Types.ObjectId.isValid(replyTo)
                       ? new mongoose.Types.ObjectId(replyTo) : undefined,
    });

    logger.info(`[Messages] New message from ${senderRole} → ${recipientRole || recipientId}: "${subject}"`);
    res.status(201).json({ success: true, data: msg });
  } catch (err) { next(err); }
});

/* ─────────────────────────────────────────────────────────────────────────────
   PATCH /api/v1/messages/:id/read
   Mark a message as read
───────────────────────────────────────────────────────────────────────────── */
router.patch('/:id/read', async (req, res, next) => {
  try {
    const msg = await Message.findByIdAndUpdate(
      req.params.id,
      { readStatus: 'read', status: 'read', readAt: new Date() },
      { new: true }
    );
    if (!msg) return res.status(404).json({ success: false, message: 'Message not found.' });
    res.json({ success: true, data: msg });
  } catch (err) { next(err); }
});

/* ─────────────────────────────────────────────────────────────────────────────
   DELETE /api/v1/messages/:id
   Soft-delete for the requesting role
───────────────────────────────────────────────────────────────────────────── */
router.delete('/:id', async (req, res, next) => {
  try {
    const msg = await Message.findById(req.params.id);
    if (!msg) return res.status(404).json({ success: false, message: 'Message not found.' });

    const userRole = req.user?.role?.toUpperCase();
    if (userRole === msg.senderRole) {
      msg.deletedBySender = true;
    } else {
      msg.deletedByRecipient = true;
    }
    await msg.save();
    res.json({ success: true, message: 'Message deleted.' });
  } catch (err) { next(err); }
});

module.exports = router;
