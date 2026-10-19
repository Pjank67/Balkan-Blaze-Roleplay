const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
  EmbedBuilder
} = require('discord.js');
const { wipe } = require('../systems/setupServer');
const { COLOR } = require('../utils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reset-server')
    .setDescription('🧹 Obriši kanale/role (botove ili sve) — koristi pre ponovnog setupa')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false)
    .addStringOption((option) =>
      option
        .setName('sta')
        .setDescription('Šta da obrišem?')
        .setRequired(true)
        .addChoices(
          { name: 'Samo ono što je bot napravio (preporučeno)', value: 'botovo' },
          { name: 'Sve kanale (osim ovog u kome pišeš)', value: 'kanali' },
          { name: 'Sve role (osim @everyone, botovih i onih iznad bota)', value: 'role' },
          { name: 'SVE — kanali i role (⚠️ nepovratno)', value: 'sve' }
        )
    )
    .addBooleanOption((option) =>
      option
        .setName('potvrdi')
        .setDescription('Potvrdi brisanje — bez ovoga se ništa ne briše')
        .setRequired(true)
    ),

  async execute(interaction) {
    const mode = interaction.options.getString('sta', true);
    const confirmed = interaction.options.getBoolean('potvrdi', true);

    if (!confirmed) {
      return interaction.reply({
        content: '❌ Ništa nije obrisano. Pokreni ponovo sa `potvrdi: True` kad budeš spreman/na.',
        flags: MessageFlags.Ephemeral
      });
    }

    const me = interaction.guild.members.me;

    if (!me.permissions.has(PermissionFlagsBits.ManageChannels) || !me.permissions.has(PermissionFlagsBits.ManageRoles)) {
      return interaction.reply({
        content: '❌ Botu fale dozvole **Manage Channels** i **Manage Roles**.',
        flags: MessageFlags.Ephemeral
      });
    }

    await interaction.deferReply();

    const labels = {
      botovo: 'ono što je bot napravio',
      kanali: 'svi kanali',
      role: 'sve role',
      sve: 'SVE (kanali + role)'
    };

    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(COLOR.warning)
          .setTitle('🧹 Brišem...')
          .setDescription(`Brišem: **${labels[mode]}**.\nOvo može da potraje par minuta.`)
      ]
    });

    try {
      const result = await wipe(interaction.guild, mode, {
        keepChannelId: interaction.channelId
      });

      const lines = [
        `🗑️ Obrisano kanala: **${result.channels}**`,
        `🗑️ Obrisano rola: **${result.roles}**`
      ];

      if (result.skipped.length) {
        lines.push('', `⏭️ Preskočeno: **${result.skipped.length}**`);
        lines.push(result.skipped.slice(0, 8).map((s) => `• ${s}`).join('\n'));
      }

      if (result.errors.length) {
        lines.push('', `⚠️ Greške: **${result.errors.length}**`);
        lines.push(result.errors.slice(0, 6).map((e) => `• ${e}`).join('\n'));
      }

      lines.push('', '👉 Sada pokreni **`/setup-server potvrdi:True`** da napraviš novu strukturu.');

      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLOR.success)
            .setTitle('✅ Čišćenje završeno')
            .setDescription(lines.join('\n').slice(0, 4000))
        ]
      });
    } catch (err) {
      console.error('❌ Reset-server greška:', err);
      await interaction.editReply({
        content: `❌ Čišćenje nije uspelo: **${err.message}**`
      });
    }
  }
};
