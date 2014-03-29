var express = require('express');
var http = require('http');
var https = require('https');
var path = require('path');
var ws = require('websocket').server;
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
        port: {
            demand: true,
            alias: 'p',
            description: 'port'
        }
    }).boolean('allow_discovery').argv;

var runhttps = false;

if (opts.sslkey && opts.sslcert) {
    runhttps = true;
    opts['ssl'] = {};
    opts.ssl['key'] = fs.readFileSync(path.resolve(opts.sslkey));
    opts.ssl['cert'] = fs.readFileSync(path.resolve(opts.sslcert));
}


process.on('uncaughtException', function(e) {
    console.error('Error: ' + e);
});

var httpserv;

var app = express();
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

var wss = new ws({
    httpServer: httpserv
});

wss.on('request', function(request) {
    var term;
    var conn = request.accept('wetty', request.origin);
    console.log((new Date()) + ' Connection accepted.');
    conn.on('message', function(msg) {
        var data = JSON.parse(msg.utf8Data);
        if (!term) {
            if (process.getuid() == 0) {
                term = pty.spawn('/bin/login', [], {
                    name: 'xterm-256color',
                    cols: 80,
                    rows: 30
                });
            } else {
                term = pty.spawn('ssh', ['localhost'], {
                    name: 'xterm-256color',
                    cols: 80,
                    rows: 30
                });                
            }
            term.on('data', function(data) {
                conn.send(JSON.stringify({
                    data: data
                }));
            });
        }
        if (!data)
            return;
        if (data.rowcol) {
            term.resize(data.col, data.row);
        } else if (data.data) {
            term.write(data.data);
        }
    });
    conn.on('error', function() {
        term.end();
    });
    conn.on('close', function() {
        term.end();
    })
})
