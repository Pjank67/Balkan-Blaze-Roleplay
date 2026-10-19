const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
  EmbedBuilder,
  GatewayIntentBits
} = require('discord.js');
const config = require('../config');
const automod = require('../systems/automod');
const badwords = require('../data/badwords');
const { COLOR } = require('../utils');

function onOff(value) {
  return value ? '🟢 uključeno' : '🔴 isključeno';
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('automod')
    .setDescription('Automod — status i provera poruka')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false)
    .addSubcommand((sub) =>
      sub.setName('status').setDescription('Prikaži da li je automod aktivan i koja pravila rade')
    )
    .addSubcommand((sub) =>
      sub
        .setName('provera')
        .setDescription('Simuliraj poruku — bot kaže da li bi je obrisao (ništa ne briše)')
        .addStringOption((option) =>
          option
            .setName('tekst')
            .setDescription('Poruka koju želiš da testiraš')
            .setRequired(true)
            .setMaxLength(1000)
        )
        .addIntegerOption((option) =>
          option
            .setName('mentions')
            .setDescription('Broj označenih korisnika (za test mentiona)')
            .setMinValue(0)
            .setMaxValue(20)
            .setRequired(false)
        )
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    // ---------- STATUS ----------
    if (sub === 'status') {
      const hasIntent = interaction.client.options.intents.has(GatewayIntentBits.MessageContent);
      const active = config.automod.enabled && hasIntent;
      const canModerate = interaction.guild.members.me.permissions.has(
        PermissionFlagsBits.ManageMessages
      );

      const embed = new EmbedBuilder()
        .setColor(active ? COLOR.success : COLOR.danger)
        .setTitle('🤖 Automod — status')
        .setDescription(
          active
            ? 'Automod je **aktivan** i čita poruke.'
            : 'Automod **nije aktivan** — vidi "Šta koči" ispod.'
        )
        .addFields(
          {
            name: '🔧 Glavni prekidači',
            value: [
              `Automod: ${onOff(config.automod.enabled)}`,
              `Message Content intent: ${onOff(hasIntent)}`,
              `Dozvola Manage Messages: ${onOff(canModerate)}`,
              `Poštedi osoblje: ${onOff(config.automod.bypassStaff)}`
            ].join('\n')
          },
          {
            name: '📋 Pravila (Vortex stil)',
            value: [
              `Pozivnice (discord.gg): ${onOff(config.automod.invites)}`,
              `Linkovi (osim dozvoljenih): ${onOff(config.automod.links)}`,
              `Psovke + leetspeak: ${onOff(config.automod.badwords)} (${badwords.length} reči)`,
              `Spam (6 poruka / 5s): ${onOff(config.automod.spam)}`,
              `Duplirane poruke (3x / 15s): ${onOff(config.automod.duplicates)}`,
              `Mass mention (>5): ${onOff(config.automod.mentions)}`,
              `@everyone / @here ping: ${onOff(config.automod.everyonePing)}`,
              `Emoji spam: ${onOff(config.automod.emojis)}`,
              `Newline / predugačko: ${onOff(config.automod.newlines)}`,
              `Ponavljanje karaktera: ${onOff(config.automod.repeated)}`,
              `Zalgo / Unicode: ${onOff(config.automod.zalgo)}`,
              `CAPS LOCK: ${onOff(config.automod.caps)}`,
              `Anti-raid: ${onOff(config.automod.raid)}`
            ].join('\n')
          },
          {
            name: '⏱️ Kazne (eskalacija)',
            value: [
              '1. prekršaj → **5 min** timeout',
              '2. prekršaj u 10 min → **30 min**',
              '3. prekršaj → **1h**',
              '',
              `Dozvoljeni domeni: ${config.automod.allowedDomains.slice(0, 5).join(', ')}${config.automod.allowedDomains.length > 5 ? '...' : ''}`
            ].join('\n')
          },
          {
            name: '📍 Logovi',
            value: config.automodLogChannelId
              ? `<#${config.automodLogChannelId}>`
              : '❌ `AUTOMOD_LOG_CHANNEL_ID` / `MOD_LOG_CHANNEL_ID` nije podešen'
          }
        );

      const blockers = [];
      if (!config.automod.enabled) blockers.push('`AUTOMOD_ENABLED=false`');
      if (!hasIntent) {
        blockers.push(
          '`ENABLE_MESSAGE_CONTENT=false` u env **ili** MESSAGE CONTENT INTENT nije uključen u Developer Portalu'
        );
      }
      if (!canModerate) blockers.push('botu fali dozvola **Manage Messages**');

      if (blockers.length) {
        embed.addFields({ name: '🚫 Šta koči', value: blockers.map((b) => `• ${b}`).join('\n') });
      }

      if (config.automod.bypassStaff) {
        embed.addFields({
          name: '⚠️ Važno za testiranje',
          value:
            'Tvoj nalog (kao staff/admin) **neće biti kažnjen** — bot poštedi osoblje.\n' +
            'Testiraj sa drugim nalogom ili privremeno postavi `AUTOMOD_BYPASS_STAFF=false`.\n' +
            'Ili koristi `/automod provera` — radi bez drugog naloga.'
        });
      }

      embed.setFooter({ text: 'Blaze Roleplay • automod' }).setTimestamp();

      return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }

    // ---------- PROVERA (simulacija) ----------
    if (sub === 'provera') {
      const text = interaction.options.getString('tekst', true);
      const mentions = interaction.options.getInteger('mentions') ?? 0;

      const { reasons, note } = automod.analyze(text, { mentionCount: mentions });

      const embed = new EmbedBuilder()
        .setColor(reasons.length ? COLOR.danger : COLOR.success)
        .setTitle(reasons.length ? '🚫 Poruka BI bila obrisana' : '✅ Poruka prolazi')
        .setDescription(`**Testirano:**\n\`\`\`\n${text.slice(0, 900)}\n\`\`\``)
        .addFields({
          name: '📋 Rezultat',
          value: reasons.length
            ? reasons.map((r) => `• **${r.label}** → ${r.action}`).join('\n')
            : note ?? 'Nijedno pravilo nije prekršeno.'
        })
        .setFooter({ text: 'Simulacija — ništa nije obrisano' });

      return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }
  }
};
