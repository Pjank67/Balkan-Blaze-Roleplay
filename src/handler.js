const fs = require('fs');
const path = require('path');
const { MessageFlags } = require('discord.js');

const tickets = require('./systems/tickets');
const applications = require('./systems/applications');
const verification = require('./systems/verification');
const suggestions = require('./systems/suggestions');
const giveaways = require('./systems/giveaways');
const reactionroles = require('./systems/reactionroles');
const tempvoice = require('./systems/tempvoice');
const { isStaff } = require('./utils');

// Učitaj sve komande iz src/commands
function loadCommands(client) {
  const commandsDir = path.join(__dirname, 'commands');
  const files = fs.readdirSync(commandsDir).filter((file) => file.endsWith('.js'));

  const slashData = [];

  for (const file of files) {
    const filePath = path.join(commandsDir, file);
    try {
      delete require.cache[require.resolve(filePath)];
      const command = require(filePath);

      if (!command?.data || typeof command.execute !== 'function') {
        console.warn(`⚠️ Preskačem ${file} — nedostaje data ili execute.`);
        continue;
      }

      client.commands.set(command.data.name, command);
      slashData.push(command.data.toJSON());
    } catch (err) {
      console.error(`❌ Greška pri učitavanju komande ${file}:`, err);
    }
  }

  return slashData;
}

// ---------- Rukovanje dugmićima ----------
async function handleButtons(interaction) {
  const id = interaction.customId;

  if (id.startsWith('ticket:')) return tickets.handleButton(interaction);

  if (id === 'verify:accept') return verification.handleButton(interaction);

  if (id === 'apply:start') return applications.handleStartButton(interaction);

  if (id.startsWith('apply:approve:')) {
    const [, , userId, channelId, dept] = id.split(':');
    return applications.handleApprove(interaction, userId, channelId, dept);
  }

  if (id.startsWith('apply:reject:')) {
    const [, , userId, channelId, dept] = id.split(':');

    if (!isStaff(interaction.member)) {
      await interaction.reply({
        content: '❌ Samo osoblje može da odbije prijavu.',
        flags: MessageFlags.Ephemeral
      });
      return true;
    }

    await interaction.showModal(applications.buildRejectModal(userId, channelId, dept));
    return true;
  }

  if (id === 'suggest:start') return suggestions.handleStartButton(interaction);

  if (id.startsWith('suggest:approve:')) {
    return suggestions.handleStatusButton(interaction, 'approve', id.split(':')[2]);
  }

  if (id.startsWith('suggest:reject:')) {
    return suggestions.handleStatusButton(interaction, 'reject', id.split(':')[2]);
  }

  if (id.startsWith('gw:join:')) {
    return giveaways.handleJoin(interaction, id.split(':')[2]);
  }

  if (id.startsWith('tv:')) return tempvoice.handleButton(interaction);

  return false;
}

// ---------- Rukovanje menijima ----------
async function handleSelectMenus(interaction) {
  const id = interaction.customId;

  if (id === 'ticket:create') return tickets.handleSelect(interaction);
  if (id === 'apply:dept') return applications.handleDeptSelect(interaction);
  if (id.startsWith('rr:menu')) return reactionroles.handleSelect(interaction);
  if (id.startsWith('tv:')) return tempvoice.handleSelect(interaction);

  return false;
}

// ---------- Rukovanje modalima ----------
async function handleModals(interaction) {
  const id = interaction.customId;

  if (id.startsWith('apply:modal:')) {
    return applications.handleModalSubmit(interaction, id.split(':')[2]);
  }
  if (id === 'suggest:modal') return suggestions.handleModalSubmit(interaction);

  if (id.startsWith('apply:rejectmodal:')) {
    const [, , userId, channelId, dept] = id.split(':');
    return applications.handleRejectModal(interaction, userId, channelId, dept);
  }

  if (id.startsWith('tv:renamemodal:')) {
    return tempvoice.handleRenameModal(interaction, id.split(':')[2]);
  }

  if (id.startsWith('tv:limitmodal:')) {
    return tempvoice.handleLimitModal(interaction, id.split(':')[2]);
  }

  return false;
}

// Centralni rukovalac svih interakcija
async function handleInteraction(interaction) {
  try {
    if (interaction.isChatInputCommand()) {
      const command = interaction.client.commands.get(interaction.commandName);
      if (!command) {
        console.warn(`⚠️ Nepoznata komanda: ${interaction.commandName}`);
        return;
      }
      await command.execute(interaction);
      return;
    }

    if (interaction.isButton()) {
      await handleButtons(interaction);
      return;
    }

    if (interaction.isStringSelectMenu() || interaction.isUserSelectMenu?.()) {
      await handleSelectMenus(interaction);
      return;
    }

    if (interaction.isModalSubmit()) {
      await handleModals(interaction);
      return;
    }
  } catch (err) {
    console.error('❌ Greška u interakciji:', err);

    const payload = {
      content: '❌ Došlo je do greške pri izvršavanju. Pokušaj ponovo.',
      flags: MessageFlags.Ephemeral
    };

    try {
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp(payload);
      } else {
        await interaction.reply(payload);
      }
    } catch {
      // interakcija je istekla
    }
  }
}

module.exports = { loadCommands, handleInteraction };
