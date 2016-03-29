#!/usr/bin/env node

'use strict';

var assert = require('assert');


function TransmissionBroker(options) {
    if (!(this instanceof TransmissionBroker)) {
        return new TransmissionBroker(options);
    }
    assert(options.types, 'types have to be included into options');
    assert(options.types.request !== undefined, 'type request has to be defined');
    assert(options.types.response !== undefined, 'type response has to be defined');

    var self = this;
    var TYPES = options.types;
    var transmissions = {};
    var nodes = {};
    var nodeLifeTime = 10 * 60 * 1000; // 10 minutes

    self.getTransmission = _getTransmission;
    self.isTransmissionExisting = _isTransmissionExisting;
    self.removeTransmissionRecordOnResponse = _removeTransmissionRecordOnResponse;

    function _getTransmission(msgId) {
        _createTransmissionIfNotExisting(msgId);
        return transmissions[msgId];

        function _createTransmissionIfNotExisting(msgId) {
            if (transmissions[msgId] === undefined) {
                transmissions[msgId] = _createTransmission();
            }
        }
    }

    function _createTransmission() {
        return {};
    }

    function _isTransmissionExisting(msgId) {
        return transmissions[msgId] !== undefined;
    }

    function _removeTransmissionRecordOnResponse(type, msgId) {
        if (type === TYPES.response) {
            _removeTransmissionRecord(msgId);
        }
    }

    function _removeTransmissionRecord(msgId) {
        delete transmissions[msgId];
    }
}

module.exports = TransmissionBroker;