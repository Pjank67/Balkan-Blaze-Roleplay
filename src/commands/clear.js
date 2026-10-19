const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  MessageFlags
} = require('discord.js');
const { COLOR } = require('../utils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Obriši poruke u kanalu')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .setDMPermission(false)
    .addIntegerOption((option) =>
      option
        .setName('broj')
        .setDescription('Koliko poruka da obrišem (1–100)')
        .setMinValue(1)
        .setMaxValue(100)
        .setRequired(true)
    ),

  async execute(interaction) {
    const amount = interaction.options.getInteger('broj', true);
    const channel = interaction.channel;

    if (!channel.isTextBased() || channel.isDMBased?.()) {
      return interaction.reply({
        content: '❌ Ova komanda radi samo u tekstualnim kanalima servera.',
        flags: MessageFlags.Ephemeral
      });
    }

    if (!channel.permissionsFor(interaction.guild.members.me)?.has(PermissionFlagsBits.ManageMessages)) {
      return interaction.reply({
        content: '❌ Nemam dozvolu **Manage Messages** u ovom kanalu.',
        flags: MessageFlags.Ephemeral
      });
    }

    try {
      // fetch = true preskače poruke starije od 14 dana koje Discord ne dozvoljava da se bulk brišu
      const deleted = await channel.bulkDelete(amount, true);

      const embed = new EmbedBuilder()
        .setColor(COLOR.success)
        .setDescription(
          `🧹 Obrisano **${deleted.size}** poruka.${
            deleted.size < amount ? '\n*Napomena: poruke starije od 14 dana nije moguće obrisati.*' : ''
          }`
        );

      await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    } catch (err) {
      console.error('❌ Clear nije uspeo:', err);
      await interaction.reply({
        content: '❌ Nisam uspeo da obrišem poruke.',
        flags: MessageFlags.Ephemeral
      });
    }
  }
};
