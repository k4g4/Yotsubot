
const { MessageEmbed } = require("discord.js");
const { YotsubotCommand, YotsubotSubcommand } = require("../yotsubot_command.js");

module.exports = [
    new YotsubotCommand(
        "Ping",
        "Replies with the bot's ping.",

        async ({ bot, reply }) => {
            await reply(`My ping is ${bot.ws.ping} ms.`);
        }
    ),

    new YotsubotCommand(
        "User",
        "Gets user info for yourself or a server member.",

        async ({ user, member, options, reply }) => {
            const targetUser = options.getUser("member") ?? user;
            const targetMember = options.getMember("member") ?? member;

            await targetUser.fetch();
            const embed = new MessageEmbed()
                .setImage(targetUser.bannerURL({ dynamic: true }))
                .addField("ID", targetUser.id, true)
                .addField("Created On", targetUser.createdAt.toLocaleDateString("en-US"), true);

            if (targetMember) {
                const roles = targetMember.roles.cache
                    .map(role => role.name)
                    .filter(name => name !== "@everyone")
                    .join(", ");

                embed
                    .setTitle(`Info for ${targetMember.displayName} (${targetUser.tag})`)
                    .setColor(targetMember.displayColor)
                    .setThumbnail(targetMember.displayAvatarURL({ dynamic: true }))
                    .addField("Joined On", targetMember.joinedAt.toLocaleDateString("en-US"), true)
                    .addField("Roles", roles || "None", true);
            } else {
                embed
                    .setTitle(`Info for ${targetUser.tag}`)
                    .setColor(targetUser.accentColor)
                    .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }));
            }
            await reply({ embeds: [embed] });
        }
    )
        .addUserOption(option =>
                option
                    .setName("member")
                    .setDescription("The member to get information for."))
];