const { PermissionFlagsBits } = require('discord.js');
const config = require('../config');
const { COLOR, isStaff, sendToChannel } = require('../utils');
const badwords = require('../data/badwords');

const spamMap = new Map(); // userId -> [timestamp]
const lastMessages = new Map(); // userId -> [{content, at}]
const punishHistory = new Map(); // userId -> [timestamp kazni]

const INVITE_REGEX = /(discord\.(gg|com\/invite|app\.com\/invite)|discordapp\.com\/invite)\/[a-z0-9-]+/i;
const LINK_REGEX = /https?:\/\/[^\s]+/i;
const EMOJI_REGEX = /\p{Extended_Pictographic}/gu;
const CUSTOM_EMOJI_REGEX = /<a?:\w+:\d+>/g;
const ZALGO_REGEX = /[\u0300-\u036f\u0489]/g;

// ---------- Normalizacija (leetspeak + dijakritika) ----------
function normalize(text) {
  return text
    .toLowerCase()
    .replace(/[čć]/g, 'c')
    .replace(/š/g, 's')
    .replace(/ž/g, 'z')
    .replace(/đ/g, 'd')
    .replace(/0/g, 'o')
    .replace(/1/g, 'i')
    .replace(/3/g, 'e')
    .replace(/4/g, 'a')
    .replace(/5/g, 's')
    .replace(/7/g, 't')
    .replace(/@/g, 'a')
    .replace(/\$/g, 's')
    .replace(/[!|]/g, 'i');
}

function containsBadword(text) {
  const norm = ` ${normalize(text).replace(/[^a-z0-9]+/g, ' ')} `;
  return badwords.some((word) => norm.includes(` ${normalize(word)} `));
}

function linkAllowed(url) {
  const domains = config.automod.allowedDomains ?? [];
  if (!domains.length) return false;

  try {
    const host = new URL(url).hostname.toLowerCase();
    return domains.some((d) => host === d || host.endsWith(`.${d}`));
  } catch {
    return false;
  }
}

// ---------- ANALIZA (bez brisanja) ----------
function analyze(content, { mentionCount = 0, isEveryonePing = false } = {}) {
  const text = String(content ?? '');
  const reasons = [];

  if (!config.automod.enabled) {
    return { reasons: [], note: 'Automod je isključen (AUTOMOD_ENABLED=false).' };
  }

  // 1) Discord pozivnice
  if (config.automod.invites && INVITE_REGEX.test(text)) {
    reasons.push({ rule: 'invites', label: 'Discord pozivnica', action: 'brisanje + upozorenje' });
  }

  // 2) Linkovi (osim dozvoljenih domena)
  if (config.automod.links) {
    const urls = text.match(/https?:\/\/[^\s]+/g) ?? [];
    const blocked = urls.filter((u) => !linkAllowed(u));

    if (blocked.length) {
      reasons.push({
        rule: 'links',
        label: `Nedozvoljen link (${blocked[0].slice(0, 40)}...)`,
        action: 'brisanje + upozorenje'
      });
    }
  }

  // 3) Psovke (i leetspeak varijante)
  if (config.automod.badwords && containsBadword(text)) {
    reasons.push({ rule: 'badwords', label: 'Nedozvoljena reč', action: 'brisanje + upozorenje' });
  }

  // 4) Mass mention
  if (config.automod.mentions && mentionCount > 5) {
    reasons.push({
      rule: 'mentions',
      label: `Previše mentiona (${mentionCount})`,
      action: 'brisanje + upozorenje'
    });
  }

  // 5) @everyone / @here
  if (config.automod.everyonePing && isEveryonePing) {
    reasons.push({ rule: 'everyone', label: '@everyone / @here ping', action: 'brisanje + upozorenje' });
  }

  // 6) Emoji spam
  if (config.automod.emojis) {
    const emojis = text.match(EMOJI_REGEX)?.length ?? 0;
    const custom = text.match(CUSTOM_EMOJI_REGEX)?.length ?? 0;

    if (emojis > 8 || custom > 5) {
      reasons.push({
        rule: 'emojis',
        label: `Emoji spam (${emojis + custom})`,
        action: 'brisanje + upozorenje'
      });
    }
  }

  // 7) Newline spam
  if (config.automod.newlines) {
    const newlines = (text.match(/\n/g) ?? []).length;
    if (newlines > 10 || text.length > 1800) {
      reasons.push({ rule: 'newlines', label: 'Previše novih redova / predugačko', action: 'brisanje' });
    }
  }

  // 8) Ponavljanje istog karaktera
  if (config.automod.repeated) {
    const match = text.match(/(.)\1{12,}/u);
    if (match) {
      reasons.push({ rule: 'repeated', label: 'Ponavljanje istog karaktera', action: 'brisanje' });
    }
  }

  // 9) Zalgo / unicode abuse
  if (config.automod.zalgo) {
    const zalgo = text.match(ZALGO_REGEX)?.length ?? 0;
    if (zalgo > 15) {
      reasons.push({ rule: 'zalgo', label: 'Zalgo / Unicode abuse', action: 'brisanje' });
    }
  }

  // 10) CAPS LOCK
  if (config.automod.caps) {
    const letters = text.replace(/[^a-zA-ZčćžšđČĆŽŠĐ]/g, '');
    const upper = text.replace(/[^A-ZČĆŽŠĐ]/g, '');
    if (letters.length > 15 && upper.length / letters.length > 0.7) {
      reasons.push({ rule: 'caps', label: 'Previše velikih slova', action: 'brisanje + upozorenje' });
    }
  }

  return { reasons };
}

