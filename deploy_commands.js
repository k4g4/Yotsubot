const { REST } = require("@discordjs/rest");
const { Routes } = require("discord-api-types/v9");
const { botToken, clientId } = require("./yotsubot_secrets.json");
const { readdirSync } = require("fs");

const body = [];
const commandFiles = readdirSync("./commands").filter(file => file.endsWith(".js"));
for (const commandFile of commandFiles) {
	const commands = require(`./commands/${commandFile}`);
	body.push(...commands.map(command => command.toJSON()));
}

const rest = new REST({ version: "9" }).setToken(botToken);

rest.put(Routes.applicationCommands(clientId), { body })
	.then(() => console.log("Successfully registered application commands."))
	.catch(console.error);
