const { YotsubotCommand } = require("../yotsubot_command.js");

module.exports = [
    new YotsubotCommand(
        "bank",
        "Registers a new bank account if the user doesn't have one.")

        .onExecute(async (yotsubot, interaction) => {
            const dm = await interaction.user.createDM();
            this.banks.push(new Yotsubank(dm));
            await interaction.reply("New bank account created successfully.");
        }),

    new YotsubotCommand(
        "ping",
        "Replies 'Pong!'")

        .onExecute(async (yotsubot, interaction) => {
            await interaction.reply("Pong!");
        }),

	new YotsubotCommand(
        "user",
        "Replies with user info.")
        
        .onExecute(async (yotsubot, interaction) => {
            await interaction.reply("User info.");
        })
];