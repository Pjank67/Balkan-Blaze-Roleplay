const config = require('./config');
const { brandEmbed, COLOR } = require('./utils');

// Normalizuje host (skida http:// i slično)
function baseUrl() {
  if (!config.fivemHost) return null;
  let host = config.fivemHost.trim().replace(/^https?:\/\//, '').replace(/\/$/, '');
  const port = config.fivemPort ?? 30120;
  if (!host.includes(':')) host = `${host}:${port}`;
  return `http://${host}`;
}

async function fetchJson(url, timeoutMs = 5000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

// Vraća status FiveM servera ili { online: false, error }
async function getServerStatus() {
  const base = baseUrl();
  if (!base) return { online: false, error: 'FIVEM_HOST nije podešen' };

  try {
    const [info, players] = await Promise.all([
      fetchJson(`${base}/info.json`),
      fetchJson(`${base}/players.json`).catch(() => [])
    ]);

    const vars = info?.vars ?? {};
    const maxClients =
      Number(vars.sv_maxclients ?? vars.sv_maxClients ?? info?.sv_maxclients ?? 0) || 0;

    return {
      online: true,
      hostname: vars.sv_projectName ?? info?.hostname ?? config.serverName,
      clients: Array.isArray(players) ? players.length : Number(info?.clients ?? 0),
      maxClients,
      players: (Array.isArray(players) ? players : []).map((p) => ({
        name: String(p.name ?? 'Nepoznato'),
        ping: Number(p.ping ?? 0)
      })),
      map: vars.mapname ?? vars.sv_projectDesc ?? 'San Andreas',
      gametype: info?.gametype ?? 'Freeroam',
      description: vars.sv_projectDesc ?? null
    };
  } catch (err) {
    return { online: false, error: err.name === 'AbortError' ? 'Server ne odgovara (timeout)' : err.message };
  }
}

function connectAddress() {
  if (config.fivemConnect) return config.fivemConnect;
  if (!config.fivemHost) return null;
  const host = config.fivemHost.replace(/^https?:\/\//, '');
  return host.includes(':') ? host : `${host}:${config.fivemPort ?? 30120}`;
}

function statusBar(current, max) {
  if (!max) return '▱▱▱▱▱▱▱▱▱▱';
  const filled = Math.max(0, Math.min(10, Math.round((current / max) * 10)));
  return `${'▰'.repeat(filled)}${'▱'.repeat(10 - filled)}`;
}

// Embed za /status i live panel
function buildStatusEmbed(status) {
  if (!status.online) {
    return brandEmbed({
      title: '🔴 Server je OFFLINE',
      description: [
        `Trenutno ne mogu da se povežem na **${config.serverName}**.`,
        status.error ? `\n\`${status.error}\`` : '',
        '',
        'Pokušaj ponovo za par minuta ili proveri Discord obaveštenja.'
      ].join('\n'),
      color: COLOR.danger,
      footer: 'live status'
    });
  }

  const percent = status.maxClients
    ? Math.min(100, Math.round((status.clients / status.maxClients) * 100))
    : 0;

  const playerList = status.players.length
    ? status.players
        .slice(0, 15)
        .map((p, i) => `\`${String(i + 1).padStart(2, '0')}\` ${p.name} \`${p.ping}ms\``)
        .join('\n') +
      (status.players.length > 15 ? `\n*...i još ${status.players.length - 15} igrača*` : '')
    : 'Trenutno nema igrača na serveru.';

  const address = connectAddress();

  return brandEmbed({
    title: `🔥 ${status.hostname}`,
    description: [
      `\`${statusBar(status.clients, status.maxClients)}\` **${percent}%**`,
      '',
      status.description ?? 'Dobrodošao na Blaze Roleplay — upali i zaigraj!'
    ].join('\n'),
    color: COLOR.main,
    fields: [
      { name: '🟢 Igrači online', value: `**${status.clients}** / ${status.maxClients || '?'}`, inline: true },
      { name: '🗺️ Mapa', value: status.map, inline: true },
      { name: '🎮 Mod', value: status.gametype, inline: true },
      {
        name: '🔌 Kako da se povežeš',
        value: address ? `\`\`\`\nconnect ${address}\n\`\`\`` : '❌ Adresa nije podešena',
        inline: false
      },
      { name: `👥 Igrači (${status.players.length})`, value: playerList.slice(0, 1024), inline: false }
    ],
    footer: 'live status • osvežava se automatski'
  });
}

module.exports = { getServerStatus, buildStatusEmbed, connectAddress };
