const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ChannelType,
  PermissionFlagsBits,
  MessageFlags,
  AttachmentBuilder
} = require('discord.js');
const config = require('../config');
const db = require('../db');
const { COLOR, brandEmbed, isStaff, sendToChannel } = require('../utils');
const { buildTranscript } = require('../transcript');

const dbApp = () => db.get('applications', { counter: 0, byUser: {} });

function pad(num) {
  return String(num ?? 0).padStart(4, '0');
}

function deptByValue(value) {
  return config.departmentTypes.find((d) => d.value === value) ?? null;
}

// ---------- Panel ----------

function buildApplyPanelEmbed() {
  return brandEmbed({
    title: '📝 PRIJAVE ZA DEPARTMANE — BLAZE ROLEPLAY',
    description: [
      'Želiš da radiš u gradu? Prijavi se za jedan od departmana.',
      '',
      '**👮 LSPD** — policija, šerifi, saobraćajna',
      '**🚑 EMS** — lekari, bolničari, vatrogasci',
      '**🔧 Mehanicar** — auto-mehaničari, tuneri, vulkanizeri',
      '**📰 Novinar** — reporteri, voditelji, snimatelji',
      '',
      '**Kako ide proces:**',
      '1️⃣ Izaberi departman u meniju ispod',
      '2️⃣ Popuni formu (5 pitanja)',
      '3️⃣ Prijava ide timu na pregled u privatni kanal',
      '4️⃣ Odgovor dobijaš u **DM** (i ovde na serveru)',
      '',
      '⏱️ Odgovor obično stiže u roku od 24h.',
      '⚠️ Lažni podaci = automatsko odbijanje.',
      '',
      '**Uslovi:**',
      '• Minimum 14 godina',
      '• Mikrofon i Discord (bez alt naloga)',
      '• Nema VAC/ban istorije na RP serverima',
      '• Poštovanje prema igračima i timu'
    ].join('\n'),
    color: COLOR.main,
    footer: 'departmani • prijave'
  });
}

function buildApplyPanelRow() {
  const menu = new StringSelectMenuBuilder()
    .setCustomId('apply:dept')
    .setPlaceholder('Izaberi departman za koji se prijavljuješ...')
    .addOptions(
      config.departmentTypes.map((d) =>
        new StringSelectMenuOptionBuilder()
          .setLabel(d.label)
          .setDescription(d.description)
          .setValue(d.value)
          .setEmoji(d.emoji)
      )
    );

  return new ActionRowBuilder().addComponents(menu);
}

async function postPanel(channel) {
  return channel.send({ embeds: [buildApplyPanelEmbed()], components: [buildApplyPanelRow()] });
}

// ---------- Modal ----------

function buildApplyModal(deptValue) {
  const dept = deptByValue(deptValue);
  if (!dept) return null;

  const modal = new ModalBuilder()
    .setCustomId(`apply:modal:${dept.value}`)
    .setTitle(`Prijava — ${dept.label}`);

  const name = new TextInputBuilder()
    .setCustomId('ime')
    .setLabel('Ime i godine')
    .setPlaceholder('npr. Marko, 18')
    .setStyle(TextInputStyle.Short)
    .setMaxLength(60)
    .setRequired(true);

  const steam = new TextInputBuilder()
    .setCustomId('steam')
    .setLabel('Steam Hex / FiveM ID')
    .setPlaceholder('npr. steam:1100001A2B3C4D5 ili license:...')
    .setStyle(TextInputStyle.Short)
    .setMaxLength(100)
    .setRequired(true);

  const exp = new TextInputBuilder()
    .setCustomId('iskustvo')
    .setLabel('Iskustvo u RolePlay-u')
    .setPlaceholder('Na kojim serverima si igrao/la i koliko dugo?')
    .setStyle(TextInputStyle.Paragraph)
    .setMaxLength(1000)
    .setRequired(true);

  const why = new TextInputBuilder()
    .setCustomId('zasto')
    .setLabel('Zašto baš ti?')
    .setPlaceholder('Šta te izdvaja od ostalih kandidata?')
    .setStyle(TextInputStyle.Paragraph)
    .setMaxLength(1000)
    .setRequired(true);

  const extra = new TextInputBuilder()
    .setCustomId('dodatno')
    .setLabel(dept.extraLabel)
    .setPlaceholder(dept.extraPlaceholder)
    .setStyle(TextInputStyle.Paragraph)
    .setMaxLength(1000)
    .setRequired(true);

  modal.addComponents(
    new ActionRowBuilder().addComponents(name),
    new ActionRowBuilder().addComponents(steam),
    new ActionRowBuilder().addComponents(exp),
    new ActionRowBuilder().addComponents(why),
    new ActionRowBuilder().addComponents(extra)
  );

  return modal;
}

