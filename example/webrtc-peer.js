#!/usr/bin/env node

'use strict';

// var Performance = require('./../lib/performance');
// Performance.startMonitoring();

var defaultNickname = "anonymous";
var nickname = process.browser ? window.location.hash.substr(1) || defaultNickname : "mars";
var connectToNicknames = [
    "jupiter",
    "minerva",
    "pomona",
    "portunes",
    "vulcan",
    "volturnus",
    "saturn",
    "mercury",
    "genius",
    "apollo",
    "sol",
    "luna",
    "flora",
    "furrina",
    "palatua",
    "venus",
    "neptune",
    "juno",
    "mars",
    "bellona",
    "janus",
    "vesta",
    "quirinus",
    "carmentis",
    "ceres",
    "falacer"
];
var value = ('{"avatar": {"url": "https://s3.amazonaws.com/kd4/fredwilson1"}, "bio": "I am a VC", "bitcoin": {"address": "1Fbi3WDPEK6FxKppCXReCPFTgr9KhWhNB7"}, "cover": {"url": "https://s3.amazonaws.com/dx3/fredwilson"}, "facebook": {"proof": {"url": "https://facebook.com/fred.wilson.963871/posts/10100401430876108"}, "username": "fred.wilson.963871"}, "graph": {"url": "https://s3.amazonaws.com/grph/fredwilson"}, "location": {"formatted": "New York City"}, "name": {"formatted": "Fred Wilson"}, "twitter": {"proof": {"url": "https://twitter.com/fredwilson/status/533040726146162689"}, "username": "fredwilson"}, "v": "0.2", "website": "http://avc.com"}')
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

webSocket.on('open', function () {

    async.each(connectToNicknames, function (nick, done) {
        if (nickname == nick) {
            return;
        }
        connectWebRTC(nick);
    });

    function connectWebRTC(peerId) {
        console.log('try to connect with', peerId);
        webrtcDHT.connect({nick: peerId}, function () {
            console.log(nickname + ' connected');
        });
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
