const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  MessageFlags
} = require('discord.js');
const config = require('../config');
const db = require('../db');
const { COLOR, brandEmbed, isStaff } = require('../utils');

function pad(num) {
  return String(num ?? 0).padStart(3, '0');
}

// ---------- Panel ----------

function buildPanel() {
  const embed = brandEmbed({
    title: '💡 SUGESTIJE — BALKAN BLAZE ROLEPLAY',
    description: [
      'Imaš ideju kako da server bude bolji? Predloži!',
      '',
      '**Šta možeš da predložiš:**',
      '• Nove poslove, lokacije ili evente',
      '• Izmene pravila ili sistema',
      '• Nove frakcije / organizacije',
      '• Sve što bi poboljšalo RP',
      '',
      'Klikni na dugme, popuni predlog i ekipa će ga razmotriti.',
      '',
      '✅ Sugestije koje dobiju podršku zajednice idu prioritetno!'
    ].join('\n'),
    color: COLOR.main,
    footer: 'sugestije'
  });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('suggest:start')
      .setLabel('💡 Pošalji sugestiju')
      .setStyle(ButtonStyle.Primary)
  );

  return { embeds: [embed], components: [row] };
}

async function postPanel(channel) {
  return channel.send(buildPanel());
}

// ---------- Modal ----------

function buildSuggestionModal() {
  return new ModalBuilder()
    .setCustomId('suggest:modal')
    .setTitle('Nova sugestija')
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('naslov')
          .setLabel('Naslov sugestije')
          .setPlaceholder('Kratko i jasno, npr. "Dodajte posao Rudar"')
          .setStyle(TextInputStyle.Short)
          .setMaxLength(100)
          .setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('opis')
          .setLabel('Objasni predlog')
          .setPlaceholder('Šta predlažeš i zašto bi to poboljšalo server?')
          .setStyle(TextInputStyle.Paragraph)
          .setMaxLength(1000)
          .setRequired(true)
      )
    );
}

async function handleStartButton(interaction) {
  await interaction.showModal(buildSuggestionModal());
  return true;
}

async function handleModalSubmit(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const naslov = interaction.fields.getTextInputValue('naslov');
  const opis = interaction.fields.getTextInputValue('opis');
  const guild = interaction.guild;

  if (!config.suggestionChannelId) {
    return interaction.editReply({
      content: '❌ Kanali za sugestije nisu podešeni (`SUGGESTION_CHANNEL_ID`).'
    });
  }

  const channel =
    guild.channels.cache.get(config.suggestionChannelId) ??
    (await guild.channels.fetch(config.suggestionChannelId).catch(() => null));

  if (!channel?.isTextBased()) {
    return interaction.editReply({ content: '❌ Kanal za sugestije nije validan.' });
  }

  const number = db.update('suggestions', (data) => {
    data.counter = (data.counter ?? 0) + 1;
    return data;
  }).counter;

  const embed = brandEmbed({
    title: `💡 Sugestija #${pad(number)} — ${naslov}`,
    description: opis,
    color: COLOR.info,
    footer: `Predložio/la: ${interaction.user.tag} • status: na razmatranju`
  })
    .setAuthor({
      name: interaction.user.username,
      iconURL: interaction.user.displayAvatarURL({ size: 64 })
    });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`suggest:approve:${number}`)
      .setLabel('Prihvati')
      .setEmoji('✅')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`suggest:reject:${number}`)
      .setLabel('Odbij')
      .setEmoji('❌')
      .setStyle(ButtonStyle.Danger)
  );

  const message = await channel.send({ embeds: [embed], components: [row] });

  await message.react('👍').catch(() => {});
  await message.react('👎').catch(() => {});

  db.update('suggestions', (data) => {
    data.byMessage[message.id] = {
      number,
      authorId: interaction.user.id,
      naslov,
      opis,
      channelId: channel.id,
      messageId: message.id,
      status: 'pending',
      createdAt: Date.now()
    };
    return data;
  });

  return interaction.editReply({
    content: `✅ Sugestija poslata! Pogledaj je u <#${channel.id}>.`
  });
}

// ---------- Status (staff) ----------

async function handleStatusButton(interaction, action, number) {
  if (!isStaff(interaction.member)) {
    await interaction.reply({
      content: '❌ Samo osoblje može da menja status sugestije.',
      flags: MessageFlags.Ephemeral
    });
    return true;
  }

  const data = db.get('suggestions', { counter: 0, byMessage: {} });
  const entry = Object.values(data.byMessage).find((s) => s.number === Number(number));

  if (!entry) {
    await interaction.reply({ content: '❌ Sugestija nije pronađena u bazi.', flags: MessageFlags.Ephemeral });
    return true;
  }

  const approved = action === 'approve';
  const message = await interaction.channel.messages.fetch(entry.messageId).catch(() => null);

  if (message) {
    const old = message.embeds[0];
    const embed = brandEmbed({
      title: old?.title ?? `💡 Sugestija #${pad(number)}`,
      description: old?.description ?? entry.opis,
      color: approved ? COLOR.success : COLOR.danger,
      footer: `Predložio/la: <@${entry.authorId}> • status: ${approved ? 'PRIHVAĆENA ✅' : 'ODBIJENA ❌'}`
    });

    if (message.embeds[0]?.author) embed.setAuthor(message.embeds[0].author);

    await message.edit({ embeds: [embed], components: [] }).catch(() => {});
  }

  db.update('suggestions', (d) => {
    d.byMessage[entry.messageId].status = approved ? 'approved' : 'rejected';
    return d;
  });

  await interaction.reply({
    content: `${approved ? '✅ Sugestija prihvaćena' : '❌ Sugestija odbijena'} — #${pad(number)}.`
  });
  return true;
}

module.exports = {
  postPanel,
  handleStartButton,
  handleModalSubmit,
  handleStatusButton
};
