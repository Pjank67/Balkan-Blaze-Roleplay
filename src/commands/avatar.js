const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { COLOR } = require('../utils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('avatar')
    .setDescription('Prikaži profilnu sliku korisnika')
    .addUserOption((option) =>
      option
        .setName('korisnik')
        .setDescription('Korisnik (podrazumevano: ti)')
        .setRequired(false)
    ),

  async execute(interaction) {
    const user = interaction.options.getUser('korisnik') ?? interaction.user;
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);

    const embed = new EmbedBuilder()
      .setColor(COLOR.main)
      .setTitle(`🖼️ Profilna slika — ${user.username}`)
      .setImage(user.displayAvatarURL({ size: 1024, extension: 'png' }))
      .addFields({
        name: '🔗 Linkovi',
        value: `[PNG](${user.displayAvatarURL({ size: 1024, extension: 'png' })}) • [JPG](${user.displayAvatarURL({ size: 1024, extension: 'jpg' })}) • [WEBP](${user.displayAvatarURL({ size: 1024, extension: 'webp' })})`
      });

    // Ako ima posebnu sliku za ovaj server
    if (member?.avatar) {
      embed.addFields({ name: '🏠 Server avatar', value: `[Otvori](${member.displayAvatarURL({ size: 1024 })})` });
      embed.setThumbnail(member.displayAvatarURL({ size: 256 }));
    }

    embed.setFooter({ text: `Zatražio/la: ${interaction.user.tag}` });

    await interaction.reply({ embeds: [embed] });
  }
};
