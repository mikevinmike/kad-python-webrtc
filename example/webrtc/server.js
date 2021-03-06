#!/usr/bin/env node

'use strict';

var http = require('http');
var path = require('path');
var fs = require('fs');
var EventEmitter = require('events').EventEmitter;
var signaller = new EventEmitter();
var WebSocketServer = require('ws').Server;
var port = 9089;
var server = require('http').createServer().listen(port);

createWebSocketServer();

server.on('request', function (req, res) {
    var filePath = __dirname + '/../..' + req.url;
    fs.readFile(filePath, function (err, file) {
        if (err) {
            var message = 'invalid file: ' + filePath;
            console.log(message);
            res.statusCode = 404;
            return res.end(message);
        }
        var extension = path.extname(filePath).substring(1);
        console.log('serving', filePath);
        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/' + extension);
        res.setHeader('Content-Length', file.length);
        res.end(file);
    });
});

console.log('listening on port', port);


function createWebSocketServer() {

    var wss = new WebSocketServer({server: server});

    wss.on('connection', function (connection) {

        console.log('WebSocketServer connection');

        connection.on('message', function (data) {

            var parsed = JSON.parse(data);

            if (parsed.recipient && parsed.message) {
                return signaller.emit(parsed.recipient, parsed);
            }

            signaller.on(parsed.announceNick, function (message) {
                var json = JSON.stringify(message);
                connection.send(json);
            });

            connection.on('close', function () {
                signaller.removeAllListeners(parsed.announceNick);
            });
        });
    });
}
