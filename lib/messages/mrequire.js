'use strict';

/**
 * Message sent by a peer to another. The latter tries to connect the former to
 * peers contained in this message.
 */
class MRequire {
    /**
     * @param {string[]} peers The identifiers of peers that the sender
     * requests.
     */ 
    constructor (peers){
        this.peers = peers;
        this.type = 'MRequire';
    };
};

module.exports = MRequire;
