const fs = require("fs");
const path = require("path");

// Remembers which messages are reaction role panels (survives restarts).
const FILE = path.join(__dirname, "data", "reactionRoles.json");
fs.mkdirSync(path.dirname(FILE), { recursive: true });

let ids = [];
try {
  ids = JSON.parse(fs.readFileSync(FILE, "utf8"));
} catch {
  ids = [];
}

module.exports = {
  has: (id) => ids.includes(id),
  add(id) {
    if (!ids.includes(id)) {
      ids.push(id);
      fs.writeFileSync(FILE, JSON.stringify(ids, null, 2));
    }
  },
};
