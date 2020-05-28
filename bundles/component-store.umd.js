/**
 * @license NgRx 9.1.2+15.sha-4892fa2
 * (c) 2015-2018 Brandon Roberts, Mike Ryan, Rob Wormald, Victor Savkin
 * License: MIT
 */
(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('tslib'), require('rxjs'), require('rxjs/operators')) :
    typeof define === 'function' && define.amd ? define('@ngrx/component-store', ['exports', 'tslib', 'rxjs', 'rxjs/operators'], factory) :
    (global = global || self, factory((global.ngrx = global.ngrx || {}, global.ngrx.componentStore = {}), global.tslib, global.rxjs, global.rxjs.operators));
}(this, (function (exports, tslib, rxjs, operators) { 'use strict';

    var ComponentStore = /** @class */ (function () {
        function ComponentStore(defaultState) {
            this.stateSubject$ = new rxjs.ReplaySubject(1);
            this.isInitialized = false;
            this.state$ = this.stateSubject$.asObservable();
            // Should be used only in ngOnDestroy.
            this.destroySubject$ = new rxjs.ReplaySubject(1);
            // Exposed to any extending Store to be used for the teardowns.
            this.destroy$ = this.destroySubject$.asObservable();
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