function applicationStatus(userId) {
  return dbApp().byUser[userId] ?? null;
}

// ---------- Koraci ----------

async function handleStartButton(interaction) {
  const status = applicationStatus(interaction.user.id);

  if (status?.status === 'pending') {
    await interaction.reply({
      content: `⏳ Već imaš prijavu na čekanju (**#${pad(status.number)}** — ${status.deptLabel ?? 'departman'}). Sačekaj odgovor tima.`,
      flags: MessageFlags.Ephemeral
    });
    return true;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  await interaction.editReply({
    embeds: [
      brandEmbed({
        title: '📝 Izaberi departman',
        description: 'Izaberi departman u meniju ispod panela **Prijave za departmane**.',
        color: COLOR.info,
        footer: 'departmani'
      })
    ]
  });
  return true;
}

// Izbor departmana u meniju -> otvara formu
async function handleDeptSelect(interaction) {
  const dept = deptByValue(interaction.values[0]);

  if (!dept) {
    await interaction.reply({ content: '❌ Nepoznat departman.', flags: MessageFlags.Ephemeral });
    return true;
  }

  const status = applicationStatus(interaction.user.id);

  if (status?.status === 'pending') {
    await interaction.reply({
      content: `⏳ Već imaš prijavu na čekanju (**#${pad(status.number)}**). Sačekaj odgovor tima.`,
      flags: MessageFlags.Ephemeral
    });
    return true;
  }

  const modal = buildApplyModal(dept.value);
  await interaction.showModal(modal);
  return true;
}

async function handleModalSubmit(interaction, deptValue) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const dept = deptByValue(deptValue);
  if (!dept) {
    return interaction.editReply({ content: '❌ Nepoznat departman.' });
  }

  const guild = interaction.guild;
  const user = interaction.user;

  const answers = {
    ime: interaction.fields.getTextInputValue('ime'),
    steam: interaction.fields.getTextInputValue('steam'),
    iskustvo: interaction.fields.getTextInputValue('iskustvo'),
    zasto: interaction.fields.getTextInputValue('zasto'),
    dodatno: interaction.fields.getTextInputValue('dodatno')
  };

  const status = applicationStatus(user.id);
  if (status?.status === 'pending') {
    return interaction.editReply({ content: '⏳ Već imaš prijavu na čekanju.' });
  }

  const categoryId = config.applyCategoryId ?? config.ticketCategoryId;
  if (!categoryId) {
    return interaction.editReply({
      content: '❌ Prijave nisu podešene (`APPLY_CATEGORY_ID` ili `TICKET_CATEGORY_ID` nedostaje).'
    });
  }

  const staffIds = config.staffRoleIds ?? [];
  const number = db.update('applications', (d) => {
    d.counter = (d.counter ?? 0) + 1;
    return d;
  }).counter;

  const safeName =
    (user.username || 'korisnik').toLowerCase().replace(/[^a-z0-9-_]/g, '').slice(0, 16) || 'korisnik';

  const overwrites = [
    { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
    {
      id: user.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory
      ]
    }
  ];

  for (const roleId of staffIds) {
    overwrites.push({
      id: roleId,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.ManageMessages
      ]
    });
  }

  try {
    const channel = await guild.channels.create({
      name: `prijava-${dept.value}-${pad(number)}-${safeName}`.slice(0, 95),
      type: ChannelType.GuildText,
      parent: categoryId,
      topic: `Prijava #${pad(number)} | ${user.id} | ${dept.value} | ${answers.ime}`,
      permissionOverwrites: overwrites
    });

    const embed = brandEmbed({
      title: `${dept.emoji} Prijava — ${dept.label} #${pad(number)}`,
      description: `Kandidat: ${user} (\`${user.id}\`)`,
      color: COLOR.main,
      footer: 'departmani • prijava',
      fields: [
        { name: '👤 Ime i godine', value: answers.ime, inline: true },
        { name: '🆔 Steam / FiveM ID', value: answers.steam, inline: true },
        {
          name: '📅 Nalog napravljen',
          value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`,
          inline: true
        },
        { name: '🎮 Iskustvo u RP-u', value: answers.iskustvo.slice(0, 1024) },
        { name: '🔥 Zašto baš ti?', value: answers.zasto.slice(0, 1024) },
        { name: `❓ ${dept.extraLabel}`, value: answers.dodatno.slice(0, 1024) }
      ]
    });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`apply:approve:${user.id}:${channel.id}:${dept.value}`)
        .setLabel('Odobri')
        .setEmoji('✅')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`apply:reject:${user.id}:${channel.id}:${dept.value}`)
        .setLabel('Odbij')
        .setEmoji('❌')
        .setStyle(ButtonStyle.Danger)
    );

    const staffMention = staffIds.length ? ` • ${staffIds.map((id) => `<@&${id}>`).join(' ')}` : '';

    await channel.send({
      content: `${user}${staffMention}`,
      embeds: [embed],
      components: [row]
    });

    db.update('applications', (d) => {
      d.byUser[user.id] = {
        status: 'pending',
        number,
        dept: dept.value,
        deptLabel: dept.label,
        channelId: channel.id,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        answers
      };
      return d;
    });

    // DM potvrda
    try {
      await user.send({
        embeds: [
          brandEmbed({
            title: '📝 Prijava primljena!',
            description: [
              `Zdravo **${answers.ime}**!`,
              '',
              `Tvoja prijava za **${dept.label}** (**#${pad(number)}**) je poslata na **${guild.name}**.`,
              'Tim će je pregledati u roku od 24h i odgovor ti stiže ovde u DM.',
              '',
              'Srećno! 🔥'
            ].join('\n'),
            color: COLOR.main,
            footer: 'departmani'
          })
        ]
      });
    } catch {
      // DM zatvoren
    }

    await sendToChannel(guild, config.applyLogChannelId, {
      embeds: [
        brandEmbed({
          title: `${dept.emoji} Nova prijava — ${dept.label}`,
          description: `${user} (\`${user.id}\`) — **#${pad(number)}**`,
          color: COLOR.info,
          footer: 'departmani • log'
        })
      ]
    });

    return interaction.editReply({
      content: `✅ Prijava poslata! Tvoj kanal: <#${channel.id}> — odgovor stiže u DM.`
    });
  } catch (err) {
    console.error('❌ Greška pri pravljenju prijave:', err);
    return interaction.editReply({
      content: '❌ Ne mogu da napravim kanal za prijavu. Proveri dozvole bota i ID kategorije.'
    });
  }
}

