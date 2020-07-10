/**
 * @fileoverview added by tsickle
 * Generated from: src/component-store.ts
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
import { isObservable, of, ReplaySubject, throwError, combineLatest, Subject, queueScheduler, scheduled, } from 'rxjs';
import { concatMap, takeUntil, withLatestFrom, map, distinctUntilChanged, shareReplay, } from 'rxjs/operators';
import { debounceSync } from './debounce-sync';
import { Injectable, Optional, InjectionToken, Inject, } from '@angular/core';
/**
 * Return type of the effect, that behaves differently based on whether the
 * argument is passed to the callback.
 * @record
 * @template T
 */
export function EffectReturnFn() { }
/**
 * @record
 */
export function SelectConfig() { }
if (false) {
    /** @type {?|undefined} */
    SelectConfig.prototype.debounce;
}
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
                ? // Push the value into queueScheduler
                    scheduled([value], queueScheduler).pipe(withLatestFrom(this.stateSubject$))
                : // If state was not initialized, we'll throw an error.
                    throwError(new Error(`${this.constructor.name} has not been initialized`)))), takeUntil(this.destroy$))
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcG9uZW50LXN0b3JlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vbW9kdWxlcy9jb21wb25lbnQtc3RvcmUvc3JjL2NvbXBvbmVudC1zdG9yZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7OztBQUFBLE9BQU8sRUFDTCxZQUFZLEVBRVosRUFBRSxFQUNGLGFBQWEsRUFFYixVQUFVLEVBQ1YsYUFBYSxFQUNiLE9BQU8sRUFDUCxjQUFjLEVBQ2QsU0FBUyxHQUNWLE1BQU0sTUFBTSxDQUFDO0FBQ2QsT0FBTyxFQUNMLFNBQVMsRUFDVCxTQUFTLEVBQ1QsY0FBYyxFQUNkLEdBQUcsRUFDSCxvQkFBb0IsRUFDcEIsV0FBVyxHQUNaLE1BQU0sZ0JBQWdCLENBQUM7QUFDeEIsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBQy9DLE9BQU8sRUFDTCxVQUFVLEVBRVYsUUFBUSxFQUNSLGNBQWMsRUFDZCxNQUFNLEdBQ1AsTUFBTSxlQUFlLENBQUM7Ozs7Ozs7QUFNdkIsb0NBR0M7Ozs7QUFFRCxrQ0FFQzs7O0lBREMsZ0NBQW1COzs7QUFHckIsTUFBTSxPQUFPLGlCQUFpQixHQUFHLElBQUksY0FBYyxDQUFDLDBCQUEwQixDQUFDOzs7O0FBRy9FLE1BQU0sT0FBTyxjQUFjOzs7O0lBV3pCLFlBQW1ELFlBQWdCOztRQVRsRCxvQkFBZSxHQUFHLElBQUksYUFBYSxDQUFPLENBQUMsQ0FBQyxDQUFDOztRQUVyRCxhQUFRLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxZQUFZLEVBQUUsQ0FBQztRQUV2QyxrQkFBYSxHQUFHLElBQUksYUFBYSxDQUFJLENBQUMsQ0FBQyxDQUFDO1FBQ2pELGtCQUFhLEdBQUcsS0FBSyxDQUFDOztRQUVyQixXQUFNLEdBQWtCLElBQUksQ0FBQyxNQUFNOzs7O1FBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsRUFBQyxDQUFDO1FBR3JELG1FQUFtRTtRQUNu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bnRlbnQiOlsiaW1wb3J0IHtcbiAgaXNPYnNlcnZhYmxlLFxuICBPYnNlcnZhYmxlLFxuICBvZixcbiAgUmVwbGF5U3ViamVjdCxcbiAgU3Vic2NyaXB0aW9uLFxuICB0aHJvd0Vycm9yLFxuICBjb21iaW5lTGF0ZXN0LFxuICBTdWJqZWN0LFxuICBxdWV1ZVNjaGVkdWxlcixcbiAgc2NoZWR1bGVkLFxufSBmcm9tICdyeGpzJztcbmltcG9ydCB7XG4gIGNvbmNhdE1hcCxcbiAgdGFrZVVudGlsLFxuICB3aXRoTGF0ZXN0RnJvbSxcbiAgbWFwLFxuICBkaXN0aW5jdFVudGlsQ2hhbmdlZCxcbiAgc2hhcmVSZXBsYXksXG59IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCB7IGRlYm91bmNlU3luYyB9IGZyb20gJy4vZGVib3VuY2Utc3luYyc7XG5pbXBvcnQge1xuICBJbmplY3RhYmxlLFxuICBPbkRlc3Ryb3ksXG4gIE9wdGlvbmFsLFxuICBJbmplY3Rpb25Ub2tlbixcbiAgSW5qZWN0LFxufSBmcm9tICdAYW5ndWxhci9jb3JlJztcblxuLyoqXG4gKiBSZXR1cm4gdHlwZSBvZiB0aGUgZWZmZWN0LCB0aGF0IGJlaGF2ZXMgZGlmZmVyZW50bHkgYmFzZWQgb24gd2hldGhlciB0aGVcbiAqIGFyZ3VtZW50IGlzIHBhc3NlZCB0byB0aGUgY2FsbGJhY2suXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgRWZmZWN0UmV0dXJuRm48VD4ge1xuICAoKTogdm9pZDtcbiAgKHQ6IFQgfCBPYnNlcnZhYmxlPFQ+KTogU3Vic2NyaXB0aW9uO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFNlbGVjdENvbmZpZyB7XG4gIGRlYm91bmNlPzogYm9vbGVhbjtcbn1cblxuZXhwb3J0IGNvbnN0IGluaXRpYWxTdGF0ZVRva2VuID0gbmV3IEluamVjdGlvblRva2VuKCdDb21wb25lbnRTdG9yZSBJbml0U3RhdGUnKTtcblxuQEluamVjdGFibGUoKVxuZXhwb3J0IGNsYXNzIENvbXBvbmVudFN0b3JlPFQgZXh0ZW5kcyBvYmplY3Q+IGltcGxlbWVudHMgT25EZXN0cm95IHtcbiAgLy8gU2hvdWxkIGJlIHVzZWQgb25seSBpbiBuZ09uRGVzdHJveS5cbiAgcHJpdmF0ZSByZWFkb25seSBkZXN0cm95U3ViamVjdCQgPSBuZXcgUmVwbGF5U3ViamVjdDx2b2lkPigxKTtcbiAgLy8gRXhwb3NlZCB0byBhbnkgZXh0ZW5kaW5nIFN0b3JlIHRvIGJlIHVzZWQgZm9yIHRoZSB0ZWFyZG93bnMuXG4gIHJlYWRvbmx5IGRlc3Ryb3kkID0gdGhpcy5kZXN0cm95U3ViamVjdCQuYXNPYnNlcnZhYmxlKCk7XG5cbiAgcHJpdmF0ZSByZWFkb25seSBzdGF0ZVN1YmplY3QkID0gbmV3IFJlcGxheVN1YmplY3Q8VD4oMSk7XG4gIHByaXZhdGUgaXNJbml0aWFsaXplZCA9IGZhbHNlO1xuICAvLyBOZWVkcyB0byBiZSBhZnRlciBkZXN0cm95JCBpcyBkZWNsYXJlZCBiZWNhdXNlIGl0J3MgdXNlZCBpbiBzZWxlY3QuXG4gIHJlYWRvbmx5IHN0YXRlJDogT2JzZXJ2YWJsZTxUPiA9IHRoaXMuc2VsZWN0KChzKSA9PiBzKTtcblxuICBjb25zdHJ1Y3RvcihAT3B0aW9uYWwoKSBASW5qZWN0KGluaXRpYWxTdGF0ZVRva2VuKSBkZWZhdWx0U3RhdGU/OiBUKSB7XG4gICAgLy8gU3RhdGUgY2FuIGJlIGluaXRpYWxpemVkIGVpdGhlciB0aHJvdWdoIGNvbnN0cnVjdG9yIG9yIHNldFN0YXRlLlxuICAgIGlmIChkZWZhdWx0U3RhdGUpIHtcbiAgICAgIHRoaXMuaW5pdFN0YXRlKGRlZmF1bHRTdGF0ZSk7XG4gICAgfVxuICB9XG5cbiAgLyoqIENvbXBsZXRlcyBhbGwgcmVsZXZhbnQgT2JzZXJ2YWJsZSBzdHJlYW1zLiAqL1xuICBuZ09uRGVzdHJveSgpIHtcbiAgICB0aGlzLnN0YXRlU3ViamVjdCQuY29tcGxldGUoKTtcbiAgICB0aGlzLmRlc3Ryb3lTdWJqZWN0JC5uZXh0KCk7XG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlcyBhbiB1cGRhdGVyLlxuICAgKlxuICAgKiBUaHJvd3MgYW4gZXJyb3IgaWYgdXBkYXRlciBpcyBjYWxsZWQgd2l0aCBzeW5jaHJvbm91cyB2YWx1ZXMgKGVpdGhlclxuICAgKiBpbXBlcmF0aXZlIHZhbHVlIG9yIE9ic2VydmFibGUgdGhhdCBpcyBzeW5jaHJvbm91cykgYmVmb3JlIENvbXBvbmVudFN0b3JlXG4gICAqIGlzIGluaXRpYWxpemVkLiBJZiBjYWxsZWQgd2l0aCBhc3luYyBPYnNlcnZhYmxlIGJlZm9yZSBpbml0aWFsaXphdGlvbiB0aGVuXG4gICAqIHN0YXRlIHdpbGwgbm90IGJlIHVwZGF0ZWQgYW5kIHN1YnNjcmlwdGlvbiB3b3VsZCBiZSBjbG9zZWQuXG4gICAqXG4gICAqIEBwYXJhbSB1cGRhdGVyRm4gQSBzdGF0aWMgdXBkYXRlciBmdW5jdGlvbiB0aGF0IHRha2VzIDIgcGFyYW1ldGVycyAodGhlXG4gICAqIGN1cnJlbnQgc3RhdGUgYW5kIGFuIGFyZ3VtZW50IG9iamVjdCkgYW5kIHJldHVybnMgYSBuZXcgaW5zdGFuY2Ugb2YgdGhlXG4gICAqIHN0YXRlLlxuICAgKiBAcmV0dXJuIEEgZnVuY3Rpb24gdGhhdCBhY2NlcHRzIG9uZSBhcmd1bWVudCB3aGljaCBpcyBmb3J3YXJkZWQgYXMgdGhlXG4gICAqICAgICBzZWNvbmQgYXJndW1lbnQgdG8gYHVwZGF0ZXJGbmAuIEV2ZXJ5dGltZSB0aGlzIGZ1bmN0aW9uIGlzIGNhbGxlZFxuICAgKiAgICAgc3Vic2NyaWJlcnMgd2lsbCBiZSBub3RpZmllZCBvZiB0aGUgc3RhdGUgY2hhbmdlLlxuICAgKi9cbiAgdXBkYXRlcjxWPihcbiAgICB1cGRhdGVyRm46IChzdGF0ZTogVCwgdmFsdWU6IFYpID0+IFRcbiAgKTogdW5rbm93biBleHRlbmRzIFYgPyAoKSA9PiB2b2lkIDogKHQ6IFYgfCBPYnNlcnZhYmxlPFY+KSA9PiBTdWJzY3JpcHRpb24ge1xuICAgIHJldHVybiAoKG9ic2VydmFibGVPclZhbHVlPzogViB8IE9ic2VydmFibGU8Vj4pOiBTdWJzY3JpcHRpb24gPT4ge1xuICAgICAgbGV0IGluaXRpYWxpemF0aW9uRXJyb3I6IEVycm9yIHwgdW5kZWZpbmVkO1xuICAgICAgLy8gV2UgY2FuIHJlY2VpdmUgZWl0aGVyIHRoZSB2YWx1ZSBvciBhbiBvYnNlcnZhYmxlLiBJbiBjYXNlIGl0J3MgYVxuICAgICAgLy8gc2ltcGxlIHZhbHVlLCB3ZSdsbCB3cmFwIGl0IHdpdGggYG9mYCBvcGVyYXRvciB0byB0dXJuIGl0IGludG9cbiAgICAgIC8vIE9ic2VydmFibGUuXG4gICAgICBjb25zdCBvYnNlcnZhYmxlJCA9IGlzT2JzZXJ2YWJsZShvYnNlcnZhYmxlT3JWYWx1ZSlcbiAgICAgICAgPyBvYnNlcnZhYmxlT3JWYWx1ZVxuICAgICAgICA6IG9mKG9ic2VydmFibGVPclZhbHVlKTtcbiAgICAgIGNvbnN0IHN1YnNjcmlwdGlvbiA9IG9ic2VydmFibGUkXG4gICAgICAgIC5waXBlKFxuICAgICAgICAgIGNvbmNhdE1hcCgodmFsdWUpID0+XG4gICAgICAgICAgICB0aGlzLmlzSW5pdGlhbGl6ZWRcbiAgICAgICAgICAgICAgPyAvLyBQdXNoIHRoZSB2YWx1ZSBpbnRvIHF1ZXVlU2NoZWR1bGVyXG4gICAgICAgICAgICAgICAgc2NoZWR1bGVkKFt2YWx1ZV0sIHF1ZXVlU2NoZWR1bGVyKS5waXBlKFxuICAgICAgICAgICAgICAgICAgd2l0aExhdGVzdEZyb20odGhpcy5zdGF0ZVN1YmplY3QkKVxuICAgICAgICAgICAgICAgIClcbiAgICAgICAgICAgICAgOiAvLyBJZiBzdGF0ZSB3YXMgbm90IGluaXRpYWxpemVkLCB3ZSdsbCB0aHJvdyBhbiBlcnJvci5cbiAgICAgICAgICAgICAgICB0aHJvd0Vycm9yKFxuICAgICAgICAgICAgICAgICAgbmV3IEVycm9yKGAke3RoaXMuY29uc3RydWN0b3IubmFtZX0gaGFzIG5vdCBiZWVuIGluaXRpYWxpemVkYClcbiAgICAgICAgICAgICAgICApXG4gICAgICAgICAgKSxcbiAgICAgICAgICB0YWtlVW50aWwodGhpcy5kZXN0cm95JClcbiAgICAgICAgKVxuICAgICAgICAuc3Vic2NyaWJlKHtcbiAgICAgICAgICBuZXh0OiAoW3ZhbHVlLCBjdXJyZW50U3RhdGVdKSA9PiB7XG4gICAgICAgICAgICB0aGlzLnN0YXRlU3ViamVjdCQubmV4dCh1cGRhdGVyRm4oY3VycmVudFN0YXRlLCB2YWx1ZSEpKTtcbiAgICAgICAgICB9LFxuICAgICAgICAgIGVycm9yOiAoZXJyb3I6IEVycm9yKSA9PiB7XG4gICAgICAgICAgICBpbml0aWFsaXphdGlvbkVycm9yID0gZXJyb3I7XG4gICAgICAgICAgICB0aGlzLnN0YXRlU3ViamVjdCQuZXJyb3IoZXJyb3IpO1xuICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuXG4gICAgICBpZiAoaW5pdGlhbGl6YXRpb25FcnJvcikge1xuICAgICAgICAvLyBwcmV0dGllci1pZ25vcmVcbiAgICAgICAgdGhyb3cgLyoqIEB0eXBlIHshRXJyb3J9ICovIChpbml0aWFsaXphdGlvbkVycm9yKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBzdWJzY3JpcHRpb247XG4gICAgfSkgYXMgdW5rbm93biBleHRlbmRzIFZcbiAgICAgID8gKCkgPT4gdm9pZFxuICAgICAgOiAodDogViB8IE9ic2VydmFibGU8Vj4pID0+IFN1YnNjcmlwdGlvbjtcbiAgfVxuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplcyBzdGF0ZS4gSWYgaXQgd2FzIGFscmVhZHkgaW5pdGlhbGl6ZWQgdGhlbiBpdCByZXNldHMgdGhlXG4gICAqIHN0YXRlLlxuICAgKi9cbiAgcHJpdmF0ZSBpbml0U3RhdGUoc3RhdGU6IFQpOiB2b2lkIHtcbiAgICBzY2hlZHVsZWQoW3N0YXRlXSwgcXVldWVTY2hlZHVsZXIpLnN1YnNjcmliZSgocykgPT4ge1xuICAgICAgdGhpcy5pc0luaXRpYWxpemVkID0gdHJ1ZTtcbiAgICAgIHRoaXMuc3RhdGVTdWJqZWN0JC5uZXh0KHMpO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIFNldHMgdGhlIHN0YXRlIHNwZWNpZmljIHZhbHVlLlxuICAgKiBAcGFyYW0gc3RhdGVPclVwZGF0ZXJGbiBvYmplY3Qgb2YgdGhlIHNhbWUgdHlwZSBhcyB0aGUgc3RhdGUgb3IgYW5cbiAgICogdXBkYXRlckZuLCByZXR1cm5pbmcgc3VjaCBvYmplY3QuXG4gICAqL1xuICBzZXRTdGF0ZShzdGF0ZU9yVXBkYXRlckZuOiBUIHwgKChzdGF0ZTogVCkgPT4gVCkpOiB2b2lkIHtcbiAgICBpZiAodHlwZW9mIHN0YXRlT3JVcGRhdGVyRm4gIT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHRoaXMuaW5pdFN0YXRlKHN0YXRlT3JVcGRhdGVyRm4pO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnVwZGF0ZXIoc3RhdGVPclVwZGF0ZXJGbiBhcyAoc3RhdGU6IFQpID0+IFQpKCk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBzZWxlY3Rvci5cbiAgICpcbiAgICogVGhpcyBzdXBwb3J0cyBjb21iaW5pbmcgdXAgdG8gNCBzZWxlY3RvcnMuIE1vcmUgY291bGQgYmUgYWRkZWQgYXMgbmVlZGVkLlxuICAgKlxuICAgKiBAcGFyYW0gcHJvamVjdG9yIEEgcHVyZSBwcm9qZWN0aW9uIGZ1bmN0aW9uIHRoYXQgdGFrZXMgdGhlIGN1cnJlbnQgc3RhdGUgYW5kXG4gICAqICAgcmV0dXJucyBzb21lIG5ldyBzbGljZS9wcm9qZWN0aW9uIG9mIHRoYXQgc3RhdGUuXG4gICAqIEBwYXJhbSBjb25maWcgU2VsZWN0Q29uZmlnIHRoYXQgY2hhbmdlcyB0aGUgYmVoYXZvaXIgb2Ygc2VsZWN0b3IsIGluY2x1ZGluZ1xuICAgKiAgIHRoZSBkZWJvdW5jaW5nIG9mIHRoZSB2YWx1ZXMgdW50aWwgdGhlIHN0YXRlIGlzIHNldHRsZWQuXG4gICAqIEByZXR1cm4gQW4gb2JzZXJ2YWJsZSBvZiB0aGUgcHJvamVjdG9yIHJlc3VsdHMuXG4gICAqL1xuICBzZWxlY3Q8Uj4ocHJvamVjdG9yOiAoczogVCkgPT4gUiwgY29uZmlnPzogU2VsZWN0Q29uZmlnKTogT2JzZXJ2YWJsZTxSPjtcbiAgc2VsZWN0PFIsIFMxPihcbiAgICBzMTogT2JzZXJ2YWJsZTxTMT4sXG4gICAgcHJvamVjdG9yOiAoczE6IFMxKSA9PiBSLFxuICAgIGNvbmZpZz86IFNlbGVjdENvbmZpZ1xuICApOiBPYnNlcnZhYmxlPFI+O1xuICBzZWxlY3Q8UiwgUzEsIFMyPihcbiAgICBzMTogT2JzZXJ2YWJsZTxTMT4sXG4gICAgczI6IE9ic2VydmFibGU8UzI+LFxuICAgIHByb2plY3RvcjogKHMxOiBTMSwgczI6IFMyKSA9PiBSLFxuICAgIGNvbmZpZz86IFNlbGVjdENvbmZpZ1xuICApOiBPYnNlcnZhYmxlPFI+O1xuICBzZWxlY3Q8UiwgUzEsIFMyLCBTMz4oXG4gICAgczE6IE9ic2VydmFibGU8UzE+LFxuICAgIHMyOiBPYnNlcnZhYmxlPFMyPixcbiAgICBzMzogT2JzZXJ2YWJsZTxTMz4sXG4gICAgcHJvamVjdG9yOiAoczE6IFMxLCBzMjogUzIsIHMzOiBTMykgPT4gUixcbiAgICBjb25maWc/OiBTZWxlY3RDb25maWdcbiAgKTogT2JzZXJ2YWJsZTxSPjtcbiAgc2VsZWN0PFIsIFMxLCBTMiwgUzMsIFM0PihcbiAgICBzMTogT2JzZXJ2YWJsZTxTMT4sXG4gICAgczI6IE9ic2VydmFibGU8UzI+LFxuICAgIHMzOiBPYnNlcnZhYmxlPFMzPixcbiAgICBzNDogT2JzZXJ2YWJsZTxTND4sXG4gICAgcHJvamVjdG9yOiAoczE6IFMxLCBzMjogUzIsIHMzOiBTMywgczQ6IFM0KSA9PiBSLFxuICAgIGNvbmZpZz86IFNlbGVjdENvbmZpZ1xuICApOiBPYnNlcnZhYmxlPFI+O1xuICBzZWxlY3Q8XG4gICAgTyBleHRlbmRzIEFycmF5PE9ic2VydmFibGU8dW5rbm93bj4gfCBTZWxlY3RDb25maWcgfCBQcm9qZWN0b3JGbj4sXG4gICAgUixcbiAgICBQcm9qZWN0b3JGbiA9ICguLi5hOiB1bmtub3duW10pID0+IFJcbiAgPiguLi5hcmdzOiBPKTogT2JzZXJ2YWJsZTxSPiB7XG4gICAgY29uc3QgeyBvYnNlcnZhYmxlcywgcHJvamVjdG9yLCBjb25maWcgfSA9IHByb2Nlc3NTZWxlY3RvckFyZ3MoYXJncyk7XG5cbiAgICBsZXQgb2JzZXJ2YWJsZSQ6IE9ic2VydmFibGU8dW5rbm93bj47XG4gICAgLy8gSWYgdGhlcmUgYXJlIG5vIE9ic2VydmFibGVzIHRvIGNvbWJpbmUsIHRoZW4gd2UnbGwganVzdCBtYXAgdGhlIHZhbHVlLlxuICAgIGlmIChvYnNlcnZhYmxlcy5sZW5ndGggPT09IDApIHtcbiAgICAgIG9ic2VydmFibGUkID0gdGhpcy5zdGF0ZVN1YmplY3QkLnBpcGUoXG4gICAgICAgIGNvbmZpZy5kZWJvdW5jZSA/IGRlYm91bmNlU3luYygpIDogKHNvdXJjZSQpID0+IHNvdXJjZSQsXG4gICAgICAgIG1hcChwcm9qZWN0b3IpXG4gICAgICApO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBJZiB0aGVyZSBhcmUgbXVsdGlwbGUgYXJndW1lbnRzLCB0aGVuIHdlJ3JlIGFnZ3JlZ2F0aW5nIHNlbGVjdG9ycywgc28gd2UgbmVlZFxuICAgICAgLy8gdG8gdGFrZSB0aGUgY29tYmluZUxhdGVzdCBvZiB0aGVtIGJlZm9yZSBjYWxsaW5nIHRoZSBtYXAgZnVuY3Rpb24uXG4gICAgICBvYnNlcnZhYmxlJCA9IGNvbWJpbmVMYXRlc3Qob2JzZXJ2YWJsZXMpLnBpcGUoXG4gICAgICAgIGNvbmZpZy5kZWJvdW5jZSA/IGRlYm91bmNlU3luYygpIDogKHNvdXJjZSQpID0+IHNvdXJjZSQsXG4gICAgICAgIG1hcCgocHJvamVjdG9yQXJncykgPT4gcHJvamVjdG9yKC4uLnByb2plY3RvckFyZ3MpKVxuICAgICAgKTtcbiAgICB9XG4gICAgcmV0dXJuIChvYnNlcnZhYmxlJCBhcyBPYnNlcnZhYmxlPFI+KS5waXBlKFxuICAgICAgZGlzdGluY3RVbnRpbENoYW5nZWQoKSxcbiAgICAgIHNoYXJlUmVwbGF5KHtcbiAgICAgICAgcmVmQ291bnQ6IHRydWUsXG4gICAgICAgIGJ1ZmZlclNpemU6IDEsXG4gICAgICB9KSxcbiAgICAgIHRha2VVbnRpbCh0aGlzLmRlc3Ryb3kkKVxuICAgICk7XG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlcyBhbiBlZmZlY3QuXG4gICAqXG4gICAqIFRoaXMgZWZmZWN0IGlzIHN1YnNjcmliZWQgdG8gZm9yIHRoZSBsaWZlIG9mIHRoZSBAQ29tcG9uZW50LlxuICAgKiBAcGFyYW0gZ2VuZXJhdG9yIEEgZnVuY3Rpb24gdGhhdCB0YWtlcyBhbiBvcmlnaW4gT2JzZXJ2YWJsZSBpbnB1dCBhbmRcbiAgICogICAgIHJldHVybnMgYW4gT2JzZXJ2YWJsZS4gVGhlIE9ic2VydmFibGUgdGhhdCBpcyByZXR1cm5lZCB3aWxsIGJlXG4gICAqICAgICBzdWJzY3JpYmVkIHRvIGZvciB0aGUgbGlmZSBvZiB0aGUgY29tcG9uZW50LlxuICAgKiBAcmV0dXJuIEEgZnVuY3Rpb24gdGhhdCwgd2hlbiBjYWxsZWQsIHdpbGwgdHJpZ2dlciB0aGUgb3JpZ2luIE9ic2VydmFibGUuXG4gICAqL1xuICBlZmZlY3Q8ViwgUiA9IHVua25vd24+KFxuICAgIGdlbmVyYXRvcjogKG9yaWdpbiQ6IE9ic2VydmFibGU8Vj4pID0+IE9ic2VydmFibGU8Uj5cbiAgKTogRWZmZWN0UmV0dXJuRm48Vj4ge1xuICAgIGNvbnN0IG9yaWdpbiQgPSBuZXcgU3ViamVjdDxWPigpO1xuICAgIGdlbmVyYXRvcihvcmlnaW4kKVxuICAgICAgLy8gdGllZCB0byB0aGUgbGlmZWN5Y2xlIPCfkYcgb2YgQ29tcG9uZW50U3RvcmVcbiAgICAgIC5waXBlKHRha2VVbnRpbCh0aGlzLmRlc3Ryb3kkKSlcbiAgICAgIC5zdWJzY3JpYmUoKTtcblxuICAgIHJldHVybiAob2JzZXJ2YWJsZU9yVmFsdWU/OiBWIHwgT2JzZXJ2YWJsZTxWPik6IFN1YnNjcmlwdGlvbiA9PiB7XG4gICAgICBjb25zdCBvYnNlcnZhYmxlJCA9IGlzT2JzZXJ2YWJsZShvYnNlcnZhYmxlT3JWYWx1ZSlcbiAgICAgICAgPyBvYnNlcnZhYmxlT3JWYWx1ZVxuICAgICAgICA6IG9mKG9ic2VydmFibGVPclZhbHVlKTtcbiAgICAgIHJldHVybiBvYnNlcnZhYmxlJC5waXBlKHRha2VVbnRpbCh0aGlzLmRlc3Ryb3kkKSkuc3Vic2NyaWJlKCh2YWx1ZSkgPT4ge1xuICAgICAgICAvLyBhbnkgbmV3IPCfkYcgdmFsdWUgaXMgcHVzaGVkIGludG8gYSBzdHJlYW1cbiAgICAgICAgb3JpZ2luJC5uZXh0KHZhbHVlKTtcbiAgICAgIH0pO1xuICAgIH07XG4gIH1cbn1cblxuZnVuY3Rpb24gcHJvY2Vzc1NlbGVjdG9yQXJnczxcbiAgTyBleHRlbmRzIEFycmF5PE9ic2VydmFibGU8dW5rbm93bj4gfCBTZWxlY3RDb25maWcgfCBQcm9qZWN0b3JGbj4sXG4gIFIsXG4gIFByb2plY3RvckZuID0gKC4uLmE6IHVua25vd25bXSkgPT4gUlxuPihcbiAgYXJnczogT1xuKToge1xuICBvYnNlcnZhYmxlczogT2JzZXJ2YWJsZTx1bmtub3duPltdO1xuICBwcm9qZWN0b3I6IFByb2plY3RvckZuO1xuICBjb25maWc6IFJlcXVpcmVkPFNlbGVjdENvbmZpZz47XG59IHtcbiAgY29uc3Qgc2VsZWN0b3JBcmdzID0gQXJyYXkuZnJvbShhcmdzKTtcbiAgLy8gQXNzaWduIGRlZmF1bHQgdmFsdWVzLlxuICBsZXQgY29uZmlnOiBSZXF1aXJlZDxTZWxlY3RDb25maWc+ID0geyBkZWJvdW5jZTogZmFsc2UgfTtcbiAgbGV0IHByb2plY3RvcjogUHJvamVjdG9yRm47XG4gIC8vIExhc3QgYXJndW1lbnQgaXMgZWl0aGVyIHByb2plY3RvciBvciBjb25maWdcbiAgY29uc3QgcHJvamVjdG9yT3JDb25maWcgPSBzZWxlY3RvckFyZ3MucG9wKCkgYXMgUHJvamVjdG9yRm4gfCBTZWxlY3RDb25maWc7XG5cbiAgaWYgKHR5cGVvZiBwcm9qZWN0b3JPckNvbmZpZyAhPT0gJ2Z1bmN0aW9uJykge1xuICAgIC8vIFdlIGdvdCB0aGUgY29uZmlnIGFzIHRoZSBsYXN0IGFyZ3VtZW50LCByZXBsYWNlIGFueSBkZWZhdWx0IHZhbHVlcyB3aXRoIGl0LlxuICAgIGNvbmZpZyA9IHsgLi4uY29uZmlnLCAuLi5wcm9qZWN0b3JPckNvbmZpZyB9O1xuICAgIC8vIFBvcCB0aGUgbmV4dCBhcmdzLCB3aGljaCB3b3VsZCBiZSB0aGUgcHJvamVjdG9yIGZuLlxuICAgIHByb2plY3RvciA9IHNlbGVjdG9yQXJncy5wb3AoKSBhcyBQcm9qZWN0b3JGbjtcbiAgfSBlbHNlIHtcbiAgICBwcm9qZWN0b3IgPSBwcm9qZWN0b3JPckNvbmZpZztcbiAgfVxuICAvLyBUaGUgT2JzZXJ2YWJsZXMgdG8gY29tYmluZSwgaWYgdGhlcmUgYXJlIGFueS5cbiAgY29uc3Qgb2JzZXJ2YWJsZXMgPSBzZWxlY3RvckFyZ3MgYXMgT2JzZXJ2YWJsZTx1bmtub3duPltdO1xuICByZXR1cm4ge1xuICAgIG9ic2VydmFibGVzLFxuICAgIHByb2plY3RvcixcbiAgICBjb25maWcsXG4gIH07XG59XG4iXX0=