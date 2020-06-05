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
 * @fileoverview added by tsickle
 * Generated from: src/component-store.ts
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
import { isObservable, of, ReplaySubject, throwError, combineLatest, Subject, } from 'rxjs';
import { concatMap, takeUntil, withLatestFrom, map, distinctUntilChanged, shareReplay, } from 'rxjs/operators';
import { debounceSync } from './debounceSync';
/**
 * Return type of the effect, that behaves differently based on whether the
 * argument is passed to the callback.
 * @record
 * @template T
 */
export function EffectReturnFn() { }
/**
 * @template T
 */
var /**
 * @template T
 */
ComponentStore = /** @class */ (function () {
    function ComponentStore(defaultState) {
        // Should be used only in ngOnDestroy.
        this.destroySubject$ = new ReplaySubject(1);
        // Exposed to any extending Store to be used for the teardowns.
        this.destroy$ = this.destroySubject$.asObservable();
        this.stateSubject$ = new ReplaySubject(1);
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
            var observable$ = isObservable(observableOrValue)
                ? observableOrValue
                : of(observableOrValue);
            /** @type {?} */
            var subscription = observable$
                .pipe(concatMap((/**
             * @param {?} value
             * @return {?}
             */
            function (value) {
                return _this.isInitialized
                    ? of(value).pipe(withLatestFrom(_this.stateSubject$))
                    : // If state was not initialized, we'll throw an error.
                        throwError(Error(_this.constructor.name + " has not been initialized"));
            })), takeUntil(_this.destroy$))
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
                // prettier-ignore
                throw /** @type {!Error} */ (initializationError);
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
            observable$ = this.stateSubject$.pipe(map(projector));
        }
        else {
            // If there are multiple arguments, we're chaining selectors, so we need
            // to take the combineLatest of them before calling the map function.
            observable$ = combineLatest(args).pipe(
            // The most performant way to combine Observables avoiding unnecessary
            // emissions and projector calls.
            debounceSync(), map((/**
             * @param {?} args
             * @return {?}
             */
            function (args) { return projector.apply(void 0, __spread(args)); })));
        }
        /** @type {?} */
        var distinctSharedObservable$ = observable$.pipe(distinctUntilChanged(), shareReplay({
            refCount: true,
            bufferSize: 1,
        }), takeUntil(this.destroy$));
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
        var origin$ = new Subject();
        generator(origin$)
            // tied to the lifecycle 👇 of ComponentStore
            .pipe(takeUntil(this.destroy$))
            .subscribe();
        return (/**
         * @param {?=} observableOrValue
         * @return {?}
         */
        function (observableOrValue) {
            /** @type {?} */
            var observable$ = isObservable(observableOrValue)
                ? observableOrValue
                : of(observableOrValue);
            return observable$.pipe(takeUntil(_this.destroy$)).subscribe((/**
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
/**
 * @template T
 */
export { ComponentStore };
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcG9uZW50LXN0b3JlLmpzIiwic291cmNlUm9vdCI6Im5nOi8vQG5ncngvY29tcG9uZW50LXN0b3JlLyIsInNvdXJjZXMiOlsic3JjL2NvbXBvbmVudC1zdG9yZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsT0FBTyxFQUNMLFlBQVksRUFFWixFQUFFLEVBQ0YsYUFBYSxFQUViLFVBQVUsRUFDVixhQUFhLEVBQ2IsT0FBTyxHQUNSLE1BQU0sTUFBTSxDQUFDO0FBQ2QsT0FBTyxFQUNMLFNBQVMsRUFDVCxTQUFTLEVBQ1QsY0FBYyxFQUNkLEdBQUcsRUFDSCxvQkFBb0IsRUFDcEIsV0FBVyxHQUNaLE1BQU0sZ0JBQWdCLENBQUM7QUFDeEIsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGdCQUFnQixDQUFDOzs7Ozs7O0FBTTlDLG9DQUdDOzs7O0FBRUQ7Ozs7SUFXRSx3QkFBWSxZQUFnQjs7UUFUWCxvQkFBZSxHQUFHLElBQUksYUFBYSxDQUFPLENBQUMsQ0FBQyxDQUFDOztRQUVyRCxhQUFRLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxZQUFZLEVBQUUsQ0FBQztRQUV2QyxrQkFBYSxHQUFHLElBQUksYUFBYSxDQUFJLENBQUMsQ0FBQyxDQUFDO1FBQ2pELGtCQUFhLEdBQUcsS0FBSyxDQUFDOztRQUVyQixXQUFNLEdBQWtCLElBQUksQ0FBQyxNQUFNOzs7O1FBQUMsVUFBQyxDQUFDLElBQUssT0FBQSxDQUFDLEVBQUQsQ0FBQyxFQUFDLENBQUM7UUFHckQsdUVBQXVFO1FBQ3ZFLFlBQVk7UUFDWixJQUFJLFlBQVksRUFBRTtZQUNoQixJQUFJLENBQUMsU0FBUyxDQUFDLFlBQVksQ0FBQyxDQUFDO1NBQzlCO0lBQ0gsQ0FBQztJQUVELGlEQUFpRDs7Ozs7SUFDakQsb0NBQVc7Ozs7SUFBWDtRQUNFLElBQUksQ0FBQyxhQUFhLENBQUMsUUFBUSxFQUFFLENBQUM7UUFDOUIsSUFBSSxDQUFDLGVBQWUsQ0FBQyxJQUFJLEVBQUUsQ0FBQztJQUM5QixDQUFDO0lBRUQ7Ozs7Ozs7Ozs7Ozs7O09BY0c7Ozs7Ozs7Ozs7Ozs7Ozs7O0lBQ0gsZ0NBQU87Ozs7Ozs7Ozs7Ozs7Ozs7SUFBUCxVQUNFLFNBQW9DO1FBRHRDLGlCQXlDQztRQXRDQyxPQUFPLG1CQUFBOzs7O1FBQUMsVUFBQyxpQkFBcUM7O2dCQUN4QyxtQkFBc0M7Ozs7O2dCQUlwQyxXQUFXLEdBQUcsWUFBWSxDQUFDLGlCQUFpQixDQUFDO2dCQUNqRCxDQUFDLENBQUMsaUJBQWlCO2dCQUNuQixDQUFDLENBQUMsRUFBRSxDQUFDLGlCQUFpQixDQUFDOztnQkFDbkIsWUFBWSxHQUFHLFdBQVc7aUJBQzdCLElBQUksQ0FDSCxTQUFTOzs7O1lBQUMsVUFBQyxLQUFLO2dCQUNkLE9BQUEsS0FBSSxDQUFDLGFBQWE7b0JBQ2hCLENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxLQUFJLENBQUMsYUFBYSxDQUFDLENBQUM7b0JBQ3BELENBQUMsQ0FBQyxzREFBc0Q7d0JBQ3RELFVBQVUsQ0FDUixLQUFLLENBQUksS0FBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLDhCQUEyQixDQUFDLENBQzNEO1lBTEwsQ0FLSyxFQUNOLEVBQ0QsU0FBUyxDQUFDLEtBQUksQ0FBQyxRQUFRLENBQUMsQ0FDekI7aUJBQ0EsU0FBUyxDQUFDO2dCQUNULElBQUk7Ozs7Z0JBQUUsVUFBQyxFQUFxQjt3QkFBckIsa0JBQXFCLEVBQXBCLGFBQUssRUFBRSxvQkFBWTtvQkFDekIsS0FBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLFlBQVksRUFBRSxtQkFBQSxLQUFLLEVBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQzNELENBQUMsQ0FBQTtnQkFDRCxLQUFLOzs7O2dCQUFFLFVBQUMsS0FBWTtvQkFDbEIsbUJBQW1CLEdBQUcsS0FBSyxDQUFDO29CQUM1QixLQUFJLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQztnQkFDbEMsQ0FBQyxDQUFBO2FBQ0YsQ0FBQztZQUVKLElBQUksbUJBQW1CLEVBQUU7Z0JBQ3ZCLGtCQUFrQjtnQkFDbEIsTUFBTSxxQkFBcUIsQ0FBQyxDQUFDLG1CQUFtQixDQUFDLENBQUM7YUFDbkQ7WUFDRCxPQUFPLFlBQVksQ0FBQztRQUN0QixDQUFDLEVBQUMsRUFFd0MsQ0FBQztJQUM3QyxDQUFDO0lBRUQ7OztPQUdHOzs7Ozs7OztJQUNLLGtDQUFTOzs7Ozs7O0lBQWpCLFVBQWtCLEtBQVE7UUFDeEIsSUFBSSxDQUFDLGFBQWEsR0FBRyxJQUFJLENBQUM7UUFDMUIsSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDakMsQ0FBQztJQUVEOzs7O09BSUc7Ozs7Ozs7SUFDSCxpQ0FBUTs7Ozs7O0lBQVIsVUFBUyxnQkFBdUM7UUFDOUMsSUFBSSxPQUFPLGdCQUFnQixLQUFLLFVBQVUsRUFBRTtZQUMxQyxJQUFJLENBQUMsU0FBUyxDQUFDLGdCQUFnQixDQUFDLENBQUM7U0FDbEM7YUFBTTtZQUNMLElBQUksQ0FBQyxPQUFPLENBQUMsbUJBQUEsZ0JBQWdCLEVBQW1CLENBQUMsRUFBRSxDQUFDO1NBQ3JEO0lBQ0gsQ0FBQzs7Ozs7O0lBK0JELCtCQUFNOzs7OztJQUFOO1FBQVUsY0FBYzthQUFkLFVBQWMsRUFBZCxxQkFBYyxFQUFkLElBQWM7WUFBZCx5QkFBYzs7O1lBQ2xCLFdBQTBCOzs7WUFFeEIsU0FBUyxHQUEwQixJQUFJLENBQUMsR0FBRyxFQUFFO1FBQ25ELElBQUksSUFBSSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7WUFDckIsa0VBQWtFO1lBQ2xFLFdBQVcsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQztTQUN2RDthQUFNO1lBQ0wsd0VBQXdFO1lBQ3hFLHFFQUFxRTtZQUNyRSxXQUFXLEdBQUcsYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUk7WUFDcEMsc0VBQXNFO1lBQ3RFLGlDQUFpQztZQUNqQyxZQUFZLEVBQUUsRUFDZCxHQUFHOzs7O1lBQUMsVUFBQyxJQUFXLElBQUssT0FBQSxTQUFTLHdCQUFJLElBQUksSUFBakIsQ0FBa0IsRUFBQyxDQUN6QyxDQUFDO1NBQ0g7O1lBQ0sseUJBQXlCLEdBQUcsV0FBVyxDQUFDLElBQUksQ0FDaEQsb0JBQW9CLEVBQUUsRUFDdEIsV0FBVyxDQUFDO1lBQ1YsUUFBUSxFQUFFLElBQUk7WUFDZCxVQUFVLEVBQUUsQ0FBQztTQUNkLENBQUMsRUFDRixTQUFTLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUN6QjtRQUNELE9BQU8seUJBQXlCLENBQUM7SUFDbkMsQ0FBQztJQUVEOzs7Ozs7OztPQVFHOzs7Ozs7Ozs7OztJQUNILCtCQUFNOzs7Ozs7Ozs7O0lBQU4sVUFDRSxTQUFvRDtRQUR0RCxpQkFrQkM7O1lBZk8sT0FBTyxHQUFHLElBQUksT0FBTyxFQUFLO1FBQ2hDLFNBQVMsQ0FBQyxPQUFPLENBQUM7WUFDaEIsNkNBQTZDO2FBQzVDLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO2FBQzlCLFNBQVMsRUFBRSxDQUFDO1FBRWY7Ozs7UUFBTyxVQUFDLGlCQUFxQzs7Z0JBQ3JDLFdBQVcsR0FBRyxZQUFZLENBQUMsaUJBQWlCLENBQUM7Z0JBQ2pELENBQUMsQ0FBQyxpQkFBaUI7Z0JBQ25CLENBQUMsQ0FBQyxFQUFFLENBQUMsaUJBQWlCLENBQUM7WUFDekIsT0FBTyxXQUFXLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxTQUFTOzs7O1lBQUMsVUFBQyxLQUFLO2dCQUNoRSwyQ0FBMkM7Z0JBQzNDLE9BQU8sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDdEIsQ0FBQyxFQUFDLENBQUM7UUFDTCxDQUFDLEVBQUM7SUFDSixDQUFDO0lBQ0gscUJBQUM7QUFBRCxDQUFDLEFBOUxELElBOExDOzs7Ozs7Ozs7O0lBNUxDLHlDQUE4RDs7SUFFOUQsa0NBQXdEOzs7OztJQUV4RCx1Q0FBeUQ7Ozs7O0lBQ3pELHVDQUE4Qjs7SUFFOUIsZ0NBQXVEIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtcbiAgaXNPYnNlcnZhYmxlLFxuICBPYnNlcnZhYmxlLFxuICBvZixcbiAgUmVwbGF5U3ViamVjdCxcbiAgU3Vic2NyaXB0aW9uLFxuICB0aHJvd0Vycm9yLFxuICBjb21iaW5lTGF0ZXN0LFxuICBTdWJqZWN0LFxufSBmcm9tICdyeGpzJztcbmltcG9ydCB7XG4gIGNvbmNhdE1hcCxcbiAgdGFrZVVudGlsLFxuICB3aXRoTGF0ZXN0RnJvbSxcbiAgbWFwLFxuICBkaXN0aW5jdFVudGlsQ2hhbmdlZCxcbiAgc2hhcmVSZXBsYXksXG59IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCB7IGRlYm91bmNlU3luYyB9IGZyb20gJy4vZGVib3VuY2VTeW5jJztcblxuLyoqXG4gKiBSZXR1cm4gdHlwZSBvZiB0aGUgZWZmZWN0LCB0aGF0IGJlaGF2ZXMgZGlmZmVyZW50bHkgYmFzZWQgb24gd2hldGhlciB0aGVcbiAqIGFyZ3VtZW50IGlzIHBhc3NlZCB0byB0aGUgY2FsbGJhY2suXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgRWZmZWN0UmV0dXJuRm48VD4ge1xuICAoKTogdm9pZDtcbiAgKHQ6IFQgfCBPYnNlcnZhYmxlPFQ+KTogU3Vic2NyaXB0aW9uO1xufVxuXG5leHBvcnQgY2xhc3MgQ29tcG9uZW50U3RvcmU8VCBleHRlbmRzIG9iamVjdD4ge1xuICAvLyBTaG91bGQgYmUgdXNlZCBvbmx5IGluIG5nT25EZXN0cm95LlxuICBwcml2YXRlIHJlYWRvbmx5IGRlc3Ryb3lTdWJqZWN0JCA9IG5ldyBSZXBsYXlTdWJqZWN0PHZvaWQ+KDEpO1xuICAvLyBFeHBvc2VkIHRvIGFueSBleHRlbmRpbmcgU3RvcmUgdG8gYmUgdXNlZCBmb3IgdGhlIHRlYXJkb3ducy5cbiAgcmVhZG9ubHkgZGVzdHJveSQgPSB0aGlzLmRlc3Ryb3lTdWJqZWN0JC5hc09ic2VydmFibGUoKTtcblxuICBwcml2YXRlIHJlYWRvbmx5IHN0YXRlU3ViamVjdCQgPSBuZXcgUmVwbGF5U3ViamVjdDxUPigxKTtcbiAgcHJpdmF0ZSBpc0luaXRpYWxpemVkID0gZmFsc2U7XG4gIC8vIE5lZWRzIHRvIGJlIGFmdGVyIGRlc3Ryb3kkIGlzIGRlY2xhcmVkIGJlY2F1c2UgaXQncyB1c2VkIGluIHNlbGVjdC5cbiAgcmVhZG9ubHkgc3RhdGUkOiBPYnNlcnZhYmxlPFQ+ID0gdGhpcy5zZWxlY3QoKHMpID0+IHMpO1xuXG4gIGNvbnN0cnVjdG9yKGRlZmF1bHRTdGF0ZT86IFQpIHtcbiAgICAvLyBTdGF0ZSBjYW4gYmUgaW5pdGlhbGl6ZWQgZWl0aGVyIHRocm91Z2ggY29uc3RydWN0b3IsIG9yIGluaXRTdGF0ZSBvclxuICAgIC8vIHNldFN0YXRlLlxuICAgIGlmIChkZWZhdWx0U3RhdGUpIHtcbiAgICAgIHRoaXMuaW5pdFN0YXRlKGRlZmF1bHRTdGF0ZSk7XG4gICAgfVxuICB9XG5cbiAgLyoqIENvbXBsZXRlcyBhbGwgcmVsZXZhbnQgT2JzZXJ2YWJsZSBzdHJlYW1zLiAqL1xuICBuZ09uRGVzdHJveSgpIHtcbiAgICB0aGlzLnN0YXRlU3ViamVjdCQuY29tcGxldGUoKTtcbiAgICB0aGlzLmRlc3Ryb3lTdWJqZWN0JC5uZXh0KCk7XG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlcyBhbiB1cGRhdGVyLlxuICAgKlxuICAgKiBUaHJvd3MgYW4gZXJyb3IgaWYgdXBkYXRlciBpcyBjYWxsZWQgd2l0aCBzeW5jaHJvbm91cyB2YWx1ZXMgKGVpdGhlclxuICAgKiBpbXBlcmF0aXZlIHZhbHVlIG9yIE9ic2VydmFibGUgdGhhdCBpcyBzeW5jaHJvbm91cykgYmVmb3JlIENvbXBvbmVudFN0b3JlXG4gICAqIGlzIGluaXRpYWxpemVkLiBJZiBjYWxsZWQgd2l0aCBhc3luYyBPYnNlcnZhYmxlIGJlZm9yZSBpbml0aWFsaXphdGlvbiB0aGVuXG4gICAqIHN0YXRlIHdpbGwgbm90IGJlIHVwZGF0ZWQgYW5kIHN1YnNjcmlwdGlvbiB3b3VsZCBiZSBjbG9zZWQuXG4gICAqXG4gICAqIEBwYXJhbSB1cGRhdGVyRm4gQSBzdGF0aWMgdXBkYXRlciBmdW5jdGlvbiB0aGF0IHRha2VzIDIgcGFyYW1ldGVycyAodGhlXG4gICAqIGN1cnJlbnQgc3RhdGUgYW5kIGFuIGFyZ3VtZW50IG9iamVjdCkgYW5kIHJldHVybnMgYSBuZXcgaW5zdGFuY2Ugb2YgdGhlXG4gICAqIHN0YXRlLlxuICAgKiBAcmV0dXJuIEEgZnVuY3Rpb24gdGhhdCBhY2NlcHRzIG9uZSBhcmd1bWVudCB3aGljaCBpcyBmb3J3YXJkZWQgYXMgdGhlXG4gICAqICAgICBzZWNvbmQgYXJndW1lbnQgdG8gYHVwZGF0ZXJGbmAuIEV2ZXJ5dGltZSB0aGlzIGZ1bmN0aW9uIGlzIGNhbGxlZFxuICAgKiAgICAgc3Vic2NyaWJlcnMgd2lsbCBiZSBub3RpZmllZCBvZiB0aGUgc3RhdGUgY2hhbmdlLlxuICAgKi9cbiAgdXBkYXRlcjxWPihcbiAgICB1cGRhdGVyRm46IChzdGF0ZTogVCwgdmFsdWU6IFYpID0+IFRcbiAgKTogdW5rbm93biBleHRlbmRzIFYgPyAoKSA9PiB2b2lkIDogKHQ6IFYgfCBPYnNlcnZhYmxlPFY+KSA9PiBTdWJzY3JpcHRpb24ge1xuICAgIHJldHVybiAoKG9ic2VydmFibGVPclZhbHVlPzogViB8IE9ic2VydmFibGU8Vj4pOiBTdWJzY3JpcHRpb24gPT4ge1xuICAgICAgbGV0IGluaXRpYWxpemF0aW9uRXJyb3I6IEVycm9yIHwgdW5kZWZpbmVkO1xuICAgICAgLy8gV2UgY2FuIHJlY2VpdmUgZWl0aGVyIHRoZSB2YWx1ZSBvciBhbiBvYnNlcnZhYmxlLiBJbiBjYXNlIGl0J3MgYVxuICAgICAgLy8gc2ltcGxlIHZhbHVlLCB3ZSdsbCB3cmFwIGl0IHdpdGggYG9mYCBvcGVyYXRvciB0byB0dXJuIGl0IGludG9cbiAgICAgIC8vIE9ic2VydmFibGUuXG4gICAgICBjb25zdCBvYnNlcnZhYmxlJCA9IGlzT2JzZXJ2YWJsZShvYnNlcnZhYmxlT3JWYWx1ZSlcbiAgICAgICAgPyBvYnNlcnZhYmxlT3JWYWx1ZVxuICAgICAgICA6IG9mKG9ic2VydmFibGVPclZhbHVlKTtcbiAgICAgIGNvbnN0IHN1YnNjcmlwdGlvbiA9IG9ic2VydmFibGUkXG4gICAgICAgIC5waXBlKFxuICAgICAgICAgIGNvbmNhdE1hcCgodmFsdWUpID0+XG4gICAgICAgICAgICB0aGlzLmlzSW5pdGlhbGl6ZWRcbiAgICAgICAgICAgICAgPyBvZih2YWx1ZSkucGlwZSh3aXRoTGF0ZXN0RnJvbSh0aGlzLnN0YXRlU3ViamVjdCQpKVxuICAgICAgICAgICAgICA6IC8vIElmIHN0YXRlIHdhcyBub3QgaW5pdGlhbGl6ZWQsIHdlJ2xsIHRocm93IGFuIGVycm9yLlxuICAgICAgICAgICAgICAgIHRocm93RXJyb3IoXG4gICAgICAgICAgICAgICAgICBFcnJvcihgJHt0aGlzLmNvbnN0cnVjdG9yLm5hbWV9IGhhcyBub3QgYmVlbiBpbml0aWFsaXplZGApXG4gICAgICAgICAgICAgICAgKVxuICAgICAgICAgICksXG4gICAgICAgICAgdGFrZVVudGlsKHRoaXMuZGVzdHJveSQpXG4gICAgICAgIClcbiAgICAgICAgLnN1YnNjcmliZSh7XG4gICAgICAgICAgbmV4dDogKFt2YWx1ZSwgY3VycmVudFN0YXRlXSkgPT4ge1xuICAgICAgICAgICAgdGhpcy5zdGF0ZVN1YmplY3QkLm5leHQodXBkYXRlckZuKGN1cnJlbnRTdGF0ZSwgdmFsdWUhKSk7XG4gICAgICAgICAgfSxcbiAgICAgICAgICBlcnJvcjogKGVycm9yOiBFcnJvcikgPT4ge1xuICAgICAgICAgICAgaW5pdGlhbGl6YXRpb25FcnJvciA9IGVycm9yO1xuICAgICAgICAgICAgdGhpcy5zdGF0ZVN1YmplY3QkLmVycm9yKGVycm9yKTtcbiAgICAgICAgICB9LFxuICAgICAgICB9KTtcblxuICAgICAgaWYgKGluaXRpYWxpemF0aW9uRXJyb3IpIHtcbiAgICAgICAgLy8gcHJldHRpZXItaWdub3JlXG4gICAgICAgIHRocm93IC8qKiBAdHlwZSB7IUVycm9yfSAqLyAoaW5pdGlhbGl6YXRpb25FcnJvcik7XG4gICAgICB9XG4gICAgICByZXR1cm4gc3Vic2NyaXB0aW9uO1xuICAgIH0pIGFzIHVua25vd24gZXh0ZW5kcyBWXG4gICAgICA/ICgpID0+IHZvaWRcbiAgICAgIDogKHQ6IFYgfCBPYnNlcnZhYmxlPFY+KSA9PiBTdWJzY3JpcHRpb247XG4gIH1cblxuICAvKipcbiAgICogSW5pdGlhbGl6ZXMgc3RhdGUuIElmIGl0IHdhcyBhbHJlYWR5IGluaXRpYWxpemVkIHRoZW4gaXQgcmVzZXRzIHRoZVxuICAgKiBzdGF0ZS5cbiAgICovXG4gIHByaXZhdGUgaW5pdFN0YXRlKHN0YXRlOiBUKTogdm9pZCB7XG4gICAgdGhpcy5pc0luaXRpYWxpemVkID0gdHJ1ZTtcbiAgICB0aGlzLnN0YXRlU3ViamVjdCQubmV4dChzdGF0ZSk7XG4gIH1cblxuICAvKipcbiAgICogU2V0cyB0aGUgc3RhdGUgc3BlY2lmaWMgdmFsdWUuXG4gICAqIEBwYXJhbSBzdGF0ZU9yVXBkYXRlckZuIG9iamVjdCBvZiB0aGUgc2FtZSB0eXBlIGFzIHRoZSBzdGF0ZSBvciBhblxuICAgKiB1cGRhdGVyRm4sIHJldHVybmluZyBzdWNoIG9iamVjdC5cbiAgICovXG4gIHNldFN0YXRlKHN0YXRlT3JVcGRhdGVyRm46IFQgfCAoKHN0YXRlOiBUKSA9PiBUKSk6IHZvaWQge1xuICAgIGlmICh0eXBlb2Ygc3RhdGVPclVwZGF0ZXJGbiAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgdGhpcy5pbml0U3RhdGUoc3RhdGVPclVwZGF0ZXJGbik7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMudXBkYXRlcihzdGF0ZU9yVXBkYXRlckZuIGFzIChzdGF0ZTogVCkgPT4gVCkoKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlcyBhIHNlbGVjdG9yLlxuICAgKlxuICAgKiBUaGlzIHN1cHBvcnRzIGNoYWluaW5nIHVwIHRvIDQgc2VsZWN0b3JzLiBNb3JlIGNvdWxkIGJlIGFkZGVkIGFzIG5lZWRlZC5cbiAgICpcbiAgICogQHBhcmFtIHByb2plY3RvciBBIHB1cmUgcHJvamVjdGlvbiBmdW5jdGlvbiB0aGF0IHRha2VzIHRoZSBjdXJyZW50IHN0YXRlIGFuZFxuICAgKiAgIHJldHVybnMgc29tZSBuZXcgc2xpY2UvcHJvamVjdGlvbiBvZiB0aGF0IHN0YXRlLlxuICAgKiBAcmV0dXJuIEFuIG9ic2VydmFibGUgb2YgdGhlIHByb2plY3RvciByZXN1bHRzLlxuICAgKi9cbiAgc2VsZWN0PFI+KHByb2plY3RvcjogKHM6IFQpID0+IFIpOiBPYnNlcnZhYmxlPFI+O1xuICBzZWxlY3Q8UiwgUzE+KHMxOiBPYnNlcnZhYmxlPFMxPiwgcHJvamVjdG9yOiAoczE6IFMxKSA9PiBSKTogT2JzZXJ2YWJsZTxSPjtcbiAgc2VsZWN0PFIsIFMxLCBTMj4oXG4gICAgczE6IE9ic2VydmFibGU8UzE+LFxuICAgIHMyOiBPYnNlcnZhYmxlPFMyPixcbiAgICBwcm9qZWN0b3I6IChzMTogUzEsIHMyOiBTMikgPT4gUlxuICApOiBPYnNlcnZhYmxlPFI+O1xuICBzZWxlY3Q8UiwgUzEsIFMyLCBTMz4oXG4gICAgczE6IE9ic2VydmFibGU8UzE+LFxuICAgIHMyOiBPYnNlcnZhYmxlPFMyPixcbiAgICBzMzogT2JzZXJ2YWJsZTxTMz4sXG4gICAgcHJvamVjdG9yOiAoczE6IFMxLCBzMjogUzIsIHMzOiBTMykgPT4gUlxuICApOiBPYnNlcnZhYmxlPFI+O1xuICBzZWxlY3Q8UiwgUzEsIFMyLCBTMywgUzQ+KFxuICAgIHMxOiBPYnNlcnZhYmxlPFMxPixcbiAgICBzMjogT2JzZXJ2YWJsZTxTMj4sXG4gICAgczM6IE9ic2VydmFibGU8UzM+LFxuICAgIHM0OiBPYnNlcnZhYmxlPFM0PixcbiAgICBwcm9qZWN0b3I6IChzMTogUzEsIHMyOiBTMiwgczM6IFMzLCBzNDogUzQpID0+IFJcbiAgKTogT2JzZXJ2YWJsZTxSPjtcbiAgc2VsZWN0PFI+KC4uLmFyZ3M6IGFueVtdKTogT2JzZXJ2YWJsZTxSPiB7XG4gICAgbGV0IG9ic2VydmFibGUkOiBPYnNlcnZhYmxlPFI+O1xuICAgIC8vIHByb2plY3QgaXMgYWx3YXlzIHRoZSBsYXN0IGFyZ3VtZW50LCBzbyBgcG9wYCBpdCBmcm9tIGFyZ3MuXG4gICAgY29uc3QgcHJvamVjdG9yOiAoLi4uYXJnczogYW55W10pID0+IFIgPSBhcmdzLnBvcCgpO1xuICAgIGlmIChhcmdzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgLy8gSWYgcHJvamVjdG9yIHdhcyB0aGUgb25seSBhcmd1bWVudCB0aGVuIHdlJ2xsIHVzZSBtYXAgb3BlcmF0b3IuXG4gICAgICBvYnNlcnZhYmxlJCA9IHRoaXMuc3RhdGVTdWJqZWN0JC5waXBlKG1hcChwcm9qZWN0b3IpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gSWYgdGhlcmUgYXJlIG11bHRpcGxlIGFyZ3VtZW50cywgd2UncmUgY2hhaW5pbmcgc2VsZWN0b3JzLCBzbyB3ZSBuZWVkXG4gICAgICAvLyB0byB0YWtlIHRoZSBjb21iaW5lTGF0ZXN0IG9mIHRoZW0gYmVmb3JlIGNhbGxpbmcgdGhlIG1hcCBmdW5jdGlvbi5cbiAgICAgIG9ic2VydmFibGUkID0gY29tYmluZUxhdGVzdChhcmdzKS5waXBlKFxuICAgICAgICAvLyBUaGUgbW9zdCBwZXJmb3JtYW50IHdheSB0byBjb21iaW5lIE9ic2VydmFibGVzIGF2b2lkaW5nIHVubmVjZXNzYXJ5XG4gICAgICAgIC8vIGVtaXNzaW9ucyBhbmQgcHJvamVjdG9yIGNhbGxzLlxuICAgICAgICBkZWJvdW5jZVN5bmMoKSxcbiAgICAgICAgbWFwKChhcmdzOiBhbnlbXSkgPT4gcHJvamVjdG9yKC4uLmFyZ3MpKVxuICAgICAgKTtcbiAgICB9XG4gICAgY29uc3QgZGlzdGluY3RTaGFyZWRPYnNlcnZhYmxlJCA9IG9ic2VydmFibGUkLnBpcGUoXG4gICAgICBkaXN0aW5jdFVudGlsQ2hhbmdlZCgpLFxuICAgICAgc2hhcmVSZXBsYXkoe1xuICAgICAgICByZWZDb3VudDogdHJ1ZSxcbiAgICAgICAgYnVmZmVyU2l6ZTogMSxcbiAgICAgIH0pLFxuICAgICAgdGFrZVVudGlsKHRoaXMuZGVzdHJveSQpXG4gICAgKTtcbiAgICByZXR1cm4gZGlzdGluY3RTaGFyZWRPYnNlcnZhYmxlJDtcbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGVzIGFuIGVmZmVjdC5cbiAgICpcbiAgICogVGhpcyBlZmZlY3QgaXMgc3Vic2NyaWJlZCB0byBmb3IgdGhlIGxpZmUgb2YgdGhlIEBDb21wb25lbnQuXG4gICAqIEBwYXJhbSBnZW5lcmF0b3IgQSBmdW5jdGlvbiB0aGF0IHRha2VzIGFuIG9yaWdpbiBPYnNlcnZhYmxlIGlucHV0IGFuZFxuICAgKiAgICAgcmV0dXJucyBhbiBPYnNlcnZhYmxlLiBUaGUgT2JzZXJ2YWJsZSB0aGF0IGlzIHJldHVybmVkIHdpbGwgYmVcbiAgICogICAgIHN1YnNjcmliZWQgdG8gZm9yIHRoZSBsaWZlIG9mIHRoZSBjb21wb25lbnQuXG4gICAqIEByZXR1cm4gQSBmdW5jdGlvbiB0aGF0LCB3aGVuIGNhbGxlZCwgd2lsbCB0cmlnZ2VyIHRoZSBvcmlnaW4gT2JzZXJ2YWJsZS5cbiAgICovXG4gIGVmZmVjdDxWLCBSID0gdW5rbm93bj4oXG4gICAgZ2VuZXJhdG9yOiAob3JpZ2luJDogT2JzZXJ2YWJsZTxWPikgPT4gT2JzZXJ2YWJsZTxSPlxuICApOiBFZmZlY3RSZXR1cm5GbjxWPiB7XG4gICAgY29uc3Qgb3JpZ2luJCA9IG5ldyBTdWJqZWN0PFY+KCk7XG4gICAgZ2VuZXJhdG9yKG9yaWdpbiQpXG4gICAgICAvLyB0aWVkIHRvIHRoZSBsaWZlY3ljbGUg8J+RhyBvZiBDb21wb25lbnRTdG9yZVxuICAgICAgLnBpcGUodGFrZVVudGlsKHRoaXMuZGVzdHJveSQpKVxuICAgICAgLnN1YnNjcmliZSgpO1xuXG4gICAgcmV0dXJuIChvYnNlcnZhYmxlT3JWYWx1ZT86IFYgfCBPYnNlcnZhYmxlPFY+KTogU3Vic2NyaXB0aW9uID0+IHtcbiAgICAgIGNvbnN0IG9ic2VydmFibGUkID0gaXNPYnNlcnZhYmxlKG9ic2VydmFibGVPclZhbHVlKVxuICAgICAgICA/IG9ic2VydmFibGVPclZhbHVlXG4gICAgICAgIDogb2Yob2JzZXJ2YWJsZU9yVmFsdWUpO1xuICAgICAgcmV0dXJuIG9ic2VydmFibGUkLnBpcGUodGFrZVVudGlsKHRoaXMuZGVzdHJveSQpKS5zdWJzY3JpYmUoKHZhbHVlKSA9PiB7XG4gICAgICAgIC8vIGFueSBuZXcg8J+RhyB2YWx1ZSBpcyBwdXNoZWQgaW50byBhIHN0cmVhbVxuICAgICAgICBvcmlnaW4kLm5leHQodmFsdWUpO1xuICAgICAgfSk7XG4gICAgfTtcbiAgfVxufVxuIl19