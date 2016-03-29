#!/usr/bin/env node

'use strict';

var EventEmitter = require('events').EventEmitter;
var webSocket = require('./web-socket-node');
var inherits = require('util').inherits;

inherits(SignalClient, EventEmitter);

/**
 * A client for talking to the signal server.
 * @param {string} nick
 * @constructor
 */
function SignalClient(nick) {
    var signalClient = this;
    this.webSocket = webSocket;

    webSocket.on('open', function () {
        webSocket.send(JSON.stringify({announceNick: nick}));
    });

    webSocket.on('message', function (message) {
        // var parsed = JSON.parse(message);
        //  console.log('message', message);
        var parsed = message;
        if (typeof message === 'string') {
            try {
                parsed = JSON.parse(message);
            } catch (ex) {
                console.error('no worries', ex);
            }
        }
        if (typeof parsed == 'object' && nick === parsed.recipient) {
            EventEmitter.prototype.emit.call(signalClient, nick, parsed.message);
        } else {
            console.error('somtehing wrong with message', message);
        }
    });
}

/**
 * Send a signal to the signal server to perform a WebRTC handshake
 * @param {string} recipient
 * @param {string} message
 */
SignalClient.prototype.emit = function (recipient, message) {
    // console.log('send to server', recipient, message);
    webSocket.send(JSON.stringify({recipient: recipient, message: message}));
};

module.exports = SignalClient;
