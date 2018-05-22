function responseToContext(res) {

    res.fail = function() {
        res.sendStatus(500);
    };

    res.succeed = function(data) {
        res.send(data);
    };

    return res;
}

function contextToResponse(context) {
    context.prototype.send = function(data) {
        this.succeed(data);
    };

    return context;
}

module.exports = resOrContext => {
    //is this a context object?
    if (resOrContext.fail && resOrContext.succeed) {
        return contextToResponse(resOrContext);
    } else {
        //wrap it so it behaves as a context
        return new responseToContext(resOrContext);
    }
};