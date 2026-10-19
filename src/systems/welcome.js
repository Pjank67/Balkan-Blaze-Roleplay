const fs = require('fs');
const path = require('path');
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  AttachmentBuilder
} = require('discord.js');
const config = require('../config');
const { COLOR, formatDuration, channelLink } = require('../utils');

const BANNER_PATH = path.join(__dirname, '..', '..', 'assets', 'blaze-banner.png');

// Baner za dobrodošlicu: prvo URL iz .env, inače lokalna slika kao prilog
function resolveBanner() {
  if (config.welcomeBannerUrl) return { url: config.welcomeBannerUrl, files: [] };

  try {
    if (fs.existsSync(BANNER_PATH)) {
      return {
        url: 'attachment://banner.png',
        files: [new AttachmentBuilder(BANNER_PATH, { name: 'banner.png' })]
      };
    }
  } catch {
    // ignore
  }

  return { url: null, files: [] };
}

// Embed koji se šalje kada novi član uđe na server
function buildJoinEmbed(member) {
  const { guild, user } = member;
  const accountAge = Date.now() - user.createdTimestamp;
  const isNewAccount = accountAge < 7 * 24 * 60 * 60 * 1000;

  const lines = [
    `Dobrodošao/la na **${guild.name}**! 🎉`,
    '',
    '**Kako da počneš:**',
    config.verifyChannelId
      ? `1️⃣ Verifikuj se u <#${config.verifyChannelId}>`
      : '1️⃣ Verifikuj se preko panela za verifikaciju',
    config.rulesChannelId
      ? `2️⃣ Pročitaj pravila u <#${config.rulesChannelId}>`
      : '2️⃣ Pročitaj pravila servera',
    '3️⃣ Popuni whitelist prijavu i zaigraj! 🚗',
    '',
    'Ako ti nešto treba — otvori tiket, tu smo 24/7.'
  ];

  const embed = new EmbedBuilder()
    .setColor(COLOR.main)
    .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL({ size: 128 }) })
    .setTitle('🔥 NOVI ČLAN BALKAN BLAZE PORODICE')
    .setDescription(lines.join('\n'))
    .setThumbnail(user.displayAvatarURL({ size: 256 }))
    .addFields(
      {
        name: '👥 Član broj',
        value: `**#${guild.memberCount}**`,
        inline: true
      },
      {
        name: '📅 Nalog napravljen',
        value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`,
        inline: true
      },
      {
        name: '🔥 Status',
        value: config.verifyRoleId ? '⏳ Čeka verifikaciju' : '✅ Član',
        inline: true
      }
    )
    .setFooter({ text: guild.name, iconURL: guild.iconURL({ size: 64 }) ?? undefined })
    .setTimestamp();

  const banner = resolveBanner();
  if (banner.url) embed.setImage(banner.url);

  if (isNewAccount) {
    embed.addFields({
      name: '⚠️ Napomena',
      value: 'Nalog ti je veoma mlad — ako bude problema, kontaktiraj osoblje.'
    });
  }

  return embed;
}

// Dugmići ispod dobrodošlice
function buildJoinButtons(guild, member) {
  const buttons = [];

  if (config.verifyChannelId) {
    buttons.push(
      new ButtonBuilder()
        .setLabel('✅ Verifikuj se')
        .setStyle(ButtonStyle.Link)
        .setURL(channelLink(guild.id, config.verifyChannelId))
    );
  }

  if (config.rulesChannelId) {
    buttons.push(
      new ButtonBuilder()
        .setLabel('📜 Pravila')
        .setStyle(ButtonStyle.Link)
        .setURL(channelLink(guild.id, config.rulesChannelId))
    );
  }

  if (config.ticketPanelChannelId) {
    buttons.push(
      new ButtonBuilder()
        .setLabel('🎫 Podrška')
        .setStyle(ButtonStyle.Link)
        .setURL(channelLink(guild.id, config.ticketPanelChannelId))
    );
  }

  if (!buttons.length) return null;
  return new ActionRowBuilder().addComponents(buttons.slice(0, 5));
}

// Kada član uđe
async function onMemberJoin(member) {
  if (member.user.bot) return; // ignorišemo botove

  // 1) Automatska rola (npr. "Neverifikovan")
  if (config.autoRoleId) {
    try {
      const role = member.guild.roles.cache.get(config.autoRoleId);
      if (role) {
        await member.roles.add(role, 'Automatska rola za nove članove');
      } else {
        console.warn('⚠️ AUTO_ROLE_ID nije pronađen na serveru.');
      }
    } catch (err) {
      console.warn('⚠️ Ne mogu da dodelim auto rolu (proveri hijerarhiju rola):', err.message);
    }
  }

  // 2) Poruka dobrodošlice u kanal
  const channel =
    config.welcomeChannelId &&
    (member.guild.channels.cache.get(config.welcomeChannelId) ??
      (await member.guild.channels.fetch(config.welcomeChannelId).catch(() => null)));

  if (channel?.isTextBased()) {
    try {
      const row = buildJoinButtons(member.guild, member);
      const banner = resolveBanner();
      await channel.send({
        content: `👋 <@${member.id}>`,
        embeds: [buildJoinEmbed(member)],
        components: row ? [row] : [],
        files: banner.files
      });
    } catch (err) {
      console.warn('⚠️ Ne mogu da pošaljem poruku dobrodošlice:', err.message);
    }
  }

  // 3) Dobrodošlica u DM (opciono)
  if (config.welcomeDm) {
    try {
      const dmEmbed = new EmbedBuilder()
        .setColor(COLOR.main)
        .setTitle(`Dobrodošao/la na ${member.guild.name}! 🎉`)
        .setDescription(
          [
            `Zdravo ${member.user.username}!`,
            '',
            'Drago nam je što si tu. Par saveta za početak:',
            config.verifyChannelId ? `• Verifikuj se: <#${config.verifyChannelId}>` : '• Verifikuj se na serveru',
            config.rulesChannelId ? `• Pročitaj pravila: <#${config.rulesChannelId}>` : '• Pročitaj pravila servera',
            '• Popuni whitelist prijavu',
            '• Ako imaš pitanje, otvori tiket'
          ].join('\n')
        )
        .setThumbnail(member.guild.iconURL({ size: 256 }) ?? null);

      const dmBanner = resolveBanner();
      if (dmBanner.url) dmEmbed.setImage(dmBanner.url);
      await member.send({ embeds: [dmEmbed], files: dmBanner.files });
    } catch {
      // Korisnik ima isključene DM — nije problem
    }
  }
}

