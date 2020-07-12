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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcG9uZW50LXN0b3JlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vbW9kdWxlcy9jb21wb25lbnQtc3RvcmUvc3JjL2NvbXBvbmVudC1zdG9yZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7OztBQUFBLE9BQU8sRUFDTCxZQUFZLEVBRVosRUFBRSxFQUNGLGFBQWEsRUFFYixVQUFVLEVBQ1YsYUFBYSxFQUNiLE9BQU8sRUFDUCxjQUFjLEVBQ2QsU0FBUyxHQUNWLE1BQU0sTUFBTSxDQUFDO0FBQ2QsT0FBTyxFQUNMLFNBQVMsRUFDVCxTQUFTLEVBQ1QsY0FBYyxFQUNkLEdBQUcsRUFDSCxvQkFBb0IsRUFDcEIsV0FBVyxFQUNYLElBQUksR0FDTCxNQUFNLGdCQUFnQixDQUFDO0FBQ3hCLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUMvQyxPQUFPLEVBQ0wsVUFBVSxFQUVWLFFBQVEsRUFDUixjQUFjLEVBQ2QsTUFBTSxHQUNQLE1BQU0sZUFBZSxDQUFDOzs7Ozs7O0FBTXZCLG9DQUdDOzs7O0FBRUQsa0NBRUM7OztJQURDLGdDQUFtQjs7O0FBR3JCLE1BQU0sT0FBTyxpQkFBaUIsR0FBRyxJQUFJLGNBQWMsQ0FBQywwQkFBMEIsQ0FBQzs7OztBQUcvRSxNQUFNLE9BQU8sY0FBYzs7OztJQWN6QixZQUFtRCxZQUFnQjs7UUFabEQsb0JBQWUsR0FBRyxJQUFJLGFBQWEsQ0FBTyxDQUFDLENBQUMsQ0FBQzs7UUFFckQsYUFBUSxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsWUFBWSxFQUFFLENBQUM7UUFFdkMsa0JBQWEsR0FBRyxJQUFJLGFBQWEsQ0FBSSxDQUFDLENBQUMsQ0FBQztRQUNqRCxrQkFBYSxHQUFHLEtBQUssQ0FBQztRQUN0QiwrQkFBMEIsR0FDaEMsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksaUNBQWlDO1lBQ3pELDZEQUE2RCxDQUFDOztRQUV2RCxXQUFNLEdB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QVksR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQzs7O1FBRWpDLE1BQU0sR0FBMkIsRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFOztRQUNwRCxTQUFzQjs7O1VBRXBCLGlCQUFpQixHQUFHLG1CQUFBLFlBQVksQ0FBQyxHQUFHLEVBQUUsRUFBOEI7SUFFMUUsSUFBSSxPQUFPLGlCQUFpQixLQUFLLFVBQVUsRUFBRTtRQUMzQyw4RUFBOEU7UUFDOUUsTUFBTSxtQ0FBUSxNQUFNLEdBQUssaUJBQWlCLENBQUUsQ0FBQztRQUM3QyxzREFBc0Q7UUFDdEQsU0FBUyxHQUFHLG1CQUFBLFlBQVksQ0FBQyxHQUFHLEVBQUUsRUFBZSxDQUFDO0tBQy9DO1NBQU07UUFDTCxTQUFTLEdBQUcsaUJBQWlCLENBQUM7S0FDL0I7OztVQUVLLFdBQVcsR0FBRyxtQkFBQSxZQUFZLEVBQXlCO0lBQ3pELE9BQU87UUFDTCxXQUFXO1FBQ1gsU0FBUztRQUNULE1BQU07S0FDUCxDQUFDO0FBQ0osQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7XG4gIGlzT2JzZXJ2YWJsZSxcbiAgT2JzZXJ2YWJsZSxcbiAgb2YsXG4gIFJlcGxheVN1YmplY3QsXG4gIFN1YnNjcmlwdGlvbixcbiAgdGhyb3dFcnJvcixcbiAgY29tYmluZUxhdGVzdCxcbiAgU3ViamVjdCxcbiAgcXVldWVTY2hlZHVsZXIsXG4gIHNjaGVkdWxlZCxcbn0gZnJvbSAncnhqcyc7XG5pbXBvcnQge1xuICBjb25jYXRNYXAsXG4gIHRha2VVbnRpbCxcbiAgd2l0aExhdGVzdEZyb20sXG4gIG1hcCxcbiAgZGlzdGluY3RVbnRpbENoYW5nZWQsXG4gIHNoYXJlUmVwbGF5LFxuICB0YWtlLFxufSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQgeyBkZWJvdW5jZVN5bmMgfSBmcm9tICcuL2RlYm91bmNlLXN5bmMnO1xuaW1wb3J0IHtcbiAgSW5qZWN0YWJsZSxcbiAgT25EZXN0cm95LFxuICBPcHRpb25hbCxcbiAgSW5qZWN0aW9uVG9rZW4sXG4gIEluamVjdCxcbn0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5cbi8qKlxuICogUmV0dXJuIHR5cGUgb2YgdGhlIGVmZmVjdCwgdGhhdCBiZWhhdmVzIGRpZmZlcmVudGx5IGJhc2VkIG9uIHdoZXRoZXIgdGhlXG4gKiBhcmd1bWVudCBpcyBwYXNzZWQgdG8gdGhlIGNhbGxiYWNrLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIEVmZmVjdFJldHVybkZuPFQ+IHtcbiAgKCk6IHZvaWQ7XG4gICh0OiBUIHwgT2JzZXJ2YWJsZTxUPik6IFN1YnNjcmlwdGlvbjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBTZWxlY3RDb25maWcge1xuICBkZWJvdW5jZT86IGJvb2xlYW47XG59XG5cbmV4cG9ydCBjb25zdCBpbml0aWFsU3RhdGVUb2tlbiA9IG5ldyBJbmplY3Rpb25Ub2tlbignQ29tcG9uZW50U3RvcmUgSW5pdFN0YXRlJyk7XG5cbkBJbmplY3RhYmxlKClcbmV4cG9ydCBjbGFzcyBDb21wb25lbnRTdG9yZTxUIGV4dGVuZHMgb2JqZWN0PiBpbXBsZW1lbnRzIE9uRGVzdHJveSB7XG4gIC8vIFNob3VsZCBiZSB1c2VkIG9ubHkgaW4gbmdPbkRlc3Ryb3kuXG4gIHByaXZhdGUgcmVhZG9ubHkgZGVzdHJveVN1YmplY3QkID0gbmV3IFJlcGxheVN1YmplY3Q8dm9pZD4oMSk7XG4gIC8vIEV4cG9zZWQgdG8gYW55IGV4dGVuZGluZyBTdG9yZSB0byBiZSB1c2VkIGZvciB0aGUgdGVhcmRvd25zLlxuICByZWFkb25seSBkZXN0cm95JCA9IHRoaXMuZGVzdHJveVN1YmplY3QkLmFzT2JzZXJ2YWJsZSgpO1xuXG4gIHByaXZhdGUgcmVhZG9ubHkgc3RhdGVTdWJqZWN0JCA9IG5ldyBSZXBsYXlTdWJqZWN0PFQ+KDEpO1xuICBwcml2YXRlIGlzSW5pdGlhbGl6ZWQgPSBmYWxzZTtcbiAgcHJpdmF0ZSBub3RJbml0aWFsaXplZEVycm9yTWVzc2FnZSA9XG4gICAgYCR7dGhpcy5jb25zdHJ1Y3Rvci5uYW1lfSBoYXMgbm90IGJlZW4gaW5pdGlhbGl6ZWQgeWV0LiBgICtcbiAgICBgUGxlYXNlIG1ha2Ugc3VyZSBpdCBpcyBpbml0aWFsaXplZCBiZWZvcmUgdXBkYXRpbmcvZ2V0dGluZy5gO1xuICAvLyBOZWVkcyB0byBiZSBhZnRlciBkZXN0cm95JCBpcyBkZWNsYXJlZCBiZWNhdXNlIGl0J3MgdXNlZCBpbiBzZWxlY3QuXG4gIHJlYWRvbmx5IHN0YXRlJDogT2JzZXJ2YWJsZTxUPiA9IHRoaXMuc2VsZWN0KChzKSA9PiBzKTtcblxuICBjb25zdHJ1Y3RvcihAT3B0aW9uYWwoKSBASW5qZWN0KGluaXRpYWxTdGF0ZVRva2VuKSBkZWZhdWx0U3RhdGU/OiBUKSB7XG4gICAgLy8gU3RhdGUgY2FuIGJlIGluaXRpYWxpemVkIGVpdGhlciB0aHJvdWdoIGNvbnN0cnVjdG9yIG9yIHNldFN0YXRlLlxuICAgIGlmIChkZWZhdWx0U3RhdGUpIHtcbiAgICAgIHRoaXMuaW5pdFN0YXRlKGRlZmF1bHRTdGF0ZSk7XG4gICAgfVxuICB9XG5cbiAgLyoqIENvbXBsZXRlcyBhbGwgcmVsZXZhbnQgT2JzZXJ2YWJsZSBzdHJlYW1zLiAqL1xuICBuZ09uRGVzdHJveSgpIHtcbiAgICB0aGlzLnN0YXRlU3ViamVjdCQuY29tcGxldGUoKTtcbiAgICB0aGlzLmRlc3Ryb3lTdWJqZWN0JC5uZXh0KCk7XG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlcyBhbiB1cGRhdGVyLlxuICAgKlxuICAgKiBUaHJvd3MgYW4gZXJyb3IgaWYgdXBkYXRlciBpcyBjYWxsZWQgd2l0aCBzeW5jaHJvbm91cyB2YWx1ZXMgKGVpdGhlclxuICAgKiBpbXBlcmF0aXZlIHZhbHVlIG9yIE9ic2VydmFibGUgdGhhdCBpcyBzeW5jaHJvbm91cykgYmVmb3JlIENvbXBvbmVudFN0b3JlXG4gICAqIGlzIGluaXRpYWxpemVkLiBJZiBjYWxsZWQgd2l0aCBhc3luYyBPYnNlcnZhYmxlIGJlZm9yZSBpbml0aWFsaXphdGlvbiB0aGVuXG4gICAqIHN0YXRlIHdpbGwgbm90IGJlIHVwZGF0ZWQgYW5kIHN1YnNjcmlwdGlvbiB3b3VsZCBiZSBjbG9zZWQuXG4gICAqXG4gICAqIEBwYXJhbSB1cGRhdGVyRm4gQSBzdGF0aWMgdXBkYXRlciBmdW5jdGlvbiB0aGF0IHRha2VzIDIgcGFyYW1ldGVycyAodGhlXG4gICAqIGN1cnJlbnQgc3RhdGUgYW5kIGFuIGFyZ3VtZW50IG9iamVjdCkgYW5kIHJldHVybnMgYSBuZXcgaW5zdGFuY2Ugb2YgdGhlXG4gICAqIHN0YXRlLlxuICAgKiBAcmV0dXJuIEEgZnVuY3Rpb24gdGhhdCBhY2NlcHRzIG9uZSBhcmd1bWVudCB3aGljaCBpcyBmb3J3YXJkZWQgYXMgdGhlXG4gICAqICAgICBzZWNvbmQgYXJndW1lbnQgdG8gYHVwZGF0ZXJGbmAuIEV2ZXJ5dGltZSB0aGlzIGZ1bmN0aW9uIGlzIGNhbGxlZFxuICAgKiAgICAgc3Vic2NyaWJlcnMgd2lsbCBiZSBub3RpZmllZCBvZiB0aGUgc3RhdGUgY2hhbmdlLlxuICAgKi9cbiAgdXBkYXRlcjxWPihcbiAgICB1cGRhdGVyRm46IChzdGF0ZTogVCwgdmFsdWU6IFYpID0+IFRcbiAgKTogdW5rbm93biBleHRlbmRzIFYgPyAoKSA9PiB2b2lkIDogKHQ6IFYgfCBPYnNlcnZhYmxlPFY+KSA9PiBTdWJzY3JpcHRpb24ge1xuICAgIHJldHVybiAoKG9ic2VydmFibGVPclZhbHVlPzogViB8IE9ic2VydmFibGU8Vj4pOiBTdWJzY3JpcHRpb24gPT4ge1xuICAgICAgbGV0IGluaXRpYWxpemF0aW9uRXJyb3I6IEVycm9yIHwgdW5kZWZpbmVkO1xuICAgICAgLy8gV2UgY2FuIHJlY2VpdmUgZWl0aGVyIHRoZSB2YWx1ZSBvciBhbiBvYnNlcnZhYmxlLiBJbiBjYXNlIGl0J3MgYVxuICAgICAgLy8gc2ltcGxlIHZhbHVlLCB3ZSdsbCB3cmFwIGl0IHdpdGggYG9mYCBvcGVyYXRvciB0byB0dXJuIGl0IGludG9cbiAgICAgIC8vIE9ic2VydmFibGUuXG4gICAgICBjb25zdCBvYnNlcnZhYmxlJCA9IGlzT2JzZXJ2YWJsZShvYnNlcnZhYmxlT3JWYWx1ZSlcbiAgICAgICAgPyBvYnNlcnZhYmxlT3JWYWx1ZVxuICAgICAgICA6IG9mKG9ic2VydmFibGVPclZhbHVlKTtcbiAgICAgIGNvbnN0IHN1YnNjcmlwdGlvbiA9IG9ic2VydmFibGUkXG4gICAgICAgIC5waXBlKFxuICAgICAgICAgIGNvbmNhdE1hcCgodmFsdWUpID0+XG4gICAgICAgICAgICB0aGlzLmlzSW5pdGlhbGl6ZWRcbiAgICAgICAgICAgICAgPyAvLyBQdXNoIHRoZSB2YWx1ZSBpbnRvIHF1ZXVlU2NoZWR1bGVyXG4gICAgICAgICAgICAgICAgc2NoZWR1bGVkKFt2YWx1ZV0sIHF1ZXVlU2NoZWR1bGVyKS5waXBlKFxuICAgICAgICAgICAgICAgICAgd2l0aExhdGVzdEZyb20odGhpcy5zdGF0ZVN1YmplY3QkKVxuICAgICAgICAgICAgICAgIClcbiAgICAgICAgICAgICAgOiAvLyBJZiBzdGF0ZSB3YXMgbm90IGluaXRpYWxpemVkLCB3ZSdsbCB0aHJvdyBhbiBlcnJvci5cbiAgICAgICAgICAgICAgICB0aHJvd0Vycm9yKG5ldyBFcnJvcih0aGlzLm5vdEluaXRpYWxpemVkRXJyb3JNZXNzYWdlKSlcbiAgICAgICAgICApLFxuICAgICAgICAgIHRha2VVbnRpbCh0aGlzLmRlc3Ryb3kkKVxuICAgICAgICApXG4gICAgICAgIC5zdWJzY3JpYmUoe1xuICAgICAgICAgIG5leHQ6IChbdmFsdWUsIGN1cnJlbnRTdGF0ZV0pID0+IHtcbiAgICAgICAgICAgIHRoaXMuc3RhdGVTdWJqZWN0JC5uZXh0KHVwZGF0ZXJGbihjdXJyZW50U3RhdGUsIHZhbHVlISkpO1xuICAgICAgICAgIH0sXG4gICAgICAgICAgZXJyb3I6IChlcnJvcjogRXJyb3IpID0+IHtcbiAgICAgICAgICAgIGluaXRpYWxpemF0aW9uRXJyb3IgPSBlcnJvcjtcbiAgICAgICAgICAgIHRoaXMuc3RhdGVTdWJqZWN0JC5lcnJvcihlcnJvcik7XG4gICAgICAgICAgfSxcbiAgICAgICAgfSk7XG5cbiAgICAgIGlmIChpbml0aWFsaXphdGlvbkVycm9yKSB7XG4gICAgICAgIC8vIHByZXR0aWVyLWlnbm9yZVxuICAgICAgICB0aHJvdyAvKiogQHR5cGUgeyFFcnJvcn0gKi8gKGluaXRpYWxpemF0aW9uRXJyb3IpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHN1YnNjcmlwdGlvbjtcbiAgICB9KSBhcyB1bmtub3duIGV4dGVuZHMgVlxuICAgICAgPyAoKSA9PiB2b2lkXG4gICAgICA6ICh0OiBWIHwgT2JzZXJ2YWJsZTxWPikgPT4gU3Vic2NyaXB0aW9uO1xuICB9XG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemVzIHN0YXRlLiBJZiBpdCB3YXMgYWxyZWFkeSBpbml0aWFsaXplZCB0aGVuIGl0IHJlc2V0cyB0aGVcbiAgICogc3RhdGUuXG4gICAqL1xuICBwcml2YXRlIGluaXRTdGF0ZShzdGF0ZTogVCk6IHZvaWQge1xuICAgIHNjaGVkdWxlZChbc3RhdGVdLCBxdWV1ZVNjaGVkdWxlcikuc3Vic2NyaWJlKChzKSA9PiB7XG4gICAgICB0aGlzLmlzSW5pdGlhbGl6ZWQgPSB0cnVlO1xuICAgICAgdGhpcy5zdGF0ZVN1YmplY3QkLm5leHQocyk7XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogU2V0cyB0aGUgc3RhdGUgc3BlY2lmaWMgdmFsdWUuXG4gICAqIEBwYXJhbSBzdGF0ZU9yVXBkYXRlckZuIG9iamVjdCBvZiB0aGUgc2FtZSB0eXBlIGFzIHRoZSBzdGF0ZSBvciBhblxuICAgKiB1cGRhdGVyRm4sIHJldHVybmluZyBzdWNoIG9iamVjdC5cbiAgICovXG4gIHNldFN0YXRlKHN0YXRlT3JVcGRhdGVyRm46IFQgfCAoKHN0YXRlOiBUKSA9PiBUKSk6IHZvaWQge1xuICAgIGlmICh0eXBlb2Ygc3RhdGVPclVwZGF0ZXJGbiAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgdGhpcy5pbml0U3RhdGUoc3RhdGVPclVwZGF0ZXJGbik7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMudXBkYXRlcihzdGF0ZU9yVXBkYXRlckZuIGFzIChzdGF0ZTogVCkgPT4gVCkoKTtcbiAgICB9XG4gIH1cblxuICBwcm90ZWN0ZWQgZ2V0KCk6IFQ7XG4gIHByb3RlY3RlZCBnZXQ8Uj4ocHJvamVjdG9yOiAoczogVCkgPT4gUik6IFI7XG4gIHByb3RlY3RlZCBnZXQ8Uj4ocHJvamVjdG9yPzogKHM6IFQpID0+IFIpOiBSIHwgVCB7XG4gICAgaWYgKCF0aGlzLmlzSW5pdGlhbGl6ZWQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcih0aGlzLm5vdEluaXRpYWxpemVkRXJyb3JNZXNzYWdlKTtcbiAgICB9XG4gICAgbGV0IHZhbHVlOiBSIHwgVDtcblxuICAgIHRoaXMuc3RhdGVTdWJqZWN0JC5waXBlKHRha2UoMSkpLnN1YnNjcmliZSgoc3RhdGUpID0+IHtcbiAgICAgIHZhbHVlID0gcHJvamVjdG9yID8gcHJvamVjdG9yKHN0YXRlKSA6IHN0YXRlO1xuICAgIH0pO1xuICAgIHJldHVybiB2YWx1ZSE7XG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlcyBhIHNlbGVjdG9yLlxuICAgKlxuICAgKiBUaGlzIHN1cHBvcnRzIGNvbWJpbmluZyB1cCB0byA0IHNlbGVjdG9ycy4gTW9yZSBjb3VsZCBiZSBhZGRlZCBhcyBuZWVkZWQuXG4gICAqXG4gICAqIEBwYXJhbSBwcm9qZWN0b3IgQSBwdXJlIHByb2plY3Rpb24gZnVuY3Rpb24gdGhhdCB0YWtlcyB0aGUgY3VycmVudCBzdGF0ZSBhbmRcbiAgICogICByZXR1cm5zIHNvbWUgbmV3IHNsaWNlL3Byb2plY3Rpb24gb2YgdGhhdCBzdGF0ZS5cbiAgICogQHBhcmFtIGNvbmZpZyBTZWxlY3RDb25maWcgdGhhdCBjaGFuZ2VzIHRoZSBiZWhhdm9pciBvZiBzZWxlY3RvciwgaW5jbHVkaW5nXG4gICAqICAgdGhlIGRlYm91bmNpbmcgb2YgdGhlIHZhbHVlcyB1bnRpbCB0aGUgc3RhdGUgaXMgc2V0dGxlZC5cbiAgICogQHJldHVybiBBbiBvYnNlcnZhYmxlIG9mIHRoZSBwcm9qZWN0b3IgcmVzdWx0cy5cbiAgICovXG4gIHNlbGVjdDxSPihwcm9qZWN0b3I6IChzOiBUKSA9PiBSLCBjb25maWc/OiBTZWxlY3RDb25maWcpOiBPYnNlcnZhYmxlPFI+O1xuICBzZWxlY3Q8UiwgUzE+KFxuICAgIHMxOiBPYnNlcnZhYmxlPFMxPixcbiAgICBwcm9qZWN0b3I6IChzMTogUzEpID0+IFIsXG4gICAgY29uZmlnPzogU2VsZWN0Q29uZmlnXG4gICk6IE9ic2VydmFibGU8Uj47XG4gIHNlbGVjdDxSLCBTMSwgUzI+KFxuICAgIHMxOiBPYnNlcnZhYmxlPFMxPixcbiAgICBzMjogT2JzZXJ2YWJsZTxTMj4sXG4gICAgcHJvamVjdG9yOiAoczE6IFMxLCBzMjogUzIpID0+IFIsXG4gICAgY29uZmlnPzogU2VsZWN0Q29uZmlnXG4gICk6IE9ic2VydmFibGU8Uj47XG4gIHNlbGVjdDxSLCBTMSwgUzIsIFMzPihcbiAgICBzMTogT2JzZXJ2YWJsZTxTMT4sXG4gICAgczI6IE9ic2VydmFibGU8UzI+LFxuICAgIHMzOiBPYnNlcnZhYmxlPFMzPixcbiAgICBwcm9qZWN0b3I6IChzMTogUzEsIHMyOiBTMiwgczM6IFMzKSA9PiBSLFxuICAgIGNvbmZpZz86IFNlbGVjdENvbmZpZ1xuICApOiBPYnNlcnZhYmxlPFI+O1xuICBzZWxlY3Q8UiwgUzEsIFMyLCBTMywgUzQ+KFxuICAgIHMxOiBPYnNlcnZhYmxlPFMxPixcbiAgICBzMjogT2JzZXJ2YWJsZTxTMj4sXG4gICAgczM6IE9ic2VydmFibGU8UzM+LFxuICAgIHM0OiBPYnNlcnZhYmxlPFM0PixcbiAgICBwcm9qZWN0b3I6IChzMTogUzEsIHMyOiBTMiwgczM6IFMzLCBzNDogUzQpID0+IFIsXG4gICAgY29uZmlnPzogU2VsZWN0Q29uZmlnXG4gICk6IE9ic2VydmFibGU8Uj47XG4gIHNlbGVjdDxcbiAgICBPIGV4dGVuZHMgQXJyYXk8T2JzZXJ2YWJsZTx1bmtub3duPiB8IFNlbGVjdENvbmZpZyB8IFByb2plY3RvckZuPixcbiAgICBSLFxuICAgIFByb2plY3RvckZuID0gKC4uLmE6IHVua25vd25bXSkgPT4gUlxuICA+KC4uLmFyZ3M6IE8pOiBPYnNlcnZhYmxlPFI+IHtcbiAgICBjb25zdCB7IG9ic2VydmFibGVzLCBwcm9qZWN0b3IsIGNvbmZpZyB9ID0gcHJvY2Vzc1NlbGVjdG9yQXJncyhhcmdzKTtcblxuICAgIGxldCBvYnNlcnZhYmxlJDogT2JzZXJ2YWJsZTx1bmtub3duPjtcbiAgICAvLyBJZiB0aGVyZSBhcmUgbm8gT2JzZXJ2YWJsZXMgdG8gY29tYmluZSwgdGhlbiB3ZSdsbCBqdXN0IG1hcCB0aGUgdmFsdWUuXG4gICAgaWYgKG9ic2VydmFibGVzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgb2JzZXJ2YWJsZSQgPSB0aGlzLnN0YXRlU3ViamVjdCQucGlwZShcbiAgICAgICAgY29uZmlnLmRlYm91bmNlID8gZGVib3VuY2VTeW5jKCkgOiAoc291cmNlJCkgPT4gc291cmNlJCxcbiAgICAgICAgbWFwKHByb2plY3RvcilcbiAgICAgICk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIElmIHRoZXJlIGFyZSBtdWx0aXBsZSBhcmd1bWVudHMsIHRoZW4gd2UncmUgYWdncmVnYXRpbmcgc2VsZWN0b3JzLCBzbyB3ZSBuZWVkXG4gICAgICAvLyB0byB0YWtlIHRoZSBjb21iaW5lTGF0ZXN0IG9mIHRoZW0gYmVmb3JlIGNhbGxpbmcgdGhlIG1hcCBmdW5jdGlvbi5cbiAgICAgIG9ic2VydmFibGUkID0gY29tYmluZUxhdGVzdChvYnNlcnZhYmxlcykucGlwZShcbiAgICAgICAgY29uZmlnLmRlYm91bmNlID8gZGVib3VuY2VTeW5jKCkgOiAoc291cmNlJCkgPT4gc291cmNlJCxcbiAgICAgICAgbWFwKChwcm9qZWN0b3JBcmdzKSA9PiBwcm9qZWN0b3IoLi4ucHJvamVjdG9yQXJncykpXG4gICAgICApO1xuICAgIH1cbiAgICByZXR1cm4gKG9ic2VydmFibGUkIGFzIE9ic2VydmFibGU8Uj4pLnBpcGUoXG4gICAgICBkaXN0aW5jdFVudGlsQ2hhbmdlZCgpLFxuICAgICAgc2hhcmVSZXBsYXkoe1xuICAgICAgICByZWZDb3VudDogdHJ1ZSxcbiAgICAgICAgYnVmZmVyU2l6ZTogMSxcbiAgICAgIH0pLFxuICAgICAgdGFrZVVudGlsKHRoaXMuZGVzdHJveSQpXG4gICAgKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGVzIGFuIGVmZmVjdC5cbiAgICpcbiAgICogVGhpcyBlZmZlY3QgaXMgc3Vic2NyaWJlZCB0byBmb3IgdGhlIGxpZmUgb2YgdGhlIEBDb21wb25lbnQuXG4gICAqIEBwYXJhbSBnZW5lcmF0b3IgQSBmdW5jdGlvbiB0aGF0IHRha2VzIGFuIG9yaWdpbiBPYnNlcnZhYmxlIGlucHV0IGFuZFxuICAgKiAgICAgcmV0dXJucyBhbiBPYnNlcnZhYmxlLiBUaGUgT2JzZXJ2YWJsZSB0aGF0IGlzIHJldHVybmVkIHdpbGwgYmVcbiAgICogICAgIHN1YnNjcmliZWQgdG8gZm9yIHRoZSBsaWZlIG9mIHRoZSBjb21wb25lbnQuXG4gICAqIEByZXR1cm4gQSBmdW5jdGlvbiB0aGF0LCB3aGVuIGNhbGxlZCwgd2lsbCB0cmlnZ2VyIHRoZSBvcmlnaW4gT2JzZXJ2YWJsZS5cbiAgICovXG4gIGVmZmVjdDxWLCBSID0gdW5rbm93bj4oXG4gICAgZ2VuZXJhdG9yOiAob3JpZ2luJDogT2JzZXJ2YWJsZTxWPikgPT4gT2JzZXJ2YWJsZTxSPlxuICApOiBFZmZlY3RSZXR1cm5GbjxWPiB7XG4gICAgY29uc3Qgb3JpZ2luJCA9IG5ldyBTdWJqZWN0PFY+KCk7XG4gICAgZ2VuZXJhdG9yKG9yaWdpbiQpXG4gICAgICAvLyB0aWVkIHRvIHRoZSBsaWZlY3ljbGUg8J+RhyBvZiBDb21wb25lbnRTdG9yZVxuICAgICAgLnBpcGUodGFrZVVudGlsKHRoaXMuZGVzdHJveSQpKVxuICAgICAgLnN1YnNjcmliZSgpO1xuXG4gICAgcmV0dXJuIChvYnNlcnZhYmxlT3JWYWx1ZT86IFYgfCBPYnNlcnZhYmxlPFY+KTogU3Vic2NyaXB0aW9uID0+IHtcbiAgICAgIGNvbnN0IG9ic2VydmFibGUkID0gaXNPYnNlcnZhYmxlKG9ic2VydmFibGVPclZhbHVlKVxuICAgICAgICA/IG9ic2VydmFibGVPclZhbHVlXG4gICAgICAgIDogb2Yob2JzZXJ2YWJsZU9yVmFsdWUpO1xuICAgICAgcmV0dXJuIG9ic2VydmFibGUkLnBpcGUodGFrZVVudGlsKHRoaXMuZGVzdHJveSQpKS5zdWJzY3JpYmUoKHZhbHVlKSA9PiB7XG4gICAgICAgIC8vIGFueSBuZXcg8J+RhyB2YWx1ZSBpcyBwdXNoZWQgaW50byBhIHN0cmVhbVxuICAgICAgICBvcmlnaW4kLm5leHQodmFsdWUpO1xuICAgICAgfSk7XG4gICAgfTtcbiAgfVxufVxuXG5mdW5jdGlvbiBwcm9jZXNzU2VsZWN0b3JBcmdzPFxuICBPIGV4dGVuZHMgQXJyYXk8T2JzZXJ2YWJsZTx1bmtub3duPiB8IFNlbGVjdENvbmZpZyB8IFByb2plY3RvckZuPixcbiAgUixcbiAgUHJvamVjdG9yRm4gPSAoLi4uYTogdW5rbm93bltdKSA9PiBSXG4+KFxuICBhcmdzOiBPXG4pOiB7XG4gIG9ic2VydmFibGVzOiBPYnNlcnZhYmxlPHVua25vd24+W107XG4gIHByb2plY3RvcjogUHJvamVjdG9yRm47XG4gIGNvbmZpZzogUmVxdWlyZWQ8U2VsZWN0Q29uZmlnPjtcbn0ge1xuICBjb25zdCBzZWxlY3RvckFyZ3MgPSBBcnJheS5mcm9tKGFyZ3MpO1xuICAvLyBBc3NpZ24gZGVmYXVsdCB2YWx1ZXMuXG4gIGxldCBjb25maWc6IFJlcXVpcmVkPFNlbGVjdENvbmZpZz4gPSB7IGRlYm91bmNlOiBmYWxzZSB9O1xuICBsZXQgcHJvamVjdG9yOiBQcm9qZWN0b3JGbjtcbiAgLy8gTGFzdCBhcmd1bWVudCBpcyBlaXRoZXIgcHJvamVjdG9yIG9yIGNvbmZpZ1xuICBjb25zdCBwcm9qZWN0b3JPckNvbmZpZyA9IHNlbGVjdG9yQXJncy5wb3AoKSBhcyBQcm9qZWN0b3JGbiB8IFNlbGVjdENvbmZpZztcblxuICBpZiAodHlwZW9mIHByb2plY3Rvck9yQ29uZmlnICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgLy8gV2UgZ290IHRoZSBjb25maWcgYXMgdGhlIGxhc3QgYXJndW1lbnQsIHJlcGxhY2UgYW55IGRlZmF1bHQgdmFsdWVzIHdpdGggaXQuXG4gICAgY29uZmlnID0geyAuLi5jb25maWcsIC4uLnByb2plY3Rvck9yQ29uZmlnIH07XG4gICAgLy8gUG9wIHRoZSBuZXh0IGFyZ3MsIHdoaWNoIHdvdWxkIGJlIHRoZSBwcm9qZWN0b3IgZm4uXG4gICAgcHJvamVjdG9yID0gc2VsZWN0b3JBcmdzLnBvcCgpIGFzIFByb2plY3RvckZuO1xuICB9IGVsc2Uge1xuICAgIHByb2plY3RvciA9IHByb2plY3Rvck9yQ29uZmlnO1xuICB9XG4gIC8vIFRoZSBPYnNlcnZhYmxlcyB0byBjb21iaW5lLCBpZiB0aGVyZSBhcmUgYW55LlxuICBjb25zdCBvYnNlcnZhYmxlcyA9IHNlbGVjdG9yQXJncyBhcyBPYnNlcnZhYmxlPHVua25vd24+W107XG4gIHJldHVybiB7XG4gICAgb2JzZXJ2YWJsZXMsXG4gICAgcHJvamVjdG9yLFxuICAgIGNvbmZpZyxcbiAgfTtcbn1cbiJdfQ==