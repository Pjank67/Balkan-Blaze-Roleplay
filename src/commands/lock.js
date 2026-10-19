const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  MessageFlags
} = require('discord.js');
const { COLOR, sendModLog } = require('../utils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lock')
    .setDescription('Zaključaj kanal (niko ne može da piše)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .setDMPermission(false)
    .addStringOption((option) =>
      option.setName('razlog').setDescription('Razlog zaključavanja').setRequired(false)
    ),

  async execute(interaction) {
    const reason = interaction.options.getString('razlog') ?? 'Nije naveden razlog';
    const channel = interaction.channel;

    try {
      await channel.permissionOverwrites.edit(
        interaction.guild.roles.everyone,
        { SendMessages: false },
        { reason: `Lock | ${interaction.user.tag}: ${reason}` }
      );
    } catch (err) {
      console.error('❌ Lock nije uspeo:', err);
      return interaction.reply({
        content: '❌ Ne mogu da zaključam kanal. Proveri dozvole bota.',
        flags: MessageFlags.Ephemeral
      });
    }

    const embed = new EmbedBuilder()
      .setColor(COLOR.danger)
      .setTitle('🔒 Kanal zaključan')
      .setDescription(`Ovaj kanal je zaključan. **Razlog:** ${reason}`)
      .setFooter({ text: `Zaključao/la: ${interaction.user.tag}` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });

    await sendModLog(interaction.guild, {
      title: '🔒 Lock',
      color: COLOR.danger,
      fields: [
        { name: 'Kanal', value: `${channel}`, inline: true },
        { name: 'Moderator', value: `${interaction.user.tag}`, inline: true },
        { name: 'Razlog', value: reason }
      ]
    });
  }
};
