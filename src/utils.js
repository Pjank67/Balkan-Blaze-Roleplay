const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('./config');

const COLOR = {
  main: 0xff6b00, // Blaze Roleplay narandžasta
  success: 0x57f287,
  danger: 0xed4245,
  warning: 0xfee75c,
  info: 0x5865f2,
  dark: 0x2b2d31
};

// Da li je član "osobolje" (ima Manage Server ILI neku od staff rola)
function isStaff(member) {
  if (!member) return false;
  if (typeof member.permissions?.has === 'function' && member.permissions.has(PermissionFlagsBits.ManageGuild)) {
    return true;
  }

  const staffIds = config.staffRoleIds ?? [];
  for (const roleId of staffIds) {
    if (!roleId) continue;
    if (member.roles?.cache?.has?.(roleId)) return true;
    if (Array.isArray(member.roles) && member.roles.includes(roleId)) return true;
  }

  const single = config.staffRoleId;
  if (single) {
    if (member.roles?.cache?.has?.(single)) return true;
    if (Array.isArray(member.roles) && member.roles.includes(single)) return true;
  }

  return false;
}

// Formatira trajanje: 90061000 -> "1d 1h 1m"
function formatDuration(ms) {
  if (!Number.isFinite(ms) || ms < 0) return '—';
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts = [];
  if (days) parts.push(`${days}d`);
  if (hours) parts.push(`${hours}h`);
  if (minutes) parts.push(`${minutes}m`);
  if (!days && !hours) parts.push(`${seconds}s`);
  return parts.join(' ');
}

// Parsira trajanje iz teksta: "1h30m", "2d", "45m" -> ms (null ako nije validno)
function parseDuration(input) {
  if (!input) return null;
  const regex = /(\d+)\s*(d|h|m|s)/gi;
  let total = 0;
  let matched = false;

  let match;
  while ((match = regex.exec(input)) !== null) {
    matched = true;
    const value = Number(match[1]);
    const unit = match[2].toLowerCase();
    if (unit === 'd') total += value * 86400000;
    if (unit === 'h') total += value * 3600000;
    if (unit === 'm') total += value * 60000;
    if (unit === 's') total += value * 1000;
  }

  return matched && total > 0 ? total : null;
}

function truncate(text, max = 1024) {
  const str = String(text ?? '');
  return str.length > max ? `${str.slice(0, max - 3)}...` : str;
}

function ticketTypeLabel(value) {
  return config.ticketTypes.find((t) => t.value === value)?.label ?? value ?? '—';
}

// Standardni embed sa brendiranim footerom
function brandEmbed({ title, description, color = COLOR.main, fields = [], footer = null, url = null } = {}) {
  const embed = new EmbedBuilder()
    .setColor(color)
    .setFooter({
      text: `${config.serverName}${footer ? ` • ${footer}` : ''}`,
      iconURL: undefined
    })
    .setTimestamp();

  if (title) embed.setTitle(title);
  if (description) embed.setDescription(description);
  if (url) embed.setURL(url);
  if (fields.length) embed.addFields(fields);
  return embed;
}

// Pošalji embed u kanal po ID-ju (tiho preskoči ako nije podešeno)
async function sendToChannel(guild, channelId, payload) {
  if (!channelId) return null;
  try {
    const channel =
      guild.channels.cache.get(channelId) ??
      (await guild.channels.fetch(channelId).catch(() => null));

    if (!channel?.isTextBased()) return null;
    return await channel.send(payload);
  } catch (err) {
    console.warn(`⚠️ Ne mogu da pošaljem u kanal ${channelId}:`, err.message);
    return null;
  }
}

// Log u moderacijski kanal
async function sendModLog(guild, { title, color = COLOR.warning, fields = [], description = null }) {
  if (!config.modLogChannelId) return;
  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setFooter({ text: config.serverName })
    .setTimestamp();
  if (description) embed.setDescription(description);
  if (fields.length) embed.addFields(fields);
  await sendToChannel(guild, config.modLogChannelId, { embeds: [embed] });
}

// Link ka kanalu (radi u browseru i Discord aplikaciji)
function channelLink(guildId, channelId) {
  return `https://discord.com/channels/${guildId}/${channelId}`;
}

module.exports = {
  COLOR,
  isStaff,
  formatDuration,
  parseDuration,
  truncate,
  ticketTypeLabel,
  brandEmbed,
  sendToChannel,
  sendModLog,
  channelLink
};
