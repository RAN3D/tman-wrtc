
function TMan(network, descriptor, options){
    // #1 initialize pointer to membership protocol && local descriptor
    this.network = network;
    this.descriptor = descriptor;
    // #2 initialize default parameters
    this.buffer = [];
    this.tabu = [];
    this.tabuSize = (options && options.tabuSize) || 4;
    this.m = (options && options.m) || 3;
    this.phi = (options && options.phi) || 1;
    this.deltaTime = (options && options.deltaTime) || 60000;
    // #3 start the loop
    setInterval(loop, this.deltaTime);
};

TMan.prototype.loop = function(){
    // #1 get a remote peer given my descriptor and a ranking function
    // #2 create buffer with my view and my descriptor
    // #3 rank the descriptors given the descriptor of the remote peer
    // #4 send the m first entries of buffer to the remote peer
};

TMan.prototype.handleResponse = function(remote, message){
    // #5 merge our view with the one received from the remote peer
};

TMan.prototype.handleRequest = function(origin, message){
    // #A merge our view with the received descriptor into a buffer
    // #B rank the buffer
    // #C send the m first entries of the buffer to the requester
};
