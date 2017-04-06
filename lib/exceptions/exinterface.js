'use strict';

/**
 * Exception thrown when the interface to create a t-man has not been
 * fullfilled.
 */
class ExInterface {
    /**
     * @param {string} source The function name that threw this exception.
     */
    constructor (source){
        this.source = source;
        this.message = 'This function requires an implementation';
    };    
};
