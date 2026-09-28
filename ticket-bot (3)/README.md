# Ticket Bot

Discord ticket bot with a dropdown panel, 4 categories, claim/close buttons, `/ticket close`, `/ticket rename`, action logging and HTML transcripts.

## Setup

```bash
git clone https://github.com/YOUR_USERNAME/ticket-bot.git
cd ticket-bot
npm install
cp .env.example .env
nano .env            # BOT_TOKEN, CLIENT_ID, GUILD_ID
node deploy-commands.js
pm2 start index.js --name tickets
pm2 save
```

Enable **Message Content Intent** in the Discord Developer Portal (Bot > Privileged Gateway Intents) so transcripts include message text.

Edit `config.js` to change IDs, questions, placeholders and panel text.

## Commands

- `/ticket panel` - send the panel (Manage Server)
- `/ticket close` - close the ticket (staff or owner)
- `/ticket rename <name>` - rename the ticket (staff)
