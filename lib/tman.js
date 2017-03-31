'use strict';

const debug = require('debug')('tman-wrtc');
const N2N = require('n2n-overlay-wrtc');
const Spray = require('spray-wrtc');
const _ = require('lodash');


class TMan extends Spray { // SPRAY SOME FUNCTION ALREADY IMPLEM
    constructor (options, optionsRPS) {
        // #0 initialize our N2N-parent
        super( _.merge({pid: 'tman-wrtc',
                        delta: 1000 * 60 * 2,
                        timeout: 1000 * 60 * 1,
                        retry: 5,
                        descriptor: {},
                        distance: function(a, b) { return b-a; }}, options) );
        // #1 initialize our underlying random peer-sampling protocol
        this.rps = new Spray( _.merge({inview: this.NI,
                                       outview: this.NO}, optionsRPS) );        
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
