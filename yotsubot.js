const { Client, Collection } = require("discord.js");
const { REST } = require("@discordjs/rest");
const { Routes } = require("discord-api-types/v9");
const { readdirSync } = require("fs");
const { promisify } = require("util");
const { botToken, clientId } = require("./yotsubot_secrets.json");
const { Yotsubank } = require("./yotsubank.js");

class Yotsubot extends Client {
    constructor({ intents }) {
        super({ intents });
                
        this.commands = new Collection();
        this.banks = new Collection();
        
        this.once("ready", async () => {
            await Yotsubank.onStartup(this);
            await this.loadCommands();

            console.log("Yotsubot is online!");
        });
        
        this.on("interactionCreate", async interaction => {
            if (!interaction.isCommand()) return;
            
            const command = this.commands.get(interaction.commandName);
            if (!command) return;
            
            const subcommandName = interaction.options.getSubcommand(false);
            const executable = command.subcommands.get(subcommandName) ?? command; 
            const executeArgs = {
                ...interaction,
                bot: this,
                reply: (...args) => interaction.reply(...args),
                deferReply: (...args) => interaction.deferReply(...args),
                editReply: (...args) => interaction.editReply(...args),
                getGuild: () => interaction.guild,
                errors: {
                    NOT_IN_GUILD: "You must be in a server to use this command.",
                    FOREIGN_EMOTE: "The emote must belong to this server.",
                    USER_NOT_FOUND: "Couldn't find the user.",
                    NO_IMAGES_FOUND: "There are no recent images in the channel."
                }
            };

            try {
                await executable.execute(executeArgs);
            } catch (error) {                
                if (interaction.deferred || interaction.replied) {
                    if (!interaction.ephemeral) await interaction.deleteReply();
                    await interaction.followUp({ content: error.stack ?? error, ephemeral: true });
                } else {
                    await interaction.reply({ content: error.stack ?? error, ephemeral: true });
                }
            }
        });
    }

    async loadCommands() {
        this.commands.clear();
        const body = [];
        const commandFiles = readdirSync("./commands").filter(file => file.endsWith(".js"));

        for (const commandFile of commandFiles)
        {
            const commandFilePath = Object.keys(require.cache).find(path => path.includes(commandFile));
            delete require.cache[commandFilePath];
            const commands = require(`./commands/${commandFile}`);
            for (const command of commands) {
                this.commands.set(command.name, command);
            }
            body.push(...commands.map(command => command.toJSON()));
        }
        
        const rest = new REST({ version: "9" }).setToken(botToken);
        
        const response = await rest.put(Routes.applicationCommands(clientId), { body });
        const fullPermissions = [];
        for (const returnedCommand of response) {
            const command = this.commands.get(returnedCommand.name);
            command.id = returnedCommand.id;
            fullPermissions.push({ id: returnedCommand.id, permissions: command.permissions });
        }

        for (const guild of this.guilds.cache.values()) {
            await this.application.commands.permissions.set({ guild, fullPermissions });
        }
    }

    async wait(timeout) {
        await promisify(setTimeout)(timeout);
    }
}

exports.Yotsubot = Yotsubot;