// ---------- LOG ----------
async function automodLog(guild, fields, color = COLOR.warning, title = '🤖 Automod') {
  const channelId = config.automodLogChannelId ?? config.modLogChannelId;
  if (!channelId) return;

  await sendToChannel(guild, channelId, {
    embeds: [
      {
        color,
        title,
        fields,
        timestamp: new Date().toISOString(),
        footer: { text: `${config.serverName} • automod` }
      }
    ]
  });
}

// ---------- AKCIJE ----------
async function warnAndDelete(message, reason) {
  try {
    await message.delete();
  } catch {
    // nema dozvole
  }

  try {
    const warning = await message.channel.send({
      content: `⚠️ ${message.author}, tvoja poruka je obrisana — **${reason}**.`
    });
    setTimeout(() => warning.delete().catch(() => {}), 5000);
  } catch {
    // ignore
  }

  await automodLog(message.guild, [
    { name: 'Korisnik', value: `${message.author.tag} (${message.author.id})`, inline: true },
    { name: 'Kanal', value: `${message.channel}`, inline: true },
    { name: 'Razlog', value: reason },
    { name: 'Sadržaj', value: message.content ? message.content.slice(0, 1024) : '—' }
  ]);
}

// Eskalacija: 1. prekršaj 5 min, ponovo u 10 min -> 30 min, 3. -> 1h
function spamPunishmentMs(userId) {
  const now = Date.now();
  const history = (punishHistory.get(userId) ?? []).filter((t) => now - t < 10 * 60 * 1000);
  history.push(now);
  punishHistory.set(userId, history);

  if (history.length >= 3) return 60 * 60 * 1000;
  if (history.length === 2) return 30 * 60 * 1000;
  return 5 * 60 * 1000;
}

async function timeoutUser(message, ms, reason) {
  const member = message.member;
  const me = message.guild.members.me;

  const canTimeout =
    me?.permissions.has(PermissionFlagsBits.ModerateMembers) && member?.moderatable;

  if (canTimeout) {
    await member.timeout(ms, `Automod: ${reason}`).catch(() => {});
    return true;
  }

  return false;
}

