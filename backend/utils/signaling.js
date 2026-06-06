'use strict';
/**
 * utils/signaling.js
 * WebRTC signaling server using Socket.io.
 * Each telemedicine room = appointment ID.
 */
const logger = require('./logger');

function initSignaling(server) {
  const { Server } = require('socket.io');
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET','POST']
    }
  });

  // Track who is in each room
  const rooms = {};

  io.on('connection', socket => {
    logger.info(`Socket connected: ${socket.id}`);

    // Join a telemedicine room (roomId = appointmentId)
    socket.on('join-room', ({ roomId, userId, userName, role }) => {
      socket.join(roomId);
      if (!rooms[roomId]) rooms[roomId] = [];
      rooms[roomId].push({ socketId: socket.id, userId, userName, role });
      logger.info(`${userName} (${role}) joined room ${roomId}`);

      // Tell everyone else in the room about the new peer
      socket.to(roomId).emit('peer-joined', { socketId: socket.id, userId, userName, role });

      // Tell the new peer who is already in the room
      const others = rooms[roomId].filter(p => p.socketId !== socket.id);
      socket.emit('room-peers', others);
    });

    // WebRTC offer
    socket.on('offer', ({ to, offer }) => {
      socket.to(to).emit('offer', { from: socket.id, offer });
    });

    // WebRTC answer
    socket.on('answer', ({ to, answer }) => {
      socket.to(to).emit('answer', { from: socket.id, answer });
    });

    // ICE candidate
    socket.on('ice-candidate', ({ to, candidate }) => {
      socket.to(to).emit('ice-candidate', { from: socket.id, candidate });
    });

    // Chat message within room
    socket.on('chat-message', ({ roomId, message, userName }) => {
      io.to(roomId).emit('chat-message', { userName, message, time: new Date().toISOString() });
    });

    // End call
    socket.on('end-call', ({ roomId }) => {
      socket.to(roomId).emit('call-ended');
    });

    // Disconnect
    socket.on('disconnect', () => {
      for (const roomId in rooms) {
        const before = rooms[roomId].length;
        rooms[roomId] = rooms[roomId].filter(p => p.socketId !== socket.id);
        if (rooms[roomId].length < before) {
          socket.to(roomId).emit('peer-left', { socketId: socket.id });
          if (rooms[roomId].length === 0) delete rooms[roomId];
        }
      }
      logger.info(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
}

module.exports = { initSignaling };
