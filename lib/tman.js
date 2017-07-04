'use strict';

const debug = require('debug')('tman-wrtc');
const N2N = require('n2n-overlay-wrtc');
const U = require('unicast-definition');
const merge = require('lodash.merge');
const isEmpty = require('lodash.isempty');

const PartialView = require('./partialview.js');
const Cache = require('./cache.js');

const MJoin = require('./messages/mjoin.js');
const MSuggest = require('./messages/msuggest.js');
const MSuggestBack = require('./messages/msuggestback.js');
const MRequire = require('./messages/mrequire.js');
const MGiveDescriptor = require('./messages/mgivedescriptor.js');
const MRequestDescriptor = require('./messages/mrequestdescriptor.js');

const ExMessage = require('./exceptions/exmessage.js');
const ExJoin = require('./exceptions/exjoin.js');

/**
 * Peer-sampling protocol running on top of WebRTC that builds network
 * topologies using ranking functions.
 */
class TMan extends N2N {
    /**
     * @param {object} [options] Options given to TMan to build the desired
     * topology.
     * @param {string} [options.pid = 'tman-wrtc'] The identifier of this
     * protocol.
     * @param {number} [options.delta = 60000] Every delta millisecond, exchange
     * neighbors of the partial view.
     * @param {number} [options.timeout = 120000] WebRTC connections are
     * expensive to establish, may fail, etc. Instead of immediately removing
     * them, the protocol keep them warm during options.timeout
     * milliseconds. Consequently, messages transiting through them can still be
     * transmitted, and if the protocol requires such an arc, it can be
     * reestablished at no cost.
     * @param {number} [options.descriptorTimeout = 10000] Peers regularly ask
     * for descriptor and await an answer. If this answer does not come up in
     * time, it throws an exception.
     * @param {IPSP} [parent] This module can depend of another peer-sampling
     * protocol. If set, it will share the neighbors populating its inview and
     * outview. Thus, the above options will be of no use. See neigbhorhood-wrtc
     * module for more informations on the sharing process.
     */
    constructor (options = {}, parent) {
        // #0 initialize our N2N-parent
        super( merge({ pid: 'tman-wrtc',
                       delta: 1 * 60 * 1000,
                       timeout: 2 * 60 * 1000,
                       descriptorTimeout: 10* 1000,
                       retry: 5,
                       inview: parent && parent.NI,
                       outview: parent && parent.NO,
                       descriptor: {x: Math.random()},
                       ranking: (neighbor) => (a, b) => {
                           const db = b.descriptor.x - neighbor.descriptor.x;
                           const da = a.descriptor.x - neighbor.descriptor.x;
                           return Math.abs(da) - Math.abs(db);
                       }}, options) );
        // #1 constants (from N2N): this.PID, this.PEER
        debug('[%s] Initalized with ==> %s ==>', this.PID, this.PEER);
        // #2 initialize the partial view
        this.partialView = new PartialView();
        this.cache = new Cache(this.options.timeout);
        // #3 connectedness state of this protocol
        this.state = 'disconnected';
        // #4 periodic shuffling
        this.periodic = null;
        // #5 events
        this.on('receive', (peerId, message) => this._receive(peerId, message));
        // this.on('stream', (peerId, message) =>  ); // (TODO) ?;
        this.on('open', (peerId) => {
            this._open(peerId);
            this._updateState();
        });
        this.on('close', (peerId) => {
            this._close(peerId);
            this._updateState();
        });
        this.on('fail', (peerId) => {
            this._onArcDown(peerId);
            this._updateState();
        });
        // #6 if has parent, register events to get descriptors
        this.parent = parent || null;
        if (this.parent) {
            this.unicast = new U(this.parent,
                                 {pid: 'tman-wrtc-unicast',
                                  retry: this.options.retry} );
            
            this.parent.on('open', (peerId) =>
                           !this.cache.has(peerId) &&
                           this.unicast.emit('requestDescriptor',
                                             peerId, this.getOutviewId())
                           .catch( (e) => { } ));
            
            this.unicast.on('requestDescriptor', (requester) =>
                            this.unicast.emit('giveDescriptor', requester,
                                              this.getInviewId(),
                                              this.options.descriptor)
                            .catch( (e) => { } ));
            this.unicast.on('giveDescriptor', (peerId, descriptor) => {
                if (!this.cache.has(peerId)) {
                    debug('[%s] get %s\'s descriptor from %s.',
                          this.PID, peerId, this.parent.PID);
                    this.cache.add(peerId, descriptor);
                };
            });
        };
    };

