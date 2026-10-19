const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  MessageFlags
} = require('discord.js');
const { COLOR, sendModLog } = require('../utils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('Utišaj korisnika na određeno vreme')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .setDMPermission(false)
    .addUserOption((option) =>
      option.setName('korisnik').setDescription('Korisnik').setRequired(true)
    )
    .addIntegerOption((option) =>
      option
        .setName('minuta')
        .setDescription('Trajanje u minutama (1–40320)')
        .setMinValue(1)
        .setMaxValue(40320)
        .setRequired(true)
    )
    .addStringOption((option) =>
      option.setName('razlog').setDescription('Razlog').setRequired(false)
    ),

  async execute(interaction) {
    const targetUser = interaction.options.getUser('korisnik', true);
    const minutes = interaction.options.getInteger('minuta', true);
    const reason = interaction.options.getString('razlog') ?? 'Nije naveden razlog';

    if (targetUser.id === interaction.user.id) {
      return interaction.reply({
        content: '❌ Ne možeš da utišaš samog sebe.',
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

    if (!member.moderatable) {
      return interaction.reply({
        content: '❌ Ne mogu da utišam ovog korisnika (viša rola ili je vlasnik).',
        flags: MessageFlags.Ephemeral
      });
    }

    try {
      await member.timeout(minutes * 60 * 1000, `${reason} | ${interaction.user.tag}`);
    } catch (err) {
      console.error('❌ Timeout nije uspeo:', err);
      return interaction.reply({
        content: '❌ Timeout nije uspeo. Proveri dozvole bota.',
        flags: MessageFlags.Ephemeral
      });
    }

    const endsAt = Math.floor((Date.now() + minutes * 60 * 1000) / 1000);

    const embed = new EmbedBuilder()
      .setColor(COLOR.warning)
      .setTitle('🔇 Korisnik utišan')
      .setDescription(`**${targetUser.tag}** ne može da piše do <t:${endsAt}:t>.`)
      .addFields(
        { name: '⏱️ Trajanje', value: `${minutes} min`, inline: true },
        { name: '🛡️ Moderator', value: `${interaction.user}`, inline: true },
        { name: '📄 Razlog', value: reason }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });

    await sendModLog(interaction.guild, {
      title: '🔇 Timeout',
      color: COLOR.warning,
      fields: [
        { name: 'Korisnik', value: `${targetUser.tag} (${targetUser.id})`, inline: true },
        { name: 'Moderator', value: `${interaction.user.tag}`, inline: true },
        { name: 'Trajanje', value: `${minutes} min`, inline: true },
        { name: 'Razlog', value: reason }
      ]
    });
  }
};
