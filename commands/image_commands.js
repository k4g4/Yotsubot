const { YotsubotCommand, YotsubotSubcommand } = require("../yotsubot_command.js");
const Jimp = require("jimp");
const request = require("phin");
const { GifUtil, GifFrame, GifCodec, BitmapImage } = require("gifwrap");
const { MessageAttachment } = require("discord.js");

const urlFilename = url => url.substring(url.lastIndexOf("/") + 1);

class YotsubotImage {
    constructor(data, name, mimetype) {
        this.name = name;
        this.mimetype = mimetype;
        this.data = data;
    }

    async readData() {
        if (this.mimetype === Jimp.MIME_GIF) {
            const gif = await GifUtil.read(this.data);
            this.frames = gif.frames.map(frame => GifUtil.shareAsJimp(Jimp, frame));
        } else if ([Jimp.MIME_BMP, Jimp.MIME_JPEG, Jimp.MIME_PNG].includes(this.mimetype)) {
            this.frames = [ await Jimp.read(this.data) ];
        } else {
            throw "Unsupported file type.";
        }
    }

    forEachFrame(cb) {
        this.frames.forEach(frame => cb(frame));
    }

    async getBuffer() {
        if (this.mimetype === Jimp.MIME_GIF) {
            const gifFrames =
                this.frames
                    .map(frame =>
                        new GifFrame(new BitmapImage(frame.bitmap)));
            const codec = new GifCodec();
            const gif = await codec.encodeGif(gifFrames);
            return gif.buffer;
        } else {
            return await this.frames[0].getBufferAsync(Jimp.AUTO);
        }
    }
}

async function addImageArg(executeArgs) {
    let imageUrl = executeArgs.options.getString("image");

    if (!imageUrl) {
        const channel = await executeArgs.bot.channels.fetch(executeArgs.channelId);
        const messages = await channel.messages.fetch({ limit: 20 });
        const message = messages.find(message => message.attachments.size > 0);

        imageUrl = message.attachments.first().url;
    }
    const filename = urlFilename(imageUrl);
    const response = await request(imageUrl);
    const mimetype = response.headers["content-type"];

    if (response.statusCode !== 200 || !(mimetype?.startsWith("image/"))) {
        throw "Failed to download the image.";
    }
    executeArgs.image = new YotsubotImage(response.body, filename, mimetype);
    await executeArgs.image.readData();
}

const createImageOption = option =>
        option
            .setName("image")
            .setDescription("Image URL. Leave blank to use most recent chat image.");

class ImageSubcommand extends YotsubotSubcommand {
    addImageOption() {
        return this.addStringOption(createImageOption);
    }

    async execute(executeArgs) {
        await addImageArg(executeArgs);
        return await executable.executor(executeArgs);
    }
}

class ImageCommand extends YotsubotCommand {
    addImageOption() {
        return this.addStringOption(createImageOption);
    }

    async execute(executeArgs) {
        await addImageArg(executeArgs);
        return await executable.executor(executeArgs);
    }
}

module.exports = [
    new YotsubotCommand(
        "Avatar",
        "Gets the avatar of yourself or a server member.",

        async ({ user, member, options, reply }) => {
            const target =
                options.getMember("member") ??
                options.getUser("member") ??
                member ??
                user;
            const avatarUrl = target.displayAvatarURL({ format: "png", dynamic: true });
            const avatar = (await request(avatarUrl)).body;
            const filename = urlFilename(avatarUrl);
            const attachment = new MessageAttachment(avatar, filename);

            await reply({ files: [ attachment ]});
        }
    )
        .addUserOption(option =>
            option
                .setName("member")
                .setDescription("The member to get the avatar from.")),

    new YotsubotCommand(
        "Emote",
        "Gets the full image of an emote.",

        async ({ getGuild, options, reply, errors }) => {
            const guild = getGuild();
            if (!guild) throw errors.NOT_IN_GUILD;
            
            const emoteInput = options.getString("emote");
            const emoteIdRegex = /<a?:.*:(.*)>/;
            if (!emoteIdRegex.test(emoteInput)) throw "Invalid emote.";
            const emoteId = emoteIdRegex.exec(emoteInput)[1];
            let emote;
            try {
                emote = await guild.emojis.fetch(emoteId);
            } catch (error) {
                throw "The emote must belong to this server.";
            }  
            const emoteImage = (await request(emote.url)).body;
            const filename = urlFilename(emote.url);
            const attachment = new MessageAttachment(emoteImage, filename);

            await reply({ files: [ attachment ]});
        }
    )
        .addStringOption(option =>
            option
                .setName("emote")
                .setDescription("The emote to use.")
                .setRequired(true)),

    new ImageCommand(
        "Invert",
        "Inverts an image.",

        async ({ image, reply }) => {
            image.forEachFrame(frame => frame.invert());
            const buffer = await image.getBuffer();
            const attachment = new MessageAttachment(buffer, image.name);
            await reply({ files: [attachment] });
        }
    )
        .addImageOption(),

    new ImageCommand(
        "Scale",
        "Scales an image.",

        async ({ image, options, reply }) => {
            scale = options.getNumber("scale");
            image.forEachFrame(frame => frame.scale(scale));
            const buffer = await image.getBuffer();
            const attachment = new MessageAttachment(buffer, image.name);
            await reply({ files: [attachment] });
        }
    )
        .addNumberOption(option =>
            option
                .setName("scale")
                .setDescription("The scaling factor.")
                .setMinValue(0.2).setMaxValue(4)
                .setRequired(true))
                
        .addImageOption()
];