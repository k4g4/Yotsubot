const { Client, Collection } = require("discord.js");
const { readdirSync } = require("fs");
const { promisify } = require("util");
const { Yotsubank } = require("./yotsubank.js");

class Yotsubot extends Client {
    constructor({ intents }) {
        super({ intents });
                
        this.commands = new Collection();
        
        this.once("ready", async () => {
            console.log("Yotsubot is online!");
            
            this.banks = new Collection();
            await Yotsubank.onStartup(this);

            await this.loadCommands();
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
                getGuild: () => interaction.guild,
                errors: {
                    NOT_IN_GUILD: "You must be in a server to use this command.",
                }
            };

            try {
                await executable.execute(executeArgs);
            } catch (error) {                
                await interaction.reply({ content: error.stack ?? error, ephemeral: true });
            }
        });
    }

    async loadCommands() {
        this.commands.clear();
        const commandFiles = readdirSync("./commands").filter(file => file.endsWith(".js"));
        for (const commandFile of commandFiles)
        {
            const commands = require(`./commands/${commandFile}`);
            for (const command of commands) {
                this.commands.set(command.name, command);
            }
        }
    }

    async wait(timeout) {
        await promisify(setTimeout)(timeout);
    }
}

exports.Yotsubot = Yotsubot;