#!/usr/bin/env node

'use strict';

var assert = require('assert');

function NodeManager() {
    if (!(this instanceof NodeManager)) {
        return new NodeManager();
    }

    var self = this;
    var NODE_LIST = {
        udp: {},
        webrtc: {}
    };
    var nodeLifeTime = 10 * 60 * 1000; // 10 minutes

    self.addToPythonRpcNodeList = _addToPythonRpcNodeList;
    self.addToWebrtcNodeList = _addToWebrtcNodeList;
    self.isInPythonRpcNodeList = _isInPythonRpcNodeList;
    self.isInWebrtcNodeList = _isInWebrtcNodeList;

    function _addToPythonRpcNodeList(nodeID) {
        _addToNodeList(nodeID, NODE_LIST.udp);
    }

    function _addToWebrtcNodeList(nodeID) {
        _addToNodeList(nodeID, NODE_LIST.webrtc);
    }

    function _addToNodeList(nodeID, nodeList) {
        assert(nodeID !== undefined, 'invalid nodeID, cannot add to node list');
        nodeList[nodeID] = new Date().getTime();
    }

    function _isInPythonRpcNodeList(nodeID) {
        return _isNodeInList(nodeID, NODE_LIST.udp);
    }

    function _isInWebrtcNodeList(nodeID) {
        return _isNodeInList(nodeID, NODE_LIST.webrtc);
    }

    function _isNodeInList(nodeID, nodeList) {
        var now = new Date().getTime();
        var lastSeen = nodeList[nodeID];
        if ((now - lastSeen) > nodeLifeTime) {
            _removeFromNodeList(nodeID);
        }
        return nodeList[nodeID] !== undefined;
    }

    function _removeFromNodeList(nodeID, nodeList) {
        delete nodeList[nodeID];
    }
}

module.exports = NodeManager;