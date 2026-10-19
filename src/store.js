const db = require('./db');

// ============ TIKETI ============

function getTickets() {
  return db.get('tickets', { counter: 0, open: {} });
}

function key(guildId, userId) {
  return `${guildId}:${userId}`;
}

// Sledeći redni broj tiketa
function nextNumber() {
  return db.update('tickets', (data) => {
    data.counter = (data.counter ?? 0) + 1;
    return data;
  }).counter;
}

// Podigni brojač ako je na serveru već postojao tiket sa većim brojem
function setCounterAtLeast(number) {
  db.update('tickets', (data) => {
    if ((data.counter ?? 0) < Number(number)) data.counter = Number(number);
    return data;
  });
}

function getOpenTicket(guildId, userId) {
  return getTickets().open[key(guildId, userId)] ?? null;
}

function setOpenTicket(guildId, userId, ticket) {
  db.update('tickets', (data) => {
    data.open[key(guildId, userId)] = { userId, ...ticket };
    return data;
  });
}

function updateTicket(guildId, userId, patch) {
  let result = null;
  db.update('tickets', (data) => {
    const k = key(guildId, userId);
    if (data.open[k]) {
      data.open[k] = { ...data.open[k], ...patch };
      result = data.open[k];
    }
    return data;
  });
  return result;
}

function removeTicket(guildId, userId) {
  db.update('tickets', (data) => {
    delete data.open[key(guildId, userId)];
    return data;
  });
}

function findByChannel(guildId, channelId) {
  const data = getTickets();
  const prefix = `${guildId}:`;
  for (const [k, ticket] of Object.entries(data.open)) {
    if (k.startsWith(prefix) && ticket.channelId === channelId) {
      return { userId: k.slice(prefix.length), ...ticket };
    }
  }
  return null;
}

function countOpenTickets(guildId) {
  return Object.keys(getTickets().open).filter((k) => k.startsWith(`${guildId}:`)).length;
}

// ---------- Tema (topic) kanala kao rezervna baza ----------
// Format: "Tiket #0001 | 123456789012345678 | podrska | 1729330000000 | -"
function buildTopic(ticket) {
  const number = String(ticket.number ?? 0).padStart(4, '0');
  return `Tiket #${number} | ${ticket.userId} | ${ticket.type} | ${ticket.createdAt} | ${ticket.claimedBy ?? '-'}`;
}

function parseTopic(topic) {
  if (!topic) return null;
  const match = topic.match(
    /^Tiket #(\d{4,})\s*\|\s*(\d{15,22})\s*\|\s*([^|]+?)\s*\|\s*(\d{10,16})\s*\|\s*(\d{15,22}|-)\s*$/
  );
  if (!match) return null;

  return {
    number: Number(match[1]),
    userId: match[2],
    type: match[3].trim(),
    createdAt: Number(match[4]),
    claimedBy: match[5] === '-' ? null : match[5]
  };
}

module.exports = {
  nextNumber,
  setCounterAtLeast,
  getOpenTicket,
  setOpenTicket,
  updateTicket,
  removeTicket,
  findByChannel,
  countOpenTickets,
  buildTopic,
  parseTopic,
  DATA_DIR: db.DATA_DIR
};
