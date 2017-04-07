'use strict';

/**
 * Entry composing the partial view of a peer.
 */
class EPV {
    /**
     * @param {string} peerId The identifier of the neighbor.
     * @param {object} [descriptor = {}] The descriptor of this neighbor.
     */
    constructor(peerId, descriptor = {}) {
        this.peer = peerId;
        this.ages = [0];
        this.descriptor  = descriptor;
    };

    /**
     * Update the descriptor of the entry
     * @param {object} descriptor The new descriptor assigned to this neigbhor.
     */
    update (descriptor) {
        this.descriptor = descriptor;
    };

    /**
     * Increment the ages     
     */
    increment () {
        this.ages = this.ages.map( (age) => age+1 );
    };

    /**
     * Add a new 'instance' of this neigbhor, i.e., add a new age entry.
     */ 
    add () {
        this.ages.unshift(0);
    };

    /**
     * Remove the oldest entry of this neighbor.
     * @returns {boolean} True if the entry has no age anymore, false otherwise.
     */
    removeOldest () {
        this.ages.pop();
        return this.ages.length === 0;
    };
    
    /**
     * Remove the youngest entry of this neigbhor.
     * @returns {boolean} True if the entry has no age anymore, false otherwise.
     */
    removeYoungest () {
        this.ages.shift();
        return this.ages.length === 0;
    };
    
    /**
     * Get the oldest age of this neighbor.
     * @returns {number} The oldest age.
     */
    get oldest () {
        return this.ages[this.ages.length - 1];
    };

    /**
     * Get the number of occurrences of this neighbor. 
     */
    get count () {
        return this.ages.length;
    };
};

module.exports = EPV;
