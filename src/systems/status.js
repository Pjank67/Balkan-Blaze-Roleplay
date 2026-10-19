const db = require('../db');
const config = require('../config');
const { getServerStatus, buildStatusEmbed } = require('../fivem');
const { COLOR, brandEmbed } = require('../utils');

let interval = null;
let updating = false;

async function updateStatus(client) {
  if (updating) return;
  updating = true;

  try {
    const saved = db.get('status', { channelId: null, messageId: null });
    if (!saved.channelId || !saved.messageId) return;

    const channel = await client.channels.fetch(saved.channelId).catch(() => null);
    if (!channel?.isTextBased()) return;

    const message = await channel.messages.fetch(saved.messageId).catch(() => null);
    if (!message) {
      db.set('status', { channelId: null, messageId: null });
      return;
    }

    const status = await getServerStatus();
    await message.edit({ embeds: [buildStatusEmbed(status)] }).catch(() => {});
  } catch (err) {
    console.warn('⚠️ Status update greška:', err.message);
  } finally {
    updating = false;
  }
}

function startStatusUpdater(client) {
  if (interval) clearInterval(interval);
  interval = setInterval(() => updateStatus(client), 60000);
  updateStatus(client).catch(() => {});
}

// Postavi (ili zameni) live status poruku
async function postStatusPanel(channel) {
  const status = await getServerStatus();
  const message = await channel.send({ embeds: [buildStatusEmbed(status)] });

  db.set('status', { channelId: channel.id, messageId: message.id });
  startStatusUpdater(channel.client);

  return message;
}

// Embed za /status komandu (jednokratno)
function statusInfoEmbed(status) {
  if (!status.online) {
    return brandEmbed({
      title: '🔴 Server je offline',
      description: `Ne mogu da se povežem na \`${config.fivemHost}:${config.fivemPort}\`.\n\`${status.error ?? ''}\``,
      color: COLOR.danger,
      footer: 'status'
    });
  }

  return buildStatusEmbed(status);
}

module.exports = { startStatusUpdater, postStatusPanel, updateStatus, statusInfoEmbed };
