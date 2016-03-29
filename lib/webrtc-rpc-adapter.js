#!/usr/bin/env node

'use strict';

var Logger = require('kad').Logger;


function WebrtcRpcAdapter(options) {
    if (!(this instanceof WebrtcRpcAdapter)) {
        return new WebrtcRpcAdapter(options);
    }

    var self = this;
    options = options || {};
    self._log = options.logger || new Logger(4);

    self.jsonRpcToWebrtcRpc = _jsonRpcToWebrtcRpc;
    self.isWebrtcContact = _isWebrtcContact;

    function _jsonRpcToWebrtcRpc(data, webrtcContact) {
        var dataObject = JSON.parse(data.toString());
        _replaceContactWithWebrtcContact(dataObject, webrtcContact);
        _removeNotWebrtcNodesFromResult(dataObject);
        return new Buffer(JSON.stringify(dataObject));
    }

    function _replaceContactWithWebrtcContact(dataObject, webrtcContact) {
        if (dataObject.params) {
            dataObject.params.contact = webrtcContact;
        }
        if (dataObject.result) {
            dataObject.result.contact = webrtcContact;
        }
    }

    function _removeNotWebrtcNodesFromResult(dataObject) {
        if (dataObject.result && dataObject.result.nodes) {
            var nodes = dataObject.result.nodes;
            for (var index = nodes.length - 1; index >= 0; index--) {
                if (false === _isWebrtcContact(nodes[index])) {
                    nodes.splice(index, 1);
                }
            }
        }
    }

    function _isWebrtcContact(contact) {
        return typeof contact.nick === 'string' && contact.address === undefined && contact.port === undefined;
    }
}

module.exports = WebrtcRpcAdapter;