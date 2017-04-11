'use strict';

const EPV = require('./entries/epv.js');

const ExPeerNotFound = require('./exceptions/expeernotfound.js');

/**
 * Structure containing the neighborhood of a peer. Each neigbhor entry
 * comprises a list of ages and a descriptor.  Map of {idPeer => {ages:[age_1,
 * age_2.. age_k], descriptor: {x: exampleX} }} where age_1 <= age_2 <= .. <=
 * age_k.
 */
class PartialView extends Map {
    constructor () {
        super();
    };
    
    /**
     * Get the oldest peer in the partial view.
     * @returns {string} The oldest peer in the structure.
     */
    get oldest () {
        if (this.size <= 0) { throw new ExPeerNotFound('getOldest'); };
        let oldestPeer = null;
        let oldestAge = 0;
        this.forEach( (epv, peerId) => {
            if (oldestAge <= epv.oldest) {
                oldestPeer = epv.peer;
                oldestAge = epv.oldest;
            };
        });
        return oldestPeer;
    };


    /**
     * Increment the age of the whole partial view
     */
    increment () {
        this.forEach( (epv, peerId) => {
            epv.increment();
        });
    };

    /**
     * Add the peer to the partial view with an age of 0.
     * @param {string} peerId The identifier of the peer added to the partial
     * view.
     * @param {object} [descriptor = {}] The descriptor of the peer.
     */
    addNeighbor (peerId, descriptor = {}) {
        if (this.has(peerId)) {
            this.get(peerId).add();
        } else {
            this.set(peerId, new EPV(peerId, descriptor));
        };
    };

    /**
     * Update the peer's descriptor.
     * @param {string} peerId The identifier of the peer to update.
     * @param {object} [descriptor = {}] The new descriptor of peerId.
     */
    updateNeighbor (peerId, descriptor = {}) {
        if (!this.has(peerId)){
            throw new ExPeerNotFound('updateNeighbor', peerId);
        } else {
            this.get(peerId).update(descriptor);
        };
    };
    
    /**
     * Remove the newest entry of the peer from the partial view.
     * @param {string} peerId The identifier of the peer to remove from the 
     * partial view. 
     */
    removeOldest (peerId) {
        if (!this.has(peerId)) {
            throw new ExPeerNotFound('removeNeighbor', peerId);
        } else {
            this.get(peerId).removeOldest() && this.delete(peerId);
        };
    };

    /**
     * Remove all entries of the peer from the partial view.
     * @param {string} peerId The identifier of the peer to remove from the 
     * partial view.
     * @returns {number} The number of occurrences of peerId removed.
     */
    removeAllNeighbor (peerId) {
        if (!this.has(peerId)) {
            throw new ExPeerNotFound('removeNeighbor', peerId);
        } else {
            const occ = this.get(peerId).count;
            this.delete(peerId);
            return occ;
        };
    };
       

    /**
     * Get the least frequent peer. If multiple peers have the same number of
     * occurrences, it chooses one among them at random.
     * @returns {string} The identifier of a least frequent peer.
     */
    get leastFrequent () {
        if (this.size <= 0) { throw new ExPeerNotFound('getLeastFrequent'); };
        let leastFrequent = [];
        let frequency = Infinity;
        this.forEach( (epv, peerId) => {
            if (epv.count < frequency){
                leastFrequent = [];
                frequency = epv.count;
            };
            (epv.count === frequency) && leastFrequent.push(peerId);
        });
        return leastFrequent[Math.floor(Math.random() * leastFrequent.length)];
    };

    /**
     * Get the descriptor of the peer in argument.
     * @param {string} peerId The identifier of the peer.
     * @returns {object} The descriptor of the peer.
     */
    getDescriptor (peerId) {
        if (!this.has(peerId)) {
            throw new ExPeerNotFound('getDescriptor', peerId);
        } else {
            return this.get(peerId).descriptor;
        };
    };
}


module.exports = PartialView;
