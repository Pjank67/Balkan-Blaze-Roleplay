const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ChannelType,
  PermissionFlagsBits,
  MessageFlags
} = require('discord.js');
const config = require('../config');
const db = require('../db');
const { COLOR, brandEmbed, isStaff } = require('../utils');

function rooms() {
  return db.get('tempvoice', { rooms: {} }).rooms;
}

function getRoom(channelId) {
  return rooms()[channelId] ?? null;
}

function saveRoom(channelId, data) {
  db.update('tempvoice', (tv) => {
    if (data === null) delete tv.rooms[channelId];
    else tv.rooms[channelId] = data;
    return tv;
  });
}

function buildPanelEmbed(channel, room) {
  const owner = channel.guild.members.cache.get(room.ownerId);
  const users = channel.members?.map((m) => `<@${m.id}>`).join(', ') || '—';

  return brandEmbed({
    title: '🔊 TVOJA SOBA',
    description: [
      'Ovo je tvoja privremena soba — nestaje kada ostane prazna.',
      '',
      'Koristi dugmiće ispod da je podesiš.'
    ].join('\n'),
    color: COLOR.main,
    fields: [
      { name: '👑 Vlasnik', value: owner ? `${owner}` : `<@${room.ownerId}>`, inline: true },
      { name: '👥 U sobi', value: users.slice(0, 1024), inline: true },
      { name: '👤 Limit', value: room.limit ? `${room.limit}` : '∞', inline: true }
    ],
    footer: 'temp voice'
  });
}

function buildPanelRow() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('tv:lock').setLabel('Zaključaj').setEmoji('🔒').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('tv:unlock').setLabel('Otključaj').setEmoji('🔓').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('tv:hide').setLabel('Sakrij').setEmoji('🙈').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('tv:show').setLabel('Prikaži').setEmoji('👁️').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('tv:delete').setLabel('Obriši').setEmoji('🗑️').setStyle(ButtonStyle.Danger)
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('tv:rename').setLabel('Preimenuj').setEmoji('✏️').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('tv:limit').setLabel('Limit').setEmoji('👥').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('tv:claim').setLabel('Preuzmi sobu').setEmoji('👑').setStyle(ButtonStyle.Success)
    )
  ];
}

async function refreshPanel(channel, room) {
  try {
    if (!room.panelMessageId) return;
    const message = await channel.messages.fetch(room.panelMessageId).catch(() => null);
    if (message) await message.edit({ embeds: [buildPanelEmbed(channel, room)] });
  } catch {
    // nije kritično
  }
}

// ---------- Pravljenje sobe ----------

async function createRoom(newState) {
  const member = newState.member;
  const guild = newState.guild;
  const joinChannel = newState.channel;

  if (!member || !joinChannel) return;

  try {
    const room = await guild.channels.create({
      name: `🔊 ${member.displayName}`.slice(0, 90),
      type: ChannelType.GuildVoice,
      parent: joinChannel.parentId ?? null,
      permissionOverwrites: [
        {
          id: guild.members.me.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.ManageChannels,
            PermissionFlagsBits.Connect,
            PermissionFlagsBits.SendMessages
          ]
        },
        {
          id: member.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.Connect,
            PermissionFlagsBits.Speak,
            PermissionFlagsBits.SendMessages
          ]
        }
      ]
    });

    await member.voice.setChannel(room, 'Temp voice soba').catch(() => {});

    const data = { ownerId: member.id, limit: 0, panelMessageId: null };
    saveRoom(room.id, data);

    const panel = await room.send({
      embeds: [buildPanelEmbed(room, data)],
      components: buildPanelRow()
    });

    data.panelMessageId = panel.id;
    saveRoom(room.id, data);
  } catch (err) {
    console.error('❌ Ne mogu da napravim temp sobu:', err);
  }
}

// ---------- Događaj glasovnog kanala ----------

async function handleVoiceState(oldState, newState) {
  if (!config.tempVoiceChannelId) return;

  // 1) Neko je ušao u "Napravi sobu"
  if (
    newState.channelId === config.tempVoiceChannelId &&
    oldState.channelId !== config.tempVoiceChannelId
  ) {
    await createRoom(newState);
    return;
  }

  // 2) Soba je ostala prazna -> obriši
  if (oldState.channelId && oldState.channelId !== config.tempVoiceChannelId) {
    const room = getRoom(oldState.channelId);
    if (!room) return;

    const guild = oldState.guild;
    const channel =
      guild.channels.cache.get(oldState.channelId) ??
      (await guild.channels.fetch(oldState.channelId).catch(() => null));

    if (!channel) {
      saveRoom(oldState.channelId, null);
      return;
    }

    if (channel.members.size === 0) {
      saveRoom(oldState.channelId, null);
      await channel.delete('Temp soba prazna').catch(() => {});
    }
  }
}

