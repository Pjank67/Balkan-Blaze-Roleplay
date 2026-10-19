require('dotenv').config();

const db = require('./db');

function optional(name) {
  const value = process.env[name];
  if (!value) return null;
  const clean = value.trim();
  return clean === '' ? null : clean;
}

function bool(name, defaultValue) {
  const value = optional(name);
  if (value === null) return defaultValue;
  return value.toLowerCase() === 'true';
}

function num(name, defaultValue) {
  const value = optional(name);
  if (value === null) return defaultValue;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : defaultValue;
}

// ---------- Podešavanja koja bot sam upiše (/setup-server) ----------
let settingsCache = null;

function settings() {
  if (settingsCache === null) {
    try {
      settingsCache = db.get('settings', {}) ?? {};
    } catch {
      settingsCache = {};
    }
  }
  return settingsCache;
}

function reloadSettings() {
  settingsCache = null;
}

function pick(key, envValue) {
  const stored = settings()[key];
  return stored !== undefined && stored !== null && stored !== '' ? stored : (envValue ?? null);
}

const env = {
  welcomeChannelId: optional('WELCOME_CHANNEL_ID'),
  goodbyeChannelId: optional('GOODBYE_CHANNEL_ID'),
  rulesChannelId: optional('RULES_CHANNEL_ID'),

  ticketCategoryId: optional('TICKET_CATEGORY_ID'),
  ticketLogChannelId: optional('TICKET_LOG_CHANNEL_ID'),
  ticketPanelChannelId: optional('TICKET_PANEL_CHANNEL_ID'),

  applyCategoryId: optional('APPLY_CATEGORY_ID'),
  applyLogChannelId: optional('APPLY_LOG_CHANNEL_ID'),
  applyPanelChannelId: optional('APPLY_PANEL_CHANNEL_ID'),

  suggestionChannelId: optional('SUGGESTION_CHANNEL_ID'),
  announcementChannelId: optional('ANNOUNCEMENT_CHANNEL_ID'),

  logChannelId: optional('LOG_CHANNEL_ID'),
  modLogChannelId: optional('MOD_LOG_CHANNEL_ID'),
  automodLogChannelId: optional('AUTOMOD_LOG_CHANNEL_ID'),
  joinLogChannelId: optional('JOIN_LOG_CHANNEL_ID'),

  statusChannelId: optional('STATUS_CHANNEL_ID'),
  verifyChannelId: optional('VERIFY_CHANNEL_ID'),
  tempVoiceChannelId: optional('TEMP_VOICE_CHANNEL_ID'),

  staffRoleId: optional('STAFF_ROLE_ID'),
  autoRoleId: optional('AUTO_ROLE_ID'),
  verifyRoleId: optional('VERIFY_ROLE_ID'),
  unverifiedRoleId: optional('UNVERIFIED_ROLE_ID'),
  applyRoleId: optional('APPLY_ROLE_ID')
};

