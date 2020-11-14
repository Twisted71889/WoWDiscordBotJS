class raiderio {
    constructor(FW) {
        this.FW = FW;
        this.FW.events.on('msg', this.messageHandler);
    }
    messageHandler(FW, obj, user, msg) {
        if (msg.substring(0, 11) == FW.config.commandPrefix + "topiorealm") {
            FW.modules.raiderio.topioProcessor(FW.modules.raiderio, obj, user, msg, 'mplus_realm_rank', 'ASC')
        } else if (msg.substring(0, 6) == FW.config.commandPrefix + "topio") {
            FW.modules.raiderio.topioProcessor(FW.modules.raiderio, obj, user, msg)
        }
        
    }
    async topioProcessor(self, obj, user, msg, sortby = 'mplusscore', order = 'DESC') {
        var getTopIOScores = async(max = 10) => {
            return await new Promise((res, rej) => {
                self.FW.sqlPool.query("SELECT * FROM `raiderio` ORDER BY `" + sortby + "` " + order + " LIMIT 0," + max, (e,r,f) => {
                    if (!e && r[0] != undefined) {
                        res(r)
                    } else {
                        res(false);
                    }
                })
            })
        }   
        var getToonInfo =  (async (character_id) => { 
            return new Promise((res, rej) => {
                self.FW.sqlPool.query("SELECT * FROM `bot_guild_member` WHERE `id` = ? LIMIT 0,1", [character_id], (e,r,f) => {
                    if(!e) {
                        if(r[0] != undefined) {
                            res(r[0]);
                        } else {
                            rej(false);
                        }
                    } else {
                        rej(e);
                    }
                    
                });
            }) 
        });

        var topToons = await getTopIOScores();
        var ret = [];
        var rank = 1;
        for(var tt in topToons) {
            try {
                var toon = await getToonInfo(topToons[tt].character_id);
                if(sortby == 'mplusscore') {
                    ret.push({ name: "#" + rank + ') ' + toon.name + ' [' + topToons[tt].mplusscore + ']', value: 'Item Level: ' + toon.equipped_item_level + ' ' + toon.gender + ' ' + toon.race + ' ' + toon.active_spec + ' ' + toon.character_class});
                } else {
                    ret.push({ name: "#" + topToons[tt].mplus_realm_rank + ') ' + toon.character_class + ' - ' + toon.name + ' [' + topToons[tt].mplusscore + ']', value: 'Item Level: ' + toon.equipped_item_level + ' ' + toon.gender + ' ' + toon.race + ' ' + toon.active_spec + ' ' + toon.character_class});
                
                }
                rank++;
            } catch (e) {
                console.log(e);
            }
            
        }
        var desc = 'By Raider.IO Realm Rank';
        if(sortby == 'mplusscore') {
            desc = 'By Raider.IO M+ Score';
        }
        var reply = new this.FW.classes.Discord.MessageEmbed()
            .setColor('#0099ff')
            .setTitle('Top Ten Players')
            .setURL('https://logicguild.wtf')
            .setAuthor('LOGIC SOLD SEPARATELY')
            .setDescription(desc)
            .addFields(ret)
            .setTimestamp()
            .setFooter('LSS WoW Bot');
        obj.reply(reply);        
    }
    async APIRequest (realm, charactername) {
        return new Promise ((res, rej) => {
            this.FW.classes.https.get('https://raider.io/api/v1/characters/profile?region=us&realm=' + realm + '&name=' + charactername + '&fields=mythic_plus_scores_by_season:current,mythic_plus_ranks,mythic_plus_best_runs:all', (resp) => {
                let body = ''
                resp.on('data', (packet) => {
                    body += packet;
                });
                resp.on('end', () => {
                    try {
                        var ret = JSON.parse(body);
                        res(ret);
                    } catch (e) {
                        rej();
                    }
                });
            }).on('error', (e) => {rej()});
        });
    }
    async GetMPlusProfile (realm, charactername) {
        try {
            var raiderio = await this.APIRequest(realm, charactername);
            if(raiderio) {
                var raiderObj = {
                    mplusscore: raiderio.mythic_plus_scores_by_season[0].scores.all,
                    mplus_realm_rank: raiderio.mythic_plus_ranks.faction_class.realm 
                }
                raiderObj.best_runs = []
                for(var d in raiderio.mythic_plus_best_runs) {
                    var run = raiderio.mythic_plus_best_runs[d];
                    var runObj = {
                        dungeon: run.dungeon,
                        level: run.mythic_level,
                        time: parseFloat((run.clear_time_ms / 1000) / 60, 2),
                        chests: run.num_keystone_upgrades
                    }
                    runObj.affixes = []
                    for(var a in run.affixes) {
                        runObj.affixes.push(run.affixes[a].name)
                    }
                    raiderObj.best_runs.push(runObj);
                }
                return raiderObj;
            }
        } catch (e) {
            
            return false;
        }
        return false;
    }
}
module.exports = raiderio;