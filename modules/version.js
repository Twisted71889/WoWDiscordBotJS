class version {
    constructor(FW) {
        this.FW = FW;
        this.FW.events.on('msg', this.messageHandler);
    }
    messageHandler(FW, obj, user, msg) {
        if (msg.substring(0, 8) == FW.config.commandPrefix + "version") {
            obj.reply("Current Version: 1.1.1a");
        }
    }
}
module.exports = version;