module.exports = {
  // ===== Osnovno =====
  token: optional('DISCORD_TOKEN'),
  clientId: optional('CLIENT_ID'),
  guildId: optional('GUILD_ID'),
  serverName: optional('SERVER_NAME') ?? 'Blaze Roleplay',

  // ===== Kanali (baza -> .env) =====
  get welcomeChannelId() { return pick('welcomeChannelId', env.welcomeChannelId); },
  get goodbyeChannelId() { return pick('goodbyeChannelId', env.goodbyeChannelId); },
  get rulesChannelId() { return pick('rulesChannelId', env.rulesChannelId); },

  get ticketCategoryId() { return pick('ticketCategoryId', env.ticketCategoryId); },
  get ticketLogChannelId() { return pick('ticketLogChannelId', env.ticketLogChannelId); },
  get ticketPanelChannelId() { return pick('ticketPanelChannelId', env.ticketPanelChannelId); },

  get applyCategoryId() { return pick('applyCategoryId', env.applyCategoryId); },
  get applyLogChannelId() { return pick('applyLogChannelId', env.applyLogChannelId); },
  get applyPanelChannelId() { return pick('applyPanelChannelId', env.applyPanelChannelId); },

  get suggestionChannelId() { return pick('suggestionChannelId', env.suggestionChannelId); },
  get announcementChannelId() { return pick('announcementChannelId', env.announcementChannelId); },

  get logChannelId() { return pick('logChannelId', env.logChannelId); },
  get modLogChannelId() { return pick('modLogChannelId', env.modLogChannelId); },
  get automodLogChannelId() { return pick('automodLogChannelId', env.automodLogChannelId) ?? this.modLogChannelId; },
  get joinLogChannelId() { return pick('joinLogChannelId', env.joinLogChannelId); },

  get statusChannelId() { return pick('statusChannelId', env.statusChannelId); },
  get verifyChannelId() { return pick('verifyChannelId', env.verifyChannelId); },
  get tempVoiceChannelId() { return pick('tempVoiceChannelId', env.tempVoiceChannelId); },

  // ===== Role (baza -> .env) =====
  get staffRoleId() { return pick('staffRoleId', env.staffRoleId); },
  get autoRoleId() { return pick('autoRoleId', env.autoRoleId); },
  get verifyRoleId() { return pick('verifyRoleId', env.verifyRoleId); },
  get unverifiedRoleId() { return pick('unverifiedRoleId', env.unverifiedRoleId); },
  get applyRoleId() { return pick('applyRoleId', env.applyRoleId); },

  // Departmanske role
  get lspdRoleId() { return pick('lspdRoleId', null); },
  get emsRoleId() { return pick('emsRoleId', null); },
  get mechanicRoleId() { return pick('mechanicRoleId', null); },
  get newsRoleId() { return pick('newsRoleId', null); },
  get businessRoleId() { return pick('businessRoleId', null); },
  get citizenRoleId() { return pick('citizenRoleId', null); },

  // Sve staff role (Support + Moderator + Admin)
  get staffRoleIds() {
    const fromDb = settings().staffRoleIds;
    if (Array.isArray(fromDb) && fromDb.length) return fromDb;
    return env.staffRoleId ? [env.staffRoleId] : [];
  },

  // ===== FiveM =====
  fivemHost: optional('FIVEM_HOST'),
  fivemPort: num('FIVEM_PORT', 30120),
  fivemConnect: optional('FIVEM_CONNECT'),

  // ===== Opcije =====
  welcomeBannerUrl: optional('WELCOME_BANNER_URL'),
  welcomeDm: bool('WELCOME_DM', false),
  registerCommandsOnStart: bool('REGISTER_COMMANDS_ON_START', true),
  enableMessageContent: bool('ENABLE_MESSAGE_CONTENT', false),

  // ===== Automod (Vortex stil — strogo) =====
  automod: {
    enabled: bool('AUTOMOD_ENABLED', true),
    links: bool('AUTOMOD_LINKS', true),
    invites: bool('AUTOMOD_INVITES', true),
    spam: bool('AUTOMOD_SPAM', true),
    duplicates: bool('AUTOMOD_DUPLICATES', true),
    mentions: bool('AUTOMOD_MENTIONS', true),
    everyonePing: bool('AUTOMOD_EVERYONE_PING', true),
    caps: bool('AUTOMOD_CAPS', true),
    emojis: bool('AUTOMOD_EMOJIS', true),
    newlines: bool('AUTOMOD_NEWLINES', true),
    repeated: bool('AUTOMOD_REPEATED', true),
    zalgo: bool('AUTOMOD_ZALGO', true),
    badwords: bool('AUTOMOD_BADWORDS', true),
    raid: bool('AUTOMOD_RAID', true),
    bypassStaff: bool('AUTOMOD_BYPASS_STAFF', true),
    allowedDomains: (optional('AUTOMOD_ALLOWED_DOMAINS') ??
      'youtube.com,youtu.be,twitch.tv,clips.twitch.tv,medal.tv,streamable.com,imgur.com,cdn.discordapp.com,tenor.com,giphy.com,gyazo.com,prnt.sc')
      .split(',')
      .map((d) => d.trim().toLowerCase())
      .filter(Boolean)
  },

  // ===== Departmani (prijave) =====
  departmentTypes: [
    {
      value: 'lspd',
      label: 'LSPD — Policija',
      description: 'Policajac, šerif, saobraćajac',
      emoji: '👮',
      roleKey: 'lspdRoleId',
      extraLabel: 'Zašto želiš u LSPD?',
      extraPlaceholder: 'Iskustvo u RP-u kao policajac, poznavanje procedura...'
    },
    {
      value: 'ems',
      label: 'EMS — Hitna pomoć',
      description: 'Lekar, bolničar, vatrogasac',
      emoji: '🚑',
      roleKey: 'emsRoleId',
      extraLabel: 'Zašto želiš u EMS?',
      extraPlaceholder: 'Iskustvo, poznavanje medicinskih procedura...'
    },
    {
      value: 'mehanicar',
      label: 'Mehaničar',
      description: 'Auto-mehaničar, tuner, vulkanizer',
      emoji: '🔧',
      roleKey: 'mechanicRoleId',
      extraLabel: 'Koje usluge bi pružao/la?',
      extraPlaceholder: 'Popravke, tuning, vuča vozila...'
    },
    {
      value: 'novinar',
      label: 'Novinar / Mediji',
      description: 'Reporter, voditelj, snimatelj',
      emoji: '📰',
      roleKey: 'newsRoleId',
      extraLabel: 'Šta bi radio/la kao novinar?',
      extraPlaceholder: 'Vesti, intervjui, emisije...'
    }
  ],

  // ===== Kategorije tiketa — RP =====
  ticketTypes: [
    {
      value: 'podrska',
      label: 'Opšta podrška',
      description: 'Pitanja, pomoć i sve ostalo',
      emoji: '❓'
    },
    {
      value: 'prijava',
      label: 'Prijava igrača',
      description: 'Prijavi prekršaj igrača (RDM, VDM, meta...)',
      emoji: '🚨'
    },
    {
      value: 'zalba',
      label: 'Žalba na kaznu',
      description: 'Ban, kick, warn ili jail — žalba',
      emoji: '⚖️'
    },
    {
      value: 'refund',
      label: 'Refundacija',
      description: 'Izgubljena vozila, novac ili itemi',
      emoji: '💰'
    },
    {
      value: 'donacija',
      label: 'Donacija / kupovina',
      description: 'Donacije, VIP i paketi',
      emoji: '💎'
    },
    {
      value: 'organizacija',
      label: 'Organizacija / banda',
      description: 'Prijava ili pitanja o organizacijama',
      emoji: '🕶️'
    }
  ],

  reloadSettings
};
