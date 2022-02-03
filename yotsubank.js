const { writeFile } = require("fs");
const bankData = require("./bank_data.json");

const writeBank = () => writeFile("./bank_data.json", JSON.stringify(bankData, null, 2), err => {});
const getToday = () => new Date().toLocaleDateString("en-US");

class Yotsubank {
    constructor(dm) {
        this.userId = dm.recipient.id;
        this.collector = dm.createMessageCollector({ filter: m => this.bankFilter(m) });
        this.collector.on("collect", m => this.handleCollect(m));
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

    async handleCollect(message) {
        const amount = (message.content[0] === "+") ?
                          Number(message.content) :
                          -Number(message.content);

        this.transact(amount);
        await message.reply(`**${Yotsubank.toMoney(this.balance)}**`);
    }

    get allowance() {
        return bankData[this.userId].allowance;
    }

    set allowance(newAllowance) {
        bankData[this.userId].allowance = newAllowance;
        writeBank();
    }

    get balance() {
        return bankData[this.userId].balance;
    }

    set balance(newBalance) {
        bankData[this.userId].balance = newBalance;
        bankData[this.userId].lastExpense = getToday();
        writeBank();
    }

    transact(amount) {
        const delta = this.allowanceSinceLastExpense() + amount;
        if (delta) this.balance += delta;
    }

    allowanceSinceLastExpense() {
        const todayMidnight = new Date(getToday());
        const lastExpense = new Date(bankData[this.userId].lastExpense);
        const daysSinceLastExpense = (todayMidnight - lastExpense) / (1000 * 60 * 60 * 24);
        return daysSinceLastExpense * this.allowance;
    }

    static hasAccount(userId) {
        return userId in bankData;
    }

    static async registerBank(yotsubot, userId) {
        const dm = await yotsubot.users.createDM(userId);
        yotsubot.banks.set(userId, new Yotsubank(dm));
    }

    static async onStartup(yotsubot) {
        for (const userId in bankData) {
            await this.registerBank(yotsubot, userId);
        }
    }

    static toMoney(amount) {
        return `$${amount.toFixed(2)}`.replace("$-", "-$");
    }
}

exports.Yotsubank = Yotsubank;