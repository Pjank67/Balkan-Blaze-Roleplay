const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags
} = require('discord.js');
const rr = require('../systems/reactionroles');
const { brandEmbed, COLOR } = require('../utils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reactionroles')
    .setDescription('[Staff] Role meni — korisnici sami biraju role')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) =>
      sub
        .setName('panel')
        .setDescription('Pošalji panel sa menijem rola')
        .addChannelOption((o) => o.setName('kanal').setDescription('Kanal za panel'))
    )
    .addSubcommand((sub) =>
      sub
        .setName('dodaj')
        .setDescription('Dodaj rolu u meni')
        .addStringOption((o) => o.setName('naziv').setDescription('Prikazano ime').setRequired(true))
        .addRoleOption((o) => o.setName('rola').setDescription('Rola koja se dodeljuje').setRequired(true))
        .addStringOption((o) => o.setName('emoji').setDescription('Emoji, npr. 🎮').setRequired(false))
        .addStringOption((o) => o.setName('opis').setDescription('Kratak opis').setRequired(false))
    )
    .addSubcommand((sub) =>
      sub
        .setName('ukloni')
        .setDescription('Ukloni rolu iz menija')
        .addStringOption((o) => o.setName('naziv').setDescription('Ime ili ID role').setRequired(true))
    )
    .addSubcommand((sub) => sub.setName('lista').setDescription('Prikaži sve role u meniju')),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'panel') {
      const channel = interaction.options.getChannel('kanal') ?? interaction.channel;
      if (!channel?.isTextBased?.()) {
        return interaction.reply({ content: '❌ Izaberi tekstualni kanal.', flags: MessageFlags.Ephemeral });
      }

      await rr.postPanel(channel);
      return interaction.reply({
        content: `✅ Role panel poslat u <#${channel.id}>.`,
        flags: MessageFlags.Ephemeral
      });
    }

    if (sub === 'dodaj') {
      const naziv = interaction.options.getString('naziv', true);
      const rola = interaction.options.getRole('rola', true);
      const emoji = interaction.options.getString('emoji') ?? '🎭';
      const opis = interaction.options.getString('opis') ?? '';

      if (rola.managed || rola.id === interaction.guild.id) {
        return interaction.reply({
          content: '❌ Ta rola ne može da se koristi u meniju.',
          flags: MessageFlags.Ephemeral
        });
      }

      await rr.addRole({ name: naziv, description: opis, emoji, roleId: rola.id });

      return interaction.reply({
        content: `✅ Rola **${naziv}** dodata u meni. Pošalji novi panel da se prikaže.`,
        flags: MessageFlags.Ephemeral
      });
    }

    if (sub === 'ukloni') {
      const naziv = interaction.options.getString('naziv', true);
      const removed = await rr.removeRole(naziv);

      return interaction.reply({
        content: removed ? `✅ **${naziv}** uklonjeno iz menija.` : '❌ Nije pronađeno.',
        flags: MessageFlags.Ephemeral
      });
    }

    if (sub === 'lista') {
      const list = rr.listRoles();

      const embed = brandEmbed({
        title: '🎭 Role u meniju',
        description: list.length
          ? list.map((r) => `${r.emoji} **${r.name}** — <@&${r.roleId}>${r.description ? ` • ${r.description}` : ''}`).join('\n')
          : 'Nema rola u meniju.',
        color: COLOR.info,
        footer: 'role meni'
      });

      return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }
  }
};
