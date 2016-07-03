kad-python-webrtc
===================

This library is an extension to connect both python and webrtc nodes with kad, an implementation of the Kademlia distributed hash table for Node.js and the browser.


Manual Fix
------
In order to run the project at the current state the following adjustments have to be made at the dependencies (in node_modules):

node_modules/kad-webrtc/lib/contact.js
``````
line 8: var kademlia = require('../../kad');
``````
node_modules/kad-webrtc/lib/transport.js
``````
line 11: var RPC = require('../../kad').RPC;
``````
node_modules/simple-peer/index.js
``````
line 415: replace function setActiveCandidates(item)

function setActiveCandidates (item) {
      var local = localCandidates[item.localCandidateId]
      var remote = remoteCandidates[item.remoteCandidateId]

      if (local) {
        self.localAddress = local.ipAddress
        self.localPort = Number(local.portNumber)
      } else if (typeof item.googLocalAddress === 'string') {
        // Sometimes `item.id` is undefined in `wrtc` and Chrome
        // See: https://github.com/feross/simple-peer/issues/66
        local = item.googLocalAddress.split(':')
        self.localAddress = local[0]
        self.localPort = Number(local[1])
      }
      self._debug('connect local: %s:%s', self.localAddress, self.localPort)

      if (remote) {
        self.remoteAddress = remote.ipAddress
        self.remotePort = Number(remote.portNumber)
        self.remoteFamily = 'IPv4'
      } else if (typeof item.googRemoteAddress === 'string') {
        remote = item.googRemoteAddress.split(':')
        self.remoteAddress = remote[0]
        self.remotePort = Number(remote[1])
        self.remoteFamily = 'IPv4'
      }
      self._debug('connect remote: %s:%s', self.remoteAddress, self.remotePort)
    }
``````

Prepare
------
Install dependencies via npm and install wrtc manually
```````
$ npm install
$ npm install wrtc
```````

Compile for browser usage
------
To use the peer implementation in the browser perform the following steps:

Set the right server url in example/webrtc/web-socket
```````
var serverUrl = 'ws://{CUSTOM_SERVER_IP}:9089';
```````

Run browserify on example/webrtc-peer.js
``````
$ browserify example/webrtc-peer -o example/webrtc-peer.browser.js
``````

Run
------
For the signalling server (needed for WebRTC) run 
``````
$ node example/webrtc/server
``````
To run the hybrid peer (connects to Python Rpc via UDP and to WebRTC Peers) run 
``````
$ node example/hybrid-peer
``````
To run the Python Rpc peer, which communicates over UDP, run 
``````
$ node example/udp-python-peer
``````
To run the WebRTC peer run 
``````
$ node example/webrtc-peer
``````
To run the WebRTC peer in the browser open the following URL in the browser
``````
http://webrtc-peer-host/example/index.html#yourNickname
``````
