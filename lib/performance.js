var monitoringNodes = [];
var nodePerformance = [];

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
    addContact: function (contact, node) {
        if (isContactAlreadyExisting(contact)) {
            return;
        }
        var minifiedContact = {address: contact.address, port: contact.port, nick: contact.nick};

        connectedContacts.push(minifiedContact);
        var measure = {
            contact: minifiedContact,
            node: node,
            timeConnected: new Date().getTime()
        };
        nodePerformance.push(measure);
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

            //TODO: monitor transport to do this
            // if (operation == 'add' && seedsWaitingForConnect > 0) {
            //     seedsWaitingForConnect--;
            //     nodePerformance[nodeIndex].push({
            //         'connect': {
            //             status: 'end',
            //             contact: contact
            //         },
            //         time: new Date().getTime()
            //     });
            // }
            // nodePerformance[nodeIndex].push({
            //     bucket: {
            //         operation: operation,
            //         contact: contact,
            //         bucket: bucket,
            //         index: index
            //     },
            //     time: new Date().getTime()
            // })
        }

        // node.get = function(key, callback) {
        //     var oldCallback = callback;
        //     var startIndex = nodePerformance[nodeIndex].length;
        //
        //     var newCallback = function() {
        //         nodePerformance[nodeIndex].push({
        //             'get': {
        //                 status: 'end',
        //                 key: key,
        //                 startIndex: startIndex
        //             },
        //             time: new Date().getTime()
        //         });
        //         oldCallback.apply(this, arguments);
        //     }
        //     arguments[1] = newCallback;
        //
        //     nodePerformance[nodeIndex].push({
        //         'get': {
        //             status: 'start',
        //             key: key
        //         },
        //         time: new Date().getTime()
        //     });
        //    
        //     return node.constructor.prototype.get.apply(node, arguments);
        // }
        //
        // node.put = function(key, value, callback) {
        //     var oldCallback = callback;            
        //     var startIndex = nodePerformance[nodeIndex].length;
        //
        //     var newCallback = function() {
        //         nodePerformance[nodeIndex].push({
        //             'put': {
        //                 status: 'end',
        //                 key: key,
        //                 value: value,
        //                 startIndex: startIndex
        //             },
        //             time: new Date().getTime()
        //         });
        //         oldCallback.apply(this, arguments);
        //     }
        //     arguments[2] = newCallback;
        //
        //     nodePerformance[nodeIndex].push({
        //         'put': {
        //             status: 'start',
        //             key: key,
        //             value: value
        //         },
        //         time: new Date().getTime()
        //     });
        //
        //     return node.constructor.prototype.put.apply(node, arguments);
        // }

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


setInterval(function () {
    console.log(JSON.stringify(nodePerformance[0]))
    // console.log(JSON.stringify(nodePerformance[0][nodePerformance[0].length-1]))
    console.log('# of monitoring nodes: ', monitoringNodes.length);
}, 10000)