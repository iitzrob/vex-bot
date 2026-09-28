const { Events } = require("discord.js");
const config = require("../config");
const store = require("../roleStore");

async function handle(reaction, user, add) {
  if (user.bot) return;

  try {
    if (reaction.partial) await reaction.fetch();
    if (reaction.message.partial) await reaction.message.fetch();
  } catch {
    return;
  }

  if (!store.has(reaction.message.id)) return;

  const entry = config.reactionRoles.roles.find((r) => r.emoji === reaction.emoji.name);
  if (!entry) {
    // Not one of the panel emojis - clean it up.
    if (add) reaction.users.remove(user.id).catch(() => {});
    return;
  }

  const member = await reaction.message.guild.members.fetch(user.id).catch(() => null);
  if (!member) return;

  try {
    if (add) await member.roles.add(entry.roleId);
    else await member.roles.remove(entry.roleId);
  } catch (err) {
    console.error(`Reaction role failed (${entry.label}):`, err.message);
  }
}

module.exports = [
  { name: Events.MessageReactionAdd, execute: (reaction, user) => handle(reaction, user, true) },
  { name: Events.MessageReactionRemove, execute: (reaction, user) => handle(reaction, user, false) },
];
