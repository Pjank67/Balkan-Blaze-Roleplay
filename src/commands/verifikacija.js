const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const verification = require('../systems/verification');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('verifikacija')
    .setDescription('[Staff] Pošalji panel za verifikaciju (pravila + prihvatanje)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addChannelOption((option) =>
      option.setName('kanal').setDescription('Kanal za panel (podrazumevano: trenutni)')
    ),

  async execute(interaction) {
    const channel = interaction.options.getChannel('kanal') ?? interaction.channel;

    if (!channel?.isTextBased?.()) {
      return interaction.reply({ content: '❌ Izaberi tekstualni kanal.', flags: MessageFlags.Ephemeral });
    }

    await verification.postPanel(channel);

    return interaction.reply({
      content: `✅ Panel za verifikaciju poslat u <#${channel.id}>.`,
      flags: MessageFlags.Ephemeral
    });
  }
};
