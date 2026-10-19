const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const config = require('../config');
const tickets = require('../systems/tickets');
const applications = require('../systems/applications');
const verification = require('../systems/verification');
const suggestions = require('../systems/suggestions');
const { brandEmbed, COLOR } = require('../utils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('[Staff] Postavi sve panele odjednom (verifikacija, tiketi, prijave, sugestije)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const guild = interaction.guild;
    const report = [];

    const post = async (label, channelId) => {
      if (!channelId) {
        report.push(`⚠️ **${label}** — kanal nije podešen u konfiguraciji`);
        return;
      }

      const channel =
        guild.channels.cache.get(channelId) ??
        (await guild.channels.fetch(channelId).catch(() => null));

      if (!channel?.isTextBased()) {
        report.push(`⚠️ **${label}** — kanal nije validan`);
        return;
      }

      try {
        if (label === 'Verifikacija') await verification.postPanel(channel);
        if (label === 'Tiketi') {
          await channel.send({ embeds: [tickets.buildPanelEmbed(guild.name)], components: [tickets.buildPanelRow()] });
        }
        if (label === 'Prijave') await applications.postPanel(channel);
        if (label === 'Sugestije') await suggestions.postPanel(channel);

        report.push(`✅ **${label}** → <#${channel.id}>`);
      } catch (err) {
        report.push(`❌ **${label}** — greška: ${err.message}`);
      }
    };

    await post('Verifikacija', config.verifyChannelId ?? config.rulesChannelId);
    await post('Tiketi', config.ticketPanelChannelId);
    await post('Prijave', config.applyPanelChannelId);
    await post('Sugestije', config.suggestionChannelId);

    const embed = brandEmbed({
      title: '⚙️ Setup završen',
      description: report.join('\n'),
      color: COLOR.main,
      footer: 'setup'
    });

    return interaction.editReply({ embeds: [embed] });
  }
};
