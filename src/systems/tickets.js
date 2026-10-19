const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ChannelType,
  PermissionFlagsBits,
  MessageFlags,
  AttachmentBuilder
} = require('discord.js');
const config = require('../config');
const store = require('../store');
const { isStaff, formatDuration, COLOR } = require('../utils');
const { buildTranscript } = require('../transcript');

function typeLabel(value) {
  return config.ticketTypes.find((t) => t.value === value)?.label ?? value ?? '—';
}

function pad(num) {
  return String(num ?? 0).padStart(4, '0');
}

// ---------- Embed/komponente ----------

function buildPanelEmbed(guildName) {
  return new EmbedBuilder()
    .setColor(COLOR.main)
    .setTitle('🎫 Tiket sistem')
    .setDescription(
      [
        'Imaš pitanje ili problem? Naš tim je tu da pomogne!',
        '',
        '**📩 Kako otvoriti tiket:**',
        '1️⃣ Izaberi kategoriju u meniju ispod',
        '2️⃣ Bot ti automatski pravi privatan kanal',
        '3️⃣ Opiši detaljno svoj problem i sačekaj odgovor tima',
        '',
        '⚠️ Ne otvaraj više tiketa za istu stvar.'
      ].join('\n')
    )
    .setFooter({ text: `${guildName} • podrška` })
    .setTimestamp();
}

function buildPanelRow() {
  const menu = new StringSelectMenuBuilder()
    .setCustomId('ticket:create')
    .setPlaceholder('Izaberi kategoriju tiketa...')
    .addOptions(
      config.ticketTypes.map((t) =>
        new StringSelectMenuOptionBuilder()
          .setLabel(t.label)
          .setDescription(t.description)
          .setValue(t.value)
          .setEmoji(t.emoji)
      )
    );

  return new ActionRowBuilder().addComponents(menu);
}

function buildTicketEmbed(ticket) {
  return new EmbedBuilder()
    .setColor(COLOR.main)
    .setTitle(`🎫 Tiket #${pad(ticket.number)}`)
    .setDescription(
      [
        `Zdravo <@${ticket.userId}>! Hvala što si nas kontaktirao/la.`,
        'Opiši detaljno svoj problem i član tima će ti odgovoriti u najkraćem roku.',
        '',
        '🔒 Kada je problem rešen, klikni na **Zatvori tiket**.'
      ].join('\n')
    )
    .addFields(
      { name: '📂 Kategorija', value: typeLabel(ticket.type), inline: true },
      { name: '👤 Otvorio/la', value: `<@${ticket.userId}>`, inline: true },
      { name: '🙋 Preuzeo/la', value: ticket.claimedBy ? `<@${ticket.claimedBy}>` : '—', inline: true }
    )
    .setFooter({ text: `Tiket #${pad(ticket.number)} • ${new Date(ticket.createdAt).toLocaleDateString('sr-RS')}` })
    .setTimestamp(ticket.createdAt);
}

function buildTicketRow(channelId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`ticket:claim:${channelId}`)
      .setLabel('Preuzmi')
      .setEmoji('🙋')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`ticket:close:${channelId}`)
      .setLabel('Zatvori tiket')
      .setEmoji('🔒')
      .setStyle(ButtonStyle.Danger)
  );
}

function buildCloseConfirmRow(channelId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`ticket:confirm:${channelId}`)
      .setLabel('Da, zatvori')
      .setEmoji('✅')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(`ticket:cancel:${channelId}`)
      .setLabel('Otkaži')
      .setEmoji('❌')
      .setStyle(ButtonStyle.Secondary)
  );
}

// ---------- Panel ----------

