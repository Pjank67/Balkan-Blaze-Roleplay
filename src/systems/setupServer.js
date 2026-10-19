const fs = require('fs');
const path = require('path');
const { ChannelType, PermissionFlagsBits: P } = require('discord.js');
const db = require('../db');
const config = require('../config');

// ============================================================
//  BLAZE ROLEPLAY — STRUKTURA U STILU VELIKIH RP SERVERA
// ============================================================

const ROLES = [
  { key: 'unverifiedRoleId', name: '🕐 Neverifikovan', color: 0x808080, hoist: false },
  { key: 'memberRoleId', name: '✅ Verifikovan', color: 0x57f287, hoist: false },
  { key: 'citizenRoleId', name: '👤 Građanin', color: 0x5865f2, hoist: false },
  { key: 'lspdRoleId', name: '👮 LSPD', color: 0x1f4fa0, hoist: true },
  { key: 'emsRoleId', name: '🚑 EMS', color: 0xe74c3c, hoist: true },
  { key: 'mechanicRoleId', name: '🔧 Mehanicar', color: 0xe67e22, hoist: true },
  { key: 'newsRoleId', name: '📰 Novinar', color: 0x9b59b6, hoist: true },
  { key: 'businessRoleId', name: '🏢 Biznis', color: 0x1abc9c, hoist: false },
  { key: 'gamerRoleId', name: '🎮 Gamer', color: 0x5865f2, hoist: false },
  { key: 'designerRoleId', name: '🎨 Dizajner', color: 0xeb459e, hoist: false },
  { key: 'streamerRoleId', name: '🎬 Streamer', color: 0x9146ff, hoist: false },
  { key: 'vipRoleId', name: '💎 VIP', color: 0xf1c40f, hoist: false },
  { key: 'partnerRoleId', name: '🤝 Partner', color: 0xfee75c, hoist: false },
  { key: 'supportRoleId', name: '🎧 Support', color: 0x3498db, hoist: true },
  { key: 'moderatorRoleId', name: '🛡️ Moderator', color: 0xe67e22, hoist: true },
  { key: 'adminRoleId', name: '🔧 Admin', color: 0xe74c3c, hoist: true }
];

