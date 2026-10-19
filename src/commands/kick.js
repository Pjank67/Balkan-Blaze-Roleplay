const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  MessageFlags
} = require('discord.js');
const { COLOR, sendModLog } = require('../utils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Izbaci korisnika sa servera')
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .setDMPermission(false)
    .addUserOption((option) =>
      option.setName('korisnik').setDescription('Korisnik koga izbacuješ').setRequired(true)
    )
    .addStringOption((option) =>
      option.setName('razlog').setDescription('Razlog').setRequired(false)
    ),

  async execute(interaction) {
    const targetUser = interaction.options.getUser('korisnik', true);
    const reason = interaction.options.getString('razlog') ?? 'Nije naveden razlog';

    if (targetUser.id === interaction.user.id) {
      return interaction.reply({
        content: '❌ Ne možeš da izbaciš samog sebe.',
        flags: MessageFlags.Ephemeral
      });
    }

    const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

    if (!member) {
      return interaction.reply({
        content: '❌ Taj korisnik nije na serveru.',
        flags: MessageFlags.Ephemeral
      });
    }

    if (!member.kickable) {
      return interaction.reply({
        content: '❌ Ne mogu da izbacim ovog korisnika (viša rola ili je vlasnik).',
        flags: MessageFlags.Ephemeral
      });
    }

    if (
      interaction.member.id !== interaction.guild.ownerId &&
      member.roles.highest.position >= interaction.member.roles.highest.position
    ) {
      return interaction.reply({
        content: '❌ Ne možeš da izbaciš korisnika sa istom ili višom rolom.',
        flags: MessageFlags.Ephemeral
      });
    }

    try {
      await targetUser.send({
        embeds: [
          new EmbedBuilder()
            .setColor(COLOR.warning)
            .setTitle(`👢 Izbacivan/a si sa servera ${interaction.guild.name}`)
            .setDescription(`**Razlog:** ${reason}`)
        ]
      });
    } catch {
      // DM zatvoren
    }

    try {
      await member.kick(`${reason} | ${interaction.user.tag}`);
    } catch (err) {
      console.error('❌ Kick nije uspeo:', err);
      return interaction.reply({
        content: '❌ Kick nije uspeo. Proveri dozvole bota.',
        flags: MessageFlags.Ephemeral
      });
    }

    const embed = new EmbedBuilder()
      .setColor(COLOR.warning)
      .setTitle('👢 Korisnik izbačen')
      .setDescription(`**${targetUser.tag}** je izbačen/a sa servera.`)
      .addFields(
        { name: '👤 Korisnik', value: `${targetUser}`, inline: true },
        { name: '🛡️ Moderator', value: `${interaction.user}`, inline: true },
        { name: '📄 Razlog', value: reason }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });

    await sendModLog(interaction.guild, {
      title: '👢 Kick',
      color: COLOR.warning,
      fields: [
        { name: 'Korisnik', value: `${targetUser.tag} (${targetUser.id})`, inline: true },
        { name: 'Moderator', value: `${interaction.user.tag}`, inline: true },
        { name: 'Razlog', value: reason }
      ]
    });
  }
};
