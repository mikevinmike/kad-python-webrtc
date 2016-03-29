#!/usr/bin/env node

'use strict';

var inherits = require('util').inherits;
var UDPTransport = require('kad').transports.UDP;
var pythonRpcAdapter = require('./python-rpc-adapter')();

/**
 * Transport adapter that sends and receives message over UDP
 * @constructor
 * @extends {RPC}
 * @param {Contact} contact - Your node's {@link Contact} instance
 */
function UDPTransportPythonRpc(contact, options) {
    if (!(this instanceof UDPTransportPythonRpc)) {
        return new UDPTransportPythonRpc(contact, options);
    }

    UDPTransport.call(this, contact, options);
}

inherits(UDPTransportPythonRpc, UDPTransport);

UDPTransportPythonRpc.prototype.receive = function (buffer, sender) {

    var messageData = pythonRpcAdapter.pythonRpcToJsonRpc(buffer, sender);
    var bufferedMessageData = new Buffer(JSON.stringify(messageData));
    insertIntoArrayInsteadOf(arguments, buffer, bufferedMessageData);

    UDPTransport.prototype.receive.apply(this, arguments);
};

/**
 * Send a RPC to the given contact (encode with msgpack before sending)
 * @private
 * @param {Buffer} data
 * @param {Contact} contact
 */
UDPTransportPythonRpc.prototype._send = function (data, contact) {

    var pythonRpcData = pythonRpcAdapter.jsonRpcToPythonRpc(data, contact);
    insertIntoArrayInsteadOf(arguments, data, pythonRpcData);

    UDPTransport.prototype._send.apply(this, arguments);
};

function insertIntoArrayInsteadOf(array, parameter, replacement) {
    for (var index in array) {
        if (array[index] === parameter) {
            array[index] = replacement;
        }
    }
}

module.exports = UDPTransportPythonRpc;
