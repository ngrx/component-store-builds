(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('rxjs'), require('rxjs/operators')) :
    typeof define === 'function' && define.amd ? define('@ngrx/component-store', ['exports', 'rxjs', 'rxjs/operators'], factory) :
    (global = global || self, factory((global.ngrx = global.ngrx || {}, global.ngrx['component-store'] = {}), global.rxjs, global.rxjs.operators));
}(this, (function (exports, rxjs, operators) { 'use strict';

    /**
     * @fileoverview added by tsickle
     * Generated from: src/debounceSync.ts
     * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
     */
    /**
     * @template T
     * @return {?}
     */
    function debounceSync() {
        return (/**
         * @param {?} source
         * @return {?}
         */
        function (source) {
            return new rxjs.Observable((/**
             * @param {?} observer
             * @return {?}
             */
            function (observer) {
                /** @type {?} */
                var actionSubscription;
                /** @type {?} */
                var actionValue;
                /** @type {?} */
                var rootSubscription = new rxjs.Subscription();
                rootSubscription.add(source.subscribe({
                    complete: (/**
                     * @return {?}
                     */
                    function () {
                        if (actionSubscription) {
                            observer.next(actionValue);
                        }
                        observer.complete();
                    }),
                    error: (/**
                     * @param {?} error
                     * @return {?}
                     */
                    function (error) { return observer.error(error); }),
                    next: (/**
                     * @param {?} value
                     * @return {?}
                     */
                    function (value) {
                        actionValue = value;
                        if (!actionSubscription) {
                            actionSubscription = rxjs.asapScheduler.schedule((/**
                             * @return {?}
                             */
                            function () {
                                observer.next(actionValue);
                                actionSubscription = undefined;
                            }));
                            rootSubscription.add(actionSubscription);
                        }
                    }),
                }));
                return rootSubscription;
            }));
        });
    }

    var __read = (this && this.__read) || function (o, n) {
        var m = typeof Symbol === "function" && o[Symbol.iterator];
        if (!m) return o;
        var i = m.call(o), r, ar = [], e;
        try {
            while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
        }
        catch (error) { e = { error: error }; }
        finally {
            try {
                if (r && !r.done && (m = i["return"])) m.call(i);
            }
            finally { if (e) throw e.error; }
        }
        return ar;
    };
    var __spread = (this && this.__spread) || function () {
        for (var ar = [], i = 0; i < arguments.length; i++) ar = ar.concat(__read(arguments[i]));
        return ar;
    };
    /**
     * Return type of the effect, that behaves differently based on whether the
     * argument is passed to the callback.
     * @record
     * @template T
     */
    function EffectReturnFn() { }
    /**
     * @template T
     */
    var   /**
     * @template T
     */
    ComponentStore = /** @class */ (function () {
        function ComponentStore(defaultState) {
            // Should be used only in ngOnDestroy.
            this.destroySubject$ = new rxjs.ReplaySubject(1);
            // Exposed to any extending Store to be used for the teardowns.
            this.destroy$ = this.destroySubject$.asObservable();
            this.stateSubject$ = new rxjs.ReplaySubject(1);
            this.isInitialized = false;
            // Needs to be after destroy$ is declared because it's used in select.
            this.state$ = this.select((/**
             * @param {?} s
             * @return {?}
             */
            function (s) { return s; }));
            // State can be initialized either through constructor, or initState or
            // setState.
            if (defaultState) {
                this.initState(defaultState);
            }
        }
        /** Completes all relevant Observable streams. */
        /**
         * Completes all relevant Observable streams.
         * @return {?}
         */
        ComponentStore.prototype.ngOnDestroy = /**
         * Completes all relevant Observable streams.
         * @return {?}
         */
        function () {
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
         *     second argument to `updaterFn`. Everytime this function is called
         *     subscribers will be notified of the state change.
         */
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
         *     second argument to `updaterFn`. Everytime this function is called
         *     subscribers will be notified of the state change.
         */
        ComponentStore.prototype.updater = /**
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
         *     second argument to `updaterFn`. Everytime this function is called
         *     subscribers will be notified of the state change.
         */
        function (updaterFn) {
            var _this = this;
            return (/** @type {?} */ (((/**
             * @param {?=} observableOrValue
             * @return {?}
             */
            function (observableOrValue) {
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
                    .pipe(operators.concatMap((/**
                 * @param {?} value
                 * @return {?}
                 */
                function (value) {
                    return _this.isInitialized
                        ? rxjs.of(value).pipe(operators.withLatestFrom(_this.stateSubject$))
                        : // If state was not initialized, we'll throw an error.
                            rxjs.throwError(Error(_this.constructor.name + " has not been initialized"));
                })), operators.takeUntil(_this.destroy$))
                    .subscribe({
                    next: (/**
                     * @param {?} __0
                     * @return {?}
                     */
                    function (_a) {
                        var _b = __read(_a, 2), value = _b[0], currentState = _b[1];
                        _this.stateSubject$.next(updaterFn(currentState, (/** @type {?} */ (value))));
                    }),
                    error: (/**
                     * @param {?} error
                     * @return {?}
                     */
                    function (error) {
                        initializationError = error;
                        _this.stateSubject$.error(error);
                    }),
                });
                if (initializationError) {
                    throw initializationError;
                }
                return subscription;
            }))));
        };
        /**
         * Initializes state. If it was already initialized then it resets the
         * state.
         */
        /**
         * Initializes state. If it was already initialized then it resets the
         * state.
         * @private
         * @param {?} state
         * @return {?}
         */
        ComponentStore.prototype.initState = /**
         * Initializes state. If it was already initialized then it resets the
         * state.
         * @private
         * @param {?} state
         * @return {?}
         */
        function (state) {
            this.isInitialized = true;
            this.stateSubject$.next(state);
        };
        /**
         * Sets the state specific value.
         * @param stateOrUpdaterFn object of the same type as the state or an
         * updaterFn, returning such object.
         */
        /**
         * Sets the state specific value.
         * @param {?} stateOrUpdaterFn object of the same type as the state or an
         * updaterFn, returning such object.
         * @return {?}
         */
        ComponentStore.prototype.setState = /**
         * Sets the state specific value.
         * @param {?} stateOrUpdaterFn object of the same type as the state or an
         * updaterFn, returning such object.
         * @return {?}
         */
        function (stateOrUpdaterFn) {
            if (typeof stateOrUpdaterFn !== 'function') {
                this.initState(stateOrUpdaterFn);
            }
            else {
                this.updater((/** @type {?} */ (stateOrUpdaterFn)))();
            }
        };
        /**
         * @template R
         * @param {...?} args
         * @return {?}
         */
        ComponentStore.prototype.select = /**
         * @template R
         * @param {...?} args
         * @return {?}
         */
        function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            /** @type {?} */
            var observable$;
            // project is always the last argument, so `pop` it from args.
            /** @type {?} */
            var projector = args.pop();
            if (args.length === 0) {
                // If projector was the only argument then we'll use map operator.
                observable$ = this.stateSubject$.pipe(operators.map(projector));
            }
            else {
                // If there are multiple arguments, we're chaining selectors, so we need
                // to take the combineLatest of them before calling the map function.
                observable$ = rxjs.combineLatest(args).pipe(
                // The most performant way to combine Observables avoiding unnecessary
                // emissions and projector calls.
                debounceSync(), operators.map((/**
                 * @param {?} args
                 * @return {?}
                 */
                function (args) { return projector.apply(void 0, __spread(args)); })));
            }
            /** @type {?} */
            var distinctSharedObservable$ = observable$.pipe(operators.distinctUntilChanged(), operators.shareReplay({
                refCount: true,
                bufferSize: 1,
            }), operators.takeUntil(this.destroy$));
            return distinctSharedObservable$;
        };
        /**
         * Creates an effect.
         *
         * This effect is subscribed to for the life of the @Component.
         * @param generator A function that takes an origin Observable input and
         *     returns an Observable. The Observable that is returned will be
         *     subscribed to for the life of the component.
         * @return A function that, when called, will trigger the origin Observable.
         */
        /**
         * Creates an effect.
         *
         * This effect is subscribed to for the life of the \@Component.
         * @template V, R
         * @param {?} generator A function that takes an origin Observable input and
         *     returns an Observable. The Observable that is returned will be
         *     subscribed to for the life of the component.
         * @return {?} A function that, when called, will trigger the origin Observable.
         */
        ComponentStore.prototype.effect = /**
         * Creates an effect.
         *
         * This effect is subscribed to for the life of the \@Component.
         * @template V, R
         * @param {?} generator A function that takes an origin Observable input and
         *     returns an Observable. The Observable that is returned will be
         *     subscribed to for the life of the component.
         * @return {?} A function that, when called, will trigger the origin Observable.
         */
        function (generator) {
            var _this = this;
            /** @type {?} */
            var origin$ = new rxjs.Subject();
            generator(origin$)
                // tied to the lifecycle 👇 of ComponentStore
                .pipe(operators.takeUntil(this.destroy$))
                .subscribe();
            return (/**
             * @param {?=} observableOrValue
             * @return {?}
             */
            function (observableOrValue) {
                /** @type {?} */
                var observable$ = rxjs.isObservable(observableOrValue)
                    ? observableOrValue
                    : rxjs.of(observableOrValue);
                return observable$.pipe(operators.takeUntil(_this.destroy$)).subscribe((/**
                 * @param {?} value
                 * @return {?}
                 */
                function (value) {
                    // any new 👇 value is pushed into a stream
                    origin$.next(value);
                }));
            });
        };
        return ComponentStore;
    }());
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
        /** @type {?} */
        ComponentStore.prototype.state$;
    }

    exports.ComponentStore = ComponentStore;

    Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=ngrx-component-store.umd.js.map
