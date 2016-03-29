#!/usr/bin/env node

'use strict';

var EventEmitter = require('events').EventEmitter;
var webSocket = require('./web-socket');
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

    webSocket.on('message', process.browser ? _browserOnMessage : _nodeOnMessage);

    function _browserOnMessage(event) {
        var parsedMessage = JSON.parse(event.data);
        _onMessage(parsedMessage);
    }

    function _nodeOnMessage(message) {
        var parsedMessage = JSON.parse(message);
        _onMessage(parsedMessage);
    }

    function _onMessage(parsedMessage) {
        if (typeof parsedMessage == 'object' && nick === parsedMessage.recipient) {
            EventEmitter.prototype.emit.call(signalClient, nick, parsedMessage.message);
        } else {
            console.error('something wrong with message', message);
        }
    }
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
