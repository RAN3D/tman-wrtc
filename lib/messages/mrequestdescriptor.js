'use strict';

/**
 * Message sent by a peer asking for the receiver to send its descriptor.
 */   
class MRequestDescriptor {
    /**
     * @param {string} tid The identifier of the request.
     */
    constructor (tid) {
        this.tid = tid;
        this.type = 'MRequestDescriptor';
    };
};

module.exports = MRequestDescriptor;

