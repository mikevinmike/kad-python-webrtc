#!/usr/bin/env node

'use strict';

var Performance = require('./../lib/performance');

var DHT_UDP_PORT = 6265;  // blockstored defaults to port 6264
var contactInfo = {
    address: '127.0.0.1',
    port: DHT_UDP_PORT + 200
};
var DEFAULT_DHT_SERVERS = [
    new Seed('router.bittorrent.com', 6881),
    new Seed('dht.onename.com', DHT_UDP_PORT),
    new Seed('dht.halfmoonlabs.com', DHT_UDP_PORT),
    new Seed('127.0.0.1', DHT_UDP_PORT),
    new Seed('127.0.0.1', DHT_UDP_PORT + 100)
];
var value = JSON.stringify('buffalo sabres are great');

var kad = require('kad');
var dns = require('dns');
var async = require('async');
var isIP = require('net').isIP;
var dgram = require('dgram');
var Hash = require('bitcore-lib').crypto.Hash;
var UDPPythonRpc = require('..').UDPPythonRpc;


var pythonDHT = new kad.Node({
    transport: UDPPythonRpc(kad.contacts.AddressPortContact(contactInfo)),
    storage: kad.storage.MemStore()
});

Performance.addNodeToPerformance(pythonDHT);


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

        setTimeout(function () {
            console.log('lookup....................................');
            var hashKey = getHash(value);
            console.log('hashKey', hashKey);
            // pythonDHT.put(hashKey, value, function() {
            //     console.log('after store', arguments);
            //     setTimeout(function () {

            pythonDHT.get(hashKey, function () {
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

function Seed(address, port) {
    this.address = address;
    this.port = port;
}