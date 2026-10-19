const { SlashCommandBuilder } = require('discord.js');
const config = require('../config');
const { connectAddress, getServerStatus } = require('../fivem');
const { brandEmbed, COLOR } = require('../utils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ip')
    .setDescription('Adresa servera i kako da se povežeš'),

  async execute(interaction) {
    await interaction.deferReply();

    const address = connectAddress();
    const status = await getServerStatus();

    const embed = brandEmbed({
      title: `🔌 Kako da se povežeš na ${config.serverName}`,
      description: [
        '**1.** Otvori **FiveM**',
        '**2.** Pritisni **F8** (konzola)',
        '**3.** Ukucaj komandu ispod i pritisni Enter',
        '',
        address ? `\`\`\`\nconnect ${address}\n\`\`\`` : '❌ Adresa servera nije podešena.',
        '',
        '**Igrači online:**',
        status.online ? `🟢 **${status.clients}** / ${status.maxClients || '?'}` : '🔴 Server trenutno nije dostupan'
      ].join('\n'),
      color: status.online ? COLOR.success : COLOR.danger,
      footer: 'connect info'
    });

    await interaction.editReply({ embeds: [embed] });
  }
};
