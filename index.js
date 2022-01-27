const { Intents } = require("discord.js");
const { Yotsubot } = require("./yotsubot.js");
const { botToken } = require("./yotsubot_secrets.json");

const yotsubot = new Yotsubot({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.DIRECT_MESSAGES] });

yotsubot.login(botToken);
