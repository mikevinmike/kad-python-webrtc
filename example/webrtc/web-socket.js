#!/usr/bin/env node

'use strict';

var EventEmitter = require('events').EventEmitter;
var emitter = new EventEmitter();
var serverUrl = 'ws://127.0.0.1:9089';
var socket = createSocket();

module.exports = emitter;


function createSocket() {
    var socket;
    if (process.browser) { // use native API (browser) or Node Module (node.js)
        socket = new WebSocket(serverUrl);
    } else {
        var serverWebSocket = require('ws');
        socket = new serverWebSocket(serverUrl);
    }

    registerSocketFunctions(socket);
    registerEvents(socket);

    return socket;
}

function registerSocketFunctions(socket) {

    if (socket.on === undefined) {
        socket.on = function (eventName, callback) {
            var existingCallback = socket['on' + eventName];
            socket['on' + eventName] = function () {
                if (typeof existingCallback === 'function') {
                    existingCallback.apply(socket, arguments);
                }
                callback.apply(socket, arguments);
            }
        }
    }

}

function registerEvents(socket) {
    /**
     * Handle socket errors
     * @param {object} error
     * @param {function} callback
     */
    socket.on('error', function (error) {
        console.error('onerror', error);
    });

    /**
     * Handle socket close
     */
    socket.on('close', function () {
        console.log('onclose');
    });

    /**
     * Handle socket open and propagate the event
     */
    socket.on('open', function () {
        emitter.emit('open');
    });

    /**
     * Handle socket message and propagate the event
     */
    socket.on('message', function (message) {
        emitter.emit('message', message);
    });

    /**
     * Send the message over the socket
     * @param {string} message
     */
    emitter.send = function (message) {
        socket.send(message);
    };
}