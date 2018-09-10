class HandlersHelper {
    constructor() {
        this.arrHandlers = [].slice.call(arguments);
    }

    findHandlersByPath(path) {
        let ret = {};
        this.arrHandlers.forEach(handlers => {
            path.forEach(pathIntent => {
                if (handlers && handlers[pathIntent]) {
                    handlers = handlers[pathIntent];
                } else {
                    handlers = null;
                }
            });

            if (typeof handlers === 'object' && handlers !== null) {
                //where there is an overlap of properties, the functions should be run one after the other
                Object.keys(handlers).forEach(key => {
                    let origFunc = ret[key];
                    let newFunc  = handlers[key];
                    if (typeof origFunc === 'function' && typeof newFunc === 'function') {
                        ret[key] = function() {
                            let args = [].slice.call(arguments);
                            origFunc.apply(this, args);
                            newFunc.apply(this, args);
                        }
                    } else {
                        ret[key] = handlers[key];
                    }
                });
            }
        });

        return ret;
    }

    /*
     * Intent must be a string
     * Handlers must be an object
     * Path should be an array of strings, usually comes from followup intent
     *
     * Returns an object containing the handler and its type
     */
    findIntentHandler(intent, path = []) {
        console.log('Finding handler for intent '+intent+' at path', path, this.arrHandlers);

        //this is what we will return as a function
        let handler = null;

        //a default handler is used as an entry point
        let isDefault = false;

        //when the intent doesn't match what's in the followup handlers, or the user says something weird
        let isUnknown = false;
        let unknown = (handlers) => {
            isUnknown = Boolean(handlers['Unknown']);
            return handlers['Unknown'];
        };

        // find the level of handlers defined by the path
        let level = path.length;
        let baseHandlers = this.findHandlersByPath(path.slice(0, level));
        if (!baseHandlers) {
            //revert to top level
            level = 0;
            baseHandlers = this.findHandlersByPath(path.slice(0, level));
        }

        console.log('Looking in handlers for intent '+intent, baseHandlers);

        /*
         * Loop through, following redirects, until we find a handler function
         */
        let i = 0;
        while (typeof handler !== 'function' && i < 5) {
            //look in local handlers first
            handler = baseHandlers[intent] || null;

            //if intent not found, look down a level
            if (handler === null) {
                //call exit if exists (should only be used for cleanup, or for adding confirm text)
                if (baseHandlers['Exit']) {
                    baseHandlers['Exit']();
                }

                level--;
                baseHandlers = this.findHandlersByPath(path.slice(0, level));
            }

            //if the handler is a string, then deal with it as a redirect
            if (typeof handler === 'string') {
                intent = handler;
                if (handler.search('global.') === 0) {
                    //back to top level
                    level = 0;
                    baseHandlers = this.findHandlersByPath(path.slice(0, level));
                    intent = handler.replace(/^global\./, '');
                }
            }

            //if the handler is an object, then it is an entry point
            if (handler !== null && typeof handler === 'object' && typeof handler.Default === 'function') {
                //check if object contains 'Default' property
                handler = handler.Default;

                //followup should be within the same intent
                isDefault = true;

                //there must be a default. If there isn't then throw an error
                if (!handler) {
                    throw new Error('Handler at path '+path.concat([intent]).join(' / ')+' must contain a Default');
                }
            }

            //increase i to protect against an accidental endless loop
            i++;
        }

        return {
            handler: handler || unknown(this.findHandlersByPath([])),
            foundAtPath: path.slice(0, level).concat([intent]),
            type: isUnknown ? 'unknown' : (isDefault ? 'default' : null)
        };
    }
}

module.exports = HandlersHelper;