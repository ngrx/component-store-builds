/**
 * @fileoverview added by tsickle
 * Generated from: src/component-store.ts
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
import { isObservable, of, ReplaySubject, throwError, combineLatest, Subject, queueScheduler, scheduled, } from 'rxjs';
import { concatMap, takeUntil, withLatestFrom, map, distinctUntilChanged, shareReplay, take, } from 'rxjs/operators';
import { debounceSync } from './debounce-sync';
import { Injectable, Optional, InjectionToken, Inject, } from '@angular/core';
/**
 * @record
 */
export function SelectConfig() { }
if (false) {
    /** @type {?|undefined} */
    SelectConfig.prototype.debounce;
}
/** @type {?} */
export const INITIAL_STATE_TOKEN = new InjectionToken('@ngrx/component-store Initial State');
/**
 * @template T
 */
export class ComponentStore {
    /**
     * @param {?=} defaultState
     */
    constructor(defaultState) {
        // Should be used only in ngOnDestroy.
        this.destroySubject$ = new ReplaySubject(1);
        // Exposed to any extending Store to be used for the teardown.
        this.destroy$ = this.destroySubject$.asObservable();
        this.stateSubject$ = new ReplaySubject(1);
        this.isInitialized = false;
        this.notInitializedErrorMessage = `${this.constructor.name} has not been initialized yet. ` +
            `Please make sure it is initialized before updating/getting.`;
        // Needs to be after destroy$ is declared because it's used in select.
        this.state$ = this.select((/**
         * @param {?} s
         * @return {?}
         */
        (s) => s));
        // State can be initialized either through constructor or setState.
        if (defaultState) {
            this.initState(defaultState);
        }
    }
    /**
     * Completes all relevant Observable streams.
     * @return {?}
     */
    ngOnDestroy() {
        this.stateSubject$.complete();
        this.destroySubject$.next();
    }
    /**
     * Creates an updater.
     *
     * Throws an error if updater is called with synchronous values (either
     * imperative value or Observable that is synchronous) before ComponentStore
     * is initialized. If called with async Observable before initialization then
     * state will not be updated and subscription would be closed.
     *
     * @template ProvidedType, OriginType, ValueType, ReturnType
     * @param {?} updaterFn A static updater function that takes 2 parameters (the
     * current state and an argument object) and returns a new instance of the
     * state.
     * @return {?} A function that accepts one argument which is forwarded as the
     *     second argument to `updaterFn`. Every time this function is called
     *     subscribers will be notified of the state change.
     */
    updater(updaterFn) {
        return (/** @type {?} */ (((/** @type {?} */ (((/**
         * @param {?=} observableOrValue
         * @return {?}
         */
        (observableOrValue) => {
            /** @type {?} */
            let initializationError;
            // We can receive either the value or an observable. In case it's a
            // simple value, we'll wrap it with `of` operator to turn it into
            // Observable.
            /** @type {?} */
            const observable$ = isObservable(observableOrValue)
                ? observableOrValue
                : of(observableOrValue);
            /** @type {?} */
            const subscription = observable$
                .pipe(concatMap((/**
             * @param {?} value
             * @return {?}
             */
            (value) => this.isInitialized
                ? // Push the value into queueScheduler
                    scheduled([value], queueScheduler).pipe(withLatestFrom(this.stateSubject$))
                : // If state was not initialized, we'll throw an error.
                    throwError(new Error(this.notInitializedErrorMessage)))), takeUntil(this.destroy$))
                .subscribe({
                next: (/**
                 * @param {?} __0
                 * @return {?}
                 */
                ([value, currentState]) => {
                    this.stateSubject$.next(updaterFn(currentState, (/** @type {?} */ (value))));
                }),
                error: (/**
                 * @param {?} error
                 * @return {?}
                 */
                (error) => {
                    initializationError = error;
                    this.stateSubject$.error(error);
                }),
            });
            if (initializationError) {
                // prettier-ignore
                throw /** @type {!Error} */ (initializationError);
            }
            return subscription;
        })))))));
    }
    /**
     * Initializes state. If it was already initialized then it resets the
     * state.
     * @private
     * @param {?} state
     * @return {?}
     */
    initState(state) {
        scheduled([state], queueScheduler).subscribe((/**
         * @param {?} s
         * @return {?}
         */
        (s) => {
            this.isInitialized = true;
            this.stateSubject$.next(s);
        }));
    }
    /**
     * Sets the state specific value.
     * @param {?} stateOrUpdaterFn object of the same type as the state or an
     * updaterFn, returning such object.
     * @return {?}
     */
    setState(stateOrUpdaterFn) {
        if (typeof stateOrUpdaterFn !== 'function') {
            this.initState(stateOrUpdaterFn);
        }
        else {
            this.updater((/** @type {?} */ (stateOrUpdaterFn)))();
        }
    }
    /**
     * @protected
     * @template R
     * @param {?=} projector
     * @return {?}
     */
    get(projector) {
        if (!this.isInitialized) {
            throw new Error(this.notInitializedErrorMessage);
        }
        /** @type {?} */
        let value;
        this.stateSubject$.pipe(take(1)).subscribe((/**
         * @param {?} state
         * @return {?}
         */
        (state) => {
            value = projector ? projector(state) : state;
        }));
        return (/** @type {?} */ (value));
    }
    /**
     * @template O, R, ProjectorFn
     * @param {...?} args
     * @return {?}
     */
    select(...args) {
        const { observables, projector, config } = processSelectorArgs(args);
        /** @type {?} */
        let observable$;
        // If there are no Observables to combine, then we'll just map the value.
        if (observables.length === 0) {
            observable$ = this.stateSubject$.pipe(config.debounce ? debounceSync() : (/**
             * @param {?} source$
             * @return {?}
             */
            (source$) => source$), map(projector));
        }
        else {
            // If there are multiple arguments, then we're aggregating selectors, so we need
            // to take the combineLatest of them before calling the map function.
            observable$ = combineLatest(observables).pipe(config.debounce ? debounceSync() : (/**
             * @param {?} source$
             * @return {?}
             */
            (source$) => source$), map((/**
             * @param {?} projectorArgs
             * @return {?}
             */
            (projectorArgs) => projector(...projectorArgs))));
        }
        return ((/** @type {?} */ (observable$))).pipe(distinctUntilChanged(), shareReplay({
            refCount: true,
            bufferSize: 1,
        }), takeUntil(this.destroy$));
    }
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
    effect(generator) {
        /** @type {?} */
        const origin$ = new Subject();
        generator((/** @type {?} */ (origin$)))
            // tied to the lifecycle 👇 of ComponentStore
            .pipe(takeUntil(this.destroy$))
            .subscribe();
        return (/** @type {?} */ (((/** @type {?} */ (((/**
         * @param {?=} observableOrValue
         * @return {?}
         */
        (observableOrValue) => {
            /** @type {?} */
            const observable$ = isObservable(observableOrValue)
                ? observableOrValue
                : of(observableOrValue);
            return observable$.pipe(takeUntil(this.destroy$)).subscribe((/**
             * @param {?} value
             * @return {?}
             */
            (value) => {
                // any new 👇 value is pushed into a stream
                origin$.next(value);
            }));
        })))))));
    }
}
ComponentStore.decorators = [
    { type: Injectable }
];
/** @nocollapse */
ComponentStore.ctorParameters = () => [
    { type: undefined, decorators: [{ type: Optional }, { type: Inject, args: [INITIAL_STATE_TOKEN,] }] }
];
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
    const selectorArgs = Array.from(args);
    // Assign default values.
    /** @type {?} */
    let config = { debounce: false };
    /** @type {?} */
    let projector;
    // Last argument is either projector or config
    /** @type {?} */
    const projectorOrConfig = (/** @type {?} */ (selectorArgs.pop()));
    if (typeof projectorOrConfig !== 'function') {
        // We got the config as the last argument, replace any default values with it.
        config = Object.assign(Object.assign({}, config), projectorOrConfig);
        // Pop the next args, which would be the projector fn.
        projector = (/** @type {?} */ (selectorArgs.pop()));
    }
    else {
        projector = projectorOrConfig;
    }
    // The Observables to combine, if there are any.
    /** @type {?} */
    const observables = (/** @type {?} */ (selectorArgs));
    return {
        observables,
        projector,
        config,
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcG9uZW50LXN0b3JlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vbW9kdWxlcy9jb21wb25lbnQtc3RvcmUvc3JjL2NvbXBvbmVudC1zdG9yZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7OztBQUFBLE9BQU8sRUFDTCxZQUFZLEVBRVosRUFBRSxFQUNGLGFBQWEsRUFFYixVQUFVLEVBQ1YsYUFBYSxFQUNiLE9BQU8sRUFDUCxjQUFjLEVBQ2QsU0FBUyxHQUNWLE1BQU0sTUFBTSxDQUFDO0FBQ2QsT0FBTyxFQUNMLFNBQVMsRUFDVCxTQUFTLEVBQ1QsY0FBYyxFQUNkLEdBQUcsRUFDSCxvQkFBb0IsRUFDcEIsV0FBVyxFQUNYLElBQUksR0FDTCxNQUFNLGdCQUFnQixDQUFDO0FBQ3hCLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUMvQyxPQUFPLEVBQ0wsVUFBVSxFQUVWLFFBQVEsRUFDUixjQUFjLEVBQ2QsTUFBTSxHQUNQLE1BQU0sZUFBZSxDQUFDOzs7O0FBRXZCLGtDQUVDOzs7SUFEQyxnQ0FBbUI7OztBQUdyQixNQUFNLE9BQU8sbUJBQW1CLEdBQUcsSUFBSSxjQUFjLENBQ25ELHFDQUFxQyxDQUN0Qzs7OztBQUdELE1BQU0sT0FBTyxjQUFjOzs7O0lBY3pCLFlBQXFELFlBQWdCOztRQVpwRCxvQkFBZSxHQUFHLElBQUksYUFBYSxDQUFPLENBQUMsQ0FBQyxDQUFDOztRQUVyRCxhQUFRLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxZQUFZLEVBQUUsQ0FBQztRQUV2QyxrQkFBYSxHQUFHLElBQUksYUFBYSxDQUFJLENBQUMsQ0FBQyxDQUFDO1FBQ2pELGtCQUFhLEdBQUcsS0FBSyxDQUFDO1FBQ3RCLCtCQUEwQixHQUNoQyxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxpQ0FBaUM7WUFDekQsNkRBQTZELENBQUM7O1FBRXZELFdBQU0sR0FBa0IsSUFBSSxDQUFDLE1BQU07Ozs7UUFBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUM7UUFHckQsbUVBQW1FO1FBQ25FLElBQUksWUFBWSxFQUFFO1lBQ2hCLElBQUksQ0FBQyxTQUFTLENBQUMsWUFBWSxDQUFDLENBQUM7U0FDOUI7SUFDSCxDQUFDOzs7OztJQUdELFdBQVc7UUFDVCxJQUFJLENBQUMsYUFBYSxDQUFDLFFBQVEsRUFBRSxDQUFDO1FBQzlCLElBQUksQ0FBQyxlQUFlLENBQUMsSUFBSSxFQUFFLENBQUM7SUFDOUIsQ0FBQzs7Ozs7Ozs7Ozs7Ozs7Ozs7SUFpQkQsT0FBTyxDQVdMLFNBQTZDO1FBQzdDLE9BQU8sbUJBQUEsQ0FBQyxtQkFBQTs7OztRQUFDLENBQ1AsaUJBQXVELEVBQ3pDLEVBQUU7O2dCQUNaLG1CQUFzQzs7Ozs7a0JBSXBDLFdBQVcsR0FBRyxZQUFZLENBQUMsaUJBQWlCLENBQUM7Z0JBQ2pELENBQUMsQ0FBQyxpQkFBaUI7Z0JBQ25CLENBQUMsQ0FBQyxFQUFFLENBQUMsaUJBQWlCLENBQUM7O2tCQUNuQixZQUFZLEdBQUcsV0FBVztpQkFDN0IsSUFBSSxDQUNILFNBQVM7Ozs7WUFBQyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQ2xCLElBQUksQ0FBQyxhQUFhO2dCQUNoQixDQUFDLENBQUMscUNBQXFDO29CQUNyQyxTQUFTLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFBRSxjQUFjLENBQUMsQ0FBQyxJQUFJLENBQ3JDLGNBQWMsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQ25DO2dCQUNILENBQUMsQ0FBQyxzREFBc0Q7b0JBQ3RELFVBQVUsQ0FBQyxJQUFJLEtBQUssQ0FBQyxJQUFJLENBQUMsMEJBQTBCLENBQUMsQ0FBQyxFQUMzRCxFQUNELFNBQVMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQ3pCO2lCQUNBLFNBQVMsQ0FBQztnQkFDVCxJQUFJOzs7O2dCQUFFLENBQUMsQ0FBQyxLQUFLLEVBQUUsWUFBWSxDQUFDLEVBQUUsRUFBRTtvQkFDOUIsSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLFlBQVksRUFBRSxtQkFBQSxLQUFLLEVBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQzNELENBQUMsQ0FBQTtnQkFDRCxLQUFLOzs7O2dCQUFFLENBQUMsS0FBWSxFQUFFLEVBQUU7b0JBQ3RCLG1CQUFtQixHQUFHLEtBQUssQ0FBQztvQkFDNUIsSUFBSSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUM7Z0JBQ2xDLENBQUMsQ0FBQTthQUNGLENBQUM7WUFFSixJQUFJLG1CQUFtQixFQUFFO2dCQUN2QixrQkFBa0I7Z0JBQ2xCLE1BQU0scUJBQXFCLENBQUMsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO2FBQ25EO1lBQ0QsT0FBTyxZQUFZLENBQUM7UUFDdEIsQ0FBQyxFQUFDLEVBQVcsQ0FBQyxFQUFjLENBQUM7SUFDL0IsQ0FBQzs7Ozs7Ozs7SUFNTyxTQUFTLENBQUMsS0FBUTtRQUN4QixTQUFTLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFBRSxjQUFjLENBQUMsQ0FBQyxTQUFTOzs7O1FBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtZQUNqRCxJQUFJLENBQUMsYUFBYSxHQUFHLElBQUksQ0FBQztZQUMxQixJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUM3QixDQUFDLEVBQUMsQ0FBQztJQUNMLENBQUM7Ozs7Ozs7SUFPRCxRQUFRLENBQUMsZ0JBQXVDO1FBQzlDLElBQUksT0FBTyxnQkFBZ0IsS0FBSyxVQUFVLEVBQUU7WUFDMUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO1NBQ2xDO2FBQU07WUFDTCxJQUFJLENBQUMsT0FBTyxDQUFDLG1CQUFBLGdCQUFnQixFQUFtQixDQUFDLEVBQUUsQ0FBQztTQUNyRDtJQUNILENBQUM7Ozs7Ozs7SUFJUyxHQUFHLENBQUksU0FBdUI7UUFDdEMsSUFBSSxDQUFDLElBQUksQ0FBQyxhQUFhLEVBQUU7WUFDdkIsTUFBTSxJQUFJLEtBQUssQ0FBQyxJQUFJLENBQUMsMEJBQTBCLENBQUMsQ0FBQztTQUNsRDs7WUFDRyxLQUFZO1FBRWhCLElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVM7Ozs7UUFBQyxDQUFDLEtBQUssRUFBRSxFQUFFO1lBQ25ELEtBQUssR0FBRyxTQUFTLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDO1FBQy9DLENBQUMsRUFBQyxDQUFDO1FBQ0gsT0FBTyxtQkFBQSxLQUFLLEVBQUMsQ0FBQztJQUNoQixDQUFDOzs7Ozs7SUF3Q0QsTUFBTSxDQUlKLEdBQUcsSUFBTztjQUNKLEVBQUUsV0FBVyxFQUFFLFNBQVMsRUFBRSxNQUFNLEVBQUUsR0FBRyxtQkFBbUIsQ0FBQyxJQUFJLENBQUM7O1lBRWhFLFdBQWdDO1FBQ3BDLHlFQUF5RTtRQUN6RSxJQUFJLFdBQVcsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFO1lBQzVCLFdBQVcsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FDbkMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQzs7OztZQUFDLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxPQUFPLENBQUEsRUFDdkQsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUNmLENBQUM7U0FDSDthQUFNO1lBQ0wsZ0ZBQWdGO1lBQ2hGLHFFQUFxRTtZQUNyRSxXQUFXLEdBQUcsYUFBYSxDQUFDLFdBQVcsQ0FBQyxDQUFDLElBQUksQ0FDM0MsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQzs7OztZQUFDLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxPQUFPLENBQUEsRUFDdkQsR0FBRzs7OztZQUFDLENBQUMsYUFBYSxFQUFFLEVBQUUsQ0FBQyxTQUFTLENBQUMsR0FBRyxhQUFhLENBQUMsRUFBQyxDQUNwRCxDQUFDO1NBQ0g7UUFDRCxPQUFPLENBQUMsbUJBQUEsV0FBVyxFQUFpQixDQUFDLENBQUMsSUFBSSxDQUN4QyxvQkFBb0IsRUFBRSxFQUN0QixXQUFXLENBQUM7WUFDVixRQUFRLEVBQUUsSUFBSTtZQUNkLFVBQVUsRUFBRSxDQUFDO1NBQ2QsQ0FBQyxFQUNGLFNBQVMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQ3pCLENBQUM7SUFDSixDQUFDOzs7Ozs7Ozs7OztJQVdELE1BQU0sQ0FlSixTQUF1RDs7Y0FDakQsT0FBTyxHQUFHLElBQUksT0FBTyxFQUFrQjtRQUM3QyxTQUFTLENBQUMsbUJBQUEsT0FBTyxFQUFjLENBQUM7WUFDOUIsNkNBQTZDO2FBQzVDLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO2FBQzlCLFNBQVMsRUFBRSxDQUFDO1FBRWYsT0FBTyxtQkFBQSxDQUFDLG1CQUFBOzs7O1FBQUMsQ0FDUCxpQkFBK0QsRUFDakQsRUFBRTs7a0JBQ1YsV0FBVyxHQUFHLFlBQVksQ0FBQyxpQkFBaUIsQ0FBQztnQkFDakQsQ0FBQyxDQUFDLGlCQUFpQjtnQkFDbkIsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQztZQUN6QixPQUFPLFdBQVcsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLFNBQVM7Ozs7WUFBQyxDQUFDLEtBQUssRUFBRSxFQUFFO2dCQUNwRSwyQ0FBMkM7Z0JBQzNDLE9BQU8sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDdEIsQ0FBQyxFQUFDLENBQUM7UUFDTCxDQUFDLEVBQUMsRUFBVyxDQUFDLEVBQWMsQ0FBQztJQUMvQixDQUFDOzs7WUF0UEYsVUFBVTs7Ozs0Q0FlSSxRQUFRLFlBQUksTUFBTSxTQUFDLG1CQUFtQjs7Ozs7OztJQVpuRCx5Q0FBOEQ7O0lBRTlELGtDQUF3RDs7Ozs7SUFFeEQsdUNBQXlEOzs7OztJQUN6RCx1Q0FBOEI7Ozs7O0lBQzlCLG9EQUVnRTs7SUFFaEUsZ0NBQXVEOzs7Ozs7O0FBNE96RCxTQUFTLG1CQUFtQixDQUsxQixJQUFPOztVQU1ELFlBQVksR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQzs7O1FBRWpDLE1BQU0sR0FBMkIsRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFOztRQUNwRCxTQUFzQjs7O1VBRXBCLGlCQUFpQixHQUFHLG1CQUFBLFlBQVksQ0FBQyxHQUFHLEVBQUUsRUFBOEI7SUFFMUUsSUFBSSxPQUFPLGlCQUFpQixLQUFLLFVBQVUsRUFBRTtRQUMzQyw4RUFBOEU7UUFDOUUsTUFBTSxtQ0FBUSxNQUFNLEdBQUssaUJBQWlCLENBQUUsQ0FBQztRQUM3QyxzREFBc0Q7UUFDdEQsU0FBUyxHQUFHLG1CQUFBLFlBQVksQ0FBQyxHQUFHLEVBQUUsRUFBZSxDQUFDO0tBQy9DO1NBQU07UUFDTCxTQUFTLEdBQUcsaUJBQWlCLENBQUM7S0FDL0I7OztVQUVLLFdBQVcsR0FBRyxtQkFBQSxZQUFZLEVBQXlCO0lBQ3pELE9BQU87UUFDTCxXQUFXO1FBQ1gsU0FBUztRQUNULE1BQU07S0FDUCxDQUFDO0FBQ0osQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7XG4gIGlzT2JzZXJ2YWJsZSxcbiAgT2JzZXJ2YWJsZSxcbiAgb2YsXG4gIFJlcGxheVN1YmplY3QsXG4gIFN1YnNjcmlwdGlvbixcbiAgdGhyb3dFcnJvcixcbiAgY29tYmluZUxhdGVzdCxcbiAgU3ViamVjdCxcbiAgcXVldWVTY2hlZHVsZXIsXG4gIHNjaGVkdWxlZCxcbn0gZnJvbSAncnhqcyc7XG5pbXBvcnQge1xuICBjb25jYXRNYXAsXG4gIHRha2VVbnRpbCxcbiAgd2l0aExhdGVzdEZyb20sXG4gIG1hcCxcbiAgZGlzdGluY3RVbnRpbENoYW5nZWQsXG4gIHNoYXJlUmVwbGF5LFxuICB0YWtlLFxufSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQgeyBkZWJvdW5jZVN5bmMgfSBmcm9tICcuL2RlYm91bmNlLXN5bmMnO1xuaW1wb3J0IHtcbiAgSW5qZWN0YWJsZSxcbiAgT25EZXN0cm95LFxuICBPcHRpb25hbCxcbiAgSW5qZWN0aW9uVG9rZW4sXG4gIEluamVjdCxcbn0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgU2VsZWN0Q29uZmlnIHtcbiAgZGVib3VuY2U/OiBib29sZWFuO1xufVxuXG5leHBvcnQgY29uc3QgSU5JVElBTF9TVEFURV9UT0tFTiA9IG5ldyBJbmplY3Rpb25Ub2tlbihcbiAgJ0BuZ3J4L2NvbXBvbmVudC1zdG9yZSBJbml0aWFsIFN0YXRlJ1xuKTtcblxuQEluamVjdGFibGUoKVxuZXhwb3J0IGNsYXNzIENvbXBvbmVudFN0b3JlPFQgZXh0ZW5kcyBvYmplY3Q+IGltcGxlbWVudHMgT25EZXN0cm95IHtcbiAgLy8gU2hvdWxkIGJlIHVzZWQgb25seSBpbiBuZ09uRGVzdHJveS5cbiAgcHJpdmF0ZSByZWFkb25seSBkZXN0cm95U3ViamVjdCQgPSBuZXcgUmVwbGF5U3ViamVjdDx2b2lkPigxKTtcbiAgLy8gRXhwb3NlZCB0byBhbnkgZXh0ZW5kaW5nIFN0b3JlIHRvIGJlIHVzZWQgZm9yIHRoZSB0ZWFyZG93bi5cbiAgcmVhZG9ubHkgZGVzdHJveSQgPSB0aGlzLmRlc3Ryb3lTdWJqZWN0JC5hc09ic2VydmFibGUoKTtcblxuICBwcml2YXRlIHJlYWRvbmx5IHN0YXRlU3ViamVjdCQgPSBuZXcgUmVwbGF5U3ViamVjdDxUPigxKTtcbiAgcHJpdmF0ZSBpc0luaXRpYWxpemVkID0gZmFsc2U7XG4gIHByaXZhdGUgbm90SW5pdGlhbGl6ZWRFcnJvck1lc3NhZ2UgPVxuICAgIGAke3RoaXMuY29uc3RydWN0b3IubmFtZX0gaGFzIG5vdCBiZWVuIGluaXRpYWxpemVkIHlldC4gYCArXG4gICAgYFBsZWFzZSBtYWtlIHN1cmUgaXQgaXMgaW5pdGlhbGl6ZWQgYmVmb3JlIHVwZGF0aW5nL2dldHRpbmcuYDtcbiAgLy8gTmVlZHMgdG8gYmUgYWZ0ZXIgZGVzdHJveSQgaXMgZGVjbGFyZWQgYmVjYXVzZSBpdCdzIHVzZWQgaW4gc2VsZWN0LlxuICByZWFkb25seSBzdGF0ZSQ6IE9ic2VydmFibGU8VD4gPSB0aGlzLnNlbGVjdCgocykgPT4gcyk7XG5cbiAgY29uc3RydWN0b3IoQE9wdGlvbmFsKCkgQEluamVjdChJTklUSUFMX1NUQVRFX1RPS0VOKSBkZWZhdWx0U3RhdGU/OiBUKSB7XG4gICAgLy8gU3RhdGUgY2FuIGJlIGluaXRpYWxpemVkIGVpdGhlciB0aHJvdWdoIGNvbnN0cnVjdG9yIG9yIHNldFN0YXRlLlxuICAgIGlmIChkZWZhdWx0U3RhdGUpIHtcbiAgICAgIHRoaXMuaW5pdFN0YXRlKGRlZmF1bHRTdGF0ZSk7XG4gICAgfVxuICB9XG5cbiAgLyoqIENvbXBsZXRlcyBhbGwgcmVsZXZhbnQgT2JzZXJ2YWJsZSBzdHJlYW1zLiAqL1xuICBuZ09uRGVzdHJveSgpIHtcbiAgICB0aGlzLnN0YXRlU3ViamVjdCQuY29tcGxldGUoKTtcbiAgICB0aGlzLmRlc3Ryb3lTdWJqZWN0JC5uZXh0KCk7XG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlcyBhbiB1cGRhdGVyLlxuICAgKlxuICAgKiBUaHJvd3MgYW4gZXJyb3IgaWYgdXBkYXRlciBpcyBjYWxsZWQgd2l0aCBzeW5jaHJvbm91cyB2YWx1ZXMgKGVpdGhlclxuICAgKiBpbXBlcmF0aXZlIHZhbHVlIG9yIE9ic2VydmFibGUgdGhhdCBpcyBzeW5jaHJvbm91cykgYmVmb3JlIENvbXBvbmVudFN0b3JlXG4gICAqIGlzIGluaXRpYWxpemVkLiBJZiBjYWxsZWQgd2l0aCBhc3luYyBPYnNlcnZhYmxlIGJlZm9yZSBpbml0aWFsaXphdGlvbiB0aGVuXG4gICAqIHN0YXRlIHdpbGwgbm90IGJlIHVwZGF0ZWQgYW5kIHN1YnNjcmlwdGlvbiB3b3VsZCBiZSBjbG9zZWQuXG4gICAqXG4gICAqIEBwYXJhbSB1cGRhdGVyRm4gQSBzdGF0aWMgdXBkYXRlciBmdW5jdGlvbiB0aGF0IHRha2VzIDIgcGFyYW1ldGVycyAodGhlXG4gICAqIGN1cnJlbnQgc3RhdGUgYW5kIGFuIGFyZ3VtZW50IG9iamVjdCkgYW5kIHJldHVybnMgYSBuZXcgaW5zdGFuY2Ugb2YgdGhlXG4gICAqIHN0YXRlLlxuICAgKiBAcmV0dXJuIEEgZnVuY3Rpb24gdGhhdCBhY2NlcHRzIG9uZSBhcmd1bWVudCB3aGljaCBpcyBmb3J3YXJkZWQgYXMgdGhlXG4gICAqICAgICBzZWNvbmQgYXJndW1lbnQgdG8gYHVwZGF0ZXJGbmAuIEV2ZXJ5IHRpbWUgdGhpcyBmdW5jdGlvbiBpcyBjYWxsZWRcbiAgICogICAgIHN1YnNjcmliZXJzIHdpbGwgYmUgbm90aWZpZWQgb2YgdGhlIHN0YXRlIGNoYW5nZS5cbiAgICovXG4gIHVwZGF0ZXI8XG4gICAgLy8gQWxsb3cgdG8gZm9yY2UtcHJvdmlkZSB0aGUgdHlwZVxuICAgIFByb3ZpZGVkVHlwZSA9IHZvaWQsXG4gICAgLy8gVGhpcyB0eXBlIGlzIGRlcml2ZWQgZnJvbSB0aGUgYHZhbHVlYCBwcm9wZXJ0eSwgZGVmYXVsdGluZyB0byB2b2lkIGlmIGl0J3MgbWlzc2luZ1xuICAgIE9yaWdpblR5cGUgPSBQcm92aWRlZFR5cGUsXG4gICAgLy8gVGhlIFZhbHVlIHR5cGUgaXMgYXNzaWduZWQgZnJvbSB0aGUgT3JpZ2luXG4gICAgVmFsdWVUeXBlID0gT3JpZ2luVHlwZSxcbiAgICAvLyBSZXR1cm4gZWl0aGVyIGFuIGVtcHR5IGNhbGxiYWNrIG9yIGEgZnVuY3Rpb24gcmVxdWlyaW5nIHNwZWNpZmljIHR5cGVzIGFzIGlucHV0c1xuICAgIFJldHVyblR5cGUgPSBPcmlnaW5UeXBlIGV4dGVuZHMgdm9pZFxuICAgICAgPyAoKSA9PiB2b2lkXG4gICAgICA6IChvYnNlcnZhYmxlT3JWYWx1ZTogVmFsdWVUeXBlIHwgT2JzZXJ2YWJsZTxWYWx1ZVR5cGU+KSA9PiBTdWJzY3JpcHRpb25cbiAgPih1cGRhdGVyRm46IChzdGF0ZTogVCwgdmFsdWU6IE9yaWdpblR5cGUpID0+IFQpOiBSZXR1cm5UeXBlIHtcbiAgICByZXR1cm4gKCgoXG4gICAgICBvYnNlcnZhYmxlT3JWYWx1ZT86IE9yaWdpblR5cGUgfCBPYnNlcnZhYmxlPE9yaWdpblR5cGU+XG4gICAgKTogU3Vic2NyaXB0aW9uID0+IHtcbiAgICAgIGxldCBpbml0aWFsaXphdGlvbkVycm9yOiBFcnJvciB8IHVuZGVmaW5lZDtcbiAgICAgIC8vIFdlIGNhbiByZWNlaXZlIGVpdGhlciB0aGUgdmFsdWUgb3IgYW4gb2JzZXJ2YWJsZS4gSW4gY2FzZSBpdCdzIGFcbiAgICAgIC8vIHNpbXBsZSB2YWx1ZSwgd2UnbGwgd3JhcCBpdCB3aXRoIGBvZmAgb3BlcmF0b3IgdG8gdHVybiBpdCBpbnRvXG4gICAgICAvLyBPYnNlcnZhYmxlLlxuICAgICAgY29uc3Qgb2JzZXJ2YWJsZSQgPSBpc09ic2VydmFibGUob2JzZXJ2YWJsZU9yVmFsdWUpXG4gICAgICAgID8gb2JzZXJ2YWJsZU9yVmFsdWVcbiAgICAgICAgOiBvZihvYnNlcnZhYmxlT3JWYWx1ZSk7XG4gICAgICBjb25zdCBzdWJzY3JpcHRpb24gPSBvYnNlcnZhYmxlJFxuICAgICAgICAucGlwZShcbiAgICAgICAgICBjb25jYXRNYXAoKHZhbHVlKSA9PlxuICAgICAgICAgICAgdGhpcy5pc0luaXRpYWxpemVkXG4gICAgICAgICAgICAgID8gLy8gUHVzaCB0aGUgdmFsdWUgaW50byBxdWV1ZVNjaGVkdWxlclxuICAgICAgICAgICAgICAgIHNjaGVkdWxlZChbdmFsdWVdLCBxdWV1ZVNjaGVkdWxlcikucGlwZShcbiAgICAgICAgICAgICAgICAgIHdpdGhMYXRlc3RGcm9tKHRoaXMuc3RhdGVTdWJqZWN0JClcbiAgICAgICAgICAgICAgICApXG4gICAgICAgICAgICAgIDogLy8gSWYgc3RhdGUgd2FzIG5vdCBpbml0aWFsaXplZCwgd2UnbGwgdGhyb3cgYW4gZXJyb3IuXG4gICAgICAgICAgICAgICAgdGhyb3dFcnJvcihuZXcgRXJyb3IodGhpcy5ub3RJbml0aWFsaXplZEVycm9yTWVzc2FnZSkpXG4gICAgICAgICAgKSxcbiAgICAgICAgICB0YWtlVW50aWwodGhpcy5kZXN0cm95JClcbiAgICAgICAgKVxuICAgICAgICAuc3Vic2NyaWJlKHtcbiAgICAgICAgICBuZXh0OiAoW3ZhbHVlLCBjdXJyZW50U3RhdGVdKSA9PiB7XG4gICAgICAgICAgICB0aGlzLnN0YXRlU3ViamVjdCQubmV4dCh1cGRhdGVyRm4oY3VycmVudFN0YXRlLCB2YWx1ZSEpKTtcbiAgICAgICAgICB9LFxuICAgICAgICAgIGVycm9yOiAoZXJyb3I6IEVycm9yKSA9PiB7XG4gICAgICAgICAgICBpbml0aWFsaXphdGlvbkVycm9yID0gZXJyb3I7XG4gICAgICAgICAgICB0aGlzLnN0YXRlU3ViamVjdCQuZXJyb3IoZXJyb3IpO1xuICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuXG4gICAgICBpZiAoaW5pdGlhbGl6YXRpb25FcnJvcikge1xuICAgICAgICAvLyBwcmV0dGllci1pZ25vcmVcbiAgICAgICAgdGhyb3cgLyoqIEB0eXBlIHshRXJyb3J9ICovIChpbml0aWFsaXphdGlvbkVycm9yKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBzdWJzY3JpcHRpb247XG4gICAgfSkgYXMgdW5rbm93bikgYXMgUmV0dXJuVHlwZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplcyBzdGF0ZS4gSWYgaXQgd2FzIGFscmVhZHkgaW5pdGlhbGl6ZWQgdGhlbiBpdCByZXNldHMgdGhlXG4gICAqIHN0YXRlLlxuICAgKi9cbiAgcHJpdmF0ZSBpbml0U3RhdGUoc3RhdGU6IFQpOiB2b2lkIHtcbiAgICBzY2hlZHVsZWQoW3N0YXRlXSwgcXVldWVTY2hlZHVsZXIpLnN1YnNjcmliZSgocykgPT4ge1xuICAgICAgdGhpcy5pc0luaXRpYWxpemVkID0gdHJ1ZTtcbiAgICAgIHRoaXMuc3RhdGVTdWJqZWN0JC5uZXh0KHMpO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIFNldHMgdGhlIHN0YXRlIHNwZWNpZmljIHZhbHVlLlxuICAgKiBAcGFyYW0gc3RhdGVPclVwZGF0ZXJGbiBvYmplY3Qgb2YgdGhlIHNhbWUgdHlwZSBhcyB0aGUgc3RhdGUgb3IgYW5cbiAgICogdXBkYXRlckZuLCByZXR1cm5pbmcgc3VjaCBvYmplY3QuXG4gICAqL1xuICBzZXRTdGF0ZShzdGF0ZU9yVXBkYXRlckZuOiBUIHwgKChzdGF0ZTogVCkgPT4gVCkpOiB2b2lkIHtcbiAgICBpZiAodHlwZW9mIHN0YXRlT3JVcGRhdGVyRm4gIT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHRoaXMuaW5pdFN0YXRlKHN0YXRlT3JVcGRhdGVyRm4pO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnVwZGF0ZXIoc3RhdGVPclVwZGF0ZXJGbiBhcyAoc3RhdGU6IFQpID0+IFQpKCk7XG4gICAgfVxuICB9XG5cbiAgcHJvdGVjdGVkIGdldCgpOiBUO1xuICBwcm90ZWN0ZWQgZ2V0PFI+KHByb2plY3RvcjogKHM6IFQpID0+IFIpOiBSO1xuICBwcm90ZWN0ZWQgZ2V0PFI+KHByb2plY3Rvcj86IChzOiBUKSA9PiBSKTogUiB8IFQge1xuICAgIGlmICghdGhpcy5pc0luaXRpYWxpemVkKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IodGhpcy5ub3RJbml0aWFsaXplZEVycm9yTWVzc2FnZSk7XG4gICAgfVxuICAgIGxldCB2YWx1ZTogUiB8IFQ7XG5cbiAgICB0aGlzLnN0YXRlU3ViamVjdCQucGlwZSh0YWtlKDEpKS5zdWJzY3JpYmUoKHN0YXRlKSA9PiB7XG4gICAgICB2YWx1ZSA9IHByb2plY3RvciA/IHByb2plY3RvcihzdGF0ZSkgOiBzdGF0ZTtcbiAgICB9KTtcbiAgICByZXR1cm4gdmFsdWUhO1xuICB9XG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBzZWxlY3Rvci5cbiAgICpcbiAgICogVGhpcyBzdXBwb3J0cyBjb21iaW5pbmcgdXAgdG8gNCBzZWxlY3RvcnMuIE1vcmUgY291bGQgYmUgYWRkZWQgYXMgbmVlZGVkLlxuICAgKlxuICAgKiBAcGFyYW0gcHJvamVjdG9yIEEgcHVyZSBwcm9qZWN0aW9uIGZ1bmN0aW9uIHRoYXQgdGFrZXMgdGhlIGN1cnJlbnQgc3RhdGUgYW5kXG4gICAqICAgcmV0dXJucyBzb21lIG5ldyBzbGljZS9wcm9qZWN0aW9uIG9mIHRoYXQgc3RhdGUuXG4gICAqIEBwYXJhbSBjb25maWcgU2VsZWN0Q29uZmlnIHRoYXQgY2hhbmdlcyB0aGUgYmVoYXZpb3Igb2Ygc2VsZWN0b3IsIGluY2x1ZGluZ1xuICAgKiAgIHRoZSBkZWJvdW5jaW5nIG9mIHRoZSB2YWx1ZXMgdW50aWwgdGhlIHN0YXRlIGlzIHNldHRsZWQuXG4gICAqIEByZXR1cm4gQW4gb2JzZXJ2YWJsZSBvZiB0aGUgcHJvamVjdG9yIHJlc3VsdHMuXG4gICAqL1xuICBzZWxlY3Q8Uj4ocHJvamVjdG9yOiAoczogVCkgPT4gUiwgY29uZmlnPzogU2VsZWN0Q29uZmlnKTogT2JzZXJ2YWJsZTxSPjtcbiAgc2VsZWN0PFIsIFMxPihcbiAgICBzMTogT2JzZXJ2YWJsZTxTMT4sXG4gICAgcHJvamVjdG9yOiAoczE6IFMxKSA9PiBSLFxuICAgIGNvbmZpZz86IFNlbGVjdENvbmZpZ1xuICApOiBPYnNlcnZhYmxlPFI+O1xuICBzZWxlY3Q8UiwgUzEsIFMyPihcbiAgICBzMTogT2JzZXJ2YWJsZTxTMT4sXG4gICAgczI6IE9ic2VydmFibGU8UzI+LFxuICAgIHByb2plY3RvcjogKHMxOiBTMSwgczI6IFMyKSA9PiBSLFxuICAgIGNvbmZpZz86IFNlbGVjdENvbmZpZ1xuICApOiBPYnNlcnZhYmxlPFI+O1xuICBzZWxlY3Q8UiwgUzEsIFMyLCBTMz4oXG4gICAgczE6IE9ic2VydmFibGU8UzE+LFxuICAgIHMyOiBPYnNlcnZhYmxlPFMyPixcbiAgICBzMzogT2JzZXJ2YWJsZTxTMz4sXG4gICAgcHJvamVjdG9yOiAoczE6IFMxLCBzMjogUzIsIHMzOiBTMykgPT4gUixcbiAgICBjb25maWc/OiBTZWxlY3RDb25maWdcbiAgKTogT2JzZXJ2YWJsZTxSPjtcbiAgc2VsZWN0PFIsIFMxLCBTMiwgUzMsIFM0PihcbiAgICBzMTogT2JzZXJ2YWJsZTxTMT4sXG4gICAgczI6IE9ic2VydmFibGU8UzI+LFxuICAgIHMzOiBPYnNlcnZhYmxlPFMzPixcbiAgICBzNDogT2JzZXJ2YWJsZTxTND4sXG4gICAgcHJvamVjdG9yOiAoczE6IFMxLCBzMjogUzIsIHMzOiBTMywgczQ6IFM0KSA9PiBSLFxuICAgIGNvbmZpZz86IFNlbGVjdENvbmZpZ1xuICApOiBPYnNlcnZhYmxlPFI+O1xuICBzZWxlY3Q8XG4gICAgTyBleHRlbmRzIEFycmF5PE9ic2VydmFibGU8dW5rbm93bj4gfCBTZWxlY3RDb25maWcgfCBQcm9qZWN0b3JGbj4sXG4gICAgUixcbiAgICBQcm9qZWN0b3JGbiA9ICguLi5hOiB1bmtub3duW10pID0+IFJcbiAgPiguLi5hcmdzOiBPKTogT2JzZXJ2YWJsZTxSPiB7XG4gICAgY29uc3QgeyBvYnNlcnZhYmxlcywgcHJvamVjdG9yLCBjb25maWcgfSA9IHByb2Nlc3NTZWxlY3RvckFyZ3MoYXJncyk7XG5cbiAgICBsZXQgb2JzZXJ2YWJsZSQ6IE9ic2VydmFibGU8dW5rbm93bj47XG4gICAgLy8gSWYgdGhlcmUgYXJlIG5vIE9ic2VydmFibGVzIHRvIGNvbWJpbmUsIHRoZW4gd2UnbGwganVzdCBtYXAgdGhlIHZhbHVlLlxuICAgIGlmIChvYnNlcnZhYmxlcy5sZW5ndGggPT09IDApIHtcbiAgICAgIG9ic2VydmFibGUkID0gdGhpcy5zdGF0ZVN1YmplY3QkLnBpcGUoXG4gICAgICAgIGNvbmZpZy5kZWJvdW5jZSA/IGRlYm91bmNlU3luYygpIDogKHNvdXJjZSQpID0+IHNvdXJjZSQsXG4gICAgICAgIG1hcChwcm9qZWN0b3IpXG4gICAgICApO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBJZiB0aGVyZSBhcmUgbXVsdGlwbGUgYXJndW1lbnRzLCB0aGVuIHdlJ3JlIGFnZ3JlZ2F0aW5nIHNlbGVjdG9ycywgc28gd2UgbmVlZFxuICAgICAgLy8gdG8gdGFrZSB0aGUgY29tYmluZUxhdGVzdCBvZiB0aGVtIGJlZm9yZSBjYWxsaW5nIHRoZSBtYXAgZnVuY3Rpb24uXG4gICAgICBvYnNlcnZhYmxlJCA9IGNvbWJpbmVMYXRlc3Qob2JzZXJ2YWJsZXMpLnBpcGUoXG4gICAgICAgIGNvbmZpZy5kZWJvdW5jZSA/IGRlYm91bmNlU3luYygpIDogKHNvdXJjZSQpID0+IHNvdXJjZSQsXG4gICAgICAgIG1hcCgocHJvamVjdG9yQXJncykgPT4gcHJvamVjdG9yKC4uLnByb2plY3RvckFyZ3MpKVxuICAgICAgKTtcbiAgICB9XG4gICAgcmV0dXJuIChvYnNlcnZhYmxlJCBhcyBPYnNlcnZhYmxlPFI+KS5waXBlKFxuICAgICAgZGlzdGluY3RVbnRpbENoYW5nZWQoKSxcbiAgICAgIHNoYXJlUmVwbGF5KHtcbiAgICAgICAgcmVmQ291bnQ6IHRydWUsXG4gICAgICAgIGJ1ZmZlclNpemU6IDEsXG4gICAgICB9KSxcbiAgICAgIHRha2VVbnRpbCh0aGlzLmRlc3Ryb3kkKVxuICAgICk7XG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlcyBhbiBlZmZlY3QuXG4gICAqXG4gICAqIFRoaXMgZWZmZWN0IGlzIHN1YnNjcmliZWQgdG8gZm9yIHRoZSBsaWZlIG9mIHRoZSBAQ29tcG9uZW50LlxuICAgKiBAcGFyYW0gZ2VuZXJhdG9yIEEgZnVuY3Rpb24gdGhhdCB0YWtlcyBhbiBvcmlnaW4gT2JzZXJ2YWJsZSBpbnB1dCBhbmRcbiAgICogICAgIHJldHVybnMgYW4gT2JzZXJ2YWJsZS4gVGhlIE9ic2VydmFibGUgdGhhdCBpcyByZXR1cm5lZCB3aWxsIGJlXG4gICAqICAgICBzdWJzY3JpYmVkIHRvIGZvciB0aGUgbGlmZSBvZiB0aGUgY29tcG9uZW50LlxuICAgKiBAcmV0dXJuIEEgZnVuY3Rpb24gdGhhdCwgd2hlbiBjYWxsZWQsIHdpbGwgdHJpZ2dlciB0aGUgb3JpZ2luIE9ic2VydmFibGUuXG4gICAqL1xuICBlZmZlY3Q8XG4gICAgLy8gVGhpcyB0eXBlIHF1aWNrbHkgYmVjYW1lIHBhcnQgb2YgZWZmZWN0ICdBUEknXG4gICAgUHJvdmlkZWRUeXBlID0gdm9pZCxcbiAgICAvLyBUaGUgYWN0dWFsIG9yaWdpbiQgdHlwZSwgd2hpY2ggY291bGQgYmUgdW5rbm93biwgd2hlbiBub3Qgc3BlY2lmaWVkXG4gICAgT3JpZ2luVHlwZSBleHRlbmRzIE9ic2VydmFibGU8UHJvdmlkZWRUeXBlPiB8IHVua25vd24gPSBPYnNlcnZhYmxlPFxuICAgICAgUHJvdmlkZWRUeXBlXG4gICAgPixcbiAgICAvLyBVbndyYXBwZWQgYWN0dWFsIHR5cGUgb2YgdGhlIG9yaWdpbiQgT2JzZXJ2YWJsZSwgYWZ0ZXIgZGVmYXVsdCB3YXMgYXBwbGllZFxuICAgIE9ic2VydmFibGVUeXBlID0gT3JpZ2luVHlwZSBleHRlbmRzIE9ic2VydmFibGU8aW5mZXIgQT4gPyBBIDogbmV2ZXIsXG4gICAgLy8gUmV0dXJuIGVpdGhlciBhbiBlbXB0eSBjYWxsYmFjayBvciBhIGZ1bmN0aW9uIHJlcXVpcmluZyBzcGVjaWZpYyB0eXBlcyBhcyBpbnB1dHNcbiAgICBSZXR1cm5UeXBlID0gUHJvdmlkZWRUeXBlIHwgT2JzZXJ2YWJsZVR5cGUgZXh0ZW5kcyB2b2lkXG4gICAgICA/ICgpID0+IHZvaWRcbiAgICAgIDogKFxuICAgICAgICAgIG9ic2VydmFibGVPclZhbHVlOiBPYnNlcnZhYmxlVHlwZSB8IE9ic2VydmFibGU8T2JzZXJ2YWJsZVR5cGU+XG4gICAgICAgICkgPT4gU3Vic2NyaXB0aW9uXG4gID4oZ2VuZXJhdG9yOiAob3JpZ2luJDogT3JpZ2luVHlwZSkgPT4gT2JzZXJ2YWJsZTx1bmtub3duPik6IFJldHVyblR5cGUge1xuICAgIGNvbnN0IG9yaWdpbiQgPSBuZXcgU3ViamVjdDxPYnNlcnZhYmxlVHlwZT4oKTtcbiAgICBnZW5lcmF0b3Iob3JpZ2luJCBhcyBPcmlnaW5UeXBlKVxuICAgICAgLy8gdGllZCB0byB0aGUgbGlmZWN5Y2xlIPCfkYcgb2YgQ29tcG9uZW50U3RvcmVcbiAgICAgIC5waXBlKHRha2VVbnRpbCh0aGlzLmRlc3Ryb3kkKSlcbiAgICAgIC5zdWJzY3JpYmUoKTtcblxuICAgIHJldHVybiAoKChcbiAgICAgIG9ic2VydmFibGVPclZhbHVlPzogT2JzZXJ2YWJsZVR5cGUgfCBPYnNlcnZhYmxlPE9ic2VydmFibGVUeXBlPlxuICAgICk6IFN1YnNjcmlwdGlvbiA9PiB7XG4gICAgICBjb25zdCBvYnNlcnZhYmxlJCA9IGlzT2JzZXJ2YWJsZShvYnNlcnZhYmxlT3JWYWx1ZSlcbiAgICAgICAgPyBvYnNlcnZhYmxlT3JWYWx1ZVxuICAgICAgICA6IG9mKG9ic2VydmFibGVPclZhbHVlKTtcbiAgICAgIHJldHVybiBvYnNlcnZhYmxlJC5waXBlKHRha2VVbnRpbCh0aGlzLmRlc3Ryb3kkKSkuc3Vic2NyaWJlKCh2YWx1ZSkgPT4ge1xuICAgICAgICAvLyBhbnkgbmV3IPCfkYcgdmFsdWUgaXMgcHVzaGVkIGludG8gYSBzdHJlYW1cbiAgICAgICAgb3JpZ2luJC5uZXh0KHZhbHVlKTtcbiAgICAgIH0pO1xuICAgIH0pIGFzIHVua25vd24pIGFzIFJldHVyblR5cGU7XG4gIH1cbn1cblxuZnVuY3Rpb24gcHJvY2Vzc1NlbGVjdG9yQXJnczxcbiAgTyBleHRlbmRzIEFycmF5PE9ic2VydmFibGU8dW5rbm93bj4gfCBTZWxlY3RDb25maWcgfCBQcm9qZWN0b3JGbj4sXG4gIFIsXG4gIFByb2plY3RvckZuID0gKC4uLmE6IHVua25vd25bXSkgPT4gUlxuPihcbiAgYXJnczogT1xuKToge1xuICBvYnNlcnZhYmxlczogT2JzZXJ2YWJsZTx1bmtub3duPltdO1xuICBwcm9qZWN0b3I6IFByb2plY3RvckZuO1xuICBjb25maWc6IFJlcXVpcmVkPFNlbGVjdENvbmZpZz47XG59IHtcbiAgY29uc3Qgc2VsZWN0b3JBcmdzID0gQXJyYXkuZnJvbShhcmdzKTtcbiAgLy8gQXNzaWduIGRlZmF1bHQgdmFsdWVzLlxuICBsZXQgY29uZmlnOiBSZXF1aXJlZDxTZWxlY3RDb25maWc+ID0geyBkZWJvdW5jZTogZmFsc2UgfTtcbiAgbGV0IHByb2plY3RvcjogUHJvamVjdG9yRm47XG4gIC8vIExhc3QgYXJndW1lbnQgaXMgZWl0aGVyIHByb2plY3RvciBvciBjb25maWdcbiAgY29uc3QgcHJvamVjdG9yT3JDb25maWcgPSBzZWxlY3RvckFyZ3MucG9wKCkgYXMgUHJvamVjdG9yRm4gfCBTZWxlY3RDb25maWc7XG5cbiAgaWYgKHR5cGVvZiBwcm9qZWN0b3JPckNvbmZpZyAhPT0gJ2Z1bmN0aW9uJykge1xuICAgIC8vIFdlIGdvdCB0aGUgY29uZmlnIGFzIHRoZSBsYXN0IGFyZ3VtZW50LCByZXBsYWNlIGFueSBkZWZhdWx0IHZhbHVlcyB3aXRoIGl0LlxuICAgIGNvbmZpZyA9IHsgLi4uY29uZmlnLCAuLi5wcm9qZWN0b3JPckNvbmZpZyB9O1xuICAgIC8vIFBvcCB0aGUgbmV4dCBhcmdzLCB3aGljaCB3b3VsZCBiZSB0aGUgcHJvamVjdG9yIGZuLlxuICAgIHByb2plY3RvciA9IHNlbGVjdG9yQXJncy5wb3AoKSBhcyBQcm9qZWN0b3JGbjtcbiAgfSBlbHNlIHtcbiAgICBwcm9qZWN0b3IgPSBwcm9qZWN0b3JPckNvbmZpZztcbiAgfVxuICAvLyBUaGUgT2JzZXJ2YWJsZXMgdG8gY29tYmluZSwgaWYgdGhlcmUgYXJlIGFueS5cbiAgY29uc3Qgb2JzZXJ2YWJsZXMgPSBzZWxlY3RvckFyZ3MgYXMgT2JzZXJ2YWJsZTx1bmtub3duPltdO1xuICByZXR1cm4ge1xuICAgIG9ic2VydmFibGVzLFxuICAgIHByb2plY3RvcixcbiAgICBjb25maWcsXG4gIH07XG59XG4iXX0=