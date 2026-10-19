const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../db');
const store = require('../store');
const { brandEmbed, COLOR, formatDuration } = require('../utils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stats')
    .setDescription('[Staff] Statistika bota i servera')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    const client = interaction.client;
    const guild = interaction.guild;

    const apps = db.get('applications', { counter: 0, byUser: {} });
    const appValues = Object.values(apps.byUser ?? {});
    const pending = appValues.filter((a) => a.status === 'pending').length;
    const approved = appValues.filter((a) => a.status === 'approved').length;
    const rejected = appValues.filter((a) => a.status === 'rejected').length;

    const gw = db.get('giveaways', {});
    const activeGiveaways = Object.values(gw).filter((g) => !g.ended).length;

    const verified = Object.keys(db.get('verified', {})).length;
    const suggestions = db.get('suggestions', { counter: 0 }).counter;

    const embed = brandEmbed({
      title: '📊 Statistika',
      description: `**${guild.name}** — pregled sistema`,
      color: COLOR.main,
      footer: 'stats',
      fields: [
        {
          name: '🤖 Bot',
          value: [
            `Servera: **${client.guilds.cache.size}**`,
            `Komandi: **${client.commands.size}**`,
            `Ping: **${Math.round(client.ws.ping)} ms**`,
            `Uptime: **${formatDuration(client.uptime)}**`
          ].join('\n'),
          inline: true
        },
        {
          name: '🎫 Tiketi',
          value: `Otvoreno: **${store.countOpenTickets(guild.id)}**`,
          inline: true
        },
        {
          name: '📝 Prijave',
          value: [`⏳ Na čekanju: **${pending}**`, `✅ Odobreno: **${approved}**`, `❌ Odbijeno: **${rejected}**`].join('\n'),
          inline: true
        },
        {
          name: '🛡️ Verifikacije',
          value: `Ukupno: **${verified}**`,
          inline: true
        },
        {
          name: '🎉 Giveaway',
          value: `Aktivnih: **${activeGiveaways}**`,
          inline: true
        },
        {
          name: '💡 Sugestije',
          value: `Ukupno: **${suggestions}**`,
          inline: true
        },
        {
          name: '👥 Članovi',
          value: `Ukupno: **${guild.memberCount}**\nLjudi: **${guild.members.cache.filter((m) => !m.user.bot).size}**\nBotovi: **${guild.members.cache.filter((m) => m.user.bot).size}**`,
          inline: true
        }
      ]
    });

    await interaction.reply({ embeds: [embed], flags: 64 });
  }
};
