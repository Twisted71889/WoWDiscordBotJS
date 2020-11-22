class restAPI {
    constructor(FW) {
        this.FW = FW;
        //this.FW.events.on('msg', this.messageHandler);
        this.router();
    }
    router () {
        var self = this;
        self.FW.webapp.core.get('/api/v1/guild_stats', (req, res) => {
            var responseObject = {
                num_members: self.FW.modules.wowApi.guildMembers.length,
                highestKey: self.FW.modules.raiderio.highestKey,
                highestKeyTimed: self.FW.modules.raiderio.highestTimedKey,
                highestKeyName: self.FW.modules.raiderio.highestKeyName,
                highestKeyTimedName: self.FW.modules.raiderio.highestTimedKeyName
            }
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.status(200).send(JSON.stringify(responseObject));
        });
    }
    
}
module.exports = restAPI;