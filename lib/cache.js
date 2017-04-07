'use strict';


class Cache extends Map {
    constructor (timeout) {
        super();
        this.timeout = timeout;        
    };


    add (peerId, descriptor) {
        this.set(peerId, descriptor);
        setTimeout( () => {
            this.has(peerId) && this.delete(peerId);
        }, this.timeout);
    };
};


module.exports = Cache;
