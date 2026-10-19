const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  MessageFlags
} = require('discord.js');
const { COLOR } = require('../utils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('slowmode')
    .setDescription('Podesi spori režim u kanalu')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .setDMPermission(false)
    .addIntegerOption((option) =>
      option
        .setName('sekundi')
        .setDescription('Sekunde između poruka (0 = isključeno, max 21600)')
        .setMinValue(0)
        .setMaxValue(21600)
        .setRequired(true)
    ),

  async execute(interaction) {
    const seconds = interaction.options.getInteger('sekundi', true);
    const channel = interaction.channel;

    try {
      await channel.setRateLimitPerUser(
        seconds,
        `Slowmode postavio/la ${interaction.user.tag}`
      );
    } catch (err) {
      console.error('❌ Slowmode nije uspeo:', err);
      return interaction.reply({
        content: '❌ Ne mogu da postavim slowmode. Proveri moje dozvole.',
        flags: MessageFlags.Ephemeral
      });
    }

    const embed = new EmbedBuilder()
      .setColor(seconds === 0 ? COLOR.success : COLOR.main)
      .setDescription(
        seconds === 0
          ? '✅ Spori režim je **isključen** u ovom kanalu.'
          : `🐢 Spori režim je postavljen na **${seconds} s** u ovom kanalu.`
      );

    await interaction.reply({ embeds: [embed] });
  }
};