    /**
     * Joining a network.
     * @param {callback} sender Function that will be called each time an offer
     * arrives to this peer. It is the responsability of the caller to send 
     * these offer (using sender) to the contact inside the network.
     * @returns {Promise} A promise that is resolved when the peer joins the 
     * network; rejected after a timeout, or already connected state.
     */
    join (sender) {
        this.parent && this.parent.join(sender);
        let result = new Promise( (resolve, reject) => {
            // #0 connectedness state check
            (this.state !== 'disconnected') &&
                reject(new ExJoin('join', 'Already connected.'));
            // #1 set timeout before reject
            let to = setTimeout( () => {
                reject(new ExJoin('join', 'Timeout exceeded.'));
            }, this.options.timeout);
            // #2 very first call, only done once
            this.once('open', (peerId) => {
                this.send(peerId,
                          new MJoin(this.getInviewId(),this.options.descriptor),
                          this.options.retry).then( () => {
                              clearTimeout(to);
                              this._start(); 
                              resolve(peerId);
                          }).catch( () => {
                              reject( new ExJoin('join',
                                                 'Could not notify contact.'));
                          });
            });
        });
        // #3 start the very first connection of this peer
        this.connect(sender);
        return result;
    };
    
    /**
     * @private Behavior when a peer just joined the network through this peer.
     * @param {string} peerId The identifier of the newcomer.
     * @param {MJoin} message The message sent by the newcomer.
     */
    _onJoin (peerId, message) {
        if (this.partialView.size > 0){
            // #1 all neigbors -> peerId
            debug('[%s] %s ===> join %s; %s neigbhors ===> %s',
                  this.PID, peerId, this.PEER, this.partialView.size, peerId);
            let neighbors = [];
            this.partialView.forEach( (epv, neighbor) => {
                neighbors.push({peer: epv.peer, descriptor: epv.descriptor});
            });
            neighbors.push({peer:this.getInviewId(),
                            descriptor: this.options.descriptor});
            this.send(peerId,
                      new MSuggestBack(neighbors),
                      this.options.retry).catch( (e) => { } );
        } else {
            // #2 this -> peerId
            debug('[%s] %s ===> join %s ===> %s',
                  this.PID, peerId, this.PEER, peerId);
            this.cache.add(message.peer, message.descriptor);
            this.connect(null, peerId);
            this.send(peerId,
                      new MSuggestBack([{peer:this.getInviewId(),
                                         descriptor: this.options.descriptor}]),
                      this.options.retry).catch( (e) => { } );
            this._start();
        };
    };

    /**
     * @private Behavior when a WebRTC connection failed to establish properly
     * @param {string|null} peerId The identifier of the peer with which we
     * failed to create a connection. Null if it was yet to be known.
     */
    _onArcDown (peerId) {
        // Do nothing.
    };

    /**
     * @private Behavior when a peer seems down. This is called when, during an
     * exchange, this protocol chooses a down peer to exchange with.
     * @param {string} peerId The identifier of the peer that seems
     * left/crashed.
     */
    _onPeerDown (peerId) {
        this.partialView.removeAllNeighbor(peerId);
    };

    /**
     * @private Getter for the size of the sample to send to the remote chosen
     * peer.
     * @param {string[]} flatten Array of identifiers.
     * @return {number} The size of the sample to create.
     */
    _sampleSize (flatten) {
        return Math.min(flatten.length, 2);
    };

    /**
     * @private Getter for the maximum partial view size.
     */
    _partialViewSize () {
        return 4;
    };
    
