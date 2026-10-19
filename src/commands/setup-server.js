const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
  EmbedBuilder
} = require('discord.js');
const { runSetup, wipe } = require('../systems/setupServer');
const { COLOR } = require('../utils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup-server')
    .setDescription('🔥 Napravi ceo server: 9 kategorija, 44 kanala, 16 rola i sve panele')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false)
    .addBooleanOption((option) =>
      option
        .setName('potvrdi')
        .setDescription('Potvrdi da želiš da bot napravi role, kanale i panele')
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName('ocisti')
        .setDescription('Pre pravljenja obriši postojeće kanale/role')
        .setRequired(false)
        .addChoices(
          { name: 'Ne — samo dopuni (preporučeno)', value: 'ne' },
          { name: 'Obriši samo ono što je bot napravio', value: 'botovo' },
          { name: 'Obriši SVE kanale i role (⚠️ nepovratno)', value: 'sve' }
        )
    )
    .addBooleanOption((option) =>
      option
        .setName('postavi_ikonu')
        .setDescription('Postavi Blaze Roleplay logo kao ikonicu servera')
        .setRequired(false)
    ),

  async execute(interaction) {
    const confirmed = interaction.options.getBoolean('potvrdi', true);
    const cleanMode = interaction.options.getString('ocisti') ?? 'ne';
    const setIcon = interaction.options.getBoolean('postavi_ikonu') ?? true;

    if (!confirmed) {
      return interaction.reply({
        content: '❌ Setup je otkazan. Pokreni ponovo sa `potvrdi: True` kad budeš spreman/na.',
        flags: MessageFlags.Ephemeral
      });
    }

    if (!interaction.inGuild()) {
      return interaction.reply({
        content: '❌ Ova komanda radi samo na serveru.',
        flags: MessageFlags.Ephemeral
      });
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const me = interaction.guild.members.me;

    if (
      !me.permissions.has(PermissionFlagsBits.ManageChannels) ||
      !me.permissions.has(PermissionFlagsBits.ManageRoles)
    ) {
      return interaction.editReply({
        content:
          '❌ Botu nedostaju dozvole **Manage Channels** i **Manage Roles**.\nDodaj bota ponovo preko linka sa dozvolama (vidi `BLAZE-SETUP.md`).'
      });
    }

    const progressEmbed = (text) =>
      new EmbedBuilder()
        .setColor(COLOR.main)
        .setTitle('⚙️ Pravim tvoj server...')
        .setDescription(
          [
            text,
            '',
            'Ne zatvaraj Discord — biće gotovo za 1-3 minuta. 🔥',
            '',
            '*Savet: ako je ovo potpuno nov test server, prvo pokreni `/reset-server sta: Sve` da počneš od nule.*'
          ].join('\n')
        );

    await interaction.editReply({ embeds: [progressEmbed('🚀 Počinjem...')] });

    try {
      // opciono čišćenje pre setupa
      if (cleanMode !== 'ne') {
        const mode = cleanMode === 'sve' ? 'sve' : 'botovo';
        await interaction.editReply({
          embeds: [progressEmbed(`🧹 Brišem postojeće (${mode === 'sve' ? 'sve' : 'botovo'})...`)]
        });
        await wipe(interaction.guild, mode, { keepChannelId: interaction.channelId });
      }

      const lastProgress = { text: '' };

      const report = await runSetup(interaction.guild, {
        setIcon,
        onProgress: async (text) => {
          if (text === lastProgress.text) return;
          lastProgress.text = text;
          await interaction.editReply({ embeds: [progressEmbed(text)] });
        }
      });

      const parts = [];

      if (report.categories.length) {
        parts.push(`**📁 Kategorije (${report.categories.length})**\n${report.categories.join('\n')}`);
      }
      if (report.roles.length) {
        parts.push(`**🎭 Role (${report.roles.length})**\n${report.roles.join('\n')}`);
      }
      if (report.channels.length) {
        parts.push(`**💬 Kanali (${report.channels.length})**\n${report.channels.join('\n')}`);
      }
      if (report.panels.length) {
        parts.push(`**⚙️ Panele i sistemi**\n${report.panels.map((p) => `✅ ${p}`).join('\n')}`);
      }
      if (report.skipped.length) {
        parts.push(`**⏭️ Preskočeno**\n${report.skipped.join('\n')}`);
      }
      if (report.errors.length) {
        parts.push(`**⚠️ Greške**\n${report.errors.slice(0, 10).join('\n')}`);
      }

      const done = new EmbedBuilder()
        .setColor(report.errors.length ? COLOR.warning : COLOR.success)
        .setTitle(report.errors.length ? '✅ Setup završen (uz par napomena)' : '🔥 SERVER JE SPREMAN!')
        .setDescription(parts.join('\n\n').slice(0, 4000))
        .addFields({
          name: '📌 Sledeći koraci',
          value: [
            '1️⃣ Proveri da je **rola bota iznad** novih rola (Server Settings → Roles)',
            '2️⃣ Uđi u `#verifikacija` i klikni dugme → dobijaš **✅ Verifikovan**',
            '3️⃣ Otvori `#prijava-departmana` → prijavi se za LSPD/EMS/Mehaničara',
            '4️⃣ Za FiveM status: `FIVEM_HOST` u env + restart, pa `/status panel`',
            '5️⃣ Sve ID-jeve je bot **sam sačuvao** — ništa ne kopiraš'
          ].join('\n')
        })
        .setFooter({ text: 'Blaze Roleplay • setup' })
        .setTimestamp();

      await interaction.editReply({ embeds: [done] });
    } catch (err) {
      console.error('❌ Setup-server greška:', err);
      await interaction.editReply({
        content: `❌ Setup nije uspeo: **${err.message}**\n\nProveri da bot ima **Administrator** dozvolu pa pokušaj ponovo.`
      });
    }
  }
};
