const config = require('../config');
const { COLOR, brandEmbed, sendToChannel } = require('../utils');

function short(text, max = 1024) {
  const str = String(text ?? '');
  return str.length > max ? `${str.slice(0, max - 3)}...` : str;
}

// Poruka obrisana
async function onMessageDelete(message) {
  if (!config.logChannelId) return;
  if (!message.guild || message.author?.bot) return;
  if (!message.content && !message.attachments?.size) return;

  await sendToChannel(message.guild, config.logChannelId, {
    embeds: [
      brandEmbed({
        title: '🗑️ Poruka obrisana',
        description: [
          `**Autor:** ${message.author ?? 'Nepoznato'} (\`${message.author?.id ?? '?'}\`)`,
          `**Kanal:** ${message.channel}`,
          '',
          message.content ? `\`\`\`\n${short(message.content, 1800)}\n\`\`\`` : '*Bez teksta (samo prilozi)*'
        ].join('\n'),
        color: COLOR.danger,
        footer: 'logovi'
      })
    ]
  });
}

// Poruka izmenjena
async function onMessageUpdate(oldMessage, newMessage) {
  if (!config.logChannelId) return;
  if (!newMessage.guild || newMessage.author?.bot) return;
  if (oldMessage.content === newMessage.content) return;
  if (!oldMessage.content || !newMessage.content) return;

  await sendToChannel(newMessage.guild, config.logChannelId, {
    embeds: [
      brandEmbed({
        title: '✏️ Poruka izmenjena',
        description: [
          `**Autor:** ${newMessage.author} (\`${newMessage.author.id}\`)`,
          `**Kanal:** ${newMessage.channel}`,
          `**Link:** [skoči na poruku](${newMessage.url})`,
          '',
          `**Pre:**\n\`\`\`\n${short(oldMessage.content, 800)}\n\`\`\``,
          `**Posle:**\n\`\`\`\n${short(newMessage.content, 800)}\n\`\`\``
        ].join('\n'),
        color: COLOR.warning,
        footer: 'logovi'
      })
    ]
  });
}

// Promena rola / nadimka
async function onMemberUpdate(oldMember, newMember) {
  if (!config.modLogChannelId) return;

  const changes = [];

  const oldRoles = oldMember.roles.cache;
  const newRoles = newMember.roles.cache;

  const added = newRoles.filter((r) => !oldRoles.has(r.id));
  const removed = oldRoles.filter((r) => !newRoles.has(r.id));

  if (added.size) changes.push(`**Dodate role:** ${added.map((r) => r).join(', ')}`);
  if (removed.size) changes.push(`**Uklonjene role:** ${removed.map((r) => r).join(', ')}`);
  if (oldMember.nickname !== newMember.nickname) {
    changes.push(`**Nadimak:** ${oldMember.nickname ?? '—'} → ${newMember.nickname ?? '—'}`);
  }

  if (!changes.length) return;

  await sendToChannel(newMember.guild, config.modLogChannelId, {
    embeds: [
      brandEmbed({
        title: '🎭 Član izmenjen',
        description: [`**Član:** ${newMember} (\`${newMember.id}\`)`, '', ...changes].join('\n'),
        color: COLOR.info,
        footer: 'logovi'
      })
    ]
  });
}

// Glasovni kanali
async function onVoiceUpdate(oldState, newState) {
  if (!config.modLogChannelId) return;
  const member = newState.member ?? oldState.member;
  if (!member || member.user.bot) return;

  let text = null;

  if (!oldState.channelId && newState.channelId) {
    text = `🔊 Ušao/la u ${newState.channel}`;
  } else if (oldState.channelId && !newState.channelId) {
    text = `🔇 Izašao/la iz ${oldState.channel}`;
  } else if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
    text = `🔀 Prešao/la iz ${oldState.channel} u ${newState.channel}`;
  }

  if (!text) return;

  await sendToChannel(newState.guild, config.modLogChannelId, {
    embeds: [
      brandEmbed({
        title: '🎧 Glasovna aktivnost',
        description: `**Član:** ${member} (\`${member.id}\`)\n${text}`,
        color: COLOR.dark,
        footer: 'logovi'
      })
    ]
  });
}

module.exports = { onMessageDelete, onMessageUpdate, onMemberUpdate, onVoiceUpdate };
