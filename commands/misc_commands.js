const { YotsubotCommand, YotsubotSubcommand } = require("../yotsubot_command.js");

module.exports = [
    new YotsubotCommand(
        "Ping",
        "Replies 'Pong!'",

        async (yotsubot, interaction) => {
            await interaction.reply("Pong!");
        }
    ),

    new YotsubotCommand(
        "User",
        "Replies with user info.",

        async (yotsubot, interaction) => {
            await interaction.reply("User info.");
        }
    )
];