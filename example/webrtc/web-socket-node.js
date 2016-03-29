#!/usr/bin/env node

'use strict';

var EventEmitter = require('events').EventEmitter;
var emitter = new EventEmitter();
var WebSocket = require('ws');
var socket = new WebSocket('ws://localhost:8080');

/**
 * Handle socket errors
 * @param {object} error
 * @param {function} callback
 */
socket.on('error', function (error) {
    console.log('onerror', error);
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

module.exports = emitter;
