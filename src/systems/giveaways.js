const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags
} = require('discord.js');
const db = require('../db');
const config = require('../config');
const { COLOR, brandEmbed, parseDuration, formatDuration } = require('../utils');

const timers = new Map();

function giveaways() {
  return db.get('giveaways', {});
}

function saveGiveaway(id, data) {
  db.update('giveaways', (all) => {
    all[id] = data;
    return all;
  });
}

function pad(num) {
  return String(num ?? 0).padStart(4, '0');
}

function buildGiveawayEmbed(gw) {
  const ended = gw.ended;
  const winnersText = gw.winnerIds?.length
    ? gw.winnerIds.map((id) => `<@${id}>`).join(', ')
    : '—';

  return brandEmbed({
    title: ended ? '🎉 GIVEAWAY ZAVRŠEN' : '🎉 GIVEAWAY',
    description: [
      `## 🎁 ${gw.prize}`,
      '',
      ended
        ? `**Pobednik/ci:** ${winnersText}`
        : 'Klikni na dugme ispod da učestvuješ!',
      '',
      ended
        ? 'Hvala svima koji su učestvovali! 🔥'
        : `⏰ Završava se: <t:${Math.floor(gw.endsAt / 1000)}:R> (<t:${Math.floor(gw.endsAt / 1000)}:f>)`
    ].join('\n'),
    color: ended ? COLOR.dark : COLOR.main,
    footer: `Organizator: ${gw.hostedByName ?? 'Osoblje'} • ${gw.entries?.length ?? 0} učesnika`
  });
}

function buildGiveawayRow(messageId, disabled = false) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`gw:join:${messageId}`)
      .setLabel('🎉 Učestvujem')
      .setStyle(ButtonStyle.Success)
      .setDisabled(disabled)
  );
}

// ---------- Start ----------

async function startGiveaway(interaction, { prize, duration, winners, channel }) {
  const ms = parseDuration(duration);

  if (!ms) {
    return interaction.reply({
      content: '❌ Neispravno trajanje. Primeri: `30m`, `2h`, `1d`, `1h30m`',
      flags: MessageFlags.Ephemeral
    });
  }

  if (ms < 30000) {
    return interaction.reply({ content: '❌ Minimum je 30 sekundi.', flags: MessageFlags.Ephemeral });
  }

  const target = channel ?? interaction.channel;

  const embed = brandEmbed({
    title: '🎉 GIVEAWAY',
    description: [
      `## 🎁 ${prize}`,
      '',
      'Klikni na dugme ispod da učestvuješ!',
      '',
      `⏰ Završava se: <t:${Math.floor((Date.now() + ms) / 1000)}:R>`,
      `🏆 Pobednika: **${winners}**`
    ].join('\n'),
    color: COLOR.main,
    footer: `Organizator: ${interaction.user.tag} • 0 učesnika`
  });

  const message = await target.send({ embeds: [embed] });

  const gw = {
    messageId: message.id,
    channelId: target.id,
    guildId: interaction.guild.id,
    prize,
    winners,
    endsAt: Date.now() + ms,
    hostedBy: interaction.user.id,
    hostedByName: interaction.user.tag,
    entries: [],
    ended: false,
    winnerIds: []
  };

  saveGiveaway(message.id, gw);
  await message.edit({ embeds: [buildGiveawayEmbed(gw)], components: [buildGiveawayRow(message.id)] });

  scheduleEnd(interaction.client, message.id, ms);

  return interaction.reply({
    content: `✅ Giveaway pokrenut u <#${target.id}> — traje ${formatDuration(ms)}.`,
    flags: MessageFlags.Ephemeral
  });
}

// ---------- Učestvovanje ----------

