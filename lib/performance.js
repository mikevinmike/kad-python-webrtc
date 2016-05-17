var monitoringNodes = [];
var nodePerformance = [];

if (process.browser) {
    window.performance.memory
}
;

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
        var waitingForConnect = 0;
        var nodeIndex = monitoringNodes.length;
        monitoringNodes.push(node);

        nodePerformance[nodeIndex] = [];

        node._router.on('add', bucketChange.bind(self, 'add'));
        node._router.on('drop', bucketChange.bind(self, 'drop'));
        node._router.on('shift', bucketChange.bind(self, 'shift'));
        function bucketChange(operation, contact, bucket, index) {

            //TODO: monitor transport to do this
            if (operation == 'add' && waitingForConnect > 0) {
                waitingForConnect--;
                nodePerformance[nodeIndex].push({
                    'connect': {
                        status: 'end',
                        contact: contact
                    },
                    time: new Date().getTime()
                });
            }
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
            waitingForConnect++;

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
    for (var index in connectedContacts) {
        if (connectedContacts[index].address == contact.address
            && connectedContacts[index].port == contact.port
            || connectedContacts[index].nick == contact.nick) {

            return true;
        }
    }
    return false;
}


setInterval(function () {
    console.log(JSON.stringify(nodePerformance[0]))
    // console.log(JSON.stringify(nodePerformance[0][nodePerformance[0].length-1]))
    console.log('# of monitoring nodes: ', monitoringNodes.length);
}, 10000)