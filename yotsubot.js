const { Client } = require("discord.js");
const { Yotsubank } = require("./yotsubank.js");

class Yotsubot extends Client {
    constructor({ intents }) {
        super({ intents });

        this.once("ready", async () => {
            console.log("Yotsubot is online!");

            this.banks = await Yotsubank.createBanks(this);
        });
        
        this.on("interactionCreate", async interaction => {
            if (!interaction.isCommand()) return;
        
            const { commandName } = interaction;
        
            if (commandName === "bank") {
                const dm = await interaction.user.createDM();
                this.banks.push(new Yotsubank(dm));
                interaction.reply("New bank account created successfully.");
            } else if (commandName === "ping") {
                await interaction.reply("Pong!");
            } else if (commandName === "user") {
                await interaction.reply("User info.");
            }
        });
    }
}

exports.Yotsubot = Yotsubot;