// access: public | verified | staff | role:<key>
// ro: read-only (samo staff piše) | (bez ro) => svi sa pristupom pišu
const STRUCTURE = [
  {
    cat: '📢 OBAVEŠTENJA',
    access: 'public',
    channels: [
      { name: 'dobrodosli', key: 'welcomeChannelId', ro: true, topic: 'Dobrodošli na Blaze Roleplay' },
      { name: 'pravila', key: 'rulesChannelId', ro: true, topic: 'Pravila servera — obavezno pročitati' },
      { name: 'objave', key: 'announcementChannelId', ro: true, topic: 'Zvanične objave' },
      { name: 'update-log', ro: true, topic: 'Nove skripte, ispravke i update-i' },
      { name: 'server-status', key: 'statusChannelId', ro: true, topic: 'Live status FiveM servera' },
      { name: 'kako-se-povezati', ro: true, topic: 'Uputstvo za ulazak u grad' },
      { name: 'faq', ro: true, topic: 'Često postavljana pitanja' }
    ]
  },
  {
    cat: '✅ VERIFIKACIJA',
    access: 'public',
    channels: [
      { name: 'verifikacija', key: 'verifyChannelId', ro: true, topic: 'Prihvati pravila i dobij pristup' },
      { name: 'role', key: 'rolesChannelId', ro: true, topic: 'Izaberi svoje role' },
      { name: 'prijava-departmana', key: 'applyPanelChannelId', ro: true, topic: 'Prijave za LSPD, EMS, Mehaničare, Novinare' }
    ]
  },
  {
    cat: '🏙️ GRAD',
    access: 'verified',
    channels: [
      { name: 'kako-poceti', ro: true, topic: 'Prvi koraci u gradu' },
      { name: 'pravila-rp', ro: true, topic: 'RP pravila (RDM, VDM, meta, powergaming...)' },
      { name: 'komande', ro: true, topic: 'Korisne komande u igri' },
      { name: 'lokacije', ro: true, topic: 'Važne lokacije u gradu' },
      { name: 'ekonomija', ro: true, topic: 'Poslovi, zarada i cene' },
      { name: 'organizacije', ro: true, topic: 'Mafije, bande i MC — pravila i prijave' }
    ]
  },
  {
    cat: '💬 ZAJEDNICA',
    access: 'verified',
    channels: [
      { name: 'opsti-caskanje', key: 'generalChannelId', topic: 'Opšte ćaskanje' },
      { name: 'rp-caskanje', topic: 'RP priče, događaji i tračevi iz grada' },
      { name: 'mediji', key: 'mediaChannelId', topic: 'Slike i klipovi' },
      { name: 'memes', topic: 'Memovi — bez vređanja' },
      { name: 'oglasi', topic: 'Prodaja vozila, kuća i itema' },
      { name: 'trazenje-ekipe', topic: 'Nađi ekipu za RP' },
      { name: 'predlozi', key: 'suggestionChannelId', ro: true, topic: 'Predlozi zajednice' }
    ]
  },
  {
    cat: '👮 DEPARTMANI',
    access: 'staff',
    channels: [
      { name: 'lspd-obavestenja', access: 'role:lspdRoleId', ro: true, topic: 'LSPD obaveštenja' },
      { name: 'lspd-caskanje', access: 'role:lspdRoleId', topic: 'LSPD interna komunikacija' },
      { name: 'ems-obavestenja', access: 'role:emsRoleId', ro: true, topic: 'EMS obaveštenja' },
      { name: 'ems-caskanje', access: 'role:emsRoleId', topic: 'EMS interna komunikacija' },
      { name: 'mehanicari', access: 'role:mechanicRoleId', topic: 'Mehaničari — posao i organizacija' },
      { name: 'novinari', access: 'role:newsRoleId', topic: 'Novinari — vesti i mediji' }
    ]
  },
  {
    cat: '🎫 PODRŠKA',
    access: 'verified',
    channels: [
      { name: 'tiket-panel', key: 'ticketPanelChannelId', ro: true, topic: 'Otvori tiket — izaberi kategoriju' },
      { name: 'podrska-info', ro: true, topic: 'Kako radi podrška i tiketi' }
    ]
  },
  {
    cat: '📝 PRIJAVE',
    access: 'staff',
    channels: []
  },
  {
    cat: '📋 LOGOVI',
    access: 'staff',
    channels: [
      { name: 'mod-log', key: 'modLogChannelId', ro: true, topic: 'Moderacijske akcije' },
      { name: 'automod-log', key: 'automodLogChannelId', ro: true, topic: 'Automod akcije' },
      { name: 'message-log', key: 'logChannelId', ro: true, topic: 'Brisanje i izmena poruka' },
      { name: 'join-log', key: 'joinLogChannelId', ro: true, topic: 'Ulazak i izlazak članova' },
      { name: 'transkripti', key: 'ticketLogChannelId', ro: true, topic: 'Transkripti tiketa i prijava' }
    ]
  },
  {
    cat: '🔊 GLASOVNI',
    access: 'verified',
    channels: [
      { name: 'Opšti 1', voice: true },
      { name: 'Opšti 2', voice: true },
      { name: 'RP soba 1', voice: true },
      { name: 'RP soba 2', voice: true },
      { name: 'Gaming', voice: true },
      { name: 'Muzika', voice: true },
      { name: 'AFK', voice: true },
      { name: '➕ Napravi sobu', voice: true, key: 'tempVoiceChannelId' }
    ]
  }
];

// ============================================================
//  DOZVOLE
// ============================================================

