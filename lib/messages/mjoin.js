'use strict';

/**
 * Message sent by a newcommer to its contact when it joins the network.
 */
class MJoin {
    /** 
     * @param {string} inview The identifier of the inview of the newcomer.
     * @param {object} descriptor The descriptor of the newcomer.
     */ 
    constructor (inview, descriptor) {
        this.peer = inview;
        this.descriptor = descriptor;
        this.type = 'MJoin';
    };
};

module.exports = MJoin;