// ---------- GLAVNI HANDLER ----------
async function handleMessage(message) {
  if (!config.automod.enabled) return;
  if (!message.inGuild() || message.author.bot) return;
  if (!message.content) return;

  const member = message.member;
  if (config.automod.bypassStaff && isStaff(member)) return;

  const content = message.content;
  const userId = message.author.id;

  // --- 1-10: analiza sadržaja ---
  const isEveryonePing =
    content.includes('@everyone') || content.includes('@here');

  const { reasons } = analyze(content, {
    mentionCount: message.mentions.users.size,
    isEveryonePing
  });

  if (reasons.length) {
    const labels = {
      invites: 'reklamiranje Discord servera nije dozvoljeno',
      links: 'slanje linkova nije dozvoljeno',
      badwords: 'nedozvoljene reči',
      mentions: 'previše označenih korisnika',
      everyone: 'nema @everyone / @here pingova',
      emojis: 'previše emojija',
      newlines: 'previše novih redova',
      repeated: 'ponavljanje istih karaktera',
      zalgo: 'nedozvoljeni unicode karakteri',
      caps: 'previše velikih slova'
    };

    await warnAndDelete(message, labels[reasons[0].rule] ?? reasons[0].label);
    return;
  }

  // --- 11: duplirane poruke ---
  if (config.automod.duplicates) {
    const now = Date.now();
    const history = (lastMessages.get(userId) ?? []).filter((m) => now - m.at < 15000);
    const normalized = normalize(content).replace(/\s+/g, ' ').trim();

    history.push({ content: normalized, at: now });
    lastMessages.set(userId, history);

    const same = history.filter((m) => m.content === normalized).length;
    if (same >= 3 && normalized.length > 3) {
      lastMessages.delete(userId);

      const ms = spamPunishmentMs(userId);
      const timedOut = await timeoutUser(message, ms, 'ponavljanje istih poruka');

      try {
        const warning = await message.channel.send({
          content: `🚫 ${message.author} — ne ponavljaj iste poruke.${
            timedOut ? ` Utišan/a na **${Math.round(ms / 60000)} min**.` : ''
          }`
        });
        setTimeout(() => warning.delete().catch(() => {}), 6000);
      } catch {
        // ignore
      }

      await automodLog(
        message.guild,
        [
          { name: 'Korisnik', value: `${message.author.tag} (${userId})`, inline: true },
          { name: 'Kanal', value: `${message.channel}`, inline: true },
          { name: 'Razlog', value: 'Duplirane poruke' },
          { name: 'Akcija', value: timedOut ? `Timeout ${Math.round(ms / 60000)} min` : 'Upozorenje' }
        ],
        COLOR.danger,
        '🤖 Automod — duplirane poruke'
      );
      return;
    }
  }

  // --- 12: spam (mnogo poruka u kratkom vremenu) ---
  if (config.automod.spam) {
    const now = Date.now();
    const recent = (spamMap.get(userId) ?? []).filter((t) => now - t < 5000);
    recent.push(now);
    spamMap.set(userId, recent);

    if (recent.length >= 6) {
      spamMap.delete(userId);

      const ms = spamPunishmentMs(userId);
      const timedOut = await timeoutUser(message, ms, 'spam');

      // obriši njegove poruke iz zadnjeg minuta
      try {
        const recentMsgs = await message.channel.messages.fetch({ limit: 20 });
        const mine = recentMsgs.filter(
          (m) => m.author.id === userId && Date.now() - m.createdTimestamp < 60000
        );
        if (mine.size > 1) await message.channel.bulkDelete(mine, true);
      } catch {
        // ignore
      }

      try {
        const warning = await message.channel.send({
          content: `🚫 ${message.author} je utišan/a na **${Math.round(ms / 60000)} min** zbog spama.`
        });
        setTimeout(() => warning.delete().catch(() => {}), 6000);
      } catch {
        // ignore
      }

      await automodLog(
        message.guild,
        [
          { name: 'Korisnik', value: `${message.author.tag} (${userId})`, inline: true },
          { name: 'Kanal', value: `${message.channel}`, inline: true },
          { name: 'Razlog', value: 'Spam (6+ poruka / 5s)' },
          { name: 'Akcija', value: timedOut ? `Timeout ${Math.round(ms / 60000)} min` : 'Upozorenje' }
        ],
        COLOR.danger,
        '🤖 Automod — spam'
      );
    }
  }
}

// ---------- ANTI-RAID (mnogo ulazaka odjednom) ----------
const joinTimes = [];

async function handleMemberJoin(member) {
  if (!config.automod.enabled || !config.automod.raid) return;

  const now = Date.now();
  joinTimes.push(now);

  while (joinTimes.length && now - joinTimes[0] > 15000) joinTimes.shift();

  if (joinTimes.length >= 8) {
    joinTimes.length = 0;

    await automodLog(
      member.guild,
      [
        { name: '⚠️ Upozorenje', value: '**Moguć raid** — 8+ novih članova u 15 sekundi.' },
        { name: 'Poslednji član', value: `${member.user.tag} (${member.id})` },
        { name: 'Preporuka', value: 'Proveri nove članove i razmisli o podizanju nivoa verifikacije.' }
      ],
      COLOR.danger,
      '🚨 Automod — anti-raid'
    );
  }
}

module.exports = { handleMessage, handleMemberJoin, analyze };
