const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const suggestions = require('../systems/suggestions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sugestije')
    .setDescription('[Staff] Pošalji panel za sugestije')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addChannelOption((option) =>
      option.setName('kanal').setDescription('Kanal za panel (podrazumevano: trenutni)')
    ),

  async execute(interaction) {
    const channel = interaction.options.getChannel('kanal') ?? interaction.channel;

    if (!channel?.isTextBased?.()) {
      return interaction.reply({ content: '❌ Izaberi tekstualni kanal.', flags: MessageFlags.Ephemeral });
    }

    await suggestions.postPanel(channel);

    return interaction.reply({
      content: `✅ Panel za sugestije poslat u <#${channel.id}>.`,
      flags: MessageFlags.Ephemeral
    });
  }
};
