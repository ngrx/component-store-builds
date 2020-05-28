/**
 * @license NgRx 9.2.0+2.sha-aba7368
 * (c) 2015-2018 Brandon Roberts, Mike Ryan, Rob Wormald, Victor Savkin
 * License: MIT
 */
(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('tslib'), require('rxjs'), require('rxjs/operators')) :
    typeof define === 'function' && define.amd ? define('@ngrx/component-store', ['exports', 'tslib', 'rxjs', 'rxjs/operators'], factory) :
    (global = global || self, factory((global.ngrx = global.ngrx || {}, global.ngrx.componentStore = {}), global.tslib, global.rxjs, global.rxjs.operators));
}(this, (function (exports, tslib, rxjs, operators) { 'use strict';

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
        return function (source) {
            return new rxjs.Observable(function (observer) {
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
                    error: function (error) { return observer.error(error); },
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
            });
        };
    }

    var ComponentStore = /** @class */ (function () {
        function ComponentStore(defaultState) {
            // Should be used only in ngOnDestroy.
            this.destroySubject$ = new rxjs.ReplaySubject(1);
            // Exposed to any extending Store to be used for the teardowns.
            this.destroy$ = this.destroySubject$.asObservable();
            this.stateSubject$ = new rxjs.ReplaySubject(1);
            this.isInitialized = false;
            // Needs to be after destroy$ is declared because it's used in select.
            this.state$ = this.select(function (s) { return s; });
            // State can be initialized either through constructor, or initState or
            // setState.
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
         *     second argument to `updaterFn`. Everytime this function is called
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
                    .pipe(operators.concatMap(function (value) {
                    return _this.isInitialized
                        ? rxjs.of(value).pipe(operators.withLatestFrom(_this.stateSubject$))
                        : // If state was not initialized, we'll throw an error.
                            rxjs.throwError(Error(_this.constructor.name + " has not been initialized"));
                }), operators.takeUntil(_this.destroy$))
                    .subscribe({
                    next: function (_a) {
                        var _b = tslib.__read(_a, 2), value = _b[0], currentState = _b[1];
                        _this.stateSubject$.next(updaterFn(currentState, value));
                    },
                    error: function (error) {
                        initializationError = error;
                        _this.stateSubject$.error(error);
                    },
                });
                if (initializationError) {
                    throw initializationError;
                }
                return subscription;
            });
        };
        /**
         * Initializes state. If it was already initialized then it resets the
         * state.
         */
        ComponentStore.prototype.initState = function (state) {
            this.isInitialized = true;
            this.stateSubject$.next(state);
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
        ComponentStore.prototype.select = function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            var observable$;
            // project is always the last argument, so `pop` it from args.
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
                debounceSync(), operators.map(function (args) { return projector.apply(void 0, tslib.__spread(args)); }));
            }
            var distinctSharedObservable$ = observable$.pipe(operators.distinctUntilChanged(), operators.shareReplay({
                refCount: true,
                bufferSize: 1,
            }), operators.takeUntil(this.destroy$));
            return distinctSharedObservable$;
        };
        return ComponentStore;
    }());

    /**
     * DO NOT EDIT
     *
     * This file is automatically generated at build
     */

    exports.ComponentStore = ComponentStore;

    Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=component-store.umd.js.map
