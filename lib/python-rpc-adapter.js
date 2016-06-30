#!/usr/bin/env node

'use strict';

var merge = require('merge');
var msgpack = require("msgpack-lite");
var Hash = require('bitcore-lib').crypto.Hash;
var AddressPortContact = require('kad').contacts.AddressPortContact;
var Logger = require('kad').Logger;
var TransmissionBroker = require('./transmission-broker');

var TYPES = {
    request: '\x00',
    response: '\x01'
};
var transmissionBroker = new TransmissionBroker({types: TYPES});


function PythonRpcAdapter(options) {
    if (!(this instanceof PythonRpcAdapter)) {
        return new PythonRpcAdapter(options);
    }

    var self = this;
    options = options || {};
    self._log = options.logger || new Logger(3);

    self.pythonRpcToJsonRpc = _pythonRpcToJsonRpc;
    self.jsonRpcToPythonRpc = _jsonRpcToPythonRpc;
    self.isPythonRpc = _isPythonRpc;
    self.validateItem = _validateItem;
    self.calculateHash = _calculateHash;

    function _pythonRpcToJsonRpc(buffer, sender) {
        var type = _typeFromIntToHex(buffer.slice(0, 1));
        var msgId = buffer.slice(1, 21).toString('hex');
        var data = msgpack.decode(buffer.slice(21));
        var transmission = transmissionBroker.getTransmission(msgId);

        var method = undefined;
        var params = undefined;
        var result = undefined;

        if (type === TYPES.request) {
            method = _buildJsonRpcRequestMethod(data);
            params = _buildJsonRpcRequestParams(data, method, sender);
        } else if (type === TYPES.response) {
            result = _buildJsonRpcResponseResult(data);
        }

        self._log.debug('received', msgId, 'from', sender.address, sender.port,
            type === TYPES.request ? 'request ' + method : 'response ' + transmission.method
        );

        transmissionBroker.removeTransmissionRecordOnResponse(type, msgId);

        return _buildJsonRpcMessageSpec(msgId, method, params, result);

        /*
         * private pythonRpcToJsonRpc function definition
         */

        function _buildJsonRpcRequestMethod(data) {
            var method = data instanceof Array && typeof data[0] === 'string' ? data[0].toUpperCase() : undefined;
            transmission.method = method;
            return method;
        }

        function _buildJsonRpcRequestParams(data, method, sender) {
            var params = {
                contact: _createContactFromDataAndSender(data, sender)
            };

            if (method === 'STORE') {
                transmission.method = method;
                _addItemToParams(params, data);
            } else if (method === 'FIND_NODE' || method === 'FIND_VALUE') {
                _addKeyToParams(params, data);
            } else if (method === 'PING') {
                // do nothing, contact already added to params
            } else {
                self._log.warn('unknown incoming request', method, params.contact);
                throw Error('unknown incoming request ' + method + ' from ', JSON.stringify(params.contact));
            }

            return params;

            function _addItemToParams(params, data) {
                var item = {
                    key: Buffer.isBuffer(data[1][1]) ? data[1][1].toString('hex') : data[1][1],
                    value: Buffer.isBuffer(data[1][2]) ? data[1][2].toString() : data[1][2]
                };
                params.item = _validateItem(item);
                transmission.item = params.item;
            }

            function _addKeyToParams(params, data) {
                params.key = data[1][1].toString('hex');
            }
        }

        function _buildJsonRpcResponseResult(data) {
            var method = transmission.method;
            var result = {
                contact: transmission.contact
            };
            if (!result.contact || !transmission.contact.address) {
                self._log.error('********** no contact', method, transmission);
            }

            if (method === 'find_value') { // find_value response
                var value = data.value instanceof Buffer ? data.value.toString() : data.value;
                if (value) {
                    result.item = merge({}, transmission.item);
                    result.item.value = value;
                } else if (data instanceof Array) {
                    result.nodes = _convertRpcParamsToArrayOfContacts(data)
                } else if (data === false) {
                    result.nodes = [];
                }
            } else if (method === 'store') { // store response
                result.item = data == true ? transmission.item : undefined;
            } else if (method === 'find_node') { // find_node response
                result.nodes = _convertRpcParamsToArrayOfContacts(data);
            } else if (method === 'ping') { // find_node response
                if (Buffer.isBuffer(data) && result.contact) {
                    result.contact.nodeID = data.toString('hex');
                }
            } else {
                self._log.warn('unknown incoming response', method, transmission, data, result.contact);
                throw Error('unknown incoming response ' + method + ' from ' + JSON.stringify(result.contact));
            }

            return result;
        }

        function _buildJsonRpcMessageSpec(msgId, method, params, result) {
            return {
                id: msgId,
                method: method,
                params: params,
                result: result
            };
        }

        function _createContactFromDataAndSender(data, sender) {
            return _createContact(data[1][0].toString('hex'), sender.address, sender.port);
        }

        function _createContact(nodeId, address, port) {
            var contact = new AddressPortContact({
                nodeID: nodeId,
                address: address,
                port: port
            });
            return contact;
        }

        function _convertRpcParamsToArrayOfContacts(rpcParams) {
            var contacts = [];
            for (var index in rpcParams) {
                var rpcContact = rpcParams[index];
                var contact = _createContact(rpcContact[0].toString('hex'), rpcContact[1].toString(), rpcContact[2]);
                contacts.push(contact);
            }
            return contacts;
        }
    }

    function _jsonRpcToPythonRpc(data, contact) {
        var dataObject = JSON.parse(data.toString());
        var msgId = dataObject.id;
        var type = transmissionBroker.isTransmissionExisting(msgId) ? TYPES.response : TYPES.request;
        var args = [];
        var transmission = transmissionBroker.getTransmission(msgId);
        transmission.contact = contact;

        if (type === TYPES.request) {
            args = _buildPythonRpcRequestArgs(dataObject);
        } else if (type === TYPES.response) {
            args = _buildPythonRpcResonseArgs(dataObject);
        }

        var totalBuffer = _concatDataInBuffer(type, msgId, args);

        self._log.debug('send', msgId, 'to', contact.address, contact.port,
            (type === TYPES.request ? 'request ' : 'response ') + transmission.method
        );

        transmissionBroker.removeTransmissionRecordOnResponse(type, msgId);

        return totalBuffer;

        /*
         * private jsonRpcToPythonRpc function definition
         */

        function _buildPythonRpcRequestArgs(dataObject) {
            var method = dataObject.method.toLowerCase();
            var params = [];
            _addNodeIDParam(params, dataObject);

            if (method === 'store') {
                _addStoreItemParams(params, dataObject);
            } else if (method === 'find_node' || method === 'find_value') {
                _addKeyParam(params, dataObject);
                _addItemToTransmission(dataObject);
            } else if (method === 'ping') {
                // do nothing nodeID is already added to params
            } else {
                self._log.warn('unknown outgoing request', method, dataObject);
            }
            _addMethodToTransmission(method);

            return [method, params];

            function _addNodeIDParam(params, dataObject) {
                params.push(
                    new Buffer(dataObject.params.contact.nodeID, 'hex')
                );
            }

            function _addKeyParam(params, dataObject) {
                params.push(new Buffer(dataObject.params.key, 'hex'));
            }

            function _addItemToTransmission(dataObject) {
                if (transmission.item === undefined) {
                    transmission.item = {
                        key: dataObject.params.key,
                        publisher: dataObject.params.contact.nodeID
                    }
                }
            }

            function _addStoreItemParams(params, dataObject) {
                var key = dataObject.params.item.key;
                var value = dataObject.params.item.value;
                params.push(new Buffer(key, 'hex'));
                params.push(new Buffer(value));

                transmission.item = dataObject.params.item;
            }

            function _addMethodToTransmission(method) {
                transmission.method = method;
            }
        }

        function _buildPythonRpcResonseArgs(dataObject) {
            var method = transmission.method;
            var result = [];
            if (method === 'FIND_NODE') {
                result = _getNodesResult(dataObject);
            } else if (method === 'STORE') {
                result = _getStoreResult();
            } else if (method === 'FIND_VALUE') {
                result = _getItemResult(dataObject);
            } else if (method === 'PING') {
                result = _getNodeIDResult(dataObject);
            } else {
                self._log.warn('unknown outgoing response', method, dataObject);
            }
            return result;

            function _getNodesResult(dataObject) {
                var nodes = [];
                for (var index in dataObject.result.nodes) {
                    var node = dataObject.result.nodes[index];
                    if (false === _isNodeInformationIsComplete(node)) {
                        continue;
                    }
                    nodes.push([
                        node.nodeID,
                        node.address,
                        node.port
                    ]);
                }
                return nodes;
            }

            function _getStoreResult() {
                return true;
            }

            function _getItemResult(dataObject) {
                if (dataObject.result.item && dataObject.result.item.value !== undefined) {
                    return {value: dataObject.result.item.value};
                }
                return false;
            }

            function _getNodeIDResult(dataObject) {
                return dataObject.result.contact.nodeID;
            }

            function _isNodeInformationIsComplete(node) {
                return node.nodeID !== undefined && node.address !== undefined && node.port !== undefined
            }
        }

        function _concatDataInBuffer(type, msgId, args) {
            var typeBuffer = new Buffer(type);
            var msgIdBuffer = new Buffer(msgId, 'hex');
            var argsBuffer = new Buffer(msgpack.encode(args));
            return Buffer.concat(
                [typeBuffer, msgIdBuffer, argsBuffer],
                typeBuffer.length + msgIdBuffer.length + argsBuffer.length
            );
        }
    }

    function _isPythonRpc(buffer) {
        if (!Buffer.isBuffer(buffer)) {
            return false;
        }
        var type = _typeFromIntToHex(buffer.slice(0, 1));
        if (type === TYPES.request || type === TYPES.response) {
            return true;
        }
        return false;
    }

    function _typeFromIntToHex(typeBuffer) {
        var typeInt = typeBuffer.readUInt8(0);
        if (typeInt === 0) {
            return TYPES.request;
        } else if (typeInt === 1) {
            return TYPES.response;
        }
        return typeInt.toString(); // no conversion
    }

    function _validateItem(item) {
        try {
            JSON.parse(item.value);
        } catch (ex) {
            var message = 'value is no json';
            self._log.error(message);
            throw Error(message);
        }

        var test_key = _calculateHash(item.value);
        if (test_key != item.key) {
            var message = 'key is not valid';
            self._log.error(message);
            throw Error(message);
        }

        return item;

    }

    function _calculateHash(value) {
        var hash_sha256ripemd160 = Hash.sha256ripemd160(new Buffer(value)).toString('hex');
        var hash_sha1_sha256ripemd160 = Hash.sha1(new Buffer(hash_sha256ripemd160)).toString('hex');
        return hash_sha1_sha256ripemd160;
    }
}

module.exports = PythonRpcAdapter;