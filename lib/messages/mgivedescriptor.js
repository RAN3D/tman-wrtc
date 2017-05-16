'use strict';

/**
 * Message that gives your descriptor to another peer.
 */
class MGiveDescriptor {
    /**
     * @param {string} inview The identifier of the inview of the sender.
     * @param {object} descriptor The descriptor of the sender.
     */
    constructor (inview, descriptor) {
        this.peer = inview;
        this.descriptor = descriptor;
        this.type = 'MGiveDescriptor';
    };
};

module.exports = MGiveDescriptor;
