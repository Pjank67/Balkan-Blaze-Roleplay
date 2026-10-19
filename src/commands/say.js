const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('say')
    .setDescription('Pošalji poruku kao bot')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .setDMPermission(false)
    .addStringOption((option) =>
      option
        .setName('poruka')
        .setDescription('Tekst poruke')
        .setRequired(true)
        .setMaxLength(2000)
    )
    .addChannelOption((option) =>
      option
        .setName('kanal')
        .setDescription('Kanal u koji da pošaljem poruku (podrazumevano: trenutni)')
        .setRequired(false)
    ),

  async execute(interaction) {
    const text = interaction.options.getString('poruka', true);
    const channel = interaction.options.getChannel('kanal') ?? interaction.channel;

    if (!channel?.isTextBased?.()) {
      return interaction.reply({
        content: '❌ Izaberi tekstualni kanal.',
        flags: MessageFlags.Ephemeral
      });
    }

    try {
      await channel.send({ content: text, allowedMentions: { parse: [] } });
    } catch (err) {
      console.error('❌ Say nije uspeo:', err);
      return interaction.reply({
        content: '❌ Ne mogu da pošaljem poruku u taj kanal.',
        flags: MessageFlags.Ephemeral
      });
    }

    return interaction.reply({
      content: `✅ Poruka je poslata u <#${channel.id}>.`,
      flags: MessageFlags.Ephemeral
    });
  }
};
