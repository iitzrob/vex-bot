const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  MessageFlags,
} = require("discord.js");
const config = require("../config");

// The whole game lives in the button IDs (board + players), so it needs no
// storage and keeps working after a restart.
// customId format: ttt:<board 9 chars of - X O>:<xId>:<oId>:<cell>

const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

function findWinner(board) {
  for (const [a, b, c] of LINES) {
    if (board[a] !== "-" && board[a] === board[b] && board[b] === board[c]) {
      return { line: [a, b, c] };
    }
  }
  return null;
}

function buildBoard(board, x, o, over, winLine = []) {
  const rows = [];
  for (let r = 0; r < 3; r++) {
    const row = new ActionRowBuilder();
    for (let c = 0; c < 3; c++) {
      const i = r * 3 + c;
      const mark = board[i];
      let style = ButtonStyle.Secondary;
      if (winLine.includes(i)) style = ButtonStyle.Success;
      else if (mark === "X") style = ButtonStyle.Primary;
      else if (mark === "O") style = ButtonStyle.Danger;

      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`ttt:${board}:${x}:${o}:${i}`)
          .setLabel(mark === "-" ? "\u200b" : mark)
          .setStyle(style)
          .setDisabled(over || mark !== "-")
      );
    }
    rows.push(row);
  }
  return rows;
}

const embed = (text) => new EmbedBuilder().setColor(config.embedColor).setDescription(text);

module.exports = {
  buttonPrefix: "ttt:",

  data: new SlashCommandBuilder()
    .setName("tictactoe")
    .setDescription("Play tic tac toe against another member")
    .setDMPermission(false)
    .addUserOption((o) =>
      o.setName("opponent").setDescription("Who do you want to play?").setRequired(true)
    ),

  async execute(interaction) {
    const opponent = interaction.options.getUser("opponent", true);

    if (opponent.bot) {
      return interaction.reply({ content: "You can't play against a bot.", flags: MessageFlags.Ephemeral });
    }
    if (opponent.id === interaction.user.id) {
      return interaction.reply({ content: "You can't play against yourself.", flags: MessageFlags.Ephemeral });
    }

    const x = interaction.user.id;
    const o = opponent.id;
    const board = "---------";

    await interaction.reply({
      content: `<@${o}>`,
      embeds: [embed(`<@${x}> (X) vs <@${o}> (O)\n\n<@${x}>'s turn (X)`)],
      components: buildBoard(board, x, o, false),
      allowedMentions: { users: [o] },
    });
  },

  async handleButton(interaction) {
    const [, board, x, o, cellStr] = interaction.customId.split(":");
    const cell = Number(cellStr);

    if (interaction.user.id !== x && interaction.user.id !== o) {
      return interaction.reply({ content: "This isn't your game.", flags: MessageFlags.Ephemeral });
    }

    const xCount = [...board].filter((c) => c === "X").length;
    const oCount = [...board].filter((c) => c === "O").length;
    const mark = xCount === oCount ? "X" : "O";
    const turnId = mark === "X" ? x : o;

    if (interaction.user.id !== turnId) {
      return interaction.reply({ content: "It's not your turn.", flags: MessageFlags.Ephemeral });
    }
    if (board[cell] !== "-") {
      return interaction.reply({ content: "That spot is already taken.", flags: MessageFlags.Ephemeral });
    }

    const next = board.slice(0, cell) + mark + board.slice(cell + 1);
    const win = findWinner(next);
    const draw = !win && !next.includes("-");
    const header = `<@${x}> (X) vs <@${o}> (O)\n\n`;

    let status;
    if (win) status = `<@${turnId}> wins.`;
    else if (draw) status = "It's a draw.";
    else status = `<@${mark === "X" ? o : x}>'s turn (${mark === "X" ? "O" : "X"})`;

    await interaction.update({
      content: "",
      embeds: [embed(header + status)],
      components: buildBoard(next, x, o, !!win || draw, win ? win.line : []),
    });
  },
};
