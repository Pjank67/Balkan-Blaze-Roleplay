const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  UserSelectMenuBuilder,
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

// ============================================================
//  TEMP VOICE — kontrolna tabla sobe
// ============================================================

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

// ---------- Embed ----------

function buildPanelEmbed(channel, room) {
  const guild = channel.guild;
  const owner = guild.members.cache.get(room.ownerId);
  const members = channel.members ? [...channel.members.values()] : [];

  const membersText = members.length
    ? members.map((m) => `<@${m.id}>`).slice(0, 20).join(', ')
    : '*niko nije u sobi*';

  return brandEmbed({
    title: '🎛️ UPRAVLJANJE SOBOM',
    description: [
      'Ovo je **tvoja** privremena soba — nestaje kada ostane prazna.',
      '',
      '**🔒 Zaključaj** — niko nov ne može da uđe',
      '**🙈 Sakrij** — soba se ne vidi u listi',
      '**🚪 Izbaci** — izbaci igrača iz sobe',
      '**✅ Dozvoli** — pusti igrača u zaključanu sobu',
      '**👑 Prenesi** — daj sobu drugom igraču',
      '',
      `🟢 Status: ${room.locked ? '**ZAKLJUČANA**' : 'otvorena'} • ${room.hidden ? '**SAKRIVENA**' : 'vidljiva'}`
    ].join('\n'),
    color: room.locked ? COLOR.danger : COLOR.main,
    fields: [
      { name: '👑 Vlasnik', value: owner ? `${owner}` : `<@${room.ownerId}>`, inline: true },
      { name: '👥 Limit', value: room.limit ? `${room.limit}` : '∞', inline: true },
      { name: '🔑 Dozvoljeni', value: room.allowed?.length ? room.allowed.map((id) => `<@${id}>`).join(', ').slice(0, 300) : '—', inline: true },
      { name: `👥 U sobi (${members.length})`, value: membersText.slice(0, 1024) }
    ],
    footer: 'temp voice • samo vlasnik i osoblje'
  });
}

// ---------- Komponente ----------

function buildPanelRows(channel, room) {
  const rows = [];

  // Red 1 — glavne akcije
  rows.push(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('tv:lock')
        .setLabel(room.locked ? 'Otključaj' : 'Zaključaj')
        .setEmoji(room.locked ? '🔓' : '🔒')
        .setStyle(room.locked ? ButtonStyle.Success : ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('tv:hide')
        .setLabel(room.hidden ? 'Prikaži' : 'Sakrij')
        .setEmoji(room.hidden ? '👁️' : '🙈')
        .setStyle(room.hidden ? ButtonStyle.Success : ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('tv:rename').setLabel('Preimenuj').setEmoji('✏️').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('tv:limit').setLabel('Limit').setEmoji('👥').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('tv:claim').setLabel('Preuzmi').setEmoji('👑').setStyle(ButtonStyle.Primary)
    )
  );

  // Red 2 — opasne akcije
  rows.push(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('tv:delete')
        .setLabel('Obriši sobu')
        .setEmoji('🗑️')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId('tv:refresh')
        .setLabel('Osveži')
        .setEmoji('🔄')
        .setStyle(ButtonStyle.Secondary)
    )
  );

  // Red 3 — izbaci korisnika
  rows.push(
    new ActionRowBuilder().addComponents(
      new UserSelectMenuBuilder()
        .setCustomId('tv:kick')
        .setPlaceholder('🚪 Izbaci korisnika iz sobe...')
        .setMaxValues(5)
    )
  );

  // Red 4 — dozvoli korisnika
  rows.push(
    new ActionRowBuilder().addComponents(
      new UserSelectMenuBuilder()
        .setCustomId('tv:permit')
        .setPlaceholder('✅ Dozvoli korisniku da uđe...')
        .setMaxValues(5)
    )
  );

  // Red 5 — prenesi vlasništvo
  rows.push(
    new ActionRowBuilder().addComponents(
      new UserSelectMenuBuilder()
        .setCustomId('tv:transfer')
        .setPlaceholder('👑 Prenesi vlasništvo na...')
        .setMaxValues(1)
    )
  );

  return rows;
}

async function refreshPanel(channel, room) {
  try {
    if (!room.panelMessageId) return;
    const message = await channel.messages.fetch(room.panelMessageId).catch(() => null);
    if (message) {
      await message.edit({
        embeds: [buildPanelEmbed(channel, room)],
        components: buildPanelRows(channel, room)
      });
    }
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
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.MoveMembers
          ]
        },
        {
          id: member.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.Connect,
            PermissionFlagsBits.Speak,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ManageChannels,
            PermissionFlagsBits.MoveMembers
          ]
        }
      ]
    });

    await member.voice.setChannel(room, 'Temp voice soba').catch(() => {});

    const data = {
      ownerId: member.id,
      limit: 0,
      locked: false,
      hidden: false,
      allowed: [],
      panelMessageId: null,
      createdAt: Date.now()
    };

    saveRoom(room.id, data);

    const panel = await room.send({
      embeds: [buildPanelEmbed(room, data)],
      components: buildPanelRows(room, data)
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

  // 1) Neko je ušao u "➕ Napravi sobu"
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
      return;
    }

    // osveži panel kad se broj članova promeni
    const updated = getRoom(channel.id);
    if (updated?.panelMessageId) {
      setTimeout(() => refreshPanel(channel, updated).catch(() => {}), 500);
    }
  }
}

