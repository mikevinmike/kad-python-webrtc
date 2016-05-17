#!/usr/bin/env node

'use strict';

var Performance = require('./../lib/performance');

var nickname = 'hercules';
var connectToNicknames = [
    "venus",
    "jupiter"
];
var DHT_UDP_PORT = 6265;  // blockstored defaults to port 6264
var contactInfo = {
    address: '127.0.0.1',
    port: DHT_UDP_PORT + 100
};
var DEFAULT_DHT_SERVERS = [
    new Seed('router.bittorrent.com', 6881),
    new Seed('dht.onename.com', DHT_UDP_PORT),
    new Seed('dht.halfmoonlabs.com', DHT_UDP_PORT),
    new Seed('127.0.0.1', DHT_UDP_PORT)
];

var value = ('{"avatar": {"url": "https://s3.amazonaws.com/kd4/fredwilson1"}, "bio": "I am a VC", "bitcoin": {"address": "1Fbi3WDPEK6FxKppCXReCPFTgr9KhWhNB7"}, "cover": {"url": "https://s3.amazonaws.com/dx3/fredwilson"}, "facebook": {"proof": {"url": "https://facebook.com/fred.wilson.963871/posts/10100401430876108"}, "username": "fred.wilson.963871"}, "graph": {"url": "https://s3.amazonaws.com/grph/fredwilson"}, "location": {"formatted": "New York City"}, "name": {"formatted": "Fred Wilson"}, "twitter": {"proof": {"url": "https://twitter.com/fredwilson/status/533040726146162689"}, "username": "fredwilson"}, "v": "0.2", "website": "http://avc.com"}')
var key = '1a587366368aaf8477d5ddcea2557dcbcc67073e';// blockchain entry: fredwilson.id: '1a587366368aaf8477d5ddcea2557dcbcc67073e';

var kad = require('kad');
var dns = require('dns');
var async = require('async');
var isIP = require('net').isIP;
var dgram = require('dgram');
var Hash = require('bitcore-lib').crypto.Hash;
var UDPPythonRpcWithWebrtc = require('..').UDPPythonRpcWithWebrtc;
var wrtc = require('wrtc');
var WebRTC = require('kad-webrtc');
var SignalClient = require('./webrtc/signal-client');
var signalClient = new SignalClient(nickname);
var webSocket = signalClient.webSocket;


var sharedStorage = kad.storage.MemStore();
var multiPythonWebrtcTransport = UDPPythonRpcWithWebrtc({
    udp: kad.contacts.AddressPortContact(contactInfo),
    webrtc: WebRTC.Contact({
        nick: nickname
    }),
}, {
    udp: {},
    webrtc: {
        wrtc: wrtc,
        signaller: signalClient // see examples
    }
});
var router = new kad.Router({
    logger: new kad.Logger(4, 'kad:router'),
    transport: multiPythonWebrtcTransport
});

var pythonDHT = new kad.Node({
    transport: multiPythonWebrtcTransport,
    storage: sharedStorage,
    router: router
});
Performance.addNodeToPerformance(pythonDHT);

console.log('use nickname', nickname);

var webrtcDHT = new kad.Node({
    transport: multiPythonWebrtcTransport.interfaces.WebRTC,
    storage: sharedStorage,
    router: router
});
Performance.addNodeToPerformance(webrtcDHT);

webSocket.on('open', function () {

    async.each(connectToNicknames, function (nickname, done) {
        connectWebRTC(nickname);
    });


    function connectWebRTC(nickname) {
        webrtcDHT.connect({nick: nickname}, function () {
            console.log(nickname + ' connected');
            setTimeout(function () {
                var hashKey = getHash(value);
                // webrtcDHT.put(hashKey, value, function () {
                //     console.log('after store', arguments);
                //     setTimeout(function () {
                //         pythonDHT.get(hashKey, function () {
                //             console.log('after get', arguments)
                //         })
                //     }, 5000)
                //
                // });

            }, 10000)

        });
    }
});

async.each(DEFAULT_DHT_SERVERS, function (dhtServer, done) {
    connectPythonRpc(dhtServer);
})

function connectPythonRpc(seed) {
    console.log('attempt to connect', seed);
    if (!isIP(seed.address)) {
        dns.lookup(seed.address, function (err, ip) {
            if (err) {
                console.error('could not resolve dns of ' + seed.address, err);
                return;
            }
            seed.address = ip;
            connectPythonRpc(seed);
        });
        return;
    }
    pythonDHT.connect(seed, function (err) {
        console.log('seed connect', seed, err);

        // setTimeout(function() {
        //     var hashKey = getHash(value);
        //     pythonDHT.put(hashKey, value, function () {
        //         console.log('after store', arguments);
        //     });
        // }, 5000);
        setInterval(function () {
            console.log('lookup....................................');
            var hashKey = getFullHashFromHash(key);
            console.log('hashKey', hashKey);
            // pythonDHT.put(hashKey, value, function () {
            //     console.log('after store', arguments);
            pythonDHT.get(hashKey, function () {
                console.log('after get', arguments)
            })
            // });
        }, 30000);
    });
}

function Seed(address, port) {
    this.address = address;
    this.port = port;
}

function getHash(value) {
    // return value;
    var hash_sha256ripemd160 = Hash.sha256ripemd160(new Buffer(value)).toString('hex');
    // return hash_sha256ripemd160; // blockstack, but not working for DHT servers, just mirror.blockstack.org 6266
    return getFullHashFromHash(hash_sha256ripemd160);
}

function getFullHashFromHash(hash) {
    var hash_sha1_sha256ripemd160 = Hash.sha1(new Buffer(hash)).toString('hex');
    return hash_sha1_sha256ripemd160;
}
