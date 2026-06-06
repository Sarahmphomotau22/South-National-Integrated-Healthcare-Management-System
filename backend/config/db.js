'use strict';
/**
 * config/db.js
 * Tries multiple connection strategies in order:
 *   1. Direct port 27017 (standard)
 *   2. Direct port 27017 with different SSL options
 *   3. Connection via port 443 (always open through firewalls)
 */
const mongoose = require('mongoose');
const logger   = require('../utils/logger');

// Your exact shard hostnames from nslookup
const SHARD_HOSTS_27017 = [
  'ac-hrstpxa-shard-00-00.gwti7gs.mongodb.net:27017',
  'ac-hrstpxa-shard-00-01.gwti7gs.mongodb.net:27017',
  'ac-hrstpxa-shard-00-02.gwti7gs.mongodb.net:27017',
].join(',');

const SHARD_HOSTS_443 = [
  'ac-hrstpxa-shard-00-00.gwti7gs.mongodb.net:443',
  'ac-hrstpxa-shard-00-01.gwti7gs.mongodb.net:443',
  'ac-hrstpxa-shard-00-02.gwti7gs.mongodb.net:443',
].join(',');

const REPLICA_SET   = 'atlas-gwti7gs-shard-0';
const BASE_QS       = `ssl=true&replicaSet=${REPLICA_SET}&authSource=admin&retryWrites=true&w=majority`;

function extractCreds(uri) {
  // Works for both mongodb+srv:// and mongodb://
  const m = uri.match(/^mongodb(?:\+srv)?:\/\/([^:]+):([^@]+)@/);
  if (!m) return null;
  return { user: m[1], pass: encodeURIComponent(decodeURIComponent(m[2])) };
}

function buildUri(hosts, creds) {
  return `mongodb://${creds.user}:${creds.pass}@${hosts}/nihms?${BASE_QS}`;
}

async function tryConnect(uri, label, extraOpts = {}) {
  try {
    logger.info(`Trying ${label}…`);
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 12000,
      connectTimeoutMS:         12000,
      socketTimeoutMS:          30000,
      family: 4,
      ...extraOpts,
    });
    logger.info(`MongoDB connected via ${label}`);
    return true;
  } catch (err) {
    logger.warn(`${label} failed: ${err.message.split('\n')[0]}`);
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
    return false;
  }
}

async function connectDB() {
  const uri = process.env.MONGO_URI;

  if (!uri || uri.includes('YOUR_') ) {
    logger.error('MONGO_URI not set properly in .env'); process.exit(1);
  }

  const creds = extractCreds(uri);
  if (!creds) {
    logger.error('Could not parse credentials from MONGO_URI'); process.exit(1);
  }

  // ── Strategy 1: URI exactly as given in .env ──
  if (await tryConnect(uri, 'URI from .env')) return;

  // ── Strategy 2: Direct port 27017 with explicit hosts ──
  if (await tryConnect(buildUri(SHARD_HOSTS_27017, creds), 'direct port 27017')) return;

  // ── Strategy 3: Port 443 (bypasses firewalls that block 27017) ──
  if (await tryConnect(buildUri(SHARD_HOSTS_443, creds), 'direct port 443')) return;

  // ── Strategy 4: Port 27017 with tls instead of ssl param ──
  const tlsUri = `mongodb://${creds.user}:${creds.pass}@${SHARD_HOSTS_27017}/nihms?tls=true&replicaSet=${REPLICA_SET}&authSource=admin`;
  if (await tryConnect(tlsUri, 'TLS port 27017')) return;

  logger.error('\n─────────────────────────────────────────────────');
  logger.error('All connection strategies failed.');
  logger.error('\nYour router is likely blocking port 27017.');
  logger.error('\nTo fix permanently:');
  logger.error('  Option A: Use your phone as a hotspot, run seed once, then switch back');
  logger.error('  Option B: In your router admin (192.168.18.1) — open outbound port 27017');
  logger.error('  Option C: Use MongoDB Compass with SSH tunnel');
  logger.error('─────────────────────────────────────────────────\n');
  process.exit(1);
}

module.exports = connectDB;
