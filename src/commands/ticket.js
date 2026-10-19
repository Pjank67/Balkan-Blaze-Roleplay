const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const tickets = require('../systems/tickets');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Upravljanje tiket sistemom')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) =>
      sub
        .setName('panel')
        .setDescription('Pošalji panel sa menijem za otvaranje tiketa')
        .addChannelOption((option) =>
          option
            .setName('kanal')
            .setDescription('Kanal gde da se pošalje panel (podrazumevano: trenutni)')
            .setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub.setName('zatvori').setDescription('Zatvori trenutni tiket (radi unutar tiketa)')
    )
    .addSubcommand((sub) =>
      sub
        .setName('dodaj')
        .setDescription('Dodaj korisnika u trenutni tiket')
        .addUserOption((option) =>
          option.setName('korisnik').setDescription('Korisnik koga dodaješ').setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('ukloni')
        .setDescription('Ukloni korisnika iz trenutnog tiketa')
        .addUserOption((option) =>
          option.setName('korisnik').setDescription('Korisnik koga uklanjaš').setRequired(true)
        )
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'panel') return tickets.sendPanel(interaction);
    if (sub === 'zatvori') return tickets.requestClose(interaction);
    if (sub === 'dodaj') return tickets.addMember(interaction);
    if (sub === 'ukloni') return tickets.removeMember(interaction);
  }
};
