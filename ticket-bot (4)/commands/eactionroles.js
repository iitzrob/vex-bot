const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags } = require("discord.js");
const config = require("../config");
const store = require("../roleStore");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("reactionroles")
    .setDescription("Send the reaction role panel to this channel")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false),

  async execute(interaction) {
    if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: "Only admins can send the reaction role panel.", flags: MessageFlags.Ephemeral });
    }

    const { title, description, roles } = config.reactionRoles;

    const embed = new EmbedBuilder()
      .setColor(config.embedColor)
      .setTitle(title)
      .setDescription(description + "\n\n" + roles.map((r) => `${r.emoji}  **${r.label}**`).join("\n"))
      .setFooter({
        text: interaction.guild.name,
        iconURL: interaction.guild.iconURL({ size: 128 }) || undefined,
      });

    await interaction.reply({ content: "Sending panel...", flags: MessageFlags.Ephemeral });

    const message = await interaction.channel.send({ embeds: [embed] });
    for (const r of roles) await message.react(r.emoji);

    store.add(message.id);
    await interaction.editReply({ content: "Panel sent." });
  },
};
