'use strict';

/**
 * Message sent by a peer to another one in order to suggest new connection.
 */
class MSuggest {
    /**
     * @param {string} inview The identifier of the inview of the sender.
     * @param {object} descriptor The descriptor of the sender.
     * @param {object[]} sample The sample containing the identifier of peers
     * and their descriptor.
     */
    constructor (inview, descriptor, sample) {
        this.peer = inview;
        this.descriptor = descriptor;
        this.sample = sample;
        this.type = 'MSuggest';
    };
};

module.exports = MSuggest;
