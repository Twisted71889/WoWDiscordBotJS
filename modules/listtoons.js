class listtoons {
    constructor(FW) {
        this.FW = FW;
        this.FW.events.on('msg', this.messageHandler);
    }
    messageHandler(FW, obj, user, msg) {
        if (msg.substring(0, 10) == FW.config.commandPrefix + "listtoons") {
            FW.modules.listtoons.listToonsProcessor(FW.modules.listtoons, obj, user, msg)
        }
    }
    async listToonsProcessor(self, obj, user, msg) {
        self.FW.log(msg)
        let command = msg.split(" ");
        console.log(command)
        var dcID = false;
        if (command[1] != undefined && command[1].substring(0, 3) == "<@!") {
            dcID = command[1].replace("<@!", '').replace(">", '');
        } else {
            dcID = user.id
        }
        if (dcID) {

            var bot = self.FW.discord;
            var getToonIds = async() => {
                return await new Promise((res, rej) => {
                    self.FW.sqlPool.query("SELECT * FROM `bot_discord_links` WHERE `discord_user` = ?", [dcID], (e, r, f) => {
                        if (!e && r[0] != undefined) {
                            let toonIds = []
                            for (var row in r) {
                                toonIds.push(r[row].character_id)
                            }
                            res(toonIds)
                        } else {
                            res(false);
                        }
                    })
                })
            }
            var toonIds = await getToonIds();
            var getToonData = async(toonId) => {
                return await new Promise((res, rej) => {
                    self.FW.sqlPool.query("SELECT * FROM `bot_guild_member` WHERE `id` = ?", [toonId], (e, r, f) => {
                        if (!e && r[0] != undefined) {
                            res(r[0])
                        } else {
                            res(false);
                        }
                    })
                })
            }
            var toonData = []
            var bestToonRank = 99;
            var bestiLvL = 0;
            var mainToon = {}
            var mainToonIndex = -1;
            for (var toonIndex in toonIds) {
                toonData.push(await getToonData(toonIds[toonIndex]))
            }
            for (var toonIndex in toonData) {
                toonData[toonIndex].rawname = toonData[toonIndex].name
                toonData[toonIndex].name = toonData[toonIndex].name + ' (' + toonData[toonIndex].equipped_item_level + ')'
                if (toonData[toonIndex].guild_rank < bestToonRank) {
                    mainToon = toonData[toonIndex]
                    bestiLvL = toonData[toonIndex].equipped_item_level
                    mainToonIndex = toonIndex
                    bestToonRank = toonData[toonIndex].guild_rank
                } else if (toonData[toonIndex].guild_rank == bestToonRank) {
                    if (toonData[toonIndex].equipped_item_level > bestiLvL) {
                        bestiLvL = toonData[toonIndex].equipped_item_level
                        mainToon = toonData[toonIndex]
                        mainToonIndex = toonIndex
                    }
                }
            }
            toonData[mainToonIndex].isMainToon = true;
            toonData[mainToonIndex].name = '[MAIN] ' + toonData[mainToonIndex].name;

            function compare(a, b) {
                if (a.isMainToon) return -1;
                if (a.level > b.level) return -1;
                if (b.level > a.level) return 1;
                return 0;
            }

            if (command[2] != undefined && command[2] == 'main') {
                obj.reply(self.FW.modules.wowApi.characterSpotLight(toonData, mainToonIndex));
            } else {
                toonData.sort(compare);
                var ret = [];
                for (var i in toonData) {
                    var toon = toonData[i]
                    ret.push({ name: toon.name, value: 'Level: ' + toon.level + ' ' + toon.gender + ' ' + toon.race + ' ' + toon.active_spec + ' ' + toon.character_class });
                }
                self.FW.discord.myguild.members.fetch(dcID).then((discordUser) => {
                    obj.reply(self.FW.modules.wowApi.accountCharacters(ret, discordUser.displayName));
                })
            }

        }
    }
}
module.exports = listtoons;