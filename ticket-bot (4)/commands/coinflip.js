const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  MessageFlags,
} = require("discord.js");
const config = require("../config");

const embed = (text) => new EmbedBuilder().setColor(config.embedColor).setDescription(text);

module.exports = {
  buttonPrefix: "coin:",

  data: new SlashCommandBuilder()
    .setName("coinflip")
    .setDescription("Flip a coin - pick heads or tails")
    .setDMPermission(false),

  async execute(interaction) {
    const id = interaction.user.id;
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`coin:${id}:heads`).setLabel("Heads").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`coin:${id}:tails`).setLabel("Tails").setStyle(ButtonStyle.Secondary)
    );

    await interaction.reply({
      embeds: [embed(`<@${id}>, pick a side.`)],
      components: [row],
    });
  },

  async handleButton(interaction) {
    const [, ownerId, pick] = interaction.customId.split(":");

    if (interaction.user.id !== ownerId) {
      return interaction.reply({ content: "This isn't your coin flip. Use /coinflip to start your own.", flags: MessageFlags.Ephemeral });
    }

    const result = Math.random() < 0.5 ? "heads" : "tails";
    const won = result === pick;
    const cap = (s) => s[0].toUpperCase() + s.slice(1);

    await interaction.update({
      embeds: [
        embed(
          `<@${ownerId}> picked **${cap(pick)}**.\n` +
            `The coin landed on **${cap(result)}**.\n\n` +
            (won ? "You win." : "You lose.")
        ),
      ],
      components: [],
    });
  },
};
