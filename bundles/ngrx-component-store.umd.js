(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('rxjs'), require('rxjs/operators'), require('@angular/core')) :
    typeof define === 'function' && define.amd ? define('@ngrx/component-store', ['exports', 'rxjs', 'rxjs/operators', '@angular/core'], factory) :
    (global = global || self, factory((global.ngrx = global.ngrx || {}, global.ngrx['component-store'] = {}), global.rxjs, global.rxjs.operators, global.ng.core));
}(this, (function (exports, rxjs, operators, core) { 'use strict';

    /*! *****************************************************************************
    Copyright (c) Microsoft Corporation.

    Permission to use, copy, modify, and/or distribute this software for any
    purpose with or without fee is hereby granted.

    THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
    REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
    AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
    INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
    LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
    OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
    PERFORMANCE OF THIS SOFTWARE.
    ***************************************************************************** */
    /* global Reflect, Promise */
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b)
                if (b.hasOwnProperty(p))
                    d[p] = b[p]; };
        return extendStatics(d, b);
    };
    function __extends(d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    }
    var __assign = function () {
        __assign = Object.assign || function __assign(t) {
            for (var s, i = 1, n = arguments.length; i < n; i++) {
                s = arguments[i];
                for (var p in s)
                    if (Object.prototype.hasOwnProperty.call(s, p))
                        t[p] = s[p];
            }
            return t;
        };
        return __assign.apply(this, arguments);
    };
    function __rest(s, e) {
        var t = {};
        for (var p in s)
            if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
                t[p] = s[p];
        if (s != null && typeof Object.getOwnPropertySymbols === "function")
            for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
                if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                    t[p[i]] = s[p[i]];
            }
        return t;
    }
    function __decorate(decorators, target, key, desc) {
        var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
        if (typeof Reflect === "object" && typeof Reflect.decorate === "function")
            r = Reflect.decorate(decorators, target, key, desc);
        else
            for (var i = decorators.length - 1; i >= 0; i--)
                if (d = decorators[i])
                    r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
        return c > 3 && r && Object.defineProperty(target, key, r), r;
    }
    function __param(paramIndex, decorator) {
        return function (target, key) { decorator(target, key, paramIndex); };
    }
    function __metadata(metadataKey, metadataValue) {
        if (typeof Reflect === "object" && typeof Reflect.metadata === "function")
            return Reflect.metadata(metadataKey, metadataValue);
    }
    function __awaiter(thisArg, _arguments, P, generator) {
        function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
        return new (P || (P = Promise))(function (resolve, reject) {
            function fulfilled(value) { try {
                step(generator.next(value));
            }
            catch (e) {
                reject(e);
            } }
            function rejected(value) { try {
                step(generator["throw"](value));
            }
            catch (e) {
                reject(e);
            } }
            function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
            step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
    }
    function __generator(thisArg, body) {
        var _ = { label: 0, sent: function () { if (t[0] & 1)
                throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
        return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function () { return this; }), g;
        function verb(n) { return function (v) { return step([n, v]); }; }
        function step(op) {
            if (f)
                throw new TypeError("Generator is already executing.");
            while (_)
                try {
                    if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done)
                        return t;
                    if (y = 0, t)
                        op = [op[0] & 2, t.value];
                    switch (op[0]) {
                        case 0:
                        case 1:
                            t = op;
                            break;
                        case 4:
                            _.label++;
                            return { value: op[1], done: false };
                        case 5:
                            _.label++;
                            y = op[1];
                            op = [0];
                            continue;
                        case 7:
                            op = _.ops.pop();
                            _.trys.pop();
                            continue;
                        default:
                            if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) {
                                _ = 0;
                                continue;
                            }
                            if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) {
                                _.label = op[1];
                                break;
                            }
                            if (op[0] === 6 && _.label < t[1]) {
                                _.label = t[1];
                                t = op;
                                break;
                            }
                            if (t && _.label < t[2]) {
                                _.label = t[2];
                                _.ops.push(op);
                                break;
                            }
                            if (t[2])
                                _.ops.pop();
                            _.trys.pop();
                            continue;
                    }
                    op = body.call(thisArg, _);
                }
                catch (e) {
                    op = [6, e];
                    y = 0;
                }
                finally {
                    f = t = 0;
                }
            if (op[0] & 5)
                throw op[1];
            return { value: op[0] ? op[1] : void 0, done: true };
        }
    }
    var __createBinding = Object.create ? (function (o, m, k, k2) {
        if (k2 === undefined)
            k2 = k;
        Object.defineProperty(o, k2, { enumerable: true, get: function () { return m[k]; } });
    }) : (function (o, m, k, k2) {
        if (k2 === undefined)
            k2 = k;
        o[k2] = m[k];
    });
    function __exportStar(m, exports) {
        for (var p in m)
            if (p !== "default" && !exports.hasOwnProperty(p))
                __createBinding(exports, m, p);
    }
    function __values(o) {
        var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
        if (m)
            return m.call(o);
        if (o && typeof o.length === "number")
            return {
                next: function () {
                    if (o && i >= o.length)
                        o = void 0;
                    return { value: o && o[i++], done: !o };
                }
            };
        throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
    }
    function __read(o, n) {
        var m = typeof Symbol === "function" && o[Symbol.iterator];
        if (!m)
            return o;
        var i = m.call(o), r, ar = [], e;
        try {
            while ((n === void 0 || n-- > 0) && !(r = i.next()).done)
                ar.push(r.value);
        }
        catch (error) {
            e = { error: error };
        }
        finally {
            try {
                if (r && !r.done && (m = i["return"]))
                    m.call(i);
            }
            finally {
                if (e)
                    throw e.error;
            }
        }
        return ar;
    }
    function __spread() {
        for (var ar = [], i = 0; i < arguments.length; i++)
            ar = ar.concat(__read(arguments[i]));
        return ar;
    }
    function __spreadArrays() {
        for (var s = 0, i = 0, il = arguments.length; i < il; i++)
            s += arguments[i].length;
        for (var r = Array(s), k = 0, i = 0; i < il; i++)
            for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
                r[k] = a[j];
        return r;
    }
    ;
    function __await(v) {
        return this instanceof __await ? (this.v = v, this) : new __await(v);
    }
    function __asyncGenerator(thisArg, _arguments, generator) {
        if (!Symbol.asyncIterator)
            throw new TypeError("Symbol.asyncIterator is not defined.");
        var g = generator.apply(thisArg, _arguments || []), i, q = [];
        return i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i;
        function verb(n) { if (g[n])
            i[n] = function (v) { return new Promise(function (a, b) { q.push([n, v, a, b]) > 1 || resume(n, v); }); }; }
        function resume(n, v) { try {
            step(g[n](v));
        }
        catch (e) {
            settle(q[0][3], e);
        } }
        function step(r) { r.value instanceof __await ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r); }
        function fulfill(value) { resume("next", value); }
        function reject(value) { resume("throw", value); }
        function settle(f, v) { if (f(v), q.shift(), q.length)
            resume(q[0][0], q[0][1]); }
    }
    function __asyncDelegator(o) {
        var i, p;
        return i = {}, verb("next"), verb("throw", function (e) { throw e; }), verb("return"), i[Symbol.iterator] = function () { return this; }, i;
        function verb(n, f) { i[n] = o[n] ? function (v) { return (p = !p) ? { value: __await(o[n](v)), done: n === "return" } : f ? f(v) : v; } : f; }
    }
    function __asyncValues(o) {
        if (!Symbol.asyncIterator)
            throw new TypeError("Symbol.asyncIterator is not defined.");
        var m = o[Symbol.asyncIterator], i;
        return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
        function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
        function settle(resolve, reject, d, v) { Promise.resolve(v).then(function (v) { resolve({ value: v, done: d }); }, reject); }
    }
    function __makeTemplateObject(cooked, raw) {
        if (Object.defineProperty) {
            Object.defineProperty(cooked, "raw", { value: raw });
        }
        else {
            cooked.raw = raw;
        }
        return cooked;
    }
    ;
    var __setModuleDefault = Object.create ? (function (o, v) {
        Object.defineProperty(o, "default", { enumerable: true, value: v });
    }) : function (o, v) {
        o["default"] = v;
    };
    function __importStar(mod) {
        if (mod && mod.__esModule)
            return mod;
        var result = {};
        if (mod != null)
            for (var k in mod)
                if (Object.hasOwnProperty.call(mod, k))
                    __createBinding(result, mod, k);
        __setModuleDefault(result, mod);
        return result;
    }
    function __importDefault(mod) {
        return (mod && mod.__esModule) ? mod : { default: mod };
    }
    function __classPrivateFieldGet(receiver, privateMap) {
        if (!privateMap.has(receiver)) {
            throw new TypeError("attempted to get private field on non-instance");
        }
        return privateMap.get(receiver);
    }
    function __classPrivateFieldSet(receiver, privateMap, value) {
        if (!privateMap.has(receiver)) {
            throw new TypeError("attempted to set private field on non-instance");
        }
        privateMap.set(receiver, value);
        return value;
    }

    /**
     * @fileoverview added by tsickle
     * Generated from: src/debounce-sync.ts
     * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
     */
    /**
     * @template T
     * @return {?}
     */
    function debounceSync() {
        return ( /**
         * @param {?} source
         * @return {?}
         */function (source) { return new rxjs.Observable(( /**
         * @param {?} observer
         * @return {?}
         */function (observer) {
            /** @type {?} */
            var actionSubscription;
            /** @type {?} */
            var actionValue;
            /** @type {?} */
            var rootSubscription = new rxjs.Subscription();
            rootSubscription.add(source.subscribe({
                complete: ( /**
                 * @return {?}
                 */function () {
                    if (actionSubscription) {
                        observer.next(actionValue);
                    }
                    observer.complete();
                }),
                error: ( /**
                 * @param {?} error
                 * @return {?}
                 */function (error) {
                    observer.error(error);
                }),
                next: ( /**
                 * @param {?} value
                 * @return {?}
                 */function (value) {
                    actionValue = value;
                    if (!actionSubscription) {
                        actionSubscription = rxjs.asapScheduler.schedule(( /**
                         * @return {?}
                         */function () {
                            observer.next(actionValue);
                            actionSubscription = undefined;
                        }));
                        rootSubscription.add(actionSubscription);
                    }
                }),
            }));
            return rootSubscription;
        })); });
    }

    /**
     * @record
     */
    function SelectConfig() { }
    if (false) {
        /** @type {?|undefined} */
        SelectConfig.prototype.debounce;
    }
    /** @type {?} */
    var initialStateToken = new core.InjectionToken('ComponentStore InitState');
    /**
     * @template T
     */
    var ComponentStore = /** @class */ (function () {
        /**
         * @param {?=} defaultState
         */
        function ComponentStore(defaultState) {
            // Should be used only in ngOnDestroy.
            this.destroySubject$ = new rxjs.ReplaySubject(1);
            // Exposed to any extending Store to be used for the teardown.
            this.destroy$ = this.destroySubject$.asObservable();
            this.stateSubject$ = new rxjs.ReplaySubject(1);
            this.isInitialized = false;
            this.notInitializedErrorMessage = this.constructor.name + " has not been initialized yet. " +
                "Please make sure it is initialized before updating/getting.";
            // Needs to be after destroy$ is declared because it's used in select.
            this.state$ = this.select(( /**
             * @param {?} s
             * @return {?}
             */function (s) { return s; }));
            // State can be initialized either through constructor or setState.
            if (defaultState) {
                this.initState(defaultState);
            }
        }
        /**
         * Completes all relevant Observable streams.
         * @return {?}
         */
        ComponentStore.prototype.ngOnDestroy = function () {
            this.stateSubject$.complete();
            this.destroySubject$.next();
        };
        /**
         * Creates an updater.
         *
         * Throws an error if updater is called with synchronous values (either
         * imperative value or Observable that is synchronous) before ComponentStore
         * is initialized. If called with async Observable before initialization then
         * state will not be updated and subscription would be closed.
         *
         * @template V
         * @param {?} updaterFn A static updater function that takes 2 parameters (the
         * current state and an argument object) and returns a new instance of the
         * state.
         * @return {?} A function that accepts one argument which is forwarded as the
         *     second argument to `updaterFn`. Every time this function is called
         *     subscribers will be notified of the state change.
         */
        ComponentStore.prototype.updater = function (updaterFn) {
            var _this = this;
            return ( /** @type {?} */((( /**
             * @param {?=} observableOrValue
             * @return {?}
             */function (observableOrValue) {
                /** @type {?} */
                var initializationError;
                // We can receive either the value or an observable. In case it's a
                // simple value, we'll wrap it with `of` operator to turn it into
                // Observable.
                /** @type {?} */
                var observable$ = rxjs.isObservable(observableOrValue)
                    ? observableOrValue
                    : rxjs.of(observableOrValue);
                /** @type {?} */
                var subscription = observable$
                    .pipe(operators.concatMap(( /**
             * @param {?} value
             * @return {?}
             */function (value) { return _this.isInitialized
                    ? // Push the value into queueScheduler
                        rxjs.scheduled([value], rxjs.queueScheduler).pipe(operators.withLatestFrom(_this.stateSubject$))
                    : // If state was not initialized, we'll throw an error.
                        rxjs.throwError(new Error(_this.notInitializedErrorMessage)); })), operators.takeUntil(_this.destroy$))
                    .subscribe({
                    next: ( /**
                     * @param {?} __0
                     * @return {?}
                     */function (_a) {
                        var _b = __read(_a, 2), value = _b[0], currentState = _b[1];
                        _this.stateSubject$.next(updaterFn(currentState, ( /** @type {?} */(value))));
                    }),
                    error: ( /**
                     * @param {?} error
                     * @return {?}
                     */function (error) {
                        initializationError = error;
                        _this.stateSubject$.error(error);
                    }),
                });
                if (initializationError) {
                    // prettier-ignore
                    throw /** @type {!Error} */ (initializationError);
                }
                return subscription;
            }))));
        };
        /**
         * Initializes state. If it was already initialized then it resets the
         * state.
         * @private
         * @param {?} state
         * @return {?}
         */
        ComponentStore.prototype.initState = function (state) {
            var _this = this;
            rxjs.scheduled([state], rxjs.queueScheduler).subscribe(( /**
             * @param {?} s
             * @return {?}
             */function (s) {
                _this.isInitialized = true;
                _this.stateSubject$.next(s);
            }));
        };
        /**
         * Sets the state specific value.
         * @param {?} stateOrUpdaterFn object of the same type as the state or an
         * updaterFn, returning such object.
         * @return {?}
         */
        ComponentStore.prototype.setState = function (stateOrUpdaterFn) {
            if (typeof stateOrUpdaterFn !== 'function') {
                this.initState(stateOrUpdaterFn);
            }
            else {
                this.updater(( /** @type {?} */(stateOrUpdaterFn)))();
            }
        };
        /**
         * @protected
         * @template R
         * @param {?=} projector
         * @return {?}
         */
        ComponentStore.prototype.get = function (projector) {
            if (!this.isInitialized) {
                throw new Error(this.notInitializedErrorMessage);
            }
            /** @type {?} */
            var value;
            this.stateSubject$.pipe(operators.take(1)).subscribe(( /**
             * @param {?} state
             * @return {?}
             */function (state) {
                value = projector ? projector(state) : state;
            }));
            return ( /** @type {?} */(value));
        };
        /**
         * @template O, R, ProjectorFn
         * @param {...?} args
         * @return {?}
         */
        ComponentStore.prototype.select = function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            var _a = processSelectorArgs(args), observables = _a.observables, projector = _a.projector, config = _a.config;
            /** @type {?} */
            var observable$;
            // If there are no Observables to combine, then we'll just map the value.
            if (observables.length === 0) {
                observable$ = this.stateSubject$.pipe(config.debounce ? debounceSync() : ( /**
                 * @param {?} source$
                 * @return {?}
                 */function (source$) { return source$; }), operators.map(projector));
            }
            else {
                // If there are multiple arguments, then we're aggregating selectors, so we need
                // to take the combineLatest of them before calling the map function.
                observable$ = rxjs.combineLatest(observables).pipe(config.debounce ? debounceSync() : ( /**
                 * @param {?} source$
                 * @return {?}
                 */function (source$) { return source$; }), operators.map(( /**
                 * @param {?} projectorArgs
                 * @return {?}
                 */function (projectorArgs) { return projector.apply(void 0, __spread(projectorArgs)); })));
            }
            return (( /** @type {?} */(observable$))).pipe(operators.distinctUntilChanged(), operators.shareReplay({
                refCount: true,
                bufferSize: 1,
            }), operators.takeUntil(this.destroy$));
        };
        /**
         * Creates an effect.
         *
         * This effect is subscribed to for the life of the \@Component.
         * @template ProvidedType, OriginType, ObservableType, ReturnType
         * @param {?} generator A function that takes an origin Observable input and
         *     returns an Observable. The Observable that is returned will be
         *     subscribed to for the life of the component.
         * @return {?} A function that, when called, will trigger the origin Observable.
         */
        ComponentStore.prototype.effect = function (generator) {
            var _this = this;
            /** @type {?} */
            var origin$ = new rxjs.Subject();
            generator(( /** @type {?} */(origin$)))
                // tied to the lifecycle 👇 of ComponentStore
                .pipe(operators.takeUntil(this.destroy$))
                .subscribe();
            return ( /** @type {?} */((( /** @type {?} */((( /**
             * @param {?=} observableOrValue
             * @return {?}
             */function (observableOrValue) {
                /** @type {?} */
                var observable$ = rxjs.isObservable(observableOrValue)
                    ? observableOrValue
                    : rxjs.of(observableOrValue);
                return observable$.pipe(operators.takeUntil(_this.destroy$)).subscribe(( /**
                 * @param {?} value
                 * @return {?}
                 */function (value) {
                    // any new 👇 value is pushed into a stream
                    origin$.next(value);
                }));
            })))))));
        };
        return ComponentStore;
    }());
    ComponentStore.decorators = [
        { type: core.Injectable }
    ];
    /** @nocollapse */
    ComponentStore.ctorParameters = function () { return [
        { type: undefined, decorators: [{ type: core.Optional }, { type: core.Inject, args: [initialStateToken,] }] }
    ]; };
    if (false) {
        /**
         * @type {?}
         * @private
         */
        ComponentStore.prototype.destroySubject$;
        /** @type {?} */
        ComponentStore.prototype.destroy$;
        /**
         * @type {?}
         * @private
         */
        ComponentStore.prototype.stateSubject$;
        /**
         * @type {?}
         * @private
         */
        ComponentStore.prototype.isInitialized;
        /**
         * @type {?}
         * @private
         */
        ComponentStore.prototype.notInitializedErrorMessage;
        /** @type {?} */
        ComponentStore.prototype.state$;
    }
    /**
     * @template O, R, ProjectorFn
     * @param {?} args
     * @return {?}
     */
    function processSelectorArgs(args) {
        /** @type {?} */
        var selectorArgs = Array.from(args);
        // Assign default values.
        /** @type {?} */
        var config = { debounce: false };
        /** @type {?} */
        var projector;
        // Last argument is either projector or config
        /** @type {?} */
        var projectorOrConfig = ( /** @type {?} */(selectorArgs.pop()));
        if (typeof projectorOrConfig !== 'function') {
            // We got the config as the last argument, replace any default values with it.
            config = Object.assign(Object.assign({}, config), projectorOrConfig);
            // Pop the next args, which would be the projector fn.
            projector = ( /** @type {?} */(selectorArgs.pop()));
        }
        else {
            projector = projectorOrConfig;
        }
        // The Observables to combine, if there are any.
        /** @type {?} */
        var observables = ( /** @type {?} */(selectorArgs));
        return {
            observables: observables,
            projector: projector,
            config: config,
        };
    }

    /**
     * @fileoverview added by tsickle
     * Generated from: src/index.ts
     * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
     */

    /**
     * @fileoverview added by tsickle
     * Generated from: public_api.ts
     * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
     */

    /**
     * @fileoverview added by tsickle
     * Generated from: index.ts
     * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
     */

    /**
     * @fileoverview added by tsickle
     * Generated from: ngrx-component-store.ts
     * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
     */

    exports.ComponentStore = ComponentStore;
    exports.initialStateToken = initialStateToken;

    Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=ngrx-component-store.umd.js.map
