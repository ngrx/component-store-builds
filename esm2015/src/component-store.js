/**
 * @fileoverview added by tsickle
 * Generated from: src/component-store.ts
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
import { isObservable, of, ReplaySubject, throwError, combineLatest, Subject, } from 'rxjs';
import { concatMap, takeUntil, withLatestFrom, map, distinctUntilChanged, shareReplay, } from 'rxjs/operators';
import { debounceSync } from './debounceSync';
import { Injectable, Optional, InjectionToken, Inject, } from '@angular/core';
/**
 * Return type of the effect, that behaves differently based on whether the
 * argument is passed to the callback.
 * @record
 * @template T
 */
export function EffectReturnFn() { }
/** @type {?} */
export const initialStateToken = new InjectionToken('ComponentStore InitState');
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
        // Exposed to any extending Store to be used for the teardowns.
        this.destroy$ = this.destroySubject$.asObservable();
        this.stateSubject$ = new ReplaySubject(1);
        this.isInitialized = false;
        // Needs to be after destroy$ is declared because it's used in select.
        this.state$ = this.select((/**
         * @param {?} s
         * @return {?}
         */
        (s) => s));
        // State can be initialized either through constructor, or initState or
        // setState.
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
     * @template V
     * @param {?} updaterFn A static updater function that takes 2 parameters (the
     * current state and an argument object) and returns a new instance of the
     * state.
     * @return {?} A function that accepts one argument which is forwarded as the
     *     second argument to `updaterFn`. Everytime this function is called
     *     subscribers will be notified of the state change.
     */
    updater(updaterFn) {
        return (/** @type {?} */ (((/**
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
                ? of(value).pipe(withLatestFrom(this.stateSubject$))
                : // If state was not initialized, we'll throw an error.
                    throwError(Error(`${this.constructor.name} has not been initialized`)))), takeUntil(this.destroy$))
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
        }))));
    }
    /**
     * Initializes state. If it was already initialized then it resets the
     * state.
     * @private
     * @param {?} state
     * @return {?}
     */
    initState(state) {
        this.isInitialized = true;
        this.stateSubject$.next(state);
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
     * @template R
     * @param {...?} args
     * @return {?}
     */
    select(...args) {
        /** @type {?} */
        let observable$;
        // project is always the last argument, so `pop` it from args.
        /** @type {?} */
        const projector = args.pop();
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
            (args) => projector(...args))));
        }
        /** @type {?} */
        const distinctSharedObservable$ = observable$.pipe(distinctUntilChanged(), shareReplay({
            refCount: true,
            bufferSize: 1,
        }), takeUntil(this.destroy$));
        return distinctSharedObservable$;
    }
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
    effect(generator) {
        /** @type {?} */
        const origin$ = new Subject();
        generator(origin$)
            // tied to the lifecycle 👇 of ComponentStore
            .pipe(takeUntil(this.destroy$))
            .subscribe();
        return (/**
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
        });
    }
}
ComponentStore.decorators = [
    { type: Injectable }
];
/** @nocollapse */
ComponentStore.ctorParameters = () => [
    { type: undefined, decorators: [{ type: Optional }, { type: Inject, args: [initialStateToken,] }] }
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
    /** @type {?} */
    ComponentStore.prototype.state$;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcG9uZW50LXN0b3JlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vbW9kdWxlcy9jb21wb25lbnQtc3RvcmUvc3JjL2NvbXBvbmVudC1zdG9yZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7OztBQUFBLE9BQU8sRUFDTCxZQUFZLEVBRVosRUFBRSxFQUNGLGFBQWEsRUFFYixVQUFVLEVBQ1YsYUFBYSxFQUNiLE9BQU8sR0FDUixNQUFNLE1BQU0sQ0FBQztBQUNkLE9BQU8sRUFDTCxTQUFTLEVBQ1QsU0FBUyxFQUNULGNBQWMsRUFDZCxHQUFHLEVBQ0gsb0JBQW9CLEVBQ3BCLFdBQVcsR0FDWixNQUFNLGdCQUFnQixDQUFDO0FBQ3hCLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQztBQUM5QyxPQUFPLEVBQ0wsVUFBVSxFQUVWLFFBQVEsRUFDUixjQUFjLEVBQ2QsTUFBTSxHQUNQLE1BQU0sZUFBZSxDQUFDOzs7Ozs7O0FBTXZCLG9DQUdDOztBQUVELE1BQU0sT0FBTyxpQkFBaUIsR0FBRyxJQUFJLGNBQWMsQ0FBQywwQkFBMEIsQ0FBQzs7OztBQUcvRSxNQUFNLE9BQU8sY0FBYzs7OztJQVd6QixZQUFtRCxZQUFnQjs7UUFUbEQsb0JBQWUsR0FBRyxJQUFJLGFBQWEsQ0FBTyxDQUFDLENBQUMsQ0FBQzs7UUFFckQsYUFBUSxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsWUFBWSxFQUFFLENBQUM7UUFFdkMsa0JBQWEsR0FBRyxJQUFJLGFBQWEsQ0FBSSxDQUFDLENBQUMsQ0FBQztRQUNqRCxrQkFBYSxHQUFHLEtBQUssQ0FBQzs7UUFFckIsV0FBTSxHQUFrQixJQUFJLENBQUMsTUFBTTs7OztRQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQztRQUdyRCx1RUFBdUU7UUFDdkUsWUFBWTtRQUNaLElBQUksWUFBWSxFQUFFO1lBQ2hCLElBQUksQ0FBQyxTQUFTLENBQUMsWUFBWSxDQUFDLENBQUM7U0FDOUI7SUFDSCxDQUFDOzs7OztJQUdELFdBQVc7UUFDVCxJQUFJLENBQUMsYUFBYSxDQUFDLFFBQVEsRUFBRSxDQUFDO1FBQzlCLElBQUksQ0FBQyxlQUFlLENBQUMsSUFBSSxFQUFFLENBQUM7SUFDOUIsQ0FBQzs7Ozs7Ozs7Ozs7Ozs7Ozs7SUFpQkQsT0FBTyxDQUNMLFNBQW9DO1FBRXBDLE9BQU8sbUJBQUE7Ozs7UUFBQyxDQUFDLGlCQUFxQyxFQUFnQixFQUFFOztnQkFDMUQsbUJBQXNDOzs7OztrQkFJcEMsV0FBVyxHQUFHLFlBQVksQ0FBQyxpQkFBaUIsQ0FBQztnQkFDakQsQ0FBQyxDQUFDLGlCQUFpQjtnQkFDbkIsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQzs7a0JBQ25CLFlBQVksR0FBRyxXQUFXO2lCQUM3QixJQUFJLENBQ0gsU0FBUzs7OztZQUFDLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FDbEIsSUFBSSxDQUFDLGFBQWE7Z0JBQ2hCLENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUM7Z0JBQ3BELENBQUMsQ0FBQyxzREFBc0Q7b0JBQ3RELFVBQVUsQ0FDUixLQUFLLENBQUMsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksMkJBQTJCLENBQUMsQ0FDM0QsRUFDTixFQUNELFNBQVMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQ3pCO2lCQUNBLFNBQVMsQ0FBQztnQkFDVCxJQUFJOzs7O2dCQUFFLENBQUMsQ0FBQyxLQUFLLEVBQUUsWUFBWSxDQUFDLEVBQUUsRUFBRTtvQkFDOUIsSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLFlBQVksRUFBRSxtQkFBQSxLQUFLLEVBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQzNELENBQUMsQ0FBQTtnQkFDRCxLQUFLOzs7O2dCQUFFLENBQUMsS0FBWSxFQUFFLEVBQUU7b0JBQ3RCLG1CQUFtQixHQUFHLEtBQUssQ0FBQztvQkFDNUIsSUFBSSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUM7Z0JBQ2xDLENBQUMsQ0FBQTthQUNGLENBQUM7WUFFSixJQUFJLG1CQUFtQixFQUFFO2dCQUN2QixrQkFBa0I7Z0JBQ2xCLE1BQU0scUJBQXFCLENBQUMsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO2FBQ25EO1lBQ0QsT0FBTyxZQUFZLENBQUM7UUFDdEIsQ0FBQyxFQUFDLEVBRXdDLENBQUM7SUFDN0MsQ0FBQzs7Ozs7Ozs7SUFNTyxTQUFTLENBQUMsS0FBUTtRQUN4QixJQUFJLENBQUMsYUFBYSxHQUFHLElBQUksQ0FBQztRQUMxQixJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUNqQyxDQUFDOzs7Ozs7O0lBT0QsUUFBUSxDQUFDLGdCQUF1QztRQUM5QyxJQUFJLE9BQU8sZ0JBQWdCLEtBQUssVUFBVSxFQUFFO1lBQzFDLElBQUksQ0FBQyxTQUFTLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztTQUNsQzthQUFNO1lBQ0wsSUFBSSxDQUFDLE9BQU8sQ0FBQyxtQkFBQSxnQkFBZ0IsRUFBbUIsQ0FBQyxFQUFFLENBQUM7U0FDckQ7SUFDSCxDQUFDOzs7Ozs7SUErQkQsTUFBTSxDQUFJLEdBQUcsSUFBVzs7WUFDbEIsV0FBMEI7OztjQUV4QixTQUFTLEdBQTBCLElBQUksQ0FBQyxHQUFHLEVBQUU7UUFDbkQsSUFBSSxJQUFJLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtZQUNyQixrRUFBa0U7WUFDbEUsV0FBVyxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO1NBQ3ZEO2FBQU07WUFDTCx3RUFBd0U7WUFDeEUscUVBQXFFO1lBQ3JFLFdBQVcsR0FBRyxhQUFhLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSTtZQUNwQyxzRUFBc0U7WUFDdEUsaUNBQWlDO1lBQ2pDLFlBQVksRUFBRSxFQUNkLEdBQUc7Ozs7WUFBQyxDQUFDLElBQVcsRUFBRSxFQUFFLENBQUMsU0FBUyxDQUFDLEdBQUcsSUFBSSxDQUFDLEVBQUMsQ0FDekMsQ0FBQztTQUNIOztjQUNLLHlCQUF5QixHQUFHLFdBQVcsQ0FBQyxJQUFJLENBQ2hELG9CQUFvQixFQUFFLEVBQ3RCLFdBQVcsQ0FBQztZQUNWLFFBQVEsRUFBRSxJQUFJO1lBQ2QsVUFBVSxFQUFFLENBQUM7U0FDZCxDQUFDLEVBQ0YsU0FBUyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FDekI7UUFDRCxPQUFPLHlCQUF5QixDQUFDO0lBQ25DLENBQUM7Ozs7Ozs7Ozs7O0lBV0QsTUFBTSxDQUNKLFNBQW9EOztjQUU5QyxPQUFPLEdBQUcsSUFBSSxPQUFPLEVBQUs7UUFDaEMsU0FBUyxDQUFDLE9BQU8sQ0FBQztZQUNoQiw2Q0FBNkM7YUFDNUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7YUFDOUIsU0FBUyxFQUFFLENBQUM7UUFFZjs7OztRQUFPLENBQUMsaUJBQXFDLEVBQWdCLEVBQUU7O2tCQUN2RCxXQUFXLEdBQUcsWUFBWSxDQUFDLGlCQUFpQixDQUFDO2dCQUNqRCxDQUFDLENBQUMsaUJBQWlCO2dCQUNuQixDQUFDLENBQUMsRUFBRSxDQUFDLGlCQUFpQixDQUFDO1lBQ3pCLE9BQU8sV0FBVyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsU0FBUzs7OztZQUFDLENBQUMsS0FBSyxFQUFFLEVBQUU7Z0JBQ3BFLDJDQUEyQztnQkFDM0MsT0FBTyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUN0QixDQUFDLEVBQUMsQ0FBQztRQUNMLENBQUMsRUFBQztJQUNKLENBQUM7OztZQTlMRixVQUFVOzs7OzRDQVlJLFFBQVEsWUFBSSxNQUFNLFNBQUMsaUJBQWlCOzs7Ozs7O0lBVGpELHlDQUE4RDs7SUFFOUQsa0NBQXdEOzs7OztJQUV4RCx1Q0FBeUQ7Ozs7O0lBQ3pELHVDQUE4Qjs7SUFFOUIsZ0NBQXVEIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtcbiAgaXNPYnNlcnZhYmxlLFxuICBPYnNlcnZhYmxlLFxuICBvZixcbiAgUmVwbGF5U3ViamVjdCxcbiAgU3Vic2NyaXB0aW9uLFxuICB0aHJvd0Vycm9yLFxuICBjb21iaW5lTGF0ZXN0LFxuICBTdWJqZWN0LFxufSBmcm9tICdyeGpzJztcbmltcG9ydCB7XG4gIGNvbmNhdE1hcCxcbiAgdGFrZVVudGlsLFxuICB3aXRoTGF0ZXN0RnJvbSxcbiAgbWFwLFxuICBkaXN0aW5jdFVudGlsQ2hhbmdlZCxcbiAgc2hhcmVSZXBsYXksXG59IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCB7IGRlYm91bmNlU3luYyB9IGZyb20gJy4vZGVib3VuY2VTeW5jJztcbmltcG9ydCB7XG4gIEluamVjdGFibGUsXG4gIE9uRGVzdHJveSxcbiAgT3B0aW9uYWwsXG4gIEluamVjdGlvblRva2VuLFxuICBJbmplY3QsXG59IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuXG4vKipcbiAqIFJldHVybiB0eXBlIG9mIHRoZSBlZmZlY3QsIHRoYXQgYmVoYXZlcyBkaWZmZXJlbnRseSBiYXNlZCBvbiB3aGV0aGVyIHRoZVxuICogYXJndW1lbnQgaXMgcGFzc2VkIHRvIHRoZSBjYWxsYmFjay5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBFZmZlY3RSZXR1cm5GbjxUPiB7XG4gICgpOiB2b2lkO1xuICAodDogVCB8IE9ic2VydmFibGU8VD4pOiBTdWJzY3JpcHRpb247XG59XG5cbmV4cG9ydCBjb25zdCBpbml0aWFsU3RhdGVUb2tlbiA9IG5ldyBJbmplY3Rpb25Ub2tlbignQ29tcG9uZW50U3RvcmUgSW5pdFN0YXRlJyk7XG5cbkBJbmplY3RhYmxlKClcbmV4cG9ydCBjbGFzcyBDb21wb25lbnRTdG9yZTxUIGV4dGVuZHMgb2JqZWN0PiBpbXBsZW1lbnRzIE9uRGVzdHJveSB7XG4gIC8vIFNob3VsZCBiZSB1c2VkIG9ubHkgaW4gbmdPbkRlc3Ryb3kuXG4gIHByaXZhdGUgcmVhZG9ubHkgZGVzdHJveVN1YmplY3QkID0gbmV3IFJlcGxheVN1YmplY3Q8dm9pZD4oMSk7XG4gIC8vIEV4cG9zZWQgdG8gYW55IGV4dGVuZGluZyBTdG9yZSB0byBiZSB1c2VkIGZvciB0aGUgdGVhcmRvd25zLlxuICByZWFkb25seSBkZXN0cm95JCA9IHRoaXMuZGVzdHJveVN1YmplY3QkLmFzT2JzZXJ2YWJsZSgpO1xuXG4gIHByaXZhdGUgcmVhZG9ubHkgc3RhdGVTdWJqZWN0JCA9IG5ldyBSZXBsYXlTdWJqZWN0PFQ+KDEpO1xuICBwcml2YXRlIGlzSW5pdGlhbGl6ZWQgPSBmYWxzZTtcbiAgLy8gTmVlZHMgdG8gYmUgYWZ0ZXIgZGVzdHJveSQgaXMgZGVjbGFyZWQgYmVjYXVzZSBpdCdzIHVzZWQgaW4gc2VsZWN0LlxuICByZWFkb25seSBzdGF0ZSQ6IE9ic2VydmFibGU8VD4gPSB0aGlzLnNlbGVjdCgocykgPT4gcyk7XG5cbiAgY29uc3RydWN0b3IoQE9wdGlvbmFsKCkgQEluamVjdChpbml0aWFsU3RhdGVUb2tlbikgZGVmYXVsdFN0YXRlPzogVCkge1xuICAgIC8vIFN0YXRlIGNhbiBiZSBpbml0aWFsaXplZCBlaXRoZXIgdGhyb3VnaCBjb25zdHJ1Y3Rvciwgb3IgaW5pdFN0YXRlIG9yXG4gICAgLy8gc2V0U3RhdGUuXG4gICAgaWYgKGRlZmF1bHRTdGF0ZSkge1xuICAgICAgdGhpcy5pbml0U3RhdGUoZGVmYXVsdFN0YXRlKTtcbiAgICB9XG4gIH1cblxuICAvKiogQ29tcGxldGVzIGFsbCByZWxldmFudCBPYnNlcnZhYmxlIHN0cmVhbXMuICovXG4gIG5nT25EZXN0cm95KCkge1xuICAgIHRoaXMuc3RhdGVTdWJqZWN0JC5jb21wbGV0ZSgpO1xuICAgIHRoaXMuZGVzdHJveVN1YmplY3QkLm5leHQoKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGVzIGFuIHVwZGF0ZXIuXG4gICAqXG4gICAqIFRocm93cyBhbiBlcnJvciBpZiB1cGRhdGVyIGlzIGNhbGxlZCB3aXRoIHN5bmNocm9ub3VzIHZhbHVlcyAoZWl0aGVyXG4gICAqIGltcGVyYXRpdmUgdmFsdWUgb3IgT2JzZXJ2YWJsZSB0aGF0IGlzIHN5bmNocm9ub3VzKSBiZWZvcmUgQ29tcG9uZW50U3RvcmVcbiAgICogaXMgaW5pdGlhbGl6ZWQuIElmIGNhbGxlZCB3aXRoIGFzeW5jIE9ic2VydmFibGUgYmVmb3JlIGluaXRpYWxpemF0aW9uIHRoZW5cbiAgICogc3RhdGUgd2lsbCBub3QgYmUgdXBkYXRlZCBhbmQgc3Vic2NyaXB0aW9uIHdvdWxkIGJlIGNsb3NlZC5cbiAgICpcbiAgICogQHBhcmFtIHVwZGF0ZXJGbiBBIHN0YXRpYyB1cGRhdGVyIGZ1bmN0aW9uIHRoYXQgdGFrZXMgMiBwYXJhbWV0ZXJzICh0aGVcbiAgICogY3VycmVudCBzdGF0ZSBhbmQgYW4gYXJndW1lbnQgb2JqZWN0KSBhbmQgcmV0dXJucyBhIG5ldyBpbnN0YW5jZSBvZiB0aGVcbiAgICogc3RhdGUuXG4gICAqIEByZXR1cm4gQSBmdW5jdGlvbiB0aGF0IGFjY2VwdHMgb25lIGFyZ3VtZW50IHdoaWNoIGlzIGZvcndhcmRlZCBhcyB0aGVcbiAgICogICAgIHNlY29uZCBhcmd1bWVudCB0byBgdXBkYXRlckZuYC4gRXZlcnl0aW1lIHRoaXMgZnVuY3Rpb24gaXMgY2FsbGVkXG4gICAqICAgICBzdWJzY3JpYmVycyB3aWxsIGJlIG5vdGlmaWVkIG9mIHRoZSBzdGF0ZSBjaGFuZ2UuXG4gICAqL1xuICB1cGRhdGVyPFY+KFxuICAgIHVwZGF0ZXJGbjogKHN0YXRlOiBULCB2YWx1ZTogVikgPT4gVFxuICApOiB1bmtub3duIGV4dGVuZHMgViA/ICgpID0+IHZvaWQgOiAodDogViB8IE9ic2VydmFibGU8Vj4pID0+IFN1YnNjcmlwdGlvbiB7XG4gICAgcmV0dXJuICgob2JzZXJ2YWJsZU9yVmFsdWU/OiBWIHwgT2JzZXJ2YWJsZTxWPik6IFN1YnNjcmlwdGlvbiA9PiB7XG4gICAgICBsZXQgaW5pdGlhbGl6YXRpb25FcnJvcjogRXJyb3IgfCB1bmRlZmluZWQ7XG4gICAgICAvLyBXZSBjYW4gcmVjZWl2ZSBlaXRoZXIgdGhlIHZhbHVlIG9yIGFuIG9ic2VydmFibGUuIEluIGNhc2UgaXQncyBhXG4gICAgICAvLyBzaW1wbGUgdmFsdWUsIHdlJ2xsIHdyYXAgaXQgd2l0aCBgb2ZgIG9wZXJhdG9yIHRvIHR1cm4gaXQgaW50b1xuICAgICAgLy8gT2JzZXJ2YWJsZS5cbiAgICAgIGNvbnN0IG9ic2VydmFibGUkID0gaXNPYnNlcnZhYmxlKG9ic2VydmFibGVPclZhbHVlKVxuICAgICAgICA/IG9ic2VydmFibGVPclZhbHVlXG4gICAgICAgIDogb2Yob2JzZXJ2YWJsZU9yVmFsdWUpO1xuICAgICAgY29uc3Qgc3Vic2NyaXB0aW9uID0gb2JzZXJ2YWJsZSRcbiAgICAgICAgLnBpcGUoXG4gICAgICAgICAgY29uY2F0TWFwKCh2YWx1ZSkgPT5cbiAgICAgICAgICAgIHRoaXMuaXNJbml0aWFsaXplZFxuICAgICAgICAgICAgICA/IG9mKHZhbHVlKS5waXBlKHdpdGhMYXRlc3RGcm9tKHRoaXMuc3RhdGVTdWJqZWN0JCkpXG4gICAgICAgICAgICAgIDogLy8gSWYgc3RhdGUgd2FzIG5vdCBpbml0aWFsaXplZCwgd2UnbGwgdGhyb3cgYW4gZXJyb3IuXG4gICAgICAgICAgICAgICAgdGhyb3dFcnJvcihcbiAgICAgICAgICAgICAgICAgIEVycm9yKGAke3RoaXMuY29uc3RydWN0b3IubmFtZX0gaGFzIG5vdCBiZWVuIGluaXRpYWxpemVkYClcbiAgICAgICAgICAgICAgICApXG4gICAgICAgICAgKSxcbiAgICAgICAgICB0YWtlVW50aWwodGhpcy5kZXN0cm95JClcbiAgICAgICAgKVxuICAgICAgICAuc3Vic2NyaWJlKHtcbiAgICAgICAgICBuZXh0OiAoW3ZhbHVlLCBjdXJyZW50U3RhdGVdKSA9PiB7XG4gICAgICAgICAgICB0aGlzLnN0YXRlU3ViamVjdCQubmV4dCh1cGRhdGVyRm4oY3VycmVudFN0YXRlLCB2YWx1ZSEpKTtcbiAgICAgICAgICB9LFxuICAgICAgICAgIGVycm9yOiAoZXJyb3I6IEVycm9yKSA9PiB7XG4gICAgICAgICAgICBpbml0aWFsaXphdGlvbkVycm9yID0gZXJyb3I7XG4gICAgICAgICAgICB0aGlzLnN0YXRlU3ViamVjdCQuZXJyb3IoZXJyb3IpO1xuICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuXG4gICAgICBpZiAoaW5pdGlhbGl6YXRpb25FcnJvcikge1xuICAgICAgICAvLyBwcmV0dGllci1pZ25vcmVcbiAgICAgICAgdGhyb3cgLyoqIEB0eXBlIHshRXJyb3J9ICovIChpbml0aWFsaXphdGlvbkVycm9yKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBzdWJzY3JpcHRpb247XG4gICAgfSkgYXMgdW5rbm93biBleHRlbmRzIFZcbiAgICAgID8gKCkgPT4gdm9pZFxuICAgICAgOiAodDogViB8IE9ic2VydmFibGU8Vj4pID0+IFN1YnNjcmlwdGlvbjtcbiAgfVxuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplcyBzdGF0ZS4gSWYgaXQgd2FzIGFscmVhZHkgaW5pdGlhbGl6ZWQgdGhlbiBpdCByZXNldHMgdGhlXG4gICAqIHN0YXRlLlxuICAgKi9cbiAgcHJpdmF0ZSBpbml0U3RhdGUoc3RhdGU6IFQpOiB2b2lkIHtcbiAgICB0aGlzLmlzSW5pdGlhbGl6ZWQgPSB0cnVlO1xuICAgIHRoaXMuc3RhdGVTdWJqZWN0JC5uZXh0KHN0YXRlKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBTZXRzIHRoZSBzdGF0ZSBzcGVjaWZpYyB2YWx1ZS5cbiAgICogQHBhcmFtIHN0YXRlT3JVcGRhdGVyRm4gb2JqZWN0IG9mIHRoZSBzYW1lIHR5cGUgYXMgdGhlIHN0YXRlIG9yIGFuXG4gICAqIHVwZGF0ZXJGbiwgcmV0dXJuaW5nIHN1Y2ggb2JqZWN0LlxuICAgKi9cbiAgc2V0U3RhdGUoc3RhdGVPclVwZGF0ZXJGbjogVCB8ICgoc3RhdGU6IFQpID0+IFQpKTogdm9pZCB7XG4gICAgaWYgKHR5cGVvZiBzdGF0ZU9yVXBkYXRlckZuICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICB0aGlzLmluaXRTdGF0ZShzdGF0ZU9yVXBkYXRlckZuKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy51cGRhdGVyKHN0YXRlT3JVcGRhdGVyRm4gYXMgKHN0YXRlOiBUKSA9PiBUKSgpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgc2VsZWN0b3IuXG4gICAqXG4gICAqIFRoaXMgc3VwcG9ydHMgY2hhaW5pbmcgdXAgdG8gNCBzZWxlY3RvcnMuIE1vcmUgY291bGQgYmUgYWRkZWQgYXMgbmVlZGVkLlxuICAgKlxuICAgKiBAcGFyYW0gcHJvamVjdG9yIEEgcHVyZSBwcm9qZWN0aW9uIGZ1bmN0aW9uIHRoYXQgdGFrZXMgdGhlIGN1cnJlbnQgc3RhdGUgYW5kXG4gICAqICAgcmV0dXJucyBzb21lIG5ldyBzbGljZS9wcm9qZWN0aW9uIG9mIHRoYXQgc3RhdGUuXG4gICAqIEByZXR1cm4gQW4gb2JzZXJ2YWJsZSBvZiB0aGUgcHJvamVjdG9yIHJlc3VsdHMuXG4gICAqL1xuICBzZWxlY3Q8Uj4ocHJvamVjdG9yOiAoczogVCkgPT4gUik6IE9ic2VydmFibGU8Uj47XG4gIHNlbGVjdDxSLCBTMT4oczE6IE9ic2VydmFibGU8UzE+LCBwcm9qZWN0b3I6IChzMTogUzEpID0+IFIpOiBPYnNlcnZhYmxlPFI+O1xuICBzZWxlY3Q8UiwgUzEsIFMyPihcbiAgICBzMTogT2JzZXJ2YWJsZTxTMT4sXG4gICAgczI6IE9ic2VydmFibGU8UzI+LFxuICAgIHByb2plY3RvcjogKHMxOiBTMSwgczI6IFMyKSA9PiBSXG4gICk6IE9ic2VydmFibGU8Uj47XG4gIHNlbGVjdDxSLCBTMSwgUzIsIFMzPihcbiAgICBzMTogT2JzZXJ2YWJsZTxTMT4sXG4gICAgczI6IE9ic2VydmFibGU8UzI+LFxuICAgIHMzOiBPYnNlcnZhYmxlPFMzPixcbiAgICBwcm9qZWN0b3I6IChzMTogUzEsIHMyOiBTMiwgczM6IFMzKSA9PiBSXG4gICk6IE9ic2VydmFibGU8Uj47XG4gIHNlbGVjdDxSLCBTMSwgUzIsIFMzLCBTND4oXG4gICAgczE6IE9ic2VydmFibGU8UzE+LFxuICAgIHMyOiBPYnNlcnZhYmxlPFMyPixcbiAgICBzMzogT2JzZXJ2YWJsZTxTMz4sXG4gICAgczQ6IE9ic2VydmFibGU8UzQ+LFxuICAgIHByb2plY3RvcjogKHMxOiBTMSwgczI6IFMyLCBzMzogUzMsIHM0OiBTNCkgPT4gUlxuICApOiBPYnNlcnZhYmxlPFI+O1xuICBzZWxlY3Q8Uj4oLi4uYXJnczogYW55W10pOiBPYnNlcnZhYmxlPFI+IHtcbiAgICBsZXQgb2JzZXJ2YWJsZSQ6IE9ic2VydmFibGU8Uj47XG4gICAgLy8gcHJvamVjdCBpcyBhbHdheXMgdGhlIGxhc3QgYXJndW1lbnQsIHNvIGBwb3BgIGl0IGZyb20gYXJncy5cbiAgICBjb25zdCBwcm9qZWN0b3I6ICguLi5hcmdzOiBhbnlbXSkgPT4gUiA9IGFyZ3MucG9wKCk7XG4gICAgaWYgKGFyZ3MubGVuZ3RoID09PSAwKSB7XG4gICAgICAvLyBJZiBwcm9qZWN0b3Igd2FzIHRoZSBvbmx5IGFyZ3VtZW50IHRoZW4gd2UnbGwgdXNlIG1hcCBvcGVyYXRvci5cbiAgICAgIG9ic2VydmFibGUkID0gdGhpcy5zdGF0ZVN1YmplY3QkLnBpcGUobWFwKHByb2plY3RvcikpO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBJZiB0aGVyZSBhcmUgbXVsdGlwbGUgYXJndW1lbnRzLCB3ZSdyZSBjaGFpbmluZyBzZWxlY3RvcnMsIHNvIHdlIG5lZWRcbiAgICAgIC8vIHRvIHRha2UgdGhlIGNvbWJpbmVMYXRlc3Qgb2YgdGhlbSBiZWZvcmUgY2FsbGluZyB0aGUgbWFwIGZ1bmN0aW9uLlxuICAgICAgb2JzZXJ2YWJsZSQgPSBjb21iaW5lTGF0ZXN0KGFyZ3MpLnBpcGUoXG4gICAgICAgIC8vIFRoZSBtb3N0IHBlcmZvcm1hbnQgd2F5IHRvIGNvbWJpbmUgT2JzZXJ2YWJsZXMgYXZvaWRpbmcgdW5uZWNlc3NhcnlcbiAgICAgICAgLy8gZW1pc3Npb25zIGFuZCBwcm9qZWN0b3IgY2FsbHMuXG4gICAgICAgIGRlYm91bmNlU3luYygpLFxuICAgICAgICBtYXAoKGFyZ3M6IGFueVtdKSA9PiBwcm9qZWN0b3IoLi4uYXJncykpXG4gICAgICApO1xuICAgIH1cbiAgICBjb25zdCBkaXN0aW5jdFNoYXJlZE9ic2VydmFibGUkID0gb2JzZXJ2YWJsZSQucGlwZShcbiAgICAgIGRpc3RpbmN0VW50aWxDaGFuZ2VkKCksXG4gICAgICBzaGFyZVJlcGxheSh7XG4gICAgICAgIHJlZkNvdW50OiB0cnVlLFxuICAgICAgICBidWZmZXJTaXplOiAxLFxuICAgICAgfSksXG4gICAgICB0YWtlVW50aWwodGhpcy5kZXN0cm95JClcbiAgICApO1xuICAgIHJldHVybiBkaXN0aW5jdFNoYXJlZE9ic2VydmFibGUkO1xuICB9XG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgYW4gZWZmZWN0LlxuICAgKlxuICAgKiBUaGlzIGVmZmVjdCBpcyBzdWJzY3JpYmVkIHRvIGZvciB0aGUgbGlmZSBvZiB0aGUgQENvbXBvbmVudC5cbiAgICogQHBhcmFtIGdlbmVyYXRvciBBIGZ1bmN0aW9uIHRoYXQgdGFrZXMgYW4gb3JpZ2luIE9ic2VydmFibGUgaW5wdXQgYW5kXG4gICAqICAgICByZXR1cm5zIGFuIE9ic2VydmFibGUuIFRoZSBPYnNlcnZhYmxlIHRoYXQgaXMgcmV0dXJuZWQgd2lsbCBiZVxuICAgKiAgICAgc3Vic2NyaWJlZCB0byBmb3IgdGhlIGxpZmUgb2YgdGhlIGNvbXBvbmVudC5cbiAgICogQHJldHVybiBBIGZ1bmN0aW9uIHRoYXQsIHdoZW4gY2FsbGVkLCB3aWxsIHRyaWdnZXIgdGhlIG9yaWdpbiBPYnNlcnZhYmxlLlxuICAgKi9cbiAgZWZmZWN0PFYsIFIgPSB1bmtub3duPihcbiAgICBnZW5lcmF0b3I6IChvcmlnaW4kOiBPYnNlcnZhYmxlPFY+KSA9PiBPYnNlcnZhYmxlPFI+XG4gICk6IEVmZmVjdFJldHVybkZuPFY+IHtcbiAgICBjb25zdCBvcmlnaW4kID0gbmV3IFN1YmplY3Q8Vj4oKTtcbiAgICBnZW5lcmF0b3Iob3JpZ2luJClcbiAgICAgIC8vIHRpZWQgdG8gdGhlIGxpZmVjeWNsZSDwn5GHIG9mIENvbXBvbmVudFN0b3JlXG4gICAgICAucGlwZSh0YWtlVW50aWwodGhpcy5kZXN0cm95JCkpXG4gICAgICAuc3Vic2NyaWJlKCk7XG5cbiAgICByZXR1cm4gKG9ic2VydmFibGVPclZhbHVlPzogViB8IE9ic2VydmFibGU8Vj4pOiBTdWJzY3JpcHRpb24gPT4ge1xuICAgICAgY29uc3Qgb2JzZXJ2YWJsZSQgPSBpc09ic2VydmFibGUob2JzZXJ2YWJsZU9yVmFsdWUpXG4gICAgICAgID8gb2JzZXJ2YWJsZU9yVmFsdWVcbiAgICAgICAgOiBvZihvYnNlcnZhYmxlT3JWYWx1ZSk7XG4gICAgICByZXR1cm4gb2JzZXJ2YWJsZSQucGlwZSh0YWtlVW50aWwodGhpcy5kZXN0cm95JCkpLnN1YnNjcmliZSgodmFsdWUpID0+IHtcbiAgICAgICAgLy8gYW55IG5ldyDwn5GHIHZhbHVlIGlzIHB1c2hlZCBpbnRvIGEgc3RyZWFtXG4gICAgICAgIG9yaWdpbiQubmV4dCh2YWx1ZSk7XG4gICAgICB9KTtcbiAgICB9O1xuICB9XG59XG4iXX0=