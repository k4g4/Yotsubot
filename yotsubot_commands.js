const { SlashCommandBuilder } = require("@discordjs/builders");
const { REST } = require("@discordjs/rest");
const { Routes } = require("discord-api-types/v9");
const { botToken, clientId } = require("./yotsubot_secrets.json");

const commands = [
	new SlashCommandBuilder().setName("bank").setDescription("Registers new bank account if the user doesn't have one."),
	new SlashCommandBuilder().setName("ping").setDescription("Replies 'Pong!'"),
	new SlashCommandBuilder().setName("user").setDescription("Replies with user info."),
]
	.map(command => command.toJSON());

const rest = new REST({ version: "9" }).setToken(botToken);

rest.put(Routes.applicationCommands(clientId), { body: commands })
	.then(() => console.log("Successfully registered application commands."))
	.catch(console.error);