// ---------- Dozvole ----------

function isOwnerOrStaff(interaction, room) {
  return interaction.user.id === room.ownerId || isStaff(interaction.member);
}

async function denyEveryone(channel, guild, { connect = false, view = false }) {
  const deny = [];
  if (connect) deny.push(PermissionFlagsBits.Connect);
  if (view) deny.push(PermissionFlagsBits.ViewChannel);

  await channel.permissionOverwrites.edit(guild.roles.everyone.id, { deny }, { reason: 'Temp voice — zaključano' });
}

async function allowEveryone(channel, guild, { connect = false, view = false }) {
  const patch = {};
  if (connect) patch.Connect = true;
  if (view) patch.ViewChannel = true;

  await channel.permissionOverwrites.edit(guild.roles.everyone.id, patch, {
    reason: 'Temp voice — otključano'
  });
}

// ---------- Dugmići ----------

async function handleButton(interaction) {
  const action = interaction.customId.split(':')[1];
  const channel = interaction.channel;
  const room = getRoom(channel.id);

  if (!room) {
    await interaction.reply({
      content: '❌ Ovi dugmići rade samo u privremenim sobama. Uđi u **➕ Napravi sobu** da napraviš svoju.',
      flags: MessageFlags.Ephemeral
    });
    return true;
  }

  const isOwner = interaction.user.id === room.ownerId;
  const ownerPresent = channel.members.has(room.ownerId);

  // ---------- PREUZMI ----------
  if (action === 'claim') {
    if (ownerPresent) {
      await interaction.reply({
        content: '❌ Vlasnik je još u sobi — ne možeš da preuzmeš.',
        flags: MessageFlags.Ephemeral
      });
      return true;
    }

    const oldOwner = room.ownerId;
    room.ownerId = interaction.user.id;
    saveRoom(channel.id, room);

    // dozvole: novi vlasnik dobija ManageChannels
    await channel.permissionOverwrites
      .edit(interaction.user.id, {
        ViewChannel: true,
        Connect: true,
        Speak: true,
        SendMessages: true,
        ManageChannels: true,
        MoveMembers: true
      })
      .catch(() => {});

    await channel.permissionOverwrites
      .edit(oldOwner, { ManageChannels: false, MoveMembers: false })
      .catch(() => {});

    await interaction.reply({ content: `👑 Sada si vlasnik sobe!` });
    await refreshPanel(channel, room);
    return true;
  }

  // ---------- OSVEŽI ----------
  if (action === 'refresh') {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    await refreshPanel(channel, room);
    await interaction.editReply({ content: '🔄 Panel osvežen.' });
    return true;
  }

  // ostalo samo vlasnik / staff
  if (!isOwnerOrStaff(interaction, room)) {
    await interaction.reply({
      content: '❌ Samo vlasnik sobe (ili osoblje) može da menja podešavanja.',
      flags: MessageFlags.Ephemeral
    });
    return true;
  }

  // ---------- ZAKLJUČAJ / OTKLJUČAJ ----------
  if (action === 'lock') {
    room.locked = !room.locked;
    saveRoom(channel.id, room);

    if (room.locked) {
      await denyEveryone(channel, interaction.guild, { connect: true });
    } else {
      await allowEveryone(channel, interaction.guild, { connect: true });
    }

    await interaction.reply({
      content: room.locked
        ? '🔒 Soba je **zaključana** — niko nov ne može da uđe. Koristi **✅ Dozvoli** da pustiš nekoga.'
        : '🔓 Soba je **otključana** — svi mogu da uđu.'
    });

    await refreshPanel(channel, room);
    return true;
  }

  // ---------- SAKRIJ / PRIKAŽI ----------
  if (action === 'hide') {
    room.hidden = !room.hidden;
    saveRoom(channel.id, room);

    if (room.hidden) {
      await denyEveryone(channel, interaction.guild, { view: true });
    } else {
      await allowEveryone(channel, interaction.guild, { view: true }).catch(() => {});
    }

    await interaction.reply({
      content: room.hidden
        ? '🙈 Soba je **sakrivena** — niko je ne vidi u listi osim onih koji su unutra.'
        : '👁️ Soba je **vidljiva** svima.'
    });

    await refreshPanel(channel, room);
    return true;
  }

  // ---------- OBRIŠI ----------
  if (action === 'delete') {
    saveRoom(channel.id, null);
    await interaction.reply({ content: '🗑️ Soba se briše...' });
    setTimeout(() => channel.delete().catch(() => {}), 1500);
    return true;
  }

  // ---------- PREIMENUJ ----------
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

  // ---------- LIMIT ----------
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

// ---------- Select meniji (izbaci / dozvoli / prenesi) ----------

async function handleSelect(interaction) {
  const action = interaction.customId.split(':')[1];
  const channel = interaction.channel;
  const room = getRoom(channel.id);

  if (!room) {
    await interaction.reply({
      content: '❌ Ovo radi samo u privremenim sobama.',
      flags: MessageFlags.Ephemeral
    });
    return true;
  }

  if (!isOwnerOrStaff(interaction, room)) {
    await interaction.reply({
      content: '❌ Samo vlasnik sobe (ili osoblje) može da upravlja članovima.',
      flags: MessageFlags.Ephemeral
    });
    return true;
  }

  const targetIds = interaction.values ?? [];

  // ---------- IZBACI ----------
  if (action === 'kick') {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const kicked = [];
    const failed = [];

    for (const id of targetIds) {
      if (id === room.ownerId) {
        failed.push(`<@${id}> (vlasnik)`);
        continue;
      }
      if (id === interaction.client.user.id) {
        failed.push(`<@${id}> (bot)`);
        continue;
      }

      const member = channel.members.get(id);
      if (!member) {
        failed.push(`<@${id}> (nije u sobi)`);
        continue;
      }

      try {
        await member.voice.disconnect('Izbačen iz temp sobe');
        kicked.push(`<@${id}>`);
      } catch {
        failed.push(`<@${id}>`);
      }
    }

    const lines = [];
    if (kicked.length) lines.push(`🚪 Izbačen/a: ${kicked.join(', ')}`);
    if (failed.length) lines.push(`⚠️ Nije uspelo: ${failed.join(', ')}`);
    if (!lines.length) lines.push('Nema promena.');

    await interaction.editReply({ content: lines.join('\n') });
    await refreshPanel(channel, room);
    return true;
  }

  // ---------- DOZVOLI ----------
  if (action === 'permit') {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const allowed = new Set(room.allowed ?? []);
    const permitted = [];

    for (const id of targetIds) {
      try {
        await channel.permissionOverwrites.edit(id, {
          ViewChannel: true,
          Connect: true,
          Speak: true,
          SendMessages: true
        });
        allowed.add(id);
        permitted.push(`<@${id}>`);
      } catch {
        // ignore
      }
    }

    room.allowed = [...allowed];
    saveRoom(channel.id, room);

    await interaction.editReply({
      content: permitted.length
        ? `✅ Sada mogu da uđu: ${permitted.join(', ')}`
        : '⚠️ Nisam uspeo da dozvolim pristup.'
    });

    await refreshPanel(channel, room);
    return true;
  }

  // ---------- PRENESI VLASNIŠTVO ----------
  if (action === 'transfer') {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const newOwnerId = targetIds[0];
    const newOwner = await interaction.guild.members.fetch(newOwnerId).catch(() => null);

    if (!newOwner) {
      return interaction.editReply({ content: '❌ Korisnik nije pronađen.' });
    }

    if (newOwner.id === room.ownerId) {
      return interaction.editReply({ content: '❌ Taj korisnik je već vlasnik sobe.' });
    }

    const oldOwnerId = room.ownerId;
    room.ownerId = newOwner.id;
    saveRoom(channel.id, room);

    await channel.permissionOverwrites
      .edit(newOwner.id, {
        ViewChannel: true,
        Connect: true,
        Speak: true,
        SendMessages: true,
        ManageChannels: true,
        MoveMembers: true
      })
      .catch(() => {});

    await channel.permissionOverwrites
      .edit(oldOwnerId, { ManageChannels: false, MoveMembers: false })
      .catch(() => {});

    await interaction.editReply({ content: `👑 Vlasništvo preneseno na <@${newOwner.id}>.` });
    await refreshPanel(channel, room);
    return true;
  }

  return true;
}

// ---------- Modali ----------

async function handleRenameModal(interaction, channelId) {
  const room = getRoom(channelId);
  if (!room) return interaction.reply({ content: '❌ Soba ne postoji.', flags: MessageFlags.Ephemeral });

  if (!isOwnerOrStaff(interaction, room)) {
    return interaction.reply({
      content: '❌ Samo vlasnik može da preimenuje sobu.',
      flags: MessageFlags.Ephemeral
    });
  }

  const name = interaction.fields.getTextInputValue('ime').trim().slice(0, 90);
  const channel = interaction.guild.channels.cache.get(channelId);

  if (channel) await channel.setName(name).catch(() => {});
  await interaction.reply({ content: `✅ Soba preimenovana u **${name}**.`, flags: MessageFlags.Ephemeral });
  return true;
}

async function handleLimitModal(interaction, channelId) {
  const room = getRoom(channelId);
  if (!room) return interaction.reply({ content: '❌ Soba ne postoji.', flags: MessageFlags.Ephemeral });

  if (!isOwnerOrStaff(interaction, room)) {
    return interaction.reply({
      content: '❌ Samo vlasnik može da menja limit.',
      flags: MessageFlags.Ephemeral
    });
  }

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

module.exports = {
  handleVoiceState,
  handleButton,
  handleSelect,
  handleRenameModal,
  handleLimitModal,
  buildPanelEmbed,
  buildPanelRows,
  getRoom,
  saveRoom
};