async function sendPanel(interaction) {
  if (!isStaff(interaction.member)) {
    return interaction.reply({
      content: '❌ Samo članovi tima mogu da pošalju panel za tikete.',
      flags: MessageFlags.Ephemeral
    });
  }

  if (!config.ticketCategoryId) {
    return interaction.reply({
      content:
        '❌ `TICKET_CATEGORY_ID` nije podešen u `.env` fajlu.\nNapravi kategoriju (npr. **Tiketi**), desni klik → **Copy ID** i nalepi ga u `.env`.',
      flags: MessageFlags.Ephemeral
    });
  }

  const target = interaction.options.getChannel('kanal') ?? interaction.channel;
  if (!target?.isTextBased?.()) {
    return interaction.reply({
      content: '❌ Izaberi tekstualni kanal za panel.',
      flags: MessageFlags.Ephemeral
    });
  }

  await target.send({
    embeds: [buildPanelEmbed(interaction.guild.name)],
    components: [buildPanelRow()]
  });

  return interaction.reply({
    content: `✅ Panel za tikete je poslat u <#${target.id}>.`,
    flags: MessageFlags.Ephemeral
  });
}

// ---------- Otvaranje tiketa (select meni) ----------

async function handleSelect(interaction) {
  if (interaction.customId !== 'ticket:create') return false;

  if (!interaction.inGuild()) {
    await interaction.reply({
      content: '❌ Tiketi rade samo na serveru.',
      flags: MessageFlags.Ephemeral
    });
    return true;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const guild = interaction.guild;
  const user = interaction.user;
  const member = interaction.member;
  const type = interaction.values[0];

  if (!config.ticketCategoryId) {
    await interaction.editReply({
      content: '❌ Tiket sistem nije podešen (`TICKET_CATEGORY_ID` nedostaje u `.env`).'
    });
    return true;
  }

  // Već ima otvoren tiket?
  const existing = store.getOpenTicket(guild.id, user.id);
  if (existing) {
    const existingChannel = guild.channels.cache.get(existing.channelId);
    if (existingChannel) {
      await interaction.editReply({
        content: `❌ Već imaš otvoren tiket: <#${existingChannel.id}>`
      });
      return true;
    }
    // Kanal je u međuvremenu obrisan — očisti podatke
    store.removeTicket(guild.id, user.id);
  }

  // Rezervna provera preko tema kanala (data/ se briše pri restartu na Renderu)
  const existingFromChannels = await findExistingTicketChannel(guild, user.id);
  if (existingFromChannels) {
    await interaction.editReply({
      content: `❌ Već imaš otvoren tiket: <#${existingFromChannels.id}>`
    });
    return true;
  }

  // Staff rola (ako je podešena)
  let staffRole = null;
  if (config.staffRoleId) {
    staffRole = guild.roles.cache.get(config.staffRoleId) ?? null;
    if (!staffRole) {
      await interaction.editReply({
        content: '❌ `STAFF_ROLE_ID` nije validan — proveri ID role u `.env` fajlu.'
      });
      return true;
    }
  }

  const number = store.nextNumber();
  const safeUsername =
    (user.username || 'korisnik')
      .toLowerCase()
      .replace(/[^a-z0-9-_]/g, '')
      .slice(0, 20) || 'korisnik';
  const channelName = `tiket-${pad(number)}-${safeUsername}`;
  const createdAt = Date.now();

  // Dozvole
  const overwrites = [
    {
      id: guild.roles.everyone.id,
      deny: [PermissionFlagsBits.ViewChannel]
    },
    {
      id: user.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.EmbedLinks
      ]
    }
  ];

  // Sve staff role dobijaju pristup tiketu
  const staffIds = [
    ...(config.staffRoleIds ?? []),
    ...(staffRole ? [staffRole.id] : [])
  ].filter((id, index, arr) => id && arr.indexOf(id) === index);

  for (const roleId of staffIds) {
    overwrites.push({
      id: roleId,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.EmbedLinks,
        PermissionFlagsBits.ManageMessages
      ]
    });
  }

  try {
    const channel = await guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      parent: config.ticketCategoryId,
      // Tema sadrži podatke o tiketu — služi kao rezervna baza ako se data/ izgubi
      topic: store.buildTopic({
        number,
        userId: user.id,
        type,
        createdAt,
        claimedBy: null
      }),
      permissionOverwrites: overwrites
    });

    const ticket = {
      channelId: channel.id,
      userId: user.id,
      number,
      type,
      createdAt,
      claimedBy: null
    };
    store.setOpenTicket(guild.id, user.id, ticket);

    const staffMention = staffRole ? ` • <@&${staffRole.id}>` : '';

    await channel.send({
      content: `${member}${staffMention}`,
      embeds: [buildTicketEmbed(ticket)],
      components: [buildTicketRow(channel.id)]
    });

    await interaction.editReply({
      content: `✅ Tvoj tiket je otvoren: <#${channel.id}>`
    });
  } catch (err) {
    console.error('❌ Greška pri pravljenju tiketa:', err);
    await interaction.editReply({
      content:
        '❌ Nisam uspeo da napravim tiket.\nProveri da li bot ima dozvolu **Manage Channels** i da li je `TICKET_CATEGORY_ID` ispravan.'
    });
  }

  return true;
}

