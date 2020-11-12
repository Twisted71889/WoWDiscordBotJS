class register {
    constructor(FW) {
        this.FW = FW;
        this.FW.events.on('msg', this.messageHandler);
        this.ProcessListiners()
    }
    ProcessListiners() {
        var self = this
        self.FW.webapp.core.use(self.FW.classes.express.static('/home/lss/discordbot/static'))
        self.FW.webapp.core.get('/', (req, res) => {

            res.status(200).send(`...`);
        });
        self.FW.webapp.core.get('/auth/source/discord/:discord_id', (req, res) => {
            req.session.discord_id = req.params.discord_id
            res.redirect('/link');
        })
        self.FW.webapp.core.get('/link', (req, res) => {
            res.sendFile('/home/lss/discordbot/static/bnet_login_prompt.html')
        });
        self.FW.webapp.core.get('/linksuccess', (req, res) => {
            res.sendFile('/home/lss/discordbot/static/bnet_login_success.html')
        })
        self.FW.webapp.core.get('/auth/bnet/redirect', self.FW.webapp.passport.authenticate('bnet'))
        self.FW.webapp.core.get('/api/v1/guild_stats', (req, res) => {
            var responseObject = {
                num_members: self.FW.discord.WoWGuildMembers.length
            }
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.status(200).send(JSON.stringify(responseObject));
        });
        self.FW.webapp.core.get('/auth/bnet/callback',
            self.FW.webapp.passport.authenticate('bnet', { failureRedirect: '/auth/bnet/failed' }),
            function(req, res) {
                req.session.token = req.user.token
                res.redirect('/auth/bnet/success');
            }
        );
        self.FW.webapp.core.get('/auth/bnet/success', (req, res) => {
            if (req.session.token) {
                var discord_id = req.session.discord_id
                var options = {
                    hostname: 'us.api.blizzard.com',
                    port: 443,
                    path: '/profile/user/wow?namespace=profile-us&locale=en_US&access_token=' + req.session.token,
                    method: 'GET'
                }
                var req = self.FW.classes.https.request(options, res => {
                    var response = '';
                    res.on('data', d => {
                        response += d;
                    });
                    res.on('end', async() => {
                        try {
                            //console.log(response);
                            var bnetProfile = JSON.parse(response);
                            var toonSlugs = []
                            var realmToons = []
                            for (var account in bnetProfile.wow_accounts) {
                                var thisAccount = bnetProfile.wow_accounts[account];
                                for (var toon in thisAccount.characters) {
                                    var t = thisAccount.characters[toon];
                                    if (t.realm.slug == 'zuljin') {
                                        realmToons.push(t)
                                    }
                                }
                            }
                            var newToonStore = [];
                            for (var index in realmToons) {
                                var toon = realmToons[index];

                                var newToonObject = {
                                    id: toon.id,
                                    name: toon.name,
                                    class: toon.playable_class.name,
                                    race: toon.playable_race.name,
                                    gender: toon.gender.name,
                                    faction: toon.faction.name,
                                    level: toon.level
                                }
                                newToonStore.push(newToonObject);
                            }
                            self.FW.modules.wowApi.toonDB[discord_id] = newToonStore;
                            try {
                                self.FW.discord.users.fetch(discord_id).then((user) => user.send(self.FW.modules.wowApi.createToonsListEmbed(discord_id)))
                            } catch (e) {
                                self.FW.log(discord_id, 2)
                                console.log(e);
                            }
                            self.FW.sqlPool.query("DELETE FROM `bot_discord_links` WHERE `discord_user` = ?", [discord_id], async(e, r, f) => {
                                for (var index in newToonStore) {
                                    var insertLink = new Promise((res, rej) => {
                                        self.FW.sqlPool.query("SELECT * FROM `bot_guild_member` WHERE `id` = ? LIMIT 0,1", [newToonStore[index].id], (e, r, f) => {
                                            if (!e && r[0] != undefined) {
                                                self.FW.sqlPool.query("INSERT INTO `bot_discord_links` VALUES(?,?)", [newToonStore[index].id, discord_id], (e, r, f) => {
                                                    res();
                                                })
                                            } else {
                                                res();
                                            }
                                        })
                                    });
                                    await insertLink;
                                }
                            });


                            self.FW.discord.myguild.channels.cache.get(self.FW.discord.myguild.systemChannelID).send("<@" + discord_id + "> has registered.")
                            self.FW.discord.myguild.channels.cache.get(self.FW.discord.myguild.systemChannelID).send('!listtoons <@!' + discord_id + '> main').then(msg => {
                                    msg.delete({ timeout: 2000 })
                                })
                                //console.log(bnetProfile);
                        } catch (e) {
                            console.log(e);
                        }

                    })
                })
                req.on('error', error => {
                    console.error(error)
                })

                req.end()
                res.redirect('/linksuccess');
            } else {
                res.redirect('/auth/bnet/failed');
            }

        })
    }
    messageHandler(FW, obj, user, msg) {
        if (msg.substring(0, 9) == FW.config.commandPrefix + "register") {
            FW.discord.users.cache.get(user.id).send("Visit http://bot.logicguild.wtf/auth/source/discord/" + user.id + " to link your battle.net account.")
        }
    }
}
module.exports = register;