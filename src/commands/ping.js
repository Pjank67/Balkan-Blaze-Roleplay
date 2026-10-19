const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { COLOR, formatDuration } = require('../utils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Proveri da li bot radi i koliko je brz'),

  async execute(interaction) {
    const sent = await interaction.reply({
      content: '🏓 Merim...',
      withResponse: true
    });

    const message = sent.resource?.message ?? sent;
    const rtt = message.createdTimestamp - interaction.createdTimestamp;

    const embed = new EmbedBuilder()
      .setColor(COLOR.main)
      .setTitle('🏓 Pong!')
      .addFields(
        { name: '📡 Kašnjenje', value: `\`${rtt} ms\``, inline: true },
        { name: '💓 WebSocket', value: `\`${Math.round(interaction.client.ws.ping)} ms\``, inline: true },
        { name: '⏱️ Uptime', value: `\`${formatDuration(interaction.client.uptime)}\``, inline: true }
      );

    await interaction.editReply({ content: null, embeds: [embed] });
  }
};
