const { SlashCommandBuilder, SlashCommandSubcommandBuilder } = require("@discordjs/builders");
const { Collection, MessageActionRow } = require("discord.js");
const { ownerId } = require("./yotsubot_secrets.json");

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
        this.permissions = [];
    }

    setOwnerOnly() {
        this.permissions.push({
            id:  ownerId,
            type: "USER",
            permission: true });
        return this.setDefaultPermission(false);
    }

    async execute(executeArgs) {
        return await this.executor(executeArgs);
    }
}

class YotsubotActions extends MessageActionRow {
    constructor(...actions) {
        for (const action of actions)
            action.customId = action.label;
        super({ components: actions });
        this.actions = actions;
    }

    createCollectors(message) {
        for (const action of this.actions) {
            const collector = message.createMessageComponentCollector({
                filter: interaction => interaction.customId === action.customid
            });
            collector.on("collect", action.executor);
        }
    }
}

exports.YotsubotCommand = YotsubotCommand;
exports.YotsubotSubcommand = YotsubotSubcommand;
exports.YotsubotActions = YotsubotActions;