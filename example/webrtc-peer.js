#!/usr/bin/env node

'use strict';

var Performance = require('./../lib/performance');

var defaultNickname = "anonymous";
var nickname = process.browser ? window.location.hash.substr(1) || defaultNickname : "hercules";
var connectToNicknames = [
    "venus",
    "jupiter",
    "hercules"
];
var value = JSON.stringify('buffalo sabres are great');
var key = '1a587366368aaf8477d5ddcea2557dcbcc67073e';

var Hash = require('bitcore-lib').crypto.Hash;
var kademlia = require('kad');
var async = require('async');
var WebRTC = require('kad-webrtc');
var wrtc = require('wrtc');
var SignalClient = require('./webrtc/signal-client');
var signalClient = new SignalClient(nickname);
var webSocket = signalClient.webSocket;
var storage;

if (process.browser) { // use LocalStorage for browser and MemStore for node.js
    wrtc = undefined; // asssure wrtc is undefined when in browser
    storage = new kademlia.storage.LocalStorage('webrtc-peer:' + nickname);
} else {
    storage = new kademlia.storage.MemStore();
}

console.log('use nickname', nickname);

var webrtcDHT = new kademlia.Node({
    transport: WebRTC(WebRTC.Contact({nick: nickname}), {
        wrtc: wrtc,
        signaller: signalClient // see examples
    }),
    storage: storage
});

Performance.addNodeToPerformance(webrtcDHT);

webSocket.on('open', function () {

    async.each(connectToNicknames, function (nickname, done) {
        connectWebRTC(nickname);
    });

    setTimeout(function () {
        var hashKey = getFullHashFromHash(key);
        // webrtcDHT.put(hashKey, value, logPut);
        setInterval(function () {
            webrtcDHT.get(hashKey, logGet);
        }, 10000);

    }, 10000);

    function connectWebRTC(peerId) {
        console.log('try to connect with', peerId);
        webrtcDHT.connect({nick: peerId}, logConnect);
    }

    function logConnect() {
        console.log('connect--------------', arguments);
    }

    function logGet() {
        console.log('get------------------', arguments);
    }

    function logPut() {
        console.log('put------------------', arguments);
    }
});


function getHash(value) {
    var hash_sha256ripemd160 = Hash.sha256ripemd160(new Buffer(value)).toString('hex');
    return getFullHashFromHash(hash_sha256ripemd160);
}

function getFullHashFromHash(hash) {
    var hash_sha1_sha256ripemd160 = Hash.sha1(new Buffer(hash)).toString('hex');
    return hash_sha1_sha256ripemd160;
}


var performance = require('./../lib/performance');
performance.addNodeToPerformance(webrtcDHT);