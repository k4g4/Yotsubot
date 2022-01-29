const { YotsubotCommand, YotsubotSubcommand } = require("../yotsubot_command.js");
const { Yotsubank } = require("../yotsubank.js");

const NO_ACC_ERROR = "You must create a bank account with `/bank register`.";

module.exports = [
    new YotsubotCommand(
        "Bank",
        "YotsuBank interface.",
        null,
    
        new YotsubotSubcommand(
            "Register",
            "Registers a new bank account if the user doesn't have one.",
    
            async (yotsubot, interaction) => {
                const userId = interaction.user.id;
                if (Yotsubank.hasAccount(userId)) throw "You already have an account.";
                await Yotsubank.registerBank(yotsubot, userId);
                await interaction.reply("New bank account created.");
            }
        ),
    
        new YotsubotSubcommand(
            "Withdraw",
            "Withdraws from the bank account.",
    
            async (yotsubot, interaction) => {
                const bank = yotsubot.banks.get(interaction.user.id);
                if (!bank) throw NO_ACC_ERROR;
                bank.transact(-interaction.options.getNumber("amount"));
                await interaction.reply(`Your new balance is \`${Yotsubank.toMoney(bank.balance)}\`.`);
            }
        )
            .addNumberOption(option => option
                    .setName("amount")
                    .setDescription("Amount of money to withdraw.")
                    .setMinValue(0).setMaxValue(10000).setRequired(true)
            ),
    
        new YotsubotSubcommand(
            "Deposit",
            "Deposits to the bank account.",
    
            async (yotsubot, interaction) => {
                const bank = yotsubot.banks.get(interaction.user.id);
                if (!bank) throw NO_ACC_ERROR;
                bank.transact(interaction.options.getNumber("amount"));
                await interaction.reply(`Your new balance is \`${Yotsubank.toMoney(bank.balance)}\`.`);
            }
        )
            .addNumberOption(option => option
                    .setName("amount")
                    .setDescription("Amount of money to deposit.")
                    .setMinValue(0).setMaxValue(10000).setRequired(true)
            ),
    
        new YotsubotSubcommand(
            "Balance",
            "Gets the bank account's balance.",
    
            async (yotsubot, interaction) => {
                const bank = yotsubot.banks.get(interaction.user.id);
                if (!bank) throw NO_ACC_ERROR;
                bank.transact(0);
                await interaction.reply(`Your balance is \`${Yotsubank.toMoney(bank.balance)}\`.`);
            }
        ),
    
        new YotsubotSubcommand(
            "Allowance",
            "Sets the daily allowance.",
    
            async (yotsubot, interaction) => {
                const bank = yotsubot.banks.get(interaction.user.id);
                if (!bank) throw NO_ACC_ERROR;
                bank.allowance = interaction.options.getNumber("amount");
                await interaction.reply(`Allowance has been set to \`${Yotsubank.toMoney(bank.allowance)}\`.`);
            }
        )
            .addNumberOption(option => option
                    .setName("amount")
                    .setDescription("Amount of money to receive each day.")
                    .setMinValue(0).setMaxValue(1000).setRequired(true)
            )
    )
];