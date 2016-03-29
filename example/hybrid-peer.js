#!/usr/bin/env node

'use strict';

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
var value = JSON.stringify({'another': 'test4'});

var kad = require('kad');
var dns = require('dns');
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

webSocket.on('open', function () {
    console.log('use nickname', nickname);

    var webrtcDHT = new kad.Node({
        transport: multiPythonWebrtcTransport.interfaces.WebRTC,
        storage: sharedStorage,
        router: router
    });

    for (var index in connectToNicknames) {
        connectWebRTC(connectToNicknames[index]);
    }

    function connectWebRTC(nickname) {
        webrtcDHT.connect({nick: nickname}, function () {
            console.log(nickname + ' connected');
            setTimeout(function () {
                var hashKey = getHash(value);
                webrtcDHT.put(hashKey, value, function () {
                    console.log('after store', arguments);
                    setTimeout(function () {
                        pythonDHT.get(hashKey, function () {
                            console.log('after get', arguments)
                        })
                    }, 5000)

                });

            }, 10000)

        });
    }
});


for (var index in DEFAULT_DHT_SERVERS) {
    connectPythonRpc(DEFAULT_DHT_SERVERS[index]);
}

function connectPythonRpc(seed) {
    console.log('attempt to connect', seed);
    if (!isIP(seed.address)) {
        dns.lookup(seed.address, function (err, ip) {
            seed.address = ip;
            connectPythonRpc(seed);
        });
        return;
    }
    pythonDHT.connect(seed, function (err) {
        console.log('seed connect', seed, err);

        setTimeout(function () {
            console.log('lookup....................................');
            var hashKey = getHash(value);
            console.log('hashKey', hashKey);
            pythonDHT.put(hashKey, value, function () {
                console.log('after store', arguments);
                pythonDHT.get(hashKey, function () {
                    console.log('after get', arguments)
                })
            });
        }, 2000);
    });
}

function Seed(address, port) {
    this.address = address;
    this.port = port;
}

function getHash(value) {
    var hash_sha256ripemd160 = Hash.sha256ripemd160(new Buffer(value)).toString('hex');
    var hash_sha1_sha256ripemd160 = Hash.sha1(new Buffer(hash_sha256ripemd160)).toString('hex');
    return hash_sha1_sha256ripemd160;
}
