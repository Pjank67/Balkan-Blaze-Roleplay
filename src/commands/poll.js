const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { COLOR } = require('../utils');

const NUMBERS = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣'];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('poll')
    .setDescription('Napravi anketu (glasovanje)')
    .addStringOption((option) =>
      option
        .setName('pitanje')
        .setDescription('Pitanje za anketu')
        .setRequired(true)
        .setMaxLength(256)
    )
    .addStringOption((option) =>
      option
        .setName('opcije')
        .setDescription('Opcije razdvoj sa | (npr. Da|Ne|Možda). Ako izostaviš — biće 👍/👎')
        .setRequired(false)
        .setMaxLength(500)
    ),

  async execute(interaction) {
    const question = interaction.options.getString('pitanje', true);
    const optionsRaw = interaction.options.getString('opcije');

    let options = optionsRaw
      ? optionsRaw
          .split('|')
          .map((o) => o.trim())
          .filter(Boolean)
      : [];

    if (options.length > 5) {
      return interaction.reply({
        content: '❌ Maksimalno 5 opcija.',
        flags: MessageFlags.Ephemeral
      });
    }

    const embed = new EmbedBuilder()
      .setColor(COLOR.main)
      .setTitle('📊 Anketa')
      .setDescription(`**${question}**`)
      .setFooter({
        text: `Anketa koju je napravio/la ${interaction.user.tag}`,
        iconURL: interaction.user.displayAvatarURL({ size: 64 })
      })
      .setTimestamp();

    if (options.length) {
      embed.addFields({
        name: 'Opcije',
        value: options.map((o, i) => `${NUMBERS[i]} ${o}`).join('\n')
      });
    } else {
      embed.addFields({ name: 'Glasaj', value: '👍 Za • 👎 Protiv' });
    }

    const message = await interaction.reply({ embeds: [embed], fetchReply: true });

    if (options.length) {
      for (let i = 0; i < options.length; i++) {
        await message.react(NUMBERS[i]).catch(() => {});
      }
    } else {
      await message.react('👍').catch(() => {});
      await message.react('👎').catch(() => {});
    }
  }
};
