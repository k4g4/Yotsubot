const { Client, Collection } = require("discord.js");
const { readdirSync } = require("fs");
const { promisify } = require("util");
const { Yotsubank } = require("./yotsubank.js");

class Yotsubot extends Client {
    constructor({ intents }) {
        super({ intents });
                
        this.commands = new Collection();
        const commandFiles = readdirSync("./commands").filter(file => file.endsWith(".js"));
        for (const commandFile of commandFiles)
        {
            const commands = require(`./commands/${commandFile}`);
            for (const command of commands) {
                this.commands.set(command.name, command);
            }
        }

        this.once("ready", async () => {
            console.log("Yotsubot is online!");

            this.banks = new Collection();
            await Yotsubank.onStartup(this);
        });
        
        this.on("interactionCreate", async interaction => {
            if (!interaction.isCommand()) return;
            
            const command = this.commands.get(interaction.commandName);
            if (!command) return;
            
            const subcommandName = interaction.options.getSubcommand(false);
            const executable = subcommandName ?
                command.subcommands.get(subcommandName) :
                command;
            
            const executeArgs = {
                ...interaction,
                bot: this,
                reply: (...args) => interaction.reply(...args)
            };
            try {
                await command.execute(executeArgs);
            } catch (error) {
                await interaction.reply({ content: error.stack, ephemeral: true });
            }
        });
    }

    async wait (timeout) {
        await promisify(setTimeout)(timeout);
    }
}

exports.Yotsubot = Yotsubot;