const { SlashCommandBuilder } = require("discord.js");
const { sendPanel, handleClose, handleRename } = require("../tickets");

module.exports = {
  data: new SlashCommandBuilder()
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
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    if (sub === "panel") return sendPanel(interaction);
    if (sub === "close") return handleClose(interaction);
    if (sub === "rename") return handleRename(interaction);
  },
};
