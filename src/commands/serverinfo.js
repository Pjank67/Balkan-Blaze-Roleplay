const { SlashCommandBuilder, EmbedBuilder, ChannelType } = require('discord.js');
const { COLOR } = require('../utils');

function channelCount(guild, type) {
  return guild.channels.cache.filter((c) => c.type === type).size;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('serverinfo')
    .setDescription('Prikaži informacije o serveru'),

  async execute(interaction) {
    const guild = interaction.guild;
    const owner = await guild.fetchOwner().catch(() => null);

    const humans = guild.members.cache.filter((m) => !m.user.bot).size;
    const bots = guild.members.cache.filter((m) => m.user.bot).size;

    const embed = new EmbedBuilder()
      .setColor(COLOR.main)
      .setTitle(`📊 ${guild.name}`)
      .setThumbnail(guild.iconURL({ size: 256 }) ?? null)
      .setDescription(guild.description ?? '​')
      .addFields(
        {
          name: '👑 Vlasnik',
          value: owner ? `${owner.user}` : 'Nepoznato',
          inline: true
        },
        {
          name: '📅 Napravljen',
          value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`,
          inline: true
        },
        {
          name: '🆔 ID',
          value: `\`${guild.id}\``,
          inline: true
        },
        {
          name: '👥 Članovi',
          value: `Ukupno: **${guild.memberCount}**\n👤 Ljudi: **${humans}**\n🤖 Botovi: **${bots}**`,
          inline: true
        },
        {
          name: '💬 Kanali',
          value: `📝 Tekst: **${channelCount(guild, ChannelType.GuildText)}**\n🔊 Glas: **${channelCount(guild, ChannelType.GuildVoice)}**\n📂 Kategorije: **${channelCount(guild, ChannelType.GuildCategory)}**`,
          inline: true
        },
        {
          name: '🎭 Role',
          value: `**${guild.roles.cache.size}**`,
          inline: true
        },
        {
          name: '🚀 Boost',
          value: `Nivo **${guild.premiumTier}** • **${guild.premiumSubscriptionCount ?? 0}** boostova`,
          inline: true
        },
        {
          name: '🛡️ Verifikacija',
          value: `${guild.verificationLevel}`,
          inline: true
        },
        {
          name: '😀 Emoji',
          value: `**${guild.emojis.cache.size}**`,
          inline: true
        }
      )
      .setFooter({ text: `Server ID: ${guild.id}` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
