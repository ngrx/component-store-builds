(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('rxjs'), require('rxjs/operators'), require('@angular/core')) :
    typeof define === 'function' && define.amd ? define('@ngrx/component-store', ['exports', 'rxjs', 'rxjs/operators', '@angular/core'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory((global.ngrx = global.ngrx || {}, global.ngrx['component-store'] = {}), global.rxjs, global.rxjs.operators, global.ng.core));
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
                if (Object.prototype.hasOwnProperty.call(b, p))
                    d[p] = b[p]; };
        return extendStatics(d, b);
    };
    function __extends(d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
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
    function __exportStar(m, o) {
        for (var p in m)
            if (p !== "default" && !Object.prototype.hasOwnProperty.call(o, p))
                __createBinding(o, m, p);
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
    /** @deprecated */
    function __spread() {
        for (var ar = [], i = 0; i < arguments.length; i++)
            ar = ar.concat(__read(arguments[i]));
        return ar;
    }
    /** @deprecated */
    function __spreadArrays() {
        for (var s = 0, i = 0, il = arguments.length; i < il; i++)
            s += arguments[i].length;
        for (var r = Array(s), k = 0, i = 0; i < il; i++)
            for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
                r[k] = a[j];
        return r;
    }
    function __spreadArray(to, from) {
        for (var i = 0, il = from.length, j = to.length; i < il; i++, j++)
            to[j] = from[i];
        return to;
    }
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
                if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k))
                    __createBinding(result, mod, k);
        __setModuleDefault(result, mod);
        return result;
    }
    function __importDefault(mod) {
        return (mod && mod.__esModule) ? mod : { default: mod };
    }
    function __classPrivateFieldGet(receiver, state, kind, f) {
        if (kind === "a" && !f)
            throw new TypeError("Private accessor was defined without a getter");
        if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver))
            throw new TypeError("Cannot read private member from an object whose class did not declare it");
        return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
    }
    function __classPrivateFieldSet(receiver, state, value, kind, f) {
        if (kind === "m")
            throw new TypeError("Private method is not writable");
        if (kind === "a" && !f)
            throw new TypeError("Private accessor was defined without a setter");
        if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver))
            throw new TypeError("Cannot write private member to an object whose class did not declare it");
        return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
    }

    /**
     * @license MIT License
     *
     * Copyright (c) 2017-2020 Nicholas Jamieson and contributors
     *
     * Permission is hereby granted, free of charge, to any person obtaining a copy
     * of this software and associated documentation files (the "Software"), to deal
     * in the Software without restriction, including without limitation the rights
     * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
     * copies of the Software, and to permit persons to whom the Software is
     * furnished to do so, subject to the following conditions:
     *
     * The above copyright notice and this permission notice shall be included in all
     * copies or substantial portions of the Software.
     *
     * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
     * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
     * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
     * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
     * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
     * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
     * SOFTWARE.
     */
    function debounceSync() {
        return function (source) { return new rxjs.Observable(function (observer) {
            var actionSubscription;
            var actionValue;
            var rootSubscription = new rxjs.Subscription();
            rootSubscription.add(source.subscribe({
                complete: function () {
                    if (actionSubscription) {
                        observer.next(actionValue);
                    }
                    observer.complete();
                },
                error: function (error) {
                    observer.error(error);
                },
                next: function (value) {
                    actionValue = value;
                    if (!actionSubscription) {
                        actionSubscription = rxjs.asapScheduler.schedule(function () {
                            observer.next(actionValue);
                            actionSubscription = undefined;
                        });
                        rootSubscription.add(actionSubscription);
                    }
                },
            }));
            return rootSubscription;
        }); };
    }

    var INITIAL_STATE_TOKEN = new core.InjectionToken('@ngrx/component-store Initial State');
    var ComponentStore = /** @class */ (function () {
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
            this.state$ = this.select(function (s) { return s; });
            // State can be initialized either through constructor or setState.
            if (defaultState) {
                this.initState(defaultState);
            }
        }
        /** Completes all relevant Observable streams. */
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
         * @param updaterFn A static updater function that takes 2 parameters (the
         * current state and an argument object) and returns a new instance of the
         * state.
         * @return A function that accepts one argument which is forwarded as the
         *     second argument to `updaterFn`. Every time this function is called
         *     subscribers will be notified of the state change.
         */
        ComponentStore.prototype.updater = function (updaterFn) {
            var _this = this;
            return (function (observableOrValue) {
                var initializationError;
                // We can receive either the value or an observable. In case it's a
                // simple value, we'll wrap it with `of` operator to turn it into
                // Observable.
                var observable$ = rxjs.isObservable(observableOrValue)
                    ? observableOrValue
                    : rxjs.of(observableOrValue);
                var subscription = observable$
                    .pipe(operators.concatMap(function (value) { return _this.isInitialized
                    ? // Push the value into queueScheduler
                        rxjs.scheduled([value], rxjs.queueScheduler).pipe(operators.withLatestFrom(_this.stateSubject$))
                    : // If state was not initialized, we'll throw an error.
                        rxjs.throwError(new Error(_this.notInitializedErrorMessage)); }), operators.takeUntil(_this.destroy$))
                    .subscribe({
                    next: function (_a) {
                        var _b = __read(_a, 2), value = _b[0], currentState = _b[1];
                        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                        _this.stateSubject$.next(updaterFn(currentState, value));
                    },
                    error: function (error) {
                        initializationError = error;
                        _this.stateSubject$.error(error);
                    },
                });
                if (initializationError) {
                    // prettier-ignore
                    throw /** @type {!Error} */ (initializationError);
                }
                return subscription;
            });
        };
        /**
         * Initializes state. If it was already initialized then it resets the
         * state.
         */
        ComponentStore.prototype.initState = function (state) {
            var _this = this;
            rxjs.scheduled([state], rxjs.queueScheduler).subscribe(function (s) {
                _this.isInitialized = true;
                _this.stateSubject$.next(s);
            });
        };
        /**
         * Sets the state specific value.
         * @param stateOrUpdaterFn object of the same type as the state or an
         * updaterFn, returning such object.
         */
        ComponentStore.prototype.setState = function (stateOrUpdaterFn) {
            if (typeof stateOrUpdaterFn !== 'function') {
                this.initState(stateOrUpdaterFn);
            }
            else {
                this.updater(stateOrUpdaterFn)();
            }
        };
        /**
         * Patches the state with provided partial state.
         *
         * @param partialStateOrUpdaterFn a partial state or a partial updater
         * function that accepts the state and returns the partial state.
         * @throws Error if the state is not initialized.
         */
        ComponentStore.prototype.patchState = function (partialStateOrUpdaterFn) {
            var patchedState = typeof partialStateOrUpdaterFn === 'function'
                ? partialStateOrUpdaterFn(this.get())
                : partialStateOrUpdaterFn;
            this.updater(function (state, partialState) { return (Object.assign(Object.assign({}, state), partialState)); })(patchedState);
        };
        ComponentStore.prototype.get = function (projector) {
            if (!this.isInitialized) {
                throw new Error(this.notInitializedErrorMessage);
            }
            var value;
            this.stateSubject$.pipe(operators.take(1)).subscribe(function (state) {
                value = projector ? projector(state) : state;
            });
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            return value;
        };
        ComponentStore.prototype.select = function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            var _a = processSelectorArgs(args), observables = _a.observables, projector = _a.projector, config = _a.config;
            var observable$;
            // If there are no Observables to combine, then we'll just map the value.
            if (observables.length === 0) {
                observable$ = this.stateSubject$.pipe(config.debounce ? debounceSync() : function (source$) { return source$; }, operators.map(projector));
            }
            else {
                // If there are multiple arguments, then we're aggregating selectors, so we need
                // to take the combineLatest of them before calling the map function.
                observable$ = rxjs.combineLatest(observables).pipe(config.debounce ? debounceSync() : function (source$) { return source$; }, operators.map(function (projectorArgs) { return projector.apply(void 0, __spreadArray([], __read(projectorArgs))); }));
            }
            return observable$.pipe(operators.distinctUntilChanged(), operators.shareReplay({
                refCount: true,
                bufferSize: 1,
            }), operators.takeUntil(this.destroy$));
        };
        /**
         * Creates an effect.
         *
         * This effect is subscribed to throughout the lifecycle of the ComponentStore.
         * @param generator A function that takes an origin Observable input and
         *     returns an Observable. The Observable that is returned will be
         *     subscribed to for the life of the component.
         * @return A function that, when called, will trigger the origin Observable.
         */
        ComponentStore.prototype.effect = function (generator) {
            var _this = this;
            var origin$ = new rxjs.Subject();
            generator(origin$)
                // tied to the lifecycle 👇 of ComponentStore
                .pipe(operators.takeUntil(this.destroy$))
                .subscribe();
            return (function (observableOrValue) {
                var observable$ = rxjs.isObservable(observableOrValue)
                    ? observableOrValue
                    : rxjs.of(observableOrValue);
                return observable$.pipe(operators.takeUntil(_this.destroy$)).subscribe(function (value) {
                    // any new 👇 value is pushed into a stream
                    origin$.next(value);
                });
            });
        };
        return ComponentStore;
    }());
    /** @type {!Array<{type: !Function, args: (undefined|!Array<?>)}>} */
    ComponentStore.decorators = [
        { type: core.Injectable }
    ];
    /**
     * @type {function(): !Array<(null|{
     *   type: ?,
     *   decorators: (undefined|!Array<{type: !Function, args: (undefined|!Array<?>)}>),
     * })>}
     * @nocollapse
     */
    ComponentStore.ctorParameters = function () { return [
        { type: undefined, decorators: [{ type: core.Optional }, { type: core.Inject, args: [INITIAL_STATE_TOKEN,] }] }
    ]; };
    function processSelectorArgs(args) {
        var selectorArgs = Array.from(args);
        // Assign default values.
        var config = { debounce: false };
        var projector;
        // Last argument is either projector or config
        var projectorOrConfig = selectorArgs.pop();
        if (typeof projectorOrConfig !== 'function') {
            // We got the config as the last argument, replace any default values with it.
            config = Object.assign(Object.assign({}, config), projectorOrConfig);
            // Pop the next args, which would be the projector fn.
            projector = selectorArgs.pop();
        }
        else {
            projector = projectorOrConfig;
        }
        // The Observables to combine, if there are any.
        var observables = selectorArgs;
        return {
            observables: observables,
            projector: projector,
            config: config,
        };
    }

    /**
     * Handles the response in ComponentStore effects in a safe way, without
     * additional boilerplate.
     * It enforces that the error case is handled and that the effect would still be
     * running should an error occur.
     *
     * Takes an optional third argument for a `complete` callback.
     *
     * ```typescript
     * readonly dismissedAlerts = this.effect<Alert>(alert$ => {
     *  return alert$.pipe(
     *      concatMap(
     *          (alert) => this.alertsService.dismissAlert(alert).pipe(
     *              tapResponse(
     *                 (dismissedAlert) => this.alertDismissed(dismissedAlert),
     *                 (error: { message: string }) => this.logError(error.message),
     *              ))));
     *   });
     * ```
     */
    function tapResponse(nextFn, errorFn, completeFn) {
        return function (source) { return source.pipe(operators.tap({
            next: nextFn,
            error: errorFn,
            complete: completeFn,
        }), operators.catchError(function () { return rxjs.EMPTY; })); };
    }

    /**
     * DO NOT EDIT
     *
     * This file is automatically generated at build
     */

    /**
     * Generated bundle index. Do not edit.
     */

    exports.ComponentStore = ComponentStore;
    exports.INITIAL_STATE_TOKEN = INITIAL_STATE_TOKEN;
    exports.tapResponse = tapResponse;

    Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=ngrx-component-store.umd.js.map
