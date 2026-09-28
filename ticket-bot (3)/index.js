const fs = require("fs");
const path = require("path");
const {
  Client,
  GatewayIntentBits,
  ChannelType,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  AttachmentBuilder,
  MessageFlags,
  Events,
} = require("discord.js");
const config = require("./config");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent, // needed so transcripts contain message text
  ],
});

// ---------------------------------------------------------------------------
// Storage (data/tickets.json) - survives restarts
// ---------------------------------------------------------------------------
const DATA_DIR = path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "tickets.json");
fs.mkdirSync(DATA_DIR, { recursive: true });

let tickets = {};
try {
  tickets = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
} catch {
  tickets = {};
}
const save = () => fs.writeFileSync(DATA_FILE, JSON.stringify(tickets, null, 2));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const eph = (content) => ({ content, flags: MessageFlags.Ephemeral });

const isStaff = (member) =>
  member.roles.cache.has(config.staffRole) ||
  member.permissions.has(PermissionFlagsBits.Administrator);

const cleanName = (s) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 90) || "user";

const simpleEmbed = (title, description) =>
  new EmbedBuilder().setColor(config.embedColor).setTitle(title).setDescription(description);

function panelRow() {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("ticket_select")
      .setPlaceholder("Select a ticket category")
      .addOptions(
        Object.entries(config.categories).map(([key, c]) => ({
          label: c.label,
          description: c.description,
          value: key,
          emoji: c.emoji,
        }))
      )
  );
}

function ticketRow(claimedByName) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("ticket_claim")
      .setLabel(claimedByName ? `Claimed by ${claimedByName}`.slice(0, 80) : "Claim")
      .setStyle(claimedByName ? ButtonStyle.Secondary : ButtonStyle.Success)
      .setDisabled(!!claimedByName),
    new ButtonBuilder().setCustomId("ticket_close").setLabel("Close").setStyle(ButtonStyle.Danger)
  );
}

// ---------------------------------------------------------------------------
// Logging
// ---------------------------------------------------------------------------
async function sendLog(guild, { action, ticketName, ticket, by, extra = [], files = [] }) {
  const channel = await guild.channels.fetch(config.logChannel).catch(() => null);
  if (!channel) return console.error("Log channel not found.");

  const cat = config.categories[ticket.type];
  const embed = new EmbedBuilder()
    .setColor(config.embedColor)
    .setTitle(`Ticket ${action}`)
    .addFields(
      { name: "Ticket", value: `\`${ticketName}\``, inline: true },
      { name: "Category", value: cat ? cat.label : ticket.type, inline: true },
      { name: `${action} by`, value: `<@${by.id}> (${by.tag})`, inline: false },
      { name: "Opened by", value: `<@${ticket.owner}> (${ticket.ownerTag})`, inline: false },
      ...extra
    )
    .setTimestamp();

  await channel.send({ embeds: [embed], files }).catch(console.error);
}

// ---------------------------------------------------------------------------
// Transcript (HTML file)
// ---------------------------------------------------------------------------
const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

