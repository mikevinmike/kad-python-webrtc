#!/usr/bin/env node

'use strict';


var kad = require('kad');
var dns = require('dns');
var isIP = require('net').isIP;
var dgram = require('dgram');
var Hash = require('bitcore-lib').crypto.Hash;
var UDPPythonRpc = require('..').UDPPythonRpc;


var DHT_UDP_PORT = 6265;  // blockstored defaults to port 6264
var DEFAULT_DHT_SERVERS = [
    new Seed('router.bittorrent.com', 6881),
    new Seed('dht.onename.com', DHT_UDP_PORT),
    new Seed('dht.halfmoonlabs.com', DHT_UDP_PORT),
    new Seed('127.0.0.1', DHT_UDP_PORT),
    new Seed('127.0.0.1', DHT_UDP_PORT + 100),
    new Seed('127.0.0.1', DHT_UDP_PORT + 200)
];

function Seed(address, port) {
    this.address = address;
    this.port = port;
}
// var seed = DEFAULT_DHT_SERVERS[0];

var dht = new kad.Node({
    transport: UDPPythonRpc(kad.contacts.AddressPortContact({
        address: '127.0.0.1',
        port: DHT_UDP_PORT + 200
    })),
    storage: kad.storage.MemStore()
});
var value = JSON.stringify('buffalo sabres are great');

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
            var hashkey = getHash(value);
            console.log('hashkey', hashkey);
            // dht.put(hashkey, value, function() {
            //     console.log('after store', arguments);
            //     setTimeout(function () {

            dht.get(hashkey, function () {
                console.log('after get', arguments)
            })

            // },5000)
            // });
        }, 5000);
    });
}

function getHash(value) {
    var hash_sha256ripemd160 = Hash.sha256ripemd160(new Buffer(value)).toString('hex');
    var hash_sha1_sha256ripemd160 = Hash.sha1(new Buffer(hash_sha256ripemd160)).toString('hex');
    return hash_sha1_sha256ripemd160;
}

connect(DEFAULT_DHT_SERVERS[4]);
