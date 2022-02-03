const { YotsubotCommand, YotsubotSubcommand } = require("../yotsubot_command.js");
const Jimp = require("jimp");
const request = require("phin");
const { GifUtil, GifFrame, GifCodec, BitmapImage } = require("gifwrap");
const { MessageAttachment } = require("discord.js");
const { errors } = require("jshint/src/messages");

const urlRegex = /(https?:\/\/.*\.(?:png|jpg|jpeg|gif)(\?.*)?)$/i;
const emoteIdRegex = /<a?:.*:(.*)>/;
const userIdRegex = /<@!?(.*)>/;

const urlFilename = url =>
    url.substring(
        url.lastIndexOf("/") + 1,
        (url.indexOf("?") !== -1) ? url.indexOf("?") : url.length);

const getAvatar = target => target.displayAvatarURL({ size: 4096, format: "png", dynamic: true });

class YotsubotImage {
    constructor(data, name, mimetype) {
        this.name = name;
        this.isGif = mimetype === Jimp.MIME_GIF;
        this.data = data;

        if (!this.isGif && ![Jimp.MIME_BMP, Jimp.MIME_JPEG, Jimp.MIME_PNG].includes(mimetype)) {
            throw "Unsupported file type.";
        }
    }

    async readData() {
        if (this.isGif) {
            const gif = await GifUtil.read(this.data);
            this.frames = gif.frames.map(frame => GifUtil.shareAsJimp(Jimp, frame));
            this.delays = gif.frames.map(frame => frame.delayCentisecs);
        } else {
            this.frames = [ await Jimp.read(this.data) ];
        }
    }

    forEachFrame(cb) {
        this.frames.forEach(frame => cb(frame));
    }

    async getBuffer() {
        if (this.isGif) {
            const bitmaps = this.frames.map(frame => new BitmapImage(frame.bitmap));
            GifUtil.quantizeDekker(bitmaps);
            const gifFrames =
                bitmaps.map((bitmap, i) =>
                    new GifFrame(bitmap, { delayCentisecs: this.delays[i] }));
            const codec = new GifCodec();
            const gif = await codec.encodeGif(gifFrames);
            return gif.buffer;
        } else {
            return await this.frames[0].getBufferAsync(Jimp.AUTO);
        }
    }

    async getAttachment() {
        return new MessageAttachment(await this.getBuffer(), this.name);
    }
}

async function addImageArg(executeArgs) {
    let imageUrl;
    const guild = executeArgs.getGuild();
    const imageOption = executeArgs.options.getString("image");

    if (!imageOption) {
        const channel = await executeArgs.bot.channels.fetch(executeArgs.channelId);
        const messages = await channel.messages.fetch({ limit: 20 });
        const message = messages.find(message =>
            message.attachments.size > 0 || urlRegex.test(message.content));

        imageUrl =
            (message.attachments.size > 0) ?
            message.attachments.first().url :
            urlRegex.exec(message.content)[1];
    } else if (emoteIdRegex.test(imageOption)) {
        const emoteId = emoteIdRegex.exec(imageOption)[1];
        if (!guild) {
            throw executeArgs.errors.FOREIGN_EMOTE;
        }
        let emote;
        try {
            emote = await guild.emojis.fetch(emoteId);
        } catch (error) {
            throw errors.FOREIGN_EMOTE;
        }

        imageUrl = emote.url;
    } else if (userIdRegex.test(imageOption)) {
        const userId = userIdRegex.exec(imageOption)[1];
        let member;
        try {
            member = await guild.members.fetch(userId);
        } catch (error) {
            try {
                member = await executeArgs.bot.users.fetch(userId);
            } catch (error) {
                throw executeArgs.errors.USER_NOT_FOUND;
            }
        }

        imageUrl = getAvatar(member);
    } else if (urlRegex.test(imageOption)) {
        imageUrl = imageOption;
    }
    else {
        throw "The ` image ` option must be a valid URL, user, or emote.";
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
        executeArgs.reply = executeArgs.editReply;

        await executeArgs.deferReply();
        await addImageArg(executeArgs);
        return await this.executor(executeArgs);
    }
}

class ImageCommand extends YotsubotCommand {
    addImageOption() {
        return this.addStringOption(createImageOption);
    }

    async execute(executeArgs) {
        executeArgs.reply = executeArgs.editReply;

        await executeArgs.deferReply();
        await addImageArg(executeArgs);
        return await this.executor(executeArgs);
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
            const avatarUrl = getAvatar(target);
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
            if (!emoteIdRegex.test(emoteInput)) throw "Invalid emote.";
            const emoteId = emoteIdRegex.exec(emoteInput)[1];
            let emote;
            try {
                emote = await guild.emojis.fetch(emoteId);
            } catch (error) {
                throw errors.FOREIGN_EMOTE;
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
            await reply({ files: [ await image.getAttachment() ] });
        }
    )
        .addImageOption(),

    new ImageCommand(
        "Scale",
        "Scales an image.",

        async ({ image, options, reply }) => {
            const scale = options.getNumber("scale");
            image.forEachFrame(frame => frame.scale(scale));
            await reply({ files: [ await image.getAttachment() ] });
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