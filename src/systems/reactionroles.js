const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  MessageFlags
} = require('discord.js');
const db = require('../db');
const { COLOR, brandEmbed } = require('../utils');

function roles() {
  return db.get('reactionroles', []);
}

function saveRoles(list) {
  db.set('reactionroles', list);
}

// Napravi panel embed + menije (max 25 opcija po meniju)
function buildPanel() {
  const list = roles();
  const embed = brandEmbed({
    title: '🎭 ROLE — IZABERI SVOJE',
    description: [
      'Izaberi role koje želiš — klikom ih dobijaš, ponovnim klikom skidaš.',
      '',
      list.length
        ? list.map((r) => `${r.emoji} **${r.name}**${r.description ? ` — ${r.description}` : ''}`).join('\n')
        : '⚠️ Trenutno nema podešenih rola.'
    ].join('\n'),
    color: COLOR.main,
    footer: 'role meni'
  });

  const rows = [];
  for (let i = 0; i < Math.min(list.length, 100); i += 25) {
    const chunk = list.slice(i, i + 25);
    const menu = new StringSelectMenuBuilder()
      .setCustomId(`rr:menu:${i / 25}`)
      .setPlaceholder('Izaberi role...')
      .setMinValues(0)
      .setMaxValues(chunk.length)
      .addOptions(
        chunk.map((r) =>
          new StringSelectMenuOptionBuilder()
            .setLabel(r.name)
            .setValue(r.roleId)
            .setDescription((r.description || 'Dodaj / ukloni rolu').slice(0, 100))
            .setEmoji(r.emoji || '🎭')
        )
      );
    rows.push(new ActionRowBuilder().addComponents(menu));
  }

  return { embeds: [embed], components: rows };
}

async function postPanel(channel) {
  return channel.send(buildPanel());
}

// Klik na meni — toggle rola
async function handleSelect(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const member = interaction.member;
  const selected = interaction.values;

  // Sve role iz menija
  const allRoleIds = roles().map((r) => r.roleId);
  const added = [];
  const removed = [];

  // Skini role koje su bile u ovom meniju a nisu selektovane
  const current = allRoleIds.filter((id) => member.roles.cache.has(id));

  for (const roleId of current) {
    if (!selected.includes(roleId)) {
      const role = interaction.guild.roles.cache.get(roleId);
      if (role) {
        await member.roles.remove(role, 'Role meni').catch(() => {});
        removed.push(role.name);
      }
    }
  }

  for (const roleId of selected) {
    const role = interaction.guild.roles.cache.get(roleId);
    if (role && !member.roles.cache.has(roleId)) {
      await member.roles.add(role, 'Role meni').catch(() => {});
      added.push(role.name);
    }
  }

  const lines = [];
  if (added.length) lines.push(`✅ Dodato: ${added.join(', ')}`);
  if (removed.length) lines.push(`➖ Uklonjeno: ${removed.join(', ')}`);
  if (!lines.length) lines.push('ℹ️ Nema promena.');

  await interaction.editReply({ content: lines.join('\n') });
  return true;
}

// ---------- Upravljanje (komande) ----------

async function addRole({ name, description, emoji, roleId }) {
  const list = roles();
  list.push({ name, description: description ?? '', emoji: emoji ?? '🎭', roleId });
  saveRoles(list);
}

async function removeRole(nameOrId) {
  const list = roles();
  const filtered = list.filter(
    (r) => r.name.toLowerCase() !== nameOrId.toLowerCase() && r.roleId !== nameOrId
  );
  saveRoles(filtered);
  return list.length !== filtered.length;
}

function listRoles() {
  return roles();
}

module.exports = { buildPanel, postPanel, handleSelect, addRole, removeRole, listRoles };
