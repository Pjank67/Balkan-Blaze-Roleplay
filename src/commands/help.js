const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../config');
const { COLOR } = require('../utils');

// Grupe komandi za lepši prikaz u /help
const GROUPS = [
  { title: '🎫 Tiketi', commands: ['ticket'] },
  { title: '📝 Whitelist', commands: ['prijava', 'verifikacija'] },
  { title: '🔥 FiveM', commands: ['status', 'ip'] },
  { title: '💡 Zajednica', commands: ['sugestije', 'giveaway', 'reactionroles', 'objava'] },
  { title: '👋 Dobrodošlica', commands: ['welcome'] },
  {
    title: '🛠️ Moderacija',
    commands: ['ban', 'kick', 'timeout', 'warn', 'clear', 'slowmode', 'lock', 'unlock']
  },
  { title: '⚙️ Administracija', commands: ['setup-server', 'reset-server', 'setup', 'branding', 'stats'] },
  { title: '🎯 Korisno', commands: ['ping', 'serverinfo', 'userinfo', 'avatar', 'poll', 'say', 'embed'] },
  { title: 'ℹ️ Pomoć', commands: ['help'] }
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Prikaži listu svih komandi'),

  async execute(interaction) {
    const commands = interaction.client.commands;

    const embed = new EmbedBuilder()
      .setColor(COLOR.main)
      .setTitle(`📖 Komande — ${config.serverName}`)
      .setDescription(
        `Ukupno **${commands.size}** komandi. Ukucaj \`/\` pa pretraži.\nSvi nazivi su na srpskom.`
      )
      .setFooter({ text: `${interaction.client.user.username} • pomoć` })
      .setTimestamp();

    const listed = new Set();

    for (const group of GROUPS) {
      const lines = [];
      for (const name of group.commands) {
        const cmd = commands.get(name);
        if (!cmd) continue;
        listed.add(name);

        const subcommands = cmd.data.options?.filter((o) => o.type === 1).map((o) => o.name) ?? [];
        const suffix = subcommands.length
          ? subcommands.map((s) => `\`/${name} ${s}\``).join(', ')
          : `\`/${name}\``;

        lines.push(`**${suffix}** — ${cmd.data.description}`);
      }
      if (lines.length) embed.addFields({ name: group.title, value: lines.join('\n') });
    }

    const others = [...commands.values()].filter((c) => !listed.has(c.data.name));
    if (others.length) {
      embed.addFields({
        name: '📌 Ostalo',
        value: others.map((c) => `**\`/${c.data.name}\`** — ${c.data.description}`).join('\n')
      });
    }

    embed.addFields({
      name: '🔐 Napomena',
      value: 'Komande sa [Staff] su dostupne samo osoblju (Manage Server ili staff rola).'
    });

    await interaction.reply({ embeds: [embed] });
  }
};
