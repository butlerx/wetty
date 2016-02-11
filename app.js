'use strict';

var express = require('express');
var http = require('http');
var https = require('https');
var path = require('path');
var server = require('socket.io');
var pty = require('pty.js');
var fs = require('fs');

var opts = require('optimist')
    .options({
        sslkey: {
            demand: false,
            description: 'path to SSL key'
        },
        sslcert: {
            demand: false,
            description: 'path to SSL certificate'
        },
        sshhost: {
            demand: false,
            description: 'ssh server host'
        },
        sshport: {
            demand: false,
            description: 'ssh server port'
        },
        sshuser: {
            demand: false,
            description: 'ssh user'
        },
        sshauth: {
            demand: false,
            description: 'defaults to "password", you can use "publickey,password" instead'
        },
        port: {
            demand: true,
            alias: 'p',
            description: 'wetty listen port'
        },
        whitelist: {
            demand: false,
            description: 'whitelist of username/hosts, you can connect to'
        }
    }).boolean('allow_discovery').argv;

var runhttps = false;
var sshport = 22;
var globalsshhost = 'localhost';
var sshhost = globalsshhost;
var sshauth = 'password';
var globalsshuser = '';
var whitelist = ['^.*@localhost$'];

if (opts.sshport) {
    sshport = opts.sshport;
}

if (opts.sshhost) {
    sshhost = opts.sshhost;
}

if (opts.sshauth) {
	sshauth = opts.sshauth;
}

if (opts.sshuser) {
    globalsshuser = opts.sshuser;
}

if (opts.sslkey && opts.sslcert) {
    runhttps = true;
    opts.ssl = {};
    opts.ssl.key = fs.readFileSync(path.resolve(opts.sslkey));
    opts.ssl.cert = fs.readFileSync(path.resolve(opts.sslcert));
}

if (opts.whitelist) {
    whitelist = opts.whitelist.split(',');
}

function checkWhitelist(target){
    for (var idx = 0; idx<whitelist.length; idx++) {
        if(target.match(whitelist[idx])) {
            return true;
        }
    }
    return false;
}

process.on('uncaughtException', function(e) {
    console.error('Error: ' + e);
});

var httpserv;

var app = express();
app.get('/wetty/ssh/:user', function(req, res) {
    res.sendfile(__dirname + '/public/wetty/index.html');
});
app.get('/wetty/ssh/:user/:host', function(req, res) {
    res.sendfile(__dirname + '/public/wetty/index.html');
});
app.use('/', express.static(path.join(__dirname, 'public')));

if (runhttps) {
    httpserv = https.createServer(opts.ssl, app).listen(opts.port, function() {
        console.log('https on port ' + opts.port);
    });
} else {
    httpserv = http.createServer(app).listen(opts.port, function() {
        console.log('http on port ' + opts.port);
    });
}

var io = server(httpserv,{path: '/wetty/socket.io'});
io.on('connection', function(socket){
    var sshuser = '';
    var request = socket.request;
    console.log((new Date()) + ' Connection accepted.');
    var match = request.headers.referer.match('/wetty/ssh/.+/.+$');
    if (match) {
        sshuser = match[0].split('/')[3] + '@';
        sshhost = match[0].split('/')[4];
        var target = sshuser+sshhost;
        if (!checkWhitelist(target)) {
            console.log('whitelist error');
            socket.emit('output', 'whitelist error');
            socket.disconnect();
            return;
        }
    } else {
        match = request.headers.referer.match('/wetty/ssh/.+$');
        if(match){
            sshuser = match[0].split('/')[3] + '@';
            sshhost = globalsshhost;
        }else{
            sshuser = globalsshuser + '@';
            sshhost = globalsshhost;
        }
    }

    var term;

    term = pty.spawn('ssh', [sshuser + sshhost, '-p', sshport, '-o', 'PreferredAuthentications=' + sshauth], {
        name: 'xterm-256color',
        cols: 80,
        rows: 30
    });

    console.log((new Date()) + " PID=" + term.pid + " STARTED on behalf of user=" + sshuser);
    term.on('data', function(data) {
        socket.emit('output', data);
    });
    term.on('exit', function(code) {
        console.log((new Date()) + " PID=" + term.pid + " ENDED with code "+code);
    });
    socket.on('resize', function(data) {
        term.resize(data.col, data.row);
    });
    socket.on('input', function(data) {
        term.write(data);
    });
    socket.on('disconnect', function() {
        term.end();
    });
});
