class top10 {
    constructor(FW) {
        this.FW = FW;
        this.FW.events.on('msg', this.messageHandler);
    }
    messageHandler(FW, obj, user, msg) {
        if (msg.substring(0, 6) == FW.config.commandPrefix + "top10") {
            FW.modules.top10.top10Processor(FW.modules.top10, obj, user, msg)
        }
    }
    async top10Processor(self, obj, user, msg) {
        var getToonData = async(max = 10) => {
            return await new Promise((res, rej) => {
                self.FW.sqlPool.query("SELECT * FROM `bot_guild_member` ORDER BY `equipped_item_level` DESC LIMIT 0," + max, (e, r, f) => {
                    if (!e && r[0] != undefined) {
                        res(r)
                    } else {
                        res(false);
                    }
                })
            })
        }   
        var topToons = await getToonData();
        var ret = [];
        var rank = 1;
        for(var tt in topToons) {
            ret.push({ name: "#" + rank + ') ' + topToons[tt].name + ' [' + topToons[tt].equipped_item_level + ']', value: 'Level: ' + topToons[tt].level + ' ' + topToons[tt].gender + ' ' + topToons[tt].race + ' ' + topToons[tt].active_spec + ' ' + topToons[tt].character_class});
            
            rank++;
        }
        var reply = new this.FW.classes.Discord.MessageEmbed()
            .setColor('#0099ff')
            .setTitle('Top Ten Players')
            .setURL('https://logicguild.wtf')
            .setAuthor('LOGIC SOLD SEPARATELY')
            .setDescription('By Item Level')
            .addFields(ret)
            .setTimestamp()
            .setFooter('LSS WoW Bot');
        obj.reply(reply);        
    }
}
module.exports = top10;