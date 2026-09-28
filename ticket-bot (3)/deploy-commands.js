const { REST, Routes, SlashCommandBuilder } = require("discord.js");
const config = require("./config");

const ticket = new SlashCommandBuilder()
  .setName("ticket")
  .setDescription("Ticket commands")
  .setDMPermission(false)
  .addSubcommand((s) =>
    s.setName("panel").setDescription("Send the ticket panel to this channel")
  )
  .addSubcommand((s) =>
    s.setName("close").setDescription("Close this ticket")
  )
  .addSubcommand((s) =>
    s
      .setName("rename")
      .setDescription("Rename this ticket")
      .addStringOption((o) =>
        o.setName("name").setDescription("New ticket name").setRequired(true).setMaxLength(90)
      )
  );

const commands = [ticket.toJSON()];
const rest = new REST().setToken(config.token);
const useGlobal = process.argv.includes("--global");

(async () => {
  try {
    console.log(`Deploying ${commands.length} slash command(s) ${useGlobal ? "globally" : `to guild ${config.guildId}`}...`);
    const route =
      useGlobal || !config.guildId
        ? Routes.applicationCommands(config.clientId)
        : Routes.applicationGuildCommands(config.clientId, config.guildId);
    const data = await rest.put(route, { body: commands });
    console.log(`Successfully registered ${data.length} slash command(s).`);
  } catch (err) {
    console.error(err);
  }
})();
