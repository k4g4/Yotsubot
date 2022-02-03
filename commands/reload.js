const { YotsubotCommand, YotsubotSubcommand } = require("../yotsubot_command.js");

module.exports = [
    new YotsubotCommand(
        "Reload",
        "Reloads the bot's commands.",

        async ({ bot, reply }) => {
            await bot.loadCommands();
            await reply({ content: "Commands have been reloaded.", ephemeral: true });
        }
    )
        .setOwnerOnly()
];