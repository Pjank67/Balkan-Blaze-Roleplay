const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  MessageFlags
} = require('discord.js');
const { COLOR, sendModLog } = require('../utils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Upozori korisnika (opomena)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .setDMPermission(false)
    .addUserOption((option) =>
      option.setName('korisnik').setDescription('Korisnik').setRequired(true)
    )
    .addStringOption((option) =>
      option.setName('razlog').setDescription('Razlog opomene').setRequired(true)
    ),

  async execute(interaction) {
    const targetUser = interaction.options.getUser('korisnik', true);
    const reason = interaction.options.getString('razlog', true);

    if (targetUser.id === interaction.user.id) {
      return interaction.reply({
        content: '❌ Ne možeš da upozoriš samog sebe.',
        flags: MessageFlags.Ephemeral
      });
    }

    if (targetUser.bot) {
      return interaction.reply({
        content: '❌ Botove ne možemo da upozoravamo. 😄',
        flags: MessageFlags.Ephemeral
      });
    }

    // DM opomena
    let dmSent = true;
    try {
      await targetUser.send({
        embeds: [
          new EmbedBuilder()
            .setColor(COLOR.warning)
            .setTitle(`⚠️ Opomena sa servera ${interaction.guild.name}`)
            .setDescription(`**Razlog:** ${reason}`)
            .setFooter({ text: 'Nemoj ponovo kršiti pravila, inače sledi kazna.' })
        ]
      });
    } catch {
      dmSent = false;
    }

    const embed = new EmbedBuilder()
      .setColor(COLOR.warning)
      .setTitle('⚠️ Opomena poslata')
      .setDescription(`**${targetUser.tag}** je dobio/la opomenu.`)
      .addFields(
        { name: '🛡️ Moderator', value: `${interaction.user}`, inline: true },
        { name: '📩 DM', value: dmSent ? '✅ poslat' : '❌ nije mogao da se pošalje', inline: true },
        { name: '📄 Razlog', value: reason }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });

    await sendModLog(interaction.guild, {
      title: '⚠️ Warn',
      color: COLOR.warning,
      fields: [
        { name: 'Korisnik', value: `${targetUser.tag} (${targetUser.id})`, inline: true },
        { name: 'Moderator', value: `${interaction.user.tag}`, inline: true },
        { name: 'Razlog', value: reason }
      ]
    });
  }
};
