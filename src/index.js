const {
  Client,
  Collection,
  GatewayIntentBits,
  Partials,
  Events
} = require('discord.js');

const config = require('./config');
const { loadCommands, handleInteraction } = require('./handler');
const { deployCommands } = require('./deployer');
const { onMemberJoin, onMemberLeave } = require('./systems/welcome');
const { restoreTickets } = require('./systems/tickets');
const { discoverSettings } = require('./systems/setupServer');
const { restoreGiveaways } = require('./systems/giveaways');
const { startStatusUpdater } = require('./systems/status');
const automod = require('./systems/automod');
const logging = require('./systems/logging');
const tempvoice = require('./systems/tempvoice');
const { startHealthServer } = require('./keepalive');

// ---------- Provera konfiguracije ----------
if (!config.token || !config.clientId) {
  console.error('\n❌ Nedostaje DISCORD_TOKEN ili CLIENT_ID.');
  console.error('   Kopiraj .env.example u .env i popuni vrednosti.\n');
  process.exit(1);
}

// ---------- Intenti ----------
const intents = [
  GatewayIntentBits.Guilds,
  GatewayIntentBits.GuildMembers, // dobrodošlica
  GatewayIntentBits.GuildVoiceStates // temp sobe + logovi
];

// Automod i logovi poruka traže privilegovani Message Content intent.
// Uključuje se samo ako je eksplicitno dozvoljen u .env, da bot ne bi pao.
if (config.enableMessageContent) {
  intents.push(GatewayIntentBits.MessageContent);
}

const client = new Client({
  intents,
  partials: [Partials.GuildMember, Partials.User, Partials.Message]
});

client.commands = new Collection();

// ---------- Događaji ----------
client.once(Events.ClientReady, async (readyClient) => {
  console.log('\n✅ Bot je pokrenut!');
  console.log(`🤖 Prijavljen kao: ${readyClient.user.tag}`);
  console.log(`🌐 Servera: ${readyClient.guilds.cache.size}`);
  console.log(`📦 Učitanih komandi: ${client.commands.size}`);

  // Upozorenja
  if (!config.ticketCategoryId) console.warn('⚠️ TICKET_CATEGORY_ID nije podešen — tiketi neće raditi.');
  if (!config.welcomeChannelId) console.warn('⚠️ WELCOME_CHANNEL_ID nije podešen — nema dobrodošlice.');
  if (!config.verifyRoleId) console.warn('⚠️ VERIFY_ROLE_ID nije podešen — verifikacija neće dodeljivati rolu.');
  if (!config.staffRoleId) console.warn('⚠️ STAFF_ROLE_ID nije podešen — osoblje će biti samo admini.');
  if (!config.fivemHost) console.warn('⚠️ FIVEM_HOST nije podešen — /status i live status neće raditi.');
  if (!config.enableMessageContent) {
    console.warn('⚠️ ENABLE_MESSAGE_CONTENT nije true — automod i logovi poruka su isključeni.');
  }

  // Oporavak podešavanja po imenu kanala (bitno na Renderu gde se disk briše)
  await discoverSettings(readyClient).catch((err) =>
    console.warn('⚠️ Oporavak podešavanja nije uspeo:', err.message)
  );

  // Oporavak sistema posle restarta/deploya
  await restoreTickets(readyClient).catch((err) =>
    console.warn('⚠️ Oporavak tiketa nije uspeo:', err.message)
  );
  restoreGiveaways(readyClient);
  startStatusUpdater(readyClient);

  console.log('\n💡 Komande se registruju automatski pri startu.\n');
});

client.on(Events.GuildMemberAdd, (member) => {
  onMemberJoin(member).catch((err) => console.error('❌ Greška u dobrodošlici:', err));
  automod.handleMemberJoin(member).catch((err) => console.warn('⚠️ Anti-raid:', err.message));
});

client.on(Events.GuildMemberRemove, (member) => {
  onMemberLeave(member).catch((err) => console.error('❌ Greška u oproštaju:', err));
});

client.on(Events.InteractionCreate, (interaction) => handleInteraction(interaction));

// ---------- Automod + logovi poruka (samo uz Message Content intent) ----------
if (config.enableMessageContent) {
  client.on(Events.MessageCreate, (message) => {
    automod.handleMessage(message).catch((err) => console.warn('⚠️ Automod greška:', err.message));
  });

  client.on(Events.MessageDelete, (message) => {
    logging.onMessageDelete(message).catch(() => {});
  });

  client.on(Events.MessageUpdate, (oldMessage, newMessage) => {
    logging.onMessageUpdate(oldMessage, newMessage).catch(() => {});
  });
}

// ---------- Logovi članova / glasa ----------
client.on(Events.GuildMemberUpdate, (oldMember, newMember) => {
  logging.onMemberUpdate(oldMember, newMember).catch(() => {});
});

client.on(Events.VoiceStateUpdate, (oldState, newState) => {
  logging.onVoiceUpdate(oldState, newState).catch(() => {});
  tempvoice.handleVoiceState(oldState, newState).catch((err) =>
    console.warn('⚠️ Temp voice greška:', err.message)
  );
});

client.on(Events.Error, (err) => console.error('❌ Discord greška:', err));

// ---------- Start ----------
(async () => {
  const slashData = loadCommands(client);
  console.log(`📦 Učitano komandi: ${slashData.length}`);

  startHealthServer(client);

  if (config.registerCommandsOnStart) {
    try {
      const result = await deployCommands({
        token: config.token,
        clientId: config.clientId,
        guildId: config.guildId,
        commands: slashData
      });
      console.log(
        result.scope === 'guild'
          ? `✅ Komande registrovane na serveru (${result.count}) — dostupne odmah.`
          : `✅ Globalne komande registrovane (${result.count}) — mogu da se pojave do 1h.`
      );
    } catch (err) {
      console.warn('⚠️ Automatska registracija komandi nije uspela:');
      console.warn('  ', err.rawError ?? err.message ?? err);
      console.warn('   Bot nastavlja sa radom. Proveri CLIENT_ID i GUILD_ID.');
    }
  }

  try {
    await client.login(config.token);
  } catch (err) {
    console.error('\n❌ Prijava nije uspela. Proveri DISCORD_TOKEN u .env / Render Environment promenljivama.');
    console.error(err.message, '\n');
    process.exit(1);
  }
})();

process.on('unhandledRejection', (err) => console.error('⚠️ Neobrađena greška:', err));
process.on('uncaughtException', (err) => console.error('⚠️ Kritična greška:', err));
