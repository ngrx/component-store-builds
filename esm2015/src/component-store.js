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
     * Patches the state with provided partial state.
     *
     * @throws Error if the state is not initialized.
     * @param {?} partialStateOrUpdaterFn a partial state or a partial updater
     * function that accepts the state and returns the partial state.
     * @return {?}
     */
    patchState(partialStateOrUpdaterFn) {
        this.setState((/**
         * @param {?} state
         * @return {?}
         */
        (state) => {
            /** @type {?} */
            const patchedState = typeof partialStateOrUpdaterFn === 'function'
                ? partialStateOrUpdaterFn(state)
                : partialStateOrUpdaterFn;
            return Object.assign(Object.assign({}, state), patchedState);
        }));
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
     * @template Selectors, Result, ProjectorFn
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
        return observable$.pipe(distinctUntilChanged(), shareReplay({
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
 * @template Selectors, Result, ProjectorFn
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcG9uZW50LXN0b3JlLmpzIiwic291cmNlUm9vdCI6Ii4uLy4uLy4uLy4uL21vZHVsZXMvY29tcG9uZW50LXN0b3JlLyIsInNvdXJjZXMiOlsic3JjL2NvbXBvbmVudC1zdG9yZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7OztBQUFBLE9BQU8sRUFDTCxZQUFZLEVBRVosRUFBRSxFQUNGLGFBQWEsRUFFYixVQUFVLEVBQ1YsYUFBYSxFQUNiLE9BQU8sRUFDUCxjQUFjLEVBQ2QsU0FBUyxHQUNWLE1BQU0sTUFBTSxDQUFDO0FBQ2QsT0FBTyxFQUNMLFNBQVMsRUFDVCxTQUFTLEVBQ1QsY0FBYyxFQUNkLEdBQUcsRUFDSCxvQkFBb0IsRUFDcEIsV0FBVyxFQUNYLElBQUksR0FDTCxNQUFNLGdCQUFnQixDQUFDO0FBQ3hCLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUMvQyxPQUFPLEVBQ0wsVUFBVSxFQUVWLFFBQVEsRUFDUixjQUFjLEVBQ2QsTUFBTSxHQUNQLE1BQU0sZUFBZSxDQUFDOzs7O0FBRXZCLGtDQUVDOzs7SUFEQyxnQ0FBbUI7OztBQUdyQixNQUFNLE9BQU8sbUJBQW1CLEdBQUcsSUFBSSxjQUFjLENBQ25ELHFDQUFxQyxDQUN0Qzs7OztBQWFELE1BQU0sT0FBTyxjQUFjOzs7O0lBY3pCLFlBQXFELFlBQWdCOztRQVpwRCxvQkFBZSxHQUFHLElBQUksYUFBYSxDQUFPLENBQUMsQ0FBQyxDQUFDOztRQUVyRCxhQUFRLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxZQUFZLEVBQUUsQ0FBQztRQUV2QyxrQkFBYSxHQUFHLElBQUksYUFBYSxDQUFJLENBQUMsQ0FBQyxDQUFDO1FBQ2pELGtCQUFhLEdBQUcsS0FBSyxDQUFDO1FBQ3RCLCtCQUEwQixHQUNoQyxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxpQ0FBaUM7WUFDekQsNkRBQTZELENBQUM7O1FBRXZELFdBQU0sR0FBa0IsSUFBSSxDQUFDLE1BQU07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QUFDLEtBQUssQ0FBQyxDQUFDO1lBQ3RCLENBQUMsRUFBQyxDQUFDO1FBQ0wsQ0FBQyxFQUFDLEVBQVcsQ0FBQyxFQUFjLENBQUM7SUFDL0IsQ0FBQzs7O1lBbFFGLFVBQVU7Ozs7NENBZUksUUFBUSxZQUFJLE1BQU0sU0FBQyxtQkFBbUI7Ozs7Ozs7SUFabkQseUNBQThEOztJQUU5RCxrQ0FBd0Q7Ozs7O0lBRXhELHVDQUF5RDs7Ozs7SUFDekQsdUNBQThCOzs7OztJQUM5QixvREFFZ0U7O0lBRWhFLGdDQUF1RDs7Ozs7OztBQXdQekQsU0FBUyxtQkFBbUIsQ0FLMUIsSUFBZTs7VUFNVCxZQUFZLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUM7OztRQUVqQyxNQUFNLEdBQTJCLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRTs7UUFDcEQsU0FBc0I7OztVQUVwQixpQkFBaUIsR0FBRyxtQkFBQSxZQUFZLENBQUMsR0FBRyxFQUFFLEVBQThCO0lBRTFFLElBQUksT0FBTyxpQkFBaUIsS0FBSyxVQUFVLEVBQUU7UUFDM0MsOEVBQThFO1FBQzlFLE1BQU0sbUNBQVEsTUFBTSxHQUFLLGlCQUFpQixDQUFFLENBQUM7UUFDN0Msc0RBQXNEO1FBQ3RELFNBQVMsR0FBRyxtQkFBQSxZQUFZLENBQUMsR0FBRyxFQUFFLEVBQWUsQ0FBQztLQUMvQztTQUFNO1FBQ0wsU0FBUyxHQUFHLGlCQUFpQixDQUFDO0tBQy9COzs7VUFFSyxXQUFXLEdBQUcsbUJBQUEsWUFBWSxFQUF5QjtJQUN6RCxPQUFPO1FBQ0wsV0FBVztRQUNYLFNBQVM7UUFDVCxNQUFNO0tBQ1AsQ0FBQztBQUNKLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge1xuICBpc09ic2VydmFibGUsXG4gIE9ic2VydmFibGUsXG4gIG9mLFxuICBSZXBsYXlTdWJqZWN0LFxuICBTdWJzY3JpcHRpb24sXG4gIHRocm93RXJyb3IsXG4gIGNvbWJpbmVMYXRlc3QsXG4gIFN1YmplY3QsXG4gIHF1ZXVlU2NoZWR1bGVyLFxuICBzY2hlZHVsZWQsXG59IGZyb20gJ3J4anMnO1xuaW1wb3J0IHtcbiAgY29uY2F0TWFwLFxuICB0YWtlVW50aWwsXG4gIHdpdGhMYXRlc3RGcm9tLFxuICBtYXAsXG4gIGRpc3RpbmN0VW50aWxDaGFuZ2VkLFxuICBzaGFyZVJlcGxheSxcbiAgdGFrZSxcbn0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0IHsgZGVib3VuY2VTeW5jIH0gZnJvbSAnLi9kZWJvdW5jZS1zeW5jJztcbmltcG9ydCB7XG4gIEluamVjdGFibGUsXG4gIE9uRGVzdHJveSxcbiAgT3B0aW9uYWwsXG4gIEluamVjdGlvblRva2VuLFxuICBJbmplY3QsXG59IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuXG5leHBvcnQgaW50ZXJmYWNlIFNlbGVjdENvbmZpZyB7XG4gIGRlYm91bmNlPzogYm9vbGVhbjtcbn1cblxuZXhwb3J0IGNvbnN0IElOSVRJQUxfU1RBVEVfVE9LRU4gPSBuZXcgSW5qZWN0aW9uVG9rZW4oXG4gICdAbmdyeC9jb21wb25lbnQtc3RvcmUgSW5pdGlhbCBTdGF0ZSdcbik7XG5cbmV4cG9ydCB0eXBlIFNlbGVjdG9yUmVzdWx0czxTZWxlY3RvcnMgZXh0ZW5kcyBPYnNlcnZhYmxlPHVua25vd24+W10+ID0ge1xuICBbS2V5IGluIGtleW9mIFNlbGVjdG9yc106IFNlbGVjdG9yc1tLZXldIGV4dGVuZHMgT2JzZXJ2YWJsZTxpbmZlciBVPlxuICAgID8gVVxuICAgIDogbmV2ZXI7XG59O1xuXG5leHBvcnQgdHlwZSBQcm9qZWN0b3I8U2VsZWN0b3JzIGV4dGVuZHMgT2JzZXJ2YWJsZTx1bmtub3duPltdLCBSZXN1bHQ+ID0gKFxuICAuLi5hcmdzOiBTZWxlY3RvclJlc3VsdHM8U2VsZWN0b3JzPlxuKSA9PiBSZXN1bHQ7XG5cbkBJbmplY3RhYmxlKClcbmV4cG9ydCBjbGFzcyBDb21wb25lbnRTdG9yZTxUIGV4dGVuZHMgb2JqZWN0PiBpbXBsZW1lbnRzIE9uRGVzdHJveSB7XG4gIC8vIFNob3VsZCBiZSB1c2VkIG9ubHkgaW4gbmdPbkRlc3Ryb3kuXG4gIHByaXZhdGUgcmVhZG9ubHkgZGVzdHJveVN1YmplY3QkID0gbmV3IFJlcGxheVN1YmplY3Q8dm9pZD4oMSk7XG4gIC8vIEV4cG9zZWQgdG8gYW55IGV4dGVuZGluZyBTdG9yZSB0byBiZSB1c2VkIGZvciB0aGUgdGVhcmRvd24uXG4gIHJlYWRvbmx5IGRlc3Ryb3kkID0gdGhpcy5kZXN0cm95U3ViamVjdCQuYXNPYnNlcnZhYmxlKCk7XG5cbiAgcHJpdmF0ZSByZWFkb25seSBzdGF0ZVN1YmplY3QkID0gbmV3IFJlcGxheVN1YmplY3Q8VD4oMSk7XG4gIHByaXZhdGUgaXNJbml0aWFsaXplZCA9IGZhbHNlO1xuICBwcml2YXRlIG5vdEluaXRpYWxpemVkRXJyb3JNZXNzYWdlID1cbiAgICBgJHt0aGlzLmNvbnN0cnVjdG9yLm5hbWV9IGhhcyBub3QgYmVlbiBpbml0aWFsaXplZCB5ZXQuIGAgK1xuICAgIGBQbGVhc2UgbWFrZSBzdXJlIGl0IGlzIGluaXRpYWxpemVkIGJlZm9yZSB1cGRhdGluZy9nZXR0aW5nLmA7XG4gIC8vIE5lZWRzIHRvIGJlIGFmdGVyIGRlc3Ryb3kkIGlzIGRlY2xhcmVkIGJlY2F1c2UgaXQncyB1c2VkIGluIHNlbGVjdC5cbiAgcmVhZG9ubHkgc3RhdGUkOiBPYnNlcnZhYmxlPFQ+ID0gdGhpcy5zZWxlY3QoKHMpID0+IHMpO1xuXG4gIGNvbnN0cnVjdG9yKEBPcHRpb25hbCgpIEBJbmplY3QoSU5JVElBTF9TVEFURV9UT0tFTikgZGVmYXVsdFN0YXRlPzogVCkge1xuICAgIC8vIFN0YXRlIGNhbiBiZSBpbml0aWFsaXplZCBlaXRoZXIgdGhyb3VnaCBjb25zdHJ1Y3RvciBvciBzZXRTdGF0ZS5cbiAgICBpZiAoZGVmYXVsdFN0YXRlKSB7XG4gICAgICB0aGlzLmluaXRTdGF0ZShkZWZhdWx0U3RhdGUpO1xuICAgIH1cbiAgfVxuXG4gIC8qKiBDb21wbGV0ZXMgYWxsIHJlbGV2YW50IE9ic2VydmFibGUgc3RyZWFtcy4gKi9cbiAgbmdPbkRlc3Ryb3koKSB7XG4gICAgdGhpcy5zdGF0ZVN1YmplY3QkLmNvbXBsZXRlKCk7XG4gICAgdGhpcy5kZXN0cm95U3ViamVjdCQubmV4dCgpO1xuICB9XG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgYW4gdXBkYXRlci5cbiAgICpcbiAgICogVGhyb3dzIGFuIGVycm9yIGlmIHVwZGF0ZXIgaXMgY2FsbGVkIHdpdGggc3luY2hyb25vdXMgdmFsdWVzIChlaXRoZXJcbiAgICogaW1wZXJhdGl2ZSB2YWx1ZSBvciBPYnNlcnZhYmxlIHRoYXQgaXMgc3luY2hyb25vdXMpIGJlZm9yZSBDb21wb25lbnRTdG9yZVxuICAgKiBpcyBpbml0aWFsaXplZC4gSWYgY2FsbGVkIHdpdGggYXN5bmMgT2JzZXJ2YWJsZSBiZWZvcmUgaW5pdGlhbGl6YXRpb24gdGhlblxuICAgKiBzdGF0ZSB3aWxsIG5vdCBiZSB1cGRhdGVkIGFuZCBzdWJzY3JpcHRpb24gd291bGQgYmUgY2xvc2VkLlxuICAgKlxuICAgKiBAcGFyYW0gdXBkYXRlckZuIEEgc3RhdGljIHVwZGF0ZXIgZnVuY3Rpb24gdGhhdCB0YWtlcyAyIHBhcmFtZXRlcnMgKHRoZVxuICAgKiBjdXJyZW50IHN0YXRlIGFuZCBhbiBhcmd1bWVudCBvYmplY3QpIGFuZCByZXR1cm5zIGEgbmV3IGluc3RhbmNlIG9mIHRoZVxuICAgKiBzdGF0ZS5cbiAgICogQHJldHVybiBBIGZ1bmN0aW9uIHRoYXQgYWNjZXB0cyBvbmUgYXJndW1lbnQgd2hpY2ggaXMgZm9yd2FyZGVkIGFzIHRoZVxuICAgKiAgICAgc2Vjb25kIGFyZ3VtZW50IHRvIGB1cGRhdGVyRm5gLiBFdmVyeSB0aW1lIHRoaXMgZnVuY3Rpb24gaXMgY2FsbGVkXG4gICAqICAgICBzdWJzY3JpYmVycyB3aWxsIGJlIG5vdGlmaWVkIG9mIHRoZSBzdGF0ZSBjaGFuZ2UuXG4gICAqL1xuICB1cGRhdGVyPFxuICAgIC8vIEFsbG93IHRvIGZvcmNlLXByb3ZpZGUgdGhlIHR5cGVcbiAgICBQcm92aWRlZFR5cGUgPSB2b2lkLFxuICAgIC8vIFRoaXMgdHlwZSBpcyBkZXJpdmVkIGZyb20gdGhlIGB2YWx1ZWAgcHJvcGVydHksIGRlZmF1bHRpbmcgdG8gdm9pZCBpZiBpdCdzIG1pc3NpbmdcbiAgICBPcmlnaW5UeXBlID0gUHJvdmlkZWRUeXBlLFxuICAgIC8vIFRoZSBWYWx1ZSB0eXBlIGlzIGFzc2lnbmVkIGZyb20gdGhlIE9yaWdpblxuICAgIFZhbHVlVHlwZSA9IE9yaWdpblR5cGUsXG4gICAgLy8gUmV0dXJuIGVpdGhlciBhbiBlbXB0eSBjYWxsYmFjayBvciBhIGZ1bmN0aW9uIHJlcXVpcmluZyBzcGVjaWZpYyB0eXBlcyBhcyBpbnB1dHNcbiAgICBSZXR1cm5UeXBlID0gT3JpZ2luVHlwZSBleHRlbmRzIHZvaWRcbiAgICAgID8gKCkgPT4gdm9pZFxuICAgICAgOiAob2JzZXJ2YWJsZU9yVmFsdWU6IFZhbHVlVHlwZSB8IE9ic2VydmFibGU8VmFsdWVUeXBlPikgPT4gU3Vic2NyaXB0aW9uXG4gID4odXBkYXRlckZuOiAoc3RhdGU6IFQsIHZhbHVlOiBPcmlnaW5UeXBlKSA9PiBUKTogUmV0dXJuVHlwZSB7XG4gICAgcmV0dXJuICgoKFxuICAgICAgb2JzZXJ2YWJsZU9yVmFsdWU/OiBPcmlnaW5UeXBlIHwgT2JzZXJ2YWJsZTxPcmlnaW5UeXBlPlxuICAgICk6IFN1YnNjcmlwdGlvbiA9PiB7XG4gICAgICBsZXQgaW5pdGlhbGl6YXRpb25FcnJvcjogRXJyb3IgfCB1bmRlZmluZWQ7XG4gICAgICAvLyBXZSBjYW4gcmVjZWl2ZSBlaXRoZXIgdGhlIHZhbHVlIG9yIGFuIG9ic2VydmFibGUuIEluIGNhc2UgaXQncyBhXG4gICAgICAvLyBzaW1wbGUgdmFsdWUsIHdlJ2xsIHdyYXAgaXQgd2l0aCBgb2ZgIG9wZXJhdG9yIHRvIHR1cm4gaXQgaW50b1xuICAgICAgLy8gT2JzZXJ2YWJsZS5cbiAgICAgIGNvbnN0IG9ic2VydmFibGUkID0gaXNPYnNlcnZhYmxlKG9ic2VydmFibGVPclZhbHVlKVxuICAgICAgICA/IG9ic2VydmFibGVPclZhbHVlXG4gICAgICAgIDogb2Yob2JzZXJ2YWJsZU9yVmFsdWUpO1xuICAgICAgY29uc3Qgc3Vic2NyaXB0aW9uID0gb2JzZXJ2YWJsZSRcbiAgICAgICAgLnBpcGUoXG4gICAgICAgICAgY29uY2F0TWFwKCh2YWx1ZSkgPT5cbiAgICAgICAgICAgIHRoaXMuaXNJbml0aWFsaXplZFxuICAgICAgICAgICAgICA/IC8vIFB1c2ggdGhlIHZhbHVlIGludG8gcXVldWVTY2hlZHVsZXJcbiAgICAgICAgICAgICAgICBzY2hlZHVsZWQoW3ZhbHVlXSwgcXVldWVTY2hlZHVsZXIpLnBpcGUoXG4gICAgICAgICAgICAgICAgICB3aXRoTGF0ZXN0RnJvbSh0aGlzLnN0YXRlU3ViamVjdCQpXG4gICAgICAgICAgICAgICAgKVxuICAgICAgICAgICAgICA6IC8vIElmIHN0YXRlIHdhcyBub3QgaW5pdGlhbGl6ZWQsIHdlJ2xsIHRocm93IGFuIGVycm9yLlxuICAgICAgICAgICAgICAgIHRocm93RXJyb3IobmV3IEVycm9yKHRoaXMubm90SW5pdGlhbGl6ZWRFcnJvck1lc3NhZ2UpKVxuICAgICAgICAgICksXG4gICAgICAgICAgdGFrZVVudGlsKHRoaXMuZGVzdHJveSQpXG4gICAgICAgIClcbiAgICAgICAgLnN1YnNjcmliZSh7XG4gICAgICAgICAgbmV4dDogKFt2YWx1ZSwgY3VycmVudFN0YXRlXSkgPT4ge1xuICAgICAgICAgICAgdGhpcy5zdGF0ZVN1YmplY3QkLm5leHQodXBkYXRlckZuKGN1cnJlbnRTdGF0ZSwgdmFsdWUhKSk7XG4gICAgICAgICAgfSxcbiAgICAgICAgICBlcnJvcjogKGVycm9yOiBFcnJvcikgPT4ge1xuICAgICAgICAgICAgaW5pdGlhbGl6YXRpb25FcnJvciA9IGVycm9yO1xuICAgICAgICAgICAgdGhpcy5zdGF0ZVN1YmplY3QkLmVycm9yKGVycm9yKTtcbiAgICAgICAgICB9LFxuICAgICAgICB9KTtcblxuICAgICAgaWYgKGluaXRpYWxpemF0aW9uRXJyb3IpIHtcbiAgICAgICAgLy8gcHJldHRpZXItaWdub3JlXG4gICAgICAgIHRocm93IC8qKiBAdHlwZSB7IUVycm9yfSAqLyAoaW5pdGlhbGl6YXRpb25FcnJvcik7XG4gICAgICB9XG4gICAgICByZXR1cm4gc3Vic2NyaXB0aW9uO1xuICAgIH0pIGFzIHVua25vd24pIGFzIFJldHVyblR5cGU7XG4gIH1cblxuICAvKipcbiAgICogSW5pdGlhbGl6ZXMgc3RhdGUuIElmIGl0IHdhcyBhbHJlYWR5IGluaXRpYWxpemVkIHRoZW4gaXQgcmVzZXRzIHRoZVxuICAgKiBzdGF0ZS5cbiAgICovXG4gIHByaXZhdGUgaW5pdFN0YXRlKHN0YXRlOiBUKTogdm9pZCB7XG4gICAgc2NoZWR1bGVkKFtzdGF0ZV0sIHF1ZXVlU2NoZWR1bGVyKS5zdWJzY3JpYmUoKHMpID0+IHtcbiAgICAgIHRoaXMuaXNJbml0aWFsaXplZCA9IHRydWU7XG4gICAgICB0aGlzLnN0YXRlU3ViamVjdCQubmV4dChzKTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBTZXRzIHRoZSBzdGF0ZSBzcGVjaWZpYyB2YWx1ZS5cbiAgICogQHBhcmFtIHN0YXRlT3JVcGRhdGVyRm4gb2JqZWN0IG9mIHRoZSBzYW1lIHR5cGUgYXMgdGhlIHN0YXRlIG9yIGFuXG4gICAqIHVwZGF0ZXJGbiwgcmV0dXJuaW5nIHN1Y2ggb2JqZWN0LlxuICAgKi9cbiAgc2V0U3RhdGUoc3RhdGVPclVwZGF0ZXJGbjogVCB8ICgoc3RhdGU6IFQpID0+IFQpKTogdm9pZCB7XG4gICAgaWYgKHR5cGVvZiBzdGF0ZU9yVXBkYXRlckZuICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICB0aGlzLmluaXRTdGF0ZShzdGF0ZU9yVXBkYXRlckZuKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy51cGRhdGVyKHN0YXRlT3JVcGRhdGVyRm4gYXMgKHN0YXRlOiBUKSA9PiBUKSgpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBQYXRjaGVzIHRoZSBzdGF0ZSB3aXRoIHByb3ZpZGVkIHBhcnRpYWwgc3RhdGUuXG4gICAqXG4gICAqIEBwYXJhbSBwYXJ0aWFsU3RhdGVPclVwZGF0ZXJGbiBhIHBhcnRpYWwgc3RhdGUgb3IgYSBwYXJ0aWFsIHVwZGF0ZXJcbiAgICogZnVuY3Rpb24gdGhhdCBhY2NlcHRzIHRoZSBzdGF0ZSBhbmQgcmV0dXJucyB0aGUgcGFydGlhbCBzdGF0ZS5cbiAgICogQHRocm93cyBFcnJvciBpZiB0aGUgc3RhdGUgaXMgbm90IGluaXRpYWxpemVkLlxuICAgKi9cbiAgcGF0Y2hTdGF0ZShcbiAgICBwYXJ0aWFsU3RhdGVPclVwZGF0ZXJGbjogUGFydGlhbDxUPiB8ICgoc3RhdGU6IFQpID0+IFBhcnRpYWw8VD4pXG4gICk6IHZvaWQge1xuICAgIHRoaXMuc2V0U3RhdGUoKHN0YXRlKSA9PiB7XG4gICAgICBjb25zdCBwYXRjaGVkU3RhdGUgPVxuICAgICAgICB0eXBlb2YgcGFydGlhbFN0YXRlT3JVcGRhdGVyRm4gPT09ICdmdW5jdGlvbidcbiAgICAgICAgICA/IHBhcnRpYWxTdGF0ZU9yVXBkYXRlckZuKHN0YXRlKVxuICAgICAgICAgIDogcGFydGlhbFN0YXRlT3JVcGRhdGVyRm47XG5cbiAgICAgIHJldHVybiB7XG4gICAgICAgIC4uLnN0YXRlLFxuICAgICAgICAuLi5wYXRjaGVkU3RhdGUsXG4gICAgICB9O1xuICAgIH0pO1xuICB9XG5cbiAgcHJvdGVjdGVkIGdldCgpOiBUO1xuICBwcm90ZWN0ZWQgZ2V0PFI+KHByb2plY3RvcjogKHM6IFQpID0+IFIpOiBSO1xuICBwcm90ZWN0ZWQgZ2V0PFI+KHByb2plY3Rvcj86IChzOiBUKSA9PiBSKTogUiB8IFQge1xuICAgIGlmICghdGhpcy5pc0luaXRpYWxpemVkKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IodGhpcy5ub3RJbml0aWFsaXplZEVycm9yTWVzc2FnZSk7XG4gICAgfVxuICAgIGxldCB2YWx1ZTogUiB8IFQ7XG5cbiAgICB0aGlzLnN0YXRlU3ViamVjdCQucGlwZSh0YWtlKDEpKS5zdWJzY3JpYmUoKHN0YXRlKSA9PiB7XG4gICAgICB2YWx1ZSA9IHByb2plY3RvciA/IHByb2plY3RvcihzdGF0ZSkgOiBzdGF0ZTtcbiAgICB9KTtcbiAgICByZXR1cm4gdmFsdWUhO1xuICB9XG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBzZWxlY3Rvci5cbiAgICpcbiAgICogQHBhcmFtIHByb2plY3RvciBBIHB1cmUgcHJvamVjdGlvbiBmdW5jdGlvbiB0aGF0IHRha2VzIHRoZSBjdXJyZW50IHN0YXRlIGFuZFxuICAgKiAgIHJldHVybnMgc29tZSBuZXcgc2xpY2UvcHJvamVjdGlvbiBvZiB0aGF0IHN0YXRlLlxuICAgKiBAcGFyYW0gY29uZmlnIFNlbGVjdENvbmZpZyB0aGF0IGNoYW5nZXMgdGhlIGJlaGF2aW9yIG9mIHNlbGVjdG9yLCBpbmNsdWRpbmdcbiAgICogICB0aGUgZGVib3VuY2luZyBvZiB0aGUgdmFsdWVzIHVudGlsIHRoZSBzdGF0ZSBpcyBzZXR0bGVkLlxuICAgKiBAcmV0dXJuIEFuIG9ic2VydmFibGUgb2YgdGhlIHByb2plY3RvciByZXN1bHRzLlxuICAgKi9cbiAgc2VsZWN0PFJlc3VsdD4oXG4gICAgcHJvamVjdG9yOiAoczogVCkgPT4gUmVzdWx0LFxuICAgIGNvbmZpZz86IFNlbGVjdENvbmZpZ1xuICApOiBPYnNlcnZhYmxlPFJlc3VsdD47XG4gIHNlbGVjdDxTZWxlY3RvcnMgZXh0ZW5kcyBPYnNlcnZhYmxlPHVua25vd24+W10sIFJlc3VsdD4oXG4gICAgLi4uYXJnczogWy4uLnNlbGVjdG9yczogU2VsZWN0b3JzLCBwcm9qZWN0b3I6IFByb2plY3RvcjxTZWxlY3RvcnMsIFJlc3VsdD5dXG4gICk6IE9ic2VydmFibGU8UmVzdWx0PjtcbiAgc2VsZWN0PFNlbGVjdG9ycyBleHRlbmRzIE9ic2VydmFibGU8dW5rbm93bj5bXSwgUmVzdWx0PihcbiAgICAuLi5hcmdzOiBbXG4gICAgICAuLi5zZWxlY3RvcnM6IFNlbGVjdG9ycyxcbiAgICAgIHByb2plY3RvcjogUHJvamVjdG9yPFNlbGVjdG9ycywgUmVzdWx0PixcbiAgICAgIGNvbmZpZzogU2VsZWN0Q29uZmlnXG4gICAgXVxuICApOiBPYnNlcnZhYmxlPFJlc3VsdD47XG4gIHNlbGVjdDxcbiAgICBTZWxlY3RvcnMgZXh0ZW5kcyBBcnJheTxPYnNlcnZhYmxlPHVua25vd24+IHwgU2VsZWN0Q29uZmlnIHwgUHJvamVjdG9yRm4+LFxuICAgIFJlc3VsdCxcbiAgICBQcm9qZWN0b3JGbiA9ICguLi5hOiB1bmtub3duW10pID0+IFJlc3VsdFxuICA+KC4uLmFyZ3M6IFNlbGVjdG9ycyk6IE9ic2VydmFibGU8UmVzdWx0PiB7XG4gICAgY29uc3QgeyBvYnNlcnZhYmxlcywgcHJvamVjdG9yLCBjb25maWcgfSA9IHByb2Nlc3NTZWxlY3RvckFyZ3M8XG4gICAgICBTZWxlY3RvcnMsXG4gICAgICBSZXN1bHRcbiAgICA+KGFyZ3MpO1xuXG4gICAgbGV0IG9ic2VydmFibGUkOiBPYnNlcnZhYmxlPFJlc3VsdD47XG4gICAgLy8gSWYgdGhlcmUgYXJlIG5vIE9ic2VydmFibGVzIHRvIGNvbWJpbmUsIHRoZW4gd2UnbGwganVzdCBtYXAgdGhlIHZhbHVlLlxuICAgIGlmIChvYnNlcnZhYmxlcy5sZW5ndGggPT09IDApIHtcbiAgICAgIG9ic2VydmFibGUkID0gdGhpcy5zdGF0ZVN1YmplY3QkLnBpcGUoXG4gICAgICAgIGNvbmZpZy5kZWJvdW5jZSA/IGRlYm91bmNlU3luYygpIDogKHNvdXJjZSQpID0+IHNvdXJjZSQsXG4gICAgICAgIG1hcChwcm9qZWN0b3IpXG4gICAgICApO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBJZiB0aGVyZSBhcmUgbXVsdGlwbGUgYXJndW1lbnRzLCB0aGVuIHdlJ3JlIGFnZ3JlZ2F0aW5nIHNlbGVjdG9ycywgc28gd2UgbmVlZFxuICAgICAgLy8gdG8gdGFrZSB0aGUgY29tYmluZUxhdGVzdCBvZiB0aGVtIGJlZm9yZSBjYWxsaW5nIHRoZSBtYXAgZnVuY3Rpb24uXG4gICAgICBvYnNlcnZhYmxlJCA9IGNvbWJpbmVMYXRlc3Qob2JzZXJ2YWJsZXMpLnBpcGUoXG4gICAgICAgIGNvbmZpZy5kZWJvdW5jZSA/IGRlYm91bmNlU3luYygpIDogKHNvdXJjZSQpID0+IHNvdXJjZSQsXG4gICAgICAgIG1hcCgocHJvamVjdG9yQXJncykgPT4gcHJvamVjdG9yKC4uLnByb2plY3RvckFyZ3MpKVxuICAgICAgKTtcbiAgICB9XG5cbiAgICByZXR1cm4gb2JzZXJ2YWJsZSQucGlwZShcbiAgICAgIGRpc3RpbmN0VW50aWxDaGFuZ2VkKCksXG4gICAgICBzaGFyZVJlcGxheSh7XG4gICAgICAgIHJlZkNvdW50OiB0cnVlLFxuICAgICAgICBidWZmZXJTaXplOiAxLFxuICAgICAgfSksXG4gICAgICB0YWtlVW50aWwodGhpcy5kZXN0cm95JClcbiAgICApO1xuICB9XG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgYW4gZWZmZWN0LlxuICAgKlxuICAgKiBUaGlzIGVmZmVjdCBpcyBzdWJzY3JpYmVkIHRvIGZvciB0aGUgbGlmZSBvZiB0aGUgQENvbXBvbmVudC5cbiAgICogQHBhcmFtIGdlbmVyYXRvciBBIGZ1bmN0aW9uIHRoYXQgdGFrZXMgYW4gb3JpZ2luIE9ic2VydmFibGUgaW5wdXQgYW5kXG4gICAqICAgICByZXR1cm5zIGFuIE9ic2VydmFibGUuIFRoZSBPYnNlcnZhYmxlIHRoYXQgaXMgcmV0dXJuZWQgd2lsbCBiZVxuICAgKiAgICAgc3Vic2NyaWJlZCB0byBmb3IgdGhlIGxpZmUgb2YgdGhlIGNvbXBvbmVudC5cbiAgICogQHJldHVybiBBIGZ1bmN0aW9uIHRoYXQsIHdoZW4gY2FsbGVkLCB3aWxsIHRyaWdnZXIgdGhlIG9yaWdpbiBPYnNlcnZhYmxlLlxuICAgKi9cbiAgZWZmZWN0PFxuICAgIC8vIFRoaXMgdHlwZSBxdWlja2x5IGJlY2FtZSBwYXJ0IG9mIGVmZmVjdCAnQVBJJ1xuICAgIFByb3ZpZGVkVHlwZSA9IHZvaWQsXG4gICAgLy8gVGhlIGFjdHVhbCBvcmlnaW4kIHR5cGUsIHdoaWNoIGNvdWxkIGJlIHVua25vd24sIHdoZW4gbm90IHNwZWNpZmllZFxuICAgIE9yaWdpblR5cGUgZXh0ZW5kc1xuICAgICAgfCBPYnNlcnZhYmxlPFByb3ZpZGVkVHlwZT5cbiAgICAgIHwgdW5rbm93biA9IE9ic2VydmFibGU8UHJvdmlkZWRUeXBlPixcbiAgICAvLyBVbndyYXBwZWQgYWN0dWFsIHR5cGUgb2YgdGhlIG9yaWdpbiQgT2JzZXJ2YWJsZSwgYWZ0ZXIgZGVmYXVsdCB3YXMgYXBwbGllZFxuICAgIE9ic2VydmFibGVUeXBlID0gT3JpZ2luVHlwZSBleHRlbmRzIE9ic2VydmFibGU8aW5mZXIgQT4gPyBBIDogbmV2ZXIsXG4gICAgLy8gUmV0dXJuIGVpdGhlciBhbiBlbXB0eSBjYWxsYmFjayBvciBhIGZ1bmN0aW9uIHJlcXVpcmluZyBzcGVjaWZpYyB0eXBlcyBhcyBpbnB1dHNcbiAgICBSZXR1cm5UeXBlID0gUHJvdmlkZWRUeXBlIHwgT2JzZXJ2YWJsZVR5cGUgZXh0ZW5kcyB2b2lkXG4gICAgICA/ICgpID0+IHZvaWRcbiAgICAgIDogKFxuICAgICAgICAgIG9ic2VydmFibGVPclZhbHVlOiBPYnNlcnZhYmxlVHlwZSB8IE9ic2VydmFibGU8T2JzZXJ2YWJsZVR5cGU+XG4gICAgICAgICkgPT4gU3Vic2NyaXB0aW9uXG4gID4oZ2VuZXJhdG9yOiAob3JpZ2luJDogT3JpZ2luVHlwZSkgPT4gT2JzZXJ2YWJsZTx1bmtub3duPik6IFJldHVyblR5cGUge1xuICAgIGNvbnN0IG9yaWdpbiQgPSBuZXcgU3ViamVjdDxPYnNlcnZhYmxlVHlwZT4oKTtcbiAgICBnZW5lcmF0b3Iob3JpZ2luJCBhcyBPcmlnaW5UeXBlKVxuICAgICAgLy8gdGllZCB0byB0aGUgbGlmZWN5Y2xlIPCfkYcgb2YgQ29tcG9uZW50U3RvcmVcbiAgICAgIC5waXBlKHRha2VVbnRpbCh0aGlzLmRlc3Ryb3kkKSlcbiAgICAgIC5zdWJzY3JpYmUoKTtcblxuICAgIHJldHVybiAoKChcbiAgICAgIG9ic2VydmFibGVPclZhbHVlPzogT2JzZXJ2YWJsZVR5cGUgfCBPYnNlcnZhYmxlPE9ic2VydmFibGVUeXBlPlxuICAgICk6IFN1YnNjcmlwdGlvbiA9PiB7XG4gICAgICBjb25zdCBvYnNlcnZhYmxlJCA9IGlzT2JzZXJ2YWJsZShvYnNlcnZhYmxlT3JWYWx1ZSlcbiAgICAgICAgPyBvYnNlcnZhYmxlT3JWYWx1ZVxuICAgICAgICA6IG9mKG9ic2VydmFibGVPclZhbHVlKTtcbiAgICAgIHJldHVybiBvYnNlcnZhYmxlJC5waXBlKHRha2VVbnRpbCh0aGlzLmRlc3Ryb3kkKSkuc3Vic2NyaWJlKCh2YWx1ZSkgPT4ge1xuICAgICAgICAvLyBhbnkgbmV3IPCfkYcgdmFsdWUgaXMgcHVzaGVkIGludG8gYSBzdHJlYW1cbiAgICAgICAgb3JpZ2luJC5uZXh0KHZhbHVlKTtcbiAgICAgIH0pO1xuICAgIH0pIGFzIHVua25vd24pIGFzIFJldHVyblR5cGU7XG4gIH1cbn1cblxuZnVuY3Rpb24gcHJvY2Vzc1NlbGVjdG9yQXJnczxcbiAgU2VsZWN0b3JzIGV4dGVuZHMgQXJyYXk8T2JzZXJ2YWJsZTx1bmtub3duPiB8IFNlbGVjdENvbmZpZyB8IFByb2plY3RvckZuPixcbiAgUmVzdWx0LFxuICBQcm9qZWN0b3JGbiA9ICguLi5hOiB1bmtub3duW10pID0+IFJlc3VsdFxuPihcbiAgYXJnczogU2VsZWN0b3JzXG4pOiB7XG4gIG9ic2VydmFibGVzOiBPYnNlcnZhYmxlPHVua25vd24+W107XG4gIHByb2plY3RvcjogUHJvamVjdG9yRm47XG4gIGNvbmZpZzogUmVxdWlyZWQ8U2VsZWN0Q29uZmlnPjtcbn0ge1xuICBjb25zdCBzZWxlY3RvckFyZ3MgPSBBcnJheS5mcm9tKGFyZ3MpO1xuICAvLyBBc3NpZ24gZGVmYXVsdCB2YWx1ZXMuXG4gIGxldCBjb25maWc6IFJlcXVpcmVkPFNlbGVjdENvbmZpZz4gPSB7IGRlYm91bmNlOiBmYWxzZSB9O1xuICBsZXQgcHJvamVjdG9yOiBQcm9qZWN0b3JGbjtcbiAgLy8gTGFzdCBhcmd1bWVudCBpcyBlaXRoZXIgcHJvamVjdG9yIG9yIGNvbmZpZ1xuICBjb25zdCBwcm9qZWN0b3JPckNvbmZpZyA9IHNlbGVjdG9yQXJncy5wb3AoKSBhcyBQcm9qZWN0b3JGbiB8IFNlbGVjdENvbmZpZztcblxuICBpZiAodHlwZW9mIHByb2plY3Rvck9yQ29uZmlnICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgLy8gV2UgZ290IHRoZSBjb25maWcgYXMgdGhlIGxhc3QgYXJndW1lbnQsIHJlcGxhY2UgYW55IGRlZmF1bHQgdmFsdWVzIHdpdGggaXQuXG4gICAgY29uZmlnID0geyAuLi5jb25maWcsIC4uLnByb2plY3Rvck9yQ29uZmlnIH07XG4gICAgLy8gUG9wIHRoZSBuZXh0IGFyZ3MsIHdoaWNoIHdvdWxkIGJlIHRoZSBwcm9qZWN0b3IgZm4uXG4gICAgcHJvamVjdG9yID0gc2VsZWN0b3JBcmdzLnBvcCgpIGFzIFByb2plY3RvckZuO1xuICB9IGVsc2Uge1xuICAgIHByb2plY3RvciA9IHByb2plY3Rvck9yQ29uZmlnO1xuICB9XG4gIC8vIFRoZSBPYnNlcnZhYmxlcyB0byBjb21iaW5lLCBpZiB0aGVyZSBhcmUgYW55LlxuICBjb25zdCBvYnNlcnZhYmxlcyA9IHNlbGVjdG9yQXJncyBhcyBPYnNlcnZhYmxlPHVua25vd24+W107XG4gIHJldHVybiB7XG4gICAgb2JzZXJ2YWJsZXMsXG4gICAgcHJvamVjdG9yLFxuICAgIGNvbmZpZyxcbiAgfTtcbn1cbiJdfQ==