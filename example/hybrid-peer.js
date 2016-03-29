#!/usr/bin/env node

'use strict';

var kad = require('kad');
var dns = require('dns');
var isIP = require('net').isIP;
var dgram = require('dgram');
var Hash = require('bitcore-lib').crypto.Hash;
var UDPPythonRpcWithWebrtc = require('..').UDPPythonRpcWithWebrtc;

var nickName = 'hercules';
var wrtc = require('wrtc');
var WebRTC = require('kad-webrtc');
var SignalClient = require('./webrtc/signal-client-node');
var signalClient = new SignalClient(nickName);

var DHT_UDP_PORT = 6265;  // blockstored defaults to port 6264
var DEFAULT_DHT_SERVERS = [
    new Seed('router.bittorrent.com', 6881),
    new Seed('dht.onename.com', DHT_UDP_PORT),
    new Seed('dht.halfmoonlabs.com', DHT_UDP_PORT),
    new Seed('127.0.0.1', DHT_UDP_PORT)
];

function Seed(address, port) {
    this.address = address;
    this.port = port;
}

var storage = kad.storage.MemStore();
var multiPythonWebrtcTransport = UDPPythonRpcWithWebrtc({
    udp: kad.contacts.AddressPortContact({
        address: '127.0.0.1',
        port: DHT_UDP_PORT + 100
    }),
    webrtc: WebRTC.Contact({
        nick: nickName
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

var dht = new kad.Node({
    transport: multiPythonWebrtcTransport,
    storage: storage,
    router: router
});
var dht2 = new kad.Node({
    transport: multiPythonWebrtcTransport.interfaces.WebRTC,
    storage: storage,
    router: router
});
dht2.connect({nick: 'venus'}, function () {
    console.log('venus connected');
    setTimeout(function () {
        dht2.put(hashkey, value, function () {
            console.log('after store', arguments);
            setTimeout(function () {
                dht.get(hashkey, function () {
                    console.log('after get', arguments)
                })
            }, 5000)

        });

    }, 10000)

});

var value = JSON.stringify({'another': 'test4'});
var hashkey = getHash(value);

function connect(seed) {
    console.log('attempt to connect', seed);
    if (!isIP(seed.address)) {
        dns.lookup(seed.address, function (err, ip) {
            seed.address = ip;
            connect(seed);
        });
        return;
    }
    dht.connect(seed, function (err) {
        console.log('seed connect', seed, err);

        setTimeout(function () {
            console.log('lookup....................................');
            console.log('hashkey', hashkey);
            dht.put(hashkey, value, function () {
                console.log('after store', arguments);
                dht.get(hashkey, function () {
                    console.log('after get', arguments)
                })
            });
        }, 2000);
    });
}

function getHash(value) {
    var hash_sha256ripemd160 = Hash.sha256ripemd160(new Buffer(value)).toString('hex');
    var hash_sha1_sha256ripemd160 = Hash.sha1(new Buffer(hash_sha256ripemd160)).toString('hex');
    return hash_sha1_sha256ripemd160;
}

// for (var index in DEFAULT_DHT_SERVERS) {
//     connect(DEFAULT_DHT_SERVERS[index]);
// }
connect(DEFAULT_DHT_SERVERS[3]);
