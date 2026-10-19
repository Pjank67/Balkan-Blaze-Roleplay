const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  MessageFlags
} = require('discord.js');
const config = require('../config');
const { COLOR } = require('../utils');
const { buildJoinEmbed } = require('../systems/welcome');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('welcome')
    .setDescription('Podešavanja i testiranje poruke dobrodošlice')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) =>
      sub
        .setName('test')
        .setDescription('Pošalji testnu poruku dobrodošlice')
        .addUserOption((option) =>
          option
            .setName('korisnik')
            .setDescription('Za kog korisnika da se prikaže (podrazumevano: ti)')
            .setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub.setName('info').setDescription('Prikaži trenutna podešavanja dobrodošlice')
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'test') {
      const member = interaction.options.getMember('korisnik') ?? interaction.member;

      if (!member) {
        return interaction.reply({
          content: '❌ Korisnik nije na serveru.',
          flags: MessageFlags.Ephemeral
        });
      }

      await interaction.reply({
        content: '✅ Test poruka dobrodošlice:',
        flags: MessageFlags.Ephemeral
      });

      return interaction.followUp({
        content: `👋 <@${member.id}>`,
        embeds: [buildJoinEmbed(member)]
      });
    }

    if (sub === 'info') {
      const line = (value) => (value ? `<#${value}>` : '❌ nije podešeno');
      const roleLine = (value) => (value ? `<@&${value}>` : '❌ nije podešeno');

      const embed = new EmbedBuilder()
        .setColor(COLOR.main)
        .setTitle('⚙️ Podešavanja dobrodošlice')
        .addFields(
          { name: '👋 Kanal dobrodošlice', value: line(config.welcomeChannelId), inline: true },
          { name: '😢 Kanal odlaska', value: line(config.goodbyeChannelId), inline: true },
          { name: '📜 Kanal pravila', value: line(config.rulesChannelId), inline: true },
          { name: '🎭 Auto rola', value: roleLine(config.autoRoleId), inline: true },
          { name: '📩 DM dobrodošlica', value: config.welcomeDm ? '✅ uključena' : '❌ isključena', inline: true }
        )
        .setFooter({ text: 'Podešava se u .env fajlu' });

      return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }
  }
};
