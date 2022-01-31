const { SlashCommandBuilder, SlashCommandSubcommandBuilder } = require("@discordjs/builders");
const { Collection } = require("discord.js");

class YotsubotSubcommand extends SlashCommandSubcommandBuilder {
    constructor(name, description, executor) {
        super();
        this.setName(name.toLowerCase());
        this.setDescription(description);
        this.executor = executor;
    }

    async execute(executeArgs) {
        return await this.executor(executeArgs);
    }
}

class YotsubotCommand extends SlashCommandBuilder {
    constructor(name, description, executor, ...subcommands) {
        super();
        this.setName(name.toLowerCase());
        this.setDescription(description);
        this.executor = executor;
        this.subcommands = new Collection();
        for (const subcommand of subcommands) {
            super.addSubcommand(subcommand);
            this.subcommands.set(subcommand.name, subcommand);
        }
    }

    async execute(executeArgs) {
        return await this.executor(executeArgs);
    }
}

exports.YotsubotCommand = YotsubotCommand;
exports.YotsubotSubcommand = YotsubotSubcommand;