// ---------- Dugmići ----------

async function handleButton(interaction) {
  if (!interaction.customId.startsWith('ticket:')) return false;
  if (!interaction.inGuild()) return false;

  const [, action, channelId] = interaction.customId.split(':');
  let ticket = store.findByChannel(interaction.guild.id, channelId);

  // Ako je baza izgubljena (restart/deploy), pokušaj oporavak iz teme kanala
  if (!ticket && interaction.channel) {
    ticket = await recoverTicketFromChannel(interaction.channel);
  }

  if (!ticket || interaction.channelId !== ticket.channelId) {
    await interaction
      .reply({ content: '❌ Ovaj tiket više nije aktivan.', flags: MessageFlags.Ephemeral })
      .catch(() => {});
    return true;
  }

  if (action === 'claim') return claimTicket(interaction, ticket);
  if (action === 'close') return askClose(interaction, ticket);
  if (action === 'confirm') return confirmClose(interaction, ticket);
  if (action === 'cancel') return cancelClose(interaction);

  return true;
}

async function claimTicket(interaction, ticket) {
  if (!isStaff(interaction.member)) {
    await interaction.reply({
      content: '❌ Samo članovi tima mogu da preuzmu tiket.',
      flags: MessageFlags.Ephemeral
    });
    return true;
  }

  if (ticket.claimedBy === interaction.user.id) {
    await interaction.reply({
      content: '🙋 Već si preuzeo/la ovaj tiket.',
      flags: MessageFlags.Ephemeral
    });
    return true;
  }

  if (ticket.claimedBy) {
    await interaction.reply({
      content: `🙋 Tiket je već preuzeo/la <@${ticket.claimedBy}>.`,
      flags: MessageFlags.Ephemeral
    });
    return true;
  }

  store.updateTicket(interaction.guild.id, ticket.userId, { claimedBy: interaction.user.id });

  try {
    await interaction.message.edit({
      embeds: [buildTicketEmbed({ ...ticket, claimedBy: interaction.user.id })]
    });
  } catch {
    // nije kritično
  }

  // Upiši i u temu kanala (oporavak posle restarta)
  try {
    await interaction.channel.setTopic(
      store.buildTopic({ ...ticket, claimedBy: interaction.user.id })
    );
  } catch {
    // nije kritično
  }

  await interaction.reply({
    content: `🙋 Tiket je preuzeo/la ${interaction.user}.`
  });
  return true;
}

// Pitanje "da li stvarno želiš da zatvoriš?"
async function askClose(interaction, ticket) {
  const allowed = ticket.userId === interaction.user.id || isStaff(interaction.member);
  if (!allowed) {
    await interaction.reply({
      content: '❌ Nemaš dozvolu da zatvoriš ovaj tiket.',
      flags: MessageFlags.Ephemeral
    });
    return true;
  }

  const embed = new EmbedBuilder()
    .setColor(COLOR.warning)
    .setTitle('🔒 Zatvaranje tiketa')
    .setDescription(
      'Da li si siguran/na da želiš da zatvoriš ovaj tiket?\nBot će napraviti **transkript** poruka i obrisati kanal.'
    );

  await interaction.reply({
    embeds: [embed],
    components: [buildCloseConfirmRow(ticket.channelId)]
  });
  return true;
}

