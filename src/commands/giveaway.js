const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
  EmbedBuilder
} = require('discord.js');
const giveaways = require('../systems/giveaways');
const { COLOR, brandEmbed } = require('../utils');

function extractId(input) {
  const trimmed = String(input ?? '').trim();
  const match = trimmed.match(/(\d{15,22})\s*$/);
  return match ? match[1] : trimmed;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('giveaway')
    .setDescription('Giveaway sistem — organizuj nagradnu igru')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) =>
      sub
        .setName('start')
        .setDescription('Pokreni giveaway')
        .addStringOption((o) => o.setName('nagrada').setDescription('Šta se osvaja?').setRequired(true))
        .addStringOption((o) =>
          o.setName('trajanje').setDescription('npr. 30m, 2h, 1d, 1h30m').setRequired(true)
        )
        .addIntegerOption((o) =>
          o
            .setName('pobednika')
            .setDescription('Koliko pobednika (1–20)')
            .setMinValue(1)
            .setMaxValue(20)
            .setRequired(false)
        )
        .addChannelOption((o) => o.setName('kanal').setDescription('Gde da se pokrene'))
    )
    .addSubcommand((sub) =>
      sub
        .setName('end')
        .setDescription('Završi giveaway odmah')
        .addStringOption((o) =>
          o.setName('id').setDescription('ID ili link giveaway poruke').setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('reroll')
        .setDescription('Izaberi novog pobednika')
        .addStringOption((o) =>
          o.setName('id').setDescription('ID ili link giveaway poruke').setRequired(true)
        )
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'start') {
      const prize = interaction.options.getString('nagrada', true);
      const duration = interaction.options.getString('trajanje', true);
      const winners = interaction.options.getInteger('pobednika') ?? 1;
      const channel = interaction.options.getChannel('kanal') ?? interaction.channel;

      if (!channel?.isTextBased?.()) {
        return interaction.reply({ content: '❌ Izaberi tekstualni kanal.', flags: MessageFlags.Ephemeral });
      }

      return giveaways.startGiveaway(interaction, {
        prize,
        duration,
        winners,
        channel
      });
    }

    if (sub === 'end') {
      const id = extractId(interaction.options.getString('id', true));
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const gw = await giveaways.endGiveaway(interaction.client, id);

      return interaction.editReply({
        content: gw
          ? `✅ Giveaway za **${gw.prize}** završen.`
          : '❌ Giveaway nije pronađen ili je već završen.'
      });
    }

    if (sub === 'reroll') {
      const id = extractId(interaction.options.getString('id', true));
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const winner = await giveaways.reroll(interaction.client, id);

      return interaction.editReply({
        content: winner
          ? `🔁 Novi pobednik: <@${winner}>`
          : '❌ Ne mogu da izvršim reroll (giveaway nije završen ili nema učesnika).'
      });
    }
  }
};
