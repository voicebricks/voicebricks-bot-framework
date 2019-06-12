class HandlersHelper {
  constructor(session, handlers) {
    this.session = session;

    //this is an array so we can add custom handlers later
    this.arrHandlers = [handlers];
  }

  findHandlersByPath(path) {
    let ret = null;
    this.arrHandlers.forEach(handlers => {
      path.forEach(pathIntent => {
        if (handlers && handlers[pathIntent]) {
          handlers = handlers[pathIntent];
        } else {
          handlers = null;
        }
      });
      ret = handlers || ret;
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
    //console.log('Finding handler for intent ' + intent + ' at path', '/'+path.join('/'));

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
    let baseHandlers = this.findHandlersByPath(path.slice(0, level)) || {};
    let topLevelBaseHandlers = baseHandlers;

    //console.log('Looking in handlers for intent ' + intent, baseHandlers);

    /*
     * Loop through, following redirects, until we find a handler function
     */
    let i = 0;
    while (typeof handler !== 'function' && i < 10 && level >= 0) {
      //look in local handlers first
      handler = baseHandlers[intent] || null;

      //if intent not found, and context allows exit, look down a level
      if (handler === null) {
        /*
         * call exit if exists (should only be used for cleanup, for adding confirm text, or blocking
         * propogation when an intent is not found)
         */
        let blockPropogation = false
        if (baseHandlers['_ExitContext']) {
          if (baseHandlers['Unknown']) {
            blockPropogation = baseHandlers['_ExitContext'](intent, this.session.data, this.session.user) === false;
          } else {
            console.warn('_ExitContext must be used in conjunction with Unknown');
          }
        }

        if (!blockPropogation && level > 0) {
          //look down a level
          level--;
          //console.log(intent + ' not found in '+'/'+path.slice(0, level+1).join('/')+', checking ', '/'+path.slice(0, level).join('/'));
          path = path.slice(0, level);
          baseHandlers = this.findHandlersByPath(path);
        } else {
          //use the 'Unknown' handler from this level
          handler = unknown(baseHandlers);
        }
      }

      //if the handler is a string, then deal with it as a redirect
      if (typeof handler === 'string') {
        intent = handler;
        if (handler.search('global.') === 0) {
          //back to top level
          level = 0;
          path = [];
          baseHandlers = this.findHandlersByPath(path.slice(0, level));
          intent = handler.replace(/^global\./, '');
        }
      }

      //if the handler is an object, then it is an entry point
      if (handler !== null && typeof handler === 'object' && typeof handler.Default === 'function') {
        //object should contain 'Default' property
        handler = handler.Default;

        //we've just gone up a level
        level++;
        path.push(intent);

        //followup should be within the same intent
        isDefault = true;

        //there must be a default. If there isn't then throw an error
        if (!handler) {
          throw new Error('Handler at path ' + path.concat([intent]).join(' / ') + ' must contain a Default');
        }
      }

      //increase i to protect against an accidental endless loop
      i++;
    }


    /*
     * Loop through each level downwards, until we find an 'Unknown' handler function
     */
    if (!handler) {
      baseHandlers = topLevelBaseHandlers;
      level = path.length;
      i = 0;
      while (typeof handler !== 'function' && i < level) {
        //look for unknown handler
        level--;
        baseHandlers = this.findHandlersByPath(path.slice(0, level));
        handler = unknown(baseHandlers);

        //increase i to protect against an accidental endless loop
        i++;
      }
    }

    /*
     * Final definition of handler
     */
    intent = isUnknown ? 'Unknown' : (isDefault ? 'Default' : intent);
    handler = handler || unknown(baseHandlers);
    //('Found '+intent+' under /'+path.slice(0, level).join('/'));

    /*
     * Define middleware for this intent
     * - go down through each level, joining middleware so that the top level middleware is run first
     */
    let middleware = next => next();
    const addMiddlewareLevel = (handlers, intent) => {
      if (handlers && handlers._Middleware) {
        let prevMiddleware = middleware;
        middleware = next => handlers._Middleware.call(this.session, intent, prevMiddleware.bind(null, next));
      }
    }
    for (i = level; i >= 0; i--) {
      let handlers = this.findHandlersByPath(path.slice(0, i));
      if (handlers && handlers._Middleware) {
        //console.log('Add middleware for ' + path[i] + ' at level '+i);
      }
      addMiddlewareLevel(handlers, path[i]);
    }
    let handlerFunc = function() {
      const handlerArgs = [].slice.call(arguments);
      //call middleware
      middleware(() => handler.apply(this, handlerArgs))
    }

    return {
      handler: handlerFunc,
      intent,
      foundAtPath: path.slice(0, level).concat([intent]),
      type: isUnknown ? 'unknown' : (isDefault ? 'default' : null)
    };
  }
}

module
  .exports = HandlersHelper;