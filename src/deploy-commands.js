const { REST, Routes, Collection } = require('discord.js');
const config = require('./config');
const { loadCommands } = require('./handler');
const { deployCommands } = require('./deployer');

(async () => {
  if (!config.token || !config.clientId) {
    console.error('\n❌ Nedostaje DISCORD_TOKEN ili CLIENT_ID u .env fajlu.\n');
    process.exit(1);
  }

  // Lažni klijent samo da bismo iskoristili loader komandi
  const fakeClient = { commands: new Collection() };
  const commands = loadCommands(fakeClient);

  try {
    if (config.guildId) {
      console.log(`⏳ Registrujem ${commands.length} komandi na serveru ${config.guildId}...`);
    } else {
      console.log(`⏳ Registrujem ${commands.length} globalnih komandi...`);
    }

    const result = await deployCommands({
      token: config.token,
      clientId: config.clientId,
      guildId: config.guildId,
      commands
    });

    if (result.scope === 'guild') {
      console.log(`✅ Uspešno registrovano ${result.count} komandi na serveru (dostupne odmah).`);
    } else {
      console.log(`✅ Uspešno registrovano ${result.count} globalnih komandi.`);
      console.log('   (Discord može da sačeka i do 1h da ih prikaže. Za testiranje postavi GUILD_ID u .env.)');
    }
  } catch (err) {
    console.error('\n❌ Registracija komandi nije uspela:');
    console.error(err.rawError ?? err.message ?? err);
    console.error('\nProveri CLIENT_ID, DISCORD_TOKEN i da li je bot dodat na server.\n');
    process.exit(1);
  }
})();
