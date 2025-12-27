module.exports = [
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/dist/build/webpack/loaders/next-flight-loader/server-reference.js [app-rsc] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

/* eslint-disable import/no-extraneous-dependencies */ Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "registerServerReference", {
    enumerable: true,
    get: function() {
        return _server.registerServerReference;
    }
});
const _server = __turbopack_context__.r("[project]/code/planetaryescape/blah.chat/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-server-dom-turbopack-server.js [app-rsc] (ecmascript)"); //# sourceMappingURL=server-reference.js.map
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/dist/server/web/spec-extension/cookies.js [app-rsc] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
0 && (module.exports = {
    RequestCookies: null,
    ResponseCookies: null,
    stringifyCookie: null
});
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: all[name]
    });
}
_export(exports, {
    RequestCookies: function() {
        return _cookies.RequestCookies;
    },
    ResponseCookies: function() {
        return _cookies.ResponseCookies;
    },
    stringifyCookie: function() {
        return _cookies.stringifyCookie;
    }
});
const _cookies = __turbopack_context__.r("[project]/code/planetaryescape/blah.chat/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/dist/compiled/@edge-runtime/cookies/index.js [app-rsc] (ecmascript)"); //# sourceMappingURL=cookies.js.map
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/dist/server/web/spec-extension/adapters/reflect.js [app-rsc] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "ReflectAdapter", {
    enumerable: true,
    get: function() {
        return ReflectAdapter;
    }
});
class ReflectAdapter {
    static get(target, prop, receiver) {
        const value = Reflect.get(target, prop, receiver);
        if (typeof value === 'function') {
            return value.bind(target);
        }
        return value;
    }
    static set(target, prop, value, receiver) {
        return Reflect.set(target, prop, value, receiver);
    }
    static has(target, prop) {
        return Reflect.has(target, prop);
    }
    static deleteProperty(target, prop) {
        return Reflect.deleteProperty(target, prop);
    }
} //# sourceMappingURL=reflect.js.map
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/dist/shared/lib/action-revalidation-kind.js [app-rsc] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
0 && (module.exports = {
    ActionDidNotRevalidate: null,
    ActionDidRevalidateDynamicOnly: null,
    ActionDidRevalidateStaticAndDynamic: null
});
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: all[name]
    });
}
_export(exports, {
    ActionDidNotRevalidate: function() {
        return ActionDidNotRevalidate;
    },
    ActionDidRevalidateDynamicOnly: function() {
        return ActionDidRevalidateDynamicOnly;
    },
    ActionDidRevalidateStaticAndDynamic: function() {
        return ActionDidRevalidateStaticAndDynamic;
    }
});
const ActionDidNotRevalidate = 0;
const ActionDidRevalidateStaticAndDynamic = 1;
const ActionDidRevalidateDynamicOnly = 2; //# sourceMappingURL=action-revalidation-kind.js.map
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/dist/server/web/spec-extension/adapters/request-cookies.js [app-rsc] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
0 && (module.exports = {
    MutableRequestCookiesAdapter: null,
    ReadonlyRequestCookiesError: null,
    RequestCookiesAdapter: null,
    appendMutableCookies: null,
    areCookiesMutableInCurrentPhase: null,
    createCookiesWithMutableAccessCheck: null,
    getModifiedCookieValues: null,
    responseCookiesToRequestCookies: null
});
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: all[name]
    });
}
_export(exports, {
    MutableRequestCookiesAdapter: function() {
        return MutableRequestCookiesAdapter;
    },
    ReadonlyRequestCookiesError: function() {
        return ReadonlyRequestCookiesError;
    },
    RequestCookiesAdapter: function() {
        return RequestCookiesAdapter;
    },
    appendMutableCookies: function() {
        return appendMutableCookies;
    },
    areCookiesMutableInCurrentPhase: function() {
        return areCookiesMutableInCurrentPhase;
    },
    createCookiesWithMutableAccessCheck: function() {
        return createCookiesWithMutableAccessCheck;
    },
    getModifiedCookieValues: function() {
        return getModifiedCookieValues;
    },
    responseCookiesToRequestCookies: function() {
        return responseCookiesToRequestCookies;
    }
});
const _cookies = __turbopack_context__.r("[project]/code/planetaryescape/blah.chat/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/dist/server/web/spec-extension/cookies.js [app-rsc] (ecmascript)");
const _reflect = __turbopack_context__.r("[project]/code/planetaryescape/blah.chat/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/dist/server/web/spec-extension/adapters/reflect.js [app-rsc] (ecmascript)");
const _workasyncstorageexternal = __turbopack_context__.r("[externals]/next/dist/server/app-render/work-async-storage.external.js [external] (next/dist/server/app-render/work-async-storage.external.js, cjs)");
const _actionrevalidationkind = __turbopack_context__.r("[project]/code/planetaryescape/blah.chat/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/dist/shared/lib/action-revalidation-kind.js [app-rsc] (ecmascript)");
class ReadonlyRequestCookiesError extends Error {
    constructor(){
        super('Cookies can only be modified in a Server Action or Route Handler. Read more: https://nextjs.org/docs/app/api-reference/functions/cookies#options');
    }
    static callable() {
        throw new ReadonlyRequestCookiesError();
    }
}
class RequestCookiesAdapter {
    static seal(cookies) {
        return new Proxy(cookies, {
            get (target, prop, receiver) {
                switch(prop){
                    case 'clear':
                    case 'delete':
                    case 'set':
                        return ReadonlyRequestCookiesError.callable;
                    default:
                        return _reflect.ReflectAdapter.get(target, prop, receiver);
                }
            }
        });
    }
}
const SYMBOL_MODIFY_COOKIE_VALUES = Symbol.for('next.mutated.cookies');
function getModifiedCookieValues(cookies) {
    const modified = cookies[SYMBOL_MODIFY_COOKIE_VALUES];
    if (!modified || !Array.isArray(modified) || modified.length === 0) {
        return [];
    }
    return modified;
}
function appendMutableCookies(headers, mutableCookies) {
    const modifiedCookieValues = getModifiedCookieValues(mutableCookies);
    if (modifiedCookieValues.length === 0) {
        return false;
    }
    // Return a new response that extends the response with
    // the modified cookies as fallbacks. `res` cookies
    // will still take precedence.
    const resCookies = new _cookies.ResponseCookies(headers);
    const returnedCookies = resCookies.getAll();
    // Set the modified cookies as fallbacks.
    for (const cookie of modifiedCookieValues){
        resCookies.set(cookie);
    }
    // Set the original cookies as the final values.
    for (const cookie of returnedCookies){
        resCookies.set(cookie);
    }
    return true;
}
class MutableRequestCookiesAdapter {
    static wrap(cookies, onUpdateCookies) {
        const responseCookies = new _cookies.ResponseCookies(new Headers());
        for (const cookie of cookies.getAll()){
            responseCookies.set(cookie);
        }
        let modifiedValues = [];
        const modifiedCookies = new Set();
        const updateResponseCookies = ()=>{
            // TODO-APP: change method of getting workStore
            const workStore = _workasyncstorageexternal.workAsyncStorage.getStore();
            if (workStore) {
                workStore.pathWasRevalidated = _actionrevalidationkind.ActionDidRevalidateStaticAndDynamic;
            }
            const allCookies = responseCookies.getAll();
            modifiedValues = allCookies.filter((c)=>modifiedCookies.has(c.name));
            if (onUpdateCookies) {
                const serializedCookies = [];
                for (const cookie of modifiedValues){
                    const tempCookies = new _cookies.ResponseCookies(new Headers());
                    tempCookies.set(cookie);
                    serializedCookies.push(tempCookies.toString());
                }
                onUpdateCookies(serializedCookies);
            }
        };
        const wrappedCookies = new Proxy(responseCookies, {
            get (target, prop, receiver) {
                switch(prop){
                    // A special symbol to get the modified cookie values
                    case SYMBOL_MODIFY_COOKIE_VALUES:
                        return modifiedValues;
                    // TODO: Throw error if trying to set a cookie after the response
                    // headers have been set.
                    case 'delete':
                        return function(...args) {
                            modifiedCookies.add(typeof args[0] === 'string' ? args[0] : args[0].name);
                            try {
                                target.delete(...args);
                                return wrappedCookies;
                            } finally{
                                updateResponseCookies();
                            }
                        };
                    case 'set':
                        return function(...args) {
                            modifiedCookies.add(typeof args[0] === 'string' ? args[0] : args[0].name);
                            try {
                                target.set(...args);
                                return wrappedCookies;
                            } finally{
                                updateResponseCookies();
                            }
                        };
                    default:
                        return _reflect.ReflectAdapter.get(target, prop, receiver);
                }
            }
        });
        return wrappedCookies;
    }
}
function createCookiesWithMutableAccessCheck(requestStore) {
    const wrappedCookies = new Proxy(requestStore.mutableCookies, {
        get (target, prop, receiver) {
            switch(prop){
                case 'delete':
                    return function(...args) {
                        ensureCookiesAreStillMutable(requestStore, 'cookies().delete');
                        target.delete(...args);
                        return wrappedCookies;
                    };
                case 'set':
                    return function(...args) {
                        ensureCookiesAreStillMutable(requestStore, 'cookies().set');
                        target.set(...args);
                        return wrappedCookies;
                    };
                default:
                    return _reflect.ReflectAdapter.get(target, prop, receiver);
            }
        }
    });
    return wrappedCookies;
}
function areCookiesMutableInCurrentPhase(requestStore) {
    return requestStore.phase === 'action';
}
/** Ensure that cookies() starts throwing on mutation
 * if we changed phases and can no longer mutate.
 *
 * This can happen when going:
 *   'render' -> 'after'
 *   'action' -> 'render'
 * */ function ensureCookiesAreStillMutable(requestStore, _callingExpression) {
    if (!areCookiesMutableInCurrentPhase(requestStore)) {
        // TODO: maybe we can give a more precise error message based on callingExpression?
        throw new ReadonlyRequestCookiesError();
    }
}
function responseCookiesToRequestCookies(responseCookies) {
    const requestCookies = new _cookies.RequestCookies(new Headers());
    for (const cookie of responseCookies.getAll()){
        requestCookies.set(cookie);
    }
    return requestCookies;
} //# sourceMappingURL=request-cookies.js.map
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/dist/client/components/hooks-server-context.js [app-rsc] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
0 && (module.exports = {
    DynamicServerError: null,
    isDynamicServerError: null
});
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: all[name]
    });
}
_export(exports, {
    DynamicServerError: function() {
        return DynamicServerError;
    },
    isDynamicServerError: function() {
        return isDynamicServerError;
    }
});
const DYNAMIC_ERROR_CODE = 'DYNAMIC_SERVER_USAGE';
class DynamicServerError extends Error {
    constructor(description){
        super(`Dynamic server usage: ${description}`), this.description = description, this.digest = DYNAMIC_ERROR_CODE;
    }
}
function isDynamicServerError(err) {
    if (typeof err !== 'object' || err === null || !('digest' in err) || typeof err.digest !== 'string') {
        return false;
    }
    return err.digest === DYNAMIC_ERROR_CODE;
}
if ((typeof exports.default === 'function' || typeof exports.default === 'object' && exports.default !== null) && typeof exports.default.__esModule === 'undefined') {
    Object.defineProperty(exports.default, '__esModule', {
        value: true
    });
    Object.assign(exports.default, exports);
    module.exports = exports.default;
} //# sourceMappingURL=hooks-server-context.js.map
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/dist/client/components/static-generation-bailout.js [app-rsc] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
0 && (module.exports = {
    StaticGenBailoutError: null,
    isStaticGenBailoutError: null
});
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: all[name]
    });
}
_export(exports, {
    StaticGenBailoutError: function() {
        return StaticGenBailoutError;
    },
    isStaticGenBailoutError: function() {
        return isStaticGenBailoutError;
    }
});
const NEXT_STATIC_GEN_BAILOUT = 'NEXT_STATIC_GEN_BAILOUT';
class StaticGenBailoutError extends Error {
    constructor(...args){
        super(...args), this.code = NEXT_STATIC_GEN_BAILOUT;
    }
}
function isStaticGenBailoutError(error) {
    if (typeof error !== 'object' || error === null || !('code' in error)) {
        return false;
    }
    return error.code === NEXT_STATIC_GEN_BAILOUT;
}
if ((typeof exports.default === 'function' || typeof exports.default === 'object' && exports.default !== null) && typeof exports.default.__esModule === 'undefined') {
    Object.defineProperty(exports.default, '__esModule', {
        value: true
    });
    Object.assign(exports.default, exports);
    module.exports = exports.default;
} //# sourceMappingURL=static-generation-bailout.js.map
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/dist/server/dynamic-rendering-utils.js [app-rsc] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
0 && (module.exports = {
    isHangingPromiseRejectionError: null,
    makeDevtoolsIOAwarePromise: null,
    makeHangingPromise: null
});
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: all[name]
    });
}
_export(exports, {
    isHangingPromiseRejectionError: function() {
        return isHangingPromiseRejectionError;
    },
    makeDevtoolsIOAwarePromise: function() {
        return makeDevtoolsIOAwarePromise;
    },
    makeHangingPromise: function() {
        return makeHangingPromise;
    }
});
function isHangingPromiseRejectionError(err) {
    if (typeof err !== 'object' || err === null || !('digest' in err)) {
        return false;
    }
    return err.digest === HANGING_PROMISE_REJECTION;
}
const HANGING_PROMISE_REJECTION = 'HANGING_PROMISE_REJECTION';
class HangingPromiseRejectionError extends Error {
    constructor(route, expression){
        super(`During prerendering, ${expression} rejects when the prerender is complete. Typically these errors are handled by React but if you move ${expression} to a different context by using \`setTimeout\`, \`after\`, or similar functions you may observe this error and you should handle it in that context. This occurred at route "${route}".`), this.route = route, this.expression = expression, this.digest = HANGING_PROMISE_REJECTION;
    }
}
const abortListenersBySignal = new WeakMap();
function makeHangingPromise(signal, route, expression) {
    if (signal.aborted) {
        return Promise.reject(new HangingPromiseRejectionError(route, expression));
    } else {
        const hangingPromise = new Promise((_, reject)=>{
            const boundRejection = reject.bind(null, new HangingPromiseRejectionError(route, expression));
            let currentListeners = abortListenersBySignal.get(signal);
            if (currentListeners) {
                currentListeners.push(boundRejection);
            } else {
                const listeners = [
                    boundRejection
                ];
                abortListenersBySignal.set(signal, listeners);
                signal.addEventListener('abort', ()=>{
                    for(let i = 0; i < listeners.length; i++){
                        listeners[i]();
                    }
                }, {
                    once: true
                });
            }
        });
        // We are fine if no one actually awaits this promise. We shouldn't consider this an unhandled rejection so
        // we attach a noop catch handler here to suppress this warning. If you actually await somewhere or construct
        // your own promise out of it you'll need to ensure you handle the error when it rejects.
        hangingPromise.catch(ignoreReject);
        return hangingPromise;
    }
}
function ignoreReject() {}
function makeDevtoolsIOAwarePromise(underlying, requestStore, stage) {
    if (requestStore.stagedRendering) {
        // We resolve each stage in a timeout, so React DevTools will pick this up as IO.
        return requestStore.stagedRendering.delayUntilStage(stage, undefined, underlying);
    }
    // in React DevTools if we resolve in a setTimeout we will observe
    // the promise resolution as something that can suspend a boundary or root.
    return new Promise((resolve)=>{
        // Must use setTimeout to be considered IO React DevTools. setImmediate will not work.
        setTimeout(()=>{
            resolve(underlying);
        }, 0);
    });
} //# sourceMappingURL=dynamic-rendering-utils.js.map
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/dist/lib/framework/boundary-constants.js [app-rsc] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
0 && (module.exports = {
    METADATA_BOUNDARY_NAME: null,
    OUTLET_BOUNDARY_NAME: null,
    ROOT_LAYOUT_BOUNDARY_NAME: null,
    VIEWPORT_BOUNDARY_NAME: null
});
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: all[name]
    });
}
_export(exports, {
    METADATA_BOUNDARY_NAME: function() {
        return METADATA_BOUNDARY_NAME;
    },
    OUTLET_BOUNDARY_NAME: function() {
        return OUTLET_BOUNDARY_NAME;
    },
    ROOT_LAYOUT_BOUNDARY_NAME: function() {
        return ROOT_LAYOUT_BOUNDARY_NAME;
    },
    VIEWPORT_BOUNDARY_NAME: function() {
        return VIEWPORT_BOUNDARY_NAME;
    }
});
const METADATA_BOUNDARY_NAME = '__next_metadata_boundary__';
const VIEWPORT_BOUNDARY_NAME = '__next_viewport_boundary__';
const OUTLET_BOUNDARY_NAME = '__next_outlet_boundary__';
const ROOT_LAYOUT_BOUNDARY_NAME = '__next_root_layout_boundary__'; //# sourceMappingURL=boundary-constants.js.map
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/dist/lib/scheduler.js [app-rsc] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
0 && (module.exports = {
    atLeastOneTask: null,
    scheduleImmediate: null,
    scheduleOnNextTick: null,
    waitAtLeastOneReactRenderTask: null
});
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: all[name]
    });
}
_export(exports, {
    atLeastOneTask: function() {
        return atLeastOneTask;
    },
    scheduleImmediate: function() {
        return scheduleImmediate;
    },
    scheduleOnNextTick: function() {
        return scheduleOnNextTick;
    },
    waitAtLeastOneReactRenderTask: function() {
        return waitAtLeastOneReactRenderTask;
    }
});
const scheduleOnNextTick = (cb)=>{
    // We use Promise.resolve().then() here so that the operation is scheduled at
    // the end of the promise job queue, we then add it to the next process tick
    // to ensure it's evaluated afterwards.
    //
    // This was inspired by the implementation of the DataLoader interface: https://github.com/graphql/dataloader/blob/d336bd15282664e0be4b4a657cb796f09bafbc6b/src/index.js#L213-L255
    //
    Promise.resolve().then(()=>{
        if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
        ;
        else {
            process.nextTick(cb);
        }
    });
};
const scheduleImmediate = (cb)=>{
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
    else {
        setImmediate(cb);
    }
};
function atLeastOneTask() {
    return new Promise((resolve)=>scheduleImmediate(resolve));
}
function waitAtLeastOneReactRenderTask() {
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
    else {
        return new Promise((r)=>setImmediate(r));
    }
} //# sourceMappingURL=scheduler.js.map
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/dist/shared/lib/lazy-dynamic/bailout-to-csr.js [app-rsc] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

// This has to be a shared module which is shared between client component error boundary and dynamic component
Object.defineProperty(exports, "__esModule", {
    value: true
});
0 && (module.exports = {
    BailoutToCSRError: null,
    isBailoutToCSRError: null
});
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: all[name]
    });
}
_export(exports, {
    BailoutToCSRError: function() {
        return BailoutToCSRError;
    },
    isBailoutToCSRError: function() {
        return isBailoutToCSRError;
    }
});
const BAILOUT_TO_CSR = 'BAILOUT_TO_CLIENT_SIDE_RENDERING';
class BailoutToCSRError extends Error {
    constructor(reason){
        super(`Bail out to client-side rendering: ${reason}`), this.reason = reason, this.digest = BAILOUT_TO_CSR;
    }
}
function isBailoutToCSRError(err) {
    if (typeof err !== 'object' || err === null || !('digest' in err)) {
        return false;
    }
    return err.digest === BAILOUT_TO_CSR;
} //# sourceMappingURL=bailout-to-csr.js.map
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/dist/server/app-render/dynamic-rendering.js [app-rsc] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

/**
 * The functions provided by this module are used to communicate certain properties
 * about the currently running code so that Next.js can make decisions on how to handle
 * the current execution in different rendering modes such as pre-rendering, resuming, and SSR.
 *
 * Today Next.js treats all code as potentially static. Certain APIs may only make sense when dynamically rendering.
 * Traditionally this meant deopting the entire render to dynamic however with PPR we can now deopt parts
 * of a React tree as dynamic while still keeping other parts static. There are really two different kinds of
 * Dynamic indications.
 *
 * The first is simply an intention to be dynamic. unstable_noStore is an example of this where
 * the currently executing code simply declares that the current scope is dynamic but if you use it
 * inside unstable_cache it can still be cached. This type of indication can be removed if we ever
 * make the default dynamic to begin with because the only way you would ever be static is inside
 * a cache scope which this indication does not affect.
 *
 * The second is an indication that a dynamic data source was read. This is a stronger form of dynamic
 * because it means that it is inappropriate to cache this at all. using a dynamic data source inside
 * unstable_cache should error. If you want to use some dynamic data inside unstable_cache you should
 * read that data outside the cache and pass it in as an argument to the cached function.
 */ Object.defineProperty(exports, "__esModule", {
    value: true
});
0 && (module.exports = {
    Postpone: null,
    PreludeState: null,
    abortAndThrowOnSynchronousRequestDataAccess: null,
    abortOnSynchronousPlatformIOAccess: null,
    accessedDynamicData: null,
    annotateDynamicAccess: null,
    consumeDynamicAccess: null,
    createDynamicTrackingState: null,
    createDynamicValidationState: null,
    createHangingInputAbortSignal: null,
    createRenderInBrowserAbortSignal: null,
    delayUntilRuntimeStage: null,
    formatDynamicAPIAccesses: null,
    getFirstDynamicReason: null,
    getStaticShellDisallowedDynamicReasons: null,
    isDynamicPostpone: null,
    isPrerenderInterruptedError: null,
    logDisallowedDynamicError: null,
    markCurrentScopeAsDynamic: null,
    postponeWithTracking: null,
    throwIfDisallowedDynamic: null,
    throwToInterruptStaticGeneration: null,
    trackAllowedDynamicAccess: null,
    trackDynamicDataInDynamicRender: null,
    trackDynamicHoleInRuntimeShell: null,
    trackDynamicHoleInStaticShell: null,
    useDynamicRouteParams: null,
    useDynamicSearchParams: null
});
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: all[name]
    });
}
_export(exports, {
    Postpone: function() {
        return Postpone;
    },
    PreludeState: function() {
        return PreludeState;
    },
    abortAndThrowOnSynchronousRequestDataAccess: function() {
        return abortAndThrowOnSynchronousRequestDataAccess;
    },
    abortOnSynchronousPlatformIOAccess: function() {
        return abortOnSynchronousPlatformIOAccess;
    },
    accessedDynamicData: function() {
        return accessedDynamicData;
    },
    annotateDynamicAccess: function() {
        return annotateDynamicAccess;
    },
    consumeDynamicAccess: function() {
        return consumeDynamicAccess;
    },
    createDynamicTrackingState: function() {
        return createDynamicTrackingState;
    },
    createDynamicValidationState: function() {
        return createDynamicValidationState;
    },
    createHangingInputAbortSignal: function() {
        return createHangingInputAbortSignal;
    },
    createRenderInBrowserAbortSignal: function() {
        return createRenderInBrowserAbortSignal;
    },
    delayUntilRuntimeStage: function() {
        return delayUntilRuntimeStage;
    },
    formatDynamicAPIAccesses: function() {
        return formatDynamicAPIAccesses;
    },
    getFirstDynamicReason: function() {
        return getFirstDynamicReason;
    },
    getStaticShellDisallowedDynamicReasons: function() {
        return getStaticShellDisallowedDynamicReasons;
    },
    isDynamicPostpone: function() {
        return isDynamicPostpone;
    },
    isPrerenderInterruptedError: function() {
        return isPrerenderInterruptedError;
    },
    logDisallowedDynamicError: function() {
        return logDisallowedDynamicError;
    },
    markCurrentScopeAsDynamic: function() {
        return markCurrentScopeAsDynamic;
    },
    postponeWithTracking: function() {
        return postponeWithTracking;
    },
    throwIfDisallowedDynamic: function() {
        return throwIfDisallowedDynamic;
    },
    throwToInterruptStaticGeneration: function() {
        return throwToInterruptStaticGeneration;
    },
    trackAllowedDynamicAccess: function() {
        return trackAllowedDynamicAccess;
    },
    trackDynamicDataInDynamicRender: function() {
        return trackDynamicDataInDynamicRender;
    },
    trackDynamicHoleInRuntimeShell: function() {
        return trackDynamicHoleInRuntimeShell;
    },
    trackDynamicHoleInStaticShell: function() {
        return trackDynamicHoleInStaticShell;
    },
    useDynamicRouteParams: function() {
        return useDynamicRouteParams;
    },
    useDynamicSearchParams: function() {
        return useDynamicSearchParams;
    }
});
const _react = /*#__PURE__*/ _interop_require_default(__turbopack_context__.r("[project]/code/planetaryescape/blah.chat/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react.js [app-rsc] (ecmascript)"));
const _hooksservercontext = __turbopack_context__.r("[project]/code/planetaryescape/blah.chat/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/dist/client/components/hooks-server-context.js [app-rsc] (ecmascript)");
const _staticgenerationbailout = __turbopack_context__.r("[project]/code/planetaryescape/blah.chat/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/dist/client/components/static-generation-bailout.js [app-rsc] (ecmascript)");
const _workunitasyncstorageexternal = __turbopack_context__.r("[externals]/next/dist/server/app-render/work-unit-async-storage.external.js [external] (next/dist/server/app-render/work-unit-async-storage.external.js, cjs)");
const _workasyncstorageexternal = __turbopack_context__.r("[externals]/next/dist/server/app-render/work-async-storage.external.js [external] (next/dist/server/app-render/work-async-storage.external.js, cjs)");
const _dynamicrenderingutils = __turbopack_context__.r("[project]/code/planetaryescape/blah.chat/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/dist/server/dynamic-rendering-utils.js [app-rsc] (ecmascript)");
const _boundaryconstants = __turbopack_context__.r("[project]/code/planetaryescape/blah.chat/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/dist/lib/framework/boundary-constants.js [app-rsc] (ecmascript)");
const _scheduler = __turbopack_context__.r("[project]/code/planetaryescape/blah.chat/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/dist/lib/scheduler.js [app-rsc] (ecmascript)");
const _bailouttocsr = __turbopack_context__.r("[project]/code/planetaryescape/blah.chat/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/dist/shared/lib/lazy-dynamic/bailout-to-csr.js [app-rsc] (ecmascript)");
const _invarianterror = __turbopack_context__.r("[project]/code/planetaryescape/blah.chat/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/dist/shared/lib/invariant-error.js [app-rsc] (ecmascript)");
function _interop_require_default(obj) {
    return obj && obj.__esModule ? obj : {
        default: obj
    };
}
const hasPostpone = typeof _react.default.unstable_postpone === 'function';
function createDynamicTrackingState(isDebugDynamicAccesses) {
    return {
        isDebugDynamicAccesses,
        dynamicAccesses: [],
        syncDynamicErrorWithStack: null
    };
}
function createDynamicValidationState() {
    return {
        hasSuspenseAboveBody: false,
        hasDynamicMetadata: false,
        dynamicMetadata: null,
        hasDynamicViewport: false,
        hasAllowedDynamic: false,
        dynamicErrors: []
    };
}
function getFirstDynamicReason(trackingState) {
    var _trackingState_dynamicAccesses_;
    return (_trackingState_dynamicAccesses_ = trackingState.dynamicAccesses[0]) == null ? void 0 : _trackingState_dynamicAccesses_.expression;
}
function markCurrentScopeAsDynamic(store, workUnitStore, expression) {
    if (workUnitStore) {
        switch(workUnitStore.type){
            case 'cache':
            case 'unstable-cache':
                // Inside cache scopes, marking a scope as dynamic has no effect,
                // because the outer cache scope creates a cache boundary. This is
                // subtly different from reading a dynamic data source, which is
                // forbidden inside a cache scope.
                return;
            case 'private-cache':
                // A private cache scope is already dynamic by definition.
                return;
            case 'prerender-legacy':
            case 'prerender-ppr':
            case 'request':
                break;
            default:
                workUnitStore;
        }
    }
    // If we're forcing dynamic rendering or we're forcing static rendering, we
    // don't need to do anything here because the entire page is already dynamic
    // or it's static and it should not throw or postpone here.
    if (store.forceDynamic || store.forceStatic) return;
    if (store.dynamicShouldError) {
        throw Object.defineProperty(new _staticgenerationbailout.StaticGenBailoutError(`Route ${store.route} with \`dynamic = "error"\` couldn't be rendered statically because it used \`${expression}\`. See more info here: https://nextjs.org/docs/app/building-your-application/rendering/static-and-dynamic#dynamic-rendering`), "__NEXT_ERROR_CODE", {
            value: "E553",
            enumerable: false,
            configurable: true
        });
    }
    if (workUnitStore) {
        switch(workUnitStore.type){
            case 'prerender-ppr':
                return postponeWithTracking(store.route, expression, workUnitStore.dynamicTracking);
            case 'prerender-legacy':
                workUnitStore.revalidate = 0;
                // We aren't prerendering, but we are generating a static page. We need
                // to bail out of static generation.
                const err = Object.defineProperty(new _hooksservercontext.DynamicServerError(`Route ${store.route} couldn't be rendered statically because it used ${expression}. See more info here: https://nextjs.org/docs/messages/dynamic-server-error`), "__NEXT_ERROR_CODE", {
                    value: "E550",
                    enumerable: false,
                    configurable: true
                });
                store.dynamicUsageDescription = expression;
                store.dynamicUsageStack = err.stack;
                throw err;
            case 'request':
                if ("TURBOPACK compile-time truthy", 1) {
                    workUnitStore.usedDynamic = true;
                }
                break;
            default:
                workUnitStore;
        }
    }
}
function throwToInterruptStaticGeneration(expression, store, prerenderStore) {
    // We aren't prerendering but we are generating a static page. We need to bail out of static generation
    const err = Object.defineProperty(new _hooksservercontext.DynamicServerError(`Route ${store.route} couldn't be rendered statically because it used \`${expression}\`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error`), "__NEXT_ERROR_CODE", {
        value: "E558",
        enumerable: false,
        configurable: true
    });
    prerenderStore.revalidate = 0;
    store.dynamicUsageDescription = expression;
    store.dynamicUsageStack = err.stack;
    throw err;
}
function trackDynamicDataInDynamicRender(workUnitStore) {
    switch(workUnitStore.type){
        case 'cache':
        case 'unstable-cache':
            // Inside cache scopes, marking a scope as dynamic has no effect,
            // because the outer cache scope creates a cache boundary. This is
            // subtly different from reading a dynamic data source, which is
            // forbidden inside a cache scope.
            return;
        case 'private-cache':
            // A private cache scope is already dynamic by definition.
            return;
        case 'prerender':
        case 'prerender-runtime':
        case 'prerender-legacy':
        case 'prerender-ppr':
        case 'prerender-client':
            break;
        case 'request':
            if ("TURBOPACK compile-time truthy", 1) {
                workUnitStore.usedDynamic = true;
            }
            break;
        default:
            workUnitStore;
    }
}
function abortOnSynchronousDynamicDataAccess(route, expression, prerenderStore) {
    const reason = `Route ${route} needs to bail out of prerendering at this point because it used ${expression}.`;
    const error = createPrerenderInterruptedError(reason);
    prerenderStore.controller.abort(error);
    const dynamicTracking = prerenderStore.dynamicTracking;
    if (dynamicTracking) {
        dynamicTracking.dynamicAccesses.push({
            // When we aren't debugging, we don't need to create another error for the
            // stack trace.
            stack: dynamicTracking.isDebugDynamicAccesses ? new Error().stack : undefined,
            expression
        });
    }
}
function abortOnSynchronousPlatformIOAccess(route, expression, errorWithStack, prerenderStore) {
    const dynamicTracking = prerenderStore.dynamicTracking;
    abortOnSynchronousDynamicDataAccess(route, expression, prerenderStore);
    // It is important that we set this tracking value after aborting. Aborts are executed
    // synchronously except for the case where you abort during render itself. By setting this
    // value late we can use it to determine if any of the aborted tasks are the task that
    // called the sync IO expression in the first place.
    if (dynamicTracking) {
        if (dynamicTracking.syncDynamicErrorWithStack === null) {
            dynamicTracking.syncDynamicErrorWithStack = errorWithStack;
        }
    }
}
function abortAndThrowOnSynchronousRequestDataAccess(route, expression, errorWithStack, prerenderStore) {
    const prerenderSignal = prerenderStore.controller.signal;
    if (prerenderSignal.aborted === false) {
        // TODO it would be better to move this aborted check into the callsite so we can avoid making
        // the error object when it isn't relevant to the aborting of the prerender however
        // since we need the throw semantics regardless of whether we abort it is easier to land
        // this way. See how this was handled with `abortOnSynchronousPlatformIOAccess` for a closer
        // to ideal implementation
        abortOnSynchronousDynamicDataAccess(route, expression, prerenderStore);
        // It is important that we set this tracking value after aborting. Aborts are executed
        // synchronously except for the case where you abort during render itself. By setting this
        // value late we can use it to determine if any of the aborted tasks are the task that
        // called the sync IO expression in the first place.
        const dynamicTracking = prerenderStore.dynamicTracking;
        if (dynamicTracking) {
            if (dynamicTracking.syncDynamicErrorWithStack === null) {
                dynamicTracking.syncDynamicErrorWithStack = errorWithStack;
            }
        }
    }
    throw createPrerenderInterruptedError(`Route ${route} needs to bail out of prerendering at this point because it used ${expression}.`);
}
function Postpone({ reason, route }) {
    const prerenderStore = _workunitasyncstorageexternal.workUnitAsyncStorage.getStore();
    const dynamicTracking = prerenderStore && prerenderStore.type === 'prerender-ppr' ? prerenderStore.dynamicTracking : null;
    postponeWithTracking(route, reason, dynamicTracking);
}
function postponeWithTracking(route, expression, dynamicTracking) {
    assertPostpone();
    if (dynamicTracking) {
        dynamicTracking.dynamicAccesses.push({
            // When we aren't debugging, we don't need to create another error for the
            // stack trace.
            stack: dynamicTracking.isDebugDynamicAccesses ? new Error().stack : undefined,
            expression
        });
    }
    _react.default.unstable_postpone(createPostponeReason(route, expression));
}
function createPostponeReason(route, expression) {
    return `Route ${route} needs to bail out of prerendering at this point because it used ${expression}. ` + `React throws this special object to indicate where. It should not be caught by ` + `your own try/catch. Learn more: https://nextjs.org/docs/messages/ppr-caught-error`;
}
function isDynamicPostpone(err) {
    if (typeof err === 'object' && err !== null && typeof err.message === 'string') {
        return isDynamicPostponeReason(err.message);
    }
    return false;
}
function isDynamicPostponeReason(reason) {
    return reason.includes('needs to bail out of prerendering at this point because it used') && reason.includes('Learn more: https://nextjs.org/docs/messages/ppr-caught-error');
}
if (isDynamicPostponeReason(createPostponeReason('%%%', '^^^')) === false) {
    throw Object.defineProperty(new Error('Invariant: isDynamicPostpone misidentified a postpone reason. This is a bug in Next.js'), "__NEXT_ERROR_CODE", {
        value: "E296",
        enumerable: false,
        configurable: true
    });
}
const NEXT_PRERENDER_INTERRUPTED = 'NEXT_PRERENDER_INTERRUPTED';
function createPrerenderInterruptedError(message) {
    const error = Object.defineProperty(new Error(message), "__NEXT_ERROR_CODE", {
        value: "E394",
        enumerable: false,
        configurable: true
    });
    error.digest = NEXT_PRERENDER_INTERRUPTED;
    return error;
}
function isPrerenderInterruptedError(error) {
    return typeof error === 'object' && error !== null && error.digest === NEXT_PRERENDER_INTERRUPTED && 'name' in error && 'message' in error && error instanceof Error;
}
function accessedDynamicData(dynamicAccesses) {
    return dynamicAccesses.length > 0;
}
function consumeDynamicAccess(serverDynamic, clientDynamic) {
    // We mutate because we only call this once we are no longer writing
    // to the dynamicTrackingState and it's more efficient than creating a new
    // array.
    serverDynamic.dynamicAccesses.push(...clientDynamic.dynamicAccesses);
    return serverDynamic.dynamicAccesses;
}
function formatDynamicAPIAccesses(dynamicAccesses) {
    return dynamicAccesses.filter((access)=>typeof access.stack === 'string' && access.stack.length > 0).map(({ expression, stack })=>{
        stack = stack.split('\n') // Remove the "Error: " prefix from the first line of the stack trace as
        // well as the first 4 lines of the stack trace which is the distance
        // from the user code and the `new Error().stack` call.
        .slice(4).filter((line)=>{
            // Exclude Next.js internals from the stack trace.
            if (line.includes('node_modules/next/')) {
                return false;
            }
            // Exclude anonymous functions from the stack trace.
            if (line.includes(' (<anonymous>)')) {
                return false;
            }
            // Exclude Node.js internals from the stack trace.
            if (line.includes(' (node:')) {
                return false;
            }
            return true;
        }).join('\n');
        return `Dynamic API Usage Debug - ${expression}:\n${stack}`;
    });
}
function assertPostpone() {
    if (!hasPostpone) {
        throw Object.defineProperty(new Error(`Invariant: React.unstable_postpone is not defined. This suggests the wrong version of React was loaded. This is a bug in Next.js`), "__NEXT_ERROR_CODE", {
            value: "E224",
            enumerable: false,
            configurable: true
        });
    }
}
function createRenderInBrowserAbortSignal() {
    const controller = new AbortController();
    controller.abort(Object.defineProperty(new _bailouttocsr.BailoutToCSRError('Render in Browser'), "__NEXT_ERROR_CODE", {
        value: "E721",
        enumerable: false,
        configurable: true
    }));
    return controller.signal;
}
function createHangingInputAbortSignal(workUnitStore) {
    switch(workUnitStore.type){
        case 'prerender':
        case 'prerender-runtime':
            const controller = new AbortController();
            if (workUnitStore.cacheSignal) {
                // If we have a cacheSignal it means we're in a prospective render. If
                // the input we're waiting on is coming from another cache, we do want
                // to wait for it so that we can resolve this cache entry too.
                workUnitStore.cacheSignal.inputReady().then(()=>{
                    controller.abort();
                });
            } else {
                // Otherwise we're in the final render and we should already have all
                // our caches filled.
                // If the prerender uses stages, we have wait until the runtime stage,
                // at which point all runtime inputs will be resolved.
                // (otherwise, a runtime prerender might consider `cookies()` hanging
                //  even though they'd resolve in the next task.)
                //
                // We might still be waiting on some microtasks so we
                // wait one tick before giving up. When we give up, we still want to
                // render the content of this cache as deeply as we can so that we can
                // suspend as deeply as possible in the tree or not at all if we don't
                // end up waiting for the input.
                const runtimeStagePromise = (0, _workunitasyncstorageexternal.getRuntimeStagePromise)(workUnitStore);
                if (runtimeStagePromise) {
                    runtimeStagePromise.then(()=>(0, _scheduler.scheduleOnNextTick)(()=>controller.abort()));
                } else {
                    (0, _scheduler.scheduleOnNextTick)(()=>controller.abort());
                }
            }
            return controller.signal;
        case 'prerender-client':
        case 'prerender-ppr':
        case 'prerender-legacy':
        case 'request':
        case 'cache':
        case 'private-cache':
        case 'unstable-cache':
            return undefined;
        default:
            workUnitStore;
    }
}
function annotateDynamicAccess(expression, prerenderStore) {
    const dynamicTracking = prerenderStore.dynamicTracking;
    if (dynamicTracking) {
        dynamicTracking.dynamicAccesses.push({
            stack: dynamicTracking.isDebugDynamicAccesses ? new Error().stack : undefined,
            expression
        });
    }
}
function useDynamicRouteParams(expression) {
    const workStore = _workasyncstorageexternal.workAsyncStorage.getStore();
    const workUnitStore = _workunitasyncstorageexternal.workUnitAsyncStorage.getStore();
    if (workStore && workUnitStore) {
        switch(workUnitStore.type){
            case 'prerender-client':
            case 'prerender':
                {
                    const fallbackParams = workUnitStore.fallbackRouteParams;
                    if (fallbackParams && fallbackParams.size > 0) {
                        // We are in a prerender with cacheComponents semantics. We are going to
                        // hang here and never resolve. This will cause the currently
                        // rendering component to effectively be a dynamic hole.
                        _react.default.use((0, _dynamicrenderingutils.makeHangingPromise)(workUnitStore.renderSignal, workStore.route, expression));
                    }
                    break;
                }
            case 'prerender-ppr':
                {
                    const fallbackParams = workUnitStore.fallbackRouteParams;
                    if (fallbackParams && fallbackParams.size > 0) {
                        return postponeWithTracking(workStore.route, expression, workUnitStore.dynamicTracking);
                    }
                    break;
                }
            case 'prerender-runtime':
                throw Object.defineProperty(new _invarianterror.InvariantError(`\`${expression}\` was called during a runtime prerender. Next.js should be preventing ${expression} from being included in server components statically, but did not in this case.`), "__NEXT_ERROR_CODE", {
                    value: "E771",
                    enumerable: false,
                    configurable: true
                });
            case 'cache':
            case 'private-cache':
                throw Object.defineProperty(new _invarianterror.InvariantError(`\`${expression}\` was called inside a cache scope. Next.js should be preventing ${expression} from being included in server components statically, but did not in this case.`), "__NEXT_ERROR_CODE", {
                    value: "E745",
                    enumerable: false,
                    configurable: true
                });
            case 'prerender-legacy':
            case 'request':
            case 'unstable-cache':
                break;
            default:
                workUnitStore;
        }
    }
}
function useDynamicSearchParams(expression) {
    const workStore = _workasyncstorageexternal.workAsyncStorage.getStore();
    const workUnitStore = _workunitasyncstorageexternal.workUnitAsyncStorage.getStore();
    if (!workStore) {
        // We assume pages router context and just return
        return;
    }
    if (!workUnitStore) {
        (0, _workunitasyncstorageexternal.throwForMissingRequestStore)(expression);
    }
    switch(workUnitStore.type){
        case 'prerender-client':
            {
                _react.default.use((0, _dynamicrenderingutils.makeHangingPromise)(workUnitStore.renderSignal, workStore.route, expression));
                break;
            }
        case 'prerender-legacy':
        case 'prerender-ppr':
            {
                if (workStore.forceStatic) {
                    return;
                }
                throw Object.defineProperty(new _bailouttocsr.BailoutToCSRError(expression), "__NEXT_ERROR_CODE", {
                    value: "E394",
                    enumerable: false,
                    configurable: true
                });
            }
        case 'prerender':
        case 'prerender-runtime':
            throw Object.defineProperty(new _invarianterror.InvariantError(`\`${expression}\` was called from a Server Component. Next.js should be preventing ${expression} from being included in server components statically, but did not in this case.`), "__NEXT_ERROR_CODE", {
                value: "E795",
                enumerable: false,
                configurable: true
            });
        case 'cache':
        case 'unstable-cache':
        case 'private-cache':
            throw Object.defineProperty(new _invarianterror.InvariantError(`\`${expression}\` was called inside a cache scope. Next.js should be preventing ${expression} from being included in server components statically, but did not in this case.`), "__NEXT_ERROR_CODE", {
                value: "E745",
                enumerable: false,
                configurable: true
            });
        case 'request':
            return;
        default:
            workUnitStore;
    }
}
const hasSuspenseRegex = /\n\s+at Suspense \(<anonymous>\)/;
// Common implicit body tags that React will treat as body when placed directly in html
const bodyAndImplicitTags = 'body|div|main|section|article|aside|header|footer|nav|form|p|span|h1|h2|h3|h4|h5|h6';
// Detects when RootLayoutBoundary (our framework marker component) appears
// after Suspense in the component stack, indicating the root layout is wrapped
// within a Suspense boundary. Ensures no body/html/implicit-body components are in between.
//
// Example matches:
//   at Suspense (<anonymous>)
//   at __next_root_layout_boundary__ (<anonymous>)
//
// Or with other components in between (but not body/html/implicit-body):
//   at Suspense (<anonymous>)
//   at SomeComponent (<anonymous>)
//   at __next_root_layout_boundary__ (<anonymous>)
const hasSuspenseBeforeRootLayoutWithoutBodyOrImplicitBodyRegex = new RegExp(`\\n\\s+at Suspense \\(<anonymous>\\)(?:(?!\\n\\s+at (?:${bodyAndImplicitTags}) \\(<anonymous>\\))[\\s\\S])*?\\n\\s+at ${_boundaryconstants.ROOT_LAYOUT_BOUNDARY_NAME} \\([^\\n]*\\)`);
const hasMetadataRegex = new RegExp(`\\n\\s+at ${_boundaryconstants.METADATA_BOUNDARY_NAME}[\\n\\s]`);
const hasViewportRegex = new RegExp(`\\n\\s+at ${_boundaryconstants.VIEWPORT_BOUNDARY_NAME}[\\n\\s]`);
const hasOutletRegex = new RegExp(`\\n\\s+at ${_boundaryconstants.OUTLET_BOUNDARY_NAME}[\\n\\s]`);
function trackAllowedDynamicAccess(workStore, componentStack, dynamicValidation, clientDynamic) {
    if (hasOutletRegex.test(componentStack)) {
        // We don't need to track that this is dynamic. It is only so when something else is also dynamic.
        return;
    } else if (hasMetadataRegex.test(componentStack)) {
        dynamicValidation.hasDynamicMetadata = true;
        return;
    } else if (hasViewportRegex.test(componentStack)) {
        dynamicValidation.hasDynamicViewport = true;
        return;
    } else if (hasSuspenseBeforeRootLayoutWithoutBodyOrImplicitBodyRegex.test(componentStack)) {
        // For Suspense within body, the prelude wouldn't be empty so it wouldn't violate the empty static shells rule.
        // But if you have Suspense above body, the prelude is empty but we allow that because having Suspense
        // is an explicit signal from the user that they acknowledge the empty shell and want dynamic rendering.
        dynamicValidation.hasAllowedDynamic = true;
        dynamicValidation.hasSuspenseAboveBody = true;
        return;
    } else if (hasSuspenseRegex.test(componentStack)) {
        // this error had a Suspense boundary above it so we don't need to report it as a source
        // of disallowed
        dynamicValidation.hasAllowedDynamic = true;
        return;
    } else if (clientDynamic.syncDynamicErrorWithStack) {
        // This task was the task that called the sync error.
        dynamicValidation.dynamicErrors.push(clientDynamic.syncDynamicErrorWithStack);
        return;
    } else {
        const message = `Route "${workStore.route}": Uncached data was accessed outside of ` + '<Suspense>. This delays the entire page from rendering, resulting in a ' + 'slow user experience. Learn more: ' + 'https://nextjs.org/docs/messages/blocking-route';
        const error = createErrorWithComponentOrOwnerStack(message, componentStack);
        dynamicValidation.dynamicErrors.push(error);
        return;
    }
}
function trackDynamicHoleInRuntimeShell(workStore, componentStack, dynamicValidation, clientDynamic) {
    if (hasOutletRegex.test(componentStack)) {
        // We don't need to track that this is dynamic. It is only so when something else is also dynamic.
        return;
    } else if (hasMetadataRegex.test(componentStack)) {
        const message = `Route "${workStore.route}": Uncached data or \`connection()\` was accessed inside \`generateMetadata\`. Except for this instance, the page would have been entirely prerenderable which may have been the intended behavior. See more info here: https://nextjs.org/docs/messages/next-prerender-dynamic-metadata`;
        const error = createErrorWithComponentOrOwnerStack(message, componentStack);
        dynamicValidation.dynamicMetadata = error;
        return;
    } else if (hasViewportRegex.test(componentStack)) {
        const message = `Route "${workStore.route}": Uncached data or \`connection()\` was accessed inside \`generateViewport\`. This delays the entire page from rendering, resulting in a slow user experience. Learn more: https://nextjs.org/docs/messages/next-prerender-dynamic-viewport`;
        const error = createErrorWithComponentOrOwnerStack(message, componentStack);
        dynamicValidation.dynamicErrors.push(error);
        return;
    } else if (hasSuspenseBeforeRootLayoutWithoutBodyOrImplicitBodyRegex.test(componentStack)) {
        // For Suspense within body, the prelude wouldn't be empty so it wouldn't violate the empty static shells rule.
        // But if you have Suspense above body, the prelude is empty but we allow that because having Suspense
        // is an explicit signal from the user that they acknowledge the empty shell and want dynamic rendering.
        dynamicValidation.hasAllowedDynamic = true;
        dynamicValidation.hasSuspenseAboveBody = true;
        return;
    } else if (hasSuspenseRegex.test(componentStack)) {
        // this error had a Suspense boundary above it so we don't need to report it as a source
        // of disallowed
        dynamicValidation.hasAllowedDynamic = true;
        return;
    } else if (clientDynamic.syncDynamicErrorWithStack) {
        // This task was the task that called the sync error.
        dynamicValidation.dynamicErrors.push(clientDynamic.syncDynamicErrorWithStack);
        return;
    } else {
        const message = `Route "${workStore.route}": Uncached data or \`connection()\` was accessed outside of \`<Suspense>\`. This delays the entire page from rendering, resulting in a slow user experience. Learn more: https://nextjs.org/docs/messages/blocking-route`;
        const error = createErrorWithComponentOrOwnerStack(message, componentStack);
        dynamicValidation.dynamicErrors.push(error);
        return;
    }
}
function trackDynamicHoleInStaticShell(workStore, componentStack, dynamicValidation, clientDynamic) {
    if (hasOutletRegex.test(componentStack)) {
        // We don't need to track that this is dynamic. It is only so when something else is also dynamic.
        return;
    } else if (hasMetadataRegex.test(componentStack)) {
        const message = `Route "${workStore.route}": Runtime data such as \`cookies()\`, \`headers()\`, \`params\`, or \`searchParams\` was accessed inside \`generateMetadata\` or you have file-based metadata such as icons that depend on dynamic params segments. Except for this instance, the page would have been entirely prerenderable which may have been the intended behavior. See more info here: https://nextjs.org/docs/messages/next-prerender-dynamic-metadata`;
        const error = createErrorWithComponentOrOwnerStack(message, componentStack);
        dynamicValidation.dynamicMetadata = error;
        return;
    } else if (hasViewportRegex.test(componentStack)) {
        const message = `Route "${workStore.route}": Runtime data such as \`cookies()\`, \`headers()\`, \`params\`, or \`searchParams\` was accessed inside \`generateViewport\`. This delays the entire page from rendering, resulting in a slow user experience. Learn more: https://nextjs.org/docs/messages/next-prerender-dynamic-viewport`;
        const error = createErrorWithComponentOrOwnerStack(message, componentStack);
        dynamicValidation.dynamicErrors.push(error);
        return;
    } else if (hasSuspenseBeforeRootLayoutWithoutBodyOrImplicitBodyRegex.test(componentStack)) {
        // For Suspense within body, the prelude wouldn't be empty so it wouldn't violate the empty static shells rule.
        // But if you have Suspense above body, the prelude is empty but we allow that because having Suspense
        // is an explicit signal from the user that they acknowledge the empty shell and want dynamic rendering.
        dynamicValidation.hasAllowedDynamic = true;
        dynamicValidation.hasSuspenseAboveBody = true;
        return;
    } else if (hasSuspenseRegex.test(componentStack)) {
        // this error had a Suspense boundary above it so we don't need to report it as a source
        // of disallowed
        dynamicValidation.hasAllowedDynamic = true;
        return;
    } else if (clientDynamic.syncDynamicErrorWithStack) {
        // This task was the task that called the sync error.
        dynamicValidation.dynamicErrors.push(clientDynamic.syncDynamicErrorWithStack);
        return;
    } else {
        const message = `Route "${workStore.route}": Runtime data such as \`cookies()\`, \`headers()\`, \`params\`, or \`searchParams\` was accessed outside of \`<Suspense>\`. This delays the entire page from rendering, resulting in a slow user experience. Learn more: https://nextjs.org/docs/messages/blocking-route`;
        const error = createErrorWithComponentOrOwnerStack(message, componentStack);
        dynamicValidation.dynamicErrors.push(error);
        return;
    }
}
/**
 * In dev mode, we prefer using the owner stack, otherwise the provided
 * component stack is used.
 */ function createErrorWithComponentOrOwnerStack(message, componentStack) {
    const ownerStack = ("TURBOPACK compile-time value", "development") !== 'production' && _react.default.captureOwnerStack ? _react.default.captureOwnerStack() : null;
    const error = Object.defineProperty(new Error(message), "__NEXT_ERROR_CODE", {
        value: "E394",
        enumerable: false,
        configurable: true
    });
    // TODO go back to owner stack here if available. This is temporarily using componentStack to get the right
    //
    error.stack = error.name + ': ' + message + (ownerStack || componentStack);
    return error;
}
var PreludeState = /*#__PURE__*/ function(PreludeState) {
    PreludeState[PreludeState["Full"] = 0] = "Full";
    PreludeState[PreludeState["Empty"] = 1] = "Empty";
    PreludeState[PreludeState["Errored"] = 2] = "Errored";
    return PreludeState;
}({});
function logDisallowedDynamicError(workStore, error) {
    console.error(error);
    if (!workStore.dev) {
        if (workStore.hasReadableErrorStacks) {
            console.error(`To get a more detailed stack trace and pinpoint the issue, start the app in development mode by running \`next dev\`, then open "${workStore.route}" in your browser to investigate the error.`);
        } else {
            console.error(`To get a more detailed stack trace and pinpoint the issue, try one of the following:
  - Start the app in development mode by running \`next dev\`, then open "${workStore.route}" in your browser to investigate the error.
  - Rerun the production build with \`next build --debug-prerender\` to generate better stack traces.`);
        }
    }
}
function throwIfDisallowedDynamic(workStore, prelude, dynamicValidation, serverDynamic) {
    if (serverDynamic.syncDynamicErrorWithStack) {
        logDisallowedDynamicError(workStore, serverDynamic.syncDynamicErrorWithStack);
        throw new _staticgenerationbailout.StaticGenBailoutError();
    }
    if (prelude !== 0) {
        if (dynamicValidation.hasSuspenseAboveBody) {
            // This route has opted into allowing fully dynamic rendering
            // by including a Suspense boundary above the body. In this case
            // a lack of a shell is not considered disallowed so we simply return
            return;
        }
        // We didn't have any sync bailouts but there may be user code which
        // blocked the root. We would have captured these during the prerender
        // and can log them here and then terminate the build/validating render
        const dynamicErrors = dynamicValidation.dynamicErrors;
        if (dynamicErrors.length > 0) {
            for(let i = 0; i < dynamicErrors.length; i++){
                logDisallowedDynamicError(workStore, dynamicErrors[i]);
            }
            throw new _staticgenerationbailout.StaticGenBailoutError();
        }
        // If we got this far then the only other thing that could be blocking
        // the root is dynamic Viewport. If this is dynamic then
        // you need to opt into that by adding a Suspense boundary above the body
        // to indicate your are ok with fully dynamic rendering.
        if (dynamicValidation.hasDynamicViewport) {
            console.error(`Route "${workStore.route}" has a \`generateViewport\` that depends on Request data (\`cookies()\`, etc...) or uncached external data (\`fetch(...)\`, etc...) without explicitly allowing fully dynamic rendering. See more info here: https://nextjs.org/docs/messages/next-prerender-dynamic-viewport`);
            throw new _staticgenerationbailout.StaticGenBailoutError();
        }
        if (prelude === 1) {
            // If we ever get this far then we messed up the tracking of invalid dynamic.
            // We still adhere to the constraint that you must produce a shell but invite the
            // user to report this as a bug in Next.js.
            console.error(`Route "${workStore.route}" did not produce a static shell and Next.js was unable to determine a reason. This is a bug in Next.js.`);
            throw new _staticgenerationbailout.StaticGenBailoutError();
        }
    } else {
        if (dynamicValidation.hasAllowedDynamic === false && dynamicValidation.hasDynamicMetadata) {
            console.error(`Route "${workStore.route}" has a \`generateMetadata\` that depends on Request data (\`cookies()\`, etc...) or uncached external data (\`fetch(...)\`, etc...) when the rest of the route does not. See more info here: https://nextjs.org/docs/messages/next-prerender-dynamic-metadata`);
            throw new _staticgenerationbailout.StaticGenBailoutError();
        }
    }
}
function getStaticShellDisallowedDynamicReasons(workStore, prelude, dynamicValidation) {
    if (dynamicValidation.hasSuspenseAboveBody) {
        // This route has opted into allowing fully dynamic rendering
        // by including a Suspense boundary above the body. In this case
        // a lack of a shell is not considered disallowed so we simply return
        return [];
    }
    if (prelude !== 0) {
        // We didn't have any sync bailouts but there may be user code which
        // blocked the root. We would have captured these during the prerender
        // and can log them here and then terminate the build/validating render
        const dynamicErrors = dynamicValidation.dynamicErrors;
        if (dynamicErrors.length > 0) {
            return dynamicErrors;
        }
        if (prelude === 1) {
            // If we ever get this far then we messed up the tracking of invalid dynamic.
            // We still adhere to the constraint that you must produce a shell but invite the
            // user to report this as a bug in Next.js.
            return [
                Object.defineProperty(new _invarianterror.InvariantError(`Route "${workStore.route}" did not produce a static shell and Next.js was unable to determine a reason.`), "__NEXT_ERROR_CODE", {
                    value: "E936",
                    enumerable: false,
                    configurable: true
                })
            ];
        }
    } else {
        // We have a prelude but we might still have dynamic metadata without any other dynamic access
        if (dynamicValidation.hasAllowedDynamic === false && dynamicValidation.dynamicErrors.length === 0 && dynamicValidation.dynamicMetadata) {
            return [
                dynamicValidation.dynamicMetadata
            ];
        }
    }
    // We had a non-empty prelude and there are no dynamic holes
    return [];
}
function delayUntilRuntimeStage(prerenderStore, result) {
    if (prerenderStore.runtimeStagePromise) {
        return prerenderStore.runtimeStagePromise.then(()=>result);
    }
    return result;
} //# sourceMappingURL=dynamic-rendering.js.map
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/dist/server/create-deduped-by-callsite-server-error-logger.js [app-rsc] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "createDedupedByCallsiteServerErrorLoggerDev", {
    enumerable: true,
    get: function() {
        return createDedupedByCallsiteServerErrorLoggerDev;
    }
});
const _react = /*#__PURE__*/ _interop_require_wildcard(__turbopack_context__.r("[project]/code/planetaryescape/blah.chat/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react.js [app-rsc] (ecmascript)"));
function _getRequireWildcardCache(nodeInterop) {
    if (typeof WeakMap !== "function") return null;
    var cacheBabelInterop = new WeakMap();
    var cacheNodeInterop = new WeakMap();
    return (_getRequireWildcardCache = function(nodeInterop) {
        return nodeInterop ? cacheNodeInterop : cacheBabelInterop;
    })(nodeInterop);
}
function _interop_require_wildcard(obj, nodeInterop) {
    if (!nodeInterop && obj && obj.__esModule) {
        return obj;
    }
    if (obj === null || typeof obj !== "object" && typeof obj !== "function") {
        return {
            default: obj
        };
    }
    var cache = _getRequireWildcardCache(nodeInterop);
    if (cache && cache.has(obj)) {
        return cache.get(obj);
    }
    var newObj = {
        __proto__: null
    };
    var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor;
    for(var key in obj){
        if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) {
            var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null;
            if (desc && (desc.get || desc.set)) {
                Object.defineProperty(newObj, key, desc);
            } else {
                newObj[key] = obj[key];
            }
        }
    }
    newObj.default = obj;
    if (cache) {
        cache.set(obj, newObj);
    }
    return newObj;
}
const errorRef = {
    current: null
};
// React.cache is currently only available in canary/experimental React channels.
const cache = typeof _react.cache === 'function' ? _react.cache : (fn)=>fn;
// When Cache Components is enabled, we record these as errors so that they
// are captured by the dev overlay as it's more critical to fix these
// when enabled.
const logErrorOrWarn = ("TURBOPACK compile-time falsy", 0) ? "TURBOPACK unreachable" : console.warn;
// We don't want to dedupe across requests.
// The developer might've just attempted to fix the warning so we should warn again if it still happens.
const flushCurrentErrorIfNew = cache((key)=>{
    try {
        logErrorOrWarn(errorRef.current);
    } finally{
        errorRef.current = null;
    }
});
function createDedupedByCallsiteServerErrorLoggerDev(getMessage) {
    return function logDedupedError(...args) {
        const message = getMessage(...args);
        if ("TURBOPACK compile-time truthy", 1) {
            var _stack;
            const callStackFrames = (_stack = new Error().stack) == null ? void 0 : _stack.split('\n');
            if (callStackFrames === undefined || callStackFrames.length < 4) {
                logErrorOrWarn(message);
            } else {
                // Error:
                //   logDedupedError
                //   asyncApiBeingAccessedSynchronously
                //   <userland callsite>
                // TODO: This breaks if sourcemaps with ignore lists are enabled.
                const key = callStackFrames[4];
                errorRef.current = message;
                flushCurrentErrorIfNew(key);
            }
        } else //TURBOPACK unreachable
        ;
    };
} //# sourceMappingURL=create-deduped-by-callsite-server-error-logger.js.map
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/dist/server/request/utils.js [app-rsc] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
0 && (module.exports = {
    isRequestAPICallableInsideAfter: null,
    throwForSearchParamsAccessInUseCache: null,
    throwWithStaticGenerationBailoutErrorWithDynamicError: null
});
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: all[name]
    });
}
_export(exports, {
    isRequestAPICallableInsideAfter: function() {
        return isRequestAPICallableInsideAfter;
    },
    throwForSearchParamsAccessInUseCache: function() {
        return throwForSearchParamsAccessInUseCache;
    },
    throwWithStaticGenerationBailoutErrorWithDynamicError: function() {
        return throwWithStaticGenerationBailoutErrorWithDynamicError;
    }
});
const _staticgenerationbailout = __turbopack_context__.r("[project]/code/planetaryescape/blah.chat/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/dist/client/components/static-generation-bailout.js [app-rsc] (ecmascript)");
const _aftertaskasyncstorageexternal = __turbopack_context__.r("[externals]/next/dist/server/app-render/after-task-async-storage.external.js [external] (next/dist/server/app-render/after-task-async-storage.external.js, cjs)");
function throwWithStaticGenerationBailoutErrorWithDynamicError(route, expression) {
    throw Object.defineProperty(new _staticgenerationbailout.StaticGenBailoutError(`Route ${route} with \`dynamic = "error"\` couldn't be rendered statically because it used ${expression}. See more info here: https://nextjs.org/docs/app/building-your-application/rendering/static-and-dynamic#dynamic-rendering`), "__NEXT_ERROR_CODE", {
        value: "E543",
        enumerable: false,
        configurable: true
    });
}
function throwForSearchParamsAccessInUseCache(workStore, constructorOpt) {
    const error = Object.defineProperty(new Error(`Route ${workStore.route} used \`searchParams\` inside "use cache". Accessing dynamic request data inside a cache scope is not supported. If you need some search params inside a cached function await \`searchParams\` outside of the cached function and pass only the required search params as arguments to the cached function. See more info here: https://nextjs.org/docs/messages/next-request-in-use-cache`), "__NEXT_ERROR_CODE", {
        value: "E842",
        enumerable: false,
        configurable: true
    });
    Error.captureStackTrace(error, constructorOpt);
    workStore.invalidDynamicUsageError ??= error;
    throw error;
}
function isRequestAPICallableInsideAfter() {
    const afterTaskStore = _aftertaskasyncstorageexternal.afterTaskAsyncStorage.getStore();
    return (afterTaskStore == null ? void 0 : afterTaskStore.rootTaskSpawnPhase) === 'action';
} //# sourceMappingURL=utils.js.map
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/dist/shared/lib/promise-with-resolvers.js [app-rsc] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "createPromiseWithResolvers", {
    enumerable: true,
    get: function() {
        return createPromiseWithResolvers;
    }
});
function createPromiseWithResolvers() {
    // Shim of Stage 4 Promise.withResolvers proposal
    let resolve;
    let reject;
    const promise = new Promise((res, rej)=>{
        resolve = res;
        reject = rej;
    });
    return {
        resolve: resolve,
        reject: reject,
        promise
    };
} //# sourceMappingURL=promise-with-resolvers.js.map
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/dist/server/app-render/staged-rendering.js [app-rsc] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
0 && (module.exports = {
    RenderStage: null,
    StagedRenderingController: null
});
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: all[name]
    });
}
_export(exports, {
    RenderStage: function() {
        return RenderStage;
    },
    StagedRenderingController: function() {
        return StagedRenderingController;
    }
});
const _invarianterror = __turbopack_context__.r("[project]/code/planetaryescape/blah.chat/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/dist/shared/lib/invariant-error.js [app-rsc] (ecmascript)");
const _promisewithresolvers = __turbopack_context__.r("[project]/code/planetaryescape/blah.chat/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/dist/shared/lib/promise-with-resolvers.js [app-rsc] (ecmascript)");
var RenderStage = /*#__PURE__*/ function(RenderStage) {
    RenderStage[RenderStage["Before"] = 1] = "Before";
    RenderStage[RenderStage["Static"] = 2] = "Static";
    RenderStage[RenderStage["Runtime"] = 3] = "Runtime";
    RenderStage[RenderStage["Dynamic"] = 4] = "Dynamic";
    RenderStage[RenderStage["Abandoned"] = 5] = "Abandoned";
    return RenderStage;
}({});
class StagedRenderingController {
    constructor(abortSignal = null, hasRuntimePrefetch){
        this.abortSignal = abortSignal;
        this.hasRuntimePrefetch = hasRuntimePrefetch;
        this.currentStage = 1;
        this.staticInterruptReason = null;
        this.runtimeInterruptReason = null;
        this.staticStageEndTime = Infinity;
        this.runtimeStageEndTime = Infinity;
        this.runtimeStageListeners = [];
        this.dynamicStageListeners = [];
        this.runtimeStagePromise = (0, _promisewithresolvers.createPromiseWithResolvers)();
        this.dynamicStagePromise = (0, _promisewithresolvers.createPromiseWithResolvers)();
        this.mayAbandon = false;
        if (abortSignal) {
            abortSignal.addEventListener('abort', ()=>{
                const { reason } = abortSignal;
                if (this.currentStage < 3) {
                    this.runtimeStagePromise.promise.catch(ignoreReject) // avoid unhandled rejections
                    ;
                    this.runtimeStagePromise.reject(reason);
                }
                if (this.currentStage < 4 || this.currentStage === 5) {
                    this.dynamicStagePromise.promise.catch(ignoreReject) // avoid unhandled rejections
                    ;
                    this.dynamicStagePromise.reject(reason);
                }
            }, {
                once: true
            });
            this.mayAbandon = true;
        }
    }
    onStage(stage, callback) {
        if (this.currentStage >= stage) {
            callback();
        } else if (stage === 3) {
            this.runtimeStageListeners.push(callback);
        } else if (stage === 4) {
            this.dynamicStageListeners.push(callback);
        } else {
            // This should never happen
            throw Object.defineProperty(new _invarianterror.InvariantError(`Invalid render stage: ${stage}`), "__NEXT_ERROR_CODE", {
                value: "E881",
                enumerable: false,
                configurable: true
            });
        }
    }
    canSyncInterrupt() {
        // If we haven't started the render yet, it can't be interrupted.
        if (this.currentStage === 1) {
            return false;
        }
        const boundaryStage = this.hasRuntimePrefetch ? 4 : 3;
        return this.currentStage < boundaryStage;
    }
    syncInterruptCurrentStageWithReason(reason) {
        if (this.currentStage === 1) {
            return;
        }
        // If Sync IO occurs during the initial (abandonable) render, we'll retry it,
        // so we want a slightly different flow.
        // See the implementation of `abandonRenderImpl` for more explanation.
        if (this.mayAbandon) {
            return this.abandonRenderImpl();
        }
        // If we're in the final render, we cannot abandon it. We need to advance to the Dynamic stage
        // and capture the interruption reason.
        switch(this.currentStage){
            case 2:
                {
                    this.staticInterruptReason = reason;
                    this.advanceStage(4);
                    return;
                }
            case 3:
                {
                    // We only error for Sync IO in the runtime stage if the route
                    // is configured to use runtime prefetching.
                    // We do this to reflect the fact that during a runtime prefetch,
                    // Sync IO aborts aborts the render.
                    // Note that `canSyncInterrupt` should prevent us from getting here at all
                    // if runtime prefetching isn't enabled.
                    if (this.hasRuntimePrefetch) {
                        this.runtimeInterruptReason = reason;
                        this.advanceStage(4);
                    }
                    return;
                }
            case 4:
            case 5:
            default:
        }
    }
    getStaticInterruptReason() {
        return this.staticInterruptReason;
    }
    getRuntimeInterruptReason() {
        return this.runtimeInterruptReason;
    }
    getStaticStageEndTime() {
        return this.staticStageEndTime;
    }
    getRuntimeStageEndTime() {
        return this.runtimeStageEndTime;
    }
    abandonRender() {
        if (!this.mayAbandon) {
            throw Object.defineProperty(new _invarianterror.InvariantError('`abandonRender` called on a stage controller that cannot be abandoned.'), "__NEXT_ERROR_CODE", {
                value: "E938",
                enumerable: false,
                configurable: true
            });
        }
        this.abandonRenderImpl();
    }
    abandonRenderImpl() {
        // In staged rendering, only the initial render is abandonable.
        // We can abandon the initial render if
        //   1. We notice a cache miss, and need to wait for caches to fill
        //   2. A sync IO error occurs, and the render should be interrupted
        //      (this might be a lazy intitialization of a module,
        //       so we still want to restart in this case and see if it still occurs)
        // In either case, we'll be doing another render after this one,
        // so we only want to unblock the Runtime stage, not Dynamic, because
        // unblocking the dynamic stage would likely lead to wasted (uncached) IO.
        const { currentStage } = this;
        switch(currentStage){
            case 2:
                {
                    this.currentStage = 5;
                    this.resolveRuntimeStage();
                    return;
                }
            case 3:
                {
                    this.currentStage = 5;
                    return;
                }
            case 4:
            case 1:
            case 5:
                break;
            default:
                {
                    currentStage;
                }
        }
    }
    advanceStage(stage) {
        // If we're already at the target stage or beyond, do nothing.
        // (this can happen e.g. if sync IO advanced us to the dynamic stage)
        if (stage <= this.currentStage) {
            return;
        }
        let currentStage = this.currentStage;
        this.currentStage = stage;
        if (currentStage < 3 && stage >= 3) {
            this.staticStageEndTime = performance.now() + performance.timeOrigin;
            this.resolveRuntimeStage();
        }
        if (currentStage < 4 && stage >= 4) {
            this.runtimeStageEndTime = performance.now() + performance.timeOrigin;
            this.resolveDynamicStage();
            return;
        }
    }
    /** Fire the `onStage` listeners for the runtime stage and unblock any promises waiting for it. */ resolveRuntimeStage() {
        const runtimeListeners = this.runtimeStageListeners;
        for(let i = 0; i < runtimeListeners.length; i++){
            runtimeListeners[i]();
        }
        runtimeListeners.length = 0;
        this.runtimeStagePromise.resolve();
    }
    /** Fire the `onStage` listeners for the dynamic stage and unblock any promises waiting for it. */ resolveDynamicStage() {
        const dynamicListeners = this.dynamicStageListeners;
        for(let i = 0; i < dynamicListeners.length; i++){
            dynamicListeners[i]();
        }
        dynamicListeners.length = 0;
        this.dynamicStagePromise.resolve();
    }
    getStagePromise(stage) {
        switch(stage){
            case 3:
                {
                    return this.runtimeStagePromise.promise;
                }
            case 4:
                {
                    return this.dynamicStagePromise.promise;
                }
            default:
                {
                    stage;
                    throw Object.defineProperty(new _invarianterror.InvariantError(`Invalid render stage: ${stage}`), "__NEXT_ERROR_CODE", {
                        value: "E881",
                        enumerable: false,
                        configurable: true
                    });
                }
        }
    }
    waitForStage(stage) {
        return this.getStagePromise(stage);
    }
    delayUntilStage(stage, displayName, resolvedValue) {
        const ioTriggerPromise = this.getStagePromise(stage);
        const promise = makeDevtoolsIOPromiseFromIOTrigger(ioTriggerPromise, displayName, resolvedValue);
        // Analogously to `makeHangingPromise`, we might reject this promise if the signal is invoked.
        // (e.g. in the case where we don't want want the render to proceed to the dynamic stage and abort it).
        // We shouldn't consider this an unhandled rejection, so we attach a noop catch handler here to suppress this warning.
        if (this.abortSignal) {
            promise.catch(ignoreReject);
        }
        return promise;
    }
}
function ignoreReject() {}
// TODO(restart-on-cache-miss): the layering of `delayUntilStage`,
// `makeDevtoolsIOPromiseFromIOTrigger` and and `makeDevtoolsIOAwarePromise`
// is confusing, we should clean it up.
function makeDevtoolsIOPromiseFromIOTrigger(ioTrigger, displayName, resolvedValue) {
    // If we create a `new Promise` and give it a displayName
    // (with no userspace code above us in the stack)
    // React Devtools will use it as the IO cause when determining "suspended by".
    // In particular, it should shadow any inner IO that resolved/rejected the promise
    // (in case of staged rendering, this will be the `setTimeout` that triggers the relevant stage)
    const promise = new Promise((resolve, reject)=>{
        ioTrigger.then(resolve.bind(null, resolvedValue), reject);
    });
    if (displayName !== undefined) {
        // @ts-expect-error
        promise.displayName = displayName;
    }
    return promise;
} //# sourceMappingURL=staged-rendering.js.map
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/dist/server/request/cookies.js [app-rsc] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "cookies", {
    enumerable: true,
    get: function() {
        return cookies;
    }
});
const _requestcookies = __turbopack_context__.r("[project]/code/planetaryescape/blah.chat/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/dist/server/web/spec-extension/adapters/request-cookies.js [app-rsc] (ecmascript)");
const _cookies = __turbopack_context__.r("[project]/code/planetaryescape/blah.chat/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/dist/server/web/spec-extension/cookies.js [app-rsc] (ecmascript)");
const _workasyncstorageexternal = __turbopack_context__.r("[externals]/next/dist/server/app-render/work-async-storage.external.js [external] (next/dist/server/app-render/work-async-storage.external.js, cjs)");
const _workunitasyncstorageexternal = __turbopack_context__.r("[externals]/next/dist/server/app-render/work-unit-async-storage.external.js [external] (next/dist/server/app-render/work-unit-async-storage.external.js, cjs)");
const _dynamicrendering = __turbopack_context__.r("[project]/code/planetaryescape/blah.chat/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/dist/server/app-render/dynamic-rendering.js [app-rsc] (ecmascript)");
const _staticgenerationbailout = __turbopack_context__.r("[project]/code/planetaryescape/blah.chat/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/dist/client/components/static-generation-bailout.js [app-rsc] (ecmascript)");
const _dynamicrenderingutils = __turbopack_context__.r("[project]/code/planetaryescape/blah.chat/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/dist/server/dynamic-rendering-utils.js [app-rsc] (ecmascript)");
const _creatededupedbycallsiteservererrorlogger = __turbopack_context__.r("[project]/code/planetaryescape/blah.chat/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/dist/server/create-deduped-by-callsite-server-error-logger.js [app-rsc] (ecmascript)");
const _utils = __turbopack_context__.r("[project]/code/planetaryescape/blah.chat/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/dist/server/request/utils.js [app-rsc] (ecmascript)");
const _invarianterror = __turbopack_context__.r("[project]/code/planetaryescape/blah.chat/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/dist/shared/lib/invariant-error.js [app-rsc] (ecmascript)");
const _stagedrendering = __turbopack_context__.r("[project]/code/planetaryescape/blah.chat/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/dist/server/app-render/staged-rendering.js [app-rsc] (ecmascript)");
function cookies() {
    const callingExpression = 'cookies';
    const workStore = _workasyncstorageexternal.workAsyncStorage.getStore();
    const workUnitStore = _workunitasyncstorageexternal.workUnitAsyncStorage.getStore();
    if (workStore) {
        if (workUnitStore && workUnitStore.phase === 'after' && !(0, _utils.isRequestAPICallableInsideAfter)()) {
            throw Object.defineProperty(new Error(`Route ${workStore.route} used \`cookies()\` inside \`after()\`. This is not supported. If you need this data inside an \`after()\` callback, use \`cookies()\` outside of the callback. See more info here: https://nextjs.org/docs/canary/app/api-reference/functions/after`), "__NEXT_ERROR_CODE", {
                value: "E843",
                enumerable: false,
                configurable: true
            });
        }
        if (workStore.forceStatic) {
            // When using forceStatic we override all other logic and always just return an empty
            // cookies object without tracking
            const underlyingCookies = createEmptyCookies();
            return makeUntrackedCookies(underlyingCookies);
        }
        if (workStore.dynamicShouldError) {
            throw Object.defineProperty(new _staticgenerationbailout.StaticGenBailoutError(`Route ${workStore.route} with \`dynamic = "error"\` couldn't be rendered statically because it used \`cookies()\`. See more info here: https://nextjs.org/docs/app/building-your-application/rendering/static-and-dynamic#dynamic-rendering`), "__NEXT_ERROR_CODE", {
                value: "E849",
                enumerable: false,
                configurable: true
            });
        }
        if (workUnitStore) {
            switch(workUnitStore.type){
                case 'cache':
                    const error = Object.defineProperty(new Error(`Route ${workStore.route} used \`cookies()\` inside "use cache". Accessing Dynamic data sources inside a cache scope is not supported. If you need this data inside a cached function use \`cookies()\` outside of the cached function and pass the required dynamic data in as an argument. See more info here: https://nextjs.org/docs/messages/next-request-in-use-cache`), "__NEXT_ERROR_CODE", {
                        value: "E831",
                        enumerable: false,
                        configurable: true
                    });
                    Error.captureStackTrace(error, cookies);
                    workStore.invalidDynamicUsageError ??= error;
                    throw error;
                case 'unstable-cache':
                    throw Object.defineProperty(new Error(`Route ${workStore.route} used \`cookies()\` inside a function cached with \`unstable_cache()\`. Accessing Dynamic data sources inside a cache scope is not supported. If you need this data inside a cached function use \`cookies()\` outside of the cached function and pass the required dynamic data in as an argument. See more info here: https://nextjs.org/docs/app/api-reference/functions/unstable_cache`), "__NEXT_ERROR_CODE", {
                        value: "E846",
                        enumerable: false,
                        configurable: true
                    });
                case 'prerender':
                    return makeHangingCookies(workStore, workUnitStore);
                case 'prerender-client':
                    const exportName = '`cookies`';
                    throw Object.defineProperty(new _invarianterror.InvariantError(`${exportName} must not be used within a Client Component. Next.js should be preventing ${exportName} from being included in Client Components statically, but did not in this case.`), "__NEXT_ERROR_CODE", {
                        value: "E832",
                        enumerable: false,
                        configurable: true
                    });
                case 'prerender-ppr':
                    // We need track dynamic access here eagerly to keep continuity with
                    // how cookies has worked in PPR without cacheComponents.
                    return (0, _dynamicrendering.postponeWithTracking)(workStore.route, callingExpression, workUnitStore.dynamicTracking);
                case 'prerender-legacy':
                    // We track dynamic access here so we don't need to wrap the cookies
                    // in individual property access tracking.
                    return (0, _dynamicrendering.throwToInterruptStaticGeneration)(callingExpression, workStore, workUnitStore);
                case 'prerender-runtime':
                    return (0, _dynamicrendering.delayUntilRuntimeStage)(workUnitStore, makeUntrackedCookies(workUnitStore.cookies));
                case 'private-cache':
                    // Private caches are delayed until the runtime stage in use-cache-wrapper,
                    // so we don't need an additional delay here.
                    return makeUntrackedCookies(workUnitStore.cookies);
                case 'request':
                    (0, _dynamicrendering.trackDynamicDataInDynamicRender)(workUnitStore);
                    let underlyingCookies;
                    if ((0, _requestcookies.areCookiesMutableInCurrentPhase)(workUnitStore)) {
                        // We can't conditionally return different types here based on the context.
                        // To avoid confusion, we always return the readonly type here.
                        underlyingCookies = workUnitStore.userspaceMutableCookies;
                    } else {
                        underlyingCookies = workUnitStore.cookies;
                    }
                    if ("TURBOPACK compile-time truthy", 1) {
                        // Semantically we only need the dev tracking when running in `next dev`
                        // but since you would never use next dev with production NODE_ENV we use this
                        // as a proxy so we can statically exclude this code from production builds.
                        return makeUntrackedCookiesWithDevWarnings(workUnitStore, underlyingCookies, workStore == null ? void 0 : workStore.route);
                    } else //TURBOPACK unreachable
                    ;
                default:
                    workUnitStore;
            }
        }
    }
    // If we end up here, there was no work store or work unit store present.
    (0, _workunitasyncstorageexternal.throwForMissingRequestStore)(callingExpression);
}
function createEmptyCookies() {
    return _requestcookies.RequestCookiesAdapter.seal(new _cookies.RequestCookies(new Headers({})));
}
const CachedCookies = new WeakMap();
function makeHangingCookies(workStore, prerenderStore) {
    const cachedPromise = CachedCookies.get(prerenderStore);
    if (cachedPromise) {
        return cachedPromise;
    }
    const promise = (0, _dynamicrenderingutils.makeHangingPromise)(prerenderStore.renderSignal, workStore.route, '`cookies()`');
    CachedCookies.set(prerenderStore, promise);
    return promise;
}
function makeUntrackedCookies(underlyingCookies) {
    const cachedCookies = CachedCookies.get(underlyingCookies);
    if (cachedCookies) {
        return cachedCookies;
    }
    const promise = Promise.resolve(underlyingCookies);
    CachedCookies.set(underlyingCookies, promise);
    return promise;
}
function makeUntrackedCookiesWithDevWarnings(requestStore, underlyingCookies, route) {
    if (requestStore.asyncApiPromises) {
        let promise;
        if (underlyingCookies === requestStore.mutableCookies) {
            promise = requestStore.asyncApiPromises.mutableCookies;
        } else if (underlyingCookies === requestStore.cookies) {
            promise = requestStore.asyncApiPromises.cookies;
        } else {
            throw Object.defineProperty(new _invarianterror.InvariantError('Received an underlying cookies object that does not match either `cookies` or `mutableCookies`'), "__NEXT_ERROR_CODE", {
                value: "E890",
                enumerable: false,
                configurable: true
            });
        }
        return instrumentCookiesPromiseWithDevWarnings(promise, route);
    }
    const cachedCookies = CachedCookies.get(underlyingCookies);
    if (cachedCookies) {
        return cachedCookies;
    }
    const promise = (0, _dynamicrenderingutils.makeDevtoolsIOAwarePromise)(underlyingCookies, requestStore, _stagedrendering.RenderStage.Runtime);
    const proxiedPromise = instrumentCookiesPromiseWithDevWarnings(promise, route);
    CachedCookies.set(underlyingCookies, proxiedPromise);
    return proxiedPromise;
}
const warnForSyncAccess = (0, _creatededupedbycallsiteservererrorlogger.createDedupedByCallsiteServerErrorLoggerDev)(createCookiesAccessError);
function instrumentCookiesPromiseWithDevWarnings(promise, route) {
    Object.defineProperties(promise, {
        [Symbol.iterator]: replaceableWarningDescriptorForSymbolIterator(promise, route),
        size: replaceableWarningDescriptor(promise, 'size', route),
        get: replaceableWarningDescriptor(promise, 'get', route),
        getAll: replaceableWarningDescriptor(promise, 'getAll', route),
        has: replaceableWarningDescriptor(promise, 'has', route),
        set: replaceableWarningDescriptor(promise, 'set', route),
        delete: replaceableWarningDescriptor(promise, 'delete', route),
        clear: replaceableWarningDescriptor(promise, 'clear', route),
        toString: replaceableWarningDescriptor(promise, 'toString', route)
    });
    return promise;
}
function replaceableWarningDescriptor(target, prop, route) {
    return {
        enumerable: false,
        get () {
            warnForSyncAccess(route, `\`cookies().${prop}\``);
            return undefined;
        },
        set (value) {
            Object.defineProperty(target, prop, {
                value,
                writable: true,
                configurable: true
            });
        },
        configurable: true
    };
}
function replaceableWarningDescriptorForSymbolIterator(target, route) {
    return {
        enumerable: false,
        get () {
            warnForSyncAccess(route, '`...cookies()` or similar iteration');
            return undefined;
        },
        set (value) {
            Object.defineProperty(target, Symbol.iterator, {
                value,
                writable: true,
                enumerable: true,
                configurable: true
            });
        },
        configurable: true
    };
}
function createCookiesAccessError(route, expression) {
    const prefix = route ? `Route "${route}" ` : 'This route ';
    return Object.defineProperty(new Error(`${prefix}used ${expression}. ` + `\`cookies()\` returns a Promise and must be unwrapped with \`await\` or \`React.use()\` before accessing its properties. ` + `Learn more: https://nextjs.org/docs/messages/sync-dynamic-apis`), "__NEXT_ERROR_CODE", {
        value: "E830",
        enumerable: false,
        configurable: true
    });
} //# sourceMappingURL=cookies.js.map
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/dist/server/web/spec-extension/adapters/headers.js [app-rsc] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
0 && (module.exports = {
    HeadersAdapter: null,
    ReadonlyHeadersError: null
});
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: all[name]
    });
}
_export(exports, {
    HeadersAdapter: function() {
        return HeadersAdapter;
    },
    ReadonlyHeadersError: function() {
        return ReadonlyHeadersError;
    }
});
const _reflect = __turbopack_context__.r("[project]/code/planetaryescape/blah.chat/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/dist/server/web/spec-extension/adapters/reflect.js [app-rsc] (ecmascript)");
class ReadonlyHeadersError extends Error {
    constructor(){
        super('Headers cannot be modified. Read more: https://nextjs.org/docs/app/api-reference/functions/headers');
    }
    static callable() {
        throw new ReadonlyHeadersError();
    }
}
class HeadersAdapter extends Headers {
    constructor(headers){
        // We've already overridden the methods that would be called, so we're just
        // calling the super constructor to ensure that the instanceof check works.
        super();
        this.headers = new Proxy(headers, {
            get (target, prop, receiver) {
                // Because this is just an object, we expect that all "get" operations
                // are for properties. If it's a "get" for a symbol, we'll just return
                // the symbol.
                if (typeof prop === 'symbol') {
                    return _reflect.ReflectAdapter.get(target, prop, receiver);
                }
                const lowercased = prop.toLowerCase();
                // Let's find the original casing of the key. This assumes that there is
                // no mixed case keys (e.g. "Content-Type" and "content-type") in the
                // headers object.
                const original = Object.keys(headers).find((o)=>o.toLowerCase() === lowercased);
                // If the original casing doesn't exist, return undefined.
                if (typeof original === 'undefined') return;
                // If the original casing exists, return the value.
                return _reflect.ReflectAdapter.get(target, original, receiver);
            },
            set (target, prop, value, receiver) {
                if (typeof prop === 'symbol') {
                    return _reflect.ReflectAdapter.set(target, prop, value, receiver);
                }
                const lowercased = prop.toLowerCase();
                // Let's find the original casing of the key. This assumes that there is
                // no mixed case keys (e.g. "Content-Type" and "content-type") in the
                // headers object.
                const original = Object.keys(headers).find((o)=>o.toLowerCase() === lowercased);
                // If the original casing doesn't exist, use the prop as the key.
                return _reflect.ReflectAdapter.set(target, original ?? prop, value, receiver);
            },
            has (target, prop) {
                if (typeof prop === 'symbol') return _reflect.ReflectAdapter.has(target, prop);
                const lowercased = prop.toLowerCase();
                // Let's find the original casing of the key. This assumes that there is
                // no mixed case keys (e.g. "Content-Type" and "content-type") in the
                // headers object.
                const original = Object.keys(headers).find((o)=>o.toLowerCase() === lowercased);
                // If the original casing doesn't exist, return false.
                if (typeof original === 'undefined') return false;
                // If the original casing exists, return true.
                return _reflect.ReflectAdapter.has(target, original);
            },
            deleteProperty (target, prop) {
                if (typeof prop === 'symbol') return _reflect.ReflectAdapter.deleteProperty(target, prop);
                const lowercased = prop.toLowerCase();
                // Let's find the original casing of the key. This assumes that there is
                // no mixed case keys (e.g. "Content-Type" and "content-type") in the
                // headers object.
                const original = Object.keys(headers).find((o)=>o.toLowerCase() === lowercased);
                // If the original casing doesn't exist, return true.
                if (typeof original === 'undefined') return true;
                // If the original casing exists, delete the property.
                return _reflect.ReflectAdapter.deleteProperty(target, original);
            }
        });
    }
    /**
   * Seals a Headers instance to prevent modification by throwing an error when
   * any mutating method is called.
   */ static seal(headers) {
        return new Proxy(headers, {
            get (target, prop, receiver) {
                switch(prop){
                    case 'append':
                    case 'delete':
                    case 'set':
                        return ReadonlyHeadersError.callable;
                    default:
                        return _reflect.ReflectAdapter.get(target, prop, receiver);
                }
            }
        });
    }
    /**
   * Merges a header value into a string. This stores multiple values as an
   * array, so we need to merge them into a string.
   *
   * @param value a header value
   * @returns a merged header value (a string)
   */ merge(value) {
        if (Array.isArray(value)) return value.join(', ');
        return value;
    }
    /**
   * Creates a Headers instance from a plain object or a Headers instance.
   *
   * @param headers a plain object or a Headers instance
   * @returns a headers instance
   */ static from(headers) {
        if (headers instanceof Headers) return headers;
        return new HeadersAdapter(headers);
    }
    append(name, value) {
        const existing = this.headers[name];
        if (typeof existing === 'string') {
            this.headers[name] = [
                existing,
                value
            ];
        } else if (Array.isArray(existing)) {
            existing.push(value);
        } else {
            this.headers[name] = value;
        }
    }
    delete(name) {
        delete this.headers[name];
    }
    get(name) {
        const value = this.headers[name];
        if (typeof value !== 'undefined') return this.merge(value);
        return null;
    }
    has(name) {
        return typeof this.headers[name] !== 'undefined';
    }
    set(name, value) {
        this.headers[name] = value;
    }
    forEach(callbackfn, thisArg) {
        for (const [name, value] of this.entries()){
            callbackfn.call(thisArg, value, name, this);
        }
    }
    *entries() {
        for (const key of Object.keys(this.headers)){
            const name = key.toLowerCase();
            // We assert here that this is a string because we got it from the
            // Object.keys() call above.
            const value = this.get(name);
            yield [
                name,
                value
            ];
        }
    }
    *keys() {
        for (const key of Object.keys(this.headers)){
            const name = key.toLowerCase();
            yield name;
        }
    }
    *values() {
        for (const key of Object.keys(this.headers)){
            // We assert here that this is a string because we got it from the
            // Object.keys() call above.
            const value = this.get(key);
            yield value;
        }
    }
    [Symbol.iterator]() {
        return this.entries();
    }
} //# sourceMappingURL=headers.js.map
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/dist/server/request/headers.js [app-rsc] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "headers", {
    enumerable: true,
    get: function() {
        return headers;
    }
});
const _headers = __turbopack_context__.r("[project]/code/planetaryescape/blah.chat/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/dist/server/web/spec-extension/adapters/headers.js [app-rsc] (ecmascript)");
const _workasyncstorageexternal = __turbopack_context__.r("[externals]/next/dist/server/app-render/work-async-storage.external.js [external] (next/dist/server/app-render/work-async-storage.external.js, cjs)");
const _workunitasyncstorageexternal = __turbopack_context__.r("[externals]/next/dist/server/app-render/work-unit-async-storage.external.js [external] (next/dist/server/app-render/work-unit-async-storage.external.js, cjs)");
const _dynamicrendering = __turbopack_context__.r("[project]/code/planetaryescape/blah.chat/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/dist/server/app-render/dynamic-rendering.js [app-rsc] (ecmascript)");
const _staticgenerationbailout = __turbopack_context__.r("[project]/code/planetaryescape/blah.chat/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/dist/client/components/static-generation-bailout.js [app-rsc] (ecmascript)");
const _dynamicrenderingutils = __turbopack_context__.r("[project]/code/planetaryescape/blah.chat/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/dist/server/dynamic-rendering-utils.js [app-rsc] (ecmascript)");
const _creatededupedbycallsiteservererrorlogger = __turbopack_context__.r("[project]/code/planetaryescape/blah.chat/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/dist/server/create-deduped-by-callsite-server-error-logger.js [app-rsc] (ecmascript)");
const _utils = __turbopack_context__.r("[project]/code/planetaryescape/blah.chat/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/dist/server/request/utils.js [app-rsc] (ecmascript)");
const _invarianterror = __turbopack_context__.r("[project]/code/planetaryescape/blah.chat/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/dist/shared/lib/invariant-error.js [app-rsc] (ecmascript)");
const _stagedrendering = __turbopack_context__.r("[project]/code/planetaryescape/blah.chat/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/dist/server/app-render/staged-rendering.js [app-rsc] (ecmascript)");
function headers() {
    const callingExpression = 'headers';
    const workStore = _workasyncstorageexternal.workAsyncStorage.getStore();
    const workUnitStore = _workunitasyncstorageexternal.workUnitAsyncStorage.getStore();
    if (workStore) {
        if (workUnitStore && workUnitStore.phase === 'after' && !(0, _utils.isRequestAPICallableInsideAfter)()) {
            throw Object.defineProperty(new Error(`Route ${workStore.route} used \`headers()\` inside \`after()\`. This is not supported. If you need this data inside an \`after()\` callback, use \`headers()\` outside of the callback. See more info here: https://nextjs.org/docs/canary/app/api-reference/functions/after`), "__NEXT_ERROR_CODE", {
                value: "E839",
                enumerable: false,
                configurable: true
            });
        }
        if (workStore.forceStatic) {
            // When using forceStatic we override all other logic and always just return an empty
            // headers object without tracking
            const underlyingHeaders = _headers.HeadersAdapter.seal(new Headers({}));
            return makeUntrackedHeaders(underlyingHeaders);
        }
        if (workUnitStore) {
            switch(workUnitStore.type){
                case 'cache':
                    {
                        const error = Object.defineProperty(new Error(`Route ${workStore.route} used \`headers()\` inside "use cache". Accessing Dynamic data sources inside a cache scope is not supported. If you need this data inside a cached function use \`headers()\` outside of the cached function and pass the required dynamic data in as an argument. See more info here: https://nextjs.org/docs/messages/next-request-in-use-cache`), "__NEXT_ERROR_CODE", {
                            value: "E833",
                            enumerable: false,
                            configurable: true
                        });
                        Error.captureStackTrace(error, headers);
                        workStore.invalidDynamicUsageError ??= error;
                        throw error;
                    }
                case 'unstable-cache':
                    throw Object.defineProperty(new Error(`Route ${workStore.route} used \`headers()\` inside a function cached with \`unstable_cache()\`. Accessing Dynamic data sources inside a cache scope is not supported. If you need this data inside a cached function use \`headers()\` outside of the cached function and pass the required dynamic data in as an argument. See more info here: https://nextjs.org/docs/app/api-reference/functions/unstable_cache`), "__NEXT_ERROR_CODE", {
                        value: "E838",
                        enumerable: false,
                        configurable: true
                    });
                case 'prerender':
                case 'prerender-client':
                case 'private-cache':
                case 'prerender-runtime':
                case 'prerender-ppr':
                case 'prerender-legacy':
                case 'request':
                    break;
                default:
                    workUnitStore;
            }
        }
        if (workStore.dynamicShouldError) {
            throw Object.defineProperty(new _staticgenerationbailout.StaticGenBailoutError(`Route ${workStore.route} with \`dynamic = "error"\` couldn't be rendered statically because it used \`headers()\`. See more info here: https://nextjs.org/docs/app/building-your-application/rendering/static-and-dynamic#dynamic-rendering`), "__NEXT_ERROR_CODE", {
                value: "E828",
                enumerable: false,
                configurable: true
            });
        }
        if (workUnitStore) {
            switch(workUnitStore.type){
                case 'prerender':
                    return makeHangingHeaders(workStore, workUnitStore);
                case 'prerender-client':
                    const exportName = '`headers`';
                    throw Object.defineProperty(new _invarianterror.InvariantError(`${exportName} must not be used within a client component. Next.js should be preventing ${exportName} from being included in client components statically, but did not in this case.`), "__NEXT_ERROR_CODE", {
                        value: "E693",
                        enumerable: false,
                        configurable: true
                    });
                case 'prerender-ppr':
                    // PPR Prerender (no cacheComponents)
                    // We are prerendering with PPR. We need track dynamic access here eagerly
                    // to keep continuity with how headers has worked in PPR without cacheComponents.
                    // TODO consider switching the semantic to throw on property access instead
                    return (0, _dynamicrendering.postponeWithTracking)(workStore.route, callingExpression, workUnitStore.dynamicTracking);
                case 'prerender-legacy':
                    // Legacy Prerender
                    // We are in a legacy static generation mode while prerendering
                    // We track dynamic access here so we don't need to wrap the headers in
                    // individual property access tracking.
                    return (0, _dynamicrendering.throwToInterruptStaticGeneration)(callingExpression, workStore, workUnitStore);
                case 'prerender-runtime':
                    return (0, _dynamicrendering.delayUntilRuntimeStage)(workUnitStore, makeUntrackedHeaders(workUnitStore.headers));
                case 'private-cache':
                    // Private caches are delayed until the runtime stage in use-cache-wrapper,
                    // so we don't need an additional delay here.
                    return makeUntrackedHeaders(workUnitStore.headers);
                case 'request':
                    (0, _dynamicrendering.trackDynamicDataInDynamicRender)(workUnitStore);
                    if ("TURBOPACK compile-time truthy", 1) {
                        // Semantically we only need the dev tracking when running in `next dev`
                        // but since you would never use next dev with production NODE_ENV we use this
                        // as a proxy so we can statically exclude this code from production builds.
                        return makeUntrackedHeadersWithDevWarnings(workUnitStore.headers, workStore == null ? void 0 : workStore.route, workUnitStore);
                    } else //TURBOPACK unreachable
                    ;
                    //TURBOPACK unreachable
                    ;
                default:
                    workUnitStore;
            }
        }
    }
    // If we end up here, there was no work store or work unit store present.
    (0, _workunitasyncstorageexternal.throwForMissingRequestStore)(callingExpression);
}
const CachedHeaders = new WeakMap();
function makeHangingHeaders(workStore, prerenderStore) {
    const cachedHeaders = CachedHeaders.get(prerenderStore);
    if (cachedHeaders) {
        return cachedHeaders;
    }
    const promise = (0, _dynamicrenderingutils.makeHangingPromise)(prerenderStore.renderSignal, workStore.route, '`headers()`');
    CachedHeaders.set(prerenderStore, promise);
    return promise;
}
function makeUntrackedHeaders(underlyingHeaders) {
    const cachedHeaders = CachedHeaders.get(underlyingHeaders);
    if (cachedHeaders) {
        return cachedHeaders;
    }
    const promise = Promise.resolve(underlyingHeaders);
    CachedHeaders.set(underlyingHeaders, promise);
    return promise;
}
function makeUntrackedHeadersWithDevWarnings(underlyingHeaders, route, requestStore) {
    if (requestStore.asyncApiPromises) {
        const promise = requestStore.asyncApiPromises.headers;
        return instrumentHeadersPromiseWithDevWarnings(promise, route);
    }
    const cachedHeaders = CachedHeaders.get(underlyingHeaders);
    if (cachedHeaders) {
        return cachedHeaders;
    }
    const promise = (0, _dynamicrenderingutils.makeDevtoolsIOAwarePromise)(underlyingHeaders, requestStore, _stagedrendering.RenderStage.Runtime);
    const proxiedPromise = instrumentHeadersPromiseWithDevWarnings(promise, route);
    CachedHeaders.set(underlyingHeaders, proxiedPromise);
    return proxiedPromise;
}
const warnForSyncAccess = (0, _creatededupedbycallsiteservererrorlogger.createDedupedByCallsiteServerErrorLoggerDev)(createHeadersAccessError);
function instrumentHeadersPromiseWithDevWarnings(promise, route) {
    Object.defineProperties(promise, {
        [Symbol.iterator]: replaceableWarningDescriptorForSymbolIterator(promise, route),
        append: replaceableWarningDescriptor(promise, 'append', route),
        delete: replaceableWarningDescriptor(promise, 'delete', route),
        get: replaceableWarningDescriptor(promise, 'get', route),
        has: replaceableWarningDescriptor(promise, 'has', route),
        set: replaceableWarningDescriptor(promise, 'set', route),
        getSetCookie: replaceableWarningDescriptor(promise, 'getSetCookie', route),
        forEach: replaceableWarningDescriptor(promise, 'forEach', route),
        keys: replaceableWarningDescriptor(promise, 'keys', route),
        values: replaceableWarningDescriptor(promise, 'values', route),
        entries: replaceableWarningDescriptor(promise, 'entries', route)
    });
    return promise;
}
function replaceableWarningDescriptor(target, prop, route) {
    return {
        enumerable: false,
        get () {
            warnForSyncAccess(route, `\`headers().${prop}\``);
            return undefined;
        },
        set (value) {
            Object.defineProperty(target, prop, {
                value,
                writable: true,
                configurable: true
            });
        },
        configurable: true
    };
}
function replaceableWarningDescriptorForSymbolIterator(target, route) {
    return {
        enumerable: false,
        get () {
            warnForSyncAccess(route, '`...headers()` or similar iteration');
            return undefined;
        },
        set (value) {
            Object.defineProperty(target, Symbol.iterator, {
                value,
                writable: true,
                enumerable: true,
                configurable: true
            });
        },
        configurable: true
    };
}
function createHeadersAccessError(route, expression) {
    const prefix = route ? `Route "${route}" ` : 'This route ';
    return Object.defineProperty(new Error(`${prefix}used ${expression}. ` + `\`headers()\` returns a Promise and must be unwrapped with \`await\` or \`React.use()\` before accessing its properties. ` + `Learn more: https://nextjs.org/docs/messages/sync-dynamic-apis`), "__NEXT_ERROR_CODE", {
        value: "E836",
        enumerable: false,
        configurable: true
    });
} //# sourceMappingURL=headers.js.map
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/dist/server/request/draft-mode.js [app-rsc] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "draftMode", {
    enumerable: true,
    get: function() {
        return draftMode;
    }
});
const _workunitasyncstorageexternal = __turbopack_context__.r("[externals]/next/dist/server/app-render/work-unit-async-storage.external.js [external] (next/dist/server/app-render/work-unit-async-storage.external.js, cjs)");
const _workasyncstorageexternal = __turbopack_context__.r("[externals]/next/dist/server/app-render/work-async-storage.external.js [external] (next/dist/server/app-render/work-async-storage.external.js, cjs)");
const _dynamicrendering = __turbopack_context__.r("[project]/code/planetaryescape/blah.chat/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/dist/server/app-render/dynamic-rendering.js [app-rsc] (ecmascript)");
const _creatededupedbycallsiteservererrorlogger = __turbopack_context__.r("[project]/code/planetaryescape/blah.chat/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/dist/server/create-deduped-by-callsite-server-error-logger.js [app-rsc] (ecmascript)");
const _staticgenerationbailout = __turbopack_context__.r("[project]/code/planetaryescape/blah.chat/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/dist/client/components/static-generation-bailout.js [app-rsc] (ecmascript)");
const _hooksservercontext = __turbopack_context__.r("[project]/code/planetaryescape/blah.chat/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/dist/client/components/hooks-server-context.js [app-rsc] (ecmascript)");
const _invarianterror = __turbopack_context__.r("[project]/code/planetaryescape/blah.chat/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/dist/shared/lib/invariant-error.js [app-rsc] (ecmascript)");
const _reflect = __turbopack_context__.r("[project]/code/planetaryescape/blah.chat/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/dist/server/web/spec-extension/adapters/reflect.js [app-rsc] (ecmascript)");
function draftMode() {
    const callingExpression = 'draftMode';
    const workStore = _workasyncstorageexternal.workAsyncStorage.getStore();
    const workUnitStore = _workunitasyncstorageexternal.workUnitAsyncStorage.getStore();
    if (!workStore || !workUnitStore) {
        (0, _workunitasyncstorageexternal.throwForMissingRequestStore)(callingExpression);
    }
    switch(workUnitStore.type){
        case 'prerender-runtime':
            // TODO(runtime-ppr): does it make sense to delay this? normally it's always microtasky
            return (0, _dynamicrendering.delayUntilRuntimeStage)(workUnitStore, createOrGetCachedDraftMode(workUnitStore.draftMode, workStore));
        case 'request':
            return createOrGetCachedDraftMode(workUnitStore.draftMode, workStore);
        case 'cache':
        case 'private-cache':
        case 'unstable-cache':
            // Inside of `"use cache"` or `unstable_cache`, draft mode is available if
            // the outmost work unit store is a request store (or a runtime prerender),
            // and if draft mode is enabled.
            const draftModeProvider = (0, _workunitasyncstorageexternal.getDraftModeProviderForCacheScope)(workStore, workUnitStore);
            if (draftModeProvider) {
                return createOrGetCachedDraftMode(draftModeProvider, workStore);
            }
        // Otherwise, we fall through to providing an empty draft mode.
        // eslint-disable-next-line no-fallthrough
        case 'prerender':
        case 'prerender-client':
        case 'prerender-ppr':
        case 'prerender-legacy':
            // Return empty draft mode
            return createOrGetCachedDraftMode(null, workStore);
        default:
            return workUnitStore;
    }
}
function createOrGetCachedDraftMode(draftModeProvider, workStore) {
    const cacheKey = draftModeProvider ?? NullDraftMode;
    const cachedDraftMode = CachedDraftModes.get(cacheKey);
    if (cachedDraftMode) {
        return cachedDraftMode;
    }
    if (("TURBOPACK compile-time value", "development") === 'development' && !(workStore == null ? void 0 : workStore.isPrefetchRequest)) {
        const route = workStore == null ? void 0 : workStore.route;
        return createDraftModeWithDevWarnings(draftModeProvider, route);
    } else {
        return Promise.resolve(new DraftMode(draftModeProvider));
    }
}
const NullDraftMode = {};
const CachedDraftModes = new WeakMap();
function createDraftModeWithDevWarnings(underlyingProvider, route) {
    const instance = new DraftMode(underlyingProvider);
    const promise = Promise.resolve(instance);
    const proxiedPromise = new Proxy(promise, {
        get (target, prop, receiver) {
            switch(prop){
                case 'isEnabled':
                    warnForSyncAccess(route, `\`draftMode().${prop}\``);
                    break;
                case 'enable':
                case 'disable':
                    {
                        warnForSyncAccess(route, `\`draftMode().${prop}()\``);
                        break;
                    }
                default:
                    {
                    // We only warn for well-defined properties of the draftMode object.
                    }
            }
            return _reflect.ReflectAdapter.get(target, prop, receiver);
        }
    });
    return proxiedPromise;
}
class DraftMode {
    constructor(provider){
        this._provider = provider;
    }
    get isEnabled() {
        if (this._provider !== null) {
            return this._provider.isEnabled;
        }
        return false;
    }
    enable() {
        // We have a store we want to track dynamic data access to ensure we
        // don't statically generate routes that manipulate draft mode.
        trackDynamicDraftMode('draftMode().enable()', this.enable);
        if (this._provider !== null) {
            this._provider.enable();
        }
    }
    disable() {
        trackDynamicDraftMode('draftMode().disable()', this.disable);
        if (this._provider !== null) {
            this._provider.disable();
        }
    }
}
const warnForSyncAccess = (0, _creatededupedbycallsiteservererrorlogger.createDedupedByCallsiteServerErrorLoggerDev)(createDraftModeAccessError);
function createDraftModeAccessError(route, expression) {
    const prefix = route ? `Route "${route}" ` : 'This route ';
    return Object.defineProperty(new Error(`${prefix}used ${expression}. ` + `\`draftMode()\` returns a Promise and must be unwrapped with \`await\` or \`React.use()\` before accessing its properties. ` + `Learn more: https://nextjs.org/docs/messages/sync-dynamic-apis`), "__NEXT_ERROR_CODE", {
        value: "E835",
        enumerable: false,
        configurable: true
    });
}
function trackDynamicDraftMode(expression, constructorOpt) {
    const workStore = _workasyncstorageexternal.workAsyncStorage.getStore();
    const workUnitStore = _workunitasyncstorageexternal.workUnitAsyncStorage.getStore();
    if (workStore) {
        // We have a store we want to track dynamic data access to ensure we
        // don't statically generate routes that manipulate draft mode.
        if ((workUnitStore == null ? void 0 : workUnitStore.phase) === 'after') {
            throw Object.defineProperty(new Error(`Route ${workStore.route} used "${expression}" inside \`after()\`. The enabled status of \`draftMode()\` can be read inside \`after()\` but you cannot enable or disable \`draftMode()\`. See more info here: https://nextjs.org/docs/app/api-reference/functions/after`), "__NEXT_ERROR_CODE", {
                value: "E845",
                enumerable: false,
                configurable: true
            });
        }
        if (workStore.dynamicShouldError) {
            throw Object.defineProperty(new _staticgenerationbailout.StaticGenBailoutError(`Route ${workStore.route} with \`dynamic = "error"\` couldn't be rendered statically because it used \`${expression}\`. See more info here: https://nextjs.org/docs/app/building-your-application/rendering/static-and-dynamic#dynamic-rendering`), "__NEXT_ERROR_CODE", {
                value: "E553",
                enumerable: false,
                configurable: true
            });
        }
        if (workUnitStore) {
            switch(workUnitStore.type){
                case 'cache':
                case 'private-cache':
                    {
                        const error = Object.defineProperty(new Error(`Route ${workStore.route} used "${expression}" inside "use cache". The enabled status of \`draftMode()\` can be read in caches but you must not enable or disable \`draftMode()\` inside a cache. See more info here: https://nextjs.org/docs/messages/next-request-in-use-cache`), "__NEXT_ERROR_CODE", {
                            value: "E829",
                            enumerable: false,
                            configurable: true
                        });
                        Error.captureStackTrace(error, constructorOpt);
                        workStore.invalidDynamicUsageError ??= error;
                        throw error;
                    }
                case 'unstable-cache':
                    throw Object.defineProperty(new Error(`Route ${workStore.route} used "${expression}" inside a function cached with \`unstable_cache()\`. The enabled status of \`draftMode()\` can be read in caches but you must not enable or disable \`draftMode()\` inside a cache. See more info here: https://nextjs.org/docs/app/api-reference/functions/unstable_cache`), "__NEXT_ERROR_CODE", {
                        value: "E844",
                        enumerable: false,
                        configurable: true
                    });
                case 'prerender':
                case 'prerender-runtime':
                    {
                        const error = Object.defineProperty(new Error(`Route ${workStore.route} used ${expression} without first calling \`await connection()\`. See more info here: https://nextjs.org/docs/messages/next-prerender-sync-headers`), "__NEXT_ERROR_CODE", {
                            value: "E126",
                            enumerable: false,
                            configurable: true
                        });
                        return (0, _dynamicrendering.abortAndThrowOnSynchronousRequestDataAccess)(workStore.route, expression, error, workUnitStore);
                    }
                case 'prerender-client':
                    const exportName = '`draftMode`';
                    throw Object.defineProperty(new _invarianterror.InvariantError(`${exportName} must not be used within a Client Component. Next.js should be preventing ${exportName} from being included in Client Components statically, but did not in this case.`), "__NEXT_ERROR_CODE", {
                        value: "E832",
                        enumerable: false,
                        configurable: true
                    });
                case 'prerender-ppr':
                    return (0, _dynamicrendering.postponeWithTracking)(workStore.route, expression, workUnitStore.dynamicTracking);
                case 'prerender-legacy':
                    workUnitStore.revalidate = 0;
                    const err = Object.defineProperty(new _hooksservercontext.DynamicServerError(`Route ${workStore.route} couldn't be rendered statically because it used \`${expression}\`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error`), "__NEXT_ERROR_CODE", {
                        value: "E558",
                        enumerable: false,
                        configurable: true
                    });
                    workStore.dynamicUsageDescription = expression;
                    workStore.dynamicUsageStack = err.stack;
                    throw err;
                case 'request':
                    (0, _dynamicrendering.trackDynamicDataInDynamicRender)(workUnitStore);
                    break;
                default:
                    workUnitStore;
            }
        }
    }
} //# sourceMappingURL=draft-mode.js.map
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/headers.js [app-rsc] (ecmascript)", ((__turbopack_context__, module, exports) => {

module.exports.cookies = __turbopack_context__.r("[project]/code/planetaryescape/blah.chat/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/dist/server/request/cookies.js [app-rsc] (ecmascript)").cookies;
module.exports.headers = __turbopack_context__.r("[project]/code/planetaryescape/blah.chat/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/dist/server/request/headers.js [app-rsc] (ecmascript)").headers;
module.exports.draftMode = __turbopack_context__.r("[project]/code/planetaryescape/blah.chat/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/dist/server/request/draft-mode.js [app-rsc] (ecmascript)").draftMode;
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/dist/client/components/readonly-url-search-params.js [app-rsc] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

/**
 * ReadonlyURLSearchParams implementation shared between client and server.
 * This file is intentionally not marked as 'use client' or 'use server'
 * so it can be imported by both environments.
 */ /** @internal */ Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "ReadonlyURLSearchParams", {
    enumerable: true,
    get: function() {
        return ReadonlyURLSearchParams;
    }
});
class ReadonlyURLSearchParamsError extends Error {
    constructor(){
        super('Method unavailable on `ReadonlyURLSearchParams`. Read more: https://nextjs.org/docs/app/api-reference/functions/use-search-params#updating-searchparams');
    }
}
class ReadonlyURLSearchParams extends URLSearchParams {
    /** @deprecated Method unavailable on `ReadonlyURLSearchParams`. Read more: https://nextjs.org/docs/app/api-reference/functions/use-search-params#updating-searchparams */ append() {
        throw new ReadonlyURLSearchParamsError();
    }
    /** @deprecated Method unavailable on `ReadonlyURLSearchParams`. Read more: https://nextjs.org/docs/app/api-reference/functions/use-search-params#updating-searchparams */ delete() {
        throw new ReadonlyURLSearchParamsError();
    }
    /** @deprecated Method unavailable on `ReadonlyURLSearchParams`. Read more: https://nextjs.org/docs/app/api-reference/functions/use-search-params#updating-searchparams */ set() {
        throw new ReadonlyURLSearchParamsError();
    }
    /** @deprecated Method unavailable on `ReadonlyURLSearchParams`. Read more: https://nextjs.org/docs/app/api-reference/functions/use-search-params#updating-searchparams */ sort() {
        throw new ReadonlyURLSearchParamsError();
    }
}
if ((typeof exports.default === 'function' || typeof exports.default === 'object' && exports.default !== null) && typeof exports.default.__esModule === 'undefined') {
    Object.defineProperty(exports.default, '__esModule', {
        value: true
    });
    Object.assign(exports.default, exports);
    module.exports = exports.default;
} //# sourceMappingURL=readonly-url-search-params.js.map
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/dist/client/components/redirect-status-code.js [app-rsc] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "RedirectStatusCode", {
    enumerable: true,
    get: function() {
        return RedirectStatusCode;
    }
});
var RedirectStatusCode = /*#__PURE__*/ function(RedirectStatusCode) {
    RedirectStatusCode[RedirectStatusCode["SeeOther"] = 303] = "SeeOther";
    RedirectStatusCode[RedirectStatusCode["TemporaryRedirect"] = 307] = "TemporaryRedirect";
    RedirectStatusCode[RedirectStatusCode["PermanentRedirect"] = 308] = "PermanentRedirect";
    return RedirectStatusCode;
}({});
if ((typeof exports.default === 'function' || typeof exports.default === 'object' && exports.default !== null) && typeof exports.default.__esModule === 'undefined') {
    Object.defineProperty(exports.default, '__esModule', {
        value: true
    });
    Object.assign(exports.default, exports);
    module.exports = exports.default;
} //# sourceMappingURL=redirect-status-code.js.map
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/dist/client/components/redirect-error.js [app-rsc] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
0 && (module.exports = {
    REDIRECT_ERROR_CODE: null,
    RedirectType: null,
    isRedirectError: null
});
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: all[name]
    });
}
_export(exports, {
    REDIRECT_ERROR_CODE: function() {
        return REDIRECT_ERROR_CODE;
    },
    RedirectType: function() {
        return RedirectType;
    },
    isRedirectError: function() {
        return isRedirectError;
    }
});
const _redirectstatuscode = __turbopack_context__.r("[project]/code/planetaryescape/blah.chat/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/dist/client/components/redirect-status-code.js [app-rsc] (ecmascript)");
const REDIRECT_ERROR_CODE = 'NEXT_REDIRECT';
var RedirectType = /*#__PURE__*/ function(RedirectType) {
    RedirectType["push"] = "push";
    RedirectType["replace"] = "replace";
    return RedirectType;
}({});
function isRedirectError(error) {
    if (typeof error !== 'object' || error === null || !('digest' in error) || typeof error.digest !== 'string') {
        return false;
    }
    const digest = error.digest.split(';');
    const [errorCode, type] = digest;
    const destination = digest.slice(2, -2).join(';');
    const status = digest.at(-2);
    const statusCode = Number(status);
    return errorCode === REDIRECT_ERROR_CODE && (type === 'replace' || type === 'push') && typeof destination === 'string' && !isNaN(statusCode) && statusCode in _redirectstatuscode.RedirectStatusCode;
}
if ((typeof exports.default === 'function' || typeof exports.default === 'object' && exports.default !== null) && typeof exports.default.__esModule === 'undefined') {
    Object.defineProperty(exports.default, '__esModule', {
        value: true
    });
    Object.assign(exports.default, exports);
    module.exports = exports.default;
} //# sourceMappingURL=redirect-error.js.map
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/dist/client/components/redirect.js [app-rsc] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
0 && (module.exports = {
    getRedirectError: null,
    getRedirectStatusCodeFromError: null,
    getRedirectTypeFromError: null,
    getURLFromRedirectError: null,
    permanentRedirect: null,
    redirect: null
});
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: all[name]
    });
}
_export(exports, {
    getRedirectError: function() {
        return getRedirectError;
    },
    getRedirectStatusCodeFromError: function() {
        return getRedirectStatusCodeFromError;
    },
    getRedirectTypeFromError: function() {
        return getRedirectTypeFromError;
    },
    getURLFromRedirectError: function() {
        return getURLFromRedirectError;
    },
    permanentRedirect: function() {
        return permanentRedirect;
    },
    redirect: function() {
        return redirect;
    }
});
const _redirectstatuscode = __turbopack_context__.r("[project]/code/planetaryescape/blah.chat/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/dist/client/components/redirect-status-code.js [app-rsc] (ecmascript)");
const _redirecterror = __turbopack_context__.r("[project]/code/planetaryescape/blah.chat/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/dist/client/components/redirect-error.js [app-rsc] (ecmascript)");
const actionAsyncStorage = ("TURBOPACK compile-time truthy", 1) ? __turbopack_context__.r("[externals]/next/dist/server/app-render/action-async-storage.external.js [external] (next/dist/server/app-render/action-async-storage.external.js, cjs)").actionAsyncStorage : "TURBOPACK unreachable";
function getRedirectError(url, type, statusCode = _redirectstatuscode.RedirectStatusCode.TemporaryRedirect) {
    const error = Object.defineProperty(new Error(_redirecterror.REDIRECT_ERROR_CODE), "__NEXT_ERROR_CODE", {
        value: "E394",
        enumerable: false,
        configurable: true
    });
    error.digest = `${_redirecterror.REDIRECT_ERROR_CODE};${type};${url};${statusCode};`;
    return error;
}
function redirect(/** The URL to redirect to */ url, type) {
    type ??= actionAsyncStorage?.getStore()?.isAction ? _redirecterror.RedirectType.push : _redirecterror.RedirectType.replace;
    throw getRedirectError(url, type, _redirectstatuscode.RedirectStatusCode.TemporaryRedirect);
}
function permanentRedirect(/** The URL to redirect to */ url, type = _redirecterror.RedirectType.replace) {
    throw getRedirectError(url, type, _redirectstatuscode.RedirectStatusCode.PermanentRedirect);
}
function getURLFromRedirectError(error) {
    if (!(0, _redirecterror.isRedirectError)(error)) return null;
    // Slices off the beginning of the digest that contains the code and the
    // separating ';'.
    return error.digest.split(';').slice(2, -2).join(';');
}
function getRedirectTypeFromError(error) {
    if (!(0, _redirecterror.isRedirectError)(error)) {
        throw Object.defineProperty(new Error('Not a redirect error'), "__NEXT_ERROR_CODE", {
            value: "E260",
            enumerable: false,
            configurable: true
        });
    }
    return error.digest.split(';', 2)[1];
}
function getRedirectStatusCodeFromError(error) {
    if (!(0, _redirecterror.isRedirectError)(error)) {
        throw Object.defineProperty(new Error('Not a redirect error'), "__NEXT_ERROR_CODE", {
            value: "E260",
            enumerable: false,
            configurable: true
        });
    }
    return Number(error.digest.split(';').at(-2));
}
if ((typeof exports.default === 'function' || typeof exports.default === 'object' && exports.default !== null) && typeof exports.default.__esModule === 'undefined') {
    Object.defineProperty(exports.default, '__esModule', {
        value: true
    });
    Object.assign(exports.default, exports);
    module.exports = exports.default;
} //# sourceMappingURL=redirect.js.map
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/dist/client/components/http-access-fallback/http-access-fallback.js [app-rsc] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
0 && (module.exports = {
    HTTPAccessErrorStatus: null,
    HTTP_ERROR_FALLBACK_ERROR_CODE: null,
    getAccessFallbackErrorTypeByStatus: null,
    getAccessFallbackHTTPStatus: null,
    isHTTPAccessFallbackError: null
});
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: all[name]
    });
}
_export(exports, {
    HTTPAccessErrorStatus: function() {
        return HTTPAccessErrorStatus;
    },
    HTTP_ERROR_FALLBACK_ERROR_CODE: function() {
        return HTTP_ERROR_FALLBACK_ERROR_CODE;
    },
    getAccessFallbackErrorTypeByStatus: function() {
        return getAccessFallbackErrorTypeByStatus;
    },
    getAccessFallbackHTTPStatus: function() {
        return getAccessFallbackHTTPStatus;
    },
    isHTTPAccessFallbackError: function() {
        return isHTTPAccessFallbackError;
    }
});
const HTTPAccessErrorStatus = {
    NOT_FOUND: 404,
    FORBIDDEN: 403,
    UNAUTHORIZED: 401
};
const ALLOWED_CODES = new Set(Object.values(HTTPAccessErrorStatus));
const HTTP_ERROR_FALLBACK_ERROR_CODE = 'NEXT_HTTP_ERROR_FALLBACK';
function isHTTPAccessFallbackError(error) {
    if (typeof error !== 'object' || error === null || !('digest' in error) || typeof error.digest !== 'string') {
        return false;
    }
    const [prefix, httpStatus] = error.digest.split(';');
    return prefix === HTTP_ERROR_FALLBACK_ERROR_CODE && ALLOWED_CODES.has(Number(httpStatus));
}
function getAccessFallbackHTTPStatus(error) {
    const httpStatus = error.digest.split(';')[1];
    return Number(httpStatus);
}
function getAccessFallbackErrorTypeByStatus(status) {
    switch(status){
        case 401:
            return 'unauthorized';
        case 403:
            return 'forbidden';
        case 404:
            return 'not-found';
        default:
            return;
    }
}
if ((typeof exports.default === 'function' || typeof exports.default === 'object' && exports.default !== null) && typeof exports.default.__esModule === 'undefined') {
    Object.defineProperty(exports.default, '__esModule', {
        value: true
    });
    Object.assign(exports.default, exports);
    module.exports = exports.default;
} //# sourceMappingURL=http-access-fallback.js.map
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/dist/client/components/not-found.js [app-rsc] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "notFound", {
    enumerable: true,
    get: function() {
        return notFound;
    }
});
const _httpaccessfallback = __turbopack_context__.r("[project]/code/planetaryescape/blah.chat/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/dist/client/components/http-access-fallback/http-access-fallback.js [app-rsc] (ecmascript)");
/**
 * This function allows you to render the [not-found.js file](https://nextjs.org/docs/app/api-reference/file-conventions/not-found)
 * within a route segment as well as inject a tag.
 *
 * `notFound()` can be used in
 * [Server Components](https://nextjs.org/docs/app/building-your-application/rendering/server-components),
 * [Route Handlers](https://nextjs.org/docs/app/building-your-application/routing/route-handlers), and
 * [Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations).
 *
 * - In a Server Component, this will insert a `<meta name="robots" content="noindex" />` meta tag and set the status code to 404.
 * - In a Route Handler or Server Action, it will serve a 404 to the caller.
 *
 * Read more: [Next.js Docs: `notFound`](https://nextjs.org/docs/app/api-reference/functions/not-found)
 */ const DIGEST = `${_httpaccessfallback.HTTP_ERROR_FALLBACK_ERROR_CODE};404`;
function notFound() {
    const error = Object.defineProperty(new Error(DIGEST), "__NEXT_ERROR_CODE", {
        value: "E394",
        enumerable: false,
        configurable: true
    });
    error.digest = DIGEST;
    throw error;
}
if ((typeof exports.default === 'function' || typeof exports.default === 'object' && exports.default !== null) && typeof exports.default.__esModule === 'undefined') {
    Object.defineProperty(exports.default, '__esModule', {
        value: true
    });
    Object.assign(exports.default, exports);
    module.exports = exports.default;
} //# sourceMappingURL=not-found.js.map
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/dist/client/components/forbidden.js [app-rsc] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "forbidden", {
    enumerable: true,
    get: function() {
        return forbidden;
    }
});
const _httpaccessfallback = __turbopack_context__.r("[project]/code/planetaryescape/blah.chat/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/dist/client/components/http-access-fallback/http-access-fallback.js [app-rsc] (ecmascript)");
// TODO: Add `forbidden` docs
/**
 * @experimental
 * This function allows you to render the [forbidden.js file](https://nextjs.org/docs/app/api-reference/file-conventions/forbidden)
 * within a route segment as well as inject a tag.
 *
 * `forbidden()` can be used in
 * [Server Components](https://nextjs.org/docs/app/building-your-application/rendering/server-components),
 * [Route Handlers](https://nextjs.org/docs/app/building-your-application/routing/route-handlers), and
 * [Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations).
 *
 * Read more: [Next.js Docs: `forbidden`](https://nextjs.org/docs/app/api-reference/functions/forbidden)
 */ const DIGEST = `${_httpaccessfallback.HTTP_ERROR_FALLBACK_ERROR_CODE};403`;
function forbidden() {
    if ("TURBOPACK compile-time truthy", 1) {
        throw Object.defineProperty(new Error(`\`forbidden()\` is experimental and only allowed to be enabled when \`experimental.authInterrupts\` is enabled.`), "__NEXT_ERROR_CODE", {
            value: "E488",
            enumerable: false,
            configurable: true
        });
    }
    const error = Object.defineProperty(new Error(DIGEST), "__NEXT_ERROR_CODE", {
        value: "E394",
        enumerable: false,
        configurable: true
    });
    error.digest = DIGEST;
    throw error;
}
if ((typeof exports.default === 'function' || typeof exports.default === 'object' && exports.default !== null) && typeof exports.default.__esModule === 'undefined') {
    Object.defineProperty(exports.default, '__esModule', {
        value: true
    });
    Object.assign(exports.default, exports);
    module.exports = exports.default;
} //# sourceMappingURL=forbidden.js.map
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/dist/client/components/unauthorized.js [app-rsc] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "unauthorized", {
    enumerable: true,
    get: function() {
        return unauthorized;
    }
});
const _httpaccessfallback = __turbopack_context__.r("[project]/code/planetaryescape/blah.chat/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/dist/client/components/http-access-fallback/http-access-fallback.js [app-rsc] (ecmascript)");
// TODO: Add `unauthorized` docs
/**
 * @experimental
 * This function allows you to render the [unauthorized.js file](https://nextjs.org/docs/app/api-reference/file-conventions/unauthorized)
 * within a route segment as well as inject a tag.
 *
 * `unauthorized()` can be used in
 * [Server Components](https://nextjs.org/docs/app/building-your-application/rendering/server-components),
 * [Route Handlers](https://nextjs.org/docs/app/building-your-application/routing/route-handlers), and
 * [Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations).
 *
 *
 * Read more: [Next.js Docs: `unauthorized`](https://nextjs.org/docs/app/api-reference/functions/unauthorized)
 */ const DIGEST = `${_httpaccessfallback.HTTP_ERROR_FALLBACK_ERROR_CODE};401`;
function unauthorized() {
    if ("TURBOPACK compile-time truthy", 1) {
        throw Object.defineProperty(new Error(`\`unauthorized()\` is experimental and only allowed to be used when \`experimental.authInterrupts\` is enabled.`), "__NEXT_ERROR_CODE", {
            value: "E411",
            enumerable: false,
            configurable: true
        });
    }
    const error = Object.defineProperty(new Error(DIGEST), "__NEXT_ERROR_CODE", {
        value: "E394",
        enumerable: false,
        configurable: true
    });
    error.digest = DIGEST;
    throw error;
}
if ((typeof exports.default === 'function' || typeof exports.default === 'object' && exports.default !== null) && typeof exports.default.__esModule === 'undefined') {
    Object.defineProperty(exports.default, '__esModule', {
        value: true
    });
    Object.assign(exports.default, exports);
    module.exports = exports.default;
} //# sourceMappingURL=unauthorized.js.map
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/dist/server/lib/router-utils/is-postpone.js [app-rsc] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "isPostpone", {
    enumerable: true,
    get: function() {
        return isPostpone;
    }
});
const REACT_POSTPONE_TYPE = Symbol.for('react.postpone');
function isPostpone(error) {
    return typeof error === 'object' && error !== null && error.$$typeof === REACT_POSTPONE_TYPE;
} //# sourceMappingURL=is-postpone.js.map
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/dist/client/components/is-next-router-error.js [app-rsc] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "isNextRouterError", {
    enumerable: true,
    get: function() {
        return isNextRouterError;
    }
});
const _httpaccessfallback = __turbopack_context__.r("[project]/code/planetaryescape/blah.chat/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/dist/client/components/http-access-fallback/http-access-fallback.js [app-rsc] (ecmascript)");
const _redirecterror = __turbopack_context__.r("[project]/code/planetaryescape/blah.chat/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/dist/client/components/redirect-error.js [app-rsc] (ecmascript)");
function isNextRouterError(error) {
    return (0, _redirecterror.isRedirectError)(error) || (0, _httpaccessfallback.isHTTPAccessFallbackError)(error);
}
if ((typeof exports.default === 'function' || typeof exports.default === 'object' && exports.default !== null) && typeof exports.default.__esModule === 'undefined') {
    Object.defineProperty(exports.default, '__esModule', {
        value: true
    });
    Object.assign(exports.default, exports);
    module.exports = exports.default;
} //# sourceMappingURL=is-next-router-error.js.map
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/dist/client/components/unstable-rethrow.server.js [app-rsc] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "unstable_rethrow", {
    enumerable: true,
    get: function() {
        return unstable_rethrow;
    }
});
const _dynamicrenderingutils = __turbopack_context__.r("[project]/code/planetaryescape/blah.chat/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/dist/server/dynamic-rendering-utils.js [app-rsc] (ecmascript)");
const _ispostpone = __turbopack_context__.r("[project]/code/planetaryescape/blah.chat/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/dist/server/lib/router-utils/is-postpone.js [app-rsc] (ecmascript)");
const _bailouttocsr = __turbopack_context__.r("[project]/code/planetaryescape/blah.chat/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/dist/shared/lib/lazy-dynamic/bailout-to-csr.js [app-rsc] (ecmascript)");
const _isnextroutererror = __turbopack_context__.r("[project]/code/planetaryescape/blah.chat/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/dist/client/components/is-next-router-error.js [app-rsc] (ecmascript)");
const _dynamicrendering = __turbopack_context__.r("[project]/code/planetaryescape/blah.chat/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/dist/server/app-render/dynamic-rendering.js [app-rsc] (ecmascript)");
const _hooksservercontext = __turbopack_context__.r("[project]/code/planetaryescape/blah.chat/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/dist/client/components/hooks-server-context.js [app-rsc] (ecmascript)");
function unstable_rethrow(error) {
    if ((0, _isnextroutererror.isNextRouterError)(error) || (0, _bailouttocsr.isBailoutToCSRError)(error) || (0, _hooksservercontext.isDynamicServerError)(error) || (0, _dynamicrendering.isDynamicPostpone)(error) || (0, _ispostpone.isPostpone)(error) || (0, _dynamicrenderingutils.isHangingPromiseRejectionError)(error) || (0, _dynamicrendering.isPrerenderInterruptedError)(error)) {
        throw error;
    }
    if (error instanceof Error && 'cause' in error) {
        unstable_rethrow(error.cause);
    }
}
if ((typeof exports.default === 'function' || typeof exports.default === 'object' && exports.default !== null) && typeof exports.default.__esModule === 'undefined') {
    Object.defineProperty(exports.default, '__esModule', {
        value: true
    });
    Object.assign(exports.default, exports);
    module.exports = exports.default;
} //# sourceMappingURL=unstable-rethrow.server.js.map
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/dist/client/components/unstable-rethrow.js [app-rsc] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

/**
 * This function should be used to rethrow internal Next.js errors so that they can be handled by the framework.
 * When wrapping an API that uses errors to interrupt control flow, you should use this function before you do any error handling.
 * This function will rethrow the error if it is a Next.js error so it can be handled, otherwise it will do nothing.
 *
 * Read more: [Next.js Docs: `unstable_rethrow`](https://nextjs.org/docs/app/api-reference/functions/unstable_rethrow)
 */ Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "unstable_rethrow", {
    enumerable: true,
    get: function() {
        return unstable_rethrow;
    }
});
const unstable_rethrow = ("TURBOPACK compile-time truthy", 1) ? __turbopack_context__.r("[project]/code/planetaryescape/blah.chat/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/dist/client/components/unstable-rethrow.server.js [app-rsc] (ecmascript)").unstable_rethrow : "TURBOPACK unreachable";
if ((typeof exports.default === 'function' || typeof exports.default === 'object' && exports.default !== null) && typeof exports.default.__esModule === 'undefined') {
    Object.defineProperty(exports.default, '__esModule', {
        value: true
    });
    Object.assign(exports.default, exports);
    module.exports = exports.default;
} //# sourceMappingURL=unstable-rethrow.js.map
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/dist/client/components/navigation.react-server.js [app-rsc] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
0 && (module.exports = {
    ReadonlyURLSearchParams: null,
    RedirectType: null,
    forbidden: null,
    notFound: null,
    permanentRedirect: null,
    redirect: null,
    unauthorized: null,
    unstable_isUnrecognizedActionError: null,
    unstable_rethrow: null
});
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: all[name]
    });
}
_export(exports, {
    ReadonlyURLSearchParams: function() {
        return _readonlyurlsearchparams.ReadonlyURLSearchParams;
    },
    RedirectType: function() {
        return _redirecterror.RedirectType;
    },
    forbidden: function() {
        return _forbidden.forbidden;
    },
    notFound: function() {
        return _notfound.notFound;
    },
    permanentRedirect: function() {
        return _redirect.permanentRedirect;
    },
    redirect: function() {
        return _redirect.redirect;
    },
    unauthorized: function() {
        return _unauthorized.unauthorized;
    },
    unstable_isUnrecognizedActionError: function() {
        return unstable_isUnrecognizedActionError;
    },
    unstable_rethrow: function() {
        return _unstablerethrow.unstable_rethrow;
    }
});
const _readonlyurlsearchparams = __turbopack_context__.r("[project]/code/planetaryescape/blah.chat/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/dist/client/components/readonly-url-search-params.js [app-rsc] (ecmascript)");
const _redirect = __turbopack_context__.r("[project]/code/planetaryescape/blah.chat/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/dist/client/components/redirect.js [app-rsc] (ecmascript)");
const _redirecterror = __turbopack_context__.r("[project]/code/planetaryescape/blah.chat/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/dist/client/components/redirect-error.js [app-rsc] (ecmascript)");
const _notfound = __turbopack_context__.r("[project]/code/planetaryescape/blah.chat/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/dist/client/components/not-found.js [app-rsc] (ecmascript)");
const _forbidden = __turbopack_context__.r("[project]/code/planetaryescape/blah.chat/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/dist/client/components/forbidden.js [app-rsc] (ecmascript)");
const _unauthorized = __turbopack_context__.r("[project]/code/planetaryescape/blah.chat/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/dist/client/components/unauthorized.js [app-rsc] (ecmascript)");
const _unstablerethrow = __turbopack_context__.r("[project]/code/planetaryescape/blah.chat/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/dist/client/components/unstable-rethrow.js [app-rsc] (ecmascript)");
function unstable_isUnrecognizedActionError() {
    throw Object.defineProperty(new Error('`unstable_isUnrecognizedActionError` can only be used on the client.'), "__NEXT_ERROR_CODE", {
        value: "E776",
        enumerable: false,
        configurable: true
    });
}
if ((typeof exports.default === 'function' || typeof exports.default === 'object' && exports.default !== null) && typeof exports.default.__esModule === 'undefined') {
    Object.defineProperty(exports.default, '__esModule', {
        value: true
    });
    Object.assign(exports.default, exports);
    module.exports = exports.default;
} //# sourceMappingURL=navigation.react-server.js.map
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/dist/api/navigation.react-server.js [app-rsc] (ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([]);
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$client$2f$components$2f$navigation$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/dist/client/components/navigation.react-server.js [app-rsc] (ecmascript)"); //# sourceMappingURL=navigation.react-server.js.map
;
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/error-Dl9xmUf3.mjs [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ClerkAPIError",
    ()=>ClerkAPIError,
    "ClerkAPIResponseError",
    ()=>ClerkAPIResponseError,
    "ClerkError",
    ()=>ClerkError,
    "ClerkRuntimeError",
    ()=>ClerkRuntimeError,
    "ClerkWebAuthnError",
    ()=>ClerkWebAuthnError,
    "EmailLinkError",
    ()=>EmailLinkError,
    "EmailLinkErrorCode",
    ()=>EmailLinkErrorCode,
    "EmailLinkErrorCodeStatus",
    ()=>EmailLinkErrorCodeStatus,
    "MissingExpiredTokenError",
    ()=>MissingExpiredTokenError,
    "buildErrorThrower",
    ()=>buildErrorThrower,
    "createClerkGlobalHookError",
    ()=>createClerkGlobalHookError,
    "errorToJSON",
    ()=>errorToJSON,
    "is4xxError",
    ()=>is4xxError,
    "isCaptchaError",
    ()=>isCaptchaError,
    "isClerkAPIError",
    ()=>isClerkAPIError,
    "isClerkAPIResponseError",
    ()=>isClerkAPIResponseError,
    "isClerkError",
    ()=>isClerkError,
    "isClerkRuntimeError",
    ()=>isClerkRuntimeError,
    "isEmailLinkError",
    ()=>isEmailLinkError,
    "isKnownError",
    ()=>isKnownError,
    "isMetamaskError",
    ()=>isMetamaskError,
    "isNetworkError",
    ()=>isNetworkError,
    "isPasswordCompromisedError",
    ()=>isPasswordCompromisedError,
    "isPasswordPwnedError",
    ()=>isPasswordPwnedError,
    "isReverificationCancelledError",
    ()=>isReverificationCancelledError,
    "isUnauthorizedError",
    ()=>isUnauthorizedError,
    "isUserLockedError",
    ()=>isUserLockedError,
    "parseError",
    ()=>parseError,
    "parseErrors",
    ()=>parseErrors
]);
//#region src/errors/createErrorTypeGuard.ts
/**
* Creates a type guard function for any error class.
* The returned function can be called as a standalone function or as a method on an error object.
*
* @example
* ```typescript
* class MyError extends Error {}
* const isMyError = createErrorTypeGuard(MyError);
*
* // As a standalone function
* if (isMyError(error)) { ... }
*
* // As a method (when attached to error object)
* if (error.isMyError()) { ... }
* ```
*/ function createErrorTypeGuard(ErrorClass) {
    function typeGuard(error) {
        const target = error ?? this;
        if (!target) throw new TypeError(`${ErrorClass.kind || ErrorClass.name} type guard requires an error object`);
        if (ErrorClass.kind && typeof target === "object" && target !== null && "constructor" in target) {
            if (target.constructor?.kind === ErrorClass.kind) return true;
        }
        return target instanceof ErrorClass;
    }
    return typeGuard;
}
//#endregion
//#region src/errors/clerkApiError.ts
/**
* This error contains the specific error message, code, and any additional metadata that was returned by the Clerk API.
*/ var ClerkAPIError = class {
    static kind = "ClerkApiError";
    code;
    message;
    longMessage;
    meta;
    constructor(json){
        const parsedError = {
            code: json.code,
            message: json.message,
            longMessage: json.long_message,
            meta: {
                paramName: json.meta?.param_name,
                sessionId: json.meta?.session_id,
                emailAddresses: json.meta?.email_addresses,
                identifiers: json.meta?.identifiers,
                zxcvbn: json.meta?.zxcvbn,
                plan: json.meta?.plan,
                isPlanUpgradePossible: json.meta?.is_plan_upgrade_possible
            }
        };
        this.code = parsedError.code;
        this.message = parsedError.message;
        this.longMessage = parsedError.longMessage;
        this.meta = parsedError.meta;
    }
};
/**
* Type guard to check if a value is a ClerkAPIError instance.
*/ const isClerkAPIError = createErrorTypeGuard(ClerkAPIError);
//#endregion
//#region src/errors/parseError.ts
/**
* Parses an array of ClerkAPIErrorJSON objects into an array of ClerkAPIError objects.
*
* @internal
*/ function parseErrors(data = []) {
    return data.length > 0 ? data.map((e)=>new ClerkAPIError(e)) : [];
}
/**
* Parses a ClerkAPIErrorJSON object into a ClerkAPIError object.
*
* @deprecated Use `ClerkAPIError` class instead
*
* @internal
*/ function parseError(error) {
    return new ClerkAPIError(error);
}
/**
* Converts a ClerkAPIError object into a ClerkAPIErrorJSON object.
*
* @internal
*/ function errorToJSON(error) {
    return {
        code: error?.code || "",
        message: error?.message || "",
        long_message: error?.longMessage,
        meta: {
            param_name: error?.meta?.paramName,
            session_id: error?.meta?.sessionId,
            email_addresses: error?.meta?.emailAddresses,
            identifiers: error?.meta?.identifiers,
            zxcvbn: error?.meta?.zxcvbn,
            plan: error?.meta?.plan,
            is_plan_upgrade_possible: error?.meta?.isPlanUpgradePossible
        }
    };
}
//#endregion
//#region src/errors/clerkError.ts
var ClerkError = class ClerkError extends Error {
    static kind = "ClerkError";
    clerkError = true;
    code;
    longMessage;
    docsUrl;
    cause;
    get name() {
        return this.constructor.name;
    }
    constructor(opts){
        super(new.target.formatMessage(new.target.kind, opts.message, opts.code, opts.docsUrl), {
            cause: opts.cause
        });
        Object.setPrototypeOf(this, ClerkError.prototype);
        this.code = opts.code;
        this.docsUrl = opts.docsUrl;
        this.longMessage = opts.longMessage;
        this.cause = opts.cause;
    }
    toString() {
        return `[${this.name}]\nMessage:${this.message}`;
    }
    static formatMessage(name, msg, code, docsUrl) {
        const prefix = "Clerk:";
        const regex = new RegExp(prefix.replace(" ", "\\s*"), "i");
        msg = msg.replace(regex, "");
        msg = `${prefix} ${msg.trim()}\n\n(code="${code}")\n\n`;
        if (docsUrl) msg += `\n\nDocs: ${docsUrl}`;
        return msg;
    }
};
/**
* Type guard to check if a value is a ClerkError instance.
*/ function isClerkError(val) {
    return createErrorTypeGuard(ClerkError)(val) || !!val && typeof val === "object" && "clerkError" in val && val.clerkError === true;
}
//#endregion
//#region src/errors/clerkApiResponseError.ts
var ClerkAPIResponseError = class ClerkAPIResponseError extends ClerkError {
    static kind = "ClerkAPIResponseError";
    status;
    clerkTraceId;
    retryAfter;
    errors;
    constructor(message, options){
        const { data: errorsJson, status, clerkTraceId, retryAfter } = options;
        super({
            ...options,
            message,
            code: "api_response_error"
        });
        Object.setPrototypeOf(this, ClerkAPIResponseError.prototype);
        this.status = status;
        this.clerkTraceId = clerkTraceId;
        this.retryAfter = retryAfter;
        this.errors = (errorsJson || []).map((e)=>new ClerkAPIError(e));
    }
    toString() {
        let message = `[${this.name}]\nMessage:${this.message}\nStatus:${this.status}\nSerialized errors: ${this.errors.map((e)=>JSON.stringify(e))}`;
        if (this.clerkTraceId) message += `\nClerk Trace ID: ${this.clerkTraceId}`;
        return message;
    }
    static formatMessage(name, msg, _, __) {
        return msg;
    }
};
/**
* Type guard to check if an error is a ClerkAPIResponseError.
* Can be called as a standalone function or as a method on an error object.
*
* @example
* // As a standalone function
* if (isClerkAPIResponseError(error)) { ... }
*
* // As a method (when attached to error object)
* if (error.isClerkAPIResponseError()) { ... }
*/ const isClerkAPIResponseError = createErrorTypeGuard(ClerkAPIResponseError);
//#endregion
//#region src/errors/missingExpiredTokenError.ts
/**
* Error class representing a missing expired token error from the API.
* This error occurs when the server requires an expired token to mint a new session token.
*
* Use the static `is` method to check if a ClerkAPIResponseError matches this error type.
*
* @example
* ```typescript
* if (MissingExpiredTokenError.is(error)) {
*   // Handle the missing expired token error
* }
* ```
*/ var MissingExpiredTokenError = class MissingExpiredTokenError extends ClerkAPIResponseError {
    static kind = "MissingExpiredTokenError";
    static ERROR_CODE = "missing_expired_token";
    static STATUS = 422;
    /**
	* Type guard to check if an error is a MissingExpiredTokenError.
	* This checks the error's properties (status and error code) rather than instanceof,
	* allowing it to work with ClerkAPIResponseError instances thrown from the API layer.
	*
	* @example
	* ```typescript
	* try {
	*   await someApiCall();
	* } catch (e) {
	*   if (MissingExpiredTokenError.is(e)) {
	*     // e is typed as ClerkAPIResponseError with the specific error properties
	*   }
	* }
	* ```
	*/ static is(err) {
        return isClerkAPIResponseError(err) && err.status === MissingExpiredTokenError.STATUS && err.errors.length > 0 && err.errors[0].code === MissingExpiredTokenError.ERROR_CODE;
    }
};
//#endregion
//#region src/errors/errorThrower.ts
const DefaultMessages = Object.freeze({
    InvalidProxyUrlErrorMessage: `The proxyUrl passed to Clerk is invalid. The expected value for proxyUrl is an absolute URL or a relative path with a leading '/'. (key={{url}})`,
    InvalidPublishableKeyErrorMessage: `The publishableKey passed to Clerk is invalid. You can get your Publishable key at https://dashboard.clerk.com/last-active?path=api-keys. (key={{key}})`,
    MissingPublishableKeyErrorMessage: `Missing publishableKey. You can get your key at https://dashboard.clerk.com/last-active?path=api-keys.`,
    MissingSecretKeyErrorMessage: `Missing secretKey. You can get your key at https://dashboard.clerk.com/last-active?path=api-keys.`,
    MissingClerkProvider: `{{source}} can only be used within the <ClerkProvider /> component. Learn more: https://clerk.com/docs/components/clerk-provider`
});
/**
* Builds an error thrower.
*
* @internal
*/ function buildErrorThrower({ packageName, customMessages }) {
    let pkg = packageName;
    /**
	* Builds a message from a raw message and replacements.
	*
	* @internal
	*/ function buildMessage(rawMessage, replacements) {
        if (!replacements) return `${pkg}: ${rawMessage}`;
        let msg = rawMessage;
        const matches = rawMessage.matchAll(/{{([a-zA-Z0-9-_]+)}}/g);
        for (const match of matches){
            const replacement = (replacements[match[1]] || "").toString();
            msg = msg.replace(`{{${match[1]}}}`, replacement);
        }
        return `${pkg}: ${msg}`;
    }
    const messages = {
        ...DefaultMessages,
        ...customMessages
    };
    return {
        setPackageName ({ packageName: packageName$1 }) {
            if (typeof packageName$1 === "string") pkg = packageName$1;
            return this;
        },
        setMessages ({ customMessages: customMessages$1 }) {
            Object.assign(messages, customMessages$1 || {});
            return this;
        },
        throwInvalidPublishableKeyError (params) {
            throw new Error(buildMessage(messages.InvalidPublishableKeyErrorMessage, params));
        },
        throwInvalidProxyUrl (params) {
            throw new Error(buildMessage(messages.InvalidProxyUrlErrorMessage, params));
        },
        throwMissingPublishableKeyError () {
            throw new Error(buildMessage(messages.MissingPublishableKeyErrorMessage));
        },
        throwMissingSecretKeyError () {
            throw new Error(buildMessage(messages.MissingSecretKeyErrorMessage));
        },
        throwMissingClerkProviderError (params) {
            throw new Error(buildMessage(messages.MissingClerkProvider, params));
        },
        throw (message) {
            throw new Error(buildMessage(message));
        }
    };
}
//#endregion
//#region src/errors/emailLinkError.ts
var EmailLinkError = class EmailLinkError extends Error {
    code;
    constructor(code){
        super(code);
        this.code = code;
        this.name = "EmailLinkError";
        Object.setPrototypeOf(this, EmailLinkError.prototype);
    }
};
/**
* @deprecated Use `EmailLinkErrorCodeStatus` instead.
*
* @internal
*/ const EmailLinkErrorCode = {
    Expired: "expired",
    Failed: "failed",
    ClientMismatch: "client_mismatch"
};
const EmailLinkErrorCodeStatus = {
    Expired: "expired",
    Failed: "failed",
    ClientMismatch: "client_mismatch"
};
//#endregion
//#region src/errors/clerkRuntimeError.ts
/**
* Custom error class for representing Clerk runtime errors.
*
* @class ClerkRuntimeError
*
* @example
*   throw new ClerkRuntimeError('An error occurred', { code: 'password_invalid' });
*/ var ClerkRuntimeError = class ClerkRuntimeError extends ClerkError {
    static kind = "ClerkRuntimeError";
    /**
	* @deprecated Use `clerkError` property instead. This property is maintained for backward compatibility.
	*/ clerkRuntimeError = true;
    constructor(message, options){
        super({
            ...options,
            message
        });
        Object.setPrototypeOf(this, ClerkRuntimeError.prototype);
    }
};
/**
* Type guard to check if an error is a ClerkRuntimeError.
* Can be called as a standalone function or as a method on an error object.
*
* @example
* // As a standalone function
* if (isClerkRuntimeError(error)) { ... }
*
* // As a method (when attached to error object)
* if (error.isClerkRuntimeError()) { ... }
*/ const isClerkRuntimeError = createErrorTypeGuard(ClerkRuntimeError);
//#endregion
//#region src/errors/webAuthNError.ts
var ClerkWebAuthnError = class extends ClerkRuntimeError {
    /**
	* A unique code identifying the error, can be used for localization.
	*/ code;
    constructor(message, { code }){
        super(message, {
            code
        });
        this.code = code;
    }
};
//#endregion
//#region src/errors/helpers.ts
/**
* Checks if the provided error object is an unauthorized error.
*
* @internal
*
* @deprecated This is no longer used, and will be removed in the next major version.
*/ function isUnauthorizedError(e) {
    const status = e?.status;
    return e?.errors?.[0]?.code === "authentication_invalid" && status === 401;
}
/**
* Checks if the provided error object is a captcha error.
*
* @internal
*/ function isCaptchaError(e) {
    return [
        "captcha_invalid",
        "captcha_not_enabled",
        "captcha_missing_token"
    ].includes(e.errors[0].code);
}
/**
* Checks if the provided error is a 4xx error.
*
* @internal
*/ function is4xxError(e) {
    const status = e?.status;
    return !!status && status >= 400 && status < 500;
}
/**
* Checks if the provided error is a network error.
*
* @internal
*/ function isNetworkError(e) {
    return (`${e.message}${e.name}` || "").toLowerCase().replace(/\s+/g, "").includes("networkerror");
}
/**
* Checks if the provided error is either a ClerkAPIResponseError, a ClerkRuntimeError, or a MetamaskError.
*
* @internal
*/ function isKnownError(error) {
    return isClerkAPIResponseError(error) || isMetamaskError(error) || isClerkRuntimeError(error);
}
/**
* Checks if the provided error is a Clerk runtime error indicating a reverification was cancelled.
*
* @internal
*/ function isReverificationCancelledError(err) {
    return isClerkRuntimeError(err) && err.code === "reverification_cancelled";
}
/**
* Checks if the provided error is a Metamask error.
*
* @internal
*/ function isMetamaskError(err) {
    return "code" in err && [
        4001,
        32602,
        32603
    ].includes(err.code) && "message" in err;
}
/**
* Checks if the provided error is clerk api response error indicating a user is locked.
*
* @internal
*/ function isUserLockedError(err) {
    return isClerkAPIResponseError(err) && err.errors?.[0]?.code === "user_locked";
}
/**
* Checks if the provided error is a clerk api response error indicating a password was pwned.
*
* @internal
*/ function isPasswordPwnedError(err) {
    return isClerkAPIResponseError(err) && err.errors?.[0]?.code === "form_password_pwned";
}
/**
* Checks if the provided error is a clerk api response error indicating a password was compromised.
*
* @internal
*/ function isPasswordCompromisedError(err) {
    return isClerkAPIResponseError(err) && err.errors?.[0]?.code === "form_password_compromised";
}
/**
* Checks if the provided error is an EmailLinkError.
*
* @internal
*/ function isEmailLinkError(err) {
    return err.name === "EmailLinkError";
}
//#endregion
//#region src/errors/globalHookError.ts
/**
* Creates a ClerkGlobalHookError object from a ClerkError instance.
* It's a wrapper for all the different instances of Clerk errors that can
* be returned when using Clerk hooks.
*/ function createClerkGlobalHookError(error) {
    const predicates = {
        isClerkAPIResponseError,
        isClerkRuntimeError
    };
    for (const [name, fn] of Object.entries(predicates))Object.assign(error, {
        [name]: fn
    });
    return error;
}
;
 //# sourceMappingURL=error-Dl9xmUf3.mjs.map
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/error.mjs [app-rsc] (ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([]);
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$error$2d$Dl9xmUf3$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/error-Dl9xmUf3.mjs [app-rsc] (ecmascript)");
;
;
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+nextjs@6.36.5+3439e0367b3d7557/node_modules/@clerk/nextjs/dist/esm/server/errorThrower.js [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "errorThrower",
    ()=>errorThrower
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$error$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/error.mjs [app-rsc] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$error$2d$Dl9xmUf3$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/error-Dl9xmUf3.mjs [app-rsc] (ecmascript)");
;
;
const errorThrower = (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$error$2d$Dl9xmUf3$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["buildErrorThrower"])({
    packageName: "@clerk/nextjs"
});
;
 //# sourceMappingURL=errorThrower.js.map
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/runtimeEnvironment-BB2sO-19.mjs [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "isDevelopmentEnvironment",
    ()=>isDevelopmentEnvironment,
    "isProductionEnvironment",
    ()=>isProductionEnvironment,
    "isTestEnvironment",
    ()=>isTestEnvironment
]);
//#region src/utils/runtimeEnvironment.ts
const isDevelopmentEnvironment = ()=>{
    try {
        return ("TURBOPACK compile-time value", "development") === "development";
    } catch  {}
    return false;
};
const isTestEnvironment = ()=>{
    try {
        return ("TURBOPACK compile-time value", "development") === "test";
    } catch  {}
    return false;
};
const isProductionEnvironment = ()=>{
    try {
        return ("TURBOPACK compile-time value", "development") === "production";
    } catch  {}
    return false;
};
;
 //# sourceMappingURL=runtimeEnvironment-BB2sO-19.mjs.map
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/deprecated-BqlFbLHj.mjs [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "deprecated",
    ()=>deprecated,
    "deprecatedObjectProperty",
    ()=>deprecatedObjectProperty,
    "deprecatedProperty",
    ()=>deprecatedProperty
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$runtimeEnvironment$2d$BB2sO$2d$19$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/runtimeEnvironment-BB2sO-19.mjs [app-rsc] (ecmascript)");
;
//#region src/deprecated.ts
/**
* Mark class method / function as deprecated.
*
* A console WARNING will be displayed when class method / function is invoked.
*
* Examples
* 1. Deprecate class method
* class Example {
*   getSomething = (arg1, arg2) => {
*       deprecated('Example.getSomething', 'Use `getSomethingElse` instead.');
*       return `getSomethingValue:${arg1 || '-'}:${arg2 || '-'}`;
*   };
* }
*
* 2. Deprecate function
* const getSomething = () => {
*   deprecated('getSomething', 'Use `getSomethingElse` instead.');
*   return 'getSomethingValue';
* };
*/ const displayedWarnings = /* @__PURE__ */ new Set();
const deprecated = (fnName, warning, key)=>{
    const hideWarning = (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$runtimeEnvironment$2d$BB2sO$2d$19$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["isTestEnvironment"])() || (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$runtimeEnvironment$2d$BB2sO$2d$19$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["isProductionEnvironment"])();
    const messageId = key ?? fnName;
    if (displayedWarnings.has(messageId) || hideWarning) return;
    displayedWarnings.add(messageId);
    console.warn(`Clerk - DEPRECATION WARNING: "${fnName}" is deprecated and will be removed in the next major release.\n${warning}`);
};
const deprecatedProperty = (cls, propName, warning, isStatic = false)=>{
    const target = isStatic ? cls : cls.prototype;
    let value = target[propName];
    Object.defineProperty(target, propName, {
        get () {
            deprecated(propName, warning, `${cls.name}:${propName}`);
            return value;
        },
        set (v) {
            value = v;
        }
    });
};
/**
* Mark object property as deprecated.
*
* A console WARNING will be displayed when object property is being accessed.
*
* 1. Deprecate object property
* const obj = { something: 'aloha' };
*
* deprecatedObjectProperty(obj, 'something', 'Use `somethingElse` instead.');
*/ const deprecatedObjectProperty = (obj, propName, warning, key)=>{
    let value = obj[propName];
    Object.defineProperty(obj, propName, {
        get () {
            deprecated(propName, warning, key);
            return value;
        },
        set (v) {
            value = v;
        }
    });
};
;
 //# sourceMappingURL=deprecated-BqlFbLHj.mjs.map
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/deprecated.mjs [app-rsc] (ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([]);
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$runtimeEnvironment$2d$BB2sO$2d$19$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/runtimeEnvironment-BB2sO-19.mjs [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$deprecated$2d$BqlFbLHj$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/deprecated-BqlFbLHj.mjs [app-rsc] (ecmascript)");
;
;
;
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/constants-ByUssRbE.mjs [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "CURRENT_DEV_INSTANCE_SUFFIXES",
    ()=>CURRENT_DEV_INSTANCE_SUFFIXES,
    "DEV_OR_STAGING_SUFFIXES",
    ()=>DEV_OR_STAGING_SUFFIXES,
    "LEGACY_DEV_INSTANCE_SUFFIXES",
    ()=>LEGACY_DEV_INSTANCE_SUFFIXES,
    "LOCAL_API_URL",
    ()=>LOCAL_API_URL,
    "LOCAL_ENV_SUFFIXES",
    ()=>LOCAL_ENV_SUFFIXES,
    "PROD_API_URL",
    ()=>PROD_API_URL,
    "STAGING_API_URL",
    ()=>STAGING_API_URL,
    "STAGING_ENV_SUFFIXES",
    ()=>STAGING_ENV_SUFFIXES,
    "iconImageUrl",
    ()=>iconImageUrl
]);
//#region src/constants.ts
const LEGACY_DEV_INSTANCE_SUFFIXES = [
    ".lcl.dev",
    ".lclstage.dev",
    ".lclclerk.com"
];
const CURRENT_DEV_INSTANCE_SUFFIXES = [
    ".accounts.dev",
    ".accountsstage.dev",
    ".accounts.lclclerk.com"
];
const DEV_OR_STAGING_SUFFIXES = [
    ".lcl.dev",
    ".stg.dev",
    ".lclstage.dev",
    ".stgstage.dev",
    ".dev.lclclerk.com",
    ".stg.lclclerk.com",
    ".accounts.lclclerk.com",
    "accountsstage.dev",
    "accounts.dev"
];
const LOCAL_ENV_SUFFIXES = [
    ".lcl.dev",
    "lclstage.dev",
    ".lclclerk.com",
    ".accounts.lclclerk.com"
];
const STAGING_ENV_SUFFIXES = [
    ".accountsstage.dev"
];
const LOCAL_API_URL = "https://api.lclclerk.com";
const STAGING_API_URL = "https://api.clerkstage.dev";
const PROD_API_URL = "https://api.clerk.com";
/**
* Returns the URL for a static image
* using the new img.clerk.com service
*/ function iconImageUrl(id, format = "svg") {
    return `https://img.clerk.com/static/${id}.${format}`;
}
;
 //# sourceMappingURL=constants-ByUssRbE.mjs.map
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/isomorphicAtob-DybBXGFR.mjs [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "isomorphicAtob",
    ()=>isomorphicAtob
]);
//#region src/isomorphicAtob.ts
/**
* A function that decodes a string of data which has been encoded using base-64 encoding.
* Uses `atob` if available, otherwise uses `Buffer` from `global`. If neither are available, returns the data as-is.
*/ const isomorphicAtob = (data)=>{
    if (typeof atob !== "undefined" && typeof atob === "function") return atob(data);
    else if (("TURBOPACK compile-time value", "object") !== "undefined" && /*TURBOPACK member replacement*/ __turbopack_context__.g.Buffer) return new /*TURBOPACK member replacement*/ __turbopack_context__.g.Buffer(data, "base64").toString();
    return data;
};
;
 //# sourceMappingURL=isomorphicAtob-DybBXGFR.mjs.map
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/isomorphicBtoa-Dr7WubZv.mjs [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "isomorphicBtoa",
    ()=>isomorphicBtoa
]);
//#region src/isomorphicBtoa.ts
const isomorphicBtoa = (data)=>{
    if (typeof btoa !== "undefined" && typeof btoa === "function") return btoa(data);
    else if (("TURBOPACK compile-time value", "object") !== "undefined" && /*TURBOPACK member replacement*/ __turbopack_context__.g.Buffer) return new /*TURBOPACK member replacement*/ __turbopack_context__.g.Buffer(data).toString("base64");
    return data;
};
;
 //# sourceMappingURL=isomorphicBtoa-Dr7WubZv.mjs.map
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/keys-YNv6yjKk.mjs [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "buildPublishableKey",
    ()=>buildPublishableKey,
    "createDevOrStagingUrlCache",
    ()=>createDevOrStagingUrlCache,
    "getCookieSuffix",
    ()=>getCookieSuffix,
    "getSuffixedCookieName",
    ()=>getSuffixedCookieName,
    "isDevelopmentFromPublishableKey",
    ()=>isDevelopmentFromPublishableKey,
    "isDevelopmentFromSecretKey",
    ()=>isDevelopmentFromSecretKey,
    "isProductionFromPublishableKey",
    ()=>isProductionFromPublishableKey,
    "isProductionFromSecretKey",
    ()=>isProductionFromSecretKey,
    "isPublishableKey",
    ()=>isPublishableKey,
    "parsePublishableKey",
    ()=>parsePublishableKey
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$constants$2d$ByUssRbE$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/constants-ByUssRbE.mjs [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$isomorphicAtob$2d$DybBXGFR$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/isomorphicAtob-DybBXGFR.mjs [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$isomorphicBtoa$2d$Dr7WubZv$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/isomorphicBtoa-Dr7WubZv.mjs [app-rsc] (ecmascript)");
;
;
;
//#region src/keys.ts
/** Prefix used for production publishable keys */ const PUBLISHABLE_KEY_LIVE_PREFIX = "pk_live_";
/** Prefix used for development publishable keys */ const PUBLISHABLE_KEY_TEST_PREFIX = "pk_test_";
/**
* Regular expression that matches development frontend API keys.
* Matches patterns like: foo-bar-13.clerk.accounts.dev.
*/ const PUBLISHABLE_FRONTEND_API_DEV_REGEX = /^(([a-z]+)-){2}([0-9]{1,2})\.clerk\.accounts([a-z.]*)(dev|com)$/i;
/**
* Converts a frontend API URL into a base64-encoded publishable key.
*
* @param frontendApi - The frontend API URL (e.g., 'clerk.example.com').
* @returns A base64-encoded publishable key with appropriate prefix (pk_live_ or pk_test_).
*/ function buildPublishableKey(frontendApi) {
    return `${PUBLISHABLE_FRONTEND_API_DEV_REGEX.test(frontendApi) || frontendApi.startsWith("clerk.") && __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$constants$2d$ByUssRbE$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["LEGACY_DEV_INSTANCE_SUFFIXES"].some((s)=>frontendApi.endsWith(s)) ? PUBLISHABLE_KEY_TEST_PREFIX : PUBLISHABLE_KEY_LIVE_PREFIX}${(0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$isomorphicBtoa$2d$Dr7WubZv$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["isomorphicBtoa"])(`${frontendApi}$`)}`;
}
/**
* Validates that a decoded publishable key has the correct format.
* The decoded value should be a frontend API followed by exactly one '$' at the end.
*
* @param decoded - The decoded publishable key string to validate.
* @returns `true` if the decoded key has valid format, `false` otherwise.
*/ function isValidDecodedPublishableKey(decoded) {
    if (!decoded.endsWith("$")) return false;
    const withoutTrailing = decoded.slice(0, -1);
    if (withoutTrailing.includes("$")) return false;
    return withoutTrailing.includes(".");
}
/**
* Parses and validates a publishable key, extracting the frontend API and instance type.
*
* @param key - The publishable key to parse.
* @param options - Configuration options for parsing.
* @param options.fatal
* @param options.domain
* @param options.proxyUrl
* @param options.isSatellite
* @returns Parsed publishable key object with instanceType and frontendApi, or null if invalid.
*
* @throws {Error} When options.fatal is true and key is missing or invalid.
*/ function parsePublishableKey(key, options = {}) {
    key = key || "";
    if (!key || !isPublishableKey(key)) {
        if (options.fatal && !key) throw new Error("Publishable key is missing. Ensure that your publishable key is correctly configured. Double-check your environment configuration for your keys, or access them here: https://dashboard.clerk.com/last-active?path=api-keys");
        if (options.fatal && !isPublishableKey(key)) throw new Error("Publishable key not valid.");
        return null;
    }
    const instanceType = key.startsWith(PUBLISHABLE_KEY_LIVE_PREFIX) ? "production" : "development";
    let decodedFrontendApi;
    try {
        decodedFrontendApi = (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$isomorphicAtob$2d$DybBXGFR$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["isomorphicAtob"])(key.split("_")[2]);
    } catch  {
        if (options.fatal) throw new Error("Publishable key not valid: Failed to decode key.");
        return null;
    }
    if (!isValidDecodedPublishableKey(decodedFrontendApi)) {
        if (options.fatal) throw new Error("Publishable key not valid: Decoded key has invalid format.");
        return null;
    }
    let frontendApi = decodedFrontendApi.slice(0, -1);
    if (options.proxyUrl) frontendApi = options.proxyUrl;
    else if (instanceType !== "development" && options.domain && options.isSatellite) frontendApi = `clerk.${options.domain}`;
    return {
        instanceType,
        frontendApi
    };
}
/**
* Checks if the provided key is a valid publishable key.
*
* @param key - The key to be checked. Defaults to an empty string if not provided.
* @returns `true` if 'key' is a valid publishable key, `false` otherwise.
*/ function isPublishableKey(key = "") {
    try {
        if (!(key.startsWith(PUBLISHABLE_KEY_LIVE_PREFIX) || key.startsWith(PUBLISHABLE_KEY_TEST_PREFIX))) return false;
        const parts = key.split("_");
        if (parts.length !== 3) return false;
        const encodedPart = parts[2];
        if (!encodedPart) return false;
        return isValidDecodedPublishableKey((0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$isomorphicAtob$2d$DybBXGFR$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["isomorphicAtob"])(encodedPart));
    } catch  {
        return false;
    }
}
/**
* Creates a memoized cache for checking if URLs are development or staging environments.
* Uses a Map to cache results for better performance on repeated checks.
*
* @returns An object with an isDevOrStagingUrl method that checks if a URL is dev/staging.
*/ function createDevOrStagingUrlCache() {
    const devOrStagingUrlCache = /* @__PURE__ */ new Map();
    return {
        isDevOrStagingUrl: (url)=>{
            if (!url) return false;
            const hostname = typeof url === "string" ? url : url.hostname;
            let res = devOrStagingUrlCache.get(hostname);
            if (res === void 0) {
                res = __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$constants$2d$ByUssRbE$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["DEV_OR_STAGING_SUFFIXES"].some((s)=>hostname.endsWith(s));
                devOrStagingUrlCache.set(hostname, res);
            }
            return res;
        }
    };
}
/**
* Checks if a publishable key is for a development environment.
* Supports both legacy format (test_) and new format (pk_test_).
*
* @param apiKey - The API key to check.
* @returns `true` if the key is for development, `false` otherwise.
*/ function isDevelopmentFromPublishableKey(apiKey) {
    return apiKey.startsWith("test_") || apiKey.startsWith("pk_test_");
}
/**
* Checks if a publishable key is for a production environment.
* Supports both legacy format (live_) and new format (pk_live_).
*
* @param apiKey - The API key to check.
* @returns `true` if the key is for production, `false` otherwise.
*/ function isProductionFromPublishableKey(apiKey) {
    return apiKey.startsWith("live_") || apiKey.startsWith("pk_live_");
}
/**
* Checks if a secret key is for a development environment.
* Supports both legacy format (test_) and new format (sk_test_).
*
* @param apiKey - The secret key to check.
* @returns `true` if the key is for development, `false` otherwise.
*/ function isDevelopmentFromSecretKey(apiKey) {
    return apiKey.startsWith("test_") || apiKey.startsWith("sk_test_");
}
/**
* Checks if a secret key is for a production environment.
* Supports both legacy format (live_) and new format (sk_live_).
*
* @param apiKey - The secret key to check.
* @returns `true` if the key is for production, `false` otherwise.
*/ function isProductionFromSecretKey(apiKey) {
    return apiKey.startsWith("live_") || apiKey.startsWith("sk_live_");
}
/**
* Generates a unique cookie suffix based on the publishable key using SHA-1 hashing.
* The suffix is base64-encoded and URL-safe (+ and / characters are replaced).
*
* @param publishableKey - The publishable key to generate suffix from.
* @param subtle - The SubtleCrypto interface to use for hashing (defaults to globalThis.crypto.subtle).
* @returns A promise that resolves to an 8-character URL-safe base64 string.
*/ async function getCookieSuffix(publishableKey, subtle = globalThis.crypto.subtle) {
    const data = new TextEncoder().encode(publishableKey);
    const digest = await subtle.digest("sha-1", data);
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$isomorphicBtoa$2d$Dr7WubZv$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["isomorphicBtoa"])(String.fromCharCode(...new Uint8Array(digest))).replace(/\+/gi, "-").replace(/\//gi, "_").substring(0, 8);
}
/**
* Creates a suffixed cookie name by appending the cookie suffix to the base name.
* Used to create unique cookie names based on the publishable key.
*
* @param cookieName - The base cookie name.
* @param cookieSuffix - The suffix to append (typically generated by getCookieSuffix).
* @returns The suffixed cookie name in format: `${cookieName}_${cookieSuffix}`.
*/ const getSuffixedCookieName = (cookieName, cookieSuffix)=>{
    return `${cookieName}_${cookieSuffix}`;
};
;
 //# sourceMappingURL=keys-YNv6yjKk.mjs.map
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/keys.mjs [app-rsc] (ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([]);
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$constants$2d$ByUssRbE$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/constants-ByUssRbE.mjs [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$isomorphicAtob$2d$DybBXGFR$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/isomorphicAtob-DybBXGFR.mjs [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$isomorphicBtoa$2d$Dr7WubZv$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/isomorphicBtoa-Dr7WubZv.mjs [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$keys$2d$YNv6yjKk$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/keys-YNv6yjKk.mjs [app-rsc] (ecmascript)");
;
;
;
;
;
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/retry-DAlTROH9.mjs [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "retry",
    ()=>retry
]);
//#region src/retry.ts
const defaultOptions = {
    initialDelay: 125,
    maxDelayBetweenRetries: 0,
    factor: 2,
    shouldRetry: (_, iteration)=>iteration < 5,
    retryImmediately: false,
    jitter: true
};
const RETRY_IMMEDIATELY_DELAY = 100;
const sleep = async (ms)=>new Promise((s)=>setTimeout(s, ms));
const applyJitter = (delay, jitter)=>{
    return jitter ? delay * (1 + Math.random()) : delay;
};
const createExponentialDelayAsyncFn = (opts)=>{
    let timesCalled = 0;
    const calculateDelayInMs = ()=>{
        const constant = opts.initialDelay;
        const base = opts.factor;
        let delay = constant * Math.pow(base, timesCalled);
        delay = applyJitter(delay, opts.jitter);
        return Math.min(opts.maxDelayBetweenRetries || delay, delay);
    };
    return async ()=>{
        await sleep(calculateDelayInMs());
        timesCalled++;
    };
};
/**
* Retries a callback until it succeeds or the shouldRetry function returns false.
* See {@link RetryOptions} for the available options.
*/ const retry = async (callback, options = {})=>{
    let iterations = 0;
    const { shouldRetry, initialDelay, maxDelayBetweenRetries, factor, retryImmediately, jitter, onBeforeRetry } = {
        ...defaultOptions,
        ...options
    };
    const delay = createExponentialDelayAsyncFn({
        initialDelay,
        maxDelayBetweenRetries,
        factor,
        jitter
    });
    while(true)try {
        return await callback();
    } catch (e) {
        iterations++;
        if (!shouldRetry(e, iterations)) throw e;
        if (onBeforeRetry) await onBeforeRetry(iterations);
        if (retryImmediately && iterations === 1) await sleep(applyJitter(RETRY_IMMEDIATELY_DELAY, jitter));
        else await delay();
    }
};
;
 //# sourceMappingURL=retry-DAlTROH9.mjs.map
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/retry.mjs [app-rsc] (ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([]);
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$retry$2d$DAlTROH9$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/retry-DAlTROH9.mjs [app-rsc] (ecmascript)");
;
;
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/instance-Cze6Nv61.mjs [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "isStaging",
    ()=>isStaging
]);
//#region src/utils/instance.ts
/**
* Check if the frontendApi ends with a staging domain
*/ function isStaging(frontendApi) {
    return frontendApi.endsWith(".lclstage.dev") || frontendApi.endsWith(".stgstage.dev") || frontendApi.endsWith(".clerkstage.dev") || frontendApi.endsWith(".accountsstage.dev");
}
;
 //# sourceMappingURL=instance-Cze6Nv61.mjs.map
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/url-Cdy8w8vK.mjs [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "addClerkPrefix",
    ()=>addClerkPrefix,
    "cleanDoubleSlashes",
    ()=>cleanDoubleSlashes,
    "getClerkJsMajorVersionOrTag",
    ()=>getClerkJsMajorVersionOrTag,
    "getScriptUrl",
    ()=>getScriptUrl,
    "hasLeadingSlash",
    ()=>hasLeadingSlash,
    "hasTrailingSlash",
    ()=>hasTrailingSlash,
    "isAbsoluteUrl",
    ()=>isAbsoluteUrl,
    "isCurrentDevAccountPortalOrigin",
    ()=>isCurrentDevAccountPortalOrigin,
    "isLegacyDevAccountPortalOrigin",
    ()=>isLegacyDevAccountPortalOrigin,
    "isNonEmptyURL",
    ()=>isNonEmptyURL,
    "joinURL",
    ()=>joinURL,
    "parseSearchParams",
    ()=>parseSearchParams,
    "stripScheme",
    ()=>stripScheme,
    "withLeadingSlash",
    ()=>withLeadingSlash,
    "withTrailingSlash",
    ()=>withTrailingSlash,
    "withoutLeadingSlash",
    ()=>withoutLeadingSlash,
    "withoutTrailingSlash",
    ()=>withoutTrailingSlash
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$constants$2d$ByUssRbE$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/constants-ByUssRbE.mjs [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$instance$2d$Cze6Nv61$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/instance-Cze6Nv61.mjs [app-rsc] (ecmascript)");
;
;
//#region src/url.ts
function parseSearchParams(queryString = "") {
    if (queryString.startsWith("?")) queryString = queryString.slice(1);
    return new URLSearchParams(queryString);
}
function stripScheme(url = "") {
    return (url || "").replace(/^.+:\/\//, "");
}
function addClerkPrefix(str) {
    if (!str) return "";
    let regex;
    if (str.match(/^(clerk\.)+\w*$/)) regex = /(clerk\.)*(?=clerk\.)/;
    else if (str.match(/\.clerk.accounts/)) return str;
    else regex = /^(clerk\.)*/gi;
    return `clerk.${str.replace(regex, "")}`;
}
/**
*
* Retrieve the clerk-js major tag using the major version from the pkgVersion
* param or use the frontendApi to determine if the canary tag should be used.
* The default tag is `latest`.
*/ const getClerkJsMajorVersionOrTag = (frontendApi, version)=>{
    if (!version && (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$instance$2d$Cze6Nv61$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["isStaging"])(frontendApi)) return "canary";
    if (!version) return "latest";
    return version.split(".")[0] || "latest";
};
/**
*
* Retrieve the clerk-js script url from the frontendApi and the major tag
* using the {@link getClerkJsMajorVersionOrTag} or a provided clerkJSVersion tag.
*/ const getScriptUrl = (frontendApi, { clerkJSVersion })=>{
    const noSchemeFrontendApi = frontendApi.replace(/http(s)?:\/\//, "");
    const major = getClerkJsMajorVersionOrTag(frontendApi, clerkJSVersion);
    return `https://${noSchemeFrontendApi}/npm/@clerk/clerk-js@${clerkJSVersion || major}/dist/clerk.browser.js`;
};
function isLegacyDevAccountPortalOrigin(host) {
    return __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$constants$2d$ByUssRbE$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["LEGACY_DEV_INSTANCE_SUFFIXES"].some((legacyDevSuffix)=>{
        return host.startsWith("accounts.") && host.endsWith(legacyDevSuffix);
    });
}
function isCurrentDevAccountPortalOrigin(host) {
    return __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$constants$2d$ByUssRbE$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["CURRENT_DEV_INSTANCE_SUFFIXES"].some((currentDevSuffix)=>{
        return host.endsWith(currentDevSuffix) && !host.endsWith(".clerk" + currentDevSuffix);
    });
}
const TRAILING_SLASH_RE = /\/$|\/\?|\/#/;
function hasTrailingSlash(input = "", respectQueryAndFragment) {
    if (!respectQueryAndFragment) return input.endsWith("/");
    return TRAILING_SLASH_RE.test(input);
}
function withTrailingSlash(input = "", respectQueryAndFragment) {
    if (!respectQueryAndFragment) return input.endsWith("/") ? input : input + "/";
    if (hasTrailingSlash(input, true)) return input || "/";
    let path = input;
    let fragment = "";
    const fragmentIndex = input.indexOf("#");
    if (fragmentIndex >= 0) {
        path = input.slice(0, fragmentIndex);
        fragment = input.slice(fragmentIndex);
        if (!path) return fragment;
    }
    const [s0, ...s] = path.split("?");
    return s0 + "/" + (s.length > 0 ? `?${s.join("?")}` : "") + fragment;
}
function withoutTrailingSlash(input = "", respectQueryAndFragment) {
    if (!respectQueryAndFragment) return (hasTrailingSlash(input) ? input.slice(0, -1) : input) || "/";
    if (!hasTrailingSlash(input, true)) return input || "/";
    let path = input;
    let fragment = "";
    const fragmentIndex = input.indexOf("#");
    if (fragmentIndex >= 0) {
        path = input.slice(0, fragmentIndex);
        fragment = input.slice(fragmentIndex);
    }
    const [s0, ...s] = path.split("?");
    return (s0.slice(0, -1) || "/") + (s.length > 0 ? `?${s.join("?")}` : "") + fragment;
}
function hasLeadingSlash(input = "") {
    return input.startsWith("/");
}
function withoutLeadingSlash(input = "") {
    return (hasLeadingSlash(input) ? input.slice(1) : input) || "/";
}
function withLeadingSlash(input = "") {
    return hasLeadingSlash(input) ? input : "/" + input;
}
function cleanDoubleSlashes(input = "") {
    return input.split("://").map((string_)=>string_.replace(/\/{2,}/g, "/")).join("://");
}
function isNonEmptyURL(url) {
    return url && url !== "/";
}
const JOIN_LEADING_SLASH_RE = /^\.?\//;
function joinURL(base, ...input) {
    let url = base || "";
    for (const segment of input.filter((url$1)=>isNonEmptyURL(url$1)))if (url) {
        const _segment = segment.replace(JOIN_LEADING_SLASH_RE, "");
        url = withTrailingSlash(url) + _segment;
    } else url = segment;
    return url;
}
const ABSOLUTE_URL_REGEX = /^[a-zA-Z][a-zA-Z\d+\-.]*?:/;
const isAbsoluteUrl = (url)=>ABSOLUTE_URL_REGEX.test(url);
;
 //# sourceMappingURL=url-Cdy8w8vK.mjs.map
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/url.mjs [app-rsc] (ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([]);
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$constants$2d$ByUssRbE$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/constants-ByUssRbE.mjs [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$instance$2d$Cze6Nv61$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/instance-Cze6Nv61.mjs [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$url$2d$Cdy8w8vK$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/url-Cdy8w8vK.mjs [app-rsc] (ecmascript)");
;
;
;
;
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+backend@2.29.0+67f6792bdf102c28/node_modules/@clerk/backend/dist/chunk-YBVFDYDR.mjs [app-rsc] (ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "errorThrower",
    ()=>errorThrower
]);
// src/util/shared.ts
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$deprecated$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/deprecated.mjs [app-rsc] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$deprecated$2d$BqlFbLHj$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/deprecated-BqlFbLHj.mjs [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$keys$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/keys.mjs [app-rsc] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$keys$2d$YNv6yjKk$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/keys-YNv6yjKk.mjs [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$retry$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/retry.mjs [app-rsc] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$retry$2d$DAlTROH9$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/retry-DAlTROH9.mjs [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$url$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/url.mjs [app-rsc] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$error$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/error.mjs [app-rsc] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$error$2d$Dl9xmUf3$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/error-Dl9xmUf3.mjs [app-rsc] (ecmascript)");
;
;
;
;
;
;
var errorThrower = (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$error$2d$Dl9xmUf3$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["buildErrorThrower"])({
    packageName: "@clerk/backend"
});
var { isDevOrStagingUrl } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$keys$2d$YNv6yjKk$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createDevOrStagingUrlCache"])();
;
 //# sourceMappingURL=chunk-YBVFDYDR.mjs.map
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+backend@2.29.0+67f6792bdf102c28/node_modules/@clerk/backend/dist/chunk-TCIXZLLW.mjs [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "MachineTokenVerificationError",
    ()=>MachineTokenVerificationError,
    "MachineTokenVerificationErrorCode",
    ()=>MachineTokenVerificationErrorCode,
    "SignJWTError",
    ()=>SignJWTError,
    "TokenVerificationError",
    ()=>TokenVerificationError,
    "TokenVerificationErrorAction",
    ()=>TokenVerificationErrorAction,
    "TokenVerificationErrorCode",
    ()=>TokenVerificationErrorCode,
    "TokenVerificationErrorReason",
    ()=>TokenVerificationErrorReason
]);
// src/errors.ts
var TokenVerificationErrorCode = {
    InvalidSecretKey: "clerk_key_invalid"
};
var TokenVerificationErrorReason = {
    TokenExpired: "token-expired",
    TokenInvalid: "token-invalid",
    TokenInvalidAlgorithm: "token-invalid-algorithm",
    TokenInvalidAuthorizedParties: "token-invalid-authorized-parties",
    TokenInvalidSignature: "token-invalid-signature",
    TokenNotActiveYet: "token-not-active-yet",
    TokenIatInTheFuture: "token-iat-in-the-future",
    TokenVerificationFailed: "token-verification-failed",
    InvalidSecretKey: "secret-key-invalid",
    LocalJWKMissing: "jwk-local-missing",
    RemoteJWKFailedToLoad: "jwk-remote-failed-to-load",
    RemoteJWKInvalid: "jwk-remote-invalid",
    RemoteJWKMissing: "jwk-remote-missing",
    JWKFailedToResolve: "jwk-failed-to-resolve",
    JWKKidMismatch: "jwk-kid-mismatch"
};
var TokenVerificationErrorAction = {
    ContactSupport: "Contact support@clerk.com",
    EnsureClerkJWT: "Make sure that this is a valid Clerk-generated JWT.",
    SetClerkJWTKey: "Set the CLERK_JWT_KEY environment variable.",
    SetClerkSecretKey: "Set the CLERK_SECRET_KEY environment variable.",
    EnsureClockSync: "Make sure your system clock is in sync (e.g. turn off and on automatic time synchronization)."
};
var TokenVerificationError = class _TokenVerificationError extends Error {
    constructor({ action, message, reason }){
        super(message);
        Object.setPrototypeOf(this, _TokenVerificationError.prototype);
        this.reason = reason;
        this.message = message;
        this.action = action;
    }
    getFullMessage() {
        return `${[
            this.message,
            this.action
        ].filter((m)=>m).join(" ")} (reason=${this.reason}, token-carrier=${this.tokenCarrier})`;
    }
};
var SignJWTError = class extends Error {
};
var MachineTokenVerificationErrorCode = {
    TokenInvalid: "token-invalid",
    InvalidSecretKey: "secret-key-invalid",
    UnexpectedError: "unexpected-error",
    TokenVerificationFailed: "token-verification-failed"
};
var MachineTokenVerificationError = class _MachineTokenVerificationError extends Error {
    constructor({ message, code, status, action }){
        super(message);
        Object.setPrototypeOf(this, _MachineTokenVerificationError.prototype);
        this.code = code;
        this.status = status;
        this.action = action;
    }
    getFullMessage() {
        return `${this.message} (code=${this.code}, status=${this.status || "n/a"})`;
    }
};
;
 //# sourceMappingURL=chunk-TCIXZLLW.mjs.map
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+backend@2.29.0+67f6792bdf102c28/node_modules/@clerk/backend/dist/runtime/node/crypto.mjs [app-rsc] (ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([]);
var __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$crypto__$5b$external$5d$__$28$node$3a$crypto$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/node:crypto [external] (node:crypto, cjs)");
;
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/isomorphicAtob.mjs [app-rsc] (ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([]);
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$isomorphicAtob$2d$DybBXGFR$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/isomorphicAtob-DybBXGFR.mjs [app-rsc] (ecmascript)");
;
;
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+backend@2.29.0+67f6792bdf102c28/node_modules/@clerk/backend/dist/chunk-7X3P2E3X.mjs [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "assertHeaderAlgorithm",
    ()=>assertHeaderAlgorithm,
    "assertHeaderType",
    ()=>assertHeaderType,
    "base64url",
    ()=>base64url,
    "decodeJwt",
    ()=>decodeJwt,
    "getCryptoAlgorithm",
    ()=>getCryptoAlgorithm,
    "hasValidSignature",
    ()=>hasValidSignature,
    "importKey",
    ()=>importKey,
    "runtime",
    ()=>runtime,
    "verifyJwt",
    ()=>verifyJwt
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TCIXZLLW$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+backend@2.29.0+67f6792bdf102c28/node_modules/@clerk/backend/dist/chunk-TCIXZLLW.mjs [app-rsc] (ecmascript)");
// src/runtime.ts
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$runtime$2f$node$2f$crypto$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+backend@2.29.0+67f6792bdf102c28/node_modules/@clerk/backend/dist/runtime/node/crypto.mjs [app-rsc] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$crypto__$5b$external$5d$__$28$node$3a$crypto$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/node:crypto [external] (node:crypto, cjs)");
// src/jwt/cryptoKeys.ts
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$isomorphicAtob$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/isomorphicAtob.mjs [app-rsc] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$isomorphicAtob$2d$DybBXGFR$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/isomorphicAtob-DybBXGFR.mjs [app-rsc] (ecmascript)");
;
;
var globalFetch = fetch.bind(globalThis);
var runtime = {
    crypto: __TURBOPACK__imported__module__$5b$externals$5d2f$node$3a$crypto__$5b$external$5d$__$28$node$3a$crypto$2c$__cjs$29$__["webcrypto"],
    get fetch () {
        return ("TURBOPACK compile-time falsy", 0) ? "TURBOPACK unreachable" : globalFetch;
    },
    AbortController: globalThis.AbortController,
    Blob: globalThis.Blob,
    FormData: globalThis.FormData,
    Headers: globalThis.Headers,
    Request: globalThis.Request,
    Response: globalThis.Response
};
// src/util/rfc4648.ts
var base64url = {
    parse (string, opts) {
        return parse(string, base64UrlEncoding, opts);
    },
    stringify (data, opts) {
        return stringify(data, base64UrlEncoding, opts);
    }
};
var base64UrlEncoding = {
    chars: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_",
    bits: 6
};
function parse(string, encoding, opts = {}) {
    if (!encoding.codes) {
        encoding.codes = {};
        for(let i = 0; i < encoding.chars.length; ++i){
            encoding.codes[encoding.chars[i]] = i;
        }
    }
    if (!opts.loose && string.length * encoding.bits & 7) {
        throw new SyntaxError("Invalid padding");
    }
    let end = string.length;
    while(string[end - 1] === "="){
        --end;
        if (!opts.loose && !((string.length - end) * encoding.bits & 7)) {
            throw new SyntaxError("Invalid padding");
        }
    }
    const out = new (opts.out ?? Uint8Array)(end * encoding.bits / 8 | 0);
    let bits = 0;
    let buffer = 0;
    let written = 0;
    for(let i = 0; i < end; ++i){
        const value = encoding.codes[string[i]];
        if (value === void 0) {
            throw new SyntaxError("Invalid character " + string[i]);
        }
        buffer = buffer << encoding.bits | value;
        bits += encoding.bits;
        if (bits >= 8) {
            bits -= 8;
            out[written++] = 255 & buffer >> bits;
        }
    }
    if (bits >= encoding.bits || 255 & buffer << 8 - bits) {
        throw new SyntaxError("Unexpected end of data");
    }
    return out;
}
function stringify(data, encoding, opts = {}) {
    const { pad = true } = opts;
    const mask = (1 << encoding.bits) - 1;
    let out = "";
    let bits = 0;
    let buffer = 0;
    for(let i = 0; i < data.length; ++i){
        buffer = buffer << 8 | 255 & data[i];
        bits += 8;
        while(bits > encoding.bits){
            bits -= encoding.bits;
            out += encoding.chars[mask & buffer >> bits];
        }
    }
    if (bits) {
        out += encoding.chars[mask & buffer << encoding.bits - bits];
    }
    if (pad) {
        while(out.length * encoding.bits & 7){
            out += "=";
        }
    }
    return out;
}
// src/jwt/algorithms.ts
var algToHash = {
    RS256: "SHA-256",
    RS384: "SHA-384",
    RS512: "SHA-512"
};
var RSA_ALGORITHM_NAME = "RSASSA-PKCS1-v1_5";
var jwksAlgToCryptoAlg = {
    RS256: RSA_ALGORITHM_NAME,
    RS384: RSA_ALGORITHM_NAME,
    RS512: RSA_ALGORITHM_NAME
};
var algs = Object.keys(algToHash);
function getCryptoAlgorithm(algorithmName) {
    const hash = algToHash[algorithmName];
    const name = jwksAlgToCryptoAlg[algorithmName];
    if (!hash || !name) {
        throw new Error(`Unsupported algorithm ${algorithmName}, expected one of ${algs.join(",")}.`);
    }
    return {
        hash: {
            name: algToHash[algorithmName]
        },
        name: jwksAlgToCryptoAlg[algorithmName]
    };
}
// src/jwt/assertions.ts
var isArrayString = (s)=>{
    return Array.isArray(s) && s.length > 0 && s.every((a)=>typeof a === "string");
};
var assertAudienceClaim = (aud, audience)=>{
    const audienceList = [
        audience
    ].flat().filter((a)=>!!a);
    const audList = [
        aud
    ].flat().filter((a)=>!!a);
    const shouldVerifyAudience = audienceList.length > 0 && audList.length > 0;
    if (!shouldVerifyAudience) {
        return;
    }
    if (typeof aud === "string") {
        if (!audienceList.includes(aud)) {
            throw new __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TCIXZLLW$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["TokenVerificationError"]({
                action: __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TCIXZLLW$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["TokenVerificationErrorAction"].EnsureClerkJWT,
                reason: __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TCIXZLLW$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["TokenVerificationErrorReason"].TokenVerificationFailed,
                message: `Invalid JWT audience claim (aud) ${JSON.stringify(aud)}. Is not included in "${JSON.stringify(audienceList)}".`
            });
        }
    } else if (isArrayString(aud)) {
        if (!aud.some((a)=>audienceList.includes(a))) {
            throw new __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TCIXZLLW$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["TokenVerificationError"]({
                action: __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TCIXZLLW$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["TokenVerificationErrorAction"].EnsureClerkJWT,
                reason: __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TCIXZLLW$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["TokenVerificationErrorReason"].TokenVerificationFailed,
                message: `Invalid JWT audience claim array (aud) ${JSON.stringify(aud)}. Is not included in "${JSON.stringify(audienceList)}".`
            });
        }
    }
};
var assertHeaderType = (typ, allowedTypes = "JWT")=>{
    if (typeof typ === "undefined") {
        return;
    }
    const allowed = Array.isArray(allowedTypes) ? allowedTypes : [
        allowedTypes
    ];
    if (!allowed.includes(typ)) {
        throw new __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TCIXZLLW$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["TokenVerificationError"]({
            action: __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TCIXZLLW$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["TokenVerificationErrorAction"].EnsureClerkJWT,
            reason: __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TCIXZLLW$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["TokenVerificationErrorReason"].TokenInvalid,
            message: `Invalid JWT type ${JSON.stringify(typ)}. Expected "${allowed.join(", ")}".`
        });
    }
};
var assertHeaderAlgorithm = (alg)=>{
    if (!algs.includes(alg)) {
        throw new __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TCIXZLLW$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["TokenVerificationError"]({
            action: __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TCIXZLLW$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["TokenVerificationErrorAction"].EnsureClerkJWT,
            reason: __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TCIXZLLW$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["TokenVerificationErrorReason"].TokenInvalidAlgorithm,
            message: `Invalid JWT algorithm ${JSON.stringify(alg)}. Supported: ${algs}.`
        });
    }
};
var assertSubClaim = (sub)=>{
    if (typeof sub !== "string") {
        throw new __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TCIXZLLW$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["TokenVerificationError"]({
            action: __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TCIXZLLW$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["TokenVerificationErrorAction"].EnsureClerkJWT,
            reason: __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TCIXZLLW$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["TokenVerificationErrorReason"].TokenVerificationFailed,
            message: `Subject claim (sub) is required and must be a string. Received ${JSON.stringify(sub)}.`
        });
    }
};
var assertAuthorizedPartiesClaim = (azp, authorizedParties)=>{
    if (!azp || !authorizedParties || authorizedParties.length === 0) {
        return;
    }
    if (!authorizedParties.includes(azp)) {
        throw new __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TCIXZLLW$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["TokenVerificationError"]({
            reason: __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TCIXZLLW$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["TokenVerificationErrorReason"].TokenInvalidAuthorizedParties,
            message: `Invalid JWT Authorized party claim (azp) ${JSON.stringify(azp)}. Expected "${authorizedParties}".`
        });
    }
};
var assertExpirationClaim = (exp, clockSkewInMs)=>{
    if (typeof exp !== "number") {
        throw new __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TCIXZLLW$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["TokenVerificationError"]({
            action: __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TCIXZLLW$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["TokenVerificationErrorAction"].EnsureClerkJWT,
            reason: __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TCIXZLLW$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["TokenVerificationErrorReason"].TokenVerificationFailed,
            message: `Invalid JWT expiry date claim (exp) ${JSON.stringify(exp)}. Expected number.`
        });
    }
    const currentDate = new Date(Date.now());
    const expiryDate = /* @__PURE__ */ new Date(0);
    expiryDate.setUTCSeconds(exp);
    const expired = expiryDate.getTime() <= currentDate.getTime() - clockSkewInMs;
    if (expired) {
        throw new __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TCIXZLLW$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["TokenVerificationError"]({
            reason: __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TCIXZLLW$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["TokenVerificationErrorReason"].TokenExpired,
            message: `JWT is expired. Expiry date: ${expiryDate.toUTCString()}, Current date: ${currentDate.toUTCString()}.`
        });
    }
};
var assertActivationClaim = (nbf, clockSkewInMs)=>{
    if (typeof nbf === "undefined") {
        return;
    }
    if (typeof nbf !== "number") {
        throw new __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TCIXZLLW$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["TokenVerificationError"]({
            action: __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TCIXZLLW$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["TokenVerificationErrorAction"].EnsureClerkJWT,
            reason: __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TCIXZLLW$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["TokenVerificationErrorReason"].TokenVerificationFailed,
            message: `Invalid JWT not before date claim (nbf) ${JSON.stringify(nbf)}. Expected number.`
        });
    }
    const currentDate = new Date(Date.now());
    const notBeforeDate = /* @__PURE__ */ new Date(0);
    notBeforeDate.setUTCSeconds(nbf);
    const early = notBeforeDate.getTime() > currentDate.getTime() + clockSkewInMs;
    if (early) {
        throw new __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TCIXZLLW$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["TokenVerificationError"]({
            reason: __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TCIXZLLW$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["TokenVerificationErrorReason"].TokenNotActiveYet,
            message: `JWT cannot be used prior to not before date claim (nbf). Not before date: ${notBeforeDate.toUTCString()}; Current date: ${currentDate.toUTCString()};`
        });
    }
};
var assertIssuedAtClaim = (iat, clockSkewInMs)=>{
    if (typeof iat === "undefined") {
        return;
    }
    if (typeof iat !== "number") {
        throw new __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TCIXZLLW$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["TokenVerificationError"]({
            action: __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TCIXZLLW$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["TokenVerificationErrorAction"].EnsureClerkJWT,
            reason: __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TCIXZLLW$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["TokenVerificationErrorReason"].TokenVerificationFailed,
            message: `Invalid JWT issued at date claim (iat) ${JSON.stringify(iat)}. Expected number.`
        });
    }
    const currentDate = new Date(Date.now());
    const issuedAtDate = /* @__PURE__ */ new Date(0);
    issuedAtDate.setUTCSeconds(iat);
    const postIssued = issuedAtDate.getTime() > currentDate.getTime() + clockSkewInMs;
    if (postIssued) {
        throw new __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TCIXZLLW$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["TokenVerificationError"]({
            reason: __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TCIXZLLW$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["TokenVerificationErrorReason"].TokenIatInTheFuture,
            message: `JWT issued at date claim (iat) is in the future. Issued at date: ${issuedAtDate.toUTCString()}; Current date: ${currentDate.toUTCString()};`
        });
    }
};
;
function pemToBuffer(secret) {
    const trimmed = secret.replace(/-----BEGIN.*?-----/g, "").replace(/-----END.*?-----/g, "").replace(/\s/g, "");
    const decoded = (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$isomorphicAtob$2d$DybBXGFR$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["isomorphicAtob"])(trimmed);
    const buffer = new ArrayBuffer(decoded.length);
    const bufView = new Uint8Array(buffer);
    for(let i = 0, strLen = decoded.length; i < strLen; i++){
        bufView[i] = decoded.charCodeAt(i);
    }
    return bufView;
}
function importKey(key, algorithm, keyUsage) {
    if (typeof key === "object") {
        return runtime.crypto.subtle.importKey("jwk", key, algorithm, false, [
            keyUsage
        ]);
    }
    const keyData = pemToBuffer(key);
    const format = keyUsage === "sign" ? "pkcs8" : "spki";
    return runtime.crypto.subtle.importKey(format, keyData, algorithm, false, [
        keyUsage
    ]);
}
// src/jwt/verifyJwt.ts
var DEFAULT_CLOCK_SKEW_IN_MS = 5 * 1e3;
async function hasValidSignature(jwt, key) {
    const { header, signature, raw } = jwt;
    const encoder = new TextEncoder();
    const data = encoder.encode([
        raw.header,
        raw.payload
    ].join("."));
    const algorithm = getCryptoAlgorithm(header.alg);
    try {
        const cryptoKey = await importKey(key, algorithm, "verify");
        const verified = await runtime.crypto.subtle.verify(algorithm.name, cryptoKey, signature, data);
        return {
            data: verified
        };
    } catch (error) {
        return {
            errors: [
                new __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TCIXZLLW$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["TokenVerificationError"]({
                    reason: __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TCIXZLLW$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["TokenVerificationErrorReason"].TokenInvalidSignature,
                    message: error?.message
                })
            ]
        };
    }
}
function decodeJwt(token) {
    const tokenParts = (token || "").toString().split(".");
    if (tokenParts.length !== 3) {
        return {
            errors: [
                new __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TCIXZLLW$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["TokenVerificationError"]({
                    reason: __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TCIXZLLW$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["TokenVerificationErrorReason"].TokenInvalid,
                    message: `Invalid JWT form. A JWT consists of three parts separated by dots.`
                })
            ]
        };
    }
    const [rawHeader, rawPayload, rawSignature] = tokenParts;
    const decoder = new TextDecoder();
    const header = JSON.parse(decoder.decode(base64url.parse(rawHeader, {
        loose: true
    })));
    const payload = JSON.parse(decoder.decode(base64url.parse(rawPayload, {
        loose: true
    })));
    const signature = base64url.parse(rawSignature, {
        loose: true
    });
    const data = {
        header,
        payload,
        signature,
        raw: {
            header: rawHeader,
            payload: rawPayload,
            signature: rawSignature,
            text: token
        }
    };
    return {
        data
    };
}
async function verifyJwt(token, options) {
    const { audience, authorizedParties, clockSkewInMs, key, headerType } = options;
    const clockSkew = clockSkewInMs || DEFAULT_CLOCK_SKEW_IN_MS;
    const { data: decoded, errors } = decodeJwt(token);
    if (errors) {
        return {
            errors
        };
    }
    const { header, payload } = decoded;
    try {
        const { typ, alg } = header;
        assertHeaderType(typ, headerType);
        assertHeaderAlgorithm(alg);
        const { azp, sub, aud, iat, exp, nbf } = payload;
        assertSubClaim(sub);
        assertAudienceClaim([
            aud
        ], [
            audience
        ]);
        assertAuthorizedPartiesClaim(azp, authorizedParties);
        assertExpirationClaim(exp, clockSkew);
        assertActivationClaim(nbf, clockSkew);
        assertIssuedAtClaim(iat, clockSkew);
    } catch (err) {
        return {
            errors: [
                err
            ]
        };
    }
    const { data: signatureValid, errors: signatureErrors } = await hasValidSignature(decoded, key);
    if (signatureErrors) {
        return {
            errors: [
                new __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TCIXZLLW$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["TokenVerificationError"]({
                    action: __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TCIXZLLW$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["TokenVerificationErrorAction"].EnsureClerkJWT,
                    reason: __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TCIXZLLW$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["TokenVerificationErrorReason"].TokenVerificationFailed,
                    message: `Error verifying JWT signature. ${signatureErrors[0]}`
                })
            ]
        };
    }
    if (!signatureValid) {
        return {
            errors: [
                new __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TCIXZLLW$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["TokenVerificationError"]({
                    reason: __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TCIXZLLW$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["TokenVerificationErrorReason"].TokenInvalidSignature,
                    message: "JWT signature is invalid."
                })
            ]
        };
    }
    return {
        data: payload
    };
}
;
 //# sourceMappingURL=chunk-7X3P2E3X.mjs.map
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+backend@2.29.0+67f6792bdf102c28/node_modules/@clerk/backend/dist/chunk-RPS7XK5K.mjs [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "__privateAdd",
    ()=>__privateAdd,
    "__privateMethod",
    ()=>__privateMethod
]);
var __typeError = (msg)=>{
    throw TypeError(msg);
};
var __accessCheck = (obj, member, msg)=>member.has(obj) || __typeError("Cannot " + msg);
var __privateAdd = (obj, member, value)=>member.has(obj) ? __typeError("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
var __privateMethod = (obj, member, method)=>(__accessCheck(obj, member, "access private method"), method);
;
 //# sourceMappingURL=chunk-RPS7XK5K.mjs.map
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/buildAccountsBaseUrl.mjs [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "buildAccountsBaseUrl",
    ()=>buildAccountsBaseUrl
]);
//#region src/buildAccountsBaseUrl.ts
/**
* Builds a full origin string pointing to the Account Portal for the given frontend API.
*/ function buildAccountsBaseUrl(frontendApi) {
    if (!frontendApi) return "";
    return `https://${frontendApi.replace(/clerk\.accountsstage\./, "accountsstage.").replace(/clerk\.accounts\.|clerk\./, "accounts.")}`;
}
;
 //# sourceMappingURL=buildAccountsBaseUrl.mjs.map
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/authorization-D2ans7vW.mjs [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "createCheckAuthorization",
    ()=>createCheckAuthorization,
    "resolveAuthState",
    ()=>resolveAuthState,
    "splitByScope",
    ()=>splitByScope,
    "validateReverificationConfig",
    ()=>validateReverificationConfig
]);
//#region src/authorization.ts
const TYPES_TO_OBJECTS = {
    strict_mfa: {
        afterMinutes: 10,
        level: "multi_factor"
    },
    strict: {
        afterMinutes: 10,
        level: "second_factor"
    },
    moderate: {
        afterMinutes: 60,
        level: "second_factor"
    },
    lax: {
        afterMinutes: 1440,
        level: "second_factor"
    }
};
const ALLOWED_LEVELS = new Set([
    "first_factor",
    "second_factor",
    "multi_factor"
]);
const ALLOWED_TYPES = new Set([
    "strict_mfa",
    "strict",
    "moderate",
    "lax"
]);
const isValidMaxAge = (maxAge)=>typeof maxAge === "number" && maxAge > 0;
const isValidLevel = (level)=>ALLOWED_LEVELS.has(level);
const isValidVerificationType = (type)=>ALLOWED_TYPES.has(type);
const prefixWithOrg = (value)=>value.replace(/^(org:)*/, "org:");
/**
* Checks if a user has the required Organization-level authorization.
* Verifies if the user has the specified Role or Permission within their Organization.
* @returns null, if unable to determine due to missing data or unspecified Role/Permission.
*/ const checkOrgAuthorization = (params, options)=>{
    const { orgId, orgRole, orgPermissions } = options;
    if (!params.role && !params.permission) return null;
    if (!orgId || !orgRole || !orgPermissions) return null;
    if (params.permission) return orgPermissions.includes(prefixWithOrg(params.permission));
    if (params.role) return prefixWithOrg(orgRole) === prefixWithOrg(params.role);
    return null;
};
const checkForFeatureOrPlan = (claim, featureOrPlan)=>{
    const { org: orgFeatures, user: userFeatures } = splitByScope(claim);
    const [scope, _id] = featureOrPlan.split(":");
    const id = _id || scope;
    if (scope === "org") return orgFeatures.includes(id);
    else if (scope === "user") return userFeatures.includes(id);
    else return [
        ...orgFeatures,
        ...userFeatures
    ].includes(id);
};
const checkBillingAuthorization = (params, options)=>{
    const { features, plans } = options;
    if (params.feature && features) return checkForFeatureOrPlan(features, params.feature);
    if (params.plan && plans) return checkForFeatureOrPlan(plans, params.plan);
    return null;
};
const splitByScope = (fea)=>{
    const features = fea ? fea.split(",").map((f)=>f.trim()) : [];
    return {
        org: features.filter((f)=>f.split(":")[0].includes("o")).map((f)=>f.split(":")[1]),
        user: features.filter((f)=>f.split(":")[0].includes("u")).map((f)=>f.split(":")[1])
    };
};
const validateReverificationConfig = (config)=>{
    if (!config) return false;
    const convertConfigToObject = (config$1)=>{
        if (typeof config$1 === "string") return TYPES_TO_OBJECTS[config$1];
        return config$1;
    };
    const isValidStringValue = typeof config === "string" && isValidVerificationType(config);
    const isValidObjectValue = typeof config === "object" && isValidLevel(config.level) && isValidMaxAge(config.afterMinutes);
    if (isValidStringValue || isValidObjectValue) return convertConfigToObject.bind(null, config);
    return false;
};
/**
* Evaluates if the user meets re-verification authentication requirements.
* Compares the user's factor verification ages against the specified maxAge.
* Handles different verification levels (first factor, second factor, multi-factor).
* @returns null, if requirements or verification data are missing.
*/ const checkReverificationAuthorization = (params, { factorVerificationAge })=>{
    if (!params.reverification || !factorVerificationAge) return null;
    const isValidReverification = validateReverificationConfig(params.reverification);
    if (!isValidReverification) return null;
    const { level, afterMinutes } = isValidReverification();
    const [factor1Age, factor2Age] = factorVerificationAge;
    const isValidFactor1 = factor1Age !== -1 ? afterMinutes > factor1Age : null;
    const isValidFactor2 = factor2Age !== -1 ? afterMinutes > factor2Age : null;
    switch(level){
        case "first_factor":
            return isValidFactor1;
        case "second_factor":
            return factor2Age !== -1 ? isValidFactor2 : isValidFactor1;
        case "multi_factor":
            return factor2Age === -1 ? isValidFactor1 : isValidFactor1 && isValidFactor2;
    }
};
/**
* Creates a function for comprehensive user authorization checks.
* Combines organization-level and reverification authentication checks.
* The returned function authorizes if both checks pass, or if at least one passes
* when the other is indeterminate. Fails if userId is missing.
*/ const createCheckAuthorization = (options)=>{
    return (params)=>{
        if (!options.userId) return false;
        const billingAuthorization = checkBillingAuthorization(params, options);
        const orgAuthorization = checkOrgAuthorization(params, options);
        const reverificationAuthorization = checkReverificationAuthorization(params, options);
        if ([
            billingAuthorization || orgAuthorization,
            reverificationAuthorization
        ].some((a)=>a === null)) return [
            billingAuthorization || orgAuthorization,
            reverificationAuthorization
        ].some((a)=>a === true);
        return [
            billingAuthorization || orgAuthorization,
            reverificationAuthorization
        ].every((a)=>a === true);
    };
};
/**
* Shared utility function that centralizes auth state resolution logic,
* preventing duplication across different packages.
* @internal
*/ const resolveAuthState = ({ authObject: { sessionId, sessionStatus, userId, actor, orgId, orgRole, orgSlug, signOut, getToken, has, sessionClaims }, options: { treatPendingAsSignedOut = true } })=>{
    if (sessionId === void 0 && userId === void 0) return {
        isLoaded: false,
        isSignedIn: void 0,
        sessionId,
        sessionClaims: void 0,
        userId,
        actor: void 0,
        orgId: void 0,
        orgRole: void 0,
        orgSlug: void 0,
        has: void 0,
        signOut,
        getToken
    };
    if (sessionId === null && userId === null) return {
        isLoaded: true,
        isSignedIn: false,
        sessionId,
        userId,
        sessionClaims: null,
        actor: null,
        orgId: null,
        orgRole: null,
        orgSlug: null,
        has: ()=>false,
        signOut,
        getToken
    };
    if (treatPendingAsSignedOut && sessionStatus === "pending") return {
        isLoaded: true,
        isSignedIn: false,
        sessionId: null,
        userId: null,
        sessionClaims: null,
        actor: null,
        orgId: null,
        orgRole: null,
        orgSlug: null,
        has: ()=>false,
        signOut,
        getToken
    };
    if (!!sessionId && !!sessionClaims && !!userId && !!orgId && !!orgRole) return {
        isLoaded: true,
        isSignedIn: true,
        sessionId,
        sessionClaims,
        userId,
        actor: actor || null,
        orgId,
        orgRole,
        orgSlug: orgSlug || null,
        has,
        signOut,
        getToken
    };
    if (!!sessionId && !!sessionClaims && !!userId && !orgId) return {
        isLoaded: true,
        isSignedIn: true,
        sessionId,
        sessionClaims,
        userId,
        actor: actor || null,
        orgId: null,
        orgRole: null,
        orgSlug: null,
        has,
        signOut,
        getToken
    };
};
;
 //# sourceMappingURL=authorization-D2ans7vW.mjs.map
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/authorization.mjs [app-rsc] (ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([]);
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$authorization$2d$D2ans7vW$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/authorization-D2ans7vW.mjs [app-rsc] (ecmascript)");
;
;
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/jwtPayloadParser.mjs [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "__experimental_JWTPayloadToAuthObjectProperties",
    ()=>__experimental_JWTPayloadToAuthObjectProperties,
    "parsePermissions",
    ()=>parsePermissions
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$authorization$2d$D2ans7vW$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/authorization-D2ans7vW.mjs [app-rsc] (ecmascript)");
;
//#region src/jwtPayloadParser.ts
const parsePermissions = ({ per, fpm })=>{
    if (!per || !fpm) return {
        permissions: [],
        featurePermissionMap: []
    };
    const permissions = per.split(",").map((p)=>p.trim());
    return {
        permissions,
        featurePermissionMap: fpm.split(",").map((permission)=>Number.parseInt(permission.trim(), 10)).map((permission)=>permission.toString(2).padStart(permissions.length, "0").split("").map((bit)=>Number.parseInt(bit, 10)).reverse()).filter(Boolean)
    };
};
/**
*
*/ function buildOrgPermissions({ features, permissions, featurePermissionMap }) {
    if (!features || !permissions || !featurePermissionMap) return [];
    const orgPermissions = [];
    for(let featureIndex = 0; featureIndex < features.length; featureIndex++){
        const feature = features[featureIndex];
        if (featureIndex >= featurePermissionMap.length) continue;
        const permissionBits = featurePermissionMap[featureIndex];
        if (!permissionBits) continue;
        for(let permIndex = 0; permIndex < permissionBits.length; permIndex++)if (permissionBits[permIndex] === 1) orgPermissions.push(`org:${feature}:${permissions[permIndex]}`);
    }
    return orgPermissions;
}
/**
* Resolves the signed-in auth state from JWT claims.
*
* @experimental
*/ const __experimental_JWTPayloadToAuthObjectProperties = (claims)=>{
    let orgId;
    let orgRole;
    let orgSlug;
    let orgPermissions;
    const factorVerificationAge = claims.fva ?? null;
    const sessionStatus = claims.sts ?? null;
    switch(claims.v){
        case 2:
            if (claims.o) {
                orgId = claims.o?.id;
                orgSlug = claims.o?.slg;
                if (claims.o?.rol) orgRole = `org:${claims.o?.rol}`;
                const { org } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$authorization$2d$D2ans7vW$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["splitByScope"])(claims.fea);
                const { permissions, featurePermissionMap } = parsePermissions({
                    per: claims.o?.per,
                    fpm: claims.o?.fpm
                });
                orgPermissions = buildOrgPermissions({
                    features: org,
                    featurePermissionMap,
                    permissions
                });
            }
            break;
        default:
            orgId = claims.org_id;
            orgRole = claims.org_role;
            orgSlug = claims.org_slug;
            orgPermissions = claims.org_permissions;
            break;
    }
    return {
        sessionClaims: claims,
        sessionId: claims.sid,
        sessionStatus,
        actor: claims.act,
        userId: claims.sub,
        orgId,
        orgRole,
        orgSlug,
        orgPermissions,
        factorVerificationAge
    };
};
;
 //# sourceMappingURL=jwtPayloadParser.mjs.map
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/cookie@1.0.2/node_modules/cookie/dist/index.js [app-rsc] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.parse = parse;
exports.serialize = serialize;
/**
 * RegExp to match cookie-name in RFC 6265 sec 4.1.1
 * This refers out to the obsoleted definition of token in RFC 2616 sec 2.2
 * which has been replaced by the token definition in RFC 7230 appendix B.
 *
 * cookie-name       = token
 * token             = 1*tchar
 * tchar             = "!" / "#" / "$" / "%" / "&" / "'" /
 *                     "*" / "+" / "-" / "." / "^" / "_" /
 *                     "`" / "|" / "~" / DIGIT / ALPHA
 *
 * Note: Allowing more characters - https://github.com/jshttp/cookie/issues/191
 * Allow same range as cookie value, except `=`, which delimits end of name.
 */ const cookieNameRegExp = /^[\u0021-\u003A\u003C\u003E-\u007E]+$/;
/**
 * RegExp to match cookie-value in RFC 6265 sec 4.1.1
 *
 * cookie-value      = *cookie-octet / ( DQUOTE *cookie-octet DQUOTE )
 * cookie-octet      = %x21 / %x23-2B / %x2D-3A / %x3C-5B / %x5D-7E
 *                     ; US-ASCII characters excluding CTLs,
 *                     ; whitespace DQUOTE, comma, semicolon,
 *                     ; and backslash
 *
 * Allowing more characters: https://github.com/jshttp/cookie/issues/191
 * Comma, backslash, and DQUOTE are not part of the parsing algorithm.
 */ const cookieValueRegExp = /^[\u0021-\u003A\u003C-\u007E]*$/;
/**
 * RegExp to match domain-value in RFC 6265 sec 4.1.1
 *
 * domain-value      = <subdomain>
 *                     ; defined in [RFC1034], Section 3.5, as
 *                     ; enhanced by [RFC1123], Section 2.1
 * <subdomain>       = <label> | <subdomain> "." <label>
 * <label>           = <let-dig> [ [ <ldh-str> ] <let-dig> ]
 *                     Labels must be 63 characters or less.
 *                     'let-dig' not 'letter' in the first char, per RFC1123
 * <ldh-str>         = <let-dig-hyp> | <let-dig-hyp> <ldh-str>
 * <let-dig-hyp>     = <let-dig> | "-"
 * <let-dig>         = <letter> | <digit>
 * <letter>          = any one of the 52 alphabetic characters A through Z in
 *                     upper case and a through z in lower case
 * <digit>           = any one of the ten digits 0 through 9
 *
 * Keep support for leading dot: https://github.com/jshttp/cookie/issues/173
 *
 * > (Note that a leading %x2E ("."), if present, is ignored even though that
 * character is not permitted, but a trailing %x2E ("."), if present, will
 * cause the user agent to ignore the attribute.)
 */ const domainValueRegExp = /^([.]?[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)([.][a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/i;
/**
 * RegExp to match path-value in RFC 6265 sec 4.1.1
 *
 * path-value        = <any CHAR except CTLs or ";">
 * CHAR              = %x01-7F
 *                     ; defined in RFC 5234 appendix B.1
 */ const pathValueRegExp = /^[\u0020-\u003A\u003D-\u007E]*$/;
const __toString = Object.prototype.toString;
const NullObject = /* @__PURE__ */ (()=>{
    const C = function() {};
    C.prototype = Object.create(null);
    return C;
})();
/**
 * Parse a cookie header.
 *
 * Parse the given cookie header string into an object
 * The object has the various cookies as keys(names) => values
 */ function parse(str, options) {
    const obj = new NullObject();
    const len = str.length;
    // RFC 6265 sec 4.1.1, RFC 2616 2.2 defines a cookie name consists of one char minimum, plus '='.
    if (len < 2) return obj;
    const dec = options?.decode || decode;
    let index = 0;
    do {
        const eqIdx = str.indexOf("=", index);
        if (eqIdx === -1) break; // No more cookie pairs.
        const colonIdx = str.indexOf(";", index);
        const endIdx = colonIdx === -1 ? len : colonIdx;
        if (eqIdx > endIdx) {
            // backtrack on prior semicolon
            index = str.lastIndexOf(";", eqIdx - 1) + 1;
            continue;
        }
        const keyStartIdx = startIndex(str, index, eqIdx);
        const keyEndIdx = endIndex(str, eqIdx, keyStartIdx);
        const key = str.slice(keyStartIdx, keyEndIdx);
        // only assign once
        if (obj[key] === undefined) {
            let valStartIdx = startIndex(str, eqIdx + 1, endIdx);
            let valEndIdx = endIndex(str, endIdx, valStartIdx);
            const value = dec(str.slice(valStartIdx, valEndIdx));
            obj[key] = value;
        }
        index = endIdx + 1;
    }while (index < len)
    return obj;
}
function startIndex(str, index, max) {
    do {
        const code = str.charCodeAt(index);
        if (code !== 0x20 /*   */  && code !== 0x09 /* \t */ ) return index;
    }while (++index < max)
    return max;
}
function endIndex(str, index, min) {
    while(index > min){
        const code = str.charCodeAt(--index);
        if (code !== 0x20 /*   */  && code !== 0x09 /* \t */ ) return index + 1;
    }
    return min;
}
/**
 * Serialize data into a cookie header.
 *
 * Serialize a name value pair into a cookie string suitable for
 * http headers. An optional options object specifies cookie parameters.
 *
 * serialize('foo', 'bar', { httpOnly: true })
 *   => "foo=bar; httpOnly"
 */ function serialize(name, val, options) {
    const enc = options?.encode || encodeURIComponent;
    if (!cookieNameRegExp.test(name)) {
        throw new TypeError(`argument name is invalid: ${name}`);
    }
    const value = enc(val);
    if (!cookieValueRegExp.test(value)) {
        throw new TypeError(`argument val is invalid: ${val}`);
    }
    let str = name + "=" + value;
    if (!options) return str;
    if (options.maxAge !== undefined) {
        if (!Number.isInteger(options.maxAge)) {
            throw new TypeError(`option maxAge is invalid: ${options.maxAge}`);
        }
        str += "; Max-Age=" + options.maxAge;
    }
    if (options.domain) {
        if (!domainValueRegExp.test(options.domain)) {
            throw new TypeError(`option domain is invalid: ${options.domain}`);
        }
        str += "; Domain=" + options.domain;
    }
    if (options.path) {
        if (!pathValueRegExp.test(options.path)) {
            throw new TypeError(`option path is invalid: ${options.path}`);
        }
        str += "; Path=" + options.path;
    }
    if (options.expires) {
        if (!isDate(options.expires) || !Number.isFinite(options.expires.valueOf())) {
            throw new TypeError(`option expires is invalid: ${options.expires}`);
        }
        str += "; Expires=" + options.expires.toUTCString();
    }
    if (options.httpOnly) {
        str += "; HttpOnly";
    }
    if (options.secure) {
        str += "; Secure";
    }
    if (options.partitioned) {
        str += "; Partitioned";
    }
    if (options.priority) {
        const priority = typeof options.priority === "string" ? options.priority.toLowerCase() : undefined;
        switch(priority){
            case "low":
                str += "; Priority=Low";
                break;
            case "medium":
                str += "; Priority=Medium";
                break;
            case "high":
                str += "; Priority=High";
                break;
            default:
                throw new TypeError(`option priority is invalid: ${options.priority}`);
        }
    }
    if (options.sameSite) {
        const sameSite = typeof options.sameSite === "string" ? options.sameSite.toLowerCase() : options.sameSite;
        switch(sameSite){
            case true:
            case "strict":
                str += "; SameSite=Strict";
                break;
            case "lax":
                str += "; SameSite=Lax";
                break;
            case "none":
                str += "; SameSite=None";
                break;
            default:
                throw new TypeError(`option sameSite is invalid: ${options.sameSite}`);
        }
    }
    return str;
}
/**
 * URL-decode string value. Optimized to skip native call when no %.
 */ function decode(str) {
    if (str.indexOf("%") === -1) return str;
    try {
        return decodeURIComponent(str);
    } catch (e) {
        return str;
    }
}
/**
 * Determine if value is a Date.
 */ function isDate(val) {
    return __toString.call(val) === "[object Date]";
} //# sourceMappingURL=index.js.map
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/pathToRegexp-Bu45OrlU.mjs [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "match",
    ()=>match,
    "pathToRegexp",
    ()=>pathToRegexp
]);
//#region src/compiled/path-to-regexp/index.js
function _(r) {
    for(var n = [], e = 0; e < r.length;){
        var a = r[e];
        if (a === "*" || a === "+" || a === "?") {
            n.push({
                type: "MODIFIER",
                index: e,
                value: r[e++]
            });
            continue;
        }
        if (a === "\\") {
            n.push({
                type: "ESCAPED_CHAR",
                index: e++,
                value: r[e++]
            });
            continue;
        }
        if (a === "{") {
            n.push({
                type: "OPEN",
                index: e,
                value: r[e++]
            });
            continue;
        }
        if (a === "}") {
            n.push({
                type: "CLOSE",
                index: e,
                value: r[e++]
            });
            continue;
        }
        if (a === ":") {
            for(var u = "", t = e + 1; t < r.length;){
                var c = r.charCodeAt(t);
                if (c >= 48 && c <= 57 || c >= 65 && c <= 90 || c >= 97 && c <= 122 || c === 95) {
                    u += r[t++];
                    continue;
                }
                break;
            }
            if (!u) throw new TypeError("Missing parameter name at ".concat(e));
            n.push({
                type: "NAME",
                index: e,
                value: u
            }), e = t;
            continue;
        }
        if (a === "(") {
            var o = 1, m = "", t = e + 1;
            if (r[t] === "?") throw new TypeError("Pattern cannot start with \"?\" at ".concat(t));
            for(; t < r.length;){
                if (r[t] === "\\") {
                    m += r[t++] + r[t++];
                    continue;
                }
                if (r[t] === ")") {
                    if (o--, o === 0) {
                        t++;
                        break;
                    }
                } else if (r[t] === "(" && (o++, r[t + 1] !== "?")) throw new TypeError("Capturing groups are not allowed at ".concat(t));
                m += r[t++];
            }
            if (o) throw new TypeError("Unbalanced pattern at ".concat(e));
            if (!m) throw new TypeError("Missing pattern at ".concat(e));
            n.push({
                type: "PATTERN",
                index: e,
                value: m
            }), e = t;
            continue;
        }
        n.push({
            type: "CHAR",
            index: e,
            value: r[e++]
        });
    }
    return n.push({
        type: "END",
        index: e,
        value: ""
    }), n;
}
function F(r, n) {
    n === void 0 && (n = {});
    for(var e = _(r), a = n.prefixes, u = a === void 0 ? "./" : a, t = n.delimiter, c = t === void 0 ? "/#?" : t, o = [], m = 0, h = 0, p = "", f = function(l) {
        if (h < e.length && e[h].type === l) return e[h++].value;
    }, w = function(l) {
        var v = f(l);
        if (v !== void 0) return v;
        var E = e[h], N = E.type, S = E.index;
        throw new TypeError("Unexpected ".concat(N, " at ").concat(S, ", expected ").concat(l));
    }, d = function() {
        for(var l = "", v; v = f("CHAR") || f("ESCAPED_CHAR");)l += v;
        return l;
    }, M = function(l) {
        for(var v = 0, E = c; v < E.length; v++){
            var N = E[v];
            if (l.indexOf(N) > -1) return !0;
        }
        return !1;
    }, A = function(l) {
        var v = o[o.length - 1], E = l || (v && typeof v == "string" ? v : "");
        if (v && !E) throw new TypeError("Must have text between two parameters, missing text after \"".concat(v.name, "\""));
        return !E || M(E) ? "[^".concat(s(c), "]+?") : "(?:(?!".concat(s(E), ")[^").concat(s(c), "])+?");
    }; h < e.length;){
        var T = f("CHAR"), x = f("NAME"), C = f("PATTERN");
        if (x || C) {
            var g = T || "";
            u.indexOf(g) === -1 && (p += g, g = ""), p && (o.push(p), p = ""), o.push({
                name: x || m++,
                prefix: g,
                suffix: "",
                pattern: C || A(g),
                modifier: f("MODIFIER") || ""
            });
            continue;
        }
        var i = T || f("ESCAPED_CHAR");
        if (i) {
            p += i;
            continue;
        }
        p && (o.push(p), p = "");
        if (f("OPEN")) {
            var g = d(), y = f("NAME") || "", O = f("PATTERN") || "", b = d();
            w("CLOSE"), o.push({
                name: y || (O ? m++ : ""),
                pattern: y && !O ? A(g) : O,
                prefix: g,
                suffix: b,
                modifier: f("MODIFIER") || ""
            });
            continue;
        }
        w("END");
    }
    return o;
}
function H(r, n) {
    var e = [];
    return I(P(r, e, n), e, n);
}
function I(r, n, e) {
    e === void 0 && (e = {});
    var a = e.decode, u = a === void 0 ? function(t) {
        return t;
    } : a;
    return function(t) {
        var c = r.exec(t);
        if (!c) return !1;
        for(var o = c[0], m = c.index, h = Object.create(null), p = function(w) {
            if (c[w] === void 0) return "continue";
            var d = n[w - 1];
            d.modifier === "*" || d.modifier === "+" ? h[d.name] = c[w].split(d.prefix + d.suffix).map(function(M) {
                return u(M, d);
            }) : h[d.name] = u(c[w], d);
        }, f = 1; f < c.length; f++)p(f);
        return {
            path: o,
            index: m,
            params: h
        };
    };
}
function s(r) {
    return r.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1");
}
function D(r) {
    return r && r.sensitive ? "" : "i";
}
function $(r, n) {
    if (!n) return r;
    for(var e = /\((?:\?<(.*?)>)?(?!\?)/g, a = 0, u = e.exec(r.source); u;)n.push({
        name: u[1] || a++,
        prefix: "",
        suffix: "",
        modifier: "",
        pattern: ""
    }), u = e.exec(r.source);
    return r;
}
function W(r, n, e) {
    var a = r.map(function(u) {
        return P(u, n, e).source;
    });
    return new RegExp("(?:".concat(a.join("|"), ")"), D(e));
}
function L(r, n, e) {
    return U(F(r, e), n, e);
}
function U(r, n, e) {
    e === void 0 && (e = {});
    for(var a = e.strict, u = a === void 0 ? !1 : a, t = e.start, c = t === void 0 ? !0 : t, o = e.end, m = o === void 0 ? !0 : o, h = e.encode, p = h === void 0 ? function(v) {
        return v;
    } : h, f = e.delimiter, w = f === void 0 ? "/#?" : f, d = e.endsWith, M = d === void 0 ? "" : d, A = "[".concat(s(M), "]|$"), T = "[".concat(s(w), "]"), x = c ? "^" : "", C = 0, g = r; C < g.length; C++){
        var i = g[C];
        if (typeof i == "string") x += s(p(i));
        else {
            var R = s(p(i.prefix)), y = s(p(i.suffix));
            if (i.pattern) if (n && n.push(i), R || y) if (i.modifier === "+" || i.modifier === "*") {
                var O = i.modifier === "*" ? "?" : "";
                x += "(?:".concat(R, "((?:").concat(i.pattern, ")(?:").concat(y).concat(R, "(?:").concat(i.pattern, "))*)").concat(y, ")").concat(O);
            } else x += "(?:".concat(R, "(").concat(i.pattern, ")").concat(y, ")").concat(i.modifier);
            else {
                if (i.modifier === "+" || i.modifier === "*") throw new TypeError("Can not repeat \"".concat(i.name, "\" without a prefix and suffix"));
                x += "(".concat(i.pattern, ")").concat(i.modifier);
            }
            else x += "(?:".concat(R).concat(y, ")").concat(i.modifier);
        }
    }
    if (m) u || (x += "".concat(T, "?")), x += e.endsWith ? "(?=".concat(A, ")") : "$";
    else {
        var b = r[r.length - 1], l = typeof b == "string" ? T.indexOf(b[b.length - 1]) > -1 : b === void 0;
        u || (x += "(?:".concat(T, "(?=").concat(A, "))?")), l || (x += "(?=".concat(T, "|").concat(A, ")"));
    }
    return new RegExp(x, D(e));
}
function P(r, n, e) {
    return r instanceof RegExp ? $(r, n) : Array.isArray(r) ? W(r, n, e) : L(r, n, e);
}
//#endregion
//#region src/pathToRegexp.ts
const pathToRegexp = (path)=>{
    try {
        return P(path);
    } catch (e) {
        throw new Error(`Invalid path: ${path}.\nConsult the documentation of path-to-regexp here: https://github.com/pillarjs/path-to-regexp/tree/6.x\n${e.message}`);
    }
};
/**
*
*/ function match(str, options) {
    try {
        return H(str, options);
    } catch (e) {
        throw new Error(`Invalid path and options: Consult the documentation of path-to-regexp here: https://github.com/pillarjs/path-to-regexp/tree/6.x\n${e.message}`);
    }
}
;
 //# sourceMappingURL=pathToRegexp-Bu45OrlU.mjs.map
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/pathToRegexp.mjs [app-rsc] (ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([]);
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$pathToRegexp$2d$Bu45OrlU$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/pathToRegexp-Bu45OrlU.mjs [app-rsc] (ecmascript)");
;
;
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/authorization-errors-CS1pNy8i.mjs [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "isReverificationHint",
    ()=>isReverificationHint,
    "reverificationError",
    ()=>reverificationError,
    "reverificationErrorResponse",
    ()=>reverificationErrorResponse
]);
//#region src/authorization-errors.ts
const REVERIFICATION_REASON = "reverification-error";
const reverificationError = (missingConfig)=>({
        clerk_error: {
            type: "forbidden",
            reason: REVERIFICATION_REASON,
            metadata: {
                reverification: missingConfig
            }
        }
    });
const reverificationErrorResponse = (...args)=>new Response(JSON.stringify(reverificationError(...args)), {
        status: 403
    });
const isReverificationHint = (result)=>{
    return result && typeof result === "object" && "clerk_error" in result && result.clerk_error?.type === "forbidden" && result.clerk_error?.reason === REVERIFICATION_REASON;
};
;
 //# sourceMappingURL=authorization-errors-CS1pNy8i.mjs.map
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/authorization-errors.mjs [app-rsc] (ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([]);
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$authorization$2d$errors$2d$CS1pNy8i$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/authorization-errors-CS1pNy8i.mjs [app-rsc] (ecmascript)");
;
;
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+backend@2.29.0+67f6792bdf102c28/node_modules/@clerk/backend/dist/chunk-TTM76E4X.mjs [app-rsc] (ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "AuthStatus",
    ()=>AuthStatus,
    "TokenType",
    ()=>TokenType,
    "authenticatedMachineObject",
    ()=>authenticatedMachineObject,
    "constants",
    ()=>constants,
    "createAuthenticateRequest",
    ()=>createAuthenticateRequest,
    "createBackendApiClient",
    ()=>createBackendApiClient,
    "createClerkRequest",
    ()=>createClerkRequest,
    "createRedirect",
    ()=>createRedirect,
    "debugRequestState",
    ()=>debugRequestState,
    "decorateObjectWithResources",
    ()=>decorateObjectWithResources,
    "getAuthObjectForAcceptedToken",
    ()=>getAuthObjectForAcceptedToken,
    "getAuthObjectFromJwt",
    ()=>getAuthObjectFromJwt,
    "getMachineTokenType",
    ()=>getMachineTokenType,
    "invalidTokenAuthObject",
    ()=>invalidTokenAuthObject,
    "isMachineTokenByPrefix",
    ()=>isMachineTokenByPrefix,
    "isMachineTokenType",
    ()=>isMachineTokenType,
    "isTokenTypeAccepted",
    ()=>isTokenTypeAccepted,
    "makeAuthObjectSerializable",
    ()=>makeAuthObjectSerializable,
    "signedInAuthObject",
    ()=>signedInAuthObject,
    "signedOutAuthObject",
    ()=>signedOutAuthObject,
    "stripPrivateDataFromObject",
    ()=>stripPrivateDataFromObject,
    "unauthenticatedMachineObject",
    ()=>unauthenticatedMachineObject,
    "verifyMachineAuthToken",
    ()=>verifyMachineAuthToken,
    "verifyToken",
    ()=>verifyToken
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$YBVFDYDR$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+backend@2.29.0+67f6792bdf102c28/node_modules/@clerk/backend/dist/chunk-YBVFDYDR.mjs [app-rsc] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$deprecated$2d$BqlFbLHj$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/deprecated-BqlFbLHj.mjs [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$keys$2d$YNv6yjKk$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/keys-YNv6yjKk.mjs [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$retry$2d$DAlTROH9$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/retry-DAlTROH9.mjs [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$7X3P2E3X$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+backend@2.29.0+67f6792bdf102c28/node_modules/@clerk/backend/dist/chunk-7X3P2E3X.mjs [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TCIXZLLW$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+backend@2.29.0+67f6792bdf102c28/node_modules/@clerk/backend/dist/chunk-TCIXZLLW.mjs [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$RPS7XK5K$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+backend@2.29.0+67f6792bdf102c28/node_modules/@clerk/backend/dist/chunk-RPS7XK5K.mjs [app-rsc] (ecmascript)");
// src/createRedirect.ts
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$buildAccountsBaseUrl$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/buildAccountsBaseUrl.mjs [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$url$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/url.mjs [app-rsc] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$url$2d$Cdy8w8vK$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/url-Cdy8w8vK.mjs [app-rsc] (ecmascript)");
// src/tokens/authObjects.ts
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$authorization$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/authorization.mjs [app-rsc] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$authorization$2d$D2ans7vW$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/authorization-D2ans7vW.mjs [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$jwtPayloadParser$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/jwtPayloadParser.mjs [app-rsc] (ecmascript)");
// src/api/request.ts
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$error$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/error.mjs [app-rsc] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$error$2d$Dl9xmUf3$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/error-Dl9xmUf3.mjs [app-rsc] (ecmascript)");
// src/tokens/clerkRequest.ts
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$cookie$40$1$2e$0$2e$2$2f$node_modules$2f$cookie$2f$dist$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/cookie@1.0.2/node_modules/cookie/dist/index.js [app-rsc] (ecmascript)");
// src/tokens/organizationMatcher.ts
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$pathToRegexp$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/pathToRegexp.mjs [app-rsc] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$pathToRegexp$2d$Bu45OrlU$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/pathToRegexp-Bu45OrlU.mjs [app-rsc] (ecmascript)");
// src/internal.ts
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$authorization$2d$errors$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/authorization-errors.mjs [app-rsc] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$authorization$2d$errors$2d$CS1pNy8i$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/authorization-errors-CS1pNy8i.mjs [app-rsc] (ecmascript)");
;
;
;
;
// src/constants.ts
var API_URL = "https://api.clerk.com";
var API_VERSION = "v1";
var USER_AGENT = `${"@clerk/backend"}@${"2.29.0"}`;
var MAX_CACHE_LAST_UPDATED_AT_SECONDS = 5 * 60;
var SUPPORTED_BAPI_VERSION = "2025-11-10";
var Attributes = {
    AuthToken: "__clerkAuthToken",
    AuthSignature: "__clerkAuthSignature",
    AuthStatus: "__clerkAuthStatus",
    AuthReason: "__clerkAuthReason",
    AuthMessage: "__clerkAuthMessage",
    ClerkUrl: "__clerkUrl"
};
var Cookies = {
    Session: "__session",
    Refresh: "__refresh",
    ClientUat: "__client_uat",
    Handshake: "__clerk_handshake",
    DevBrowser: "__clerk_db_jwt",
    RedirectCount: "__clerk_redirect_count",
    HandshakeNonce: "__clerk_handshake_nonce"
};
var QueryParameters = {
    ClerkSynced: "__clerk_synced",
    SuffixedCookies: "suffixed_cookies",
    ClerkRedirectUrl: "__clerk_redirect_url",
    // use the reference to Cookies to indicate that it's the same value
    DevBrowser: Cookies.DevBrowser,
    Handshake: Cookies.Handshake,
    HandshakeHelp: "__clerk_help",
    LegacyDevBrowser: "__dev_session",
    HandshakeReason: "__clerk_hs_reason",
    HandshakeNonce: Cookies.HandshakeNonce,
    HandshakeFormat: "format",
    Session: "__session"
};
var Headers2 = {
    Accept: "accept",
    AuthMessage: "x-clerk-auth-message",
    Authorization: "authorization",
    AuthReason: "x-clerk-auth-reason",
    AuthSignature: "x-clerk-auth-signature",
    AuthStatus: "x-clerk-auth-status",
    AuthToken: "x-clerk-auth-token",
    CacheControl: "cache-control",
    ClerkRedirectTo: "x-clerk-redirect-to",
    ClerkRequestData: "x-clerk-request-data",
    ClerkUrl: "x-clerk-clerk-url",
    CloudFrontForwardedProto: "cloudfront-forwarded-proto",
    ContentType: "content-type",
    ContentSecurityPolicy: "content-security-policy",
    ContentSecurityPolicyReportOnly: "content-security-policy-report-only",
    EnableDebug: "x-clerk-debug",
    ForwardedHost: "x-forwarded-host",
    ForwardedPort: "x-forwarded-port",
    ForwardedProto: "x-forwarded-proto",
    Host: "host",
    Location: "location",
    Nonce: "x-nonce",
    Origin: "origin",
    Referrer: "referer",
    SecFetchDest: "sec-fetch-dest",
    SecFetchSite: "sec-fetch-site",
    UserAgent: "user-agent",
    ReportingEndpoints: "reporting-endpoints"
};
var ContentTypes = {
    Json: "application/json"
};
var constants = {
    Attributes,
    Cookies,
    Headers: Headers2,
    ContentTypes,
    QueryParameters
};
;
var buildUrl = (_baseUrl, _targetUrl, _returnBackUrl, _devBrowserToken)=>{
    if (_baseUrl === "") {
        return legacyBuildUrl(_targetUrl.toString(), _returnBackUrl?.toString());
    }
    const baseUrl = new URL(_baseUrl);
    const returnBackUrl = _returnBackUrl ? new URL(_returnBackUrl, baseUrl) : void 0;
    const res = new URL(_targetUrl, baseUrl);
    const isCrossOriginRedirect = `${baseUrl.hostname}:${baseUrl.port}` !== `${res.hostname}:${res.port}`;
    if (returnBackUrl) {
        if (isCrossOriginRedirect) {
            returnBackUrl.searchParams.delete(constants.QueryParameters.ClerkSynced);
        }
        res.searchParams.set("redirect_url", returnBackUrl.toString());
    }
    if (isCrossOriginRedirect && _devBrowserToken) {
        res.searchParams.set(constants.QueryParameters.DevBrowser, _devBrowserToken);
    }
    return res.toString();
};
var legacyBuildUrl = (targetUrl, redirectUrl)=>{
    let url;
    if (!targetUrl.startsWith("http")) {
        if (!redirectUrl || !redirectUrl.startsWith("http")) {
            throw new Error("destination url or return back url should be an absolute path url!");
        }
        const baseURL = new URL(redirectUrl);
        url = new URL(targetUrl, baseURL.origin);
    } else {
        url = new URL(targetUrl);
    }
    if (redirectUrl) {
        url.searchParams.set("redirect_url", redirectUrl);
    }
    return url.toString();
};
var createRedirect = (params)=>{
    const { publishableKey, redirectAdapter, signInUrl, signUpUrl, baseUrl, sessionStatus } = params;
    const parsedPublishableKey = (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$keys$2d$YNv6yjKk$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["parsePublishableKey"])(publishableKey);
    const frontendApi = parsedPublishableKey?.frontendApi;
    const isDevelopment = parsedPublishableKey?.instanceType === "development";
    const accountsBaseUrl = (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$buildAccountsBaseUrl$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["buildAccountsBaseUrl"])(frontendApi);
    const hasPendingStatus = sessionStatus === "pending";
    const redirectToTasks = (url, { returnBackUrl })=>{
        return redirectAdapter(buildUrl(baseUrl, `${url}/tasks`, returnBackUrl, isDevelopment ? params.devBrowserToken : null));
    };
    const redirectToSignUp = ({ returnBackUrl } = {})=>{
        if (!signUpUrl && !accountsBaseUrl) {
            __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$YBVFDYDR$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__["errorThrower"].throwMissingPublishableKeyError();
        }
        const accountsSignUpUrl = `${accountsBaseUrl}/sign-up`;
        function buildSignUpUrl(signIn) {
            if (!signIn) {
                return;
            }
            const url = new URL(signIn, baseUrl);
            url.pathname = `${url.pathname}/create`;
            return url.toString();
        }
        const targetUrl = signUpUrl || buildSignUpUrl(signInUrl) || accountsSignUpUrl;
        if (hasPendingStatus) {
            return redirectToTasks(targetUrl, {
                returnBackUrl
            });
        }
        return redirectAdapter(buildUrl(baseUrl, targetUrl, returnBackUrl, isDevelopment ? params.devBrowserToken : null));
    };
    const redirectToSignIn = ({ returnBackUrl } = {})=>{
        if (!signInUrl && !accountsBaseUrl) {
            __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$YBVFDYDR$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__["errorThrower"].throwMissingPublishableKeyError();
        }
        const accountsSignInUrl = `${accountsBaseUrl}/sign-in`;
        const targetUrl = signInUrl || accountsSignInUrl;
        if (hasPendingStatus) {
            return redirectToTasks(targetUrl, {
                returnBackUrl
            });
        }
        return redirectAdapter(buildUrl(baseUrl, targetUrl, returnBackUrl, isDevelopment ? params.devBrowserToken : null));
    };
    return {
        redirectToSignUp,
        redirectToSignIn
    };
};
// src/util/mergePreDefinedOptions.ts
function mergePreDefinedOptions(preDefinedOptions, options) {
    return Object.keys(preDefinedOptions).reduce((obj, key)=>{
        return {
            ...obj,
            [key]: options[key] || obj[key]
        };
    }, {
        ...preDefinedOptions
    });
}
// src/util/optionsAssertions.ts
function assertValidSecretKey(val) {
    if (!val || typeof val !== "string") {
        throw Error("Missing Clerk Secret Key. Go to https://dashboard.clerk.com and get your key for your instance.");
    }
}
function assertValidPublishableKey(val) {
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$keys$2d$YNv6yjKk$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["parsePublishableKey"])(val, {
        fatal: true
    });
}
;
;
// src/tokens/tokenTypes.ts
var TokenType = {
    SessionToken: "session_token",
    ApiKey: "api_key",
    M2MToken: "m2m_token",
    OAuthToken: "oauth_token"
};
// src/tokens/authenticateContext.ts
var AuthenticateContext = class {
    constructor(cookieSuffix, clerkRequest, options){
        this.cookieSuffix = cookieSuffix;
        this.clerkRequest = clerkRequest;
        /**
     * The original Clerk frontend API URL, extracted from publishable key before proxy URL override.
     * Used for backend operations like token validation and issuer checking.
     */ this.originalFrontendApi = "";
        if (options.acceptsToken === TokenType.M2MToken || options.acceptsToken === TokenType.ApiKey) {
            this.initHeaderValues();
        } else {
            this.initPublishableKeyValues(options);
            this.initHeaderValues();
            this.initCookieValues();
            this.initHandshakeValues();
        }
        Object.assign(this, options);
        this.clerkUrl = this.clerkRequest.clerkUrl;
    }
    /**
   * Retrieves the session token from either the cookie or the header.
   *
   * @returns {string | undefined} The session token if available, otherwise undefined.
   */ get sessionToken() {
        return this.sessionTokenInCookie || this.tokenInHeader;
    }
    usesSuffixedCookies() {
        const suffixedClientUat = this.getSuffixedCookie(constants.Cookies.ClientUat);
        const clientUat = this.getCookie(constants.Cookies.ClientUat);
        const suffixedSession = this.getSuffixedCookie(constants.Cookies.Session) || "";
        const session = this.getCookie(constants.Cookies.Session) || "";
        if (session && !this.tokenHasIssuer(session)) {
            return false;
        }
        if (session && !this.tokenBelongsToInstance(session)) {
            return true;
        }
        if (!suffixedClientUat && !suffixedSession) {
            return false;
        }
        const { data: sessionData } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$7X3P2E3X$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["decodeJwt"])(session);
        const sessionIat = sessionData?.payload.iat || 0;
        const { data: suffixedSessionData } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$7X3P2E3X$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["decodeJwt"])(suffixedSession);
        const suffixedSessionIat = suffixedSessionData?.payload.iat || 0;
        if (suffixedClientUat !== "0" && clientUat !== "0" && sessionIat > suffixedSessionIat) {
            return false;
        }
        if (suffixedClientUat === "0" && clientUat !== "0") {
            return false;
        }
        if (this.instanceType !== "production") {
            const isSuffixedSessionExpired = this.sessionExpired(suffixedSessionData);
            if (suffixedClientUat !== "0" && clientUat === "0" && isSuffixedSessionExpired) {
                return false;
            }
        }
        if (!suffixedClientUat && suffixedSession) {
            return false;
        }
        return true;
    }
    /**
   * Determines if the request came from a different origin based on the referrer header.
   * Used for cross-origin detection in multi-domain authentication flows.
   *
   * @returns {boolean} True if referrer exists and is from a different origin, false otherwise.
   */ isCrossOriginReferrer() {
        if (!this.referrer || !this.clerkUrl.origin) {
            return false;
        }
        try {
            const referrerOrigin = new URL(this.referrer).origin;
            return referrerOrigin !== this.clerkUrl.origin;
        } catch  {
            return false;
        }
    }
    /**
   * Determines if the referrer URL is from a Clerk domain (accounts portal or FAPI).
   * This includes both development and production account portal domains, as well as FAPI domains
   * used for redirect-based authentication flows.
   *
   * @returns {boolean} True if the referrer is from a Clerk accounts portal or FAPI domain, false otherwise
   */ isKnownClerkReferrer() {
        if (!this.referrer) {
            return false;
        }
        try {
            const referrerOrigin = new URL(this.referrer);
            const referrerHost = referrerOrigin.hostname;
            if (this.frontendApi) {
                const fapiHost = this.frontendApi.startsWith("http") ? new URL(this.frontendApi).hostname : this.frontendApi;
                if (referrerHost === fapiHost) {
                    return true;
                }
            }
            if ((0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$url$2d$Cdy8w8vK$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["isLegacyDevAccountPortalOrigin"])(referrerHost) || (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$url$2d$Cdy8w8vK$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["isCurrentDevAccountPortalOrigin"])(referrerHost)) {
                return true;
            }
            const expectedAccountsUrl = (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$buildAccountsBaseUrl$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["buildAccountsBaseUrl"])(this.frontendApi);
            if (expectedAccountsUrl) {
                const expectedAccountsOrigin = new URL(expectedAccountsUrl).origin;
                if (referrerOrigin.origin === expectedAccountsOrigin) {
                    return true;
                }
            }
            if (referrerHost.startsWith("accounts.")) {
                return true;
            }
            return false;
        } catch  {
            return false;
        }
    }
    initPublishableKeyValues(options) {
        assertValidPublishableKey(options.publishableKey);
        this.publishableKey = options.publishableKey;
        const originalPk = (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$keys$2d$YNv6yjKk$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["parsePublishableKey"])(this.publishableKey, {
            fatal: true,
            domain: options.domain,
            isSatellite: options.isSatellite
        });
        this.originalFrontendApi = originalPk.frontendApi;
        const pk = (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$keys$2d$YNv6yjKk$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["parsePublishableKey"])(this.publishableKey, {
            fatal: true,
            proxyUrl: options.proxyUrl,
            domain: options.domain,
            isSatellite: options.isSatellite
        });
        this.instanceType = pk.instanceType;
        this.frontendApi = pk.frontendApi;
    }
    initHeaderValues() {
        this.tokenInHeader = this.parseAuthorizationHeader(this.getHeader(constants.Headers.Authorization));
        this.origin = this.getHeader(constants.Headers.Origin);
        this.host = this.getHeader(constants.Headers.Host);
        this.forwardedHost = this.getHeader(constants.Headers.ForwardedHost);
        this.forwardedProto = this.getHeader(constants.Headers.CloudFrontForwardedProto) || this.getHeader(constants.Headers.ForwardedProto);
        this.referrer = this.getHeader(constants.Headers.Referrer);
        this.userAgent = this.getHeader(constants.Headers.UserAgent);
        this.secFetchDest = this.getHeader(constants.Headers.SecFetchDest);
        this.accept = this.getHeader(constants.Headers.Accept);
    }
    initCookieValues() {
        this.sessionTokenInCookie = this.getSuffixedOrUnSuffixedCookie(constants.Cookies.Session);
        this.refreshTokenInCookie = this.getSuffixedCookie(constants.Cookies.Refresh);
        this.clientUat = Number.parseInt(this.getSuffixedOrUnSuffixedCookie(constants.Cookies.ClientUat) || "") || 0;
    }
    initHandshakeValues() {
        this.devBrowserToken = this.getQueryParam(constants.QueryParameters.DevBrowser) || this.getSuffixedOrUnSuffixedCookie(constants.Cookies.DevBrowser);
        this.handshakeToken = this.getQueryParam(constants.QueryParameters.Handshake) || this.getCookie(constants.Cookies.Handshake);
        this.handshakeRedirectLoopCounter = Number(this.getCookie(constants.Cookies.RedirectCount)) || 0;
        this.handshakeNonce = this.getQueryParam(constants.QueryParameters.HandshakeNonce) || this.getCookie(constants.Cookies.HandshakeNonce);
    }
    getQueryParam(name) {
        return this.clerkRequest.clerkUrl.searchParams.get(name);
    }
    getHeader(name) {
        return this.clerkRequest.headers.get(name) || void 0;
    }
    getCookie(name) {
        return this.clerkRequest.cookies.get(name) || void 0;
    }
    getSuffixedCookie(name) {
        return this.getCookie((0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$keys$2d$YNv6yjKk$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getSuffixedCookieName"])(name, this.cookieSuffix)) || void 0;
    }
    getSuffixedOrUnSuffixedCookie(cookieName) {
        if (this.usesSuffixedCookies()) {
            return this.getSuffixedCookie(cookieName);
        }
        return this.getCookie(cookieName);
    }
    parseAuthorizationHeader(authorizationHeader) {
        if (!authorizationHeader) {
            return void 0;
        }
        const [scheme, token] = authorizationHeader.split(" ", 2);
        if (!token) {
            return scheme;
        }
        if (scheme === "Bearer") {
            return token;
        }
        return void 0;
    }
    tokenHasIssuer(token) {
        const { data, errors } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$7X3P2E3X$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["decodeJwt"])(token);
        if (errors) {
            return false;
        }
        return !!data.payload.iss;
    }
    tokenBelongsToInstance(token) {
        if (!token) {
            return false;
        }
        const { data, errors } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$7X3P2E3X$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["decodeJwt"])(token);
        if (errors) {
            return false;
        }
        const tokenIssuer = data.payload.iss.replace(/https?:\/\//gi, "");
        return this.originalFrontendApi === tokenIssuer;
    }
    sessionExpired(jwt) {
        return !!jwt && jwt?.payload.exp <= Date.now() / 1e3 >> 0;
    }
};
var createAuthenticateContext = async (clerkRequest, options)=>{
    const cookieSuffix = options.publishableKey ? await (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$keys$2d$YNv6yjKk$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getCookieSuffix"])(options.publishableKey, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$7X3P2E3X$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["runtime"].crypto.subtle) : "";
    return new AuthenticateContext(cookieSuffix, clerkRequest, options);
};
;
;
// src/util/path.ts
var SEPARATOR = "/";
var MULTIPLE_SEPARATOR_REGEX = new RegExp("(?<!:)" + SEPARATOR + "{1,}", "g");
function joinPaths(...args) {
    return args.filter((p)=>p).join(SEPARATOR).replace(MULTIPLE_SEPARATOR_REGEX, SEPARATOR);
}
// src/api/endpoints/AbstractApi.ts
var AbstractAPI = class {
    constructor(request){
        this.request = request;
    }
    requireId(id) {
        if (!id) {
            throw new Error("A valid resource ID is required.");
        }
    }
};
// src/api/endpoints/ActorTokenApi.ts
var basePath = "/actor_tokens";
var ActorTokenAPI = class extends AbstractAPI {
    async create(params) {
        return this.request({
            method: "POST",
            path: basePath,
            bodyParams: params
        });
    }
    async revoke(actorTokenId) {
        this.requireId(actorTokenId);
        return this.request({
            method: "POST",
            path: joinPaths(basePath, actorTokenId, "revoke")
        });
    }
};
// src/api/endpoints/AccountlessApplicationsAPI.ts
var basePath2 = "/accountless_applications";
var AccountlessApplicationAPI = class extends AbstractAPI {
    async createAccountlessApplication(params) {
        const headerParams = params?.requestHeaders ? Object.fromEntries(params.requestHeaders.entries()) : void 0;
        return this.request({
            method: "POST",
            path: basePath2,
            headerParams
        });
    }
    async completeAccountlessApplicationOnboarding(params) {
        const headerParams = params?.requestHeaders ? Object.fromEntries(params.requestHeaders.entries()) : void 0;
        return this.request({
            method: "POST",
            path: joinPaths(basePath2, "complete"),
            headerParams
        });
    }
};
// src/api/endpoints/AllowlistIdentifierApi.ts
var basePath3 = "/allowlist_identifiers";
var AllowlistIdentifierAPI = class extends AbstractAPI {
    async getAllowlistIdentifierList(params = {}) {
        return this.request({
            method: "GET",
            path: basePath3,
            queryParams: {
                ...params,
                paginated: true
            }
        });
    }
    async createAllowlistIdentifier(params) {
        return this.request({
            method: "POST",
            path: basePath3,
            bodyParams: params
        });
    }
    async deleteAllowlistIdentifier(allowlistIdentifierId) {
        this.requireId(allowlistIdentifierId);
        return this.request({
            method: "DELETE",
            path: joinPaths(basePath3, allowlistIdentifierId)
        });
    }
};
// src/api/endpoints/APIKeysApi.ts
var basePath4 = "/api_keys";
var APIKeysAPI = class extends AbstractAPI {
    async list(queryParams) {
        return this.request({
            method: "GET",
            path: basePath4,
            queryParams
        });
    }
    async create(params) {
        return this.request({
            method: "POST",
            path: basePath4,
            bodyParams: params
        });
    }
    async get(apiKeyId) {
        this.requireId(apiKeyId);
        return this.request({
            method: "GET",
            path: joinPaths(basePath4, apiKeyId)
        });
    }
    async update(params) {
        const { apiKeyId, ...bodyParams } = params;
        this.requireId(apiKeyId);
        return this.request({
            method: "PATCH",
            path: joinPaths(basePath4, apiKeyId),
            bodyParams
        });
    }
    async delete(apiKeyId) {
        this.requireId(apiKeyId);
        return this.request({
            method: "DELETE",
            path: joinPaths(basePath4, apiKeyId)
        });
    }
    async revoke(params) {
        const { apiKeyId, revocationReason = null } = params;
        this.requireId(apiKeyId);
        return this.request({
            method: "POST",
            path: joinPaths(basePath4, apiKeyId, "revoke"),
            bodyParams: {
                revocationReason
            }
        });
    }
    async getSecret(apiKeyId) {
        this.requireId(apiKeyId);
        return this.request({
            method: "GET",
            path: joinPaths(basePath4, apiKeyId, "secret")
        });
    }
    async verify(secret) {
        return this.request({
            method: "POST",
            path: joinPaths(basePath4, "verify"),
            bodyParams: {
                secret
            }
        });
    }
    /**
   * @deprecated Use `verify()` instead. This method will be removed in the next major release.
   */ async verifySecret(secret) {
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$deprecated$2d$BqlFbLHj$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["deprecated"])("apiKeys.verifySecret()", "Use `apiKeys.verify()` instead.");
        return this.verify(secret);
    }
};
// src/api/endpoints/BetaFeaturesApi.ts
var basePath5 = "/beta_features";
var BetaFeaturesAPI = class extends AbstractAPI {
    /**
   * Change the domain of a production instance.
   *
   * Changing the domain requires updating the DNS records accordingly, deploying new SSL certificates,
   * updating your Social Connection's redirect URLs and setting the new keys in your code.
   *
   * @remarks
   * WARNING: Changing your domain will invalidate all current user sessions (i.e. users will be logged out).
   *          Also, while your application is being deployed, a small downtime is expected to occur.
   */ async changeDomain(params) {
        return this.request({
            method: "POST",
            path: joinPaths(basePath5, "change_domain"),
            bodyParams: params
        });
    }
};
// src/api/endpoints/BlocklistIdentifierApi.ts
var basePath6 = "/blocklist_identifiers";
var BlocklistIdentifierAPI = class extends AbstractAPI {
    async getBlocklistIdentifierList(params = {}) {
        return this.request({
            method: "GET",
            path: basePath6,
            queryParams: params
        });
    }
    async createBlocklistIdentifier(params) {
        return this.request({
            method: "POST",
            path: basePath6,
            bodyParams: params
        });
    }
    async deleteBlocklistIdentifier(blocklistIdentifierId) {
        this.requireId(blocklistIdentifierId);
        return this.request({
            method: "DELETE",
            path: joinPaths(basePath6, blocklistIdentifierId)
        });
    }
};
// src/api/endpoints/ClientApi.ts
var basePath7 = "/clients";
var ClientAPI = class extends AbstractAPI {
    async getClientList(params = {}) {
        return this.request({
            method: "GET",
            path: basePath7,
            queryParams: {
                ...params,
                paginated: true
            }
        });
    }
    async getClient(clientId) {
        this.requireId(clientId);
        return this.request({
            method: "GET",
            path: joinPaths(basePath7, clientId)
        });
    }
    verifyClient(token) {
        return this.request({
            method: "POST",
            path: joinPaths(basePath7, "verify"),
            bodyParams: {
                token
            }
        });
    }
    async getHandshakePayload(queryParams) {
        return this.request({
            method: "GET",
            path: joinPaths(basePath7, "handshake_payload"),
            queryParams
        });
    }
};
// src/api/endpoints/DomainApi.ts
var basePath8 = "/domains";
var DomainAPI = class extends AbstractAPI {
    async list() {
        return this.request({
            method: "GET",
            path: basePath8
        });
    }
    async add(params) {
        return this.request({
            method: "POST",
            path: basePath8,
            bodyParams: params
        });
    }
    async update(params) {
        const { domainId, ...bodyParams } = params;
        this.requireId(domainId);
        return this.request({
            method: "PATCH",
            path: joinPaths(basePath8, domainId),
            bodyParams
        });
    }
    /**
   * Deletes a satellite domain for the instance.
   * It is currently not possible to delete the instance's primary domain.
   */ async delete(satelliteDomainId) {
        return this.deleteDomain(satelliteDomainId);
    }
    /**
   * @deprecated Use `delete` instead
   */ async deleteDomain(satelliteDomainId) {
        this.requireId(satelliteDomainId);
        return this.request({
            method: "DELETE",
            path: joinPaths(basePath8, satelliteDomainId)
        });
    }
};
// src/api/endpoints/EmailAddressApi.ts
var basePath9 = "/email_addresses";
var EmailAddressAPI = class extends AbstractAPI {
    async getEmailAddress(emailAddressId) {
        this.requireId(emailAddressId);
        return this.request({
            method: "GET",
            path: joinPaths(basePath9, emailAddressId)
        });
    }
    async createEmailAddress(params) {
        return this.request({
            method: "POST",
            path: basePath9,
            bodyParams: params
        });
    }
    async updateEmailAddress(emailAddressId, params = {}) {
        this.requireId(emailAddressId);
        return this.request({
            method: "PATCH",
            path: joinPaths(basePath9, emailAddressId),
            bodyParams: params
        });
    }
    async deleteEmailAddress(emailAddressId) {
        this.requireId(emailAddressId);
        return this.request({
            method: "DELETE",
            path: joinPaths(basePath9, emailAddressId)
        });
    }
};
// src/api/endpoints/IdPOAuthAccessTokenApi.ts
var basePath10 = "/oauth_applications/access_tokens";
var IdPOAuthAccessTokenApi = class extends AbstractAPI {
    async verify(accessToken) {
        return this.request({
            method: "POST",
            path: joinPaths(basePath10, "verify"),
            bodyParams: {
                access_token: accessToken
            }
        });
    }
    /**
   * @deprecated Use `verify()` instead. This method will be removed in the next major release.
   */ async verifyAccessToken(accessToken) {
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$deprecated$2d$BqlFbLHj$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["deprecated"])("idPOAuthAccessToken.verifyAccessToken()", "Use `idPOAuthAccessToken.verify()` instead.");
        return this.verify(accessToken);
    }
};
// src/api/endpoints/InstanceApi.ts
var basePath11 = "/instance";
var InstanceAPI = class extends AbstractAPI {
    async get() {
        return this.request({
            method: "GET",
            path: basePath11
        });
    }
    async update(params) {
        return this.request({
            method: "PATCH",
            path: basePath11,
            bodyParams: params
        });
    }
    async updateRestrictions(params) {
        return this.request({
            method: "PATCH",
            path: joinPaths(basePath11, "restrictions"),
            bodyParams: params
        });
    }
    async updateOrganizationSettings(params) {
        return this.request({
            method: "PATCH",
            path: joinPaths(basePath11, "organization_settings"),
            bodyParams: params
        });
    }
};
// src/api/endpoints/InvitationApi.ts
var basePath12 = "/invitations";
var InvitationAPI = class extends AbstractAPI {
    async getInvitationList(params = {}) {
        return this.request({
            method: "GET",
            path: basePath12,
            queryParams: {
                ...params,
                paginated: true
            }
        });
    }
    async createInvitation(params) {
        return this.request({
            method: "POST",
            path: basePath12,
            bodyParams: params
        });
    }
    async createInvitationBulk(params) {
        return this.request({
            method: "POST",
            path: joinPaths(basePath12, "bulk"),
            bodyParams: params
        });
    }
    async revokeInvitation(invitationId) {
        this.requireId(invitationId);
        return this.request({
            method: "POST",
            path: joinPaths(basePath12, invitationId, "revoke")
        });
    }
};
// src/api/endpoints/MachineApi.ts
var basePath13 = "/machines";
var MachineApi = class extends AbstractAPI {
    async get(machineId) {
        this.requireId(machineId);
        return this.request({
            method: "GET",
            path: joinPaths(basePath13, machineId)
        });
    }
    async list(queryParams = {}) {
        return this.request({
            method: "GET",
            path: basePath13,
            queryParams
        });
    }
    async create(bodyParams) {
        return this.request({
            method: "POST",
            path: basePath13,
            bodyParams
        });
    }
    async update(params) {
        const { machineId, ...bodyParams } = params;
        this.requireId(machineId);
        return this.request({
            method: "PATCH",
            path: joinPaths(basePath13, machineId),
            bodyParams
        });
    }
    async delete(machineId) {
        this.requireId(machineId);
        return this.request({
            method: "DELETE",
            path: joinPaths(basePath13, machineId)
        });
    }
    async getSecretKey(machineId) {
        this.requireId(machineId);
        return this.request({
            method: "GET",
            path: joinPaths(basePath13, machineId, "secret_key")
        });
    }
    async rotateSecretKey(params) {
        const { machineId, previousTokenTtl } = params;
        this.requireId(machineId);
        return this.request({
            method: "POST",
            path: joinPaths(basePath13, machineId, "secret_key", "rotate"),
            bodyParams: {
                previousTokenTtl
            }
        });
    }
    /**
   * Creates a new machine scope, allowing the specified machine to access another machine.
   *
   * @param machineId - The ID of the machine that will have access to another machine.
   * @param toMachineId - The ID of the machine that will be scoped to the current machine.
   */ async createScope(machineId, toMachineId) {
        this.requireId(machineId);
        return this.request({
            method: "POST",
            path: joinPaths(basePath13, machineId, "scopes"),
            bodyParams: {
                toMachineId
            }
        });
    }
    /**
   * Deletes a machine scope, removing access from one machine to another.
   *
   * @param machineId - The ID of the machine that has access to another machine.
   * @param otherMachineId - The ID of the machine that is being accessed.
   */ async deleteScope(machineId, otherMachineId) {
        this.requireId(machineId);
        return this.request({
            method: "DELETE",
            path: joinPaths(basePath13, machineId, "scopes", otherMachineId)
        });
    }
};
// src/api/endpoints/M2MTokenApi.ts
var basePath14 = "/m2m_tokens";
var _M2MTokenApi_instances, createRequestOptions_fn;
var M2MTokenApi = class extends AbstractAPI {
    constructor(){
        super(...arguments);
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$RPS7XK5K$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["__privateAdd"])(this, _M2MTokenApi_instances);
    }
    async createToken(params) {
        const { claims = null, machineSecretKey, secondsUntilExpiration = null } = params || {};
        const requestOptions = (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$RPS7XK5K$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["__privateMethod"])(this, _M2MTokenApi_instances, createRequestOptions_fn).call(this, {
            method: "POST",
            path: basePath14,
            bodyParams: {
                secondsUntilExpiration,
                claims
            }
        }, machineSecretKey);
        return this.request(requestOptions);
    }
    async revokeToken(params) {
        const { m2mTokenId, revocationReason = null, machineSecretKey } = params;
        this.requireId(m2mTokenId);
        const requestOptions = (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$RPS7XK5K$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["__privateMethod"])(this, _M2MTokenApi_instances, createRequestOptions_fn).call(this, {
            method: "POST",
            path: joinPaths(basePath14, m2mTokenId, "revoke"),
            bodyParams: {
                revocationReason
            }
        }, machineSecretKey);
        return this.request(requestOptions);
    }
    async verify(params) {
        const { token, machineSecretKey } = params;
        const requestOptions = (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$RPS7XK5K$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["__privateMethod"])(this, _M2MTokenApi_instances, createRequestOptions_fn).call(this, {
            method: "POST",
            path: joinPaths(basePath14, "verify"),
            bodyParams: {
                token
            }
        }, machineSecretKey);
        return this.request(requestOptions);
    }
    /**
   * @deprecated Use `verify()` instead. This method will be removed in the next major release.
   */ async verifyToken(params) {
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$deprecated$2d$BqlFbLHj$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["deprecated"])("m2m.verifyToken()", "Use `m2m.verify()` instead.");
        return this.verify(params);
    }
};
_M2MTokenApi_instances = new WeakSet();
createRequestOptions_fn = function(options, machineSecretKey) {
    if (machineSecretKey) {
        return {
            ...options,
            headerParams: {
                ...options.headerParams,
                Authorization: `Bearer ${machineSecretKey}`
            }
        };
    }
    return options;
};
// src/api/endpoints/JwksApi.ts
var basePath15 = "/jwks";
var JwksAPI = class extends AbstractAPI {
    async getJwks() {
        return this.request({
            method: "GET",
            path: basePath15
        });
    }
};
// src/api/endpoints/JwtTemplatesApi.ts
var basePath16 = "/jwt_templates";
var JwtTemplatesApi = class extends AbstractAPI {
    async list(params = {}) {
        return this.request({
            method: "GET",
            path: basePath16,
            queryParams: {
                ...params,
                paginated: true
            }
        });
    }
    async get(templateId) {
        this.requireId(templateId);
        return this.request({
            method: "GET",
            path: joinPaths(basePath16, templateId)
        });
    }
    async create(params) {
        return this.request({
            method: "POST",
            path: basePath16,
            bodyParams: params
        });
    }
    async update(params) {
        const { templateId, ...bodyParams } = params;
        this.requireId(templateId);
        return this.request({
            method: "PATCH",
            path: joinPaths(basePath16, templateId),
            bodyParams
        });
    }
    async delete(templateId) {
        this.requireId(templateId);
        return this.request({
            method: "DELETE",
            path: joinPaths(basePath16, templateId)
        });
    }
};
// src/api/endpoints/OrganizationApi.ts
var basePath17 = "/organizations";
var OrganizationAPI = class extends AbstractAPI {
    async getOrganizationList(params) {
        return this.request({
            method: "GET",
            path: basePath17,
            queryParams: params
        });
    }
    async createOrganization(params) {
        return this.request({
            method: "POST",
            path: basePath17,
            bodyParams: params
        });
    }
    async getOrganization(params) {
        const { includeMembersCount } = params;
        const organizationIdOrSlug = "organizationId" in params ? params.organizationId : params.slug;
        this.requireId(organizationIdOrSlug);
        return this.request({
            method: "GET",
            path: joinPaths(basePath17, organizationIdOrSlug),
            queryParams: {
                includeMembersCount
            }
        });
    }
    async updateOrganization(organizationId, params) {
        this.requireId(organizationId);
        return this.request({
            method: "PATCH",
            path: joinPaths(basePath17, organizationId),
            bodyParams: params
        });
    }
    async updateOrganizationLogo(organizationId, params) {
        this.requireId(organizationId);
        const formData = new __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$7X3P2E3X$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["runtime"].FormData();
        formData.append("file", params?.file);
        if (params?.uploaderUserId) {
            formData.append("uploader_user_id", params?.uploaderUserId);
        }
        return this.request({
            method: "PUT",
            path: joinPaths(basePath17, organizationId, "logo"),
            formData
        });
    }
    async deleteOrganizationLogo(organizationId) {
        this.requireId(organizationId);
        return this.request({
            method: "DELETE",
            path: joinPaths(basePath17, organizationId, "logo")
        });
    }
    async updateOrganizationMetadata(organizationId, params) {
        this.requireId(organizationId);
        return this.request({
            method: "PATCH",
            path: joinPaths(basePath17, organizationId, "metadata"),
            bodyParams: params
        });
    }
    async deleteOrganization(organizationId) {
        return this.request({
            method: "DELETE",
            path: joinPaths(basePath17, organizationId)
        });
    }
    async getOrganizationMembershipList(params) {
        const { organizationId, ...queryParams } = params;
        this.requireId(organizationId);
        return this.request({
            method: "GET",
            path: joinPaths(basePath17, organizationId, "memberships"),
            queryParams
        });
    }
    async getInstanceOrganizationMembershipList(params) {
        return this.request({
            method: "GET",
            path: "/organization_memberships",
            queryParams: params
        });
    }
    async createOrganizationMembership(params) {
        const { organizationId, ...bodyParams } = params;
        this.requireId(organizationId);
        return this.request({
            method: "POST",
            path: joinPaths(basePath17, organizationId, "memberships"),
            bodyParams
        });
    }
    async updateOrganizationMembership(params) {
        const { organizationId, userId, ...bodyParams } = params;
        this.requireId(organizationId);
        return this.request({
            method: "PATCH",
            path: joinPaths(basePath17, organizationId, "memberships", userId),
            bodyParams
        });
    }
    async updateOrganizationMembershipMetadata(params) {
        const { organizationId, userId, ...bodyParams } = params;
        return this.request({
            method: "PATCH",
            path: joinPaths(basePath17, organizationId, "memberships", userId, "metadata"),
            bodyParams
        });
    }
    async deleteOrganizationMembership(params) {
        const { organizationId, userId } = params;
        this.requireId(organizationId);
        return this.request({
            method: "DELETE",
            path: joinPaths(basePath17, organizationId, "memberships", userId)
        });
    }
    async getOrganizationInvitationList(params) {
        const { organizationId, ...queryParams } = params;
        this.requireId(organizationId);
        return this.request({
            method: "GET",
            path: joinPaths(basePath17, organizationId, "invitations"),
            queryParams
        });
    }
    async createOrganizationInvitation(params) {
        const { organizationId, ...bodyParams } = params;
        this.requireId(organizationId);
        return this.request({
            method: "POST",
            path: joinPaths(basePath17, organizationId, "invitations"),
            bodyParams
        });
    }
    async createOrganizationInvitationBulk(organizationId, params) {
        this.requireId(organizationId);
        return this.request({
            method: "POST",
            path: joinPaths(basePath17, organizationId, "invitations", "bulk"),
            bodyParams: params
        });
    }
    async getOrganizationInvitation(params) {
        const { organizationId, invitationId } = params;
        this.requireId(organizationId);
        this.requireId(invitationId);
        return this.request({
            method: "GET",
            path: joinPaths(basePath17, organizationId, "invitations", invitationId)
        });
    }
    async revokeOrganizationInvitation(params) {
        const { organizationId, invitationId, ...bodyParams } = params;
        this.requireId(organizationId);
        return this.request({
            method: "POST",
            path: joinPaths(basePath17, organizationId, "invitations", invitationId, "revoke"),
            bodyParams
        });
    }
    async getOrganizationDomainList(params) {
        const { organizationId, ...queryParams } = params;
        this.requireId(organizationId);
        return this.request({
            method: "GET",
            path: joinPaths(basePath17, organizationId, "domains"),
            queryParams
        });
    }
    async createOrganizationDomain(params) {
        const { organizationId, ...bodyParams } = params;
        this.requireId(organizationId);
        return this.request({
            method: "POST",
            path: joinPaths(basePath17, organizationId, "domains"),
            bodyParams: {
                ...bodyParams,
                verified: bodyParams.verified ?? true
            }
        });
    }
    async updateOrganizationDomain(params) {
        const { organizationId, domainId, ...bodyParams } = params;
        this.requireId(organizationId);
        this.requireId(domainId);
        return this.request({
            method: "PATCH",
            path: joinPaths(basePath17, organizationId, "domains", domainId),
            bodyParams
        });
    }
    async deleteOrganizationDomain(params) {
        const { organizationId, domainId } = params;
        this.requireId(organizationId);
        this.requireId(domainId);
        return this.request({
            method: "DELETE",
            path: joinPaths(basePath17, organizationId, "domains", domainId)
        });
    }
};
// src/api/endpoints/OAuthApplicationsApi.ts
var basePath18 = "/oauth_applications";
var OAuthApplicationsApi = class extends AbstractAPI {
    async list(params = {}) {
        return this.request({
            method: "GET",
            path: basePath18,
            queryParams: params
        });
    }
    async get(oauthApplicationId) {
        this.requireId(oauthApplicationId);
        return this.request({
            method: "GET",
            path: joinPaths(basePath18, oauthApplicationId)
        });
    }
    async create(params) {
        return this.request({
            method: "POST",
            path: basePath18,
            bodyParams: params
        });
    }
    async update(params) {
        const { oauthApplicationId, ...bodyParams } = params;
        this.requireId(oauthApplicationId);
        return this.request({
            method: "PATCH",
            path: joinPaths(basePath18, oauthApplicationId),
            bodyParams
        });
    }
    async delete(oauthApplicationId) {
        this.requireId(oauthApplicationId);
        return this.request({
            method: "DELETE",
            path: joinPaths(basePath18, oauthApplicationId)
        });
    }
    async rotateSecret(oauthApplicationId) {
        this.requireId(oauthApplicationId);
        return this.request({
            method: "POST",
            path: joinPaths(basePath18, oauthApplicationId, "rotate_secret")
        });
    }
};
// src/api/endpoints/PhoneNumberApi.ts
var basePath19 = "/phone_numbers";
var PhoneNumberAPI = class extends AbstractAPI {
    async getPhoneNumber(phoneNumberId) {
        this.requireId(phoneNumberId);
        return this.request({
            method: "GET",
            path: joinPaths(basePath19, phoneNumberId)
        });
    }
    async createPhoneNumber(params) {
        return this.request({
            method: "POST",
            path: basePath19,
            bodyParams: params
        });
    }
    async updatePhoneNumber(phoneNumberId, params = {}) {
        this.requireId(phoneNumberId);
        return this.request({
            method: "PATCH",
            path: joinPaths(basePath19, phoneNumberId),
            bodyParams: params
        });
    }
    async deletePhoneNumber(phoneNumberId) {
        this.requireId(phoneNumberId);
        return this.request({
            method: "DELETE",
            path: joinPaths(basePath19, phoneNumberId)
        });
    }
};
// src/api/endpoints/ProxyCheckApi.ts
var basePath20 = "/proxy_checks";
var ProxyCheckAPI = class extends AbstractAPI {
    async verify(params) {
        return this.request({
            method: "POST",
            path: basePath20,
            bodyParams: params
        });
    }
};
// src/api/endpoints/RedirectUrlApi.ts
var basePath21 = "/redirect_urls";
var RedirectUrlAPI = class extends AbstractAPI {
    async getRedirectUrlList() {
        return this.request({
            method: "GET",
            path: basePath21,
            queryParams: {
                paginated: true
            }
        });
    }
    async getRedirectUrl(redirectUrlId) {
        this.requireId(redirectUrlId);
        return this.request({
            method: "GET",
            path: joinPaths(basePath21, redirectUrlId)
        });
    }
    async createRedirectUrl(params) {
        return this.request({
            method: "POST",
            path: basePath21,
            bodyParams: params
        });
    }
    async deleteRedirectUrl(redirectUrlId) {
        this.requireId(redirectUrlId);
        return this.request({
            method: "DELETE",
            path: joinPaths(basePath21, redirectUrlId)
        });
    }
};
// src/api/endpoints/SamlConnectionApi.ts
var basePath22 = "/saml_connections";
var SamlConnectionAPI = class extends AbstractAPI {
    async getSamlConnectionList(params = {}) {
        return this.request({
            method: "GET",
            path: basePath22,
            queryParams: params
        });
    }
    async createSamlConnection(params) {
        return this.request({
            method: "POST",
            path: basePath22,
            bodyParams: params,
            options: {
                deepSnakecaseBodyParamKeys: true
            }
        });
    }
    async getSamlConnection(samlConnectionId) {
        this.requireId(samlConnectionId);
        return this.request({
            method: "GET",
            path: joinPaths(basePath22, samlConnectionId)
        });
    }
    async updateSamlConnection(samlConnectionId, params = {}) {
        this.requireId(samlConnectionId);
        return this.request({
            method: "PATCH",
            path: joinPaths(basePath22, samlConnectionId),
            bodyParams: params,
            options: {
                deepSnakecaseBodyParamKeys: true
            }
        });
    }
    async deleteSamlConnection(samlConnectionId) {
        this.requireId(samlConnectionId);
        return this.request({
            method: "DELETE",
            path: joinPaths(basePath22, samlConnectionId)
        });
    }
};
// src/api/endpoints/SessionApi.ts
var basePath23 = "/sessions";
var SessionAPI = class extends AbstractAPI {
    async getSessionList(params = {}) {
        return this.request({
            method: "GET",
            path: basePath23,
            queryParams: {
                ...params,
                paginated: true
            }
        });
    }
    async getSession(sessionId) {
        this.requireId(sessionId);
        return this.request({
            method: "GET",
            path: joinPaths(basePath23, sessionId)
        });
    }
    async createSession(params) {
        return this.request({
            method: "POST",
            path: basePath23,
            bodyParams: params
        });
    }
    async revokeSession(sessionId) {
        this.requireId(sessionId);
        return this.request({
            method: "POST",
            path: joinPaths(basePath23, sessionId, "revoke")
        });
    }
    async verifySession(sessionId, token) {
        this.requireId(sessionId);
        return this.request({
            method: "POST",
            path: joinPaths(basePath23, sessionId, "verify"),
            bodyParams: {
                token
            }
        });
    }
    /**
   * Retrieves a session token or generates a JWT using a specified template.
   *
   * @param sessionId - The ID of the session for which to generate the token
   * @param template - Optional name of the JWT template configured in the Clerk Dashboard.
   * @param expiresInSeconds - Optional expiration time for the token in seconds.
   *   If not provided, uses the default expiration.
   *
   * @returns A promise that resolves to the generated token
   *
   * @throws {Error} When sessionId is invalid or empty
   */ async getToken(sessionId, template, expiresInSeconds) {
        this.requireId(sessionId);
        const path = template ? joinPaths(basePath23, sessionId, "tokens", template) : joinPaths(basePath23, sessionId, "tokens");
        const requestOptions = {
            method: "POST",
            path
        };
        if (expiresInSeconds !== void 0) {
            requestOptions.bodyParams = {
                expires_in_seconds: expiresInSeconds
            };
        }
        return this.request(requestOptions);
    }
    async refreshSession(sessionId, params) {
        this.requireId(sessionId);
        const { suffixed_cookies, ...restParams } = params;
        return this.request({
            method: "POST",
            path: joinPaths(basePath23, sessionId, "refresh"),
            bodyParams: restParams,
            queryParams: {
                suffixed_cookies
            }
        });
    }
};
// src/api/endpoints/SignInTokenApi.ts
var basePath24 = "/sign_in_tokens";
var SignInTokenAPI = class extends AbstractAPI {
    async createSignInToken(params) {
        return this.request({
            method: "POST",
            path: basePath24,
            bodyParams: params
        });
    }
    async revokeSignInToken(signInTokenId) {
        this.requireId(signInTokenId);
        return this.request({
            method: "POST",
            path: joinPaths(basePath24, signInTokenId, "revoke")
        });
    }
};
// src/api/endpoints/SignUpApi.ts
var basePath25 = "/sign_ups";
var SignUpAPI = class extends AbstractAPI {
    async get(signUpAttemptId) {
        this.requireId(signUpAttemptId);
        return this.request({
            method: "GET",
            path: joinPaths(basePath25, signUpAttemptId)
        });
    }
    async update(params) {
        const { signUpAttemptId, ...bodyParams } = params;
        return this.request({
            method: "PATCH",
            path: joinPaths(basePath25, signUpAttemptId),
            bodyParams
        });
    }
};
// src/api/endpoints/TestingTokenApi.ts
var basePath26 = "/testing_tokens";
var TestingTokenAPI = class extends AbstractAPI {
    async createTestingToken() {
        return this.request({
            method: "POST",
            path: basePath26
        });
    }
};
// src/api/endpoints/UserApi.ts
var basePath27 = "/users";
var UserAPI = class extends AbstractAPI {
    async getUserList(params = {}) {
        const { limit, offset, orderBy, ...userCountParams } = params;
        const [data, totalCount] = await Promise.all([
            this.request({
                method: "GET",
                path: basePath27,
                queryParams: params
            }),
            this.getCount(userCountParams)
        ]);
        return {
            data,
            totalCount
        };
    }
    async getUser(userId) {
        this.requireId(userId);
        return this.request({
            method: "GET",
            path: joinPaths(basePath27, userId)
        });
    }
    async createUser(params) {
        return this.request({
            method: "POST",
            path: basePath27,
            bodyParams: params
        });
    }
    async updateUser(userId, params = {}) {
        this.requireId(userId);
        return this.request({
            method: "PATCH",
            path: joinPaths(basePath27, userId),
            bodyParams: params
        });
    }
    async updateUserProfileImage(userId, params) {
        this.requireId(userId);
        const formData = new __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$7X3P2E3X$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["runtime"].FormData();
        formData.append("file", params?.file);
        return this.request({
            method: "POST",
            path: joinPaths(basePath27, userId, "profile_image"),
            formData
        });
    }
    async updateUserMetadata(userId, params) {
        this.requireId(userId);
        return this.request({
            method: "PATCH",
            path: joinPaths(basePath27, userId, "metadata"),
            bodyParams: params
        });
    }
    async deleteUser(userId) {
        this.requireId(userId);
        return this.request({
            method: "DELETE",
            path: joinPaths(basePath27, userId)
        });
    }
    async getCount(params = {}) {
        return this.request({
            method: "GET",
            path: joinPaths(basePath27, "count"),
            queryParams: params
        });
    }
    async getUserOauthAccessToken(userId, provider) {
        this.requireId(userId);
        const hasPrefix = provider.startsWith("oauth_");
        const _provider = hasPrefix ? provider : `oauth_${provider}`;
        if (hasPrefix) {
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$deprecated$2d$BqlFbLHj$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["deprecated"])("getUserOauthAccessToken(userId, provider)", "Remove the `oauth_` prefix from the `provider` argument.");
        }
        return this.request({
            method: "GET",
            path: joinPaths(basePath27, userId, "oauth_access_tokens", _provider),
            queryParams: {
                paginated: true
            }
        });
    }
    async disableUserMFA(userId) {
        this.requireId(userId);
        return this.request({
            method: "DELETE",
            path: joinPaths(basePath27, userId, "mfa")
        });
    }
    async getOrganizationMembershipList(params) {
        const { userId, limit, offset } = params;
        this.requireId(userId);
        return this.request({
            method: "GET",
            path: joinPaths(basePath27, userId, "organization_memberships"),
            queryParams: {
                limit,
                offset
            }
        });
    }
    async getOrganizationInvitationList(params) {
        const { userId, ...queryParams } = params;
        this.requireId(userId);
        return this.request({
            method: "GET",
            path: joinPaths(basePath27, userId, "organization_invitations"),
            queryParams
        });
    }
    async verifyPassword(params) {
        const { userId, password } = params;
        this.requireId(userId);
        return this.request({
            method: "POST",
            path: joinPaths(basePath27, userId, "verify_password"),
            bodyParams: {
                password
            }
        });
    }
    async verifyTOTP(params) {
        const { userId, code } = params;
        this.requireId(userId);
        return this.request({
            method: "POST",
            path: joinPaths(basePath27, userId, "verify_totp"),
            bodyParams: {
                code
            }
        });
    }
    async banUser(userId) {
        this.requireId(userId);
        return this.request({
            method: "POST",
            path: joinPaths(basePath27, userId, "ban")
        });
    }
    async unbanUser(userId) {
        this.requireId(userId);
        return this.request({
            method: "POST",
            path: joinPaths(basePath27, userId, "unban")
        });
    }
    async lockUser(userId) {
        this.requireId(userId);
        return this.request({
            method: "POST",
            path: joinPaths(basePath27, userId, "lock")
        });
    }
    async unlockUser(userId) {
        this.requireId(userId);
        return this.request({
            method: "POST",
            path: joinPaths(basePath27, userId, "unlock")
        });
    }
    async deleteUserProfileImage(userId) {
        this.requireId(userId);
        return this.request({
            method: "DELETE",
            path: joinPaths(basePath27, userId, "profile_image")
        });
    }
    async deleteUserPasskey(params) {
        this.requireId(params.userId);
        this.requireId(params.passkeyIdentificationId);
        return this.request({
            method: "DELETE",
            path: joinPaths(basePath27, params.userId, "passkeys", params.passkeyIdentificationId)
        });
    }
    async deleteUserWeb3Wallet(params) {
        this.requireId(params.userId);
        this.requireId(params.web3WalletIdentificationId);
        return this.request({
            method: "DELETE",
            path: joinPaths(basePath27, params.userId, "web3_wallets", params.web3WalletIdentificationId)
        });
    }
    async deleteUserExternalAccount(params) {
        this.requireId(params.userId);
        this.requireId(params.externalAccountId);
        return this.request({
            method: "DELETE",
            path: joinPaths(basePath27, params.userId, "external_accounts", params.externalAccountId)
        });
    }
    async deleteUserBackupCodes(userId) {
        this.requireId(userId);
        return this.request({
            method: "DELETE",
            path: joinPaths(basePath27, userId, "backup_code")
        });
    }
    async deleteUserTOTP(userId) {
        this.requireId(userId);
        return this.request({
            method: "DELETE",
            path: joinPaths(basePath27, userId, "totp")
        });
    }
    async setPasswordCompromised(userId, params = {
        revokeAllSessions: false
    }) {
        this.requireId(userId);
        return this.request({
            method: "POST",
            path: joinPaths(basePath27, userId, "password", "set_compromised"),
            bodyParams: params
        });
    }
    async unsetPasswordCompromised(userId) {
        this.requireId(userId);
        return this.request({
            method: "POST",
            path: joinPaths(basePath27, userId, "password", "unset_compromised")
        });
    }
};
// src/api/endpoints/WaitlistEntryApi.ts
var basePath28 = "/waitlist_entries";
var WaitlistEntryAPI = class extends AbstractAPI {
    /**
   * List waitlist entries.
   * @param params Optional parameters (e.g., `query`, `status`, `orderBy`).
   */ async list(params = {}) {
        return this.request({
            method: "GET",
            path: basePath28,
            queryParams: params
        });
    }
    /**
   * Create a waitlist entry.
   * @param params The parameters for creating a waitlist entry.
   */ async create(params) {
        return this.request({
            method: "POST",
            path: basePath28,
            bodyParams: params
        });
    }
    /**
   * Invite a waitlist entry.
   * @param id The waitlist entry ID.
   * @param params Optional parameters (e.g., `ignoreExisting`).
   */ async invite(id, params = {}) {
        this.requireId(id);
        return this.request({
            method: "POST",
            path: joinPaths(basePath28, id, "invite"),
            bodyParams: params
        });
    }
    /**
   * Reject a waitlist entry.
   * @param id The waitlist entry ID.
   */ async reject(id) {
        this.requireId(id);
        return this.request({
            method: "POST",
            path: joinPaths(basePath28, id, "reject")
        });
    }
    /**
   * Delete a waitlist entry.
   * @param id The waitlist entry ID.
   */ async delete(id) {
        this.requireId(id);
        return this.request({
            method: "DELETE",
            path: joinPaths(basePath28, id)
        });
    }
};
// src/api/endpoints/WebhookApi.ts
var basePath29 = "/webhooks";
var WebhookAPI = class extends AbstractAPI {
    async createSvixApp() {
        return this.request({
            method: "POST",
            path: joinPaths(basePath29, "svix")
        });
    }
    async generateSvixAuthURL() {
        return this.request({
            method: "POST",
            path: joinPaths(basePath29, "svix_url")
        });
    }
    async deleteSvixApp() {
        return this.request({
            method: "DELETE",
            path: joinPaths(basePath29, "svix")
        });
    }
};
// src/api/endpoints/BillingApi.ts
var basePath30 = "/billing";
var organizationBasePath = "/organizations";
var userBasePath = "/users";
var BillingAPI = class extends AbstractAPI {
    /**
   * @experimental This is an experimental API for the Billing feature that is available under a public beta, and the API is subject to change. It is advised to [pin](https://clerk.com/docs/pinning) the SDK version and the clerk-js version to avoid breaking changes.
   */ async getPlanList(params) {
        return this.request({
            method: "GET",
            path: joinPaths(basePath30, "plans"),
            queryParams: params
        });
    }
    /**
   * @experimental This is an experimental API for the Billing feature that is available under a public beta, and the API is subject to change. It is advised to [pin](https://clerk.com/docs/pinning) the SDK version and the clerk-js version to avoid breaking changes.
   */ async cancelSubscriptionItem(subscriptionItemId, params) {
        this.requireId(subscriptionItemId);
        return this.request({
            method: "DELETE",
            path: joinPaths(basePath30, "subscription_items", subscriptionItemId),
            queryParams: params
        });
    }
    /**
   * @experimental This is an experimental API for the Billing feature that is available under a public beta, and the API is subject to change. It is advised to [pin](https://clerk.com/docs/pinning) the SDK version and the clerk-js version to avoid breaking changes.
   */ async extendSubscriptionItemFreeTrial(subscriptionItemId, params) {
        this.requireId(subscriptionItemId);
        return this.request({
            method: "POST",
            path: joinPaths("/billing", "subscription_items", subscriptionItemId, "extend_free_trial"),
            bodyParams: params
        });
    }
    /**
   * @experimental This is an experimental API for the Billing feature that is available under a public beta, and the API is subject to change. It is advised to [pin](https://clerk.com/docs/pinning) the SDK version and the clerk-js version to avoid breaking changes.
   */ async getOrganizationBillingSubscription(organizationId) {
        this.requireId(organizationId);
        return this.request({
            method: "GET",
            path: joinPaths(organizationBasePath, organizationId, "billing", "subscription")
        });
    }
    /**
   * @experimental This is an experimental API for the Billing feature that is available under a public beta, and the API is subject to change. It is advised to [pin](https://clerk.com/docs/pinning) the SDK version and the clerk-js version to avoid breaking changes.
   */ async getUserBillingSubscription(userId) {
        this.requireId(userId);
        return this.request({
            method: "GET",
            path: joinPaths(userBasePath, userId, "billing", "subscription")
        });
    }
};
;
// ../../node_modules/.pnpm/map-obj@5.0.2/node_modules/map-obj/index.js
var isObject = (value)=>typeof value === "object" && value !== null;
var isObjectCustom = (value)=>isObject(value) && !(value instanceof RegExp) && !(value instanceof Error) && !(value instanceof Date) && !(globalThis.Blob && value instanceof globalThis.Blob);
var mapObjectSkip = Symbol("mapObjectSkip");
var _mapObject = (object, mapper, options, isSeen = /* @__PURE__ */ new WeakMap())=>{
    options = {
        deep: false,
        target: {},
        ...options
    };
    if (isSeen.has(object)) {
        return isSeen.get(object);
    }
    isSeen.set(object, options.target);
    const { target } = options;
    delete options.target;
    const mapArray = (array)=>array.map((element)=>isObjectCustom(element) ? _mapObject(element, mapper, options, isSeen) : element);
    if (Array.isArray(object)) {
        return mapArray(object);
    }
    for (const [key, value] of Object.entries(object)){
        const mapResult = mapper(key, value, object);
        if (mapResult === mapObjectSkip) {
            continue;
        }
        let [newKey, newValue, { shouldRecurse = true } = {}] = mapResult;
        if (newKey === "__proto__") {
            continue;
        }
        if (options.deep && shouldRecurse && isObjectCustom(newValue)) {
            newValue = Array.isArray(newValue) ? mapArray(newValue) : _mapObject(newValue, mapper, options, isSeen);
        }
        target[newKey] = newValue;
    }
    return target;
};
function mapObject(object, mapper, options) {
    if (!isObject(object)) {
        throw new TypeError(`Expected an object, got \`${object}\` (${typeof object})`);
    }
    if (Array.isArray(object)) {
        throw new TypeError("Expected an object, got an array");
    }
    return _mapObject(object, mapper, options);
}
// ../../node_modules/.pnpm/change-case@5.4.4/node_modules/change-case/dist/index.js
var SPLIT_LOWER_UPPER_RE = /([\p{Ll}\d])(\p{Lu})/gu;
var SPLIT_UPPER_UPPER_RE = /(\p{Lu})([\p{Lu}][\p{Ll}])/gu;
var SPLIT_SEPARATE_NUMBER_RE = /(\d)\p{Ll}|(\p{L})\d/u;
var DEFAULT_STRIP_REGEXP = /[^\p{L}\d]+/giu;
var SPLIT_REPLACE_VALUE = "$1\0$2";
var DEFAULT_PREFIX_SUFFIX_CHARACTERS = "";
function split(value) {
    let result = value.trim();
    result = result.replace(SPLIT_LOWER_UPPER_RE, SPLIT_REPLACE_VALUE).replace(SPLIT_UPPER_UPPER_RE, SPLIT_REPLACE_VALUE);
    result = result.replace(DEFAULT_STRIP_REGEXP, "\0");
    let start = 0;
    let end = result.length;
    while(result.charAt(start) === "\0")start++;
    if (start === end) return [];
    while(result.charAt(end - 1) === "\0")end--;
    return result.slice(start, end).split(/\0/g);
}
function splitSeparateNumbers(value) {
    const words = split(value);
    for(let i = 0; i < words.length; i++){
        const word = words[i];
        const match2 = SPLIT_SEPARATE_NUMBER_RE.exec(word);
        if (match2) {
            const offset = match2.index + (match2[1] ?? match2[2]).length;
            words.splice(i, 1, word.slice(0, offset), word.slice(offset));
        }
    }
    return words;
}
function noCase(input, options) {
    const [prefix, words, suffix] = splitPrefixSuffix(input, options);
    return prefix + words.map(lowerFactory(options?.locale)).join(options?.delimiter ?? " ") + suffix;
}
function snakeCase(input, options) {
    return noCase(input, {
        delimiter: "_",
        ...options
    });
}
function lowerFactory(locale) {
    return locale === false ? (input)=>input.toLowerCase() : (input)=>input.toLocaleLowerCase(locale);
}
function splitPrefixSuffix(input, options = {}) {
    const splitFn = options.split ?? (options.separateNumbers ? splitSeparateNumbers : split);
    const prefixCharacters = options.prefixCharacters ?? DEFAULT_PREFIX_SUFFIX_CHARACTERS;
    const suffixCharacters = options.suffixCharacters ?? DEFAULT_PREFIX_SUFFIX_CHARACTERS;
    let prefixIndex = 0;
    let suffixIndex = input.length;
    while(prefixIndex < input.length){
        const char = input.charAt(prefixIndex);
        if (!prefixCharacters.includes(char)) break;
        prefixIndex++;
    }
    while(suffixIndex > prefixIndex){
        const index = suffixIndex - 1;
        const char = input.charAt(index);
        if (!suffixCharacters.includes(char)) break;
        suffixIndex = index;
    }
    return [
        input.slice(0, prefixIndex),
        splitFn(input.slice(prefixIndex, suffixIndex)),
        input.slice(suffixIndex)
    ];
}
// ../../node_modules/.pnpm/snakecase-keys@9.0.2/node_modules/snakecase-keys/index.js
var PlainObjectConstructor = {}.constructor;
function snakecaseKeys(obj, options) {
    if (Array.isArray(obj)) {
        if (obj.some((item)=>item.constructor !== PlainObjectConstructor)) {
            throw new Error("obj must be array of plain objects");
        }
        options = {
            deep: true,
            exclude: [],
            parsingOptions: {},
            ...options
        };
        const convertCase2 = options.snakeCase || ((key)=>snakeCase(key, options.parsingOptions));
        return obj.map((item)=>{
            return mapObject(item, (key, val)=>{
                return [
                    matches(options.exclude, key) ? key : convertCase2(key),
                    val,
                    mapperOptions(key, val, options)
                ];
            }, options);
        });
    } else {
        if (obj.constructor !== PlainObjectConstructor) {
            throw new Error("obj must be an plain object");
        }
    }
    options = {
        deep: true,
        exclude: [],
        parsingOptions: {},
        ...options
    };
    const convertCase = options.snakeCase || ((key)=>snakeCase(key, options.parsingOptions));
    return mapObject(obj, (key, val)=>{
        return [
            matches(options.exclude, key) ? key : convertCase(key),
            val,
            mapperOptions(key, val, options)
        ];
    }, options);
}
function matches(patterns, value) {
    return patterns.some((pattern)=>{
        return typeof pattern === "string" ? pattern === value : pattern.test(value);
    });
}
function mapperOptions(key, val, options) {
    return options.shouldRecurse ? {
        shouldRecurse: options.shouldRecurse(key, val)
    } : void 0;
}
var snakecase_keys_default = snakecaseKeys;
// src/api/resources/AccountlessApplication.ts
var AccountlessApplication = class _AccountlessApplication {
    constructor(publishableKey, secretKey, claimUrl, apiKeysUrl){
        this.publishableKey = publishableKey;
        this.secretKey = secretKey;
        this.claimUrl = claimUrl;
        this.apiKeysUrl = apiKeysUrl;
    }
    static fromJSON(data) {
        return new _AccountlessApplication(data.publishable_key, data.secret_key, data.claim_url, data.api_keys_url);
    }
};
// src/api/resources/ActorToken.ts
var ActorToken = class _ActorToken {
    constructor(id, status, userId, actor, token, url, createdAt, updatedAt){
        this.id = id;
        this.status = status;
        this.userId = userId;
        this.actor = actor;
        this.token = token;
        this.url = url;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }
    static fromJSON(data) {
        return new _ActorToken(data.id, data.status, data.user_id, data.actor, data.token, data.url, data.created_at, data.updated_at);
    }
};
// src/api/resources/AllowlistIdentifier.ts
var AllowlistIdentifier = class _AllowlistIdentifier {
    constructor(id, identifier, identifierType, createdAt, updatedAt, instanceId, invitationId){
        this.id = id;
        this.identifier = identifier;
        this.identifierType = identifierType;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        this.instanceId = instanceId;
        this.invitationId = invitationId;
    }
    static fromJSON(data) {
        return new _AllowlistIdentifier(data.id, data.identifier, data.identifier_type, data.created_at, data.updated_at, data.instance_id, data.invitation_id);
    }
};
// src/api/resources/APIKey.ts
var APIKey = class _APIKey {
    constructor(id, type, name, subject, scopes, claims, revoked, revocationReason, expired, expiration, createdBy, description, lastUsedAt, createdAt, updatedAt, secret){
        this.id = id;
        this.type = type;
        this.name = name;
        this.subject = subject;
        this.scopes = scopes;
        this.claims = claims;
        this.revoked = revoked;
        this.revocationReason = revocationReason;
        this.expired = expired;
        this.expiration = expiration;
        this.createdBy = createdBy;
        this.description = description;
        this.lastUsedAt = lastUsedAt;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        this.secret = secret;
    }
    static fromJSON(data) {
        return new _APIKey(data.id, data.type, data.name, data.subject, data.scopes, data.claims, data.revoked, data.revocation_reason, data.expired, data.expiration, data.created_by, data.description, data.last_used_at, data.created_at, data.updated_at, data.secret);
    }
};
// src/api/resources/BlocklistIdentifier.ts
var BlocklistIdentifier = class _BlocklistIdentifier {
    constructor(id, identifier, identifierType, createdAt, updatedAt, instanceId){
        this.id = id;
        this.identifier = identifier;
        this.identifierType = identifierType;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        this.instanceId = instanceId;
    }
    static fromJSON(data) {
        return new _BlocklistIdentifier(data.id, data.identifier, data.identifier_type, data.created_at, data.updated_at, data.instance_id);
    }
};
// src/api/resources/Session.ts
var SessionActivity = class _SessionActivity {
    constructor(id, isMobile, ipAddress, city, country, browserVersion, browserName, deviceType){
        this.id = id;
        this.isMobile = isMobile;
        this.ipAddress = ipAddress;
        this.city = city;
        this.country = country;
        this.browserVersion = browserVersion;
        this.browserName = browserName;
        this.deviceType = deviceType;
    }
    static fromJSON(data) {
        return new _SessionActivity(data.id, data.is_mobile, data.ip_address, data.city, data.country, data.browser_version, data.browser_name, data.device_type);
    }
};
var Session = class _Session {
    constructor(id, clientId, userId, status, lastActiveAt, expireAt, abandonAt, createdAt, updatedAt, lastActiveOrganizationId, latestActivity, actor = null){
        this.id = id;
        this.clientId = clientId;
        this.userId = userId;
        this.status = status;
        this.lastActiveAt = lastActiveAt;
        this.expireAt = expireAt;
        this.abandonAt = abandonAt;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        this.lastActiveOrganizationId = lastActiveOrganizationId;
        this.latestActivity = latestActivity;
        this.actor = actor;
    }
    static fromJSON(data) {
        return new _Session(data.id, data.client_id, data.user_id, data.status, data.last_active_at, data.expire_at, data.abandon_at, data.created_at, data.updated_at, data.last_active_organization_id, data.latest_activity && SessionActivity.fromJSON(data.latest_activity), data.actor);
    }
};
// src/api/resources/Client.ts
var Client = class _Client {
    constructor(id, sessionIds, sessions, signInId, signUpId, lastActiveSessionId, lastAuthenticationStrategy, createdAt, updatedAt){
        this.id = id;
        this.sessionIds = sessionIds;
        this.sessions = sessions;
        this.signInId = signInId;
        this.signUpId = signUpId;
        this.lastActiveSessionId = lastActiveSessionId;
        this.lastAuthenticationStrategy = lastAuthenticationStrategy;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }
    static fromJSON(data) {
        return new _Client(data.id, data.session_ids, data.sessions.map((x)=>Session.fromJSON(x)), data.sign_in_id, data.sign_up_id, data.last_active_session_id, data.last_authentication_strategy, data.created_at, data.updated_at);
    }
};
// src/api/resources/CnameTarget.ts
var CnameTarget = class _CnameTarget {
    constructor(host, value, required){
        this.host = host;
        this.value = value;
        this.required = required;
    }
    static fromJSON(data) {
        return new _CnameTarget(data.host, data.value, data.required);
    }
};
// src/api/resources/Cookies.ts
var Cookies2 = class _Cookies {
    constructor(cookies){
        this.cookies = cookies;
    }
    static fromJSON(data) {
        return new _Cookies(data.cookies);
    }
};
// src/api/resources/DeletedObject.ts
var DeletedObject = class _DeletedObject {
    constructor(object, id, slug, deleted){
        this.object = object;
        this.id = id;
        this.slug = slug;
        this.deleted = deleted;
    }
    static fromJSON(data) {
        return new _DeletedObject(data.object, data.id || null, data.slug || null, data.deleted);
    }
};
// src/api/resources/Domain.ts
var Domain = class _Domain {
    constructor(id, name, isSatellite, frontendApiUrl, developmentOrigin, cnameTargets, accountsPortalUrl, proxyUrl){
        this.id = id;
        this.name = name;
        this.isSatellite = isSatellite;
        this.frontendApiUrl = frontendApiUrl;
        this.developmentOrigin = developmentOrigin;
        this.cnameTargets = cnameTargets;
        this.accountsPortalUrl = accountsPortalUrl;
        this.proxyUrl = proxyUrl;
    }
    static fromJSON(data) {
        return new _Domain(data.id, data.name, data.is_satellite, data.frontend_api_url, data.development_origin, data.cname_targets && data.cname_targets.map((x)=>CnameTarget.fromJSON(x)), data.accounts_portal_url, data.proxy_url);
    }
};
// src/api/resources/Email.ts
var Email = class _Email {
    constructor(id, fromEmailName, emailAddressId, toEmailAddress, subject, body, bodyPlain, status, slug, data, deliveredByClerk){
        this.id = id;
        this.fromEmailName = fromEmailName;
        this.emailAddressId = emailAddressId;
        this.toEmailAddress = toEmailAddress;
        this.subject = subject;
        this.body = body;
        this.bodyPlain = bodyPlain;
        this.status = status;
        this.slug = slug;
        this.data = data;
        this.deliveredByClerk = deliveredByClerk;
    }
    static fromJSON(data) {
        return new _Email(data.id, data.from_email_name, data.email_address_id, data.to_email_address, data.subject, data.body, data.body_plain, data.status, data.slug, data.data, data.delivered_by_clerk);
    }
};
// src/api/resources/IdentificationLink.ts
var IdentificationLink = class _IdentificationLink {
    constructor(id, type){
        this.id = id;
        this.type = type;
    }
    static fromJSON(data) {
        return new _IdentificationLink(data.id, data.type);
    }
};
// src/api/resources/Verification.ts
var Verification = class _Verification {
    constructor(status, strategy, externalVerificationRedirectURL = null, attempts = null, expireAt = null, nonce = null, message = null){
        this.status = status;
        this.strategy = strategy;
        this.externalVerificationRedirectURL = externalVerificationRedirectURL;
        this.attempts = attempts;
        this.expireAt = expireAt;
        this.nonce = nonce;
        this.message = message;
    }
    static fromJSON(data) {
        return new _Verification(data.status, data.strategy, data.external_verification_redirect_url ? new URL(data.external_verification_redirect_url) : null, data.attempts, data.expire_at, data.nonce);
    }
};
// src/api/resources/EmailAddress.ts
var EmailAddress = class _EmailAddress {
    constructor(id, emailAddress, verification, linkedTo){
        this.id = id;
        this.emailAddress = emailAddress;
        this.verification = verification;
        this.linkedTo = linkedTo;
    }
    static fromJSON(data) {
        return new _EmailAddress(data.id, data.email_address, data.verification && Verification.fromJSON(data.verification), data.linked_to.map((link)=>IdentificationLink.fromJSON(link)));
    }
};
// src/api/resources/ExternalAccount.ts
var ExternalAccount = class _ExternalAccount {
    constructor(id, provider, identificationId, externalId, approvedScopes, emailAddress, firstName, lastName, imageUrl, username, phoneNumber, publicMetadata = {}, label, verification){
        this.id = id;
        this.provider = provider;
        this.identificationId = identificationId;
        this.externalId = externalId;
        this.approvedScopes = approvedScopes;
        this.emailAddress = emailAddress;
        this.firstName = firstName;
        this.lastName = lastName;
        this.imageUrl = imageUrl;
        this.username = username;
        this.phoneNumber = phoneNumber;
        this.publicMetadata = publicMetadata;
        this.label = label;
        this.verification = verification;
    }
    static fromJSON(data) {
        return new _ExternalAccount(data.id, data.provider, data.identification_id, data.provider_user_id, data.approved_scopes, data.email_address, data.first_name, data.last_name, data.image_url || "", data.username, data.phone_number, data.public_metadata, data.label, data.verification && Verification.fromJSON(data.verification));
    }
};
// src/api/resources/IdPOAuthAccessToken.ts
var IdPOAuthAccessToken = class _IdPOAuthAccessToken {
    constructor(id, clientId, type, subject, scopes, revoked, revocationReason, expired, expiration, createdAt, updatedAt){
        this.id = id;
        this.clientId = clientId;
        this.type = type;
        this.subject = subject;
        this.scopes = scopes;
        this.revoked = revoked;
        this.revocationReason = revocationReason;
        this.expired = expired;
        this.expiration = expiration;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }
    static fromJSON(data) {
        return new _IdPOAuthAccessToken(data.id, data.client_id, data.type, data.subject, data.scopes, data.revoked, data.revocation_reason, data.expired, data.expiration, data.created_at, data.updated_at);
    }
    /**
   * Creates an IdPOAuthAccessToken from a JWT payload.
   * Maps standard JWT claims and OAuth-specific fields to token properties.
   */ static fromJwtPayload(payload, clockSkewInMs = 5e3) {
        const oauthPayload = payload;
        return new _IdPOAuthAccessToken(oauthPayload.jti ?? "", oauthPayload.client_id ?? "", "oauth_token", payload.sub, oauthPayload.scp ?? oauthPayload.scope?.split(" ") ?? [], false, null, payload.exp * 1e3 <= Date.now() - clockSkewInMs, payload.exp, payload.iat, payload.iat);
    }
};
// src/api/resources/Instance.ts
var Instance = class _Instance {
    constructor(id, environmentType, allowedOrigins){
        this.id = id;
        this.environmentType = environmentType;
        this.allowedOrigins = allowedOrigins;
    }
    static fromJSON(data) {
        return new _Instance(data.id, data.environment_type, data.allowed_origins);
    }
};
// src/api/resources/InstanceRestrictions.ts
var InstanceRestrictions = class _InstanceRestrictions {
    constructor(allowlist, blocklist, blockEmailSubaddresses, blockDisposableEmailDomains, ignoreDotsForGmailAddresses){
        this.allowlist = allowlist;
        this.blocklist = blocklist;
        this.blockEmailSubaddresses = blockEmailSubaddresses;
        this.blockDisposableEmailDomains = blockDisposableEmailDomains;
        this.ignoreDotsForGmailAddresses = ignoreDotsForGmailAddresses;
    }
    static fromJSON(data) {
        return new _InstanceRestrictions(data.allowlist, data.blocklist, data.block_email_subaddresses, data.block_disposable_email_domains, data.ignore_dots_for_gmail_addresses);
    }
};
// src/api/resources/InstanceSettings.ts
var InstanceSettings = class _InstanceSettings {
    constructor(id, restrictedToAllowlist, fromEmailAddress, progressiveSignUp, enhancedEmailDeliverability){
        this.id = id;
        this.restrictedToAllowlist = restrictedToAllowlist;
        this.fromEmailAddress = fromEmailAddress;
        this.progressiveSignUp = progressiveSignUp;
        this.enhancedEmailDeliverability = enhancedEmailDeliverability;
    }
    static fromJSON(data) {
        return new _InstanceSettings(data.id, data.restricted_to_allowlist, data.from_email_address, data.progressive_sign_up, data.enhanced_email_deliverability);
    }
};
// src/api/resources/Invitation.ts
var Invitation = class _Invitation {
    constructor(id, emailAddress, publicMetadata, createdAt, updatedAt, status, url, revoked){
        this.id = id;
        this.emailAddress = emailAddress;
        this.publicMetadata = publicMetadata;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        this.status = status;
        this.url = url;
        this.revoked = revoked;
        this._raw = null;
    }
    get raw() {
        return this._raw;
    }
    static fromJSON(data) {
        const res = new _Invitation(data.id, data.email_address, data.public_metadata, data.created_at, data.updated_at, data.status, data.url, data.revoked);
        res._raw = data;
        return res;
    }
};
// src/api/resources/JSON.ts
var ObjectType = {
    AccountlessApplication: "accountless_application",
    ActorToken: "actor_token",
    AllowlistIdentifier: "allowlist_identifier",
    ApiKey: "api_key",
    BlocklistIdentifier: "blocklist_identifier",
    Client: "client",
    Cookies: "cookies",
    Domain: "domain",
    Email: "email",
    EmailAddress: "email_address",
    ExternalAccount: "external_account",
    FacebookAccount: "facebook_account",
    GoogleAccount: "google_account",
    Instance: "instance",
    InstanceRestrictions: "instance_restrictions",
    InstanceSettings: "instance_settings",
    Invitation: "invitation",
    Machine: "machine",
    MachineScope: "machine_scope",
    MachineSecretKey: "machine_secret_key",
    M2MToken: "machine_to_machine_token",
    JwtTemplate: "jwt_template",
    OauthAccessToken: "oauth_access_token",
    IdpOAuthAccessToken: "clerk_idp_oauth_access_token",
    OAuthApplication: "oauth_application",
    Organization: "organization",
    OrganizationDomain: "organization_domain",
    OrganizationInvitation: "organization_invitation",
    OrganizationMembership: "organization_membership",
    OrganizationSettings: "organization_settings",
    PhoneNumber: "phone_number",
    ProxyCheck: "proxy_check",
    RedirectUrl: "redirect_url",
    SamlAccount: "saml_account",
    SamlConnection: "saml_connection",
    Session: "session",
    SignInAttempt: "sign_in_attempt",
    SignInToken: "sign_in_token",
    SignUpAttempt: "sign_up_attempt",
    SmsMessage: "sms_message",
    User: "user",
    WaitlistEntry: "waitlist_entry",
    Web3Wallet: "web3_wallet",
    Token: "token",
    TotalCount: "total_count",
    TestingToken: "testing_token",
    Role: "role",
    Permission: "permission",
    BillingPayer: "commerce_payer",
    BillingPaymentAttempt: "commerce_payment_attempt",
    BillingSubscription: "commerce_subscription",
    BillingSubscriptionItem: "commerce_subscription_item",
    BillingPlan: "commerce_plan",
    Feature: "feature"
};
// src/api/resources/Machine.ts
var Machine = class _Machine {
    constructor(id, name, instanceId, createdAt, updatedAt, scopedMachines, defaultTokenTtl, secretKey){
        this.id = id;
        this.name = name;
        this.instanceId = instanceId;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        this.scopedMachines = scopedMachines;
        this.defaultTokenTtl = defaultTokenTtl;
        this.secretKey = secretKey;
    }
    static fromJSON(data) {
        return new _Machine(data.id, data.name, data.instance_id, data.created_at, data.updated_at, data.scoped_machines.map((m)=>new _Machine(m.id, m.name, m.instance_id, m.created_at, m.updated_at, [], // Nested machines don't have scoped_machines
            m.default_token_ttl)), data.default_token_ttl, data.secret_key);
    }
};
// src/api/resources/MachineScope.ts
var MachineScope = class _MachineScope {
    constructor(fromMachineId, toMachineId, createdAt, deleted){
        this.fromMachineId = fromMachineId;
        this.toMachineId = toMachineId;
        this.createdAt = createdAt;
        this.deleted = deleted;
    }
    static fromJSON(data) {
        return new _MachineScope(data.from_machine_id, data.to_machine_id, data.created_at, data.deleted);
    }
};
// src/api/resources/MachineSecretKey.ts
var MachineSecretKey = class _MachineSecretKey {
    constructor(secret){
        this.secret = secret;
    }
    static fromJSON(data) {
        return new _MachineSecretKey(data.secret);
    }
};
// src/api/resources/M2MToken.ts
var M2MToken = class _M2MToken {
    constructor(id, subject, scopes, claims, revoked, revocationReason, expired, expiration, createdAt, updatedAt, token){
        this.id = id;
        this.subject = subject;
        this.scopes = scopes;
        this.claims = claims;
        this.revoked = revoked;
        this.revocationReason = revocationReason;
        this.expired = expired;
        this.expiration = expiration;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        this.token = token;
    }
    static fromJSON(data) {
        return new _M2MToken(data.id, data.subject, data.scopes, data.claims, data.revoked, data.revocation_reason, data.expired, data.expiration, data.created_at, data.updated_at, data.token);
    }
};
// src/api/resources/JwtTemplate.ts
var JwtTemplate = class _JwtTemplate {
    constructor(id, name, claims, lifetime, allowedClockSkew, customSigningKey, signingAlgorithm, createdAt, updatedAt){
        this.id = id;
        this.name = name;
        this.claims = claims;
        this.lifetime = lifetime;
        this.allowedClockSkew = allowedClockSkew;
        this.customSigningKey = customSigningKey;
        this.signingAlgorithm = signingAlgorithm;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }
    static fromJSON(data) {
        return new _JwtTemplate(data.id, data.name, data.claims, data.lifetime, data.allowed_clock_skew, data.custom_signing_key, data.signing_algorithm, data.created_at, data.updated_at);
    }
};
// src/api/resources/OauthAccessToken.ts
var OauthAccessToken = class _OauthAccessToken {
    constructor(externalAccountId, provider, token, publicMetadata = {}, label, scopes, tokenSecret, expiresAt){
        this.externalAccountId = externalAccountId;
        this.provider = provider;
        this.token = token;
        this.publicMetadata = publicMetadata;
        this.label = label;
        this.scopes = scopes;
        this.tokenSecret = tokenSecret;
        this.expiresAt = expiresAt;
    }
    static fromJSON(data) {
        return new _OauthAccessToken(data.external_account_id, data.provider, data.token, data.public_metadata, data.label || "", data.scopes, data.token_secret, data.expires_at);
    }
};
// src/api/resources/OAuthApplication.ts
var OAuthApplication = class _OAuthApplication {
    constructor(id, instanceId, name, clientId, clientUri, clientImageUrl, dynamicallyRegistered, consentScreenEnabled, pkceRequired, isPublic, scopes, redirectUris, authorizeUrl, tokenFetchUrl, userInfoUrl, discoveryUrl, tokenIntrospectionUrl, createdAt, updatedAt, clientSecret){
        this.id = id;
        this.instanceId = instanceId;
        this.name = name;
        this.clientId = clientId;
        this.clientUri = clientUri;
        this.clientImageUrl = clientImageUrl;
        this.dynamicallyRegistered = dynamicallyRegistered;
        this.consentScreenEnabled = consentScreenEnabled;
        this.pkceRequired = pkceRequired;
        this.isPublic = isPublic;
        this.scopes = scopes;
        this.redirectUris = redirectUris;
        this.authorizeUrl = authorizeUrl;
        this.tokenFetchUrl = tokenFetchUrl;
        this.userInfoUrl = userInfoUrl;
        this.discoveryUrl = discoveryUrl;
        this.tokenIntrospectionUrl = tokenIntrospectionUrl;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        this.clientSecret = clientSecret;
    }
    static fromJSON(data) {
        return new _OAuthApplication(data.id, data.instance_id, data.name, data.client_id, data.client_uri, data.client_image_url, data.dynamically_registered, data.consent_screen_enabled, data.pkce_required, data.public, data.scopes, data.redirect_uris, data.authorize_url, data.token_fetch_url, data.user_info_url, data.discovery_url, data.token_introspection_url, data.created_at, data.updated_at, data.client_secret);
    }
};
// src/api/resources/Organization.ts
var Organization = class _Organization {
    constructor(id, name, slug, imageUrl, hasImage, createdAt, updatedAt, publicMetadata = {}, privateMetadata = {}, maxAllowedMemberships, adminDeleteEnabled, membersCount, createdBy){
        this.id = id;
        this.name = name;
        this.slug = slug;
        this.imageUrl = imageUrl;
        this.hasImage = hasImage;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        this.publicMetadata = publicMetadata;
        this.privateMetadata = privateMetadata;
        this.maxAllowedMemberships = maxAllowedMemberships;
        this.adminDeleteEnabled = adminDeleteEnabled;
        this.membersCount = membersCount;
        this.createdBy = createdBy;
        this._raw = null;
    }
    get raw() {
        return this._raw;
    }
    static fromJSON(data) {
        const res = new _Organization(data.id, data.name, data.slug, data.image_url || "", data.has_image, data.created_at, data.updated_at, data.public_metadata, data.private_metadata, data.max_allowed_memberships, data.admin_delete_enabled, data.members_count, data.created_by);
        res._raw = data;
        return res;
    }
};
// src/api/resources/OrganizationInvitation.ts
var OrganizationInvitation = class _OrganizationInvitation {
    constructor(id, emailAddress, role, roleName, organizationId, createdAt, updatedAt, expiresAt, url, status, publicMetadata = {}, privateMetadata = {}, publicOrganizationData){
        this.id = id;
        this.emailAddress = emailAddress;
        this.role = role;
        this.roleName = roleName;
        this.organizationId = organizationId;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        this.expiresAt = expiresAt;
        this.url = url;
        this.status = status;
        this.publicMetadata = publicMetadata;
        this.privateMetadata = privateMetadata;
        this.publicOrganizationData = publicOrganizationData;
        this._raw = null;
    }
    get raw() {
        return this._raw;
    }
    static fromJSON(data) {
        const res = new _OrganizationInvitation(data.id, data.email_address, data.role, data.role_name, data.organization_id, data.created_at, data.updated_at, data.expires_at, data.url, data.status, data.public_metadata, data.private_metadata, data.public_organization_data);
        res._raw = data;
        return res;
    }
};
// src/api/resources/OrganizationMembership.ts
var OrganizationMembership = class _OrganizationMembership {
    constructor(id, role, permissions, publicMetadata = {}, privateMetadata = {}, createdAt, updatedAt, organization, publicUserData){
        this.id = id;
        this.role = role;
        this.permissions = permissions;
        this.publicMetadata = publicMetadata;
        this.privateMetadata = privateMetadata;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        this.organization = organization;
        this.publicUserData = publicUserData;
        this._raw = null;
    }
    get raw() {
        return this._raw;
    }
    static fromJSON(data) {
        const res = new _OrganizationMembership(data.id, data.role, data.permissions, data.public_metadata, data.private_metadata, data.created_at, data.updated_at, Organization.fromJSON(data.organization), OrganizationMembershipPublicUserData.fromJSON(data.public_user_data));
        res._raw = data;
        return res;
    }
};
var OrganizationMembershipPublicUserData = class _OrganizationMembershipPublicUserData {
    constructor(identifier, firstName, lastName, imageUrl, hasImage, userId){
        this.identifier = identifier;
        this.firstName = firstName;
        this.lastName = lastName;
        this.imageUrl = imageUrl;
        this.hasImage = hasImage;
        this.userId = userId;
    }
    static fromJSON(data) {
        return new _OrganizationMembershipPublicUserData(data.identifier, data.first_name, data.last_name, data.image_url, data.has_image, data.user_id);
    }
};
// src/api/resources/OrganizationSettings.ts
var OrganizationSettings = class _OrganizationSettings {
    constructor(enabled, maxAllowedMemberships, maxAllowedRoles, maxAllowedPermissions, creatorRole, adminDeleteEnabled, domainsEnabled, slugDisabled, domainsEnrollmentModes, domainsDefaultRole){
        this.enabled = enabled;
        this.maxAllowedMemberships = maxAllowedMemberships;
        this.maxAllowedRoles = maxAllowedRoles;
        this.maxAllowedPermissions = maxAllowedPermissions;
        this.creatorRole = creatorRole;
        this.adminDeleteEnabled = adminDeleteEnabled;
        this.domainsEnabled = domainsEnabled;
        this.slugDisabled = slugDisabled;
        this.domainsEnrollmentModes = domainsEnrollmentModes;
        this.domainsDefaultRole = domainsDefaultRole;
    }
    static fromJSON(data) {
        return new _OrganizationSettings(data.enabled, data.max_allowed_memberships, data.max_allowed_roles, data.max_allowed_permissions, data.creator_role, data.admin_delete_enabled, data.domains_enabled, data.slug_disabled, data.domains_enrollment_modes, data.domains_default_role);
    }
};
// src/api/resources/PhoneNumber.ts
var PhoneNumber = class _PhoneNumber {
    constructor(id, phoneNumber, reservedForSecondFactor, defaultSecondFactor, verification, linkedTo){
        this.id = id;
        this.phoneNumber = phoneNumber;
        this.reservedForSecondFactor = reservedForSecondFactor;
        this.defaultSecondFactor = defaultSecondFactor;
        this.verification = verification;
        this.linkedTo = linkedTo;
    }
    static fromJSON(data) {
        return new _PhoneNumber(data.id, data.phone_number, data.reserved_for_second_factor, data.default_second_factor, data.verification && Verification.fromJSON(data.verification), data.linked_to.map((link)=>IdentificationLink.fromJSON(link)));
    }
};
// src/api/resources/ProxyCheck.ts
var ProxyCheck = class _ProxyCheck {
    constructor(id, domainId, lastRunAt, proxyUrl, successful, createdAt, updatedAt){
        this.id = id;
        this.domainId = domainId;
        this.lastRunAt = lastRunAt;
        this.proxyUrl = proxyUrl;
        this.successful = successful;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }
    static fromJSON(data) {
        return new _ProxyCheck(data.id, data.domain_id, data.last_run_at, data.proxy_url, data.successful, data.created_at, data.updated_at);
    }
};
// src/api/resources/RedirectUrl.ts
var RedirectUrl = class _RedirectUrl {
    constructor(id, url, createdAt, updatedAt){
        this.id = id;
        this.url = url;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }
    static fromJSON(data) {
        return new _RedirectUrl(data.id, data.url, data.created_at, data.updated_at);
    }
};
// src/api/resources/SamlConnection.ts
var SamlConnection = class _SamlConnection {
    constructor(id, name, domain, organizationId, idpEntityId, idpSsoUrl, idpCertificate, idpMetadataUrl, idpMetadata, acsUrl, spEntityId, spMetadataUrl, active, provider, userCount, syncUserAttributes, allowSubdomains, allowIdpInitiated, createdAt, updatedAt, attributeMapping){
        this.id = id;
        this.name = name;
        this.domain = domain;
        this.organizationId = organizationId;
        this.idpEntityId = idpEntityId;
        this.idpSsoUrl = idpSsoUrl;
        this.idpCertificate = idpCertificate;
        this.idpMetadataUrl = idpMetadataUrl;
        this.idpMetadata = idpMetadata;
        this.acsUrl = acsUrl;
        this.spEntityId = spEntityId;
        this.spMetadataUrl = spMetadataUrl;
        this.active = active;
        this.provider = provider;
        this.userCount = userCount;
        this.syncUserAttributes = syncUserAttributes;
        this.allowSubdomains = allowSubdomains;
        this.allowIdpInitiated = allowIdpInitiated;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        this.attributeMapping = attributeMapping;
    }
    static fromJSON(data) {
        return new _SamlConnection(data.id, data.name, data.domain, data.organization_id, data.idp_entity_id, data.idp_sso_url, data.idp_certificate, data.idp_metadata_url, data.idp_metadata, data.acs_url, data.sp_entity_id, data.sp_metadata_url, data.active, data.provider, data.user_count, data.sync_user_attributes, data.allow_subdomains, data.allow_idp_initiated, data.created_at, data.updated_at, data.attribute_mapping && AttributeMapping.fromJSON(data.attribute_mapping));
    }
};
var SamlAccountConnection = class _SamlAccountConnection {
    constructor(id, name, domain, active, provider, syncUserAttributes, allowSubdomains, allowIdpInitiated, createdAt, updatedAt){
        this.id = id;
        this.name = name;
        this.domain = domain;
        this.active = active;
        this.provider = provider;
        this.syncUserAttributes = syncUserAttributes;
        this.allowSubdomains = allowSubdomains;
        this.allowIdpInitiated = allowIdpInitiated;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }
    static fromJSON(data) {
        return new _SamlAccountConnection(data.id, data.name, data.domain, data.active, data.provider, data.sync_user_attributes, data.allow_subdomains, data.allow_idp_initiated, data.created_at, data.updated_at);
    }
};
var AttributeMapping = class _AttributeMapping {
    constructor(userId, emailAddress, firstName, lastName){
        this.userId = userId;
        this.emailAddress = emailAddress;
        this.firstName = firstName;
        this.lastName = lastName;
    }
    static fromJSON(data) {
        return new _AttributeMapping(data.user_id, data.email_address, data.first_name, data.last_name);
    }
};
// src/api/resources/SamlAccount.ts
var SamlAccount = class _SamlAccount {
    constructor(id, provider, providerUserId, active, emailAddress, firstName, lastName, verification, samlConnection, lastAuthenticatedAt, enterpriseConnectionId){
        this.id = id;
        this.provider = provider;
        this.providerUserId = providerUserId;
        this.active = active;
        this.emailAddress = emailAddress;
        this.firstName = firstName;
        this.lastName = lastName;
        this.verification = verification;
        this.samlConnection = samlConnection;
        this.lastAuthenticatedAt = lastAuthenticatedAt;
        this.enterpriseConnectionId = enterpriseConnectionId;
    }
    static fromJSON(data) {
        return new _SamlAccount(data.id, data.provider, data.provider_user_id, data.active, data.email_address, data.first_name, data.last_name, data.verification && Verification.fromJSON(data.verification), data.saml_connection && SamlAccountConnection.fromJSON(data.saml_connection), data.last_authenticated_at ?? null, data.enterprise_connection_id);
    }
};
// src/api/resources/SignInTokens.ts
var SignInToken = class _SignInToken {
    constructor(id, userId, token, status, url, createdAt, updatedAt){
        this.id = id;
        this.userId = userId;
        this.token = token;
        this.status = status;
        this.url = url;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }
    static fromJSON(data) {
        return new _SignInToken(data.id, data.user_id, data.token, data.status, data.url, data.created_at, data.updated_at);
    }
};
// src/api/resources/SignUpAttempt.ts
var SignUpAttemptVerification = class _SignUpAttemptVerification {
    constructor(nextAction, supportedStrategies){
        this.nextAction = nextAction;
        this.supportedStrategies = supportedStrategies;
    }
    static fromJSON(data) {
        return new _SignUpAttemptVerification(data.next_action, data.supported_strategies);
    }
};
var SignUpAttemptVerifications = class _SignUpAttemptVerifications {
    constructor(emailAddress, phoneNumber, web3Wallet, externalAccount){
        this.emailAddress = emailAddress;
        this.phoneNumber = phoneNumber;
        this.web3Wallet = web3Wallet;
        this.externalAccount = externalAccount;
    }
    static fromJSON(data) {
        return new _SignUpAttemptVerifications(data.email_address && SignUpAttemptVerification.fromJSON(data.email_address), data.phone_number && SignUpAttemptVerification.fromJSON(data.phone_number), data.web3_wallet && SignUpAttemptVerification.fromJSON(data.web3_wallet), data.external_account);
    }
};
var SignUpAttempt = class _SignUpAttempt {
    constructor(id, status, requiredFields, optionalFields, missingFields, unverifiedFields, verifications, username, emailAddress, phoneNumber, web3Wallet, passwordEnabled, firstName, lastName, customAction, externalId, createdSessionId, createdUserId, abandonAt, legalAcceptedAt, publicMetadata, unsafeMetadata){
        this.id = id;
        this.status = status;
        this.requiredFields = requiredFields;
        this.optionalFields = optionalFields;
        this.missingFields = missingFields;
        this.unverifiedFields = unverifiedFields;
        this.verifications = verifications;
        this.username = username;
        this.emailAddress = emailAddress;
        this.phoneNumber = phoneNumber;
        this.web3Wallet = web3Wallet;
        this.passwordEnabled = passwordEnabled;
        this.firstName = firstName;
        this.lastName = lastName;
        this.customAction = customAction;
        this.externalId = externalId;
        this.createdSessionId = createdSessionId;
        this.createdUserId = createdUserId;
        this.abandonAt = abandonAt;
        this.legalAcceptedAt = legalAcceptedAt;
        this.publicMetadata = publicMetadata;
        this.unsafeMetadata = unsafeMetadata;
    }
    static fromJSON(data) {
        return new _SignUpAttempt(data.id, data.status, data.required_fields, data.optional_fields, data.missing_fields, data.unverified_fields, data.verifications ? SignUpAttemptVerifications.fromJSON(data.verifications) : null, data.username, data.email_address, data.phone_number, data.web3_wallet, data.password_enabled, data.first_name, data.last_name, data.custom_action, data.external_id, data.created_session_id, data.created_user_id, data.abandon_at, data.legal_accepted_at, data.public_metadata, data.unsafe_metadata);
    }
};
// src/api/resources/SMSMessage.ts
var SMSMessage = class _SMSMessage {
    constructor(id, fromPhoneNumber, toPhoneNumber, message, status, phoneNumberId, data){
        this.id = id;
        this.fromPhoneNumber = fromPhoneNumber;
        this.toPhoneNumber = toPhoneNumber;
        this.message = message;
        this.status = status;
        this.phoneNumberId = phoneNumberId;
        this.data = data;
    }
    static fromJSON(data) {
        return new _SMSMessage(data.id, data.from_phone_number, data.to_phone_number, data.message, data.status, data.phone_number_id, data.data);
    }
};
// src/api/resources/Token.ts
var Token = class _Token {
    constructor(jwt){
        this.jwt = jwt;
    }
    static fromJSON(data) {
        return new _Token(data.jwt);
    }
};
// src/api/resources/Web3Wallet.ts
var Web3Wallet = class _Web3Wallet {
    constructor(id, web3Wallet, verification){
        this.id = id;
        this.web3Wallet = web3Wallet;
        this.verification = verification;
    }
    static fromJSON(data) {
        return new _Web3Wallet(data.id, data.web3_wallet, data.verification && Verification.fromJSON(data.verification));
    }
};
// src/api/resources/User.ts
var User = class _User {
    constructor(id, passwordEnabled, totpEnabled, backupCodeEnabled, twoFactorEnabled, banned, locked, createdAt, updatedAt, imageUrl, hasImage, primaryEmailAddressId, primaryPhoneNumberId, primaryWeb3WalletId, lastSignInAt, externalId, username, firstName, lastName, publicMetadata = {}, privateMetadata = {}, unsafeMetadata = {}, emailAddresses = [], phoneNumbers = [], web3Wallets = [], externalAccounts = [], samlAccounts = [], lastActiveAt, createOrganizationEnabled, createOrganizationsLimit = null, deleteSelfEnabled, legalAcceptedAt, locale){
        this.id = id;
        this.passwordEnabled = passwordEnabled;
        this.totpEnabled = totpEnabled;
        this.backupCodeEnabled = backupCodeEnabled;
        this.twoFactorEnabled = twoFactorEnabled;
        this.banned = banned;
        this.locked = locked;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        this.imageUrl = imageUrl;
        this.hasImage = hasImage;
        this.primaryEmailAddressId = primaryEmailAddressId;
        this.primaryPhoneNumberId = primaryPhoneNumberId;
        this.primaryWeb3WalletId = primaryWeb3WalletId;
        this.lastSignInAt = lastSignInAt;
        this.externalId = externalId;
        this.username = username;
        this.firstName = firstName;
        this.lastName = lastName;
        this.publicMetadata = publicMetadata;
        this.privateMetadata = privateMetadata;
        this.unsafeMetadata = unsafeMetadata;
        this.emailAddresses = emailAddresses;
        this.phoneNumbers = phoneNumbers;
        this.web3Wallets = web3Wallets;
        this.externalAccounts = externalAccounts;
        this.samlAccounts = samlAccounts;
        this.lastActiveAt = lastActiveAt;
        this.createOrganizationEnabled = createOrganizationEnabled;
        this.createOrganizationsLimit = createOrganizationsLimit;
        this.deleteSelfEnabled = deleteSelfEnabled;
        this.legalAcceptedAt = legalAcceptedAt;
        this.locale = locale;
        this._raw = null;
    }
    get raw() {
        return this._raw;
    }
    static fromJSON(data) {
        const res = new _User(data.id, data.password_enabled, data.totp_enabled, data.backup_code_enabled, data.two_factor_enabled, data.banned, data.locked, data.created_at, data.updated_at, data.image_url, data.has_image, data.primary_email_address_id, data.primary_phone_number_id, data.primary_web3_wallet_id, data.last_sign_in_at, data.external_id, data.username, data.first_name, data.last_name, data.public_metadata, data.private_metadata, data.unsafe_metadata, (data.email_addresses || []).map((x)=>EmailAddress.fromJSON(x)), (data.phone_numbers || []).map((x)=>PhoneNumber.fromJSON(x)), (data.web3_wallets || []).map((x)=>Web3Wallet.fromJSON(x)), (data.external_accounts || []).map((x)=>ExternalAccount.fromJSON(x)), (data.saml_accounts || []).map((x)=>SamlAccount.fromJSON(x)), data.last_active_at, data.create_organization_enabled, data.create_organizations_limit, data.delete_self_enabled, data.legal_accepted_at, data.locale);
        res._raw = data;
        return res;
    }
    /**
   * The primary email address of the user.
   */ get primaryEmailAddress() {
        return this.emailAddresses.find(({ id })=>id === this.primaryEmailAddressId) ?? null;
    }
    /**
   * The primary phone number of the user.
   */ get primaryPhoneNumber() {
        return this.phoneNumbers.find(({ id })=>id === this.primaryPhoneNumberId) ?? null;
    }
    /**
   * The primary web3 wallet of the user.
   */ get primaryWeb3Wallet() {
        return this.web3Wallets.find(({ id })=>id === this.primaryWeb3WalletId) ?? null;
    }
    /**
   * The full name of the user.
   */ get fullName() {
        return [
            this.firstName,
            this.lastName
        ].join(" ").trim() || null;
    }
};
// src/api/resources/WaitlistEntry.ts
var WaitlistEntry = class _WaitlistEntry {
    constructor(id, emailAddress, status, invitation, createdAt, updatedAt, isLocked){
        this.id = id;
        this.emailAddress = emailAddress;
        this.status = status;
        this.invitation = invitation;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        this.isLocked = isLocked;
    }
    static fromJSON(data) {
        return new _WaitlistEntry(data.id, data.email_address, data.status, data.invitation && Invitation.fromJSON(data.invitation), data.created_at, data.updated_at, data.is_locked);
    }
};
// src/api/resources/Feature.ts
var Feature = class _Feature {
    constructor(id, name, description, slug, avatarUrl){
        this.id = id;
        this.name = name;
        this.description = description;
        this.slug = slug;
        this.avatarUrl = avatarUrl;
    }
    static fromJSON(data) {
        return new _Feature(data.id, data.name, data.description ?? null, data.slug, data.avatar_url ?? null);
    }
};
// src/api/resources/CommercePlan.ts
var BillingPlan = class _BillingPlan {
    constructor(id, name, slug, description, isDefault, isRecurring, hasBaseFee, publiclyVisible, fee, annualFee, annualMonthlyFee, forPayerType, features){
        this.id = id;
        this.name = name;
        this.slug = slug;
        this.description = description;
        this.isDefault = isDefault;
        this.isRecurring = isRecurring;
        this.hasBaseFee = hasBaseFee;
        this.publiclyVisible = publiclyVisible;
        this.fee = fee;
        this.annualFee = annualFee;
        this.annualMonthlyFee = annualMonthlyFee;
        this.forPayerType = forPayerType;
        this.features = features;
    }
    static fromJSON(data) {
        const formatAmountJSON = (fee)=>{
            return fee ? {
                amount: fee.amount,
                amountFormatted: fee.amount_formatted,
                currency: fee.currency,
                currencySymbol: fee.currency_symbol
            } : null;
        };
        return new _BillingPlan(data.id, data.name, data.slug, data.description ?? null, data.is_default, data.is_recurring, data.has_base_fee, data.publicly_visible, formatAmountJSON(data.fee), formatAmountJSON(data.annual_fee), formatAmountJSON(data.annual_monthly_fee), data.for_payer_type, (data.features ?? []).map((feature)=>Feature.fromJSON(feature)));
    }
};
// src/api/resources/CommerceSubscriptionItem.ts
var BillingSubscriptionItem = class _BillingSubscriptionItem {
    constructor(id, status, planPeriod, periodStart, nextPayment, amount, plan, planId, createdAt, updatedAt, periodEnd, canceledAt, pastDueAt, endedAt, payerId, isFreeTrial, lifetimePaid){
        this.id = id;
        this.status = status;
        this.planPeriod = planPeriod;
        this.periodStart = periodStart;
        this.nextPayment = nextPayment;
        this.amount = amount;
        this.plan = plan;
        this.planId = planId;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        this.periodEnd = periodEnd;
        this.canceledAt = canceledAt;
        this.pastDueAt = pastDueAt;
        this.endedAt = endedAt;
        this.payerId = payerId;
        this.isFreeTrial = isFreeTrial;
        this.lifetimePaid = lifetimePaid;
    }
    static fromJSON(data) {
        function formatAmountJSON(amount) {
            if (!amount) {
                return amount;
            }
            return {
                amount: amount.amount,
                amountFormatted: amount.amount_formatted,
                currency: amount.currency,
                currencySymbol: amount.currency_symbol
            };
        }
        return new _BillingSubscriptionItem(data.id, data.status, data.plan_period, data.period_start, data.next_payment, formatAmountJSON(data.amount) ?? void 0, data.plan ? BillingPlan.fromJSON(data.plan) : null, data.plan_id ?? null, data.created_at, data.updated_at, data.period_end, data.canceled_at, data.past_due_at, data.ended_at, data.payer_id, data.is_free_trial, formatAmountJSON(data.lifetime_paid) ?? void 0);
    }
};
// src/api/resources/CommerceSubscription.ts
var BillingSubscription = class _BillingSubscription {
    constructor(id, status, payerId, createdAt, updatedAt, activeAt, pastDueAt, subscriptionItems, nextPayment, eligibleForFreeTrial){
        this.id = id;
        this.status = status;
        this.payerId = payerId;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        this.activeAt = activeAt;
        this.pastDueAt = pastDueAt;
        this.subscriptionItems = subscriptionItems;
        this.nextPayment = nextPayment;
        this.eligibleForFreeTrial = eligibleForFreeTrial;
    }
    static fromJSON(data) {
        const nextPayment = data.next_payment ? {
            date: data.next_payment.date,
            amount: {
                amount: data.next_payment.amount.amount,
                amountFormatted: data.next_payment.amount.amount_formatted,
                currency: data.next_payment.amount.currency,
                currencySymbol: data.next_payment.amount.currency_symbol
            }
        } : null;
        return new _BillingSubscription(data.id, data.status, data.payer_id, data.created_at, data.updated_at, data.active_at ?? null, data.past_due_at ?? null, (data.subscription_items ?? []).map((item)=>BillingSubscriptionItem.fromJSON(item)), nextPayment, data.eligible_for_free_trial ?? false);
    }
};
// src/api/resources/Deserializer.ts
function deserialize(payload) {
    let data, totalCount;
    if (Array.isArray(payload)) {
        const data2 = payload.map((item)=>jsonToObject(item));
        return {
            data: data2
        };
    } else if (isPaginated(payload)) {
        data = payload.data.map((item)=>jsonToObject(item));
        totalCount = payload.total_count;
        return {
            data,
            totalCount
        };
    } else {
        return {
            data: jsonToObject(payload)
        };
    }
}
function isPaginated(payload) {
    if (!payload || typeof payload !== "object" || !("data" in payload)) {
        return false;
    }
    return Array.isArray(payload.data) && payload.data !== void 0;
}
function getCount(item) {
    return item.total_count;
}
function jsonToObject(item) {
    if (typeof item !== "string" && "object" in item && "deleted" in item) {
        return DeletedObject.fromJSON(item);
    }
    switch(item.object){
        case ObjectType.AccountlessApplication:
            return AccountlessApplication.fromJSON(item);
        case ObjectType.ActorToken:
            return ActorToken.fromJSON(item);
        case ObjectType.AllowlistIdentifier:
            return AllowlistIdentifier.fromJSON(item);
        case ObjectType.ApiKey:
            return APIKey.fromJSON(item);
        case ObjectType.BlocklistIdentifier:
            return BlocklistIdentifier.fromJSON(item);
        case ObjectType.Client:
            return Client.fromJSON(item);
        case ObjectType.Cookies:
            return Cookies2.fromJSON(item);
        case ObjectType.Domain:
            return Domain.fromJSON(item);
        case ObjectType.EmailAddress:
            return EmailAddress.fromJSON(item);
        case ObjectType.Email:
            return Email.fromJSON(item);
        case ObjectType.IdpOAuthAccessToken:
            return IdPOAuthAccessToken.fromJSON(item);
        case ObjectType.Instance:
            return Instance.fromJSON(item);
        case ObjectType.InstanceRestrictions:
            return InstanceRestrictions.fromJSON(item);
        case ObjectType.InstanceSettings:
            return InstanceSettings.fromJSON(item);
        case ObjectType.Invitation:
            return Invitation.fromJSON(item);
        case ObjectType.JwtTemplate:
            return JwtTemplate.fromJSON(item);
        case ObjectType.Machine:
            return Machine.fromJSON(item);
        case ObjectType.MachineScope:
            return MachineScope.fromJSON(item);
        case ObjectType.MachineSecretKey:
            return MachineSecretKey.fromJSON(item);
        case ObjectType.M2MToken:
            return M2MToken.fromJSON(item);
        case ObjectType.OauthAccessToken:
            return OauthAccessToken.fromJSON(item);
        case ObjectType.OAuthApplication:
            return OAuthApplication.fromJSON(item);
        case ObjectType.Organization:
            return Organization.fromJSON(item);
        case ObjectType.OrganizationInvitation:
            return OrganizationInvitation.fromJSON(item);
        case ObjectType.OrganizationMembership:
            return OrganizationMembership.fromJSON(item);
        case ObjectType.OrganizationSettings:
            return OrganizationSettings.fromJSON(item);
        case ObjectType.PhoneNumber:
            return PhoneNumber.fromJSON(item);
        case ObjectType.ProxyCheck:
            return ProxyCheck.fromJSON(item);
        case ObjectType.RedirectUrl:
            return RedirectUrl.fromJSON(item);
        case ObjectType.SamlConnection:
            return SamlConnection.fromJSON(item);
        case ObjectType.SignInToken:
            return SignInToken.fromJSON(item);
        case ObjectType.SignUpAttempt:
            return SignUpAttempt.fromJSON(item);
        case ObjectType.Session:
            return Session.fromJSON(item);
        case ObjectType.SmsMessage:
            return SMSMessage.fromJSON(item);
        case ObjectType.Token:
            return Token.fromJSON(item);
        case ObjectType.TotalCount:
            return getCount(item);
        case ObjectType.User:
            return User.fromJSON(item);
        case ObjectType.WaitlistEntry:
            return WaitlistEntry.fromJSON(item);
        case ObjectType.BillingPlan:
            return BillingPlan.fromJSON(item);
        case ObjectType.BillingSubscription:
            return BillingSubscription.fromJSON(item);
        case ObjectType.BillingSubscriptionItem:
            return BillingSubscriptionItem.fromJSON(item);
        case ObjectType.Feature:
            return Feature.fromJSON(item);
        default:
            return item;
    }
}
// src/api/request.ts
function buildRequest(options) {
    const requestFn = async (requestOptions)=>{
        const { secretKey, machineSecretKey, useMachineSecretKey = false, requireSecretKey = true, apiUrl = API_URL, apiVersion = API_VERSION, userAgent = USER_AGENT, skipApiVersionInUrl = false } = options;
        const { path, method, queryParams, headerParams, bodyParams, formData, options: opts } = requestOptions;
        const { deepSnakecaseBodyParamKeys = false } = opts || {};
        if (requireSecretKey) {
            assertValidSecretKey(secretKey);
        }
        const url = skipApiVersionInUrl ? joinPaths(apiUrl, path) : joinPaths(apiUrl, apiVersion, path);
        const finalUrl = new URL(url);
        if (queryParams) {
            const snakecasedQueryParams = snakecase_keys_default({
                ...queryParams
            });
            for (const [key, val] of Object.entries(snakecasedQueryParams)){
                if (val) {
                    [
                        val
                    ].flat().forEach((v)=>finalUrl.searchParams.append(key, v));
                }
            }
        }
        const headers = new Headers({
            "Clerk-API-Version": SUPPORTED_BAPI_VERSION,
            [constants.Headers.UserAgent]: userAgent,
            ...headerParams
        });
        const authorizationHeader = constants.Headers.Authorization;
        if (!headers.has(authorizationHeader)) {
            if (useMachineSecretKey && machineSecretKey) {
                headers.set(authorizationHeader, `Bearer ${machineSecretKey}`);
            } else if (secretKey) {
                headers.set(authorizationHeader, `Bearer ${secretKey}`);
            }
        }
        let res;
        try {
            if (formData) {
                res = await __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$7X3P2E3X$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["runtime"].fetch(finalUrl.href, {
                    method,
                    headers,
                    body: formData
                });
            } else {
                headers.set("Content-Type", "application/json");
                const buildBody = ()=>{
                    const hasBody = method !== "GET" && bodyParams && Object.keys(bodyParams).length > 0;
                    if (!hasBody) {
                        return null;
                    }
                    const formatKeys = (object)=>snakecase_keys_default(object, {
                            deep: deepSnakecaseBodyParamKeys
                        });
                    return {
                        body: JSON.stringify(Array.isArray(bodyParams) ? bodyParams.map(formatKeys) : formatKeys(bodyParams))
                    };
                };
                res = await __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$7X3P2E3X$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["runtime"].fetch(finalUrl.href, {
                    method,
                    headers,
                    ...buildBody()
                });
            }
            const isJSONResponse = res?.headers && res.headers?.get(constants.Headers.ContentType) === constants.ContentTypes.Json;
            const responseBody = await (isJSONResponse ? res.json() : res.text());
            if (!res.ok) {
                return {
                    data: null,
                    errors: parseErrors(responseBody),
                    status: res?.status,
                    statusText: res?.statusText,
                    clerkTraceId: getTraceId(responseBody, res?.headers),
                    retryAfter: getRetryAfter(res?.headers)
                };
            }
            return {
                ...deserialize(responseBody),
                errors: null
            };
        } catch (err) {
            if (err instanceof Error) {
                return {
                    data: null,
                    errors: [
                        {
                            code: "unexpected_error",
                            message: err.message || "Unexpected error"
                        }
                    ],
                    clerkTraceId: getTraceId(err, res?.headers)
                };
            }
            return {
                data: null,
                errors: parseErrors(err),
                status: res?.status,
                statusText: res?.statusText,
                clerkTraceId: getTraceId(err, res?.headers),
                retryAfter: getRetryAfter(res?.headers)
            };
        }
    };
    return withLegacyRequestReturn(requestFn);
}
function getTraceId(data, headers) {
    if (data && typeof data === "object" && "clerk_trace_id" in data && typeof data.clerk_trace_id === "string") {
        return data.clerk_trace_id;
    }
    const cfRay = headers?.get("cf-ray");
    return cfRay || "";
}
function getRetryAfter(headers) {
    const retryAfter = headers?.get("Retry-After");
    if (!retryAfter) {
        return;
    }
    const value = parseInt(retryAfter, 10);
    if (isNaN(value)) {
        return;
    }
    return value;
}
function parseErrors(data) {
    if (!!data && typeof data === "object" && "errors" in data) {
        const errors = data.errors;
        return errors.length > 0 ? errors.map(__TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$error$2d$Dl9xmUf3$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["parseError"]) : [];
    }
    return [];
}
function withLegacyRequestReturn(cb) {
    return async (...args)=>{
        const { data, errors, totalCount, status, statusText, clerkTraceId, retryAfter } = await cb(...args);
        if (errors) {
            const error = new __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$error$2d$Dl9xmUf3$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["ClerkAPIResponseError"](statusText || "", {
                data: [],
                status,
                clerkTraceId,
                retryAfter
            });
            error.errors = errors;
            throw error;
        }
        if (typeof totalCount !== "undefined") {
            return {
                data,
                totalCount
            };
        }
        return data;
    };
}
// src/api/factory.ts
function createBackendApiClient(options) {
    const request = buildRequest(options);
    return {
        __experimental_accountlessApplications: new AccountlessApplicationAPI(buildRequest({
            ...options,
            requireSecretKey: false
        })),
        actorTokens: new ActorTokenAPI(request),
        allowlistIdentifiers: new AllowlistIdentifierAPI(request),
        apiKeys: new APIKeysAPI(buildRequest({
            ...options,
            skipApiVersionInUrl: true
        })),
        betaFeatures: new BetaFeaturesAPI(request),
        blocklistIdentifiers: new BlocklistIdentifierAPI(request),
        /**
     * @experimental This is an experimental API for the Billing feature that is available under a public beta, and the API is subject to change. It is advised to [pin](https://clerk.com/docs/pinning) the SDK version and the clerk-js version to avoid breaking changes.
     */ billing: new BillingAPI(request),
        clients: new ClientAPI(request),
        domains: new DomainAPI(request),
        emailAddresses: new EmailAddressAPI(request),
        idPOAuthAccessToken: new IdPOAuthAccessTokenApi(buildRequest({
            ...options,
            skipApiVersionInUrl: true
        })),
        instance: new InstanceAPI(request),
        invitations: new InvitationAPI(request),
        jwks: new JwksAPI(request),
        jwtTemplates: new JwtTemplatesApi(request),
        machines: new MachineApi(request),
        m2m: new M2MTokenApi(buildRequest({
            ...options,
            skipApiVersionInUrl: true,
            requireSecretKey: false,
            useMachineSecretKey: true
        })),
        oauthApplications: new OAuthApplicationsApi(request),
        organizations: new OrganizationAPI(request),
        phoneNumbers: new PhoneNumberAPI(request),
        proxyChecks: new ProxyCheckAPI(request),
        redirectUrls: new RedirectUrlAPI(request),
        samlConnections: new SamlConnectionAPI(request),
        sessions: new SessionAPI(request),
        signInTokens: new SignInTokenAPI(request),
        signUps: new SignUpAPI(request),
        testingTokens: new TestingTokenAPI(request),
        users: new UserAPI(request),
        waitlistEntries: new WaitlistEntryAPI(request),
        webhooks: new WebhookAPI(request)
    };
}
// src/tokens/machine.ts
var M2M_TOKEN_PREFIX = "mt_";
var OAUTH_TOKEN_PREFIX = "oat_";
var API_KEY_PREFIX = "ak_";
var MACHINE_TOKEN_PREFIXES = [
    M2M_TOKEN_PREFIX,
    OAUTH_TOKEN_PREFIX,
    API_KEY_PREFIX
];
var JwtFormatRegExp = /^[a-zA-Z0-9\-_]+\.[a-zA-Z0-9\-_]+\.[a-zA-Z0-9\-_]+$/;
function isJwtFormat(token) {
    return JwtFormatRegExp.test(token);
}
var OAUTH_ACCESS_TOKEN_TYPES = [
    "at+jwt",
    "application/at+jwt"
];
function isOAuthJwt(token) {
    if (!isJwtFormat(token)) {
        return false;
    }
    try {
        const { data, errors } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$7X3P2E3X$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["decodeJwt"])(token);
        return !errors && !!data && OAUTH_ACCESS_TOKEN_TYPES.includes(data.header.typ);
    } catch  {
        return false;
    }
}
function isMachineTokenByPrefix(token) {
    return MACHINE_TOKEN_PREFIXES.some((prefix)=>token.startsWith(prefix));
}
function isMachineToken(token) {
    return isMachineTokenByPrefix(token) || isOAuthJwt(token);
}
function getMachineTokenType(token) {
    if (token.startsWith(M2M_TOKEN_PREFIX)) {
        return TokenType.M2MToken;
    }
    if (token.startsWith(OAUTH_TOKEN_PREFIX) || isOAuthJwt(token)) {
        return TokenType.OAuthToken;
    }
    if (token.startsWith(API_KEY_PREFIX)) {
        return TokenType.ApiKey;
    }
    throw new Error("Unknown machine token type");
}
var isTokenTypeAccepted = (tokenType, acceptsToken)=>{
    if (!tokenType) {
        return false;
    }
    if (acceptsToken === "any") {
        return true;
    }
    const tokenTypes = Array.isArray(acceptsToken) ? acceptsToken : [
        acceptsToken
    ];
    return tokenTypes.includes(tokenType);
};
function isMachineTokenType(type) {
    return type === TokenType.ApiKey || type === TokenType.M2MToken || type === TokenType.OAuthToken;
}
// src/tokens/authObjects.ts
var createDebug = (data)=>{
    return ()=>{
        const res = {
            ...data
        };
        res.secretKey = (res.secretKey || "").substring(0, 7);
        res.jwtKey = (res.jwtKey || "").substring(0, 7);
        return {
            ...res
        };
    };
};
function signedInAuthObject(authenticateContext, sessionToken, sessionClaims) {
    const { actor, sessionId, sessionStatus, userId, orgId, orgRole, orgSlug, orgPermissions, factorVerificationAge } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$jwtPayloadParser$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["__experimental_JWTPayloadToAuthObjectProperties"])(sessionClaims);
    const apiClient = createBackendApiClient(authenticateContext);
    const getToken = createGetToken({
        sessionId,
        sessionToken,
        fetcher: async (sessionId2, template, expiresInSeconds)=>(await apiClient.sessions.getToken(sessionId2, template || "", expiresInSeconds)).jwt
    });
    return {
        tokenType: TokenType.SessionToken,
        actor,
        sessionClaims,
        sessionId,
        sessionStatus,
        userId,
        orgId,
        orgRole,
        orgSlug,
        orgPermissions,
        factorVerificationAge,
        getToken,
        has: (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$authorization$2d$D2ans7vW$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createCheckAuthorization"])({
            orgId,
            orgRole,
            orgPermissions,
            userId,
            factorVerificationAge,
            features: sessionClaims.fea || "",
            plans: sessionClaims.pla || ""
        }),
        debug: createDebug({
            ...authenticateContext,
            sessionToken
        }),
        isAuthenticated: true
    };
}
function signedOutAuthObject(debugData, initialSessionStatus) {
    return {
        tokenType: TokenType.SessionToken,
        sessionClaims: null,
        sessionId: null,
        sessionStatus: initialSessionStatus ?? null,
        userId: null,
        actor: null,
        orgId: null,
        orgRole: null,
        orgSlug: null,
        orgPermissions: null,
        factorVerificationAge: null,
        getToken: ()=>Promise.resolve(null),
        has: ()=>false,
        debug: createDebug(debugData),
        isAuthenticated: false
    };
}
function authenticatedMachineObject(tokenType, token, verificationResult, debugData) {
    const baseObject = {
        id: verificationResult.id,
        subject: verificationResult.subject,
        getToken: ()=>Promise.resolve(token),
        has: ()=>false,
        debug: createDebug(debugData),
        isAuthenticated: true
    };
    switch(tokenType){
        case TokenType.ApiKey:
            {
                const result = verificationResult;
                return {
                    ...baseObject,
                    tokenType,
                    name: result.name,
                    claims: result.claims,
                    scopes: result.scopes,
                    userId: result.subject.startsWith("user_") ? result.subject : null,
                    orgId: result.subject.startsWith("org_") ? result.subject : null
                };
            }
        case TokenType.M2MToken:
            {
                const result = verificationResult;
                return {
                    ...baseObject,
                    tokenType,
                    claims: result.claims,
                    scopes: result.scopes,
                    machineId: result.subject
                };
            }
        case TokenType.OAuthToken:
            {
                const result = verificationResult;
                return {
                    ...baseObject,
                    tokenType,
                    scopes: result.scopes,
                    userId: result.subject,
                    clientId: result.clientId
                };
            }
        default:
            throw new Error(`Invalid token type: ${tokenType}`);
    }
}
function unauthenticatedMachineObject(tokenType, debugData) {
    const baseObject = {
        id: null,
        subject: null,
        scopes: null,
        has: ()=>false,
        getToken: ()=>Promise.resolve(null),
        debug: createDebug(debugData),
        isAuthenticated: false
    };
    switch(tokenType){
        case TokenType.ApiKey:
            {
                return {
                    ...baseObject,
                    tokenType,
                    name: null,
                    claims: null,
                    scopes: null,
                    userId: null,
                    orgId: null
                };
            }
        case TokenType.M2MToken:
            {
                return {
                    ...baseObject,
                    tokenType,
                    claims: null,
                    scopes: null,
                    machineId: null
                };
            }
        case TokenType.OAuthToken:
            {
                return {
                    ...baseObject,
                    tokenType,
                    scopes: null,
                    userId: null,
                    clientId: null
                };
            }
        default:
            throw new Error(`Invalid token type: ${tokenType}`);
    }
}
function invalidTokenAuthObject() {
    return {
        isAuthenticated: false,
        tokenType: null,
        getToken: ()=>Promise.resolve(null),
        has: ()=>false,
        debug: ()=>({})
    };
}
var makeAuthObjectSerializable = (obj)=>{
    const { debug, getToken, has, ...rest } = obj;
    return rest;
};
var createGetToken = (params)=>{
    const { fetcher, sessionToken, sessionId } = params || {};
    return async (options = {})=>{
        if (!sessionId) {
            return null;
        }
        if (options.template || options.expiresInSeconds !== void 0) {
            return fetcher(sessionId, options.template, options.expiresInSeconds);
        }
        return sessionToken;
    };
};
var getAuthObjectFromJwt = (jwt, { treatPendingAsSignedOut = true, ...options })=>{
    const authObject = signedInAuthObject(options, jwt.raw.text, jwt.payload);
    if (treatPendingAsSignedOut && authObject.sessionStatus === "pending") {
        return signedOutAuthObject(options, authObject.sessionStatus);
    }
    return authObject;
};
var getAuthObjectForAcceptedToken = ({ authObject, acceptsToken = TokenType.SessionToken })=>{
    if (acceptsToken === "any") {
        return authObject;
    }
    if (Array.isArray(acceptsToken)) {
        if (!isTokenTypeAccepted(authObject.tokenType, acceptsToken)) {
            return invalidTokenAuthObject();
        }
        return authObject;
    }
    if (!isTokenTypeAccepted(authObject.tokenType, acceptsToken)) {
        if (isMachineTokenType(acceptsToken)) {
            return unauthenticatedMachineObject(acceptsToken, authObject.debug);
        }
        return signedOutAuthObject(authObject.debug);
    }
    return authObject;
};
// src/tokens/authStatus.ts
var AuthStatus = {
    SignedIn: "signed-in",
    SignedOut: "signed-out",
    Handshake: "handshake"
};
var AuthErrorReason = {
    ClientUATWithoutSessionToken: "client-uat-but-no-session-token",
    DevBrowserMissing: "dev-browser-missing",
    DevBrowserSync: "dev-browser-sync",
    PrimaryRespondsToSyncing: "primary-responds-to-syncing",
    PrimaryDomainCrossOriginSync: "primary-domain-cross-origin-sync",
    SatelliteCookieNeedsSyncing: "satellite-needs-syncing",
    SessionTokenAndUATMissing: "session-token-and-uat-missing",
    SessionTokenMissing: "session-token-missing",
    SessionTokenExpired: "session-token-expired",
    SessionTokenIATBeforeClientUAT: "session-token-iat-before-client-uat",
    SessionTokenNBF: "session-token-nbf",
    SessionTokenIatInTheFuture: "session-token-iat-in-the-future",
    SessionTokenWithoutClientUAT: "session-token-but-no-client-uat",
    ActiveOrganizationMismatch: "active-organization-mismatch",
    TokenTypeMismatch: "token-type-mismatch",
    UnexpectedError: "unexpected-error"
};
function signedIn(params) {
    const { authenticateContext, headers = new Headers(), token } = params;
    const toAuth = ({ treatPendingAsSignedOut = true } = {})=>{
        if (params.tokenType === TokenType.SessionToken) {
            const { sessionClaims } = params;
            const authObject = signedInAuthObject(authenticateContext, token, sessionClaims);
            if (treatPendingAsSignedOut && authObject.sessionStatus === "pending") {
                return signedOutAuthObject(void 0, authObject.sessionStatus);
            }
            return authObject;
        }
        const { machineData } = params;
        return authenticatedMachineObject(params.tokenType, token, machineData, authenticateContext);
    };
    return {
        status: AuthStatus.SignedIn,
        reason: null,
        message: null,
        proxyUrl: authenticateContext.proxyUrl || "",
        publishableKey: authenticateContext.publishableKey || "",
        isSatellite: authenticateContext.isSatellite || false,
        domain: authenticateContext.domain || "",
        signInUrl: authenticateContext.signInUrl || "",
        signUpUrl: authenticateContext.signUpUrl || "",
        afterSignInUrl: authenticateContext.afterSignInUrl || "",
        afterSignUpUrl: authenticateContext.afterSignUpUrl || "",
        isSignedIn: true,
        isAuthenticated: true,
        tokenType: params.tokenType,
        toAuth,
        headers,
        token
    };
}
function signedOut(params) {
    const { authenticateContext, headers = new Headers(), reason, message = "", tokenType } = params;
    const toAuth = ()=>{
        if (tokenType === TokenType.SessionToken) {
            return signedOutAuthObject({
                ...authenticateContext,
                status: AuthStatus.SignedOut,
                reason,
                message
            });
        }
        return unauthenticatedMachineObject(tokenType, {
            reason,
            message,
            headers
        });
    };
    return withDebugHeaders({
        status: AuthStatus.SignedOut,
        reason,
        message,
        proxyUrl: authenticateContext.proxyUrl || "",
        publishableKey: authenticateContext.publishableKey || "",
        isSatellite: authenticateContext.isSatellite || false,
        domain: authenticateContext.domain || "",
        signInUrl: authenticateContext.signInUrl || "",
        signUpUrl: authenticateContext.signUpUrl || "",
        afterSignInUrl: authenticateContext.afterSignInUrl || "",
        afterSignUpUrl: authenticateContext.afterSignUpUrl || "",
        isSignedIn: false,
        isAuthenticated: false,
        tokenType,
        toAuth,
        headers,
        token: null
    });
}
function handshake(authenticateContext, reason, message = "", headers) {
    return withDebugHeaders({
        status: AuthStatus.Handshake,
        reason,
        message,
        publishableKey: authenticateContext.publishableKey || "",
        isSatellite: authenticateContext.isSatellite || false,
        domain: authenticateContext.domain || "",
        proxyUrl: authenticateContext.proxyUrl || "",
        signInUrl: authenticateContext.signInUrl || "",
        signUpUrl: authenticateContext.signUpUrl || "",
        afterSignInUrl: authenticateContext.afterSignInUrl || "",
        afterSignUpUrl: authenticateContext.afterSignUpUrl || "",
        isSignedIn: false,
        isAuthenticated: false,
        tokenType: TokenType.SessionToken,
        toAuth: ()=>null,
        headers,
        token: null
    });
}
function signedOutInvalidToken() {
    const authObject = invalidTokenAuthObject();
    return withDebugHeaders({
        status: AuthStatus.SignedOut,
        reason: AuthErrorReason.TokenTypeMismatch,
        message: "",
        proxyUrl: "",
        publishableKey: "",
        isSatellite: false,
        domain: "",
        signInUrl: "",
        signUpUrl: "",
        afterSignInUrl: "",
        afterSignUpUrl: "",
        isSignedIn: false,
        isAuthenticated: false,
        tokenType: null,
        toAuth: ()=>authObject,
        headers: new Headers(),
        token: null
    });
}
var withDebugHeaders = (requestState)=>{
    const headers = new Headers(requestState.headers || {});
    if (requestState.message) {
        try {
            headers.set(constants.Headers.AuthMessage, requestState.message);
        } catch  {}
    }
    if (requestState.reason) {
        try {
            headers.set(constants.Headers.AuthReason, requestState.reason);
        } catch  {}
    }
    if (requestState.status) {
        try {
            headers.set(constants.Headers.AuthStatus, requestState.status);
        } catch  {}
    }
    requestState.headers = headers;
    return requestState;
};
;
// src/tokens/clerkUrl.ts
var ClerkUrl = class extends URL {
    isCrossOrigin(other) {
        return this.origin !== new URL(other.toString()).origin;
    }
};
var createClerkUrl = (...args)=>{
    return new ClerkUrl(...args);
};
// src/tokens/clerkRequest.ts
var ClerkRequest = class extends Request {
    constructor(input, init){
        const url = typeof input !== "string" && "url" in input ? input.url : String(input);
        super(url, init || typeof input === "string" ? void 0 : input);
        this.clerkUrl = this.deriveUrlFromHeaders(this);
        this.cookies = this.parseCookies(this);
    }
    toJSON() {
        return {
            url: this.clerkUrl.href,
            method: this.method,
            headers: JSON.stringify(Object.fromEntries(this.headers)),
            clerkUrl: this.clerkUrl.toString(),
            cookies: JSON.stringify(Object.fromEntries(this.cookies))
        };
    }
    /**
   * Used to fix request.url using the x-forwarded-* headers
   * TODO add detailed description of the issues this solves
   */ deriveUrlFromHeaders(req) {
        const initialUrl = new URL(req.url);
        const forwardedProto = req.headers.get(constants.Headers.ForwardedProto);
        const forwardedHost = req.headers.get(constants.Headers.ForwardedHost);
        const host = req.headers.get(constants.Headers.Host);
        const protocol = initialUrl.protocol;
        const resolvedHost = this.getFirstValueFromHeader(forwardedHost) ?? host;
        const resolvedProtocol = this.getFirstValueFromHeader(forwardedProto) ?? protocol?.replace(/[:/]/, "");
        const origin = resolvedHost && resolvedProtocol ? `${resolvedProtocol}://${resolvedHost}` : initialUrl.origin;
        if (origin === initialUrl.origin) {
            return createClerkUrl(initialUrl);
        }
        return createClerkUrl(initialUrl.pathname + initialUrl.search, origin);
    }
    getFirstValueFromHeader(value) {
        return value?.split(",")[0];
    }
    parseCookies(req) {
        const cookiesRecord = (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$cookie$40$1$2e$0$2e$2$2f$node_modules$2f$cookie$2f$dist$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["parse"])(this.decodeCookieValue(req.headers.get("cookie") || ""));
        return new Map(Object.entries(cookiesRecord));
    }
    decodeCookieValue(str) {
        return str ? str.replace(/(%[0-9A-Z]{2})+/g, decodeURIComponent) : str;
    }
};
var createClerkRequest = (...args)=>{
    const isClerkRequest = args[0] && typeof args[0] === "object" && "clerkUrl" in args[0] && "cookies" in args[0];
    return isClerkRequest ? args[0] : new ClerkRequest(...args);
};
// src/tokens/cookie.ts
var getCookieName = (cookieDirective)=>{
    return cookieDirective.split(";")[0]?.split("=")[0];
};
var getCookieValue = (cookieDirective)=>{
    return cookieDirective.split(";")[0]?.split("=")[1];
};
// src/tokens/keys.ts
var cache = {};
var lastUpdatedAt = 0;
function getFromCache(kid) {
    return cache[kid];
}
function getCacheValues() {
    return Object.values(cache);
}
function setInCache(cacheKey, jwk, shouldExpire = true) {
    cache[cacheKey] = jwk;
    lastUpdatedAt = shouldExpire ? Date.now() : -1;
}
var PEM_HEADER = "-----BEGIN PUBLIC KEY-----";
var PEM_TRAILER = "-----END PUBLIC KEY-----";
var RSA_PREFIX = "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA";
var RSA_SUFFIX = "IDAQAB";
function loadClerkJwkFromPem(params) {
    const { kid, pem } = params;
    const prefixedKid = `local-${kid}`;
    const cachedJwk = getFromCache(prefixedKid);
    if (cachedJwk) {
        return cachedJwk;
    }
    if (!pem) {
        throw new __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TCIXZLLW$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["TokenVerificationError"]({
            action: __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TCIXZLLW$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["TokenVerificationErrorAction"].SetClerkJWTKey,
            message: "Missing local JWK.",
            reason: __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TCIXZLLW$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["TokenVerificationErrorReason"].LocalJWKMissing
        });
    }
    const modulus = pem.replace(/\r\n|\n|\r/g, "").replace(PEM_HEADER, "").replace(PEM_TRAILER, "").replace(RSA_PREFIX, "").replace(RSA_SUFFIX, "").replace(/\+/g, "-").replace(/\//g, "_");
    const jwk = {
        kid: prefixedKid,
        kty: "RSA",
        alg: "RS256",
        n: modulus,
        e: "AQAB"
    };
    setInCache(prefixedKid, jwk, false);
    return jwk;
}
async function loadClerkJWKFromRemote(params) {
    const { secretKey, apiUrl = API_URL, apiVersion = API_VERSION, kid, skipJwksCache } = params;
    if (skipJwksCache || cacheHasExpired() || !getFromCache(kid)) {
        if (!secretKey) {
            throw new __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TCIXZLLW$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["TokenVerificationError"]({
                action: __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TCIXZLLW$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["TokenVerificationErrorAction"].ContactSupport,
                message: "Failed to load JWKS from Clerk Backend or Frontend API.",
                reason: __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TCIXZLLW$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["TokenVerificationErrorReason"].RemoteJWKFailedToLoad
            });
        }
        const fetcher = ()=>fetchJWKSFromBAPI(apiUrl, secretKey, apiVersion);
        const { keys } = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$retry$2d$DAlTROH9$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["retry"])(fetcher);
        if (!keys || !keys.length) {
            throw new __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TCIXZLLW$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["TokenVerificationError"]({
                action: __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TCIXZLLW$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["TokenVerificationErrorAction"].ContactSupport,
                message: "The JWKS endpoint did not contain any signing keys. Contact support@clerk.com.",
                reason: __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TCIXZLLW$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["TokenVerificationErrorReason"].RemoteJWKFailedToLoad
            });
        }
        keys.forEach((key)=>setInCache(key.kid, key));
    }
    const jwk = getFromCache(kid);
    if (!jwk) {
        const cacheValues = getCacheValues();
        const jwkKeys = cacheValues.map((jwk2)=>jwk2.kid).sort().join(", ");
        throw new __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TCIXZLLW$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["TokenVerificationError"]({
            action: `Go to your Dashboard and validate your secret and public keys are correct. ${__TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TCIXZLLW$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["TokenVerificationErrorAction"].ContactSupport} if the issue persists.`,
            message: `Unable to find a signing key in JWKS that matches the kid='${kid}' of the provided session token. Please make sure that the __session cookie or the HTTP authorization header contain a Clerk-generated session JWT. The following kid is available: ${jwkKeys}`,
            reason: __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TCIXZLLW$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["TokenVerificationErrorReason"].JWKKidMismatch
        });
    }
    return jwk;
}
async function fetchJWKSFromBAPI(apiUrl, key, apiVersion) {
    if (!key) {
        throw new __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TCIXZLLW$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["TokenVerificationError"]({
            action: __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TCIXZLLW$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["TokenVerificationErrorAction"].SetClerkSecretKey,
            message: "Missing Clerk Secret Key or API Key. Go to https://dashboard.clerk.com and get your key for your instance.",
            reason: __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TCIXZLLW$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["TokenVerificationErrorReason"].RemoteJWKFailedToLoad
        });
    }
    const url = new URL(apiUrl);
    url.pathname = joinPaths(url.pathname, apiVersion, "/jwks");
    const response = await __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$7X3P2E3X$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["runtime"].fetch(url.href, {
        headers: {
            Authorization: `Bearer ${key}`,
            "Clerk-API-Version": SUPPORTED_BAPI_VERSION,
            "Content-Type": "application/json",
            "User-Agent": USER_AGENT
        }
    });
    if (!response.ok) {
        const json = await response.json();
        const invalidSecretKeyError = getErrorObjectByCode(json?.errors, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TCIXZLLW$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["TokenVerificationErrorCode"].InvalidSecretKey);
        if (invalidSecretKeyError) {
            const reason = __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TCIXZLLW$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["TokenVerificationErrorReason"].InvalidSecretKey;
            throw new __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TCIXZLLW$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["TokenVerificationError"]({
                action: __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TCIXZLLW$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["TokenVerificationErrorAction"].ContactSupport,
                message: invalidSecretKeyError.message,
                reason
            });
        }
        throw new __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TCIXZLLW$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["TokenVerificationError"]({
            action: __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TCIXZLLW$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["TokenVerificationErrorAction"].ContactSupport,
            message: `Error loading Clerk JWKS from ${url.href} with code=${response.status}`,
            reason: __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TCIXZLLW$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["TokenVerificationErrorReason"].RemoteJWKFailedToLoad
        });
    }
    return response.json();
}
function cacheHasExpired() {
    if (lastUpdatedAt === -1) {
        return false;
    }
    const isExpired = Date.now() - lastUpdatedAt >= MAX_CACHE_LAST_UPDATED_AT_SECONDS * 1e3;
    if (isExpired) {
        cache = {};
    }
    return isExpired;
}
var getErrorObjectByCode = (errors, code)=>{
    if (!errors) {
        return null;
    }
    return errors.find((err)=>err.code === code);
};
;
async function verifyToken(token, options) {
    const { data: decodedResult, errors } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$7X3P2E3X$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["decodeJwt"])(token);
    if (errors) {
        return {
            errors
        };
    }
    const { header } = decodedResult;
    const { kid } = header;
    try {
        let key;
        if (options.jwtKey) {
            key = loadClerkJwkFromPem({
                kid,
                pem: options.jwtKey
            });
        } else if (options.secretKey) {
            key = await loadClerkJWKFromRemote({
                ...options,
                kid
            });
        } else {
            return {
                errors: [
                    new __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TCIXZLLW$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["TokenVerificationError"]({
                        action: __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TCIXZLLW$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["TokenVerificationErrorAction"].SetClerkJWTKey,
                        message: "Failed to resolve JWK during verification.",
                        reason: __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TCIXZLLW$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["TokenVerificationErrorReason"].JWKFailedToResolve
                    })
                ]
            };
        }
        return await (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$7X3P2E3X$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["verifyJwt"])(token, {
            ...options,
            key
        });
    } catch (error) {
        return {
            errors: [
                error
            ]
        };
    }
}
function handleClerkAPIError(tokenType, err, notFoundMessage) {
    if ((0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$error$2d$Dl9xmUf3$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["isClerkAPIResponseError"])(err)) {
        let code;
        let message;
        switch(err.status){
            case 401:
                code = __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TCIXZLLW$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["MachineTokenVerificationErrorCode"].InvalidSecretKey;
                message = err.errors[0]?.message || "Invalid secret key";
                break;
            case 404:
                code = __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TCIXZLLW$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["MachineTokenVerificationErrorCode"].TokenInvalid;
                message = notFoundMessage;
                break;
            default:
                code = __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TCIXZLLW$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["MachineTokenVerificationErrorCode"].UnexpectedError;
                message = "Unexpected error";
        }
        return {
            data: void 0,
            tokenType,
            errors: [
                new __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TCIXZLLW$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["MachineTokenVerificationError"]({
                    message,
                    code,
                    status: err.status
                })
            ]
        };
    }
    return {
        data: void 0,
        tokenType,
        errors: [
            new __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TCIXZLLW$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["MachineTokenVerificationError"]({
                message: "Unexpected error",
                code: __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TCIXZLLW$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["MachineTokenVerificationErrorCode"].UnexpectedError,
                status: err.status
            })
        ]
    };
}
async function verifyM2MToken(token, options) {
    try {
        const client = createBackendApiClient(options);
        const verifiedToken = await client.m2m.verify({
            token
        });
        return {
            data: verifiedToken,
            tokenType: TokenType.M2MToken,
            errors: void 0
        };
    } catch (err) {
        return handleClerkAPIError(TokenType.M2MToken, err, "Machine token not found");
    }
}
async function verifyJwtOAuthToken(accessToken, options) {
    let decoded;
    try {
        decoded = (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$7X3P2E3X$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["decodeJwt"])(accessToken);
    } catch (e) {
        return {
            data: void 0,
            tokenType: TokenType.OAuthToken,
            errors: [
                new __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TCIXZLLW$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["MachineTokenVerificationError"]({
                    code: __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TCIXZLLW$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["MachineTokenVerificationErrorCode"].TokenInvalid,
                    message: e.message
                })
            ]
        };
    }
    const { data: decodedResult, errors } = decoded;
    if (errors) {
        return {
            data: void 0,
            tokenType: TokenType.OAuthToken,
            errors: [
                new __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TCIXZLLW$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["MachineTokenVerificationError"]({
                    code: __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TCIXZLLW$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["MachineTokenVerificationErrorCode"].TokenInvalid,
                    message: errors[0].message
                })
            ]
        };
    }
    const { header } = decodedResult;
    const { kid } = header;
    let key;
    try {
        if (options.jwtKey) {
            key = loadClerkJwkFromPem({
                kid,
                pem: options.jwtKey
            });
        } else if (options.secretKey) {
            key = await loadClerkJWKFromRemote({
                ...options,
                kid
            });
        } else {
            return {
                data: void 0,
                tokenType: TokenType.OAuthToken,
                errors: [
                    new __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TCIXZLLW$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["MachineTokenVerificationError"]({
                        action: __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TCIXZLLW$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["TokenVerificationErrorAction"].SetClerkJWTKey,
                        message: "Failed to resolve JWK during verification.",
                        code: __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TCIXZLLW$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["MachineTokenVerificationErrorCode"].TokenVerificationFailed
                    })
                ]
            };
        }
        const { data: payload, errors: verifyErrors } = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$7X3P2E3X$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["verifyJwt"])(accessToken, {
            ...options,
            key,
            headerType: OAUTH_ACCESS_TOKEN_TYPES
        });
        if (verifyErrors) {
            return {
                data: void 0,
                tokenType: TokenType.OAuthToken,
                errors: [
                    new __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TCIXZLLW$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["MachineTokenVerificationError"]({
                        code: __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TCIXZLLW$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["MachineTokenVerificationErrorCode"].TokenVerificationFailed,
                        message: verifyErrors[0].message
                    })
                ]
            };
        }
        const token = IdPOAuthAccessToken.fromJwtPayload(payload, options.clockSkewInMs);
        return {
            data: token,
            tokenType: TokenType.OAuthToken,
            errors: void 0
        };
    } catch (error) {
        return {
            tokenType: TokenType.OAuthToken,
            errors: [
                new __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TCIXZLLW$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["MachineTokenVerificationError"]({
                    code: __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TCIXZLLW$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["MachineTokenVerificationErrorCode"].TokenVerificationFailed,
                    message: error.message
                })
            ]
        };
    }
}
async function verifyOAuthToken(accessToken, options) {
    if (isJwtFormat(accessToken)) {
        return verifyJwtOAuthToken(accessToken, options);
    }
    try {
        const client = createBackendApiClient(options);
        const verifiedToken = await client.idPOAuthAccessToken.verify(accessToken);
        return {
            data: verifiedToken,
            tokenType: TokenType.OAuthToken,
            errors: void 0
        };
    } catch (err) {
        return handleClerkAPIError(TokenType.OAuthToken, err, "OAuth token not found");
    }
}
async function verifyAPIKey(secret, options) {
    try {
        const client = createBackendApiClient(options);
        const verifiedToken = await client.apiKeys.verify(secret);
        return {
            data: verifiedToken,
            tokenType: TokenType.ApiKey,
            errors: void 0
        };
    } catch (err) {
        return handleClerkAPIError(TokenType.ApiKey, err, "API key not found");
    }
}
async function verifyMachineAuthToken(token, options) {
    if (token.startsWith(M2M_TOKEN_PREFIX)) {
        return verifyM2MToken(token, options);
    }
    if (token.startsWith(OAUTH_TOKEN_PREFIX) || isJwtFormat(token)) {
        return verifyOAuthToken(token, options);
    }
    if (token.startsWith(API_KEY_PREFIX)) {
        return verifyAPIKey(token, options);
    }
    throw new Error("Unknown machine token type");
}
// src/tokens/handshake.ts
async function verifyHandshakeJwt(token, { key }) {
    const { data: decoded, errors } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$7X3P2E3X$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["decodeJwt"])(token);
    if (errors) {
        throw errors[0];
    }
    const { header, payload } = decoded;
    const { typ, alg } = header;
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$7X3P2E3X$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["assertHeaderType"])(typ);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$7X3P2E3X$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["assertHeaderAlgorithm"])(alg);
    const { data: signatureValid, errors: signatureErrors } = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$7X3P2E3X$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["hasValidSignature"])(decoded, key);
    if (signatureErrors) {
        throw new __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TCIXZLLW$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["TokenVerificationError"]({
            reason: __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TCIXZLLW$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["TokenVerificationErrorReason"].TokenVerificationFailed,
            message: `Error verifying handshake token. ${signatureErrors[0]}`
        });
    }
    if (!signatureValid) {
        throw new __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TCIXZLLW$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["TokenVerificationError"]({
            reason: __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TCIXZLLW$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["TokenVerificationErrorReason"].TokenInvalidSignature,
            message: "Handshake signature is invalid."
        });
    }
    return payload;
}
async function verifyHandshakeToken(token, options) {
    const { secretKey, apiUrl, apiVersion, jwksCacheTtlInMs, jwtKey, skipJwksCache } = options;
    const { data, errors } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$7X3P2E3X$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["decodeJwt"])(token);
    if (errors) {
        throw errors[0];
    }
    const { kid } = data.header;
    let key;
    if (jwtKey) {
        key = loadClerkJwkFromPem({
            kid,
            pem: jwtKey
        });
    } else if (secretKey) {
        key = await loadClerkJWKFromRemote({
            secretKey,
            apiUrl,
            apiVersion,
            kid,
            jwksCacheTtlInMs,
            skipJwksCache
        });
    } else {
        throw new __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TCIXZLLW$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["TokenVerificationError"]({
            action: __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TCIXZLLW$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["TokenVerificationErrorAction"].SetClerkJWTKey,
            message: "Failed to resolve JWK during handshake verification.",
            reason: __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TCIXZLLW$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["TokenVerificationErrorReason"].JWKFailedToResolve
        });
    }
    return verifyHandshakeJwt(token, {
        key
    });
}
var HandshakeService = class {
    constructor(authenticateContext, options, organizationMatcher){
        this.authenticateContext = authenticateContext;
        this.options = options;
        this.organizationMatcher = organizationMatcher;
    }
    /**
   * Determines if a request is eligible for handshake based on its headers
   *
   * Currently, a request is only eligible for a handshake if we can say it's *probably* a request for a document, not a fetch or some other exotic request.
   * This heuristic should give us a reliable enough signal for browsers that support `Sec-Fetch-Dest` and for those that don't.
   *
   * @returns boolean indicating if the request is eligible for handshake
   */ isRequestEligibleForHandshake() {
        const { accept, secFetchDest } = this.authenticateContext;
        if (secFetchDest === "document" || secFetchDest === "iframe") {
            return true;
        }
        if (!secFetchDest && accept?.startsWith("text/html")) {
            return true;
        }
        return false;
    }
    /**
   * Builds the redirect headers for a handshake request
   * @param reason - The reason for the handshake (e.g. 'session-token-expired')
   * @returns Headers object containing the Location header for redirect
   * @throws Error if clerkUrl is missing in authenticateContext
   */ buildRedirectToHandshake(reason) {
        if (!this.authenticateContext?.clerkUrl) {
            throw new Error("Missing clerkUrl in authenticateContext");
        }
        const redirectUrl = this.removeDevBrowserFromURL(this.authenticateContext.clerkUrl);
        let baseUrl = this.authenticateContext.frontendApi.startsWith("http") ? this.authenticateContext.frontendApi : `https://${this.authenticateContext.frontendApi}`;
        baseUrl = baseUrl.replace(/\/+$/, "") + "/";
        const url = new URL("v1/client/handshake", baseUrl);
        url.searchParams.append("redirect_url", redirectUrl?.href || "");
        url.searchParams.append("__clerk_api_version", SUPPORTED_BAPI_VERSION);
        url.searchParams.append(constants.QueryParameters.SuffixedCookies, this.authenticateContext.usesSuffixedCookies().toString());
        url.searchParams.append(constants.QueryParameters.HandshakeReason, reason);
        url.searchParams.append(constants.QueryParameters.HandshakeFormat, "nonce");
        if (this.authenticateContext.sessionToken) {
            url.searchParams.append(constants.QueryParameters.Session, this.authenticateContext.sessionToken);
        }
        if (this.authenticateContext.instanceType === "development" && this.authenticateContext.devBrowserToken) {
            url.searchParams.append(constants.QueryParameters.DevBrowser, this.authenticateContext.devBrowserToken);
        }
        const toActivate = this.getOrganizationSyncTarget(this.authenticateContext.clerkUrl, this.organizationMatcher);
        if (toActivate) {
            const params = this.getOrganizationSyncQueryParams(toActivate);
            params.forEach((value, key)=>{
                url.searchParams.append(key, value);
            });
        }
        return new Headers({
            [constants.Headers.Location]: url.href
        });
    }
    /**
   * Gets cookies from either a handshake nonce or a handshake token
   * @returns Promise resolving to string array of cookie directives
   */ async getCookiesFromHandshake() {
        const cookiesToSet = [];
        if (this.authenticateContext.handshakeNonce) {
            try {
                const handshakePayload = await this.authenticateContext.apiClient?.clients.getHandshakePayload({
                    nonce: this.authenticateContext.handshakeNonce
                });
                if (handshakePayload) {
                    cookiesToSet.push(...handshakePayload.directives);
                }
            } catch (error) {
                console.error("Clerk: HandshakeService: error getting handshake payload:", error);
            }
        } else if (this.authenticateContext.handshakeToken) {
            const handshakePayload = await verifyHandshakeToken(this.authenticateContext.handshakeToken, this.authenticateContext);
            if (handshakePayload && Array.isArray(handshakePayload.handshake)) {
                cookiesToSet.push(...handshakePayload.handshake);
            }
        }
        return cookiesToSet;
    }
    /**
   * Resolves a handshake request by verifying the handshake token and setting appropriate cookies
   * @returns Promise resolving to either a SignedInState or SignedOutState
   * @throws Error if handshake verification fails or if there are issues with the session token
   */ async resolveHandshake() {
        const headers = new Headers({
            "Access-Control-Allow-Origin": "null",
            "Access-Control-Allow-Credentials": "true"
        });
        const cookiesToSet = await this.getCookiesFromHandshake();
        let sessionToken = "";
        cookiesToSet.forEach((x)=>{
            headers.append("Set-Cookie", x);
            if (getCookieName(x).startsWith(constants.Cookies.Session)) {
                sessionToken = getCookieValue(x);
            }
        });
        if (this.authenticateContext.instanceType === "development") {
            const newUrl = new URL(this.authenticateContext.clerkUrl);
            newUrl.searchParams.delete(constants.QueryParameters.Handshake);
            newUrl.searchParams.delete(constants.QueryParameters.HandshakeHelp);
            newUrl.searchParams.delete(constants.QueryParameters.DevBrowser);
            newUrl.searchParams.delete(constants.QueryParameters.HandshakeNonce);
            headers.append(constants.Headers.Location, newUrl.toString());
            headers.set(constants.Headers.CacheControl, "no-store");
        }
        if (sessionToken === "") {
            return signedOut({
                tokenType: TokenType.SessionToken,
                authenticateContext: this.authenticateContext,
                reason: AuthErrorReason.SessionTokenMissing,
                message: "",
                headers
            });
        }
        const { data, errors: [error] = [] } = await verifyToken(sessionToken, this.authenticateContext);
        if (data) {
            return signedIn({
                tokenType: TokenType.SessionToken,
                authenticateContext: this.authenticateContext,
                sessionClaims: data,
                headers,
                token: sessionToken
            });
        }
        if (this.authenticateContext.instanceType === "development" && (error?.reason === __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TCIXZLLW$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["TokenVerificationErrorReason"].TokenExpired || error?.reason === __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TCIXZLLW$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["TokenVerificationErrorReason"].TokenNotActiveYet || error?.reason === __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TCIXZLLW$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["TokenVerificationErrorReason"].TokenIatInTheFuture)) {
            const developmentError = new __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TCIXZLLW$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["TokenVerificationError"]({
                action: error.action,
                message: error.message,
                reason: error.reason
            });
            developmentError.tokenCarrier = "cookie";
            console.error(`Clerk: Clock skew detected. This usually means that your system clock is inaccurate. Clerk will attempt to account for the clock skew in development.

To resolve this issue, make sure your system's clock is set to the correct time (e.g. turn off and on automatic time synchronization).

---

${developmentError.getFullMessage()}`);
            const { data: retryResult, errors: [retryError] = [] } = await verifyToken(sessionToken, {
                ...this.authenticateContext,
                clockSkewInMs: 864e5
            });
            if (retryResult) {
                return signedIn({
                    tokenType: TokenType.SessionToken,
                    authenticateContext: this.authenticateContext,
                    sessionClaims: retryResult,
                    headers,
                    token: sessionToken
                });
            }
            throw new Error(retryError?.message || "Clerk: Handshake retry failed.");
        }
        throw new Error(error?.message || "Clerk: Handshake failed.");
    }
    /**
   * Handles handshake token verification errors in development mode
   * @param error - The TokenVerificationError that occurred
   * @throws Error with a descriptive message about the verification failure
   */ handleTokenVerificationErrorInDevelopment(error) {
        if (error.reason === __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TCIXZLLW$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["TokenVerificationErrorReason"].TokenInvalidSignature) {
            const msg = `Clerk: Handshake token verification failed due to an invalid signature. If you have switched Clerk keys locally, clear your cookies and try again.`;
            throw new Error(msg);
        }
        throw new Error(`Clerk: Handshake token verification failed: ${error.getFullMessage()}.`);
    }
    /**
   * Checks if a redirect loop is detected and sets headers to track redirect count
   * @param headers - The Headers object to modify
   * @returns boolean indicating if a redirect loop was detected (true) or if the request can proceed (false)
   */ checkAndTrackRedirectLoop(headers) {
        if (this.authenticateContext.handshakeRedirectLoopCounter === 3) {
            return true;
        }
        const newCounterValue = this.authenticateContext.handshakeRedirectLoopCounter + 1;
        const cookieName = constants.Cookies.RedirectCount;
        headers.append("Set-Cookie", `${cookieName}=${newCounterValue}; SameSite=Lax; HttpOnly; Max-Age=2`);
        return false;
    }
    removeDevBrowserFromURL(url) {
        const updatedURL = new URL(url);
        updatedURL.searchParams.delete(constants.QueryParameters.DevBrowser);
        updatedURL.searchParams.delete(constants.QueryParameters.LegacyDevBrowser);
        return updatedURL;
    }
    getOrganizationSyncTarget(url, matchers) {
        return matchers.findTarget(url);
    }
    getOrganizationSyncQueryParams(toActivate) {
        const ret = /* @__PURE__ */ new Map();
        if (toActivate.type === "personalAccount") {
            ret.set("organization_id", "");
        }
        if (toActivate.type === "organization") {
            if (toActivate.organizationId) {
                ret.set("organization_id", toActivate.organizationId);
            }
            if (toActivate.organizationSlug) {
                ret.set("organization_id", toActivate.organizationSlug);
            }
        }
        return ret;
    }
};
;
var OrganizationMatcher = class {
    constructor(options){
        this.organizationPattern = this.createMatcher(options?.organizationPatterns);
        this.personalAccountPattern = this.createMatcher(options?.personalAccountPatterns);
    }
    createMatcher(pattern) {
        if (!pattern) {
            return null;
        }
        try {
            return (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$pathToRegexp$2d$Bu45OrlU$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["match"])(pattern);
        } catch (e) {
            throw new Error(`Invalid pattern "${pattern}": ${e}`);
        }
    }
    findTarget(url) {
        const orgTarget = this.findOrganizationTarget(url);
        if (orgTarget) {
            return orgTarget;
        }
        return this.findPersonalAccountTarget(url);
    }
    findOrganizationTarget(url) {
        if (!this.organizationPattern) {
            return null;
        }
        try {
            const result = this.organizationPattern(url.pathname);
            if (!result || !("params" in result)) {
                return null;
            }
            const params = result.params;
            if (params.id) {
                return {
                    type: "organization",
                    organizationId: params.id
                };
            }
            if (params.slug) {
                return {
                    type: "organization",
                    organizationSlug: params.slug
                };
            }
            return null;
        } catch (e) {
            console.error("Failed to match organization pattern:", e);
            return null;
        }
    }
    findPersonalAccountTarget(url) {
        if (!this.personalAccountPattern) {
            return null;
        }
        try {
            const result = this.personalAccountPattern(url.pathname);
            return result ? {
                type: "personalAccount"
            } : null;
        } catch (e) {
            console.error("Failed to match personal account pattern:", e);
            return null;
        }
    }
};
// src/tokens/request.ts
var RefreshTokenErrorReason = {
    NonEligibleNoCookie: "non-eligible-no-refresh-cookie",
    NonEligibleNonGet: "non-eligible-non-get",
    InvalidSessionToken: "invalid-session-token",
    MissingApiClient: "missing-api-client",
    MissingSessionToken: "missing-session-token",
    MissingRefreshToken: "missing-refresh-token",
    ExpiredSessionTokenDecodeFailed: "expired-session-token-decode-failed",
    ExpiredSessionTokenMissingSidClaim: "expired-session-token-missing-sid-claim",
    FetchError: "fetch-error",
    UnexpectedSDKError: "unexpected-sdk-error",
    UnexpectedBAPIError: "unexpected-bapi-error"
};
function assertSignInUrlExists(signInUrl, key) {
    if (!signInUrl && (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$keys$2d$YNv6yjKk$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["isDevelopmentFromSecretKey"])(key)) {
        throw new Error(`Missing signInUrl. Pass a signInUrl for dev instances if an app is satellite`);
    }
}
function assertProxyUrlOrDomain(proxyUrlOrDomain) {
    if (!proxyUrlOrDomain) {
        throw new Error(`Missing domain and proxyUrl. A satellite application needs to specify a domain or a proxyUrl`);
    }
}
function assertSignInUrlFormatAndOrigin(_signInUrl, origin) {
    let signInUrl;
    try {
        signInUrl = new URL(_signInUrl);
    } catch  {
        throw new Error(`The signInUrl needs to have a absolute url format.`);
    }
    if (signInUrl.origin === origin) {
        throw new Error(`The signInUrl needs to be on a different origin than your satellite application.`);
    }
}
function assertMachineSecretOrSecretKey(authenticateContext) {
    if (!authenticateContext.machineSecretKey && !authenticateContext.secretKey) {
        throw new Error("Machine token authentication requires either a Machine secret key or a Clerk secret key. Ensure a Clerk secret key or Machine secret key is set.");
    }
}
function isRequestEligibleForRefresh(err, authenticateContext, request) {
    return err.reason === __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TCIXZLLW$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["TokenVerificationErrorReason"].TokenExpired && !!authenticateContext.refreshTokenInCookie && request.method === "GET";
}
function checkTokenTypeMismatch(parsedTokenType, acceptsToken, authenticateContext) {
    const mismatch = !isTokenTypeAccepted(parsedTokenType, acceptsToken);
    if (mismatch) {
        const tokenTypeToReturn = typeof acceptsToken === "string" ? acceptsToken : parsedTokenType;
        return signedOut({
            tokenType: tokenTypeToReturn,
            authenticateContext,
            reason: AuthErrorReason.TokenTypeMismatch
        });
    }
    return null;
}
function isTokenTypeInAcceptedArray(acceptsToken, authenticateContext) {
    let parsedTokenType = null;
    const { tokenInHeader } = authenticateContext;
    if (tokenInHeader) {
        if (isMachineToken(tokenInHeader)) {
            parsedTokenType = getMachineTokenType(tokenInHeader);
        } else {
            parsedTokenType = TokenType.SessionToken;
        }
    }
    const typeToCheck = parsedTokenType ?? TokenType.SessionToken;
    return isTokenTypeAccepted(typeToCheck, acceptsToken);
}
var authenticateRequest = async (request, options)=>{
    const authenticateContext = await createAuthenticateContext(createClerkRequest(request), options);
    const acceptsToken = options.acceptsToken ?? TokenType.SessionToken;
    if (acceptsToken !== TokenType.M2MToken) {
        assertValidSecretKey(authenticateContext.secretKey);
        if (authenticateContext.isSatellite) {
            assertSignInUrlExists(authenticateContext.signInUrl, authenticateContext.secretKey);
            if (authenticateContext.signInUrl && authenticateContext.origin) {
                assertSignInUrlFormatAndOrigin(authenticateContext.signInUrl, authenticateContext.origin);
            }
            assertProxyUrlOrDomain(authenticateContext.proxyUrl || authenticateContext.domain);
        }
    }
    if (acceptsToken === TokenType.M2MToken) {
        assertMachineSecretOrSecretKey(authenticateContext);
    }
    const organizationMatcher = new OrganizationMatcher(options.organizationSyncOptions);
    const handshakeService = new HandshakeService(authenticateContext, {
        organizationSyncOptions: options.organizationSyncOptions
    }, organizationMatcher);
    async function refreshToken(authenticateContext2) {
        if (!options.apiClient) {
            return {
                data: null,
                error: {
                    message: "An apiClient is needed to perform token refresh.",
                    cause: {
                        reason: RefreshTokenErrorReason.MissingApiClient
                    }
                }
            };
        }
        const { sessionToken: expiredSessionToken, refreshTokenInCookie: refreshToken2 } = authenticateContext2;
        if (!expiredSessionToken) {
            return {
                data: null,
                error: {
                    message: "Session token must be provided.",
                    cause: {
                        reason: RefreshTokenErrorReason.MissingSessionToken
                    }
                }
            };
        }
        if (!refreshToken2) {
            return {
                data: null,
                error: {
                    message: "Refresh token must be provided.",
                    cause: {
                        reason: RefreshTokenErrorReason.MissingRefreshToken
                    }
                }
            };
        }
        const { data: decodeResult, errors: decodedErrors } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$7X3P2E3X$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["decodeJwt"])(expiredSessionToken);
        if (!decodeResult || decodedErrors) {
            return {
                data: null,
                error: {
                    message: "Unable to decode the expired session token.",
                    cause: {
                        reason: RefreshTokenErrorReason.ExpiredSessionTokenDecodeFailed,
                        errors: decodedErrors
                    }
                }
            };
        }
        if (!decodeResult?.payload?.sid) {
            return {
                data: null,
                error: {
                    message: "Expired session token is missing the `sid` claim.",
                    cause: {
                        reason: RefreshTokenErrorReason.ExpiredSessionTokenMissingSidClaim
                    }
                }
            };
        }
        try {
            const response = await options.apiClient.sessions.refreshSession(decodeResult.payload.sid, {
                format: "cookie",
                suffixed_cookies: authenticateContext2.usesSuffixedCookies(),
                expired_token: expiredSessionToken || "",
                refresh_token: refreshToken2 || "",
                request_origin: authenticateContext2.clerkUrl.origin,
                // The refresh endpoint expects headers as Record<string, string[]>, so we need to transform it.
                request_headers: Object.fromEntries(Array.from(request.headers.entries()).map(([k, v])=>[
                        k,
                        [
                            v
                        ]
                    ]))
            });
            return {
                data: response.cookies,
                error: null
            };
        } catch (err) {
            if (err?.errors?.length) {
                if (err.errors[0].code === "unexpected_error") {
                    return {
                        data: null,
                        error: {
                            message: `Fetch unexpected error`,
                            cause: {
                                reason: RefreshTokenErrorReason.FetchError,
                                errors: err.errors
                            }
                        }
                    };
                }
                return {
                    data: null,
                    error: {
                        message: err.errors[0].code,
                        cause: {
                            reason: err.errors[0].code,
                            errors: err.errors
                        }
                    }
                };
            } else {
                return {
                    data: null,
                    error: {
                        message: `Unexpected Server/BAPI error`,
                        cause: {
                            reason: RefreshTokenErrorReason.UnexpectedBAPIError,
                            errors: [
                                err
                            ]
                        }
                    }
                };
            }
        }
    }
    async function attemptRefresh(authenticateContext2) {
        const { data: cookiesToSet, error } = await refreshToken(authenticateContext2);
        if (!cookiesToSet || cookiesToSet.length === 0) {
            return {
                data: null,
                error
            };
        }
        const headers = new Headers();
        let sessionToken = "";
        cookiesToSet.forEach((x)=>{
            headers.append("Set-Cookie", x);
            if (getCookieName(x).startsWith(constants.Cookies.Session)) {
                sessionToken = getCookieValue(x);
            }
        });
        const { data: jwtPayload, errors } = await verifyToken(sessionToken, authenticateContext2);
        if (errors) {
            return {
                data: null,
                error: {
                    message: `Clerk: unable to verify refreshed session token.`,
                    cause: {
                        reason: RefreshTokenErrorReason.InvalidSessionToken,
                        errors
                    }
                }
            };
        }
        return {
            data: {
                jwtPayload,
                sessionToken,
                headers
            },
            error: null
        };
    }
    function handleMaybeHandshakeStatus(authenticateContext2, reason, message, headers) {
        if (!handshakeService.isRequestEligibleForHandshake()) {
            return signedOut({
                tokenType: TokenType.SessionToken,
                authenticateContext: authenticateContext2,
                reason,
                message
            });
        }
        const handshakeHeaders = headers ?? handshakeService.buildRedirectToHandshake(reason);
        if (handshakeHeaders.get(constants.Headers.Location)) {
            handshakeHeaders.set(constants.Headers.CacheControl, "no-store");
        }
        const isRedirectLoop = handshakeService.checkAndTrackRedirectLoop(handshakeHeaders);
        if (isRedirectLoop) {
            const msg = `Clerk: Refreshing the session token resulted in an infinite redirect loop. This usually means that your Clerk instance keys do not match - make sure to copy the correct publishable and secret keys from the Clerk dashboard.`;
            console.log(msg);
            return signedOut({
                tokenType: TokenType.SessionToken,
                authenticateContext: authenticateContext2,
                reason,
                message
            });
        }
        return handshake(authenticateContext2, reason, message, handshakeHeaders);
    }
    function handleMaybeOrganizationSyncHandshake(authenticateContext2, auth) {
        const organizationSyncTarget = organizationMatcher.findTarget(authenticateContext2.clerkUrl);
        if (!organizationSyncTarget) {
            return null;
        }
        let mustActivate = false;
        if (organizationSyncTarget.type === "organization") {
            if (organizationSyncTarget.organizationSlug && organizationSyncTarget.organizationSlug !== auth.orgSlug) {
                mustActivate = true;
            }
            if (organizationSyncTarget.organizationId && organizationSyncTarget.organizationId !== auth.orgId) {
                mustActivate = true;
            }
        }
        if (organizationSyncTarget.type === "personalAccount" && auth.orgId) {
            mustActivate = true;
        }
        if (!mustActivate) {
            return null;
        }
        if (authenticateContext2.handshakeRedirectLoopCounter >= 3) {
            console.warn("Clerk: Organization activation handshake loop detected. This is likely due to an invalid organization ID or slug. Skipping organization activation.");
            return null;
        }
        const handshakeState = handleMaybeHandshakeStatus(authenticateContext2, AuthErrorReason.ActiveOrganizationMismatch, "");
        if (handshakeState.status !== "handshake") {
            return null;
        }
        return handshakeState;
    }
    async function authenticateRequestWithTokenInHeader() {
        const { tokenInHeader } = authenticateContext;
        try {
            const { data, errors } = await verifyToken(tokenInHeader, authenticateContext);
            if (errors) {
                throw errors[0];
            }
            return signedIn({
                tokenType: TokenType.SessionToken,
                authenticateContext,
                sessionClaims: data,
                headers: new Headers(),
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                token: tokenInHeader
            });
        } catch (err) {
            return handleSessionTokenError(err, "header");
        }
    }
    async function authenticateRequestWithTokenInCookie() {
        const hasActiveClient = authenticateContext.clientUat;
        const hasSessionToken = !!authenticateContext.sessionTokenInCookie;
        const hasDevBrowserToken = !!authenticateContext.devBrowserToken;
        if (authenticateContext.handshakeNonce || authenticateContext.handshakeToken) {
            try {
                return await handshakeService.resolveHandshake();
            } catch (error) {
                if (error instanceof __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TCIXZLLW$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["TokenVerificationError"] && authenticateContext.instanceType === "development") {
                    handshakeService.handleTokenVerificationErrorInDevelopment(error);
                } else {
                    console.error("Clerk: unable to resolve handshake:", error);
                }
            }
        }
        const isRequestEligibleForMultiDomainSync = authenticateContext.isSatellite && authenticateContext.secFetchDest === "document";
        if (authenticateContext.instanceType === "production" && isRequestEligibleForMultiDomainSync) {
            return handleMaybeHandshakeStatus(authenticateContext, AuthErrorReason.SatelliteCookieNeedsSyncing, "");
        }
        if (authenticateContext.instanceType === "development" && isRequestEligibleForMultiDomainSync && !authenticateContext.clerkUrl.searchParams.has(constants.QueryParameters.ClerkSynced)) {
            const redirectURL = new URL(authenticateContext.signInUrl);
            redirectURL.searchParams.append(constants.QueryParameters.ClerkRedirectUrl, authenticateContext.clerkUrl.toString());
            const headers = new Headers({
                [constants.Headers.Location]: redirectURL.toString()
            });
            return handleMaybeHandshakeStatus(authenticateContext, AuthErrorReason.SatelliteCookieNeedsSyncing, "", headers);
        }
        const redirectUrl = new URL(authenticateContext.clerkUrl).searchParams.get(constants.QueryParameters.ClerkRedirectUrl);
        if (authenticateContext.instanceType === "development" && !authenticateContext.isSatellite && redirectUrl) {
            const redirectBackToSatelliteUrl = new URL(redirectUrl);
            if (authenticateContext.devBrowserToken) {
                redirectBackToSatelliteUrl.searchParams.append(constants.QueryParameters.DevBrowser, authenticateContext.devBrowserToken);
            }
            redirectBackToSatelliteUrl.searchParams.append(constants.QueryParameters.ClerkSynced, "true");
            const headers = new Headers({
                [constants.Headers.Location]: redirectBackToSatelliteUrl.toString()
            });
            return handleMaybeHandshakeStatus(authenticateContext, AuthErrorReason.PrimaryRespondsToSyncing, "", headers);
        }
        if (authenticateContext.instanceType === "development" && authenticateContext.clerkUrl.searchParams.has(constants.QueryParameters.DevBrowser)) {
            return handleMaybeHandshakeStatus(authenticateContext, AuthErrorReason.DevBrowserSync, "");
        }
        if (authenticateContext.instanceType === "development" && !hasDevBrowserToken) {
            return handleMaybeHandshakeStatus(authenticateContext, AuthErrorReason.DevBrowserMissing, "");
        }
        if (!hasActiveClient && !hasSessionToken) {
            return signedOut({
                tokenType: TokenType.SessionToken,
                authenticateContext,
                reason: AuthErrorReason.SessionTokenAndUATMissing
            });
        }
        if (!hasActiveClient && hasSessionToken) {
            return handleMaybeHandshakeStatus(authenticateContext, AuthErrorReason.SessionTokenWithoutClientUAT, "");
        }
        if (hasActiveClient && !hasSessionToken) {
            return handleMaybeHandshakeStatus(authenticateContext, AuthErrorReason.ClientUATWithoutSessionToken, "");
        }
        const { data: decodeResult, errors: decodedErrors } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$7X3P2E3X$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["decodeJwt"])(authenticateContext.sessionTokenInCookie);
        if (decodedErrors) {
            return handleSessionTokenError(decodedErrors[0], "cookie");
        }
        if (decodeResult.payload.iat < authenticateContext.clientUat) {
            return handleMaybeHandshakeStatus(authenticateContext, AuthErrorReason.SessionTokenIATBeforeClientUAT, "");
        }
        try {
            const { data, errors } = await verifyToken(authenticateContext.sessionTokenInCookie, authenticateContext);
            if (errors) {
                throw errors[0];
            }
            const signedInRequestState = signedIn({
                tokenType: TokenType.SessionToken,
                authenticateContext,
                sessionClaims: data,
                headers: new Headers(),
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                token: authenticateContext.sessionTokenInCookie
            });
            const shouldForceHandshakeForCrossDomain = !authenticateContext.isSatellite && // We're on primary
            authenticateContext.secFetchDest === "document" && // Document navigation
            authenticateContext.isCrossOriginReferrer() && // Came from different domain
            !authenticateContext.isKnownClerkReferrer() && // Not from Clerk accounts portal or FAPI
            authenticateContext.handshakeRedirectLoopCounter === 0;
            if (shouldForceHandshakeForCrossDomain) {
                return handleMaybeHandshakeStatus(authenticateContext, AuthErrorReason.PrimaryDomainCrossOriginSync, "Cross-origin request from satellite domain requires handshake");
            }
            const authObject = signedInRequestState.toAuth();
            if (authObject.userId) {
                const handshakeRequestState = handleMaybeOrganizationSyncHandshake(authenticateContext, authObject);
                if (handshakeRequestState) {
                    return handshakeRequestState;
                }
            }
            return signedInRequestState;
        } catch (err) {
            return handleSessionTokenError(err, "cookie");
        }
        return signedOut({
            tokenType: TokenType.SessionToken,
            authenticateContext,
            reason: AuthErrorReason.UnexpectedError
        });
    }
    async function handleSessionTokenError(err, tokenCarrier) {
        if (!(err instanceof __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TCIXZLLW$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["TokenVerificationError"])) {
            return signedOut({
                tokenType: TokenType.SessionToken,
                authenticateContext,
                reason: AuthErrorReason.UnexpectedError
            });
        }
        let refreshError;
        if (isRequestEligibleForRefresh(err, authenticateContext, request)) {
            const { data, error } = await attemptRefresh(authenticateContext);
            if (data) {
                return signedIn({
                    tokenType: TokenType.SessionToken,
                    authenticateContext,
                    sessionClaims: data.jwtPayload,
                    headers: data.headers,
                    token: data.sessionToken
                });
            }
            if (error?.cause?.reason) {
                refreshError = error.cause.reason;
            } else {
                refreshError = RefreshTokenErrorReason.UnexpectedSDKError;
            }
        } else {
            if (request.method !== "GET") {
                refreshError = RefreshTokenErrorReason.NonEligibleNonGet;
            } else if (!authenticateContext.refreshTokenInCookie) {
                refreshError = RefreshTokenErrorReason.NonEligibleNoCookie;
            } else {
                refreshError = null;
            }
        }
        err.tokenCarrier = tokenCarrier;
        const reasonToHandshake = [
            __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TCIXZLLW$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["TokenVerificationErrorReason"].TokenExpired,
            __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TCIXZLLW$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["TokenVerificationErrorReason"].TokenNotActiveYet,
            __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TCIXZLLW$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["TokenVerificationErrorReason"].TokenIatInTheFuture
        ].includes(err.reason);
        if (reasonToHandshake) {
            return handleMaybeHandshakeStatus(authenticateContext, convertTokenVerificationErrorReasonToAuthErrorReason({
                tokenError: err.reason,
                refreshError
            }), err.getFullMessage());
        }
        return signedOut({
            tokenType: TokenType.SessionToken,
            authenticateContext,
            reason: err.reason,
            message: err.getFullMessage()
        });
    }
    function handleMachineError(tokenType, err) {
        if (!(err instanceof __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TCIXZLLW$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["MachineTokenVerificationError"])) {
            return signedOut({
                tokenType,
                authenticateContext,
                reason: AuthErrorReason.UnexpectedError
            });
        }
        return signedOut({
            tokenType,
            authenticateContext,
            reason: err.code,
            message: err.getFullMessage()
        });
    }
    async function authenticateMachineRequestWithTokenInHeader() {
        const { tokenInHeader } = authenticateContext;
        if (!tokenInHeader) {
            return handleSessionTokenError(new Error("Missing token in header"), "header");
        }
        if (!isMachineToken(tokenInHeader)) {
            return signedOut({
                tokenType: acceptsToken,
                authenticateContext,
                reason: AuthErrorReason.TokenTypeMismatch,
                message: ""
            });
        }
        const parsedTokenType = getMachineTokenType(tokenInHeader);
        const mismatchState = checkTokenTypeMismatch(parsedTokenType, acceptsToken, authenticateContext);
        if (mismatchState) {
            return mismatchState;
        }
        const { data, tokenType, errors } = await verifyMachineAuthToken(tokenInHeader, authenticateContext);
        if (errors) {
            return handleMachineError(tokenType, errors[0]);
        }
        return signedIn({
            tokenType,
            authenticateContext,
            machineData: data,
            token: tokenInHeader
        });
    }
    async function authenticateAnyRequestWithTokenInHeader() {
        const { tokenInHeader } = authenticateContext;
        if (!tokenInHeader) {
            return handleSessionTokenError(new Error("Missing token in header"), "header");
        }
        if (isMachineToken(tokenInHeader)) {
            const parsedTokenType = getMachineTokenType(tokenInHeader);
            const mismatchState = checkTokenTypeMismatch(parsedTokenType, acceptsToken, authenticateContext);
            if (mismatchState) {
                return mismatchState;
            }
            const { data: data2, tokenType, errors: errors2 } = await verifyMachineAuthToken(tokenInHeader, authenticateContext);
            if (errors2) {
                return handleMachineError(tokenType, errors2[0]);
            }
            return signedIn({
                tokenType,
                authenticateContext,
                machineData: data2,
                token: tokenInHeader
            });
        }
        const { data, errors } = await verifyToken(tokenInHeader, authenticateContext);
        if (errors) {
            return handleSessionTokenError(errors[0], "header");
        }
        return signedIn({
            tokenType: TokenType.SessionToken,
            authenticateContext,
            sessionClaims: data,
            token: tokenInHeader
        });
    }
    if (Array.isArray(acceptsToken)) {
        if (!isTokenTypeInAcceptedArray(acceptsToken, authenticateContext)) {
            return signedOutInvalidToken();
        }
    }
    if (authenticateContext.tokenInHeader) {
        if (acceptsToken === "any") {
            return authenticateAnyRequestWithTokenInHeader();
        }
        if (acceptsToken === TokenType.SessionToken) {
            return authenticateRequestWithTokenInHeader();
        }
        return authenticateMachineRequestWithTokenInHeader();
    }
    if (acceptsToken === TokenType.OAuthToken || acceptsToken === TokenType.ApiKey || acceptsToken === TokenType.M2MToken) {
        return signedOut({
            tokenType: acceptsToken,
            authenticateContext,
            reason: "No token in header"
        });
    }
    return authenticateRequestWithTokenInCookie();
};
var debugRequestState = (params)=>{
    const { isSignedIn, isAuthenticated, proxyUrl, reason, message, publishableKey, isSatellite, domain } = params;
    return {
        isSignedIn,
        isAuthenticated,
        proxyUrl,
        reason,
        message,
        publishableKey,
        isSatellite,
        domain
    };
};
var convertTokenVerificationErrorReasonToAuthErrorReason = ({ tokenError, refreshError })=>{
    switch(tokenError){
        case __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TCIXZLLW$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["TokenVerificationErrorReason"].TokenExpired:
            return `${AuthErrorReason.SessionTokenExpired}-refresh-${refreshError}`;
        case __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TCIXZLLW$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["TokenVerificationErrorReason"].TokenNotActiveYet:
            return AuthErrorReason.SessionTokenNBF;
        case __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TCIXZLLW$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["TokenVerificationErrorReason"].TokenIatInTheFuture:
            return AuthErrorReason.SessionTokenIatInTheFuture;
        default:
            return AuthErrorReason.UnexpectedError;
    }
};
// src/tokens/factory.ts
var defaultOptions = {
    secretKey: "",
    machineSecretKey: "",
    jwtKey: "",
    apiUrl: void 0,
    apiVersion: void 0,
    proxyUrl: "",
    publishableKey: "",
    isSatellite: false,
    domain: "",
    audience: ""
};
function createAuthenticateRequest(params) {
    const buildTimeOptions = mergePreDefinedOptions(defaultOptions, params.options);
    const apiClient = params.apiClient;
    const authenticateRequest2 = (request, options = {})=>{
        const { apiUrl, apiVersion } = buildTimeOptions;
        const runTimeOptions = mergePreDefinedOptions(buildTimeOptions, options);
        return authenticateRequest(request, {
            ...options,
            ...runTimeOptions,
            // We should add all the omitted props from options here (eg apiUrl / apiVersion)
            // to avoid runtime options override them.
            apiUrl,
            apiVersion,
            apiClient
        });
    };
    return {
        authenticateRequest: authenticateRequest2,
        debugRequestState
    };
}
// src/util/decorateObjectWithResources.ts
var decorateObjectWithResources = async (obj, authObj, opts)=>{
    const { loadSession, loadUser, loadOrganization } = opts || {};
    const { userId, sessionId, orgId } = authObj;
    const { sessions, users, organizations } = createBackendApiClient({
        ...opts
    });
    const [sessionResp, userResp, organizationResp] = await Promise.all([
        loadSession && sessionId ? sessions.getSession(sessionId) : Promise.resolve(void 0),
        loadUser && userId ? users.getUser(userId) : Promise.resolve(void 0),
        loadOrganization && orgId ? organizations.getOrganization({
            organizationId: orgId
        }) : Promise.resolve(void 0)
    ]);
    const resources = stripPrivateDataFromObject({
        session: sessionResp,
        user: userResp,
        organization: organizationResp
    });
    return Object.assign(obj, resources);
};
function stripPrivateDataFromObject(authObject) {
    const user = authObject.user ? {
        ...authObject.user
    } : authObject.user;
    const organization = authObject.organization ? {
        ...authObject.organization
    } : authObject.organization;
    prunePrivateMetadata(user);
    prunePrivateMetadata(organization);
    return {
        ...authObject,
        user,
        organization
    };
}
function prunePrivateMetadata(resource) {
    if (resource) {
        if ("privateMetadata" in resource) {
            delete resource["privateMetadata"];
        }
        if ("private_metadata" in resource) {
            delete resource["private_metadata"];
        }
    }
    return resource;
}
;
;
 //# sourceMappingURL=chunk-TTM76E4X.mjs.map
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+backend@2.29.0+67f6792bdf102c28/node_modules/@clerk/backend/dist/internal.mjs [app-rsc] (ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([]);
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TTM76E4X$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+backend@2.29.0+67f6792bdf102c28/node_modules/@clerk/backend/dist/chunk-TTM76E4X.mjs [app-rsc] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$authorization$2d$errors$2d$CS1pNy8i$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/authorization-errors-CS1pNy8i.mjs [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$YBVFDYDR$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+backend@2.29.0+67f6792bdf102c28/node_modules/@clerk/backend/dist/chunk-YBVFDYDR.mjs [app-rsc] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$7X3P2E3X$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+backend@2.29.0+67f6792bdf102c28/node_modules/@clerk/backend/dist/chunk-7X3P2E3X.mjs [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TCIXZLLW$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+backend@2.29.0+67f6792bdf102c28/node_modules/@clerk/backend/dist/chunk-TCIXZLLW.mjs [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$RPS7XK5K$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+backend@2.29.0+67f6792bdf102c28/node_modules/@clerk/backend/dist/chunk-RPS7XK5K.mjs [app-rsc] (ecmascript)");
;
;
;
;
;
;
 //# sourceMappingURL=internal.mjs.map
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+nextjs@6.36.5+3439e0367b3d7557/node_modules/@clerk/nextjs/dist/esm/server/headers-utils.js [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "detectClerkMiddleware",
    ()=>detectClerkMiddleware,
    "getAuthKeyFromRequest",
    ()=>getAuthKeyFromRequest,
    "getCustomAttributeFromRequest",
    ()=>getCustomAttributeFromRequest,
    "getHeader",
    ()=>getHeader,
    "isNextRequest",
    ()=>isNextRequest,
    "isRequestWebAPI",
    ()=>isRequestWebAPI
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$internal$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+backend@2.29.0+67f6792bdf102c28/node_modules/@clerk/backend/dist/internal.mjs [app-rsc] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TTM76E4X$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+backend@2.29.0+67f6792bdf102c28/node_modules/@clerk/backend/dist/chunk-TTM76E4X.mjs [app-rsc] (ecmascript) <locals>");
;
;
function getCustomAttributeFromRequest(req, key) {
    return key in req ? req[key] : void 0;
}
function getAuthKeyFromRequest(req, key) {
    return getCustomAttributeFromRequest(req, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TTM76E4X$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__["constants"].Attributes[key]) || getHeader(req, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$backend$40$2$2e$29$2e$0$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$backend$2f$dist$2f$chunk$2d$TTM76E4X$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__["constants"].Headers[key]);
}
function getHeader(req, name) {
    var _a, _b;
    if (isNextRequest(req) || isRequestWebAPI(req)) {
        return req.headers.get(name);
    }
    return req.headers[name] || req.headers[name.toLowerCase()] || ((_b = (_a = req.socket) == null ? void 0 : _a._httpMessage) == null ? void 0 : _b.getHeader(name));
}
function detectClerkMiddleware(req) {
    return Boolean(getAuthKeyFromRequest(req, "AuthStatus"));
}
function isNextRequest(val) {
    try {
        const { headers, nextUrl, cookies } = val || {};
        return typeof (headers == null ? void 0 : headers.get) === "function" && typeof (nextUrl == null ? void 0 : nextUrl.searchParams.get) === "function" && typeof (cookies == null ? void 0 : cookies.get) === "function";
    } catch  {
        return false;
    }
}
function isRequestWebAPI(val) {
    try {
        const { headers } = val || {};
        return typeof (headers == null ? void 0 : headers.get) === "function";
    } catch  {
        return false;
    }
}
;
 //# sourceMappingURL=headers-utils.js.map
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/handleValueOrFn-CcwnRX-K.mjs [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "handleValueOrFn",
    ()=>handleValueOrFn
]);
//#region src/utils/handleValueOrFn.ts
function handleValueOrFn(value, url, defaultValue) {
    if (typeof value === "function") return value(url);
    if (typeof value !== "undefined") return value;
    if (typeof defaultValue !== "undefined") return defaultValue;
}
;
 //# sourceMappingURL=handleValueOrFn-CcwnRX-K.mjs.map
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/noop-B3MbDAfb.mjs [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "noop",
    ()=>noop
]);
//#region src/utils/noop.ts
const noop = (..._args)=>{};
;
 //# sourceMappingURL=noop-B3MbDAfb.mjs.map
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/createDeferredPromise-CjYZzUuU.mjs [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "createDeferredPromise",
    ()=>createDeferredPromise
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$noop$2d$B3MbDAfb$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/noop-B3MbDAfb.mjs [app-rsc] (ecmascript)");
;
//#region src/utils/createDeferredPromise.ts
/**
* Create a promise that can be resolved or rejected from
* outside the Promise constructor callback
* A ES6 compatible utility that implements `Promise.withResolvers`
* @internal
*/ const createDeferredPromise = ()=>{
    let resolve = __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$noop$2d$B3MbDAfb$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["noop"];
    let reject = __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$noop$2d$B3MbDAfb$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["noop"];
    return {
        promise: new Promise((res, rej)=>{
            resolve = res;
            reject = rej;
        }),
        resolve,
        reject
    };
};
;
 //# sourceMappingURL=createDeferredPromise-CjYZzUuU.mjs.map
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/utils-BjdCqECo.mjs [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "allSettled",
    ()=>allSettled,
    "fastDeepMergeAndKeep",
    ()=>fastDeepMergeAndKeep,
    "fastDeepMergeAndReplace",
    ()=>fastDeepMergeAndReplace,
    "logErrorInDevMode",
    ()=>logErrorInDevMode
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$runtimeEnvironment$2d$BB2sO$2d$19$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/runtimeEnvironment-BB2sO-19.mjs [app-rsc] (ecmascript)");
;
//#region src/utils/allSettled.ts
/**
* A ES6 compatible utility that implements `Promise.allSettled`
* @internal
*/ function allSettled(iterable) {
    const promises = Array.from(iterable).map((p)=>p.then((value)=>({
                status: "fulfilled",
                value
            }), (reason)=>({
                status: "rejected",
                reason
            })));
    return Promise.all(promises);
}
//#endregion
//#region src/utils/logErrorInDevMode.ts
const logErrorInDevMode = (message)=>{
    if ((0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$runtimeEnvironment$2d$BB2sO$2d$19$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["isDevelopmentEnvironment"])()) console.error(`Clerk: ${message}`);
};
//#endregion
//#region src/utils/fastDeepMerge.ts
/**
* Merges 2 objects without creating new object references
* The merged props will appear on the `target` object
* If `target` already has a value for a given key it will not be overwritten
*/ const fastDeepMergeAndReplace = (source, target)=>{
    if (!source || !target) return;
    for(const key in source)if (Object.prototype.hasOwnProperty.call(source, key) && source[key] !== null && typeof source[key] === `object`) {
        if (target[key] === void 0) target[key] = new (Object.getPrototypeOf(source[key])).constructor();
        fastDeepMergeAndReplace(source[key], target[key]);
    } else if (Object.prototype.hasOwnProperty.call(source, key) && source[key] !== void 0) target[key] = source[key];
};
const fastDeepMergeAndKeep = (source, target)=>{
    if (!source || !target) return;
    for(const key in source)if (Object.prototype.hasOwnProperty.call(source, key) && source[key] !== null && typeof source[key] === `object`) {
        if (target[key] === void 0) target[key] = new (Object.getPrototypeOf(source[key])).constructor();
        fastDeepMergeAndKeep(source[key], target[key]);
    } else if (Object.prototype.hasOwnProperty.call(source, key) && target[key] === void 0) target[key] = source[key];
};
;
 //# sourceMappingURL=utils-BjdCqECo.mjs.map
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/utils/index.mjs [app-rsc] (ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([]);
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$runtimeEnvironment$2d$BB2sO$2d$19$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/runtimeEnvironment-BB2sO-19.mjs [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$handleValueOrFn$2d$CcwnRX$2d$K$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/handleValueOrFn-CcwnRX-K.mjs [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$noop$2d$B3MbDAfb$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/noop-B3MbDAfb.mjs [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$createDeferredPromise$2d$CjYZzUuU$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/createDeferredPromise-CjYZzUuU.mjs [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$utils$2d$BjdCqECo$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/utils-BjdCqECo.mjs [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$instance$2d$Cze6Nv61$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/instance-Cze6Nv61.mjs [app-rsc] (ecmascript)");
;
;
;
;
;
;
;
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/apiUrlFromPublishableKey-B2KkwQp6.mjs [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "apiUrlFromPublishableKey",
    ()=>apiUrlFromPublishableKey
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$constants$2d$ByUssRbE$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/constants-ByUssRbE.mjs [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$keys$2d$YNv6yjKk$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/keys-YNv6yjKk.mjs [app-rsc] (ecmascript)");
;
;
//#region src/apiUrlFromPublishableKey.ts
/**
* Get the correct API url based on the publishable key.
*
* @param publishableKey - The publishable key to parse.
* @returns One of Clerk's API URLs.
*/ const apiUrlFromPublishableKey = (publishableKey)=>{
    const frontendApi = (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$keys$2d$YNv6yjKk$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["parsePublishableKey"])(publishableKey)?.frontendApi;
    if (frontendApi?.startsWith("clerk.") && __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$constants$2d$ByUssRbE$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["LEGACY_DEV_INSTANCE_SUFFIXES"].some((suffix)=>frontendApi?.endsWith(suffix))) return __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$constants$2d$ByUssRbE$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["PROD_API_URL"];
    if (__TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$constants$2d$ByUssRbE$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["LOCAL_ENV_SUFFIXES"].some((suffix)=>frontendApi?.endsWith(suffix))) return __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$constants$2d$ByUssRbE$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["LOCAL_API_URL"];
    if (__TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$constants$2d$ByUssRbE$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["STAGING_ENV_SUFFIXES"].some((suffix)=>frontendApi?.endsWith(suffix))) return __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$constants$2d$ByUssRbE$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["STAGING_API_URL"];
    return __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$constants$2d$ByUssRbE$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["PROD_API_URL"];
};
;
 //# sourceMappingURL=apiUrlFromPublishableKey-B2KkwQp6.mjs.map
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/apiUrlFromPublishableKey.mjs [app-rsc] (ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([]);
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$constants$2d$ByUssRbE$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/constants-ByUssRbE.mjs [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$isomorphicAtob$2d$DybBXGFR$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/isomorphicAtob-DybBXGFR.mjs [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$isomorphicBtoa$2d$Dr7WubZv$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/isomorphicBtoa-Dr7WubZv.mjs [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$keys$2d$YNv6yjKk$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/keys-YNv6yjKk.mjs [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$apiUrlFromPublishableKey$2d$B2KkwQp6$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/apiUrlFromPublishableKey-B2KkwQp6.mjs [app-rsc] (ecmascript)");
;
;
;
;
;
;
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/underscore-DjQrhefX.mjs [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "camelToSnake",
    ()=>camelToSnake,
    "deepCamelToSnake",
    ()=>deepCamelToSnake,
    "deepSnakeToCamel",
    ()=>deepSnakeToCamel,
    "getNonUndefinedValues",
    ()=>getNonUndefinedValues,
    "isIPV4Address",
    ()=>isIPV4Address,
    "isTruthy",
    ()=>isTruthy,
    "snakeToCamel",
    ()=>snakeToCamel,
    "titleize",
    ()=>titleize,
    "toSentence",
    ()=>toSentence
]);
//#region src/underscore.ts
/**
* Convert words to a sentence.
*
* @param items - An array of words to be joined.
* @returns A string with the items joined by a comma and the last item joined by ", or".
*/ const toSentence = (items)=>{
    if (items.length == 0) return "";
    if (items.length == 1) return items[0];
    let sentence = items.slice(0, -1).join(", ");
    sentence += `, or ${items.slice(-1)}`;
    return sentence;
};
const IP_V4_ADDRESS_REGEX = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
/**
* Checks if a string is a valid IPv4 address.
*
* @returns True if the string is a valid IPv4 address, false otherwise.
*/ function isIPV4Address(str) {
    return IP_V4_ADDRESS_REGEX.test(str || "");
}
/**
* Converts the first character of a string to uppercase.
*
* @param str - The string to be converted.
* @returns The modified string with the rest of the string unchanged.
*
* @example
* ```ts
* titleize('hello world') // 'Hello world'
* ```
*/ function titleize(str) {
    const s = str || "";
    return s.charAt(0).toUpperCase() + s.slice(1);
}
/**
* Converts a string from snake_case to camelCase.
*/ function snakeToCamel(str) {
    return str ? str.replace(/([-_][a-z])/g, (match)=>match.toUpperCase().replace(/-|_/, "")) : "";
}
/**
* Converts a string from camelCase to snake_case.
*/ function camelToSnake(str) {
    return str ? str.replace(/[A-Z]/g, (letter)=>`_${letter.toLowerCase()}`) : "";
}
const createDeepObjectTransformer = (transform)=>{
    const deepTransform = (obj)=>{
        if (!obj) return obj;
        if (Array.isArray(obj)) return obj.map((el)=>{
            if (typeof el === "object" || Array.isArray(el)) return deepTransform(el);
            return el;
        });
        const copy = {
            ...obj
        };
        const keys = Object.keys(copy);
        for (const oldName of keys){
            const newName = transform(oldName.toString());
            if (newName !== oldName) {
                copy[newName] = copy[oldName];
                delete copy[oldName];
            }
            if (typeof copy[newName] === "object") copy[newName] = deepTransform(copy[newName]);
        }
        return copy;
    };
    return deepTransform;
};
/**
* Transforms camelCased objects/ arrays to snake_cased.
* This function recursively traverses all objects and arrays of the passed value
* camelCased keys are removed.
*
* @function
*/ const deepCamelToSnake = createDeepObjectTransformer(camelToSnake);
/**
* Transforms snake_cased objects/ arrays to camelCased.
* This function recursively traverses all objects and arrays of the passed value
* camelCased keys are removed.
*
* @function
*/ const deepSnakeToCamel = createDeepObjectTransformer(snakeToCamel);
/**
* A function to determine if a value is truthy.
*
* @returns True for `true`, true, positive numbers. False for `false`, false, 0, negative integers and anything else.
*/ function isTruthy(value) {
    if (typeof value === `boolean`) return value;
    if (value === void 0 || value === null) return false;
    if (typeof value === `string`) {
        if (value.toLowerCase() === `true`) return true;
        if (value.toLowerCase() === `false`) return false;
    }
    const number = parseInt(value, 10);
    if (isNaN(number)) return false;
    if (number > 0) return true;
    return false;
}
/**
* Get all non-undefined values from an object.
*/ function getNonUndefinedValues(obj) {
    return Object.entries(obj).reduce((acc, [key, value])=>{
        if (value !== void 0) acc[key] = value;
        return acc;
    }, {});
}
;
 //# sourceMappingURL=underscore-DjQrhefX.mjs.map
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/underscore.mjs [app-rsc] (ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([]);
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$underscore$2d$DjQrhefX$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/underscore-DjQrhefX.mjs [app-rsc] (ecmascript)");
;
;
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+nextjs@6.36.5+3439e0367b3d7557/node_modules/@clerk/nextjs/dist/esm/server/constants.js [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "API_URL",
    ()=>API_URL,
    "API_VERSION",
    ()=>API_VERSION,
    "CLERK_JS_URL",
    ()=>CLERK_JS_URL,
    "CLERK_JS_VERSION",
    ()=>CLERK_JS_VERSION,
    "DOMAIN",
    ()=>DOMAIN,
    "ENCRYPTION_KEY",
    ()=>ENCRYPTION_KEY,
    "IS_SATELLITE",
    ()=>IS_SATELLITE,
    "KEYLESS_DISABLED",
    ()=>KEYLESS_DISABLED,
    "MACHINE_SECRET_KEY",
    ()=>MACHINE_SECRET_KEY,
    "PROXY_URL",
    ()=>PROXY_URL,
    "PUBLISHABLE_KEY",
    ()=>PUBLISHABLE_KEY,
    "SDK_METADATA",
    ()=>SDK_METADATA,
    "SECRET_KEY",
    ()=>SECRET_KEY,
    "SIGN_IN_URL",
    ()=>SIGN_IN_URL,
    "SIGN_UP_URL",
    ()=>SIGN_UP_URL,
    "TELEMETRY_DEBUG",
    ()=>TELEMETRY_DEBUG,
    "TELEMETRY_DISABLED",
    ()=>TELEMETRY_DISABLED
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$apiUrlFromPublishableKey$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/apiUrlFromPublishableKey.mjs [app-rsc] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$apiUrlFromPublishableKey$2d$B2KkwQp6$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/apiUrlFromPublishableKey-B2KkwQp6.mjs [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$underscore$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/underscore.mjs [app-rsc] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$underscore$2d$DjQrhefX$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/underscore-DjQrhefX.mjs [app-rsc] (ecmascript)");
;
;
;
const CLERK_JS_VERSION = process.env.NEXT_PUBLIC_CLERK_JS_VERSION || "";
const CLERK_JS_URL = process.env.NEXT_PUBLIC_CLERK_JS_URL || "";
const API_VERSION = process.env.CLERK_API_VERSION || "v1";
const SECRET_KEY = process.env.CLERK_SECRET_KEY || "";
const MACHINE_SECRET_KEY = process.env.CLERK_MACHINE_SECRET_KEY || "";
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || "";
const ENCRYPTION_KEY = process.env.CLERK_ENCRYPTION_KEY || "";
const API_URL = process.env.CLERK_API_URL || (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$apiUrlFromPublishableKey$2d$B2KkwQp6$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["apiUrlFromPublishableKey"])(PUBLISHABLE_KEY);
const DOMAIN = process.env.NEXT_PUBLIC_CLERK_DOMAIN || "";
const PROXY_URL = process.env.NEXT_PUBLIC_CLERK_PROXY_URL || "";
const IS_SATELLITE = (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$underscore$2d$DjQrhefX$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["isTruthy"])(process.env.NEXT_PUBLIC_CLERK_IS_SATELLITE) || false;
const SIGN_IN_URL = process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL || "";
const SIGN_UP_URL = process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL || "";
const SDK_METADATA = {
    name: "@clerk/nextjs",
    version: "6.36.5",
    environment: ("TURBOPACK compile-time value", "development")
};
const TELEMETRY_DISABLED = (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$underscore$2d$DjQrhefX$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["isTruthy"])(process.env.NEXT_PUBLIC_CLERK_TELEMETRY_DISABLED);
const TELEMETRY_DEBUG = (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$underscore$2d$DjQrhefX$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["isTruthy"])(process.env.NEXT_PUBLIC_CLERK_TELEMETRY_DEBUG);
const KEYLESS_DISABLED = (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$underscore$2d$DjQrhefX$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["isTruthy"])(process.env.NEXT_PUBLIC_CLERK_KEYLESS_DISABLED) || false;
;
 //# sourceMappingURL=constants.js.map
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/package.json (json)", ((__turbopack_context__) => {

__turbopack_context__.v({"name":"next","version":"16.1.0","description":"The React Framework","main":"./dist/server/next.js","license":"MIT","repository":"vercel/next.js","bugs":"https://github.com/vercel/next.js/issues","homepage":"https://nextjs.org","types":"index.d.ts","files":["dist","app.js","app.d.ts","babel.js","babel.d.ts","client.js","client.d.ts","compat","cache.js","cache.d.ts","constants.js","constants.d.ts","document.js","document.d.ts","dynamic.js","dynamic.d.ts","error.js","error.d.ts","future","legacy","script.js","script.d.ts","server.js","server.d.ts","head.js","head.d.ts","image.js","image.d.ts","link.js","link.d.ts","form.js","form.d.ts","router.js","router.d.ts","jest.js","jest.d.ts","og.js","og.d.ts","root-params.js","root-params.d.ts","types.d.ts","types.js","index.d.ts","types/global.d.ts","types/compiled.d.ts","image-types/global.d.ts","navigation-types/navigation.d.ts","navigation-types/compat/navigation.d.ts","font","navigation.js","navigation.d.ts","headers.js","headers.d.ts","navigation-types","web-vitals.js","web-vitals.d.ts","experimental/testing/server.js","experimental/testing/server.d.ts","experimental/testmode/playwright.js","experimental/testmode/playwright.d.ts","experimental/testmode/playwright/msw.js","experimental/testmode/playwright/msw.d.ts","experimental/testmode/proxy.js","experimental/testmode/proxy.d.ts"],"bin":{"next":"./dist/bin/next"},"scripts":{"dev":"cross-env NEXT_SERVER_NO_MANGLE=1 taskr","build":"taskr release","prepublishOnly":"cd ../../ && turbo run build","types":"tsc --project tsconfig.build.json --declaration --emitDeclarationOnly --stripInternal --declarationDir dist","typescript":"tsec --noEmit","ncc-compiled":"taskr ncc","storybook":"BROWSER=none storybook dev -p 6006","build-storybook":"storybook build","test-storybook":"test-storybook"},"taskr":{"requires":["./taskfile-webpack.js","./taskfile-ncc.js","./taskfile-swc.js","./taskfile-watch.js"]},"dependencies":{"@next/env":"16.1.0","@swc/helpers":"0.5.15","baseline-browser-mapping":"^2.8.3","caniuse-lite":"^1.0.30001579","postcss":"8.4.31","styled-jsx":"5.1.6"},"peerDependencies":{"@opentelemetry/api":"^1.1.0","@playwright/test":"^1.51.1","babel-plugin-react-compiler":"*","react":"^18.2.0 || 19.0.0-rc-de68d2f4-20241204 || ^19.0.0","react-dom":"^18.2.0 || 19.0.0-rc-de68d2f4-20241204 || ^19.0.0","sass":"^1.3.0"},"peerDependenciesMeta":{"babel-plugin-react-compiler":{"optional":true},"sass":{"optional":true},"@opentelemetry/api":{"optional":true},"@playwright/test":{"optional":true}},"optionalDependencies":{"sharp":"^0.34.4","@next/swc-darwin-arm64":"16.1.0","@next/swc-darwin-x64":"16.1.0","@next/swc-linux-arm64-gnu":"16.1.0","@next/swc-linux-arm64-musl":"16.1.0","@next/swc-linux-x64-gnu":"16.1.0","@next/swc-linux-x64-musl":"16.1.0","@next/swc-win32-arm64-msvc":"16.1.0","@next/swc-win32-x64-msvc":"16.1.0"},"devDependencies":{"@babel/code-frame":"7.26.2","@babel/core":"7.26.10","@babel/eslint-parser":"7.24.6","@babel/generator":"7.27.0","@babel/plugin-syntax-bigint":"7.8.3","@babel/plugin-syntax-dynamic-import":"7.8.3","@babel/plugin-syntax-import-attributes":"7.26.0","@babel/plugin-syntax-jsx":"7.25.9","@babel/plugin-syntax-typescript":"7.25.4","@babel/plugin-transform-class-properties":"7.25.9","@babel/plugin-transform-export-namespace-from":"7.25.9","@babel/plugin-transform-modules-commonjs":"7.26.3","@babel/plugin-transform-numeric-separator":"7.25.9","@babel/plugin-transform-object-rest-spread":"7.25.9","@babel/plugin-transform-runtime":"7.26.10","@babel/preset-env":"7.26.9","@babel/preset-react":"7.26.3","@babel/preset-typescript":"7.27.0","@babel/runtime":"7.27.0","@babel/traverse":"7.27.0","@babel/types":"7.27.0","@base-ui-components/react":"1.0.0-beta.2","@capsizecss/metrics":"3.4.0","@edge-runtime/cookies":"6.0.0","@edge-runtime/ponyfill":"4.0.0","@edge-runtime/primitives":"6.0.0","@hapi/accept":"5.0.2","@jest/transform":"29.5.0","@jest/types":"29.5.0","@modelcontextprotocol/sdk":"1.18.1","@mswjs/interceptors":"0.23.0","@napi-rs/triples":"1.2.0","@next/font":"16.1.0","@next/polyfill-module":"16.1.0","@next/polyfill-nomodule":"16.1.0","@next/react-refresh-utils":"16.1.0","@next/swc":"16.1.0","@opentelemetry/api":"1.6.0","@playwright/test":"1.51.1","@rspack/core":"1.6.7","@storybook/addon-a11y":"8.6.0","@storybook/addon-essentials":"8.6.0","@storybook/addon-interactions":"8.6.0","@storybook/addon-webpack5-compiler-swc":"3.0.0","@storybook/blocks":"8.6.0","@storybook/react":"8.6.0","@storybook/react-webpack5":"8.6.0","@storybook/test":"8.6.0","@storybook/test-runner":"0.21.0","@swc/core":"1.11.24","@swc/types":"0.1.7","@taskr/clear":"1.1.0","@taskr/esnext":"1.1.0","@types/babel__code-frame":"7.0.6","@types/babel__core":"7.20.5","@types/babel__generator":"7.27.0","@types/babel__template":"7.4.4","@types/babel__traverse":"7.20.7","@types/bytes":"3.1.1","@types/ci-info":"2.0.0","@types/compression":"0.0.36","@types/content-disposition":"0.5.4","@types/content-type":"1.1.3","@types/cookie":"0.3.3","@types/cross-spawn":"6.0.0","@types/debug":"4.1.5","@types/express-serve-static-core":"4.17.33","@types/fresh":"0.5.0","@types/glob":"7.1.1","@types/jsonwebtoken":"9.0.0","@types/lodash":"4.14.198","@types/lodash.curry":"4.1.6","@types/path-to-regexp":"1.7.0","@types/picomatch":"2.3.3","@types/platform":"1.3.4","@types/react":"19.0.8","@types/react-dom":"19.0.3","@types/react-is":"18.2.4","@types/semver":"7.3.1","@types/send":"0.14.4","@types/serve-handler":"6.1.4","@types/shell-quote":"1.7.1","@types/tar":"6.1.5","@types/text-table":"0.2.1","@types/ua-parser-js":"0.7.36","@types/webpack-sources1":"npm:@types/webpack-sources@0.1.5","@types/ws":"8.2.0","@vercel/ncc":"0.34.0","@vercel/nft":"0.27.1","@vercel/routing-utils":"5.2.0","@vercel/turbopack-ecmascript-runtime":"*","acorn":"8.14.0","anser":"1.4.9","arg":"4.1.0","assert":"2.0.0","async-retry":"1.2.3","async-sema":"3.0.0","axe-playwright":"2.0.3","babel-loader":"10.0.0","babel-plugin-react-compiler":"0.0.0-experimental-3fde738-20250918","babel-plugin-transform-define":"2.0.0","babel-plugin-transform-react-remove-prop-types":"0.4.24","browserify-zlib":"0.2.0","browserslist":"4.28.0","buffer":"5.6.0","busboy":"1.6.0","bytes":"3.1.1","ci-info":"watson/ci-info#f43f6a1cefff47fb361c88cf4b943fdbcaafe540","cli-select":"1.1.2","client-only":"0.0.1","commander":"12.1.0","comment-json":"3.0.3","compression":"1.7.4","conf":"5.0.0","constants-browserify":"1.0.0","content-disposition":"0.5.3","content-type":"1.0.4","cookie":"0.4.1","cross-env":"6.0.3","cross-spawn":"7.0.3","crypto-browserify":"3.12.0","css-loader":"7.1.2","css.escape":"1.5.1","cssnano-preset-default":"7.0.6","data-uri-to-buffer":"3.0.1","debug":"4.1.1","devalue":"2.0.1","domain-browser":"4.19.0","edge-runtime":"4.0.1","events":"3.3.0","find-up":"4.1.0","fresh":"0.5.2","glob":"7.1.7","gzip-size":"5.1.1","http-proxy":"1.18.1","http-proxy-agent":"5.0.0","https-browserify":"1.0.0","https-proxy-agent":"5.0.1","icss-utils":"5.1.0","ignore-loader":"0.1.2","image-size":"1.2.1","ipaddr.js":"2.2.0","is-docker":"2.0.0","is-wsl":"2.2.0","jest-worker":"27.5.1","json5":"2.2.3","jsonwebtoken":"9.0.0","loader-runner":"4.3.0","loader-utils2":"npm:loader-utils@2.0.4","loader-utils3":"npm:loader-utils@3.1.3","lodash.curry":"4.1.1","mini-css-extract-plugin":"2.4.4","msw":"2.3.0","nanoid":"3.1.32","native-url":"0.3.4","neo-async":"2.6.1","node-html-parser":"5.3.3","ora":"4.0.4","os-browserify":"0.3.0","p-limit":"3.1.0","p-queue":"6.6.2","path-browserify":"1.0.1","path-to-regexp":"6.3.0","picomatch":"4.0.1","postcss-flexbugs-fixes":"5.0.2","postcss-modules-extract-imports":"3.0.0","postcss-modules-local-by-default":"4.2.0","postcss-modules-scope":"3.0.0","postcss-modules-values":"4.0.0","postcss-preset-env":"7.4.3","postcss-safe-parser":"6.0.0","postcss-scss":"4.0.3","postcss-value-parser":"4.2.0","process":"0.11.10","punycode":"2.1.1","querystring-es3":"0.2.1","raw-body":"2.4.1","react-refresh":"0.12.0","recast":"0.23.11","regenerator-runtime":"0.13.4","safe-stable-stringify":"2.5.0","sass-loader":"16.0.5","schema-utils2":"npm:schema-utils@2.7.1","schema-utils3":"npm:schema-utils@3.0.0","semver":"7.3.2","send":"0.18.0","serve-handler":"6.1.6","server-only":"0.0.1","setimmediate":"1.0.5","shell-quote":"1.7.3","source-map":"0.6.1","source-map-loader":"5.0.0","source-map08":"npm:source-map@0.8.0-beta.0","stacktrace-parser":"0.1.10","storybook":"8.6.0","stream-browserify":"3.0.0","stream-http":"3.1.1","strict-event-emitter":"0.5.0","string-hash":"1.1.3","string_decoder":"1.3.0","strip-ansi":"6.0.0","style-loader":"4.0.0","superstruct":"1.0.3","tar":"6.1.15","taskr":"1.1.0","terser":"5.27.0","terser-webpack-plugin":"5.3.9","text-table":"0.2.0","timers-browserify":"2.0.12","tty-browserify":"0.0.1","typescript":"5.9.2","ua-parser-js":"1.0.35","unistore":"3.4.1","util":"0.12.4","vm-browserify":"1.1.2","watchpack":"2.4.0","web-vitals":"4.2.1","webpack":"5.98.0","webpack-sources1":"npm:webpack-sources@1.4.3","webpack-sources3":"npm:webpack-sources@3.2.3","ws":"8.2.3","zod":"3.25.76","zod-validation-error":"3.4.0"},"keywords":["react","framework","nextjs","web","server","node","front-end","backend","cli","vercel"],"engines":{"node":">=20.9.0"}});}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+nextjs@6.36.5+3439e0367b3d7557/node_modules/@clerk/nextjs/dist/esm/utils/sdk-versions.js [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "isNext13",
    ()=>isNext13,
    "isNextWithUnstableServerActions",
    ()=>isNextWithUnstableServerActions
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$package$2e$json__$28$json$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/package.json (json)");
;
;
const isNext13 = __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$package$2e$json__$28$json$29$__["default"].version.startsWith("13.");
const isNextWithUnstableServerActions = isNext13 || __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$package$2e$json__$28$json$29$__["default"].version.startsWith("14.0");
;
 //# sourceMappingURL=sdk-versions.js.map
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+nextjs@6.36.5+3439e0367b3d7557/node_modules/@clerk/nextjs/dist/esm/utils/feature-flags.js [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "canUseKeyless",
    ()=>canUseKeyless
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$utils$2f$index$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/utils/index.mjs [app-rsc] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$runtimeEnvironment$2d$BB2sO$2d$19$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+shared@3.41.1+67f6792bdf102c28/node_modules/@clerk/shared/dist/runtime/runtimeEnvironment-BB2sO-19.mjs [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$server$2f$constants$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+nextjs@6.36.5+3439e0367b3d7557/node_modules/@clerk/nextjs/dist/esm/server/constants.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$utils$2f$sdk$2d$versions$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+nextjs@6.36.5+3439e0367b3d7557/node_modules/@clerk/nextjs/dist/esm/utils/sdk-versions.js [app-rsc] (ecmascript)");
;
;
;
;
const canUseKeyless = !__TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$utils$2f$sdk$2d$versions$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["isNextWithUnstableServerActions"] && // Next.js will inline the value of 'development' or 'production' on the client bundle, so this is client-safe.
(0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$shared$40$3$2e$41$2e$1$2b$67f6792bdf102c28$2f$node_modules$2f40$clerk$2f$shared$2f$dist$2f$runtime$2f$runtimeEnvironment$2d$BB2sO$2d$19$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["isDevelopmentEnvironment"])() && !__TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$server$2f$constants$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["KEYLESS_DISABLED"];
;
 //# sourceMappingURL=feature-flags.js.map
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+nextjs@6.36.5+3439e0367b3d7557/node_modules/@clerk/nextjs/dist/esm/server/keyless.js [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "getKeylessCookieName",
    ()=>getKeylessCookieName,
    "getKeylessCookieValue",
    ()=>getKeylessCookieValue
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$utils$2f$feature$2d$flags$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+nextjs@6.36.5+3439e0367b3d7557/node_modules/@clerk/nextjs/dist/esm/utils/feature-flags.js [app-rsc] (ecmascript)");
;
;
const keylessCookiePrefix = `__clerk_keys_`;
async function hashString(str) {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b)=>b.toString(16).padStart(2, "0")).join("");
    return hashHex.slice(0, 16);
}
async function getKeylessCookieName() {
    const PATH = process.env.PWD;
    if (!PATH) {
        return `${keylessCookiePrefix}${0}`;
    }
    const lastThreeDirs = PATH.split("/").filter(Boolean).slice(-3).reverse().join("/");
    const hash = await hashString(lastThreeDirs);
    return `${keylessCookiePrefix}${hash}`;
}
async function getKeylessCookieValue(getter) {
    if (!__TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$utils$2f$feature$2d$flags$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["canUseKeyless"]) {
        return void 0;
    }
    const keylessCookieName = await getKeylessCookieName();
    let keyless;
    try {
        if ("TURBOPACK compile-time truthy", 1) {
            keyless = JSON.parse(getter(keylessCookieName) || "{}");
        }
    } catch  {
        keyless = void 0;
    }
    return keyless;
}
;
 //# sourceMappingURL=keyless.js.map
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/dist/build/webpack/loaders/next-flight-loader/action-validate.js [app-rsc] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

// This function ensures that all the exported values are valid server actions,
// during the runtime. By definition all actions are required to be async
// functions, but here we can only check that they are functions.
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "ensureServerEntryExports", {
    enumerable: true,
    get: function() {
        return ensureServerEntryExports;
    }
});
function ensureServerEntryExports(actions) {
    for(let i = 0; i < actions.length; i++){
        const action = actions[i];
        if (typeof action !== 'function') {
            throw Object.defineProperty(new Error(`A "use server" file can only export async functions, found ${typeof action}.\nRead more: https://nextjs.org/docs/messages/invalid-use-server-value`), "__NEXT_ERROR_CODE", {
                value: "E352",
                enumerable: false,
                configurable: true
            });
        }
    }
} //# sourceMappingURL=action-validate.js.map
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+nextjs@6.36.5+3439e0367b3d7557/node_modules/@clerk/nextjs/dist/esm/app-router/keyless-actions.js [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/* __next_internal_action_entry_do_not_use__ [{"0055bb1370ada9b6c3630005e291f884d45fd01941":"createOrReadKeylessAction","00665ef1730ede2d4b20ae45695fe19a98f3d83cd1":"detectKeylessEnvDriftAction","00de3307660e5009192780ff2580cc42ae43e7cf82":"deleteKeylessAction","409575b8cb54dd7ced5e2c574625cc2991c3c6ce9c":"syncKeylessConfigAction"},"",""] */ __turbopack_context__.s([
    "createOrReadKeylessAction",
    ()=>createOrReadKeylessAction,
    "deleteKeylessAction",
    ()=>deleteKeylessAction,
    "detectKeylessEnvDriftAction",
    ()=>detectKeylessEnvDriftAction,
    "syncKeylessConfigAction",
    ()=>syncKeylessConfigAction
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/dist/build/webpack/loaders/next-flight-loader/server-reference.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$headers$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/headers.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$api$2f$navigation$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/dist/api/navigation.react-server.js [app-rsc] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$client$2f$components$2f$navigation$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/dist/client/components/navigation.react-server.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$server$2f$errorThrower$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+nextjs@6.36.5+3439e0367b3d7557/node_modules/@clerk/nextjs/dist/esm/server/errorThrower.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$server$2f$headers$2d$utils$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+nextjs@6.36.5+3439e0367b3d7557/node_modules/@clerk/nextjs/dist/esm/server/headers-utils.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$server$2f$keyless$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+nextjs@6.36.5+3439e0367b3d7557/node_modules/@clerk/nextjs/dist/esm/server/keyless.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$utils$2f$feature$2d$flags$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+nextjs@6.36.5+3439e0367b3d7557/node_modules/@clerk/nextjs/dist/esm/utils/feature-flags.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$validate$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/dist/build/webpack/loaders/next-flight-loader/action-validate.js [app-rsc] (ecmascript)");
;
;
;
;
;
;
;
const keylessCookieConfig = {
    secure: false,
    httpOnly: false,
    sameSite: "lax"
};
async function syncKeylessConfigAction(args) {
    const { claimUrl, publishableKey, secretKey, returnUrl } = args;
    const cookieStore = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$headers$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["cookies"])();
    const request = new Request("https://placeholder.com", {
        headers: await (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$headers$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["headers"])()
    });
    const keyless = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$server$2f$keyless$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getKeylessCookieValue"])((name)=>{
        var _a;
        return (_a = cookieStore.get(name)) == null ? void 0 : _a.value;
    });
    const pksMatch = (keyless == null ? void 0 : keyless.publishableKey) === publishableKey;
    const sksMatch = (keyless == null ? void 0 : keyless.secretKey) === secretKey;
    if (pksMatch && sksMatch) {
        return;
    }
    cookieStore.set(await (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$server$2f$keyless$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getKeylessCookieName"])(), JSON.stringify({
        claimUrl,
        publishableKey,
        secretKey
    }), keylessCookieConfig);
    if ((0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$server$2f$headers$2d$utils$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["detectClerkMiddleware"])(request)) {
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$client$2f$components$2f$navigation$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["redirect"])(`/clerk-sync-keyless?returnUrl=${returnUrl}`, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$client$2f$components$2f$navigation$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["RedirectType"].replace);
        return;
    }
    return;
}
async function createOrReadKeylessAction() {
    if (!__TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$utils$2f$feature$2d$flags$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["canUseKeyless"]) {
        return null;
    }
    const result = await __turbopack_context__.A("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+nextjs@6.36.5+3439e0367b3d7557/node_modules/@clerk/nextjs/dist/esm/server/keyless-node.js [app-rsc] (ecmascript, async loader)").then((m)=>m.createOrReadKeyless()).catch(()=>null);
    if (!result) {
        __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$server$2f$errorThrower$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["errorThrower"].throwMissingPublishableKeyError();
        return null;
    }
    const { clerkDevelopmentCache, createKeylessModeMessage } = await __turbopack_context__.A("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+nextjs@6.36.5+3439e0367b3d7557/node_modules/@clerk/nextjs/dist/esm/server/keyless-log-cache.js [app-rsc] (ecmascript, async loader)");
    clerkDevelopmentCache == null ? void 0 : clerkDevelopmentCache.log({
        cacheKey: result.publishableKey,
        msg: createKeylessModeMessage(result)
    });
    const { claimUrl, publishableKey, secretKey, apiKeysUrl } = result;
    void (await (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$headers$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["cookies"])()).set(await (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$server$2f$keyless$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getKeylessCookieName"])(), JSON.stringify({
        claimUrl,
        publishableKey,
        secretKey
    }), keylessCookieConfig);
    return {
        claimUrl,
        publishableKey,
        apiKeysUrl
    };
}
async function deleteKeylessAction() {
    if (!__TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$utils$2f$feature$2d$flags$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["canUseKeyless"]) {
        return;
    }
    await __turbopack_context__.A("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+nextjs@6.36.5+3439e0367b3d7557/node_modules/@clerk/nextjs/dist/esm/server/keyless-node.js [app-rsc] (ecmascript, async loader)").then((m)=>m.removeKeyless()).catch(()=>{});
    return;
}
async function detectKeylessEnvDriftAction() {
    if (!__TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$utils$2f$feature$2d$flags$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["canUseKeyless"]) {
        return;
    }
    try {
        const { detectKeylessEnvDrift } = await __turbopack_context__.A("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+nextjs@6.36.5+3439e0367b3d7557/node_modules/@clerk/nextjs/dist/esm/server/keyless-telemetry.js [app-rsc] (ecmascript, async loader)");
        await detectKeylessEnvDrift();
    } catch  {}
}
;
;
(0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$validate$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["ensureServerEntryExports"])([
    syncKeylessConfigAction,
    createOrReadKeylessAction,
    deleteKeylessAction,
    detectKeylessEnvDriftAction
]);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(syncKeylessConfigAction, "409575b8cb54dd7ced5e2c574625cc2991c3c6ce9c", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(createOrReadKeylessAction, "0055bb1370ada9b6c3630005e291f884d45fd01941", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(deleteKeylessAction, "00de3307660e5009192780ff2580cc42ae43e7cf82", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(detectKeylessEnvDriftAction, "00665ef1730ede2d4b20ae45695fe19a98f3d83cd1", null);
}),
"[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+nextjs@6.36.5+3439e0367b3d7557/node_modules/@clerk/nextjs/dist/esm/app-router/server-actions.js [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/* __next_internal_action_entry_do_not_use__ [{"00ab915cd3d75d2eb13e8cea658a71e51773ba2a6d":"invalidateCacheAction"},"",""] */ __turbopack_context__.s([
    "invalidateCacheAction",
    ()=>invalidateCacheAction
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/dist/build/webpack/loaders/next-flight-loader/server-reference.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$headers$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/headers.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$validate$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/next@16.1.0+bbbf7eacaabc9320/node_modules/next/dist/build/webpack/loaders/next-flight-loader/action-validate.js [app-rsc] (ecmascript)");
;
;
async function invalidateCacheAction() {
    void (await (0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$headers$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["cookies"])()).delete(`__clerk_invalidate_cache_cookie_${Date.now()}`);
}
;
;
(0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$validate$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["ensureServerEntryExports"])([
    invalidateCacheAction
]);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f$next$40$16$2e$1$2e$0$2b$bbbf7eacaabc9320$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(invalidateCacheAction, "00ab915cd3d75d2eb13e8cea658a71e51773ba2a6d", null);
}),
"[project]/code/planetaryescape/blah.chat/apps/web/.next-internal/server/app/page/actions.js { ACTIONS_MODULE0 => \"[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+nextjs@6.36.5+3439e0367b3d7557/node_modules/@clerk/nextjs/dist/esm/app-router/keyless-actions.js [app-rsc] (ecmascript)\", ACTIONS_MODULE1 => \"[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+nextjs@6.36.5+3439e0367b3d7557/node_modules/@clerk/nextjs/dist/esm/app-router/server-actions.js [app-rsc] (ecmascript)\" } [app-rsc] (server actions loader, ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([]);
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$app$2d$router$2f$keyless$2d$actions$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+nextjs@6.36.5+3439e0367b3d7557/node_modules/@clerk/nextjs/dist/esm/app-router/keyless-actions.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$app$2d$router$2f$server$2d$actions$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+nextjs@6.36.5+3439e0367b3d7557/node_modules/@clerk/nextjs/dist/esm/app-router/server-actions.js [app-rsc] (ecmascript)");
;
;
;
}),
"[project]/code/planetaryescape/blah.chat/apps/web/.next-internal/server/app/page/actions.js { ACTIONS_MODULE0 => \"[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+nextjs@6.36.5+3439e0367b3d7557/node_modules/@clerk/nextjs/dist/esm/app-router/keyless-actions.js [app-rsc] (ecmascript)\", ACTIONS_MODULE1 => \"[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+nextjs@6.36.5+3439e0367b3d7557/node_modules/@clerk/nextjs/dist/esm/app-router/server-actions.js [app-rsc] (ecmascript)\" } [app-rsc] (server actions loader, ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "0055bb1370ada9b6c3630005e291f884d45fd01941",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$app$2d$router$2f$keyless$2d$actions$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createOrReadKeylessAction"],
    "00665ef1730ede2d4b20ae45695fe19a98f3d83cd1",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$app$2d$router$2f$keyless$2d$actions$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["detectKeylessEnvDriftAction"],
    "00ab915cd3d75d2eb13e8cea658a71e51773ba2a6d",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$app$2d$router$2f$server$2d$actions$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["invalidateCacheAction"]
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$apps$2f$web$2f2e$next$2d$internal$2f$server$2f$app$2f$page$2f$actions$2e$js__$7b$__ACTIONS_MODULE0__$3d3e$__$225b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$app$2d$router$2f$keyless$2d$actions$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29222c$__ACTIONS_MODULE1__$3d3e$__$225b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$app$2d$router$2f$server$2d$actions$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$2922$__$7d$__$5b$app$2d$rsc$5d$__$28$server__actions__loader$2c$__ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i('[project]/code/planetaryescape/blah.chat/apps/web/.next-internal/server/app/page/actions.js { ACTIONS_MODULE0 => "[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+nextjs@6.36.5+3439e0367b3d7557/node_modules/@clerk/nextjs/dist/esm/app-router/keyless-actions.js [app-rsc] (ecmascript)", ACTIONS_MODULE1 => "[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+nextjs@6.36.5+3439e0367b3d7557/node_modules/@clerk/nextjs/dist/esm/app-router/server-actions.js [app-rsc] (ecmascript)" } [app-rsc] (server actions loader, ecmascript) <locals>');
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$app$2d$router$2f$keyless$2d$actions$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+nextjs@6.36.5+3439e0367b3d7557/node_modules/@clerk/nextjs/dist/esm/app-router/keyless-actions.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$code$2f$planetaryescape$2f$blah$2e$chat$2f$node_modules$2f2e$bun$2f40$clerk$2b$nextjs$40$6$2e$36$2e$5$2b$3439e0367b3d7557$2f$node_modules$2f40$clerk$2f$nextjs$2f$dist$2f$esm$2f$app$2d$router$2f$server$2d$actions$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/code/planetaryescape/blah.chat/node_modules/.bun/@clerk+nextjs@6.36.5+3439e0367b3d7557/node_modules/@clerk/nextjs/dist/esm/app-router/server-actions.js [app-rsc] (ecmascript)");
}),
];

//# sourceMappingURL=code_planetaryescape_blah_chat_bcdbd202._.js.map