const { MessageCollector } = require("discord.js");
const { writeFile } = require("fs");
const bankData = require("./bank_data.json");

const writeBank = () => writeFile("bank_data.json", JSON.stringify(bankData, null, 2), err => {});

class Yotsubank {
    constructor(dm) {
        this.userId = dm.recipient.id;
        this.collector = dm.createMessageCollector({ filter: m => this.filter(m) });
        this.collector.on("collect", m => this.handleCollect(m));
        if (!(this.userId in bankData)) {
            bankData[this.userId] =
            {
                balance: 0,
                lastExpense: new Date(),
            };
            writeBank();
        }
    }

    filter(message) {
        if (message.author.id != this.userId) return false;
        return /^\+?\d*(\.\d+)?$/.test(message.content);
    }

    get balance() {
        return bankData[this.userId].balance;
    }

    set balance(newBalance) {
        bankData[this.userId].balance = newBalance;
        writeBank();
    }

    async handleCollect(message) {
        const decrement = (message.content[0] !== "+") ?
                          Number(message.content) :
                          -Number(message.content);

        this.balance -= decrement;
        await message.reply(`**$${this.balance.toFixed(2)}**`.replace("$-", "-$"));
    }

    static async createBanks(yotsubot) {
        const banks = [];
        for (const userId in bankData) {
            const dm = await yotsubot.users.createDM(userId);
            banks.push(new Yotsubank(dm));
        }
        return banks;
    }
}

exports.Yotsubank = Yotsubank;