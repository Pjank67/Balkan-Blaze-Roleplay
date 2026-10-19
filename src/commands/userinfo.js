const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { COLOR } = require('../utils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('Prikaži informacije o korisniku')
    .addUserOption((option) =>
      option.setName('korisnik').setDescription('Korisnik (podrazumevano: ti)').setRequired(false)
    ),

  async execute(interaction) {
    const user = interaction.options.getUser('korisnik') ?? interaction.user;
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);

    const embed = new EmbedBuilder()
      .setColor(member?.displayColor || COLOR.main)
      .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL({ size: 128 }) })
      .setTitle('👤 Informacije o korisniku')
      .setThumbnail(user.displayAvatarURL({ size: 256 }))
      .addFields(
        { name: '🆔 ID', value: `\`${user.id}\``, inline: true },
        { name: '🤖 Bot', value: user.bot ? 'Da' : 'Ne', inline: true },
        {
          name: '📅 Nalog napravljen',
          value: `<t:${Math.floor(user.createdTimestamp / 1000)}:F>\n(<t:${Math.floor(user.createdTimestamp / 1000)}:R>)`,
          inline: false
        }
      );

    if (member) {
      if (member.nickname) {
        embed.addFields({ name: '📝 Nadimak', value: member.nickname, inline: true });
      }

      embed.addFields({
        name: '📥 Pridružio/la se',
        value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>\n(<t:${Math.floor(member.joinedTimestamp / 1000)}:R>)`,
        inline: false
      });

      if (member.premiumSinceTimestamp) {
        embed.addFields({
          name: '🚀 Boostuje od',
          value: `<t:${Math.floor(member.premiumSinceTimestamp / 1000)}:R>`,
          inline: true
        });
      }

      const roles = member.roles.cache
        .filter((r) => r.id !== interaction.guild.id)
        .sort((a, b) => b.position - a.position)
        .map((r) => `${r}`);

      const maxRoles = 20;
      const rolesText = roles.length
        ? roles.slice(0, maxRoles).join(' ') + (roles.length > maxRoles ? `\n*...i još ${roles.length - maxRoles}*` : '')
        : 'Nema rola';

      embed.addFields({ name: `🎭 Role (${roles.length})`, value: rolesText });

      if (member.permissions.has(PermissionFlagsBits.Administrator)) {
        embed.addFields({ name: '⚠️ Napomena', value: 'Ovaj korisnik ima **Administrator** dozvolu.' });
      }
    } else {
      embed.addFields({ name: 'ℹ️', value: 'Korisnik nije na ovom serveru.' });
    }

    embed.setFooter({ text: `Zatražio/la: ${interaction.user.tag}` }).setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
