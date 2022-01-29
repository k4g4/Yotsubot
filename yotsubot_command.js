const { SlashCommandBuilder, SlashCommandSubcommandBuilder } = require("@discordjs/builders");
const { Collection } = require("discord.js");

class YotsubotSubcommand extends SlashCommandSubcommandBuilder {
    constructor(name, description, execute) {
        super();
        this.setName(name.toLowerCase());
        this.setDescription(description);
        this.execute = execute;
    }
}

class YotsubotCommand extends SlashCommandBuilder {
    constructor(name, description, execute, ...subcommands) {
        super();
        this.setName(name.toLowerCase());
        this.setDescription(description);
        this.execute = execute;
        this.subcommands = new Collection();
        for (const subcommand of subcommands) {
            super.addSubcommand(subcommand);
            this.subcommands.set(subcommand.name, subcommand);
        }
    }
}

exports.YotsubotCommand = YotsubotCommand;
exports.YotsubotSubcommand = YotsubotSubcommand;