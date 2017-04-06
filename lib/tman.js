'use strict';

const debug = require('debug')('tman-wrtc');
const N2N = require('n2n-overlay-wrtc');
const _ = require('lodash');

const PartialView = require('./partialview.js');

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
     * @param {number} [options.timeout = 12000] WebRTC connections are
     * expensive to establish, may fail, etc. Instead of immediately removing
     * them, the protocol keep them warm during options.timeout
     * milliseconds. Consequently, messages transiting through them can still be
     * transmitted, and if the protocol requires such an arc, it can be
     * reestablished at no cost.
     * @param {TMan} [parent] This module can depend of another t-man module. If
     * set, it will share the neighbors populating its inview and outview. Thus,
     * the above options will be of no use. See neigbhorhood-wrtc module for
     * more informations on the sharing process.
     */
    constructor (options = {}, parent) {
        // #0 initialize our N2N-parent
        super( _.merge({ pid: 'tman-wrtc',
                         delta: 1 * 60 * 1000,
                         timeout: 2 * 60 * 1000,
                         retry: 5,
                         inview: parent && parent.NI,
                         outview: parent && parent.NO,
                         descriptor: Math.random(),
                         ranking: function(a, b) { return b-a; }}, options) );
        // #1 constants (from N2N): this.PID, this.PEER
        debug('[%s] Initalized with ==> %s ==>', this.PID, this.PEER);
        // #2 initialize the partial view
        this.partialView = new PartialView();
        // #2 constants (from N2N)
        // this.PID = protocol identifier
        // this.PEER = peer Id comprising inview and outview Ids
        debug('[%s] Initalized with ==> %s ==>', this.PID, this.PEER);
        // #3 periodic shuffling
        // #4 initialize table of descriptors
        this.descriptors = new Descriptors();
    };
    
    _exchange () {
        // #1 get a remote peer given my descriptor and a ranking function
        // #2 create buffer with my view and my descriptor
        // #3 rank the descriptors given the descriptor of the remote peer
        // #4 send the m first entries of buffer to the remote peer
    };
    
    _onExchange (peerId, message) {
        // #5 merge our view with the one received from the remote peer
    };
};

module.exports = TMan;