// ---------- Odobravanje / odbijanje ----------

async function handleApprove(interaction, userId, channelId, deptValue) {
  if (!isStaff(interaction.member)) {
    await interaction.reply({ content: '❌ Samo osoblje može da odobri prijavu.', flags: MessageFlags.Ephemeral });
    return true;
  }

  await interaction.deferReply();

  const guild = interaction.guild;
  const dept = deptByValue(deptValue);
  const member = await guild.members.fetch(userId).catch(() => null);
  const status = applicationStatus(userId);

  let roleMsg = '⚠️ Rola departmana nije podešena.';
  const roleId = dept ? config[dept.roleKey] : null;

  if (member && roleId) {
    try {
      const role = guild.roles.cache.get(roleId);
      if (role) {
        await member.roles.add(role, `Prijava odobrena — ${dept.label}`);
        roleMsg = `✅ Dodeljena rola **${role.name}**.`;
      }
    } catch (err) {
      roleMsg = `⚠️ Rola nije dodeljena: ${err.message}`;
    }
  }

  if (member && config.citizenRoleId) {
    await member.roles.add(config.citizenRoleId, 'Odobrena prijava').catch(() => {});
  }
  if (member && config.unverifiedRoleId) {
    await member.roles.remove(config.unverifiedRoleId).catch(() => {});
  }

  db.update('applications', (d) => {
    d.byUser[userId] = {
      ...(d.byUser[userId] ?? {}),
      status: 'approved',
      updatedAt: Date.now(),
      reviewedBy: interaction.user.id
    };
    return d;
  });

  try {
    const user = await interaction.client.users.fetch(userId);
    await user.send({
      embeds: [
        brandEmbed({
          title: '✅ PRIJAVA ODOBRENA!',
          description: [
            `Čestitamo! Tvoja prijava za **${dept?.label ?? 'departman'}** (**#${pad(status?.number ?? 0)}**) je **odobrena**. 🎉`,
            '',
            'Dobrodošao/la u **Blaze Roleplay** tim! 🔥',
            'Uputstvo za povezivanje i pravila nađi u kanalima servera.',
            '',
            '*Vidimo se u gradu!* 🚗'
          ].join('\n'),
          color: COLOR.success,
          footer: 'departmani'
        })
      ]
    });
  } catch {
    // DM zatvoren
  }

  // Transkript pre brisanja kanala
  let transcriptMsg = '';
  try {
    const channel = guild.channels.cache.get(channelId);
    if (channel) {
      const transcript = await buildTranscript(channel, {
        number: status?.number ?? 0,
        type: `prijava-${deptValue}`,
        createdAt: status?.createdAt ?? Date.now()
      });

      const logMsg = await sendToChannel(guild, config.applyLogChannelId ?? config.modLogChannelId, {
        embeds: [
          brandEmbed({
            title: `✅ Prijava odobrena — ${dept?.label ?? deptValue}`,
            description: `<@${userId}> — **#${pad(status?.number ?? 0)}**\nOdobrio/la: ${interaction.user}`,
            color: COLOR.success,
            footer: 'departmani • log'
          })
        ],
        files: [new AttachmentBuilder(transcript.buffer, { name: transcript.fileName })]
      });

      if (logMsg) transcriptMsg = ' Transkript sačuvan.';
    }
  } catch (err) {
    console.warn('⚠️ Transkript prijave nije napravljen:', err.message);
  }

  await interaction.editReply({ content: `✅ Prijava odobrena. ${roleMsg}${transcriptMsg}` });

  const channel = guild.channels.cache.get(channelId);
  if (channel) {
    await channel
      .send({
        embeds: [
          brandEmbed({
            title: '✅ PRIJAVA ODOBRENA',
            description: `Odobrio/la: ${interaction.user}\nKanal se zatvara za 10 sekundi...`,
            color: COLOR.success,
            footer: 'departmani'
          })
        ]
      })
      .catch(() => {});
    setTimeout(() => channel.delete().catch(() => {}), 10000);
  }

  return true;
}

