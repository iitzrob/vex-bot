require("dotenv").config();

module.exports = {
  token: process.env.BOT_TOKEN,
  clientId: process.env.CLIENT_ID,
  guildId: process.env.GUILD_ID,

  staffRole: "1553279197995077681",
  logChannel: "1553279200566452250",

  embedColor: 0x2b2d31,

  // "channel" is the category the ticket channels get created in.
  categories: {
    support: {
      label: "Support",
      description: "General questions and issues",
      emoji: "🛠️",
      prefix: "support",
      channel: "1553279201203716183",
      questions: [
        {
          id: "help",
          label: "What can we help you with?",
          style: "paragraph",
          required: true,
          placeholder: "Describe your issue or question",
          maxLength: 1000,
        },
      ],
    },

    giveaway: {
      label: "Giveaway Claim / Sponsor",
      description: "Claim a prize or sponsor a giveaway",
      emoji: "🎁",
      prefix: "giveaway",
      channel: "1553279201203716180",
      requireOne: true, // at least one of the two fields must be filled in
      questions: [
        {
          id: "won",
          label: "How much did you win?",
          style: "short",
          required: false,
          placeholder: "If you won",
          maxLength: 100,
        },
        {
          id: "sponsor",
          label: "How much do you want to sponsor?",
          style: "short",
          required: false,
          placeholder: "If you want to sponsor",
          maxLength: 100,
        },
      ],
    },

    spawner: {
      label: "Spawner Buy / Sell",
      description: "Buy or sell spawners",
      emoji: "💰",
      prefix: "spawner",
      channel: "1553279201057046604",
      questions: [
        {
          id: "amount",
          label: "How much do you want to buy/sell?",
          style: "short",
          required: true,
          placeholder: "Example: 64",
          maxLength: 100,
        },
      ],
    },

    partnership: {
      label: "Partnership",
      description: "Apply for a partnership with us",
      emoji: "🤝",
      prefix: "partner",
      channel: "1553279201392468052",
      questions: [
        {
          id: "members",
          label: "How many members does your server have?",
          style: "short",
          required: true,
          placeholder: "Example: 1500",
          maxLength: 50,
        },
        {
          id: "reqs",
          label: "Do you agree with our requirements?",
          style: "short",
          required: true,
          placeholder: "Yes / No",
          maxLength: 50,
        },
      ],
    },

    digout: {
      label: "Dig Out",
      description: "Request a dig out",
      emoji: "⛏️",
      prefix: "digout",
      channel: "1553279200880894006",
      pingRole: "1553279197995077680",
      questions: [
        {
          id: "budget",
          label: "What's your budget?",
          style: "short",
          required: true,
          placeholder: "Example: 10m",
          maxLength: 100,
        },
        {
          id: "dimensions",
          label: "What are the dimensions?",
          style: "short",
          required: true,
          placeholder: "L x W x H, 1 x 1 x 1",
          maxLength: 100,
        },
      ],
    },

    build: {
      label: "Build",
      description: "Request a build",
      emoji: "🏗️",
      prefix: "build",
      channel: "1553279200880894006", // change this if builds should go in a different category
      pingRole: "1553279197995077680",
      questions: [
        {
          id: "schematic",
          label: "Do you have a schematic?",
          style: "short",
          required: true,
          placeholder: "Yes / No",
          maxLength: 100,
        },
        {
          id: "budget",
          label: "What's your budget?",
          style: "short",
          required: true,
          placeholder: "Example: 10m",
          maxLength: 100,
        },
      ],
    },
  },

  // Which categories show up in which panel. /ticket panel type:<name>
  panels: {
    main: {
      categories: ["support", "giveaway", "spawner", "partnership"],
    },
    build: {
      title: "Builds and Dig Outs",
      description:
        "Need something built or dug out? Select an option from the menu below and answer a few quick questions. " +
        "A member of our team will reach out shortly to go over the details.",
      categories: ["digout", "build"],
    },
  },
};
