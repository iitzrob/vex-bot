const fs = require("fs");
const path = require("path");
const {
  Client,
  Collection,
  GatewayIntentBits,
  MessageFlags,
  Events,
} = require("discord.js");
const config = require("./config");
const ticketSystem = require("./tickets");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent, // needed so transcripts contain message text
  ],
});

// ---------------------------------------------------------------------------
// Load commands from ./commands
// ---------------------------------------------------------------------------
client.commands = new Collection();
const commandsDir = path.join(__dirname, "commands");

for (const file of fs.readdirSync(commandsDir).filter((f) => f.endsWith(".js"))) {
  const command = require(path.join(commandsDir, file));
  if (!command.data || !command.execute) {
    console.warn(`Skipping ${file} - missing "data" or "execute" export.`);
    continue;
  }
  client.commands.set(command.data.name, command);
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------
client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (command) return await command.execute(interaction);
    } else if (interaction.isStringSelectMenu() && interaction.customId === "ticket_select") {
      return await ticketSystem.handleSelect(interaction);
    } else if (interaction.isModalSubmit() && interaction.customId.startsWith("ticket_modal:")) {
      return await ticketSystem.handleModal(interaction);
    } else if (interaction.isButton()) {
      const owner = client.commands.find(
        (c) => c.buttonPrefix && interaction.customId.startsWith(c.buttonPrefix)
      );
      if (owner) return await owner.handleButton(interaction);

      if (interaction.customId === "ticket_claim") return await ticketSystem.handleClaim(interaction);
      if (interaction.customId === "ticket_unclaim") return await ticketSystem.handleUnclaim(interaction);
      if (interaction.customId === "ticket_close") return await ticketSystem.handleClose(interaction);
    }
  } catch (err) {
    console.error("Interaction error:", err);
    const msg = { content: "Something went wrong. Please try again or contact staff.", flags: MessageFlags.Ephemeral };
    try {
      if (interaction.deferred) await interaction.editReply({ content: msg.content });
      else if (!interaction.replied) await interaction.reply(msg);
    } catch {}
  }
});

client.once(Events.ClientReady, () => {
  console.log(`Logged in as ${client.user.tag}`);
  console.log(`Loaded ${client.commands.size} command(s): ${[...client.commands.keys()].join(", ")}`);
});

process.on("unhandledRejection", (err) => console.error("Unhandled rejection:", err));

client.login(config.token);