function overwritesFor(access, { ro, voice, guild, botId, roleIds }) {
  const everyone = guild.roles.everyone.id;
  const staffIds = staffRoleIdsOf(roleIds);
  const verified = roleIds.memberRoleId;

  const list = [];

  const baseRoleAllow = voice
    ? [P.ViewChannel, P.Connect, P.Speak]
    : ro
      ? [P.ViewChannel, P.ReadMessageHistory]
      : [P.ViewChannel, P.ReadMessageHistory, P.SendMessages, P.AddReactions, P.AttachFiles, P.EmbedLinks];

  const staffAllow = voice
    ? [P.ViewChannel, P.Connect, P.Speak, P.MoveMembers, P.MuteMembers]
    : [P.ViewChannel, P.ReadMessageHistory, P.SendMessages, P.ManageMessages, P.AttachFiles, P.EmbedLinks, P.AddReactions];

  if (access === 'public') {
    list.push({ id: everyone, allow: baseRoleAllow });
  } else {
    list.push({ id: everyone, deny: [P.ViewChannel] });
  }

  // Verifikovani članovi
  if ((access === 'verified' || access === 'public') && verified && !voice) {
    list.push({ id: verified, allow: baseRoleAllow });
  }
  if (access === 'verified' && verified && voice) {
    list.push({ id: verified, allow: baseRoleAllow });
  }

  // Departmanska rola
  if (access.startsWith('role:')) {
    const key = access.slice(5);
    const roleId = roleIds[key];
    if (roleId) list.push({ id: roleId, allow: staffAllow });
  }

  // Osoblje uvek vidi sve
  for (const id of staffIds) {
    list.push({ id, allow: staffAllow });
  }

  // Bot
  list.push({
    id: botId,
    allow: voice
      ? [P.ViewChannel, P.Connect, P.Speak, P.ManageChannels, P.MoveMembers]
      : [P.ViewChannel, P.ReadMessageHistory, P.SendMessages, P.ManageMessages, P.ManageChannels, P.AttachFiles, P.EmbedLinks]
  });

  return list;
}

function staffRoleIdsOf(roleIds) {
  return [roleIds.supportRoleId, roleIds.moderatorRoleId, roleIds.adminRoleId].filter(Boolean);
}

// ============================================================
//  POMOĆNE
// ============================================================

const BOT_CHANNEL_NAMES = new Set();
const BOT_CATEGORY_NAMES = new Set();
const BOT_ROLE_NAMES = new Set();

for (const def of ROLES) BOT_ROLE_NAMES.add(def.name);
for (const cat of STRUCTURE) {
  BOT_CATEGORY_NAMES.add(cat.cat);
  for (const ch of cat.channels) BOT_CHANNEL_NAMES.add(ch.name);
}

function inCategory(guild, categoryId, name, type) {
  return guild.channels.cache.find(
    (c) => (c.parentId ?? null) === categoryId && c.name === name && c.type === type
  );
}

async function ensureRole(guild, { name, color, hoist }) {
  const existing = guild.roles.cache.find((r) => r.name === name && !r.managed);
  if (existing) return { role: existing, created: false };

  const role = await guild.roles.create({
    name,
    color,
    hoist: Boolean(hoist),
    reason: 'Blaze Roleplay — automatski setup'
  });
  return { role, created: true };
}

async function ensureCategory(guild, name) {
  const existing = guild.channels.cache.find(
    (c) => c.type === ChannelType.GuildCategory && c.name === name
  );
  if (existing) return { category: existing, created: false };

  const category = await guild.channels.create({
    name,
    type: ChannelType.GuildCategory,
    reason: 'Blaze Roleplay — automatski setup'
  });
  return { category, created: true };
}

// ============================================================
//  BRISANJE
// ============================================================