function buildRejectModal(userId, channelId, deptValue) {
  return new ModalBuilder()
    .setCustomId(`apply:rejectmodal:${userId}:${channelId}:${deptValue}`)
    .setTitle('Odbijanje prijave')
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('razlog')
          .setLabel('Razlog odbijanja')
          .setPlaceholder('npr. Nedovoljno iskustva, lažni podaci...')
          .setStyle(TextInputStyle.Paragraph)
          .setMaxLength(500)
          .setRequired(true)
      )
    );
}

async function handleRejectModal(interaction, userId, channelId, deptValue) {
  if (!isStaff(interaction.member)) {
    await interaction.reply({ content: '❌ Samo osoblje može da odbije prijavu.', flags: MessageFlags.Ephemeral });
    return true;
  }

  await interaction.deferReply();
  const reason = interaction.fields.getTextInputValue('razlog');
  const guild = interaction.guild;
  const status = applicationStatus(userId);
  const dept = deptByValue(deptValue);

  db.update('applications', (d) => {
    d.byUser[userId] = {
      ...(d.byUser[userId] ?? {}),
      status: 'rejected',
      reason,
      updatedAt: Date.now(),
      reviewedBy: interaction.user.id
    };
    return d;
  });

  try {
    const user = await interaction.client.users.fetch(userId);
    await user.send({
      embeds: [
        brandEmbed({
          title: '❌ Prijava odbijena',
          description: [
            `Tvoja prijava za **${dept?.label ?? 'departman'}** (**#${pad(status?.number ?? 0)}**) na **${guild.name}** je odbijena.`,
            '',
            `**Razlog:** ${reason}`,
            '',
            'Možeš pokušati ponovo za 7 dana.',
            'Ako smatraš da je greška, otvori tiket.'
          ].join('\n'),
          color: COLOR.danger,
          footer: 'departmani'
        })
      ]
    });
  } catch {
    // DM zatvoren
  }

  await sendToChannel(guild, config.applyLogChannelId ?? config.modLogChannelId, {
    embeds: [
      brandEmbed({
        title: '❌ Prijava odbijena',
        description: `<@${userId}> — **#${pad(status?.number ?? 0)}**\nRazlog: ${reason}\nOdbio/la: ${interaction.user}`,
        color: COLOR.danger,
        footer: 'departmani • log'
      })
    ]
  });

  await interaction.editReply({ content: '❌ Prijava odbijena i korisnik obavešten.' });

  const channel = guild.channels.cache.get(channelId);
  if (channel) setTimeout(() => channel.delete().catch(() => {}), 8000);
  return true;
}

module.exports = {
  postPanel,
  handleStartButton,
  handleDeptSelect,
  handleModalSubmit,
  handleApprove,
  buildRejectModal,
  handleRejectModal,
  applicationStatus,
  buildApplyPanelEmbed,
  buildApplyPanelRow
};
