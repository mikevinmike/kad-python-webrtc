var monitoringNodes = [];
var nodePerformance = [];
var overallPerformance = [];
var MONITORING_INTERVAL = 10000;
var memoryMonitoringInterval;
var storageMonitoringInterval;
var isMonitoringRunning = false;

var RPC = require('kad').RPC;

if (process.browser) {
    window.performance.memory
}

/*
 * BEGIN manipulate classes in order to inject hooks
 */
var original_trigger = RPC.prototype._trigger;
RPC.prototype._trigger = function (event, args) {

    var eventArgs = ['trigger:' + event];
    for (var index in args) {
        eventArgs.push(args[index]);
    }
    this.emit.apply(this, eventArgs);
    original_trigger.apply(this, arguments);
};
/*
 * END
 */

module.exports = {
    startMonitoring: function () {
        if (isMonitoringRunning === true) {
            console.error('monitoring is already running');
            return;
        }

        isMonitoringRunning = true;
        overallPerformance.push({
            event: 'start',
            time: new Date().getTime()
        });
        startMemoryMonitoring();
        startStorageMonitoring();
    },
    stopMonitoring: function () {
        isMonitoringRunning = false;
        endMemoryMonitoring();
        endStorageMonitoring();
    },
    getMonitoringData: function () {
        return {
            overall: overallPerformance,
            nodesInfo: monitoringNodes,
            nodes: nodePerformance
        };
    },
    downloadMonitoringData: function () {
        downloadData(this.getMonitoringData(), 'kad-python-webrtc_monitoring');
    },
    addNodeToPerformance: function (node) {
        var self = this;
        var seedsWaitingForConnect = [];
        var nodeIndex = monitoringNodes.length;
        monitoringNodes.push(node);

        nodePerformance[nodeIndex] = [];

        node._rpc.on('trigger:before:receive', function (message, contact) {
            var index;
            if (seedsWaitingForConnect.length > 0 && (index = getIndexFromArray(contact, seedsWaitingForConnect) !== -1)) {
                seedsWaitingForConnect.splice(index, 1);
                nodePerformance[nodeIndex].push({
                    'connect': {
                        status: 'end',
                        contact: contact
                    },
                    time: new Date().getTime()
                });
            }
        });

        node._router.on('add', bucketChange.bind(self, 'add'));
        node._router.on('drop', bucketChange.bind(self, 'drop'));
        node._router.on('shift', bucketChange.bind(self, 'shift'));
        function bucketChange(operation, contact, bucket, index) {
            nodePerformance[nodeIndex].push({
                bucket: {
                    operation: operation,
                    contact: contact,
                    bucket: bucket,
                    index: index
                },
                time: new Date().getTime()
            })
        }

        node.get = function (key, callback) {
            var oldCallback = callback;
            var startIndex = nodePerformance[nodeIndex].length;

            var newCallback = function () {
                nodePerformance[nodeIndex].push({
                    'get': {
                        status: 'end',
                        key: key,
                        startIndex: startIndex
                    },
                    time: new Date().getTime()
                });
                oldCallback.apply(this, arguments);
            }
            arguments[1] = newCallback;

            nodePerformance[nodeIndex].push({
                'get': {
                    status: 'start',
                    key: key
                },
                time: new Date().getTime()
            });

            return node.constructor.prototype.get.apply(node, arguments);
        }

        node.put = function (key, value, callback) {
            var oldCallback = callback;
            var startIndex = nodePerformance[nodeIndex].length;

            var newCallback = function () {
                nodePerformance[nodeIndex].push({
                    'put': {
                        status: 'end',
                        key: key,
                        value: value,
                        startIndex: startIndex
                    },
                    time: new Date().getTime()
                });
                oldCallback.apply(this, arguments);
            }
            arguments[2] = newCallback;

            nodePerformance[nodeIndex].push({
                'put': {
                    status: 'start',
                    key: key,
                    value: value
                },
                time: new Date().getTime()
            });

            return node.constructor.prototype.put.apply(node, arguments);
        }

        node.connect = function (seed, callback) {
            seedsWaitingForConnect.push(seed);

            nodePerformance[nodeIndex].push({
                'connect': {
                    status: 'start',
                    seed: seed
                },
                time: new Date().getTime()
            });

            return node.constructor.prototype.connect.apply(node, arguments);
        }
    }
};

function isContactAlreadyExisting(contact) {
    return getIndexFromArray(contact, connectedContacts) !== -1;
}

function getIndexFromArray(contact, array) {
    for (var index in array) {
        if (array[index].address == contact.address && array[index].address !== undefined
            && array[index].port == contact.port && array[index].port !== undefined
            || array[index].nick == contact.nick && array[index].nick !== undefined) {

            return index;
        }
    }
    return -1;
}

function startMemoryMonitoring() {
    memoryMonitoringInterval = setInterval(takeMemorySnapshot, MONITORING_INTERVAL);
}

function endMemoryMonitoring() {
    if (memoryMonitoringInterval) {
        clearInterval(memoryMonitoringInterval);
    }
}

function takeMemorySnapshot() {
    overallPerformance.push({
        event: 'memory',
        size: getMemorySize(),
        time: new Date().getTime()
    });
}

function startStorageMonitoring() {
    storageMonitoringInterval = setInterval(takeStorageSnapshot, MONITORING_INTERVAL);
}

function endStorageMonitoring() {
    if (storageMonitoringInterval) {
        clearInterval(storageMonitoringInterval);
    }
}

function takeStorageSnapshot() {
    overallPerformance.push({
        event: 'storage',
        size: getStorageSize(),
        unit: 'byte',
        time: new Date().getTime()
    });
}

// @link: http://stackoverflow.com/a/37010923
function getMemorySize() {
    if (!process.browser || window.performance === undefined) {
        return 0;
    }
    return JSON.stringify(window.performance.memory);
}

// @link: http://stackoverflow.com/a/6326411
function getStorageSize() {
    if (!process.browser || window.localstorage === undefined) {
        return 0;
    }
    return JSON.stringify(window.localStorage).length;
}

function downloadData(dataObject, fileName) {
    if (fileName === undefined) {
        fileName = '';
    }
    fileName += "_" + new Date().getTime();
    var data = "text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dataObject));


    var link = document.getElementById("downloadLink");
    link.setAttribute('href', 'data:' + data);
    link.setAttribute('download', fileName + '.json');
    fireEvent(link, 'click');

    return;

    // @link: http://stackoverflow.com/a/143771
    function fireEvent(element, event) {
        if (document.createEvent) {
            // dispatch for firefox + others
            var evt = document.createEvent("HTMLEvents");
            evt.initEvent(event, true, true); // event type,bubbling,cancelable
            return !element.dispatchEvent(evt);
        } else {
            // dispatch for IE
            var evt = document.createEventObject();
            return element.fireEvent('on' + event, evt)
        }
    }
}



setInterval(function () {
    console.log(JSON.stringify(nodePerformance[0][nodePerformance[0].length - 1]))
    console.log('# of monitoring nodes: ', monitoringNodes.length);
}, 10000)