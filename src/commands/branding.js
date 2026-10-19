const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
  EmbedBuilder,
  AttachmentBuilder
} = require('discord.js');
const fs = require('fs');
const path = require('path');
const { COLOR } = require('../utils');

const ASSETS = path.join(__dirname, '..', '..', 'assets');

function asset(name) {
  const p = path.join(ASSETS, name);
  return fs.existsSync(p) ? p : null;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('branding')
    .setDescription('[Admin] Postavi logo, server banner i pošalji baner slike')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false)
    .addSubcommand((sub) =>
      sub.setName('postavi').setDescription('Postavi ikonicu servera (logo) i server banner')
    )
    .addSubcommand((sub) =>
      sub.setName('posalji').setDescription('Pošalji baner i logo slike u trenutni kanal (za kopiranje)')
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    // ---------- POSTAVI ----------
    if (sub === 'postavi') {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const guild = interaction.guild;
      const results = [];

      const iconPath = asset('blaze-logo.png');
      const bannerPath = asset('blaze-server-banner.png');

      if (!iconPath) {
        results.push('❌ `assets/blaze-logo.png` nije pronađen u projektu.');
      } else {
        try {
          await guild.setIcon(fs.readFileSync(iconPath), 'Blaze Roleplay logo');
          results.push('✅ **Ikonica servera** postavljena (logo)');
        } catch (err) {
          results.push(`❌ Ikonica nije postavljena: ${err.message}`);
        }
      }

      if (!bannerPath) {
        results.push('❌ `assets/blaze-server-banner.png` nije pronađen u projektu.');
      } else {
        try {
          await guild.setBanner(fs.readFileSync(bannerPath), 'Blaze Roleplay banner');
          results.push('✅ **Server banner** postavljen');
        } catch (err) {
          results.push(
            `⚠️ Banner nije postavljen: ${err.message}\n` +
              '*Server mora imati najmanje **Nivo 2** boost da bi imao banner.*'
          );
        }
      }

      results.push(
        '',
        '💡 Discord kešira slike — osveži **Ctrl+R** (ili restartuj aplikaciju) da vidiš promenu.'
      );

      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLOR.main)
            .setTitle('🎨 Brending')
            .setDescription(results.join('\n'))
        ]
      });
    }

    // ---------- POŠALJI ----------
    if (sub === 'posalji') {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const files = [];
      const bannerPath = asset('blaze-server-banner.png');
      const widePath = asset('blaze-banner.png');
      const logoPath = asset('blaze-logo.png');

      if (logoPath) files.push(new AttachmentBuilder(logoPath, { name: 'blaze-logo.png' }));
      if (bannerPath) files.push(new AttachmentBuilder(bannerPath, { name: 'blaze-server-banner.png' }));
      if (widePath) files.push(new AttachmentBuilder(widePath, { name: 'blaze-banner.png' }));

      if (!files.length) {
        return interaction.editReply({ content: '❌ Nema slika u `assets/` folderu.' });
      }

      await interaction.channel.send({
        content: [
          '🎨 **BLAZE ROLEPLAY — BRENDING SLIKE**',
          '',
          '**logo** → avatar bota / ikonica servera (512×512)',
          '**blaze-server-banner** → server banner (960×540)',
          '**blaze-banner** → dobrodošlica / objave (1280×400)',
          '',
          '📌 *Klikni desnim klikom na sliku → Copy Link da dobiješ URL.*'
        ].join('\n'),
        files
      });

      return interaction.editReply({
        content: `✅ Slike poslate u <#${interaction.channelId}>. Desni klik → Copy Link za URL.`
      });
    }
  }
};
