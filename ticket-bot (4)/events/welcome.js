const { Events, EmbedBuilder } = require("discord.js");
const config = require("../config");

function ordinal(n) {
  const suffix = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (suffix[(v - 20) % 10] || suffix[v] || suffix[0]);
}

module.exports = {
  name: Events.GuildMemberAdd,

  async execute(member) {
    if (member.user.bot) return;

    const channel = await member.guild.channels.fetch(config.welcomeChannel).catch(() => null);
    if (!channel) return console.error("Welcome channel not found.");

    const embed = new EmbedBuilder()
      .setColor(config.embedColor)
      .setDescription(`Welcome to **${member.guild.name}**, you are the **${ordinal(member.guild.memberCount)}** member!`);

    await channel
      .send({ content: `<@${member.id}>`, embeds: [embed], allowedMentions: { users: [member.id] } })
      .catch(console.error);
  },
};