async function cancelClose(interaction) {
  await interaction.update({
    content: '✅ Zatvaranje otkazano.',
    embeds: [],
    components: []
  });
  return true;
}

async function confirmClose(interaction, ticket) {
  const allowed = ticket.userId === interaction.user.id || isStaff(interaction.member);
  if (!allowed) {
    await interaction.reply({
      content: '❌ Nemaš dozvolu da zatvoriš ovaj tiket.',
      flags: MessageFlags.Ephemeral
    });
    return true;
  }

  await interaction.deferUpdate();

  const guild = interaction.guild;
  const channel = interaction.channel;
  const closedAt = Date.now();

  // 1) Transkript
  let transcript = null;
  try {
    transcript = await buildTranscript(channel, ticket);
  } catch (err) {
    console.error('❌ Greška pri pravljenju transkripta:', err);
  }

  const makeAttachment = () =>
    transcript ? [new AttachmentBuilder(transcript.buffer, { name: transcript.fileName })] : [];

  // 2) Log u kanal
  if (config.ticketLogChannelId) {
    try {
      const logChannel =
        guild.channels.cache.get(config.ticketLogChannelId) ??
        (await guild.channels.fetch(config.ticketLogChannelId).catch(() => null));

      if (logChannel?.isTextBased()) {
        const logEmbed = new EmbedBuilder()
          .setColor(COLOR.danger)
          .setTitle(`🔒 Tiket #${pad(ticket.number)} zatvoren`)
          .addFields(
            { name: '👤 Korisnik', value: `<@${ticket.userId}>`, inline: true },
            { name: '📂 Kategorija', value: typeLabel(ticket.type), inline: true },
            { name: '🙋 Preuzeo/la', value: ticket.claimedBy ? `<@${ticket.claimedBy}>` : '—', inline: true },
            { name: '🛡️ Zatvorio/la', value: `${interaction.user}`, inline: true },
            { name: '⏱️ Trajanje', value: formatDuration(closedAt - ticket.createdAt), inline: true },
            { name: '💬 Poruka', value: String(transcript?.count ?? '?'), inline: true }
          )
          .setTimestamp(closedAt);

        await logChannel.send({ embeds: [logEmbed], files: makeAttachment() });
      }
    } catch (err) {
      console.warn('⚠️ Ne mogu da pošaljem transkript u log kanal:', err.message);
    }
  }

  // 3) Kopija transkripta korisniku u DM
  if (transcript) {
    try {
      const owner = await interaction.client.users.fetch(ticket.userId).catch(() => null);
      if (owner) {
        const dmEmbed = new EmbedBuilder()
          .setColor(COLOR.main)
          .setTitle('🎫 Tvoj tiket je zatvoren')
          .setDescription(
            `Tiket **#${pad(ticket.number)}** na serveru **${guild.name}** je zatvoren.\nU prilogu ti je transkript razgovora.`
          )
          .setTimestamp(closedAt);

        await owner.send({ embeds: [dmEmbed], files: makeAttachment() });
      }
    } catch {
      // korisnik ima isključene DM
    }
  }

  // 4) Počisti podatke i obriši kanal
  store.removeTicket(guild.id, ticket.userId);

  await interaction
    .editReply({
      content: '🔒 **Tiket se zatvara...** Hvala na strpljenju!',
      embeds: [],
      components: []
    })
    .catch(() => {});

  setTimeout(() => {
    channel.delete().catch(() => {});
  }, 5000);

  return true;
}

// ---------- Komande unutar tiketa ----------

async function requestClose(interaction) {
  const ticket = store.findByChannel(interaction.guild.id, interaction.channelId);
  if (!ticket) {
    return interaction.reply({
      content: '❌ Ova komanda radi samo unutar tiketa.',
      flags: MessageFlags.Ephemeral
    });
  }
  return askClose(interaction, ticket);
}

