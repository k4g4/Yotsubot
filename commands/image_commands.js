const { YotsubotCommand, YotsubotSubcommand } = require("../yotsubot_command.js");
const Jimp = require("jimp");

module.exports = [
    new YotsubotCommand(
        "Test",
        "foobar",

        async (yotsubot, interaction) => {
            
            await interaction.reply("Hello world.");
        }
    )
];