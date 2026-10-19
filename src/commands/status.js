const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { getServerStatus } = require('../fivem');
const { postStatusPanel, statusInfoEmbed } = require('../systems/status');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('status')
    .setDescription('FiveM status servera')
    .addSubcommand((sub) => sub.setName('prikazi').setDescription('Prikaži trenutni status servera'))
    .addSubcommand((sub) =>
      sub
        .setName('panel')
        .setDescription('[Staff] Postavi live status poruku koja se osvežava svakih 60s')
        .addChannelOption((o) => o.setName('kanal').setDescription('Kanal za live status'))
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'prikazi') {
      await interaction.deferReply();
      const status = await getServerStatus();
      return interaction.editReply({ embeds: [statusInfoEmbed(status)] });
    }

    if (sub === 'panel') {
      if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
        return interaction.reply({
          content: '❌ Samo osoblje može da postavi status panel.',
          flags: MessageFlags.Ephemeral
        });
      }

      const channel = interaction.options.getChannel('kanal') ?? interaction.channel;
      if (!channel?.isTextBased?.()) {
        return interaction.reply({ content: '❌ Izaberi tekstualni kanal.', flags: MessageFlags.Ephemeral });
      }

      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      await postStatusPanel(channel);

      return interaction.editReply({
        content: `✅ Live status postavljen u <#${channel.id}> — osvežava se svakih 60 sekundi.`
      });
    }
  }
};
