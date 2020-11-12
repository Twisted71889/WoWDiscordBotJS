var FW = {};

FW.classes = {};
FW.classes.chalk = require('chalk');
FW.classes.events = require('events');
FW.classes.Discord = require('discord.js')
FW.classes.fs = require('fs');

FW.classes.BnetStrategy = require('passport-bnet').Strategy;
FW.classes.express = require('express');

FW.l = {}
FW.l.g = FW.classes.chalk.green;
FW.l.r = FW.classes.chalk.red;
FW.l.y = FW.classes.chalk.yellow;
FW.l.c = FW.classes.chalk.cyan;
FW.l.w = FW.classes.chalk.white;
FW.l.bl = FW.classes.chalk.bold;
FW.log = ((msg, type = 1, prefix = '') => {
    if (type == 1) {
        console.log(FW.l.bl(FW.l.c('[LOG]   \t') + FW.l.w(`${msg}`)));
    } else if (type == 2) {
        console.log(FW.l.bl(FW.l.r('[ERROR]   \t') + FW.l.w(`${msg}`)));
    } else {
        console.log(FW.l.bl(FW.l.y(`[${prefix}]\t`) + FW.l.w(`${msg}`)));
    }
});
console.log(FW.classes.chalk.green('======================================================================'));
console.log(FW.classes.chalk.green('==================      ' + FW.classes.chalk.red('Twisted Discord Bot') + '    ======================='));
console.log(FW.classes.chalk.green('================ ' + FW.classes.chalk.red('Developed By James C. Alexander') + ' ====================='));
console.log(FW.classes.chalk.green('======================================================================'));
FW.config = require('./config.json');
FW.discord = new FW.classes.Discord.Client();
FW.events = new FW.classes.events.EventEmitter();

FW.webapp = {}
FW.webapp.core = FW.classes.express();
FW.webapp.cookieParser = require('cookie-parser');
FW.webapp.session = require('express-session');
FW.webapp.passport = require('passport');
FW.webapp.privateKey = FW.classes.fs.readFileSync('/etc/letsencrypt/live/bot.logicguild.wtf/privkey.pem').toString();
FW.webapp.certificate = FW.classes.fs.readFileSync('/etc/letsencrypt/live/bot.logicguild.wtf/cert.pem').toString();

FW.classes.https = require('https');


FW.mysql = require('mysql');
FW.sqlPool = FW.mysql.createPool({
    connectionLimit: 10,
    host: FW.config.mysql.host,
    user: FW.config.mysql.user,
    password: FW.config.mysql.pass,
    database: FW.config.mysql.db
});


FW.webapp.core.use(FW.webapp.cookieParser());
FW.webapp.core.use(FW.webapp.session({ secret: 'asdfasdFDASFwe13r1ADFSAF2f2', saveUninitialized: true, resave: true }));
FW.webapp.core.use(FW.webapp.passport.initialize());
FW.webapp.core.use(FW.webapp.passport.session());
FW.webapp.passport.use(
    new FW.classes.BnetStrategy({
        clientID: FW.config.bnetId,
        clientSecret: FW.config.bnetSecret,
        scope: 'wow.profile',
        callbackURL: FW.config.url_root + FW.config.bnet_callback_url,
        region: "us"
    }, function(accessToken, refreshToken, profile, done) {
        return done(null, profile);
    })
);
FW.webapp.passport.serializeUser(function(user, done) {
    done(null, user.id);
});
FW.webapp.passport.deserializeUser(function(obj, done) {
    done(null, obj);
});

FW.discord.on('ready', async() => {
    FW.log(`Logged in as ${FW.discord.user.tag}!`, 3, 'DISCORD');
    FW.log(`I am a member of ${FW.discord.guilds.cache.size} guilds.`, 3, 'DISCORD')
    FW.discord.guilds.cache.map((guild) => {
        if (guild.available) {
            if (guild.systemChannelID !== null) {
                FW.discord.myguild = guild;
                FW.events.emit('discordReady', FW);
                FW.log('Bot Connected', 3, 'DISCORD')
            }
        }
    });
});
FW.discord.on('message', msg => {
    let user = { id: msg.author.id, name: msg.author.username, mention: `<@${msg.author.id}>` };
    let message = msg.content;
    FW.events.emit('msg', FW, msg, user, message);
});
FW.modules = {}
FW.servers = {}
LoadModules();
FW.servers.http = FW.classes.express();
FW.servers.https = FW.classes.https.createServer({ key: FW.webapp.privateKey, cert: FW.webapp.certificate }, FW.webapp.core);
FW.servers.http.get('*', function(req, res) {
    res.redirect('https://' + req.headers.host + req.url);
})
FW.servers.http.listen(FW.config.http_port, FW.config.bind_address, () => {
    FW.log(`HTTP Server running at port ${FW.config.http_port}`);
});
FW.servers.https.listen(FW.config.ssl_port, FW.config.bind_address, () => {
    FW.log(`HTTPS Server running at port ${FW.config.ssl_port}`);
});
FW.discord.login(FW.config.botToken);



function LoadModules() {
    FW.classes.fs.readdir('/home/lss/discordbot/modules', function(err, files) {
        files.sort();
        for (let index in files) {
            let fileName = files[index];
            if (fileName.substr(fileName.length - 3, 3) === ".js") {
                fileName = fileName.replace('.js', '');
                try {
                    FW.modules[fileName] = new(require(`./modules/${fileName}`))(FW);
                    FW.log(`${fileName} loaded.`, 3, 'MODULE')
                } catch (e) {
                    FW.log(`Failed to load ${fileName}`, 2)
                    console.log(e);
                }
            }
        }
    });
}