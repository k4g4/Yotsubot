const { YotsubotCommand, YotsubotSubcommand } = require("../yotsubot_command.js");

module.exports = [
    new YotsubotCommand(
        "Reload",
        "Reloads the bot's commands.",

        async ({ bot, deferReply, editReply }) => {
            await deferReply({ ephemeral: true });
            await bot.loadCommands();
            await editReply("Commands have been reloaded.");
        })
        
        .setOwnerOnly()
];