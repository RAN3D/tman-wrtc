'use strict';

/**
 * Message sent by a peer to another one in order to suggest new connection.
 */
class MSuggest {
    /**
     * @param {object} descriptor The descriptor of the sender.
     * @param {object[]} sample The sample containing the identifier of peers
     * and their descriptor.
     */
    constructor (descriptor, sample) {
        this.descriptor = descriptor;
        this.sample = sample;
        this.type = 'MSuggest';
    };
};

module.exports = MSuggest;