// ---------- Dugmići ----------

async function handleButton(interaction) {
  const action = interaction.customId.split(':')[1];
  const channel = interaction.channel;
  const room = getRoom(channel.id);

  if (!room) {
    await interaction.reply({
      content: '❌ Ovi dugmići rade samo u privremenim sobama.',
      flags: MessageFlags.Ephemeral
    });
    return true;
  }

  const owner = interaction.guild.members.cache.get(room.ownerId);
  const isOwner = interaction.user.id === room.ownerId;
  const ownerPresent = channel.members.has(room.ownerId);

  // Preuzimanje sobe je dozvoljeno samo ako vlasnik nije u sobi
  if (action === 'claim') {
    if (ownerPresent) {
      await interaction.reply({
        content: '❌ Vlasnik je još u sobi — ne možeš da preuzmeš.',
        flags: MessageFlags.Ephemeral
      });
      return true;
    }

    room.ownerId = interaction.user.id;
    saveRoom(channel.id, room);
    await interaction.reply({ content: `👑 Sada si vlasnik sobe!` });
    await refreshPanel(channel, room);
    return true;
  }

  if (!isOwner && !isStaff(interaction.member)) {
    await interaction.reply({
      content: '❌ Samo vlasnik sobe (ili osoblje) može da menja podešavanja.',
      flags: MessageFlags.Ephemeral
    });
    return true;
  }

  if (action === 'lock') {
    await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { Connect: false });
    await interaction.reply({ content: '🔒 Soba je zaključana.' });
    return true;
  }

  if (action === 'unlock') {
    await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { Connect: true });
    await interaction.reply({ content: '🔓 Soba je otključana.' });
    return true;
  }

  if (action === 'hide') {
    await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { ViewChannel: false });
    await interaction.reply({ content: '🙈 Soba je sakrivena.' });
    return true;
  }

  if (action === 'show') {
    await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { ViewChannel: true });
    await interaction.reply({ content: '👁️ Soba je vidljiva.' });
    return true;
  }

  if (action === 'delete') {
    saveRoom(channel.id, null);
    await interaction.reply({ content: '🗑️ Soba se briše...' });
    setTimeout(() => channel.delete().catch(() => {}), 1500);
    return true;
  }

  if (action === 'rename') {
    const modal = new ModalBuilder()
      .setCustomId(`tv:renamemodal:${channel.id}`)
      .setTitle('Preimenuj sobu')
      .addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('ime')
            .setLabel('Novo ime sobe')
            .setStyle(TextInputStyle.Short)
            .setMaxLength(90)
            .setRequired(true)
            .setValue(channel.name.replace(/^🔊\s*/, '').slice(0, 90))
        )
      );
    await interaction.showModal(modal);
    return true;
  }

  if (action === 'limit') {
    const modal = new ModalBuilder()
      .setCustomId(`tv:limitmodal:${channel.id}`)
      .setTitle('Limit igrača')
      .addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('limit')
            .setLabel('Maksimalan broj igrača (0 = bez limita)')
            .setStyle(TextInputStyle.Short)
            .setMaxLength(2)
            .setRequired(true)
            .setValue(String(room.limit ?? 0))
        )
      );
    await interaction.showModal(modal);
    return true;
  }

  return true;
}

async function handleRenameModal(interaction, channelId) {
  const room = getRoom(channelId);
  if (!room) return interaction.reply({ content: '❌ Soba ne postoji.', flags: MessageFlags.Ephemeral });

  const name = interaction.fields.getTextInputValue('ime').trim().slice(0, 90);
  const channel = interaction.guild.channels.cache.get(channelId);

  if (channel) await channel.setName(name).catch(() => {});
  await interaction.reply({ content: `✅ Soba preimenovana u **${name}**.`, flags: MessageFlags.Ephemeral });
  return true;
}

async function handleLimitModal(interaction, channelId) {
  const room = getRoom(channelId);
  if (!room) return interaction.reply({ content: '❌ Soba ne postoji.', flags: MessageFlags.Ephemeral });

  const parsed = Number(interaction.fields.getTextInputValue('limit'));
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 99) {
    return interaction.reply({ content: '❌ Unesi broj između 0 i 99.', flags: MessageFlags.Ephemeral });
  }

  room.limit = Math.floor(parsed);
  saveRoom(channelId, room);

  const channel = interaction.guild.channels.cache.get(channelId);
  if (channel) {
    await channel.setUserLimit(room.limit).catch(() => {});
    await refreshPanel(channel, room);
  }

  await interaction.reply({
    content: room.limit ? `👥 Limit postavljen na **${room.limit}**.` : '♾️ Limit uklonjen.',
    flags: MessageFlags.Ephemeral
  });
  return true;
}

module.exports = { handleVoiceState, handleButton, handleRenameModal, handleLimitModal };
