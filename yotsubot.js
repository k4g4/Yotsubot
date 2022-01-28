const { Client, Collection } = require("discord.js");
const { readdirSync } = require("fs");
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

            this.banks = await Yotsubank.createBanks(this);
        });
        
        this.on("interactionCreate", async interaction => {
            if (!interaction.isCommand()) return;
        
            const command = this.commands.get(interaction.commandName);

            if (!command) return;

            try {
                await command.execute(this, interaction);
            } catch (error) {
                console.error(error);
                await interaction.reply({ content: "An error occurred.", ephemeral: true });
            }
        });
    }
}

exports.Yotsubot = Yotsubot;