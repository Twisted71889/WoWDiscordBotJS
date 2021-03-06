class wowApi {
    constructor(FW) {
        var self = this;
        this.FW = FW;
        this.guildMembers = [];
        this.toonDB = [];
        this.actualMembers = []
        this.FW.classes.BlizzAPI = require('blizzapi');
        this.FW.bapi = new this.FW.classes.BlizzAPI({
            region: 'us',
            clientId: this.FW.config.bnetId,
            clientSecret: this.FW.config.bnetSecret
        });
        this.FW.events.on('msg', this.messageHandler);
        this.FW.events.on('wowApi_guildUpdate', this.onGuildUpdate)
        this.FW.events.on('wowApi_guildToonsProcessed', this.onGuildToonsProcessed)
        this.updateRequested = false
        self.fetchGuildUpdate(self)
        setInterval(() => { self.fetchGuildUpdate(self) }, 600000)
    }
    async messageHandler(FW, obj, user, msg) {
        if (msg.substring(0, 13) == FW.config.commandPrefix + "updateroster") {
            if(obj.member.hasPermission("ADMINISTRATOR")) {
                obj.reply(`I'm fetching fresh data from the WoW API.  Please stand by.`);
                FW.modules.wowApi.updateRequested = obj.channel.id;
                await FW.modules.wowApi.onGuildUpdate(FW.modules.wowApi, await FW.modules.wowApi.GetGuildInfo());
                obj.reply(`Guild Database has been updated.`);
            } else {
                obj.reply(`you do not have permission to run that command.`);
            }
        }
    }
    onGuildToonsProcessed(self, toons) {
        self.guildMembers = toons
        if(self.updateRequested != false) {
            self.FW.discord.myguild.channels.cache.get(self.updateRequested).send(`Guild Database Contains ${toons.length} characters.`);
            self.updateRequested = false
        }
        self.FW.log(`Guild Roster Updated.  ${toons.length} characters queried.`, 3, 'WOWAPI')
    }
    async onGuildUpdate(self, result) {
        var FW = self.FW;
        FW.log(`Guild Summary Updated.  ${result.members.length} characters loaded.`, 3, 'WOWAPI');
        var guildMembers = []
        var toonsProcessed = 0;
        for (var index in result.members) {
            let member = result.members[index];
            FW.log(member.character.name.toLowerCase(), 3, 'TOONSCAN')
            await new Promise(resolve => setTimeout(resolve, 20))
            self.FW.bapi.query('/profile/wow/character/zuljin/' + member.character.name.toLowerCase() + '?namespace=profile-us&locale=en_US').then(async (toonData) => {
                await new Promise(resolve => setTimeout(resolve, 20))
                self.FW.bapi.query('/profile/wow/character/zuljin/' + member.character.name.toLowerCase() + '/character-media?namespace=profile-us&locale=en_US').then(async (mediaAssets) => {
                    await new Promise(resolve => setTimeout(resolve, 20))
                    self.FW.bapi.query('/profile/wow/character/zuljin/' + member.character.name.toLowerCase() + '/equipment?namespace=profile-us&locale=en_US').then(async (equipment) => {
                        await new Promise(resolve => setTimeout(resolve, 20))
                        if(toonData.level >= 50 && toonData.equipped_item_level >= 110) {
                            try {
                                var raidio = await self.FW.modules.raiderio.GetMPlusProfile('zuljin', member.character.name.toLowerCase());
                                if(raidio) {
                                    if(raidio.mplusscore > 0) {
                                        var raideriosql = [toonData.id, raidio.mplusscore, raidio.mplus_realm_rank, JSON.stringify(raidio.best_runs), raidio.mplusscore, raidio.mplus_realm_rank, JSON.stringify(raidio.best_runs)];
                                        FW.sqlPool.query("INSERT INTO `raiderio` (`character_id`, `mplusscore`, `mplus_realm_rank`, `best_runs`) VALUES(?,?,?,?) ON DUPLICATE KEY UPDATE `mplusscore` = ?, `mplus_realm_rank` = ?, `best_runs` = ?", raideriosql, (e,r,f) => {
                                            if(e) {
                                                console.log(e);
                                            }
                                        });
                                    }
                                    
                                }
                            } catch (e) {
                                console.log(e);
                            }                            
                        }
                        toonData.guild_rank = member.rank
                        var toonProfile = {
                            id: toonData.id,
                            name: toonData.name,
                            gender: toonData.gender.name,
                            race: toonData.race.name,
                            character_class: toonData.character_class.name,
                            active_spec: toonData.active_spec.name,
                            level: toonData.level,
                            experience: toonData.experience,
                            achievement_points: toonData.achievement_points,
                            last_login_timestamp: toonData.last_login_timestamp,
                            average_item_level: toonData.average_item_level,
                            equipped_item_level: toonData.equipped_item_level,
                            guild_rank: member.rank,
                            media_avatar: mediaAssets.assets[0].value,
                            media_inset: mediaAssets.assets[1].value,
                            media_main: mediaAssets.assets[2].value,
                            media_raw: mediaAssets.assets[3].value
                        }
                        var equipped = equipment.equipped_items;
                        var totalItemLevel = 0;
                        var totalItems = 15;
                        var ignoreSlots = ['TABARD', 'SHIRT'];
                        for(var e in equipped) {
                            var item = equipped[e];
                            if(item.slot.type != 'TABARD' && item.slot.type != 'SHIRT') {
                                if(item.slot.type == 'OFF_HAND') {
                                    totalItems++;
                                }
                                totalItemLevel += item.level.value
                            }
                        }
                        toonProfile.equipped_item_level = parseFloat(totalItemLevel / totalItems).toFixed(3);
                        guildMembers.push(toonProfile);
                        var valuesArray = [];
                        for (var index in toonProfile) {
                            valuesArray.push(toonProfile[index]);
                        }
                        for (var index in toonProfile) {
                            if (index != 'id') {
                                valuesArray.push(toonProfile[index]);
                            }
                        }
                        FW.sqlPool.query("INSERT INTO `bot_guild_member` (`id`, `name`, `gender`, `race`, `character_class`, `active_spec`, `level`, `experience`, `achievement_points`, `last_login_timestamp`, `average_item_level`, `equipped_item_level`, `guild_rank`, `media_avatar`, `media_inset`, `media_main`, `media_raw`) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE `name` = ?,`gender` = ?,`race` = ?,`character_class` = ?,`active_spec` = ?,`level` = ?,`experience` = ?,`achievement_points` = ?, `last_login_timestamp` = ?,`average_item_level` = ?,`equipped_item_level` = ?,`guild_rank` = ?,`media_avatar` = ?,`media_inset` = ?,`media_main` = ?,`media_raw` = ?", valuesArray, (error, results, fields) => {
                            if (error) {
                                console.log(error);
                            }
                        })
                        toonsProcessed++;
                    }).catch((e) => { toonsProcessed++; });
                }).catch((e) => { toonsProcessed++; });
            }).catch((e) => { toonsProcessed++; })
        }
        var processCheck = setInterval(() => {
            if (toonsProcessed >= result.members.length) {
                self.FW.events.emit('wowApi_guildToonsProcessed', self, guildMembers)
                clearInterval(processCheck);
                self.UpdateDiscordRanks(self)
            }
        }, 500)
    }
    fetchGuildUpdate(self) {
        self.GetGuildInfo().then((result) => self.FW.events.emit('wowApi_guildUpdate', self, result));
    }
    async GetGuildInfo() {
        let accessToken = await this.FW.bapi.getAccessToken();
        let data = await this.FW.bapi.query('/data/wow/guild/zuljin/logic-sold-separately/roster?namespace=profile-us&locale=en_US');
        return data;
    }
    async UpdateDiscordRanks(self) {
        self.FW.log('Updating Guild Ranks', 3, 'WOWAPI');
        var discordUsers = {}
        var getBestToonInfo = (async(w, v) => {
            return await new Promise((res, rej) => {
                self.FW.sqlPool.query("SELECT * FROM `bot_guild_member` WHERE " + w + " ORDER BY `guild_rank` ASC, `equipped_item_level` DESC LIMIT 0,1", v, (er, rr, ff) => {
                    if (!er && rr[0] != undefined) {
                        res(rr[0]);
                    } else if (er) {
                        res(false);
                        console.log(er)
                    }
                })
            })
        })
        self.FW.sqlPool.query("SELECT * FROM `bot_discord_links`", async(e, r, f) => {
            if (!e && r[0] != undefined) {
                for (var i in r) {
                    var row = r[i];
                    if (!discordUsers[row.discord_user]) {
                        discordUsers[row.discord_user.toString()] = []
                    }
                    discordUsers[row.discord_user].push(row.character_id)
                }
                for (var u in discordUsers) {
                    var where = ''
                    for (var c in discordUsers[u]) {
                        where = where + ' OR `id` = ?'
                    }
                    where = where.substring(4);
                    var toonInfo = await getBestToonInfo(where, discordUsers[u]);
                    var guildRank = toonInfo.guild_rank
                    var ranks = {
                        "0": "GM",
                        "1": "GM",
                        "2": "Officer",
                        "3": "Officer",
                        "4": "Raid Team",
                        "5": "Major",
                        "6": "Raid Intiate",
                        "7": "Member",
                        "8": "Member",
                        "9": "Newbie"
                    }

                    var announced = false;
                    let member = await self.FW.discord.myguild.members.fetch(u)
                    if (member) {
                        for (let rrr = guildRank; rrr <= 9; rrr++) {
                            if (!member.displayName.includes(toonInfo.name)) {
                                await member.setNickname(member.displayName + '(' + toonInfo.name + ')').catch((e) => {
                                    self.FW.log(`Unable to change name ${toonInfo.name}/${member.displayName}`, 2);
                                })
                            }
                            let role = await self.FW.discord.myguild.roles.cache.find(r => r.name === ranks[rrr]);
                            if (!await member.roles.cache.find(r => r.name === ranks[rrr])) {
                                await member.roles.add(role)
                                if (ranks[rrr] == ranks[guildRank]) {
                                    if (announced == false) {
                                        announced = true;
                                        await self.FW.discord.myguild.channels.cache.get(self.FW.discord.myguild.systemChannelID).send('<@!' + u + '> has been promoted to <@&' + role.id + '>');
                                    }
                                }
                            }
                        }
                    } else {

                    }
                }
            } else if (e) {
                console.log(e)
            }
        })
    }
    createToonsListEmbed(discord_id) {
        if (this.toonDB[discord_id]) {
            var ret = [];
            for (var i in this.toonDB[discord_id]) {
                var toon = this.toonDB[discord_id][i]
                ret.push({ name: toon.name, value: 'Level: ' + toon.level + ' ' + toon.gender + ' ' + toon.race + ' ' + toon.class });
            }
            return new this.FW.classes.Discord.MessageEmbed()
                .setColor('#0099ff')
                .setTitle('Zul\'Jin Character List (HORDE)')
                .setURL('https://logicguild.wtf')
                .setAuthor('LOGIC SOLD SEPARATELY')
                .setDescription('Auto-Generated Toon List')
                .addFields(ret)
                .setTimestamp()
                .setFooter('LSS WoW Bot');
        } else {
            return false;
        }
    }
    characterSpotLight(toonData, mainToonIndex) {
        let classNames = ['Death Knight', 'Druid', 'Hunter', 'Mage', 'Monk', 'Paladin', 'Priest', 'Rogue', 'Shaman', 'Warlock', 'Warrior', 'Demon Hunter']
        let classColors = ['#C41F3B', '#FF7D0A', '#ABD473', '#69CCF0', '#00FF96', '#F58CBA', '#FEFEFE', '#FFF569', '#0070DE', '#9482C9', '#C79C6E', '#A330C9'];
        return new this.FW.classes.Discord.MessageEmbed()
            .setColor(classColors[classNames.indexOf(toonData[mainToonIndex].character_class)])
            .setTitle(toonData[mainToonIndex].rawname)
            .setURL('https://logicguild.wtf')
            .setAuthor('LOGIC SOLD SEPARATELY')
            .setThumbnail(toonData[mainToonIndex].media_avatar)
            .setDescription(toonData[mainToonIndex].gender + ' ' + toonData[mainToonIndex].race + ' ' + toonData[mainToonIndex].active_spec + ' ' + toonData[mainToonIndex].character_class)
            .setImage(toonData[mainToonIndex].media_main)
            .setTimestamp()
            .addFields({ name: 'Item Level', value: toonData[mainToonIndex].equipped_item_level })
            .setFooter('LSS WoW Bot');
    }
    accountCharacters(ret, player) {
        return new this.FW.classes.Discord.MessageEmbed()
            .setColor('#0099ff')
            .setTitle('Guild Character List for ' + player)
            .setURL('https://logicguild.wtf')
            .setAuthor('LOGIC SOLD SEPARATELY')
            .setDescription('Auto-Generated Toon List')
            .addFields(ret)
            .setTimestamp()
            .setFooter('LSS WoW Bot');
    }
}
module.exports = wowApi;