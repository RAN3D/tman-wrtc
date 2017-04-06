'use strict';

/**
 * Message sent by a peer to another one in order to suggest new
 * connection. This message is an answer to a MSuggest.
 */
class MSuggestBack {
    /**
     * @param {object[]} sample The sample containing the identifier of peers
     * and their descriptor.
     */
    constructor (sample) {
        this.sample = sample;
        this.type = 'MSuggestBack';
    };
};

module.exports = MSuggestBack;
