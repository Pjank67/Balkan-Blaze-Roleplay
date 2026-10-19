const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  MessageFlags
} = require('discord.js');
const { COLOR, sendModLog } = require('../utils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Banuj korisnika sa servera')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .setDMPermission(false)
    .addUserOption((option) =>
      option.setName('korisnik').setDescription('Korisnik koga banuješ').setRequired(true)
    )
    .addStringOption((option) =>
      option.setName('razlog').setDescription('Razlog bana').setRequired(false)
    )
    .addIntegerOption((option) =>
      option
        .setName('brisanje_poruka')
        .setDescription('Obriši poruke iz poslednjih X dana (0–7)')
        .setMinValue(0)
        .setMaxValue(7)
        .setRequired(false)
    ),

  async execute(interaction) {
    const targetUser = interaction.options.getUser('korisnik', true);
    const reason = interaction.options.getString('razlog') ?? 'Nije naveden razlog';
    const deleteDays = interaction.options.getInteger('brisanje_poruka') ?? 0;

    if (targetUser.id === interaction.user.id) {
      return interaction.reply({
        content: '❌ Ne možeš da banuješ samog sebe.',
        flags: MessageFlags.Ephemeral
      });
    }

    if (targetUser.id === interaction.client.user.id) {
      return interaction.reply({
        content: '❌ Ne mogu da banujem sam sebe.',
        flags: MessageFlags.Ephemeral
      });
    }

    const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

    if (member) {
      if (!member.bannable) {
        return interaction.reply({
          content:
            '❌ Ne mogu da banujem ovog korisnika.\nMoguće da ima višu rolu od mene ili je vlasnik servera.',
          flags: MessageFlags.Ephemeral
        });
      }

      if (
        interaction.member.id !== interaction.guild.ownerId &&
        member.roles.highest.position >= interaction.member.roles.highest.position
      ) {
        return interaction.reply({
          content: '❌ Ne možeš da banuješ korisnika sa istom ili višom rolom.',
          flags: MessageFlags.Ephemeral
        });
      }
    }

    // DM obaveštenje pre bana
    try {
      await targetUser.send({
        embeds: [
          new EmbedBuilder()
            .setColor(COLOR.danger)
            .setTitle(`🔨 Banovan/a si sa servera ${interaction.guild.name}`)
            .setDescription(`**Razlog:** ${reason}`)
        ]
      });
    } catch {
      // DM zatvoren — nastavi dalje
    }

    try {
      await interaction.guild.members.ban(targetUser.id, {
        reason: `${reason} | ${interaction.user.tag}`,
        deleteMessageSeconds: deleteDays * 86400
      });
    } catch (err) {
      console.error('❌ Ban nije uspeo:', err);
      return interaction.reply({
        content: '❌ Ban nije uspeo. Proveri dozvole bota.',
        flags: MessageFlags.Ephemeral
      });
    }

    const embed = new EmbedBuilder()
      .setColor(COLOR.danger)
      .setTitle('🔨 Korisnik banovan')
      .setDescription(`**${targetUser.tag}** je banovan/a sa servera.`)
      .addFields(
        { name: '👤 Korisnik', value: `${targetUser}`, inline: true },
        { name: '🛡️ Moderator', value: `${interaction.user}`, inline: true },
        { name: '📄 Razlog', value: reason }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });

    await sendModLog(interaction.guild, {
      title: '🔨 Ban',
      color: COLOR.danger,
      fields: [
        { name: 'Korisnik', value: `${targetUser.tag} (${targetUser.id})`, inline: true },
        { name: 'Moderator', value: `${interaction.user.tag}`, inline: true },
        { name: 'Razlog', value: reason }
      ]
    });
  }
};
