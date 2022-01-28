const { SlashCommandBuilder } = require("@discordjs/builders");

class YotsubotCommand extends SlashCommandBuilder {
    constructor(name, description) {
        super();
        this.setName(name);
        this.setDescription(description);
    }

   onExecute(callback) {
        this.callback = callback;
        return this;
    }

    execute(yotsubot, interaction) {
        this.callback(yotsubot, interaction);
    }
}

exports.YotsubotCommand = YotsubotCommand;