async function addMember(interaction) {
  if (!isStaff(interaction.member)) {
    return interaction.reply({
      content: '❌ Samo članovi tima mogu da dodaju korisnike u tiket.',
      flags: MessageFlags.Ephemeral
    });
  }

  const ticket = store.findByChannel(interaction.guild.id, interaction.channelId);
  if (!ticket) {
    return interaction.reply({
      content: '❌ Ova komanda radi samo unutar tiketa.',
      flags: MessageFlags.Ephemeral
    });
  }

  const target = interaction.options.getUser('korisnik', true);

  try {
    await interaction.channel.permissionOverwrites.edit(target.id, {
      ViewChannel: true,
      SendMessages: true,
      ReadMessageHistory: true,
      AttachFiles: true
    });
    return interaction.reply({ content: `✅ ${target} je dodat/a u tiket.` });
  } catch (err) {
    console.error(err);
    return interaction.reply({
      content: '❌ Ne mogu da dodam korisnika (proveri dozvole bota).',
      flags: MessageFlags.Ephemeral
    });
  }
}

async function removeMember(interaction) {
  if (!isStaff(interaction.member)) {
    return interaction.reply({
      content: '❌ Samo članovi tima mogu da uklone korisnike iz tiketa.',
      flags: MessageFlags.Ephemeral
    });
  }

  const ticket = store.findByChannel(interaction.guild.id, interaction.channelId);
  if (!ticket) {
    return interaction.reply({
      content: '❌ Ova komanda radi samo unutar tiketa.',
      flags: MessageFlags.Ephemeral
    });
  }

  const target = interaction.options.getUser('korisnik', true);

  if (target.id === ticket.userId) {
    return interaction.reply({
      content: '❌ Ne možeš ukloniti vlasnika tiketa — zatvori tiket ako je rešeno.',
      flags: MessageFlags.Ephemeral
    });
  }

  try {
    await interaction.channel.permissionOverwrites.delete(target.id);
    return interaction.reply({ content: `✅ ${target} je uklonjen/a iz tiketa.` });
  } catch (err) {
    console.error(err);
    return interaction.reply({
      content: '❌ Ne mogu da uklonim korisnika (proveri dozvole bota).',
      flags: MessageFlags.Ephemeral
    });
  }
}

// ---------- Oporavak tiketa (bitno za Render gde je disk efemeran) ----------

async function recoverTicketFromChannel(channel) {
  if (!channel?.guild || !channel.topic) return null;

  const parsed = store.parseTopic(channel.topic);
  if (!parsed) return null;

  const ticket = { channelId: channel.id, ...parsed };
  store.setOpenTicket(channel.guild.id, parsed.userId, ticket);
  return ticket;
}

async function findExistingTicketChannel(guild, userId) {
  if (!config.ticketCategoryId) return null;

  const channels = guild.channels.cache.filter(
    (c) => c.parentId === config.ticketCategoryId && c.type === ChannelType.GuildText
  );

  for (const channel of channels.values()) {
    const parsed = store.parseTopic(channel.topic);
    if (parsed?.userId === userId) {
      store.setOpenTicket(guild.id, userId, { channelId: channel.id, ...parsed });
      return channel;
    }
  }

  return null;
}

// Pri startu bota: pročitaj sve tikete iz tema kanala i popuni bazu
async function restoreTickets(client) {
  if (!config.ticketCategoryId) return;

  let restored = 0;

  for (const guild of client.guilds.cache.values()) {
    let channels;
    try {
      channels = await guild.channels.fetch();
    } catch {
      continue;
    }

    for (const channel of channels.values()) {
      if (!channel || channel.parentId !== config.ticketCategoryId) continue;

      const parsed = store.parseTopic(channel.topic);
      if (!parsed) continue;

      store.setOpenTicket(guild.id, parsed.userId, { channelId: channel.id, ...parsed });
      store.setCounterAtLeast(parsed.number);
      restored++;
    }
  }

  if (restored > 0) console.log(`♻️ Obnovljeno otvorenih tiketa iz kanala: ${restored}`);
}

module.exports = {
  sendPanel,
  handleSelect,
  handleButton,
  requestClose,
  addMember,
  removeMember,
  restoreTickets,
  buildPanelEmbed,
  buildPanelRow
};
