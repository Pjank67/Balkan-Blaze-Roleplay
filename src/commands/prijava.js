const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const applications = require('../systems/applications');
const config = require('../config');
const { brandEmbed, COLOR } = require('../utils');

function pad(num) {
  return String(num ?? 0).padStart(4, '0');
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('prijava')
    .setDescription('Prijave za departmane (LSPD, EMS, Mehanicar, Novinar)')
    .addSubcommand((sub) =>
      sub
        .setName('panel')
        .setDescription('[Staff] Pošalji panel za prijave departmana')
        .addChannelOption((option) =>
          option.setName('kanal').setDescription('Kanal za panel (podrazumevano: trenutni)')
        )
    )
    .addSubcommand((sub) =>
      sub.setName('status').setDescription('Proveri status svoje prijave')
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'panel') {
      if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
        return interaction.reply({
          content: '❌ Samo osoblje može da pošalje panel.',
          flags: MessageFlags.Ephemeral
        });
      }

      const channel = interaction.options.getChannel('kanal') ?? interaction.channel;
      if (!channel?.isTextBased?.()) {
        return interaction.reply({ content: '❌ Izaberi tekstualni kanal.', flags: MessageFlags.Ephemeral });
      }

      await applications.postPanel(channel);
      return interaction.reply({
        content: `✅ Panel za prijave departmana poslat u <#${channel.id}>.`,
        flags: MessageFlags.Ephemeral
      });
    }

    if (sub === 'status') {
      const status = applications.applicationStatus(interaction.user.id);

      if (!status) {
        return interaction.reply({
          embeds: [
            brandEmbed({
              title: '📝 Nemaš prijavu',
              description: 'Još nisi popunio/la prijavu za departman.\nNađi panel **Prijave za departmane** i izaberi departman u meniju.',
              color: COLOR.info,
              footer: 'whitelist'
            })
          ],
          flags: MessageFlags.Ephemeral
        });
      }

      const labels = {
        pending: '⏳ Na čekanju',
        approved: '✅ Odobrena',
        rejected: '❌ Odbijena'
      };

      const embed = brandEmbed({
        title: `📝 Prijava #${pad(status.number)} — ${status.deptLabel ?? 'departman'}`,
        description: [
          `**Status:** ${labels[status.status] ?? status.status}`,
          status.createdAt ? `**Poslata:** <t:${Math.floor(status.createdAt / 1000)}:R>` : '',
          status.reason ? `**Razlog:** ${status.reason}` : '',
          status.channelId ? `**Kanal:** <#${status.channelId}>` : ''
        ]
          .filter(Boolean)
          .join('\n'),
        color:
          status.status === 'approved'
            ? COLOR.success
            : status.status === 'rejected'
              ? COLOR.danger
              : COLOR.warning,
        footer: 'departmani'
      });

      return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }
  }
};
