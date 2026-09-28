const { Events } = require("discord.js");
const config = require("../config");

let timer = null;

async function update(client) {
  const channel = await client.channels.fetch(config.memberCountChannel).catch(() => null);
  if (!channel) return console.error("Member count channel not found.");

  const name = config.memberCountName.replace("{count}", channel.guild.memberCount);
  if (channel.name === name) return;

  await channel.setName(name, "Member count update").catch((err) => {
    console.error("Member count update failed:", err.message);
  });
}

// Wait a few seconds after the last join/leave so a burst of joins only
// renames the channel once (Discord limits channel renames to 2 per 10 minutes).
function schedule(client) {
  clearTimeout(timer);
  timer = setTimeout(() => update(client), 5000);
}

module.exports = [
  { name: Events.ClientReady, once: true, execute: (client) => update(client) },
  { name: Events.GuildMemberAdd, execute: (member) => schedule(member.client) },
  { name: Events.GuildMemberRemove, execute: (member) => schedule(member.client) },
];
