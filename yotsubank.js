const { MessageCollector } = require("discord.js");
const { writeFile } = require("fs");
const bankData = require("./bank_data.json");

const writeBank = () => writeFile("./bank_data.json", JSON.stringify(bankData, null, 2), err => {});

getToday = () => new Date().toLocaleDateString("en-US");

class Yotsubank {
    constructor(dm) {
        this.userId = dm.recipient.id;
        this.collector = dm.createMessageCollector({ filter: m => this.bankFilter(m) });
        this.collector.on("collect", m => this.handleTransaction(m));
        if (!(this.userId in bankData)) {
            bankData[this.userId] =
            {
                balance: 0,
                allowance: 0,
                lastExpense: getToday(),
            };
            writeBank();
        }
    }

    bankFilter(message) {
        if (message.author.id != this.userId) return false;
        return /^\+?\d*(\.\d+)?$/.test(message.content);
    }

    get allowance() {
        return bankData[this.userId].allowance;
    }

    set allowance(newAllowance) {
        bankData[this.userId].allowance = newAllowance;
        writeBank();
    }

    allowanceSinceLastExpense() {
        const todayMidnight = new Date(getToday());
        const lastExpense = new Date(bankData[this.userId].lastExpense);
        const daysSinceLastExpense = (todayMidnight - lastExpense) / (1000 * 60 * 60 * 24);
        return daysSinceLastExpense * this.allowance;
    }

    get balance() {
        return bankData[this.userId].balance;
    }

    set balance(newBalance) {
        bankData[this.userId].balance = newBalance;
        bankData[this.userId].lastExpense = getToday();
        writeBank();
    }

    async handleTransaction(message) {
        const decrement = (message.content[0] !== "+") ?
                          Number(message.content) :
                          -Number(message.content);
        const delta = this.allowanceSinceLastExpense() - decrement;
        if (delta) this.balance += delta;
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