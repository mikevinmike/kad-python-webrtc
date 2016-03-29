#!/usr/bin/env node

'use strict';


var nodeId = "venus";
var Hash = require('bitcore-lib').crypto.Hash;
var kademlia = require('kad');
var WebRTC = require('kad-webrtc');
var wrtc = require('wrtc');
var SignalClient = require('./webrtc/signal-client-node');
var signalClient = new SignalClient(nodeId);
var webSocket = signalClient.webSocket;

webSocket.on('open', function () {

    var node = new kademlia.Node({
        // ...
        transport: WebRTC(WebRTC.Contact({nick: nodeId}), {
            wrtc: wrtc,
            signaller: signalClient // see examples
        }),
        storage: new kademlia.storage.MemStore()
    });

    var connect = function (peerId) {
        node.connect({nick: peerId}, logConnect);
    }

    var get = function (key, callback) {
        node.get(key, logGet);
    }

    var put = function (key, value, callback) {
        node.put(key, value, logPut);
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

    connect('hercules');
    var value = JSON.stringify('buffalo sabres are great');
    var hashKey = getHash(value);
    console.log(value, hashKey);
    setTimeout(function () {
        put(hashKey, value);
        setTimeout(function () {
            get(hashKey);
        }, 10000);

    }, 10000);


});

function getHash(value) {
    var hash_sha256ripemd160 = Hash.sha256ripemd160(new Buffer(value)).toString('hex');
    var hash_sha1_sha256ripemd160 = Hash.sha1(new Buffer(hash_sha256ripemd160)).toString('hex');
    return hash_sha1_sha256ripemd160;
}