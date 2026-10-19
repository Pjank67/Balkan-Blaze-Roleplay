const { ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const config = require('../config');
const db = require('../db');
const { COLOR, brandEmbed } = require('../utils');

// Panel sa pravilima + dugme za verifikaciju
function buildVerifyPanel() {
  const embed = brandEmbed({
    title: '🛡️ VERIFIKACIJA — BLAZE ROLEPLAY',
    description: [
      'Pre nego što uđeš u grad, moraš proći verifikaciju.',
      '',
      '**Pravila servera (kratko):**',
      '1️⃣ **RP je obavezan** — nikakav RDM, VDM, Fail RP ili Metagaming.',
      '2️⃣ **Poštuj sve igrače** — bez vređanja, rasizma i toksičnosti.',
      '3️⃣ **Mikrofon obavezan** za RP situacije.',
      '4️⃣ **Nema cheatova** — VAC ban = trajni ban.',
      '5️⃣ **Slušaj osoblje** — odluke admina su konačne.',
      '6️⃣ **Bez reklamiranja** drugih servera i Discorda.',
      '7️⃣ **Nema alt naloga** — jedan nalog po osobi.',
      '',
      '✅ Klikni na dugme ispod da prihvatiš pravila i dobiješ pristup serveru.'
    ].join('\n'),
    color: COLOR.main,
    footer: 'verifikacija'
  });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('verify:accept')
      .setLabel('✅ Prihvatam pravila')
      .setStyle(ButtonStyle.Success)
  );

  return { embeds: [embed], components: [row] };
}

async function postPanel(channel) {
  return channel.send(buildVerifyPanel());
}

async function handleButton(interaction) {
  if (interaction.customId !== 'verify:accept') return false;

  if (!interaction.inGuild()) return false;
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const member = interaction.member;
  const verified = db.get('verified', {});

  if (verified[member.id]) {
    await interaction.editReply({
      content: '✅ Već si verifikovan/a! Uživaj na serveru. 🔥'
    });
    return true;
  }

  if (!config.verifyRoleId) {
    await interaction.editReply({
      content: '❌ Verifikacija nije podešena (`VERIFY_ROLE_ID` nedostaje u konfiguraciji).'
    });
    return true;
  }

  try {
    const role = interaction.guild.roles.cache.get(config.verifyRoleId);
    if (!role) {
      await interaction.editReply({ content: '❌ Rola za verifikaciju nije pronađena na serveru.' });
      return true;
    }

    await member.roles.add(role, 'Prihvatio/la pravila (verifikacija)');

    if (config.unverifiedRoleId) {
      await member.roles.remove(config.unverifiedRoleId, 'Verifikovan').catch(() => {});
    }

    db.update('verified', (data) => {
      data[member.id] = Date.now();
      return data;
    });

    await interaction.editReply({
      content: '✅ **Verifikacija uspešna!** Dobrodošao/la u Blaze Roleplay. 🔥\nSledeći korak: popuni whitelist prijavu.'
    });
  } catch (err) {
    console.error('❌ Verifikacija nije uspela:', err);
    await interaction.editReply({
      content: '❌ Ne mogu da ti dodelim rolu. Kontaktiraj osoblje (proveri hijerarhiju rola).'
    });
  }

  return true;
}

module.exports = { postPanel, handleButton, buildVerifyPanel };
