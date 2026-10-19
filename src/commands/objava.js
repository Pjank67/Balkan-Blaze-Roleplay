const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags
} = require('discord.js');
const config = require('../config');
const { brandEmbed, COLOR } = require('../utils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('objava')
    .setDescription('[Staff] Pošalji brendiranu objavu')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption((o) =>
      o.setName('naslov').setDescription('Naslov objave').setRequired(true).setMaxLength(200)
    )
    .addStringOption((o) =>
      o.setName('tekst').setDescription('Sadržaj objave').setRequired(true).setMaxLength(3500)
    )
    .addChannelOption((o) => o.setName('kanal').setDescription('Kanal za objavu'))
    .addStringOption((o) =>
      o
        .setName('ping')
        .setDescription('Koga da označim?')
        .addChoices(
          { name: 'Bez pinga', value: 'none' },
          { name: '@everyone', value: 'everyone' },
          { name: '@here', value: 'here' },
          { name: 'Osoblje', value: 'staff' }
        )
        .setRequired(false)
    )
    .addStringOption((o) =>
      o.setName('slika').setDescription('URL slike za objavu (opciono)').setRequired(false)
    ),

  async execute(interaction) {
    const naslov = interaction.options.getString('naslov', true);
    const tekst = interaction.options.getString('tekst', true);
    const kanal = interaction.options.getChannel('kanal') ?? interaction.channel;
    const ping = interaction.options.getString('ping') ?? 'none';
    const slika = interaction.options.getString('slika');

    if (!kanal?.isTextBased?.()) {
      return interaction.reply({ content: '❌ Izaberi tekstualni kanal.', flags: MessageFlags.Ephemeral });
    }

    const embed = brandEmbed({
      title: `📢 ${naslov}`,
      description: tekst,
      color: COLOR.main,
      footer: 'objave'
    });

    if (slika) embed.setImage(slika);

    let content = null;
    if (ping === 'everyone') content = '@everyone';
    else if (ping === 'here') content = '@here';
    else if (ping === 'staff' && config.staffRoleId) content = `<@&${config.staffRoleId}>`;

    try {
      await kanal.send({ content, embeds: [embed] });
    } catch (err) {
      console.error('❌ Objava nije poslata:', err);
      return interaction.reply({
        content: '❌ Ne mogu da pošaljem objavu u taj kanal.',
        flags: MessageFlags.Ephemeral
      });
    }

    return interaction.reply({
      content: `✅ Objava poslata u <#${kanal.id}>.`,
      flags: MessageFlags.Ephemeral
    });
  }
};
