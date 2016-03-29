#!/usr/bin/env node

'use strict';

var defaultNickname = "anonymous";
var nickname = process.browser ? window.location.hash.substr(1) || defaultNickname : "venus";
var connectToNicknames = [
    "hercules",
    "jupiter"
];
var value = JSON.stringify('buffalo sabres are great');

var Hash = require('bitcore-lib').crypto.Hash;
var kademlia = require('kad');
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

webSocket.on('open', function () {
    console.log('use nickname', nickname);

    var webrtcDHT = new kademlia.Node({
        transport: WebRTC(WebRTC.Contact({nick: nickname}), {
            wrtc: wrtc,
            signaller: signalClient // see examples
        }),
        storage: storage
    });

    for (var index in connectToNicknames) {
        connectWebRTC(connectToNicknames[index]);
    }

    setTimeout(function () {
        var hashKey = getHash(value);
        webrtcDHT.put(hashKey, value, logPut);
        setTimeout(function () {
            webrtcDHT.get(hashKey, logGet);
        }, 10000);

    }, 10000);

    function connectWebRTC(peerId) {
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
    var hash_sha1_sha256ripemd160 = Hash.sha1(new Buffer(hash_sha256ripemd160)).toString('hex');
    return hash_sha1_sha256ripemd160;
}