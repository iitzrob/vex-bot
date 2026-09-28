const fs = require("fs");
const path = require("path");
const {
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
} = require("discord.js");
const config = require("./config");

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

const isStaff = (member, typeKey) =>
  member.roles.cache.has(config.staffRole) ||
  member.roles.cache.has(config.categories[typeKey]?.pingRole) ||
  member.permissions.has(PermissionFlagsBits.Administrator);

const cleanName = (s) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 90) || "user";

const simpleEmbed = (description) =>
  new EmbedBuilder().setColor(config.embedColor).setDescription(description);

function panelRow(panelKey = "main") {
  const keys = config.panels[panelKey].categories;
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`ticket_select:${panelKey}`)
      .setPlaceholder("Select a ticket category")
      .addOptions(
        keys.map((key) => {
          const c = config.categories[key];
          return { label: c.label, description: c.description, value: key, emoji: c.emoji };
        })
      )
  );
}

function ticketRow(claimed) {
  return new ActionRowBuilder().addComponents(
    claimed
      ? new ButtonBuilder().setCustomId("ticket_unclaim").setLabel("Unclaim").setStyle(ButtonStyle.Secondary)
      : new ButtonBuilder().setCustomId("ticket_claim").setLabel("Claim").setStyle(ButtonStyle.Success),
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
  const lines = [
    `**Ticket:** \`${ticketName}\``,
    `**Category:** ${cat ? cat.label : ticket.type}`,
    `**Opened by:** <@${ticket.owner}> (${ticket.ownerTag})`,
    `**${action} by:** <@${by.id}> (${by.tag})`,
    ...extra,
  ];

  const embed = new EmbedBuilder()
    .setColor(config.embedColor)
    .setAuthor({ name: `Ticket ${action}` })
    .setDescription(lines.join("\n"))
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
  if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
    return interaction.reply(eph("Only admins can send the ticket panel."));
  }

  const panelKey = interaction.options.getString("type") || "main";
  const panel = config.panels[panelKey];

  const fields = panel.categories.map((key) => ({
    name: config.categories[key].label,
    value: config.categories[key].description,
    inline: false,
  }));

  const embed = new EmbedBuilder()
    .setColor(config.embedColor)
    .addFields(fields)
    .setFooter({
      text: interaction.guild.name,
      iconURL: interaction.guild.iconURL({ size: 128 }) || undefined,
    });
  if (panel.title) embed.setTitle(panel.title);
  if (panel.description) embed.setDescription(panel.description);

  await interaction.channel.send({ embeds: [embed], components: [panelRow(panelKey)] });
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
  const panelKey = interaction.customId.split(":")[1] || "main";
  interaction.message.edit({ components: [panelRow(panelKey)] }).catch(() => {});
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
      ...(cat.pingRole && cat.pingRole !== config.staffRole
        ? [
            {
              id: cat.pingRole,
              allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.ReadMessageHistory,
                PermissionFlagsBits.AttachFiles,
                PermissionFlagsBits.EmbedLinks,
                PermissionFlagsBits.ManageMessages,
              ],
            },
          ]
        : []),
      {
        id: interaction.client.user.id,
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
    .setAuthor({
      name: `${cat.label} Ticket`,
      iconURL: guild.iconURL({ size: 64 }) || undefined,
    })
    .setDescription(
      "Thanks for opening a ticket. Staff will be with you shortly.\n\n" +
        answers.map((a) => `**${a.label}**\n${a.value.slice(0, 1000)}`).join("\n\n")
    );

  const pingRole = cat.pingRole || config.staffRole;

  await channel.send({
    content: `<@${user.id}> <@&${pingRole}>`,
    embeds: [embed],
    components: [ticketRow(null)],
    allowedMentions: { users: [user.id], roles: [pingRole] },
  });

  await interaction.editReply(`Your ticket has been created: <#${channel.id}>`);
}

