const fs = require('fs');
const path = require('path');

// Na Renderu je fajl sistem efemeran (briše se pri svakom deployu).
// Ako imaš persistent disk, postavi DATA_DIR (npr. /var/data).
const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

const DEFAULTS = {
  settings: {},
  tickets: { counter: 0, open: {} },
  applications: { counter: 0, byUser: {} },
  suggestions: { counter: 0, byMessage: {} },
  giveaways: {},
  reactionroles: [],
  tempvoice: { rooms: {} },
  status: { channelId: null, messageId: null },
  verified: {}
};

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function ensureFile() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(DEFAULTS, null, 2));
  }
}

function read() {
  try {
    ensureFile();
    const parsed = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    return { ...clone(DEFAULTS), ...parsed };
  } catch (err) {
    console.warn('⚠️ Ne mogu da pročitam bazu, koristim praznu:', err.message);
    return clone(DEFAULTS);
  }
}

function write(data) {
  try {
    ensureFile();
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.warn('⚠️ Ne mogu da sačuvam bazu:', err.message);
  }
}

function get(key, fallback = null) {
  const data = read();
  return data[key] ?? fallback;
}

function set(key, value) {
  const data = read();
  data[key] = value;
  write(data);
  return value;
}

function update(key, updater) {
  const data = read();
  const next = updater(data[key] ?? clone(DEFAULTS[key]));
  data[key] = next;
  write(data);
  return next;
}

module.exports = { get, set, update, read, write, DATA_DIR, DB_FILE };
