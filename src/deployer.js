const { REST, Routes } = require('discord.js');

// Registruje slash komande — koristi se i u deploy-commands.js i pri startu bota
async function deployCommands({ token, clientId, guildId, commands }) {
  const rest = new REST({ version: '10' }).setToken(token);

  if (guildId) {
    const data = await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
      body: commands
    });
    return { scope: 'guild', count: data.length };
  }

  const data = await rest.put(Routes.applicationCommands(clientId), {
    body: commands
  });
  return { scope: 'global', count: data.length };
}

module.exports = { deployCommands };