// ---------------------------------------------------------------------------
// Claim
// ---------------------------------------------------------------------------
async function handleClaim(interaction) {
  const ticket = tickets[interaction.channelId];
  if (!ticket) return interaction.reply(eph("This is not a ticket channel."));
  if (!isStaff(interaction.member, ticket.type)) return interaction.reply(eph("Only staff can claim tickets."));
  if (ticket.claimedBy) return interaction.reply(eph("This ticket has already been claimed."));

  ticket.claimedBy = interaction.user.id;
  save();

  await interaction.update({ components: [ticketRow(true)] });
  await interaction.message.reply({
    embeds: [simpleEmbed(`Ticket claimed by <@${interaction.user.id}>.`)],
    allowedMentions: { repliedUser: false },
  });

  await sendLog(interaction.guild, {
    action: "Claimed",
    ticketName: interaction.channel.name,
    ticket,
    by: interaction.user,
  });
}

async function handleUnclaim(interaction) {
  const ticket = tickets[interaction.channelId];
  if (!ticket) return interaction.reply(eph("This is not a ticket channel."));
  if (!isStaff(interaction.member, ticket.type)) return interaction.reply(eph("Only staff can unclaim tickets."));
  if (!ticket.claimedBy) return interaction.reply(eph("This ticket is not claimed."));

  const canUnclaim =
    interaction.user.id === ticket.claimedBy ||
    interaction.member.permissions.has(PermissionFlagsBits.ManageGuild);
  if (!canUnclaim) {
    return interaction.reply(eph(`Only <@${ticket.claimedBy}> or an admin can unclaim this ticket.`));
  }

  const previous = ticket.claimedBy;
  ticket.claimedBy = null;
  save();

  await interaction.update({ components: [ticketRow(false)] });
  await interaction.message.reply({
    embeds: [simpleEmbed(`Ticket unclaimed by <@${interaction.user.id}>.`)],
    allowedMentions: { repliedUser: false },
  });

  await sendLog(interaction.guild, {
    action: "Unclaimed",
    ticketName: interaction.channel.name,
    ticket,
    by: interaction.user,
    extra: [`**Previously claimed by:** <@${previous}>`],
  });
}

// ---------------------------------------------------------------------------
// Close
// ---------------------------------------------------------------------------
async function handleClose(interaction) {
  const channel = interaction.channel;
  const ticket = tickets[channel.id];
  if (!ticket) return interaction.reply(eph("This is not a ticket channel."));

  const allowed = isStaff(interaction.member, ticket.type) || interaction.user.id === ticket.owner;
  if (!allowed) return interaction.reply(eph("Only staff or the ticket owner can close this ticket."));

  await interaction.reply({
    embeds: [simpleEmbed("Closing this ticket in 5 seconds.")],
  });

  const files = [];
  try {
    files.push(await buildTranscript(channel, ticket));
  } catch (err) {
    console.error("Transcript failed:", err);
  }

  const extra = [];
  if (ticket.claimedBy) extra.push(`**Claimed by:** <@${ticket.claimedBy}>`);

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
  if (!isStaff(interaction.member, ticket.type)) return interaction.reply(eph("Only staff can rename tickets."));

  const newName = cleanName(interaction.options.getString("name", true));
  const oldName = interaction.channel.name;

  await interaction.deferReply();
  await interaction.channel.setName(newName, `Renamed by ${interaction.user.tag}`);
  await interaction.editReply({
    embeds: [simpleEmbed(`Ticket renamed to \`${newName}\` by <@${interaction.user.id}>.`)],
  });

  await sendLog(interaction.guild, {
    action: "Renamed",
    ticketName: newName,
    ticket,
    by: interaction.user,
    extra: [`**Old name:** \`${oldName}\``, `**New name:** \`${newName}\``],
  });
}


module.exports = {
  tickets,
  sendPanel,
  handleSelect,
  handleModal,
  handleClaim,
  handleUnclaim,
  handleClose,
  handleRename,
};