    /**
     * @private Get a sample of the partial view.
     * @param {object} neighbor Object containing .peer for identifier of the
     * peer to exchange with and .descriptor for the peer's descriptor.
     * @returns {object[]} Array of object containing .peer and .descriptor.
     */
    _getSample (neighbor) {
        // #1 create a flatten version of the partial view
        let flatten = [];
        // #A extract the partial view of tman
        this.partialView.forEach( (epv, peerId) => {
            epv.ages.forEach( (age) => {
                !isEmpty(epv.descriptor) && flatten.push(peerId);
            });
        });
        // #B add random peers from parent
        this.parent && this.parent.partialView.forEach( (ages, peerId) => {
            if (this.cache.has(peerId) && flatten.indexOf(peerId) < 0) {
                flatten.push(peerId);
            };
        });
        // #2 replace all peerId occurrences by ours
        flatten = flatten.map( (peerId) => {
            let d = {descriptor: this.options.descriptor};
            if (peerId === neighbor.peer){
                d.peer = this.getInviewId();
            } else {
                d.descriptor = (this.cache.has(peerId)&&this.cache.get(peerId))
                    || this.partialView.getDescriptor(peerId);
                d.peer = peerId;
            };
            return d;
        });
        // #3 process the size of the sample
        const sampleSize = this._sampleSize(flatten);
        // #4 rank according to PeerId
        flatten.sort( this.options.ranking(neighbor) );
        return flatten.slice(0, sampleSize);  
    };

    /**
     * @private Periodically called function that aims to distribute links among
     * peers according to the desired property.
     */
    _exchange () {
        // #0 if the partial view is empty --- could be due to disconnections,
        // failure, or _onExchange started with other peers --- skip this round.
        if (this.partialView.size <= 0 &&
            this.parent && this.parent.partialView.size <= 0) {
            return;
        }
        this.partialView.increment();
        // #1 get the oldest peer in our partial view. If the partial view is
        // empty, fall back to parent's partial view.
        let chosen;
        let sample;
        let fromOurOwn = true;
        if (this.partialView.size > 0) {
            // #A use our own partial view
            chosen = this.partialView.oldest;
            sample = this._getSample(this.partialView.get(chosen));
        } else if (this.parent && this.parent.partialView.size > 0) {
            // #B use the partial view of our parent
            let rnNeighbors = this.parent.getPeers();
            let found = false;
            fromOurOwn = false;
            while (!found && rnNeighbors.length > 0){
                const rn = Math.floor(Math.random() * rnNeighbors.length);
                if (this.cache.has(rnNeighbors[rn])){
                    found = true;
                    chosen = rnNeighbors[rn];
                    sample = this._getSample({peer: chosen,
                                              descriptor: this.cache.get(chosen)
                                             });
                } else {
                    rnNeighbors.splice(rn, 1);
                };
            };          
        };
        // #2 propose the sample to the chosen one
        chosen && this.send(chosen, new MSuggest(this.getInviewId(),
                                                 this.options.descriptor,
                                                 sample))
            .then( () => {
                // #A it seems the message has been sent correctly
                debug('[%s] %s ==> suggest %s ==> %s',
                      this.PID, this.PEER, sample.length, chosen); })
            .catch( (e) => {
                // #B the peer cannot be reached, he is supposedly dead
                debug('[%s] %s =X> suggest =X> %s',
                      this.PID, this.PEER, chosen);
                fromOurOwn && this._onPeerDown(chosen); });
    };
    
    /**
     * @private Behavior when this peer receives suggestions from another peer
     * running its periodic protocol.
     * @param {string} peerId The identifier of the initiating peer.
     * @param {ISuggest} message The message containing the suggestions.
     */
    _onExchange (peerId, message) {
        // #1 prepare the sample to send back
        const sample = this._getSample(message);
        this.send(peerId, new MSuggestBack(sample), this.options.retry)
            .then( () => {
                debug('[%s] %s ==> suggest back %s ==> %s',
                      this.PID, this.PEER, sample.length, peerId);
            })
            .catch ( (e) => { } );
        // #2 analyze the received sample and keep the elements if they are
        // better than the current ones
        this._onExchangeBack(peerId, message);
    };