async function wipe(guild, mode = 'botovo', { keepChannelId = null } = {}) {
  const result = { channels: 0, roles: 0, skipped: [], errors: [] };

  const deleteChannels = mode === 'botovo' || mode === 'kanali' || mode === 'sve';
  const deleteRoles = mode === 'botovo' || mode === 'role' || mode === 'sve';

  // --- Kanali ---
  if (deleteChannels) {
    await guild.channels.fetch().catch(() => {});
    const channels = [...guild.channels.cache.values()];

    for (const channel of channels) {
      if (channel.id === keepChannelId) {
        result.skipped.push(`${channel.name} (kanal u kome je pokrenuto)`);
        continue;
      }

      if (mode === 'botovo' && !BOT_CHANNEL_NAMES.has(channel.name) && !BOT_CATEGORY_NAMES.has(channel.name)) {
        continue;
      }

      try {
        await channel.delete('Blaze Roleplay — čišćenje servera');
        result.channels++;
      } catch (err) {
        result.errors.push(`${channel.name}: ${err.message}`);
      }
    }
  }

  // --- Role ---
  if (deleteRoles) {
    await guild.roles.fetch().catch(() => {});
    const me = guild.members.me;
    const botHighest = me.roles.highest.position;

    const roles = [...guild.roles.cache.values()].sort((a, b) => b.position - a.position);

    for (const role of roles) {
      if (role.id === guild.roles.everyone.id) continue;
      if (role.managed) {
        result.skipped.push(`${role.name} (integracija/bot)`);
        continue;
      }
      if (role.id === me.roles.highest.id) {
        result.skipped.push(`${role.name} (rola bota)`);
        continue;
      }
      if (role.position >= botHighest) {
        result.skipped.push(`${role.name} (iznad bota)`);
        continue;
      }
      if (role.name === 'Owner' || role.name.toLowerCase() === 'owner') {
        result.skipped.push(`${role.name} (vlasnik)`);
        continue;
      }

      if (mode === 'botovo' && !BOT_ROLE_NAMES.has(role.name)) continue;

      try {
        await role.delete('Blaze Roleplay — čišćenje servera');
        result.roles++;
      } catch (err) {
        result.errors.push(`@${role.name}: ${err.message}`);
      }
    }
  }

  return result;
}

// ============================================================
//  GLAVNI SETUP
// ============================================================

