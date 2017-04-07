const T = require('tman-wrtc');

let graph = new window.P2PGraph('.graph');

let N = 25;

// #1 create N peers 
let peers = [];
let revertedIndex = new Map();
for (let i = 0; i < N; ++i) {
    peers.push(new T({peer: i,
                      descriptor: {x: i},
                      delta: 60*1000,
                      config:{trickle:true}}));
    revertedIndex.set(peers[i].NI.PEER, peers[i]);
};

// #2 simulate signaling server
const callback = (from, to) => {
    return (offer) => {
        to.connect( (answer) => { from.connect(answer); }, offer);
    };
};

// #3 peers join the network 1 by 1
for (let i = 1; i < N ; ++i) {
    setTimeout( (nth) => {
        const rn = Math.floor(Math.random() * nth);
        peers[nth].join(callback(peers[nth], peers[rn]));
    }, i*1000, i);
};


var totalLinks = 0;

for (let i = 0; i < N; ++i ){
    graph.add({
        id: peers[i].PEER,
        me: false,
        name: i
    });

    peers[i].on('open', (peerId) => {
        !graph.hasLink(peers[i].PEER, revertedIndex.get(peerId).PEER) &&
            graph.connect(peers[i].PEER, revertedIndex.get(peerId).PEER);
        totalLinks += 1;
    });
    peers[i].on('close', (peerId) => {
        (!peers[i].o.has(peerId)) &&
            graph.disconnect(peers[i].PEER, revertedIndex.get(peerId).PEER);
        totalLinks -= 1;
    });
};


let scramble = (delay = 0) => {
    for (let i = 0; i < N; ++i) {
        setTimeout ( (nth) => {
            peers[nth]._exchange(); // force exchange
        }, i*delay, i);
    };
};

var cloud = () => {
    let result = [];
    for (let i = 0; i < N; ++i) {
        peers[i].getPeers().forEach( (neighbor) => {
            let d = Math.abs(peers[i].options.descriptor.x -
                     revertedIndex.get(neighbor).options.descriptor.x)/N;
            result.push(d);
        });       
    };
    return result.sort( (a,b) => a-b );
};


