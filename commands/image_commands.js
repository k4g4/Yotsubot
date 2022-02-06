const { YotsubotCommand, YotsubotSubcommand } = require("../yotsubot_command.js");
const Jimp = require("jimp");
const request = require("phin");
const { GifUtil, GifFrame, GifCodec, BitmapImage } = require("gifwrap");
const { MessageAttachment } = require("discord.js");

const CHANNEL_IMAGE_FETCH_LIMIT = 30;
const IMPACT_FONT_FILE = "resources/impact.fnt";

const imageUrlRegex = /(https?:\/\/.*\.(?:png|jpg|jpeg|gif)(\?.*)?)$/i;
const emoteIdRegex = /<a?:.*:(.*)>/;
const userIdRegex = /<@!?(.*)>/;

const urlFilename = url =>
    url.substring(
        url.lastIndexOf("/") + 1,
        (url.indexOf("?") !== -1) ? url.indexOf("?") : url.length);

const getAvatar = target => target.displayAvatarURL({ size: 4096, format: "png", dynamic: true });

class YotsubotImage {
    constructor(imageUrl) {
        this.imageUrl = imageUrl;
        this.filename = urlFilename(imageUrl);
    }

    async readData() {
        const response = await request(this.imageUrl);
        const mimetype = response.headers["content-type"];
        
        this.isGif = mimetype === Jimp.MIME_GIF;

        if (response.statusCode !== 200)
            throw "Failed to download the image.";
        
        if (!(mimetype?.startsWith("image/")) ||
            (!this.isGif && ![Jimp.MIME_BMP, Jimp.MIME_JPEG, Jimp.MIME_PNG].includes(mimetype)))
            throw "Unsupported file type.";

        if (this.isGif) {
            const gif = await GifUtil.read(response.body);
            this.frames = gif.frames.map(frame => GifUtil.shareAsJimp(Jimp, frame));
            this.delays = gif.frames.map(frame => frame.delayCentisecs);
        } else {
            this.frames = [ await Jimp.read(response.body) ];
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
        return new MessageAttachment(await this.getBuffer(), this.filename);
    }
}

async function fetchChannelImageUrls(bot, channelId) {
    const channel = await bot.channels.fetch(channelId);
    const messages = await channel.messages.fetch({ limit: CHANNEL_IMAGE_FETCH_LIMIT });

    return messages
            .map(message =>
                message.attachments
                .filter(attachment => imageUrlRegex.test(attachment.url))
                .map(attachment => attachment.url)
                .concat(imageUrlRegex.test(message.content) ?
                    [ imageUrlRegex.exec(message.content)[1] ] : []))
            .flat();
}

async function addImageArg(executeArgs) {
    let imageUrl;
    const guild = executeArgs.getGuild();
    const imageOption = executeArgs.options.getString("image");

    if (!imageOption) {
        const channelImageUrls =
            await fetchChannelImageUrls(executeArgs.bot, executeArgs.channelId);

        if (channelImageUrls.length === 0) throw executeArgs.errors.NO_IMAGE_FOUND;
        imageUrl = channelImageUrls[0];

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

    } else if (imageUrlRegex.test(imageOption)) {
        imageUrl = imageOption;
    }
    else {
        throw "The ` image ` option must be a valid URL, user, or emote.";
    }

    executeArgs.image = new YotsubotImage(imageUrl);
    await executeArgs.image.readData();
}

const createImageOption = option =>
        option
            .setName("image")
            .setDescription("Image URL, user mention or server emote. Leave blank to use most recent chat image.");

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
        })

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
        })

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
        })

        .addImageOption(),

        new ImageCommand(
            "Posterize",
            "Posterizes an image.",
    
            async ({ image, options, reply }) => {
                const level = Number(options.getString("strength"));
                image.forEachFrame(frame => frame.posterize(level));
                await reply({ files: [ await image.getAttachment() ] });
            })
    
            .addStringOption(option =>
                option
                    .setName("strength")
                    .setDescription("Posterization strength.")
                    .addChoice("strong", "3")
                    .addChoice("medium", "5")
                    .addChoice("weak", "7"))
        
            .addImageOption(),

        new ImageCommand(
            "Pixelate",
            "Pixelates an image.",
    
            async ({ image, options, reply }) => {
                const level = Number(options.getString("strength"));
                image.forEachFrame(frame => frame.pixelate(level));
                await reply({ files: [ await image.getAttachment() ] });
            })
    
            .addStringOption(option =>
                option
                    .setName("strength")
                    .setDescription("Pixelization strength.")
                    .addChoice("strong", "50")
                    .addChoice("medium", "20")
                    .addChoice("weak", "10"))
        
            .addImageOption(),
        
    new ImageCommand(
        "Scale",
        "Scales an image.",

        async ({ image, options, reply }) => {
            const scale = options.getNumber("scale");
            image.forEachFrame(frame => frame.scale(scale));
            await reply({ files: [ await image.getAttachment() ] });
        })

        .addNumberOption(option =>
            option
                .setName("scale")
                .setDescription("The scaling factor.")
                .setMinValue(0.2).setMaxValue(4)
                .setRequired(true))
                
        .addImageOption(),

    new ImageCommand(
        "Rotate",
        "Rotates an image.",
        
        async ({ image, options, reply }) => {
            const degrees =
                options.getNumber("degrees") *
                (options.getString("direction") == "cc" ? 1 : -1);
            image.forEachFrame(frame => frame.rotate(degrees));
            await reply({ files: [ await image.getAttachment() ] });
        })
        
        .addNumberOption(option =>
            option
                .setName("degrees")
                .setDescription("Degrees to rotate image.")
                .setMinValue(1).setMaxValue(360)
                .setRequired(true))
            
        .addStringOption(option =>
            option
                .setName("direction")
                .setDescription("Rotation direction.")
                .addChoice("clockwise", "c")
                .addChoice("counter-clockwise", "cc"))
        
        .addImageOption(),
                
    new ImageCommand(
        "Meme",
        "Creates a meme from the provided captions.",

        async ({ image, options, reply }) => {
            const topCaption = (options.getString("top") ?? "").toUpperCase();
            const bottomCaption = (options.getString("bottom") ?? "").toUpperCase();

            if (!topCaption && !bottomCaption) throw "Provide at least one caption.";

            const font = await Jimp.loadFont(IMPACT_FONT_FILE);
            const memeWidth = 800;

            image.forEachFrame(frame =>
                frame
                    .resize(memeWidth, Jimp.AUTO)
                    .print(
                        font,
                        0,
                        20,
                        {
                            text: topCaption,
                            alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER
                        },
                        memeWidth)
                    .print(
                        font,
                        0,
                        -20,
                        {
                            text: bottomCaption,
                            alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
                            alignmentY: Jimp.VERTICAL_ALIGN_BOTTOM
                        },
                        memeWidth,
                        frame.bitmap.height));

            await reply({ files: [ await image.getAttachment() ] });
        })

        .addImageOption()

        .addStringOption(option =>
            option
                .setName("top")
                .setDescription("Top meme caption."))

        .addStringOption(option =>
            option
                .setName("bottom")
                .setDescription("Bottom meme caption.")),

    new YotsubotCommand(
        "Gif",
        "Creates a GIF from the images in the channel.",

        async ({ bot, channelId, errors, options, deferReply, editReply }) => {
            await deferReply();

            const count = options.getInteger("count") ?? 30;
            const delay = options.getNumber("delay") * 100 ?? 30;

            const channelImageUrls = await fetchChannelImageUrls(bot, channelId);

            if (channelImageUrls.length === 0) throw errors.NO_IMAGE_FOUND;

            const images =
                channelImageUrls
                    .slice(0, count)
                    .map(imageUrl => new YotsubotImage(imageUrl));
            
            for (const image of images) await image.readData();

            const frames = images.map(image => image.frames).flat();
            const delays = images.map(image => image.isGif ? image.delays : delay).flat();

            const { maxWidth, maxHeight } =
                GifUtil.getMaxDimensions(
                    frames
                        .map(frame => new BitmapImage(frame.bitmap))
                        .map(bitmap => new GifFrame(bitmap)));
            
            for (const frame of frames) frame.contain(maxWidth, maxHeight);

            const bitmaps = frames.map(frame => new BitmapImage(frame.bitmap));
            GifUtil.quantizeDekker(bitmaps);
            const gifFrames =
                bitmaps.map((bitmap, i) =>
                    new GifFrame(bitmap, { delayCentisecs: delays[i] }));
            const codec = new GifCodec();
            const gif = await codec.encodeGif(gifFrames);
            const attachment = new MessageAttachment(gif.buffer, "image.gif");

            await editReply({ files: [ attachment ] });
        })

        .addIntegerOption(option =>
            option
                .setName("count")
                .setDescription("The number of images to fetch from the channel. " +
                                `Limited to the last ${CHANNEL_IMAGE_FETCH_LIMIT} messages.`)
                .setMinValue(2).setMaxValue(30))

        .addNumberOption(option =>
            option
                .setName("delay")
                .setDescription("Delay between frames, in seconds.")
                .setMinValue(0.05).setMaxValue(2))
];