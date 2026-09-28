const fs = require("fs");
const path = require("path");
const { REST, Routes } = require("discord.js");
const config = require("./config");

const commands = [];
const commandsDir = path.join(__dirname, "commands");

for (const file of fs.readdirSync(commandsDir).filter((f) => f.endsWith(".js"))) {
  const command = require(path.join(commandsDir, file));
  if (!command.data || !command.execute) {
    console.log(`Skipping ${file} - missing "data" or "execute" export.`);
    continue;
  }
  commands.push(command.data.toJSON());
  console.log(`Loaded command: ${command.data.name}`);
}

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
