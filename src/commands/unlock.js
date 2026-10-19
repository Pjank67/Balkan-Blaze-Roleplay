const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  MessageFlags
} = require('discord.js');
const { COLOR, sendModLog } = require('../utils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unlock')
    .setDescription('Otključaj kanal')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .setDMPermission(false),

  async execute(interaction) {
    const channel = interaction.channel;

    try {
      await channel.permissionOverwrites.edit(
        interaction.guild.roles.everyone,
        { SendMessages: null },
        { reason: `Unlock | ${interaction.user.tag}` }
      );
    } catch (err) {
      console.error('❌ Unlock nije uspeo:', err);
      return interaction.reply({
        content: '❌ Ne mogu da otključam kanal. Proveri dozvole bota.',
        flags: MessageFlags.Ephemeral
      });
    }

    const embed = new EmbedBuilder()
      .setColor(COLOR.success)
      .setTitle('🔓 Kanal otključan')
      .setDescription('Ovaj kanal je ponovo otvoren za pisanje.')
      .setFooter({ text: `Otključao/la: ${interaction.user.tag}` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });

    await sendModLog(interaction.guild, {
      title: '🔓 Unlock',
      color: COLOR.success,
      fields: [
        { name: 'Kanal', value: `${channel}`, inline: true },
        { name: 'Moderator', value: `${interaction.user.tag}`, inline: true }
      ]
    });
  }
};