async function buildTranscript(channel, ticket) {
  const all = [];
  let before;
  while (true) {
    const batch = await channel.messages.fetch({ limit: 100, before });
    if (!batch.size) break;
    all.push(...batch.values());
    before = batch.last().id;
    if (batch.size < 100) break;
  }
  all.reverse();

  const rows = all
    .map((m) => {
      const time = m.createdAt.toISOString().replace("T", " ").slice(0, 19) + " UTC";
      const name = m.member?.displayName || m.author.globalName || m.author.username;
      const avatar = m.author.displayAvatarURL({ size: 64, extension: "png" });

      let body = m.content ? `<div class="text">${esc(m.content)}</div>` : "";

      for (const a of m.attachments.values()) {
        body += `<div class="att"><a href="${esc(a.url)}">${esc(a.name)}</a></div>`;
      }
      for (const e of m.embeds) {
        let inner = "";
        if (e.title) inner += `<div class="etitle">${esc(e.title)}</div>`;
        if (e.description) inner += `<div class="text">${esc(e.description)}</div>`;
        for (const f of e.fields || []) {
          inner += `<div class="efield"><b>${esc(f.name)}</b><br>${esc(f.value)}</div>`;
        }
        if (inner) body += `<div class="embed">${inner}</div>`;
      }

      return `<div class="msg"><img src="${esc(avatar)}"><div><div class="head"><span class="name">${esc(
        name
      )}</span><span class="time">${time}</span></div>${body}</div></div>`;
    })
    .join("\n");

  const cat = config.categories[ticket.type];
  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Transcript - ${esc(channel.name)}</title>
<style>
body{background:#1e1f22;color:#dbdee1;font-family:Arial,Helvetica,sans-serif;margin:0;padding:24px}
.top{border-bottom:1px solid #3f4147;padding-bottom:14px;margin-bottom:18px}
.top h1{margin:0 0 6px;font-size:20px;color:#fff}
.top div{font-size:13px;color:#949ba4}
.msg{display:flex;gap:12px;padding:8px 0}
.msg img{width:38px;height:38px;border-radius:50%}
.head{margin-bottom:2px}
.name{font-weight:bold;color:#fff;margin-right:8px}
.time{font-size:11px;color:#949ba4}
.text{white-space:pre-wrap;word-break:break-word;font-size:14px}
.att a{color:#00a8fc;font-size:13px}
.embed{border-left:4px solid #4e5058;background:#2b2d31;padding:8px 12px;margin-top:4px;border-radius:4px}
.etitle{font-weight:bold;color:#fff;margin-bottom:4px}
.efield{font-size:13px;margin-top:6px}
</style></head><body>
<div class="top"><h1>${esc(channel.name)}</h1>
<div>Category: ${esc(cat ? cat.label : ticket.type)}</div>
<div>Opened by: ${esc(ticket.ownerTag)} (${esc(ticket.owner)})</div>
<div>Messages: ${all.length}</div></div>
${rows}
</body></html>`;

  return new AttachmentBuilder(Buffer.from(html, "utf8"), { name: `transcript-${channel.name}.html` });
}

// ---------------------------------------------------------------------------
// Panel
// ---------------------------------------------------------------------------
async function sendPanel(interaction) {
  if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild)) {
    return interaction.reply(eph("You need the Manage Server permission to send the panel."));
  }

  const fields = Object.values(config.categories).map((c) => ({
    name: c.label,
    value: c.description,
    inline: false,
  }));

  const embed = new EmbedBuilder()
    .setColor(config.embedColor)
    .setTitle(config.panel.title)
    .setDescription(config.panel.description)
    .addFields(fields)
    .setFooter({ text: config.panel.footer });

  await interaction.channel.send({ embeds: [embed], components: [panelRow()] });
  await interaction.reply(eph("Panel sent."));
}

// ---------------------------------------------------------------------------
// Open ticket: dropdown -> modal -> channel
// ---------------------------------------------------------------------------
async function handleSelect(interaction) {
  const key = interaction.values[0];
  const cat = config.categories[key];
  if (!cat) return;

  const modal = new ModalBuilder()
    .setCustomId(`ticket_modal:${key}`)
    .setTitle(cat.label.slice(0, 45));

  for (const q of cat.questions) {
    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId(q.id)
          .setLabel(q.label)
          .setStyle(q.style === "paragraph" ? TextInputStyle.Paragraph : TextInputStyle.Short)
          .setRequired(q.required)
          .setPlaceholder(q.placeholder)
          .setMaxLength(q.maxLength || 1000)
      )
    );
  }

  await interaction.showModal(modal);

  // Reset the dropdown so the same option can be picked again.
  interaction.message.edit({ components: [panelRow()] }).catch(() => {});
}

async function handleModal(interaction) {
  const key = interaction.customId.split(":")[1];
  const cat = config.categories[key];
  if (!cat) return;

  // Answer straight away so the interaction never expires.
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const answers = cat.questions
    .map((q) => ({ label: q.label, value: interaction.fields.getTextInputValue(q.id).trim() }))
    .filter((a) => a.value.length > 0);

  if (cat.requireOne && answers.length === 0) {
    return interaction.editReply("Please fill in at least one of the fields.");
  }

  const guild = interaction.guild;
  const user = interaction.user;

  // One open ticket per category per user.
  for (const [id, t] of Object.entries(tickets)) {
    if (!guild.channels.cache.has(id)) {
      delete tickets[id];
      continue;
    }
    if (t.owner === user.id && t.type === key) {
      save();
      return interaction.editReply(`You already have an open ticket in this category: <#${id}>`);
    }
  }

  const parent = await guild.channels.fetch(cat.channel).catch(() => null);

  const channel = await guild.channels.create({
    name: `${cat.prefix}-${cleanName(user.username)}`,
    type: ChannelType.GuildText,
    parent: parent && parent.type === ChannelType.GuildCategory ? parent.id : undefined,
    topic: `${cat.label} ticket opened by ${user.tag} (${user.id})`,
    permissionOverwrites: [
      { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
      {
        id: user.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.AttachFiles,
          PermissionFlagsBits.EmbedLinks,
        ],
      },
      {
        id: config.staffRole,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.AttachFiles,
          PermissionFlagsBits.EmbedLinks,
          PermissionFlagsBits.ManageMessages,
        ],
      },
      {
        id: client.user.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.ManageChannels,
          PermissionFlagsBits.EmbedLinks,
          PermissionFlagsBits.AttachFiles,
        ],
      },
    ],
  });

  tickets[channel.id] = {
    owner: user.id,
    ownerTag: user.tag,
    type: key,
    claimedBy: null,
    openedAt: Date.now(),
  };
  save();

  const embed = new EmbedBuilder()
    .setColor(config.embedColor)
    .setTitle(`${cat.label} Ticket`)
    .setDescription("Thank you for opening a ticket. A staff member will be with you shortly.")
    .addFields(answers.map((a) => ({ name: a.label, value: a.value.slice(0, 1024) })))
    .setFooter({ text: `Opened by ${user.tag}` })
    .setTimestamp();

  await channel.send({
    content: `<@${user.id}> <@&${config.staffRole}>`,
    embeds: [embed],
    components: [ticketRow(null)],
    allowedMentions: { users: [user.id], roles: [config.staffRole] },
  });

  await interaction.editReply(`Your ticket has been created: <#${channel.id}>`);
}

// ---------------------------------------------------------------------------
// Claim
// ---------------------------------------------------------------------------
async function handleClaim(interaction) {
  const ticket = tickets[interaction.channelId];
  if (!ticket) return interaction.reply(eph("This is not a ticket channel."));
  if (!isStaff(interaction.member)) return interaction.reply(eph("Only staff can claim tickets."));
  if (ticket.claimedBy) return interaction.reply(eph("This ticket has already been claimed."));

  ticket.claimedBy = interaction.user.id;
  save();

  await interaction.update({ components: [ticketRow(interaction.member.displayName)] });
  await interaction.channel.send({
    embeds: [simpleEmbed("Ticket Claimed", `This ticket is now being handled by <@${interaction.user.id}>.`)],
  });

  await sendLog(interaction.guild, {
    action: "Claimed",
    ticketName: interaction.channel.name,
    ticket,
    by: interaction.user,
  });
}

// ---------------------------------------------------------------------------
// Close
// ---------------------------------------------------------------------------
async function handleClose(interaction) {
  const channel = interaction.channel;
  const ticket = tickets[channel.id];
  if (!ticket) return interaction.reply(eph("This is not a ticket channel."));

  const allowed = isStaff(interaction.member) || interaction.user.id === ticket.owner;
  if (!allowed) return interaction.reply(eph("Only staff or the ticket owner can close this ticket."));

  await interaction.reply({
    embeds: [simpleEmbed("Closing Ticket", "This ticket will be deleted in 5 seconds.")],
  });

  const files = [];
  try {
    files.push(await buildTranscript(channel, ticket));
  } catch (err) {
    console.error("Transcript failed:", err);
  }

  const extra = [];
  if (ticket.claimedBy) extra.push({ name: "Claimed by", value: `<@${ticket.claimedBy}>`, inline: false });

  await sendLog(interaction.guild, {
    action: "Closed",
    ticketName: channel.name,
    ticket,
    by: interaction.user,
    extra,
    files,
  });

  delete tickets[channel.id];
  save();

  setTimeout(() => {
    channel.delete(`Ticket closed by ${interaction.user.tag}`).catch(console.error);
  }, 5000);
}

// ---------------------------------------------------------------------------
// Rename
// ---------------------------------------------------------------------------
async function handleRename(interaction) {
  const ticket = tickets[interaction.channelId];
  if (!ticket) return interaction.reply(eph("This is not a ticket channel."));
  if (!isStaff(interaction.member)) return interaction.reply(eph("Only staff can rename tickets."));

  const newName = cleanName(interaction.options.getString("name", true));
  const oldName = interaction.channel.name;

  await interaction.deferReply();
  await interaction.channel.setName(newName, `Renamed by ${interaction.user.tag}`);
  await interaction.editReply({
    embeds: [simpleEmbed("Ticket Renamed", `This ticket has been renamed to \`${newName}\`.`)],
  });

  await sendLog(interaction.guild, {
    action: "Renamed",
    ticketName: newName,
    ticket,
    by: interaction.user,
    extra: [
      { name: "Old name", value: `\`${oldName}\``, inline: true },
      { name: "New name", value: `\`${newName}\``, inline: true },
    ],
  });
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------
client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isChatInputCommand() && interaction.commandName === "ticket") {
      const sub = interaction.options.getSubcommand();
      if (sub === "panel") return await sendPanel(interaction);
      if (sub === "close") return await handleClose(interaction);
      if (sub === "rename") return await handleRename(interaction);
    } else if (interaction.isStringSelectMenu() && interaction.customId === "ticket_select") {
      return await handleSelect(interaction);
    } else if (interaction.isModalSubmit() && interaction.customId.startsWith("ticket_modal:")) {
      return await handleModal(interaction);
    } else if (interaction.isButton()) {
      if (interaction.customId === "ticket_claim") return await handleClaim(interaction);
      if (interaction.customId === "ticket_close") return await handleClose(interaction);
    }
  } catch (err) {
    console.error("Interaction error:", err);
    const msg = eph("Something went wrong. Please try again or contact staff.");
    try {
      if (interaction.deferred) await interaction.editReply({ content: msg.content });
      else if (!interaction.replied) await interaction.reply(msg);
    } catch {}
  }
});

client.once(Events.ClientReady, () => {
  console.log(`Logged in as ${client.user.tag}`);
});

process.on("unhandledRejection", (err) => console.error("Unhandled rejection:", err));

client.login(config.token);