async function runSetup(guild, { setIcon = true, onProgress = null } = {}) {
  const botId = guild.members.me.id;
  const report = { roles: [], channels: [], categories: [], panels: [], skipped: [], errors: [] };
  const savedChannels = {};

  const progress = async (text) => {
    if (typeof onProgress === 'function') await onProgress(text).catch(() => {});
  };

  // ---------- 1) ROLE ----------
  await progress('🎭 Pravim role...');
  const roleIds = {};

  for (const def of ROLES) {
    try {
      const { role, created } = await ensureRole(guild, def);
      roleIds[def.key] = role.id;
      report.roles.push(created ? `+ ${role.name}` : `= ${role.name}`);
    } catch (err) {
      report.errors.push(`Rola ${def.name}: ${err.message}`);
    }
  }

  await guild.roles.fetch().catch(() => {});

  // ---------- 2) KATEGORIJE ----------
  await progress('📁 Pravim kategorije...');
  const catIds = {};
  const roleSnapshot = { ...roleIds };

  for (const catDef of STRUCTURE) {
    try {
      const { category, created } = await ensureCategory(guild, catDef.cat);

      // dozvole na kategoriji
      const overwrites = overwritesFor(catDef.access, {
        ro: true,
        guild,
        botId,
        roleIds: roleSnapshot
      });

      await category.permissionOverwrites.set(overwrites).catch(() => {});

      catIds[catDef.cat] = category.id;
      report.categories.push(created ? `+ ${catDef.cat}` : `= ${catDef.cat}`);
    } catch (err) {
      report.errors.push(`Kategorija ${catDef.cat}: ${err.message}`);
    }
  }

  await guild.channels.fetch().catch(() => {});

  // ---------- 3) KANALI ----------
  let channelIndex = 0;
  const totalChannels = STRUCTURE.reduce((sum, c) => sum + c.channels.length, 0);

  for (const catDef of STRUCTURE) {
    const parentId = catIds[catDef.cat];
    if (!parentId) continue;

    for (const chDef of catDef.channels) {
      channelIndex++;
      await progress(`💬 Pravim kanale... (${channelIndex}/${totalChannels})`);

      const access = chDef.access ?? catDef.access;
      const type = chDef.voice ? ChannelType.GuildVoice : ChannelType.GuildText;

      try {
        const existing = inCategory(guild, parentId, chDef.name, type);
        if (existing) {
          report.channels.push(`= ${chDef.voice ? '🔊' : '#'}${chDef.name}`);
          if (chDef.key) savedChannels[chDef.key] = existing.id;
          continue;
        }

        const overwrites = overwritesFor(access, {
          ro: chDef.ro ?? catDef.access !== 'verified',
          voice: Boolean(chDef.voice),
          guild,
          botId,
          roleIds: roleSnapshot
        });

        const channel = await guild.channels.create({
          name: chDef.name,
          type,
          parent: parentId,
          topic: chDef.voice ? undefined : chDef.topic,
          permissionOverwrites: overwrites,
          reason: 'Blaze Roleplay — automatski setup'
        });

        report.channels.push(`+ ${chDef.voice ? '🔊' : '#'}${chDef.name}`);
        if (chDef.key) savedChannels[chDef.key] = channel.id;
      } catch (err) {
        report.errors.push(`${chDef.name}: ${err.message}`);
      }
    }
  }

  // ---------- 4) SAČUVAJ PODEŠAVANJA ----------
  await progress('💾 Čuvam podešavanja...');

  const settings = {
    ...(db.get('settings', {}) ?? {}),
    ...roleIds,
    ...savedChannels,
    staffRoleId: roleIds.supportRoleId ?? null,
    staffRoleIds: staffRoleIdsOf(roleIds),
    autoRoleId: roleIds.unverifiedRoleId ?? null,
    verifyRoleId: roleIds.memberRoleId ?? null,
    unverifiedRoleId: roleIds.unverifiedRoleId ?? null,
    applyRoleId: roleIds.citizenRoleId ?? null,
    ticketCategoryId: catIds['🎫 PODRŠKA'] ?? null,
    applyCategoryId: catIds['📝 PRIJAVE'] ?? null
  };

  db.set('settings', settings);
  config.reloadSettings();

  // ---------- 5) PANELI ----------
  await progress('⚙️ Postavljam panele...');

  const tickets = require('./tickets');
  const applications = require('./applications');
  const verification = require('./verification');
  const suggestions = require('./suggestions');
  const reactionroles = require('./reactionroles');
  const status = require('./status');

  const sendPanel = async (label, channelId, fn) => {
    try {
      const channel = guild.channels.cache.get(channelId);
      if (!channel) {
        report.skipped.push(label);
        return;
      }
      await fn(channel);
      report.panels.push(label);
    } catch (err) {
      report.errors.push(`${label}: ${err.message}`);
    }
  };

  await sendPanel('Verifikacija', settings.verifyChannelId, (ch) => verification.postPanel(ch));
  await sendPanel('Tiketi', settings.ticketPanelChannelId, (ch) =>
    ch.send({ embeds: [tickets.buildPanelEmbed(guild.name)], components: [tickets.buildPanelRow()] })
  );
  await sendPanel('Prijave za departmane', settings.applyPanelChannelId, (ch) => applications.postPanel(ch));
  await sendPanel('Sugestije', settings.suggestionChannelId, (ch) => suggestions.postPanel(ch));

  // Reaction roles — standardne role
  try {
    const existing = reactionroles.listRoles();
    const defaults = [
      { name: 'Građanin', emoji: '👤', description: 'Klasičan RP igrač', roleId: roleIds.citizenRoleId },
      { name: 'Gamer', emoji: '🎮', description: 'Pinguj me za gejmove', roleId: roleIds.gamerRoleId },
      { name: 'Dizajner', emoji: '🎨', description: 'Dizajn i klipovi', roleId: roleIds.designerRoleId },
      { name: 'Streamer', emoji: '🎬', description: 'Strimujem server', roleId: roleIds.streamerRoleId }
    ];

    for (const def of defaults) {
      if (!def.roleId) continue;
      if (!existing.some((r) => r.roleId === def.roleId)) {
        await reactionroles.addRole(def);
      }
    }

    await sendPanel('Role meni', settings.rolesChannelId, (ch) => reactionroles.postPanel(ch));
  } catch (err) {
    report.errors.push(`Role meni: ${err.message}`);
  }

  // FiveM live status
  if (config.fivemHost) {
    await sendPanel('Live status', settings.statusChannelId, (ch) => status.postStatusPanel(ch));
  } else {
    report.skipped.push('Live status (nema FIVEM_HOST)');
  }

  // ---------- 6) IKONA ----------
  if (setIcon) {
    try {
      const iconPath = path.join(__dirname, '..', '..', 'assets', 'blaze-logo.png');
      if (fs.existsSync(iconPath)) {
        await guild.setIcon(fs.readFileSync(iconPath), 'Blaze Roleplay logo');
        report.panels.push('Ikonica servera postavljena');
      }
    } catch (err) {
      report.errors.push(`Ikonica: ${err.message}`);
    }
  }

  return report;
}

