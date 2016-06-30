#!/usr/bin/env node

'use strict';

var assert = require('assert');
var inherits = require('util').inherits;
var UDPTransport = require('kad').transports.UDP;
var kad = require('kad');
var Logger = require('kad').Logger;
var WebRTC = require('kad-webrtc');
var logger = {
    udp: Logger(3, 'kad:python-rpc-udp'),
    webrtc: Logger(3, 'kad:kad-rpc-webrtc')
}
var _log;
var pythonRpcAdapter = require('./python-rpc-adapter')({logger: logger.udp});
var webrtcRpcAdapter = require('./webrtc-rpc-adapter')({logger: logger.webrtc});
var necessaryTransports = ['udp', 'webrtc'];
var possibleTransports = ['udp', 'webrtc'];
var transportInterfaces = {};
var nodeManager = require('./node-manager')();
/**
 * Transport adapter that sends and receives message over UDP
 * @constructor
 * @extends {RPC}
 * @param {Contact} contact - Your node's {@link Contact} instance
 */
function UDPTransportPythonRpcWithWebrtc(contacts, options) {
    if (!(this instanceof UDPTransportPythonRpcWithWebrtc)) {
        return new UDPTransportPythonRpcWithWebrtc(contacts, options);
    }

    var self = this;
    self.interfaces = transportInterfaces;

    assert(typeof options === 'object', 'Invalid options were supplied');
    for (var index in necessaryTransports) {
        var necessaryTransport = necessaryTransports[index];
        assert(typeof options[necessaryTransport] === 'object', 'Invalid option \"' + necessaryTransport + '\" were applied');
    }
    for (var key in options) {
        assert(possibleTransports.indexOf(key) !== -1, 'Invalid sub options were applied');
        assert(typeof options[key] === 'object', 'Invalid sub options were applied');
    }

    _log = options.logger || logger.udp;
    options.udp.logger = options.udp.logger || logger.udp;
    UDPTransport.call(self, contacts.udp, options.udp);
    transportInterfaces.UDP = UDPTransport.prototype;

    options.webrtc.logger = options.webrtc.logger || logger.webrtc;
    transportInterfaces.WebRTC = new WebRTC(contacts.webrtc, options.webrtc);
    _replaceTransportMethods(transportInterfaces.WebRTC);


    function _replaceTransportMethods(interfaceInstance) {
        // make methods private through adding double underscore to name (xyz ==> __xyz)
        interfaceInstance.__receive = interfaceInstance.receive;
        interfaceInstance.receive = UDPTransportPythonRpcWithWebrtc.prototype.receive.bind(self);
        interfaceInstance.___send = interfaceInstance._send;
        interfaceInstance._send = UDPTransportPythonRpcWithWebrtc.prototype._send.bind(self);
        interfaceInstance.__send = interfaceInstance.send;
        interfaceInstance.send = UDPTransportPythonRpcWithWebrtc.prototype.send.bind(self);
    }
}

inherits(UDPTransportPythonRpcWithWebrtc, UDPTransport);

UDPTransportPythonRpcWithWebrtc.prototype._createContact = function (contactInfo) {
    if (contactInfo.address && contactInfo.port) {
        return transportInterfaces.UDP._createContact.apply(this, arguments)
    }
    if (contactInfo.nick) {
        return transportInterfaces.WebRTC._createContact.apply(transportInterfaces.WebRTC, arguments)
    }
};

UDPTransportPythonRpcWithWebrtc.prototype.send = function (contact, message, callback) {
    if (contact instanceof kad.contacts.AddressPortContact) {
        return transportInterfaces.UDP.send.apply(this, arguments)
    }
    if (contact instanceof WebRTC.Contact) {
        return transportInterfaces.WebRTC.__send.apply(transportInterfaces.WebRTC, arguments)
    }
}


UDPTransportPythonRpcWithWebrtc.prototype.receive = function (buffer, sender) {

    var self = this;

    try {
        if (pythonRpcAdapter.isPythonRpc(buffer) && !webrtcRpcAdapter.isWebrtcContact(sender)) {
            _log.debug('received python RPC');
            _receivePythonRpc.apply(self, arguments);
        } else if (webrtcRpcAdapter.isWebrtcContact(sender)) {
            _log.debug('received webrtc RPC', buffer.toString(), sender);
            _receiveWebrtcRpc.apply(self, arguments);
        }
    } catch (ex) {
        _log.error(ex);
    }

    function _receivePythonRpc(buffer, sender) {
        var messageData = pythonRpcAdapter.pythonRpcToJsonRpc(buffer, sender);
        var nodeID = extractNodeIDOfMessageData(messageData);
        nodeManager.addToPythonRpcNodeList(nodeID);

        var bufferedMessageData = new Buffer(JSON.stringify(messageData));
        var argumentsCopy = Array.prototype.slice.call(arguments);
        insertIntoArrayInsteadOf(argumentsCopy, buffer, bufferedMessageData);

        transportInterfaces.UDP.receive.apply(self, argumentsCopy);
    }

    function _receiveWebrtcRpc() {
        var nodeID = extractNodeIDOfMessageData(JSON.parse(buffer.toString()));
        nodeManager.addToWebrtcNodeList(nodeID);

        transportInterfaces.WebRTC.__receive.apply(transportInterfaces.WebRTC, arguments);
    }

};

/**
 * Send a RPC to the given contact (encode with msgpack before sending)
 * @private
 * @param {Buffer} data
 * @param {Contact} contact
 */
UDPTransportPythonRpcWithWebrtc.prototype._send = function (data, contact) {

    var self = this;
    var nodeID = contact.nodeID;

    if (contact instanceof kad.contacts.AddressPortContact || nodeManager.isInPythonRpcNodeList(nodeID)) {
        _log.debug('send python RPC');
        _sendPythonRpc.apply(self, arguments);
    } else if (contact instanceof WebRTC.Contact || nodeManager.isInWebrtcNodeList(nodeID)) {
        _log.debug('send webrtc');
        _sendWebrtcRpc.apply(self, arguments);
    }

    function _sendPythonRpc(data, contact) {
        var pythonRpcData = pythonRpcAdapter.jsonRpcToPythonRpc.apply(pythonRpcAdapter, arguments);
        var argumentsCopy = Array.prototype.slice.call(arguments);
        insertIntoArrayInsteadOf(argumentsCopy, data, pythonRpcData);

        transportInterfaces.UDP._send.apply(self, argumentsCopy);
    }

    function _sendWebrtcRpc(data, contact) {
        var webrtcData = webrtcRpcAdapter.jsonRpcToWebrtcRpc(data, transportInterfaces.WebRTC._contact);
        var argumentsCopy = Array.prototype.slice.call(arguments);
        insertIntoArrayInsteadOf(argumentsCopy, data, webrtcData);

        transportInterfaces.WebRTC.___send.apply(transportInterfaces.WebRTC, argumentsCopy);
    }

};

function insertIntoArrayInsteadOf(array, parameter, replacement) {
    for (var index in array) {
        if (array[index] === parameter) {
            array[index] = replacement;
        }
    }
}

function extractNodeIDOfMessageData(messageData) {
    if (messageData.params) {
        return messageData.params.contact.nodeID;
    }
    if (messageData.result) {
        return messageData.result.contact.nodeID;
    }
}

module.exports = UDPTransportPythonRpcWithWebrtc;