async function handleJoin(interaction, messageId) {
  const gw = giveaways()[messageId];

  if (!gw) {
    await interaction.reply({ content: '❌ Giveaway nije pronađen.', flags: MessageFlags.Ephemeral });
    return true;
  }

  if (gw.ended) {
    await interaction.reply({ content: '⏰ Ovaj giveaway je završen.', flags: MessageFlags.Ephemeral });
    return true;
  }

  const userId = interaction.user.id;
  const index = gw.entries.indexOf(userId);

  if (index >= 0) {
    gw.entries.splice(index, 1);
    saveGiveaway(messageId, gw);
    await interaction.reply({ content: '👋 Povukao/la si učešće.', flags: MessageFlags.Ephemeral });
  } else {
    gw.entries.push(userId);
    saveGiveaway(messageId, gw);
    await interaction.reply({ content: '🎉 Učestvuješ! Srećno!', flags: MessageFlags.Ephemeral });
  }

  // Osveži broj učesnika
  try {
    const channel = await interaction.client.channels.fetch(gw.channelId);
    const message = await channel.messages.fetch(messageId);
    await message.edit({ embeds: [buildGiveawayEmbed(gw)] });
  } catch {
    // nije kritično
  }

  return true;
}

// ---------- Kraj ----------

function scheduleEnd(client, messageId, delay) {
  if (timers.has(messageId)) clearTimeout(timers.get(messageId));

  const timer = setTimeout(() => {
    endGiveaway(client, messageId).catch((err) =>
      console.warn('⚠️ Greška pri završavanju giveaway-a:', err.message)
    );
  }, Math.max(1000, delay));

  timers.set(messageId, timer);
}

async function endGiveaway(client, messageId, { announce = true } = {}) {
  const gw = giveaways()[messageId];
  if (!gw || gw.ended) return null;

  const pool = [...(gw.entries ?? [])];
  const winnerIds = [];

  for (let i = 0; i < Math.min(gw.winners, pool.length); i++) {
    const pick = Math.floor(Math.random() * pool.length);
    winnerIds.push(pool.splice(pick, 1)[0]);
  }

  gw.ended = true;
  gw.winnerIds = winnerIds;
  gw.endedAt = Date.now();
  saveGiveaway(messageId, gw);

  if (timers.has(messageId)) {
    clearTimeout(timers.get(messageId));
    timers.delete(messageId);
  }

  try {
    const channel = await client.channels.fetch(gw.channelId);
    const message = await channel.messages.fetch(messageId);

    await message.edit({
      embeds: [buildGiveawayEmbed(gw)],
      components: [buildGiveawayRow(messageId, true)]
    });

    if (announce) {
      if (winnerIds.length) {
        await channel.send({
          content: `🎉 Čestitamo ${winnerIds.map((id) => `<@${id}>`).join(', ')}! Osvojili ste **${gw.prize}**! 🔥`,
          allowedMentions: { users: winnerIds }
        });
      } else {
        await channel.send({
          content: `😢 Niko nije učestvovao u giveaway-u za **${gw.prize}**.`,
          allowedMentions: { parse: [] }
        });
      }
    }
  } catch (err) {
    console.warn('⚠️ Ne mogu da ažuriram giveaway poruku:', err.message);
  }

  return gw;
}

async function reroll(client, messageId) {
  const gw = giveaways()[messageId];
  if (!gw || !gw.ended) return null;

  const pool = [...(gw.entries ?? [])];
  if (!pool.length) return null;

  const pick = Math.floor(Math.random() * pool.length);
  const winner = pool[pick];

  gw.winnerIds = [winner];
  saveGiveaway(messageId, gw);

  try {
    const channel = await client.channels.fetch(gw.channelId);
    const message = await channel.messages.fetch(messageId);
    await message.edit({ embeds: [buildGiveawayEmbed(gw)] });
    await channel.send({
      content: `🔁 Reroll! Novi pobednik je <@${winner}> — **${gw.prize}**!`,
      allowedMentions: { users: [winner] }
    });
  } catch {
    // nije kritično
  }

  return winner;
}

// Vrati tajmere za aktivne giveaway-e posle restarta bota
function restoreGiveaways(client) {
  const all = giveaways();
  const now = Date.now();
  let restored = 0;

  for (const [messageId, gw] of Object.entries(all)) {
    if (gw.ended) continue;
    restored++;
    const remaining = gw.endsAt - now;
    if (remaining <= 0) {
      endGiveaway(client, messageId).catch(() => {});
    } else {
      scheduleEnd(client, messageId, remaining);
    }
  }

  if (restored > 0) console.log(`🎉 Aktivnih giveaway-a obnovljeno: ${restored}`);
}

module.exports = {
  startGiveaway,
  handleJoin,
  endGiveaway,
  reroll,
  restoreGiveaways,
  giveaways
};
