const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  MessageFlags
} = require('discord.js');
const { COLOR } = require('../utils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('embed')
    .setDescription('Pošalji lep embed (obaveštenje)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .setDMPermission(false)
    .addStringOption((option) =>
      option
        .setName('naslov')
        .setDescription('Naslov embeda')
        .setRequired(true)
        .setMaxLength(256)
    )
    .addStringOption((option) =>
      option
        .setName('tekst')
        .setDescription('Sadržaj embeda')
        .setRequired(true)
        .setMaxLength(4000)
    )
    .addStringOption((option) =>
      option
        .setName('boja')
        .setDescription('Boja u hex formatu, npr. #5865f2')
        .setRequired(false)
        .setMaxLength(7)
    )
    .addChannelOption((option) =>
      option
        .setName('kanal')
        .setDescription('Kanal za slanje (podrazumevano: trenutni)')
        .setRequired(false)
    ),

  async execute(interaction) {
    const title = interaction.options.getString('naslov', true);
    const text = interaction.options.getString('tekst', true);
    const colorRaw = interaction.options.getString('boja');
    const channel = interaction.options.getChannel('kanal') ?? interaction.channel;

    let color = COLOR.main;
    if (colorRaw) {
      const parsed = parseInt(colorRaw.replace('#', ''), 16);
      if (Number.isNaN(parsed) || parsed < 0 || parsed > 0xffffff) {
        return interaction.reply({
          content: '❌ Neispravna boja. Primer: `#5865f2`',
          flags: MessageFlags.Ephemeral
        });
      }
      color = parsed;
    }

    if (!channel?.isTextBased?.()) {
      return interaction.reply({
        content: '❌ Izaberi tekstualni kanal.',
        flags: MessageFlags.Ephemeral
      });
    }

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(title)
      .setDescription(text)
      .setTimestamp();

    try {
      await channel.send({ embeds: [embed] });
    } catch (err) {
      console.error('❌ Embed nije poslat:', err);
      return interaction.reply({
        content: '❌ Ne mogu da pošaljem embed u taj kanal.',
        flags: MessageFlags.Ephemeral
      });
    }

    return interaction.reply({
      content: `✅ Embed je poslat u <#${channel.id}>.`,
      flags: MessageFlags.Ephemeral
    });
  }
};