    /**
     * @private Determines which peers are tokeep and which are toreject.
     * @param {string} peerId The identifier of the peer that sent the message.
     * @param {MSuggest|MSuggestBack} message The message received.
     */
    _onExchangeBack (peerId, message) {
        // #1 keep the best elements from the received sample
        let ranked = [];
        this.partialView.forEach( (epv, neighbor) => ranked.push(epv));
        message.sample.forEach( (e) => ranked.indexOf(e) < 0 &&
                                ranked.push(e) );
        
        ranked.sort( this.options.ranking(this.options) );
        // #2 require the elements
        let sliced = ranked.slice(0, this._partialViewSize());
        let request = [];
        sliced.forEach( (e) => {
            if (!this.partialView.has(e.peer)) {
                request.push(e.peer);
                this.cache.add(e.peer, e.descriptor);
            };
        });
        if (request.length > 0) {
            debug('[%s] %s wants to keep %s peers.',
                  this.PID, this.PEER, request.length);
            this.send(peerId, new MRequire(request), this.options.retry)
                .catch( (e) => {
                    debug('[%s] %s =X> request descriptors %s =X> %s',
                          this.PID, this.PEER, request.length, peerId);
                });
        };
        
        let rest = ranked.slice(this._partialViewSize(), ranked.length);
        if (rest.length > 0 && this.partialView.size > this._partialViewSize()){
            rest.forEach( (p) => {
                this.partialView.has(p.peer) && this.disconnect(p.peer);
            });
        };
    };
    
    /**
     * @private A peer requested to be connected with a set of neighbors.
     * @param {string} peerId The identifier of the peer that requests
     * connections.
     * @param {MRequire} message The request message.
     */
    _onRequire (peerId, message) {
        // #1 bridge the requester and the requested peers
        debug('[%s] %s requested to be bridged with %s peers',
              this.PID, peerId, message.peers.length);
        message.peers.forEach( (neighbor) => {
            this.connect(peerId, neighbor);
        });
    };

    /**
     * @private Called each time this protocol receives a message. It processes
     * its own and the rest is redirected to the appropriate registered
     * protocol.
     * @param {string} peerId The identifier of the peer that sent the message.
     * @param {object|MExchange} message The message received.
     */
    _receive (peerId, message) {
        if (message.type && message.type === 'MSuggest') {
            this._onExchange(peerId, message);
        } else if (message.type && message.type === 'MSuggestBack') {
            this._onExchangeBack(peerId, message);
        } else if (message.type && message.type === 'MRequire') {
            this._onRequire(peerId, message);
        } else if (message.type && message.type === 'MJoin') {
            this._onJoin(peerId, message);
        } else if (message.type && message.type === 'MGiveDescriptor') {
            this.emit(this.PID + '-' + peerId, message);
        } else if (message.type && message.type === 'MRequestDescriptor') {
            this._onRequestDescriptor(peerId, message);
        } else {
            throw new ExMessage('_receive', message, 'unhandled');
        };
    };
    
    /**
     * @private Start periodic shuffling.
     */
    _start (delay = this.options.delta) {
        this.periodic = setInterval( () => this._exchange(), delay);
    };

    /**
     * @private Stop periodic shuffling.
     */
    _stop () {
        this.periodic && clearInterval(this.periodic);
    };

    /**
     * @private Get the descriptor from a remote Peer
     * @param {string} peerId The identifier of the peer.
     * @returns {Promise} Resolved when the descriptor has been added to our
     * cache; Rejected after a timeout or an error when sending the message.
     */
    _requestDescriptor (peerId) {
        return new Promise( (resolve, reject) => {
            let to = null;
            this.send(peerId, new MRequestDescriptor(), this.options.retry)
                .then( () => {
                    to = setTimeout( () => {
                        this.removeAllListeners(this.PID + '-' + peerId);
                        reject('timeout'); // (TODO) throw exception
                    }, this.options.descriptorTimeout);
                }).catch( (e) => {
                    reject(e);
                });
            
            this.once(this.PID + '-' + peerId, (message) => {
                clearTimeout(to);
                this.cache.add(message.peer, message.descriptor);
                resolve();
            });
        });
    };

    /**
     * @private Behavior when this peer receives a request of descriptor.
     * @param {string} peerId The identifier of the requester.
     * @param {MRequestDescriptor} message The message received.
     */
    _onRequestDescriptor (peerId, message) {
        this.send(peerId, new MGiveDescriptor(this.getInviewId(),
                                              this.options.descriptor),
                  this.options.retry)
            .catch( (e) => debug('[%s] %s =X> give descriptor =X> %s',
                                 this.PID, this.PEER, peerId) );
    };
    
