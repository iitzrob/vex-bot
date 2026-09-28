const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  MessageFlags,
} = require("discord.js");
const config = require("../config");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("embed")
    .setDescription("Send a custom embed in this channel")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false)
    .addStringOption((o) =>
      o.setName("title").setDescription("Embed title").setMaxLength(256)
    )
    .addStringOption((o) =>
      o
        .setName("description")
        .setDescription("Embed description (type \\n for a new line)")
        .setMaxLength(4000)
    )
    .addStringOption((o) =>
      o
        .setName("text")
        .setDescription("Plain text sent above the embed (type \\n for a new line)")
        .setMaxLength(2000)
    )
    .addStringOption((o) =>
      o.setName("colour").setDescription("Hex colour, e.g. #5865F2 or ff0000").setMaxLength(7)
    ),

  async execute(interaction) {
    if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: "Only admins can use this command.", flags: MessageFlags.Ephemeral });
    }

    const fix = (s) => s?.replace(/\\n/g, "\n");
    const title = interaction.options.getString("title");
    const description = fix(interaction.options.getString("description"));
    const text = fix(interaction.options.getString("text"));
    const colour = interaction.options.getString("colour");

    if (!title && !description && !text) {
      return interaction.reply({
        content: "Give me at least a title, description or plain text.",
        flags: MessageFlags.Ephemeral,
      });
    }

    let color = config.embedColor;
    if (colour) {
      if (!/^#?[0-9a-f]{6}$/i.test(colour)) {
        return interaction.reply({
          content: "That isn't a valid hex colour. Use something like #5865F2 or ff0000.",
          flags: MessageFlags.Ephemeral,
        });
      }
      color = parseInt(colour.replace("#", ""), 16);
    }

    const payload = { allowedMentions: { parse: ["users", "roles"] } };
    if (text) payload.content = text;

    if (title || description) {
      const embed = new EmbedBuilder().setColor(color);
      if (title) embed.setTitle(title);
      if (description) embed.setDescription(description);
      payload.embeds = [embed];
    }

    await interaction.channel.send(payload);
    await interaction.reply({ content: "Embed sent.", flags: MessageFlags.Ephemeral });
  },
};