// Kada član ode
async function onMemberLeave(member) {
  if (member.user.bot) return;

  const channel =
    config.goodbyeChannelId &&
    (member.guild.channels.cache.get(config.goodbyeChannelId) ??
      (await member.guild.channels.fetch(config.goodbyeChannelId).catch(() => null)));

  if (!channel?.isTextBased()) return;

  const wasMemberFor =
    member.joinedTimestamp && Date.now() > member.joinedTimestamp
      ? formatDuration(Date.now() - member.joinedTimestamp)
      : null;

  const embed = new EmbedBuilder()
    .setColor(COLOR.danger)
    .setAuthor({
      name: member.user.tag,
      iconURL: member.user.displayAvatarURL({ size: 128 })
    })
    .setTitle('😢 Član nas je napustio/la')
    .setDescription(`**${member.user.username}** više nije na serveru.`)
    .addFields(
      {
        name: '⏳ Bio/la član',
        value: wasMemberFor ?? '—',
        inline: true
      },
      {
        name: '👥 Preostalo članova',
        value: `#${member.guild.memberCount}`,
        inline: true
      }
    )
    .setFooter({ text: member.guild.name })
    .setTimestamp();

  try {
    await channel.send({ embeds: [embed] });
  } catch (err) {
    console.warn('⚠️ Ne mogu da pošaljem oproštajnu poruku:', err.message);
  }
}

module.exports = { onMemberJoin, onMemberLeave, buildJoinEmbed, buildJoinButtons };