    /**
     * @private Behavior when a connection is ready to be added in the partial
     * view.
     * @param {string} peerId The identifier of the new neighbor.
     */
    _open (peerId) {
        debug('[%s] %s ===> %s', this.PID, this.PEER, peerId);
        // #1 Check if it is already in the view. We do not want duplicate. Such
        // cases happen due to concurrency. Check if the descriptor is still in
        // the cache.
        if (this.partialView.has(peerId)) {
            this.disconnect(peerId);
        } else if (!this.cache.has(peerId)) {
            this._requestDescriptor(peerId)
                .then( () => {
                    // #2 re-check for it may have been added in the meantime
                    if (this.partialView.has(peerId)){
                        this.disconnect(peerId);
                    } else {
                        // #3 rank peers to check which is to throw, if there is
                        this._keep(peerId);
                    }; })
                .catch( (e) => {
                    this.disconnect(peerId);
                });
        } else {
            // #3 rank peers to check which is to throw, if there is
            this._keep(peerId);
        };
    };

    /**
     * @private Check if the new peer should be added to our partial view or
     * rejected
     * @param {string} peerId The identifier of the peer to check.
     */
    _keep (peerId) {
        let ranked = [];
        this.partialView.forEach( (epv, neighbor) => ranked.push(epv));
        ranked.push({peer: peerId, descriptor: this.cache.get(peerId) });
        ranked.sort( this.options.ranking(this.options) );
        let sliced = ranked.slice(0, this._partialViewSize());
        ranked.splice(0, this._partialViewSize());
        // ranked becomes the rest: the lowest graded
        if (ranked.length === 0 || ranked.indexOf(peerId) < 0) {
            this.partialView.addNeighbor(peerId, this.cache.get(peerId));
        };
        ranked.forEach( (neighbor) => this.disconnect(neighbor.peer) );
    };
    
    /**
     * @private Behavior when a connection is closed.
     * @param {string} peerId The identifier of the removed arc.
     */
    _close (peerId) {
        debug('[%s] %s =†=> %s', this.PID, this.PEER, peerId);
        this.partialView.has(peerId) && this.partialView.removeOldest(peerId);
    };
    
    /**
     * @private Update the connectedness state of the peer.
     */
    _updateState () {
        const remember = this.state;
        if (this.i.size > 0 && this.o.size > 0 && remember !== 'connected'){
            this.state = 'connected';
        } else if ((this.i.size > 0 && this.o.size <= 0 ||
                    this.o.size > 0 && this.i.size <= 0) &&
                   remember !== 'partially connected'){
            this.state = 'partially connected';
        } else if (this.i.size <= 0 && this.o.size <= 0 &&
                   remember !== 'disconnected') {
            this.state = 'disconnected';
            // this._stop();
        };
        (remember !== this.state) && this.emit('statechange', this.state);
    };

    /**
     * Get k neighbors from the partial view. If k is not reached, it tries to
     * fill the gap with neighbors from the inview.  It is worth noting that
     * each peer controls its outview but not its inview. The more the neigbhors
     * from the outview the better.
     * @param {number} k The number of neighbors requested. If k is not defined,
     * it returns every known identifiers of the partial view.
     * @return {string[]} Array of identifiers.
     */
    getPeers (k) {
        let peers = []; 
        if (typeof k === 'undefined') {
            // #1 get all the partial view
            this.partialView.forEach( (epv, peerId) => peers.push(peerId) );
        } else {
            // #2 get random identifier from outview
            let out = [];
            this.partialView.forEach( (epv, peerId) => out.push(peerId) );
            while (peers.length < k && out.length > 0) {
                let rn = Math.floor( Math.random() * out.length );
                peers.push( out[rn] );
                out.splice( rn, 1 );
            };
            // #3 get random identifier from the inview to fill k-entries
            let inView = [];
            this.i.forEach( (occ, peerId) => inView.push(peerId) );
            while (peers.length < k && inView.length > 0){
                let rn = Math.floor( Math.random() * inView.length );
                peers.push( inView[rn] );
                inView.splice( rn, 1 );
            };
        };
        debug('[%s] %s provides %s peers', this.PID, this.PEER, peers.length);
        return peers;
    };
};

module.exports = TMan;
