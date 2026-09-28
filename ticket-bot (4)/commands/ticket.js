const { SlashCommandBuilder } = require("discord.js");
const { sendPanel, handleClose, handleRename } = require("../tickets");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ticket")
    .setDescription("Ticket commands")
    .setDMPermission(false)
    .addSubcommand((s) =>
      s
        .setName("panel")
        .setDescription("Send a ticket panel to this channel")
        .addStringOption((o) =>
          o
            .setName("type")
            .setDescription("Which panel to send (default: tickets)")
            .addChoices(
              { name: "Tickets", value: "main" },
              { name: "Builds and Dig Outs", value: "build" }
            )
        )
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
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    if (sub === "panel") return sendPanel(interaction);
    if (sub === "close") return handleClose(interaction);
    if (sub === "rename") return handleRename(interaction);
  },
};
