'use strict';

/**
 * Message that gives your descriptor to another peer.
 */
class MGiveDescriptor {
    /**
     * @param {string} tid The identifier of the request message.
     * @param {string} inview The identifier of the inview of the sender.
     * @param {object} descriptor The descriptor of the sender.
     */
    constructor (tid, inview, descriptor) {
        this.tid = tid;
        this.peer = inview;
        this.descriptor = descriptor;
        this.type = 'MGiveDescriptor';
    };
};

module.exports = MGiveDescriptor;