// ============================================================
//  OPORAVAK PODEŠAVANJA PO IMENU
// ============================================================

const NAME_MAP = {};
for (const catDef of STRUCTURE) {
  for (const chDef of catDef.channels) {
    if (chDef.key) NAME_MAP[chDef.key] = chDef.name;
  }
}

const ROLE_NAME_MAP = Object.fromEntries(ROLES.map((r) => [r.key, r.name]));

async function discoverSettings(client) {
  const current = db.get('settings', {}) ?? {};
  if (current.welcomeChannelId && current.ticketCategoryId) return false;

  const guildId = config.guildId;
  const guild = guildId
    ? await client.guilds.fetch(guildId).catch(() => null)
    : client.guilds.cache.first();

  if (!guild) return false;

  await guild.channels.fetch().catch(() => {});
  await guild.roles.fetch().catch(() => {});

  const found = { ...current };
  let count = 0;

  for (const [key, name] of Object.entries(NAME_MAP)) {
    if (found[key]) continue;
    const channel = guild.channels.cache.find((c) => c.name === name);
    if (channel) {
      found[key] = channel.id;
      count++;
    }
  }

  for (const [key, name] of Object.entries(ROLE_NAME_MAP)) {
    if (found[key]) continue;
    const role = guild.roles.cache.find((r) => r.name === name);
    if (role) {
      found[key] = role.id;
      count++;
    }
  }

  const support = guild.channels.cache.find((c) => c.name === '🎫 PODRŠKA');
  const apply = guild.channels.cache.find((c) => c.name === '📝 PRIJAVE');

  if (!found.ticketCategoryId && support) {
    found.ticketCategoryId = support.id;
    count++;
  }
  if (!found.applyCategoryId && apply) {
    found.applyCategoryId = apply.id;
    count++;
  }

  if (!found.staffRoleIds?.length) {
    found.staffRoleIds = staffRoleIdsOf(found);
  }
  if (!found.staffRoleId && found.supportRoleId) found.staffRoleId = found.supportRoleId;
  if (!found.autoRoleId && found.unverifiedRoleId) found.autoRoleId = found.unverifiedRoleId;
  if (!found.verifyRoleId && found.memberRoleId) found.verifyRoleId = found.memberRoleId;
  if (!found.applyRoleId && found.citizenRoleId) found.applyRoleId = found.citizenRoleId;

  if (count > 0 || !current.staffRoleIds) {
    db.set('settings', found);
    config.reloadSettings();
    console.log(`♻️ Podešavanja obnovljena (${count} pronađeno po imenu)`);
    return true;
  }

  return false;
}

module.exports = {
  runSetup,
  wipe,
  discoverSettings,
  ROLES,
  STRUCTURE,
  BOT_CHANNEL_NAMES,
  BOT_ROLE_NAMES
};
