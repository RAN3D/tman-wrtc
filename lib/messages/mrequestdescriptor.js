'use strict';

/**
 * Message sent by a peer asking for the receiver to send its descriptor.
 */   
class MRequestDescriptor {
    constructor () {
        this.type = 'MRequestDescriptor';
    };
};

module.exports = MRequestDescriptor;

