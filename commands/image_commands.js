const { YotsubotCommand, YotsubotSubcommand } = require("../yotsubot_command.js");
const Jimp = require("jimp");
const { Options, MessageAttachment } = require("discord.js");

executeAddImage = async (executable, executeArgs) => {
    let imageUrl = executeArgs.options.getString("image");

    if (!imageUrl) {
        const channel = await executeArgs.bot.channels.fetch(executeArgs.channelId);
        const messages = await channel.messages.fetch({ limit: 20 });
        const message = messages.find(message => message.attachments.size > 0);

        imageUrl = message.attachments.first().url;
    }
    executeArgs.image = await Jimp.read(imageUrl);
    executeArgs.imageName = imageUrl.substring(imageUrl.lastIndexOf("/") + 1);
    return await executable.executor(executeArgs);
};

class ImageSubcommand extends YotsubotSubcommand {
    constructor(name, description, executor) {
        super(name, description, executor);

        this.addStringOption(option =>
            option
                .setName("image")
                .setDescription("Image URL. Leave blank to use most recent chat image."));
    }

    async execute(executeArgs) {
        return await executeAddImage(this, executeArgs);
    }
}

class ImageCommand extends YotsubotCommand {
    constructor(name, description, executor, ...subcommands) {
        super(name, description, executor, ...subcommands);   

        this.addStringOption(option =>
            option
                .setName("image")
                .setDescription("Image URL. Leave blank to use most recent chat image."));
    }

    async execute(executeArgs) {
        return await executeAddImage(this, executeArgs);
    }
}

module.exports = [
    new YotsubotCommand(
        "Avatar",
        "Gets the avatar of yourself or a server member.",

        async ({ user, member, options, reply }) => {
            const target =
                options.getMember("member") ||
                options.getUser("member") ||
                member ||
                user;
            const avatarUrl = target.displayAvatarURL({ format: "png" });
            const avatar = await (await Jimp.read(avatarUrl)).getBufferAsync(Jimp.AUTO);
            const attachment = new MessageAttachment(avatar);

            await reply({ files: [ attachment ]});
        }
    )
        .addUserOption(option =>
            option
                .setName("member")
                .setDescription("The member to get the avatar from.")),

    new ImageCommand(
        "Invert",
        "Inverts the image.",

        async ({ image, imageName, reply }) => {
            image.invert();
            const buffer = await image.getBufferAsync(Jimp.AUTO);
            const attachment = new MessageAttachment(buffer, imageName);
            await reply({ files: [attachment] });
        }
    )
];