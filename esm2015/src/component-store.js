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
     * @template V
     * @param {?} updaterFn A static updater function that takes 2 parameters (the
     * current state and an argument object) and returns a new instance of the
     * state.
     * @return {?} A function that accepts one argument which is forwarded as the
     *     second argument to `updaterFn`. Every time this function is called
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcG9uZW50LXN0b3JlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vbW9kdWxlcy9jb21wb25lbnQtc3RvcmUvc3JjL2NvbXBvbmVudC1zdG9yZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7OztBQUFBLE9BQU8sRUFDTCxZQUFZLEVBRVosRUFBRSxFQUNGLGFBQWEsRUFFYixVQUFVLEVBQ1YsYUFBYSxFQUNiLE9BQU8sRUFDUCxjQUFjLEVBQ2QsU0FBUyxHQUNWLE1BQU0sTUFBTSxDQUFDO0FBQ2QsT0FBTyxFQUNMLFNBQVMsRUFDVCxTQUFTLEVBQ1QsY0FBYyxFQUNkLEdBQUcsRUFDSCxvQkFBb0IsRUFDcEIsV0FBVyxFQUNYLElBQUksR0FDTCxNQUFNLGdCQUFnQixDQUFDO0FBQ3hCLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUMvQyxPQUFPLEVBQ0wsVUFBVSxFQUVWLFFBQVEsRUFDUixjQUFjLEVBQ2QsTUFBTSxHQUNQLE1BQU0sZUFBZSxDQUFDOzs7O0FBRXZCLGtDQUVDOzs7SUFEQyxnQ0FBbUI7OztBQUdyQixNQUFNLE9BQU8saUJBQWlCLEdBQUcsSUFBSSxjQUFjLENBQUMsMEJBQTBCLENBQUM7Ozs7QUFHL0UsTUFBTSxPQUFPLGNBQWM7Ozs7SUFjekIsWUFBbUQsWUFBZ0I7O1FBWmxELG9CQUFlLEdBQUcsSUFBSSxhQUFhLENBQU8sQ0FBQyxDQUFDLENBQUM7O1FBRXJELGFBQVEsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLFlBQVksRUFBRSxDQUFDO1FBRXZDLGtCQUFhLEdBQUcsSUFBSSxhQUFhLENBQUksQ0FBQyxDQUFDLENBQUM7UUFDakQsa0JBQWEsR0FBRyxLQUFLLENBQUM7UUFDdEIsK0JBQTBCLEdBQ2hDLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLGlDQUFpQztZQUN6RCw2REFBNkQsQ0FBQzs7UUFFdkQsV0FBTSxHQUFrQixJQUFJLENBQUMsTUFB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QW1PekQsU0FBUyxtQkFBbUIsQ0FLMUIsSUFBTzs7VUFNRCxZQUFZLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUM7OztRQUVqQyxNQUFNLEdBQTJCLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRTs7UUFDcEQsU0FBc0I7OztVQUVwQixpQkFBaUIsR0FBRyxtQkFBQSxZQUFZLENBQUMsR0FBRyxFQUFFLEVBQThCO0lBRTFFLElBQUksT0FBTyxpQkFBaUIsS0FBSyxVQUFVLEVBQUU7UUFDM0MsOEVBQThFO1FBQzlFLE1BQU0sbUNBQVEsTUFBTSxHQUFLLGlCQUFpQixDQUFFLENBQUM7UUFDN0Msc0RBQXNEO1FBQ3RELFNBQVMsR0FBRyxtQkFBQSxZQUFZLENBQUMsR0FBRyxFQUFFLEVBQWUsQ0FBQztLQUMvQztTQUFNO1FBQ0wsU0FBUyxHQUFHLGlCQUFpQixDQUFDO0tBQy9COzs7VUFFSyxXQUFXLEdBQUcsbUJBQUEsWUFBWSxFQUF5QjtJQUN6RCxPQUFPO1FBQ0wsV0FBVztRQUNYLFNBQVM7UUFDVCxNQUFNO0tBQ1AsQ0FBQztBQUNKLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge1xuICBpc09ic2VydmFibGUsXG4gIE9ic2VydmFibGUsXG4gIG9mLFxuICBSZXBsYXlTdWJqZWN0LFxuICBTdWJzY3JpcHRpb24sXG4gIHRocm93RXJyb3IsXG4gIGNvbWJpbmVMYXRlc3QsXG4gIFN1YmplY3QsXG4gIHF1ZXVlU2NoZWR1bGVyLFxuICBzY2hlZHVsZWQsXG59IGZyb20gJ3J4anMnO1xuaW1wb3J0IHtcbiAgY29uY2F0TWFwLFxuICB0YWtlVW50aWwsXG4gIHdpdGhMYXRlc3RGcm9tLFxuICBtYXAsXG4gIGRpc3RpbmN0VW50aWxDaGFuZ2VkLFxuICBzaGFyZVJlcGxheSxcbiAgdGFrZSxcbn0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0IHsgZGVib3VuY2VTeW5jIH0gZnJvbSAnLi9kZWJvdW5jZS1zeW5jJztcbmltcG9ydCB7XG4gIEluamVjdGFibGUsXG4gIE9uRGVzdHJveSxcbiAgT3B0aW9uYWwsXG4gIEluamVjdGlvblRva2VuLFxuICBJbmplY3QsXG59IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuXG5leHBvcnQgaW50ZXJmYWNlIFNlbGVjdENvbmZpZyB7XG4gIGRlYm91bmNlPzogYm9vbGVhbjtcbn1cblxuZXhwb3J0IGNvbnN0IGluaXRpYWxTdGF0ZVRva2VuID0gbmV3IEluamVjdGlvblRva2VuKCdDb21wb25lbnRTdG9yZSBJbml0U3RhdGUnKTtcblxuQEluamVjdGFibGUoKVxuZXhwb3J0IGNsYXNzIENvbXBvbmVudFN0b3JlPFQgZXh0ZW5kcyBvYmplY3Q+IGltcGxlbWVudHMgT25EZXN0cm95IHtcbiAgLy8gU2hvdWxkIGJlIHVzZWQgb25seSBpbiBuZ09uRGVzdHJveS5cbiAgcHJpdmF0ZSByZWFkb25seSBkZXN0cm95U3ViamVjdCQgPSBuZXcgUmVwbGF5U3ViamVjdDx2b2lkPigxKTtcbiAgLy8gRXhwb3NlZCB0byBhbnkgZXh0ZW5kaW5nIFN0b3JlIHRvIGJlIHVzZWQgZm9yIHRoZSB0ZWFyZG93bi5cbiAgcmVhZG9ubHkgZGVzdHJveSQgPSB0aGlzLmRlc3Ryb3lTdWJqZWN0JC5hc09ic2VydmFibGUoKTtcblxuICBwcml2YXRlIHJlYWRvbmx5IHN0YXRlU3ViamVjdCQgPSBuZXcgUmVwbGF5U3ViamVjdDxUPigxKTtcbiAgcHJpdmF0ZSBpc0luaXRpYWxpemVkID0gZmFsc2U7XG4gIHByaXZhdGUgbm90SW5pdGlhbGl6ZWRFcnJvck1lc3NhZ2UgPVxuICAgIGAke3RoaXMuY29uc3RydWN0b3IubmFtZX0gaGFzIG5vdCBiZWVuIGluaXRpYWxpemVkIHlldC4gYCArXG4gICAgYFBsZWFzZSBtYWtlIHN1cmUgaXQgaXMgaW5pdGlhbGl6ZWQgYmVmb3JlIHVwZGF0aW5nL2dldHRpbmcuYDtcbiAgLy8gTmVlZHMgdG8gYmUgYWZ0ZXIgZGVzdHJveSQgaXMgZGVjbGFyZWQgYmVjYXVzZSBpdCdzIHVzZWQgaW4gc2VsZWN0LlxuICByZWFkb25seSBzdGF0ZSQ6IE9ic2VydmFibGU8VD4gPSB0aGlzLnNlbGVjdCgocykgPT4gcyk7XG5cbiAgY29uc3RydWN0b3IoQE9wdGlvbmFsKCkgQEluamVjdChpbml0aWFsU3RhdGVUb2tlbikgZGVmYXVsdFN0YXRlPzogVCkge1xuICAgIC8vIFN0YXRlIGNhbiBiZSBpbml0aWFsaXplZCBlaXRoZXIgdGhyb3VnaCBjb25zdHJ1Y3RvciBvciBzZXRTdGF0ZS5cbiAgICBpZiAoZGVmYXVsdFN0YXRlKSB7XG4gICAgICB0aGlzLmluaXRTdGF0ZShkZWZhdWx0U3RhdGUpO1xuICAgIH1cbiAgfVxuXG4gIC8qKiBDb21wbGV0ZXMgYWxsIHJlbGV2YW50IE9ic2VydmFibGUgc3RyZWFtcy4gKi9cbiAgbmdPbkRlc3Ryb3koKSB7XG4gICAgdGhpcy5zdGF0ZVN1YmplY3QkLmNvbXBsZXRlKCk7XG4gICAgdGhpcy5kZXN0cm95U3ViamVjdCQubmV4dCgpO1xuICB9XG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgYW4gdXBkYXRlci5cbiAgICpcbiAgICogVGhyb3dzIGFuIGVycm9yIGlmIHVwZGF0ZXIgaXMgY2FsbGVkIHdpdGggc3luY2hyb25vdXMgdmFsdWVzIChlaXRoZXJcbiAgICogaW1wZXJhdGl2ZSB2YWx1ZSBvciBPYnNlcnZhYmxlIHRoYXQgaXMgc3luY2hyb25vdXMpIGJlZm9yZSBDb21wb25lbnRTdG9yZVxuICAgKiBpcyBpbml0aWFsaXplZC4gSWYgY2FsbGVkIHdpdGggYXN5bmMgT2JzZXJ2YWJsZSBiZWZvcmUgaW5pdGlhbGl6YXRpb24gdGhlblxuICAgKiBzdGF0ZSB3aWxsIG5vdCBiZSB1cGRhdGVkIGFuZCBzdWJzY3JpcHRpb24gd291bGQgYmUgY2xvc2VkLlxuICAgKlxuICAgKiBAcGFyYW0gdXBkYXRlckZuIEEgc3RhdGljIHVwZGF0ZXIgZnVuY3Rpb24gdGhhdCB0YWtlcyAyIHBhcmFtZXRlcnMgKHRoZVxuICAgKiBjdXJyZW50IHN0YXRlIGFuZCBhbiBhcmd1bWVudCBvYmplY3QpIGFuZCByZXR1cm5zIGEgbmV3IGluc3RhbmNlIG9mIHRoZVxuICAgKiBzdGF0ZS5cbiAgICogQHJldHVybiBBIGZ1bmN0aW9uIHRoYXQgYWNjZXB0cyBvbmUgYXJndW1lbnQgd2hpY2ggaXMgZm9yd2FyZGVkIGFzIHRoZVxuICAgKiAgICAgc2Vjb25kIGFyZ3VtZW50IHRvIGB1cGRhdGVyRm5gLiBFdmVyeSB0aW1lIHRoaXMgZnVuY3Rpb24gaXMgY2FsbGVkXG4gICAqICAgICBzdWJzY3JpYmVycyB3aWxsIGJlIG5vdGlmaWVkIG9mIHRoZSBzdGF0ZSBjaGFuZ2UuXG4gICAqL1xuICB1cGRhdGVyPFY+KFxuICAgIHVwZGF0ZXJGbjogKHN0YXRlOiBULCB2YWx1ZTogVikgPT4gVFxuICApOiB1bmtub3duIGV4dGVuZHMgViA/ICgpID0+IHZvaWQgOiAodDogViB8IE9ic2VydmFibGU8Vj4pID0+IFN1YnNjcmlwdGlvbiB7XG4gICAgcmV0dXJuICgob2JzZXJ2YWJsZU9yVmFsdWU/OiBWIHwgT2JzZXJ2YWJsZTxWPik6IFN1YnNjcmlwdGlvbiA9PiB7XG4gICAgICBsZXQgaW5pdGlhbGl6YXRpb25FcnJvcjogRXJyb3IgfCB1bmRlZmluZWQ7XG4gICAgICAvLyBXZSBjYW4gcmVjZWl2ZSBlaXRoZXIgdGhlIHZhbHVlIG9yIGFuIG9ic2VydmFibGUuIEluIGNhc2UgaXQncyBhXG4gICAgICAvLyBzaW1wbGUgdmFsdWUsIHdlJ2xsIHdyYXAgaXQgd2l0aCBgb2ZgIG9wZXJhdG9yIHRvIHR1cm4gaXQgaW50b1xuICAgICAgLy8gT2JzZXJ2YWJsZS5cbiAgICAgIGNvbnN0IG9ic2VydmFibGUkID0gaXNPYnNlcnZhYmxlKG9ic2VydmFibGVPclZhbHVlKVxuICAgICAgICA/IG9ic2VydmFibGVPclZhbHVlXG4gICAgICAgIDogb2Yob2JzZXJ2YWJsZU9yVmFsdWUpO1xuICAgICAgY29uc3Qgc3Vic2NyaXB0aW9uID0gb2JzZXJ2YWJsZSRcbiAgICAgICAgLnBpcGUoXG4gICAgICAgICAgY29uY2F0TWFwKCh2YWx1ZSkgPT5cbiAgICAgICAgICAgIHRoaXMuaXNJbml0aWFsaXplZFxuICAgICAgICAgICAgICA/IC8vIFB1c2ggdGhlIHZhbHVlIGludG8gcXVldWVTY2hlZHVsZXJcbiAgICAgICAgICAgICAgICBzY2hlZHVsZWQoW3ZhbHVlXSwgcXVldWVTY2hlZHVsZXIpLnBpcGUoXG4gICAgICAgICAgICAgICAgICB3aXRoTGF0ZXN0RnJvbSh0aGlzLnN0YXRlU3ViamVjdCQpXG4gICAgICAgICAgICAgICAgKVxuICAgICAgICAgICAgICA6IC8vIElmIHN0YXRlIHdhcyBub3QgaW5pdGlhbGl6ZWQsIHdlJ2xsIHRocm93IGFuIGVycm9yLlxuICAgICAgICAgICAgICAgIHRocm93RXJyb3IobmV3IEVycm9yKHRoaXMubm90SW5pdGlhbGl6ZWRFcnJvck1lc3NhZ2UpKVxuICAgICAgICAgICksXG4gICAgICAgICAgdGFrZVVudGlsKHRoaXMuZGVzdHJveSQpXG4gICAgICAgIClcbiAgICAgICAgLnN1YnNjcmliZSh7XG4gICAgICAgICAgbmV4dDogKFt2YWx1ZSwgY3VycmVudFN0YXRlXSkgPT4ge1xuICAgICAgICAgICAgdGhpcy5zdGF0ZVN1YmplY3QkLm5leHQodXBkYXRlckZuKGN1cnJlbnRTdGF0ZSwgdmFsdWUhKSk7XG4gICAgICAgICAgfSxcbiAgICAgICAgICBlcnJvcjogKGVycm9yOiBFcnJvcikgPT4ge1xuICAgICAgICAgICAgaW5pdGlhbGl6YXRpb25FcnJvciA9IGVycm9yO1xuICAgICAgICAgICAgdGhpcy5zdGF0ZVN1YmplY3QkLmVycm9yKGVycm9yKTtcbiAgICAgICAgICB9LFxuICAgICAgICB9KTtcblxuICAgICAgaWYgKGluaXRpYWxpemF0aW9uRXJyb3IpIHtcbiAgICAgICAgLy8gcHJldHRpZXItaWdub3JlXG4gICAgICAgIHRocm93IC8qKiBAdHlwZSB7IUVycm9yfSAqLyAoaW5pdGlhbGl6YXRpb25FcnJvcik7XG4gICAgICB9XG4gICAgICByZXR1cm4gc3Vic2NyaXB0aW9uO1xuICAgIH0pIGFzIHVua25vd24gZXh0ZW5kcyBWXG4gICAgICA/ICgpID0+IHZvaWRcbiAgICAgIDogKHQ6IFYgfCBPYnNlcnZhYmxlPFY+KSA9PiBTdWJzY3JpcHRpb247XG4gIH1cblxuICAvKipcbiAgICogSW5pdGlhbGl6ZXMgc3RhdGUuIElmIGl0IHdhcyBhbHJlYWR5IGluaXRpYWxpemVkIHRoZW4gaXQgcmVzZXRzIHRoZVxuICAgKiBzdGF0ZS5cbiAgICovXG4gIHByaXZhdGUgaW5pdFN0YXRlKHN0YXRlOiBUKTogdm9pZCB7XG4gICAgc2NoZWR1bGVkKFtzdGF0ZV0sIHF1ZXVlU2NoZWR1bGVyKS5zdWJzY3JpYmUoKHMpID0+IHtcbiAgICAgIHRoaXMuaXNJbml0aWFsaXplZCA9IHRydWU7XG4gICAgICB0aGlzLnN0YXRlU3ViamVjdCQubmV4dChzKTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBTZXRzIHRoZSBzdGF0ZSBzcGVjaWZpYyB2YWx1ZS5cbiAgICogQHBhcmFtIHN0YXRlT3JVcGRhdGVyRm4gb2JqZWN0IG9mIHRoZSBzYW1lIHR5cGUgYXMgdGhlIHN0YXRlIG9yIGFuXG4gICAqIHVwZGF0ZXJGbiwgcmV0dXJuaW5nIHN1Y2ggb2JqZWN0LlxuICAgKi9cbiAgc2V0U3RhdGUoc3RhdGVPclVwZGF0ZXJGbjogVCB8ICgoc3RhdGU6IFQpID0+IFQpKTogdm9pZCB7XG4gICAgaWYgKHR5cGVvZiBzdGF0ZU9yVXBkYXRlckZuICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICB0aGlzLmluaXRTdGF0ZShzdGF0ZU9yVXBkYXRlckZuKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy51cGRhdGVyKHN0YXRlT3JVcGRhdGVyRm4gYXMgKHN0YXRlOiBUKSA9PiBUKSgpO1xuICAgIH1cbiAgfVxuXG4gIHByb3RlY3RlZCBnZXQoKTogVDtcbiAgcHJvdGVjdGVkIGdldDxSPihwcm9qZWN0b3I6IChzOiBUKSA9PiBSKTogUjtcbiAgcHJvdGVjdGVkIGdldDxSPihwcm9qZWN0b3I/OiAoczogVCkgPT4gUik6IFIgfCBUIHtcbiAgICBpZiAoIXRoaXMuaXNJbml0aWFsaXplZCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKHRoaXMubm90SW5pdGlhbGl6ZWRFcnJvck1lc3NhZ2UpO1xuICAgIH1cbiAgICBsZXQgdmFsdWU6IFIgfCBUO1xuXG4gICAgdGhpcy5zdGF0ZVN1YmplY3QkLnBpcGUodGFrZSgxKSkuc3Vic2NyaWJlKChzdGF0ZSkgPT4ge1xuICAgICAgdmFsdWUgPSBwcm9qZWN0b3IgPyBwcm9qZWN0b3Ioc3RhdGUpIDogc3RhdGU7XG4gICAgfSk7XG4gICAgcmV0dXJuIHZhbHVlITtcbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgc2VsZWN0b3IuXG4gICAqXG4gICAqIFRoaXMgc3VwcG9ydHMgY29tYmluaW5nIHVwIHRvIDQgc2VsZWN0b3JzLiBNb3JlIGNvdWxkIGJlIGFkZGVkIGFzIG5lZWRlZC5cbiAgICpcbiAgICogQHBhcmFtIHByb2plY3RvciBBIHB1cmUgcHJvamVjdGlvbiBmdW5jdGlvbiB0aGF0IHRha2VzIHRoZSBjdXJyZW50IHN0YXRlIGFuZFxuICAgKiAgIHJldHVybnMgc29tZSBuZXcgc2xpY2UvcHJvamVjdGlvbiBvZiB0aGF0IHN0YXRlLlxuICAgKiBAcGFyYW0gY29uZmlnIFNlbGVjdENvbmZpZyB0aGF0IGNoYW5nZXMgdGhlIGJlaGF2aW9yIG9mIHNlbGVjdG9yLCBpbmNsdWRpbmdcbiAgICogICB0aGUgZGVib3VuY2luZyBvZiB0aGUgdmFsdWVzIHVudGlsIHRoZSBzdGF0ZSBpcyBzZXR0bGVkLlxuICAgKiBAcmV0dXJuIEFuIG9ic2VydmFibGUgb2YgdGhlIHByb2plY3RvciByZXN1bHRzLlxuICAgKi9cbiAgc2VsZWN0PFI+KHByb2plY3RvcjogKHM6IFQpID0+IFIsIGNvbmZpZz86IFNlbGVjdENvbmZpZyk6IE9ic2VydmFibGU8Uj47XG4gIHNlbGVjdDxSLCBTMT4oXG4gICAgczE6IE9ic2VydmFibGU8UzE+LFxuICAgIHByb2plY3RvcjogKHMxOiBTMSkgPT4gUixcbiAgICBjb25maWc/OiBTZWxlY3RDb25maWdcbiAgKTogT2JzZXJ2YWJsZTxSPjtcbiAgc2VsZWN0PFIsIFMxLCBTMj4oXG4gICAgczE6IE9ic2VydmFibGU8UzE+LFxuICAgIHMyOiBPYnNlcnZhYmxlPFMyPixcbiAgICBwcm9qZWN0b3I6IChzMTogUzEsIHMyOiBTMikgPT4gUixcbiAgICBjb25maWc/OiBTZWxlY3RDb25maWdcbiAgKTogT2JzZXJ2YWJsZTxSPjtcbiAgc2VsZWN0PFIsIFMxLCBTMiwgUzM+KFxuICAgIHMxOiBPYnNlcnZhYmxlPFMxPixcbiAgICBzMjogT2JzZXJ2YWJsZTxTMj4sXG4gICAgczM6IE9ic2VydmFibGU8UzM+LFxuICAgIHByb2plY3RvcjogKHMxOiBTMSwgczI6IFMyLCBzMzogUzMpID0+IFIsXG4gICAgY29uZmlnPzogU2VsZWN0Q29uZmlnXG4gICk6IE9ic2VydmFibGU8Uj47XG4gIHNlbGVjdDxSLCBTMSwgUzIsIFMzLCBTND4oXG4gICAgczE6IE9ic2VydmFibGU8UzE+LFxuICAgIHMyOiBPYnNlcnZhYmxlPFMyPixcbiAgICBzMzogT2JzZXJ2YWJsZTxTMz4sXG4gICAgczQ6IE9ic2VydmFibGU8UzQ+LFxuICAgIHByb2plY3RvcjogKHMxOiBTMSwgczI6IFMyLCBzMzogUzMsIHM0OiBTNCkgPT4gUixcbiAgICBjb25maWc/OiBTZWxlY3RDb25maWdcbiAgKTogT2JzZXJ2YWJsZTxSPjtcbiAgc2VsZWN0PFxuICAgIE8gZXh0ZW5kcyBBcnJheTxPYnNlcnZhYmxlPHVua25vd24+IHwgU2VsZWN0Q29uZmlnIHwgUHJvamVjdG9yRm4+LFxuICAgIFIsXG4gICAgUHJvamVjdG9yRm4gPSAoLi4uYTogdW5rbm93bltdKSA9PiBSXG4gID4oLi4uYXJnczogTyk6IE9ic2VydmFibGU8Uj4ge1xuICAgIGNvbnN0IHsgb2JzZXJ2YWJsZXMsIHByb2plY3RvciwgY29uZmlnIH0gPSBwcm9jZXNzU2VsZWN0b3JBcmdzKGFyZ3MpO1xuXG4gICAgbGV0IG9ic2VydmFibGUkOiBPYnNlcnZhYmxlPHVua25vd24+O1xuICAgIC8vIElmIHRoZXJlIGFyZSBubyBPYnNlcnZhYmxlcyB0byBjb21iaW5lLCB0aGVuIHdlJ2xsIGp1c3QgbWFwIHRoZSB2YWx1ZS5cbiAgICBpZiAob2JzZXJ2YWJsZXMubGVuZ3RoID09PSAwKSB7XG4gICAgICBvYnNlcnZhYmxlJCA9IHRoaXMuc3RhdGVTdWJqZWN0JC5waXBlKFxuICAgICAgICBjb25maWcuZGVib3VuY2UgPyBkZWJvdW5jZVN5bmMoKSA6IChzb3VyY2UkKSA9PiBzb3VyY2UkLFxuICAgICAgICBtYXAocHJvamVjdG9yKVxuICAgICAgKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gSWYgdGhlcmUgYXJlIG11bHRpcGxlIGFyZ3VtZW50cywgdGhlbiB3ZSdyZSBhZ2dyZWdhdGluZyBzZWxlY3RvcnMsIHNvIHdlIG5lZWRcbiAgICAgIC8vIHRvIHRha2UgdGhlIGNvbWJpbmVMYXRlc3Qgb2YgdGhlbSBiZWZvcmUgY2FsbGluZyB0aGUgbWFwIGZ1bmN0aW9uLlxuICAgICAgb2JzZXJ2YWJsZSQgPSBjb21iaW5lTGF0ZXN0KG9ic2VydmFibGVzKS5waXBlKFxuICAgICAgICBjb25maWcuZGVib3VuY2UgPyBkZWJvdW5jZVN5bmMoKSA6IChzb3VyY2UkKSA9PiBzb3VyY2UkLFxuICAgICAgICBtYXAoKHByb2plY3RvckFyZ3MpID0+IHByb2plY3RvciguLi5wcm9qZWN0b3JBcmdzKSlcbiAgICAgICk7XG4gICAgfVxuICAgIHJldHVybiAob2JzZXJ2YWJsZSQgYXMgT2JzZXJ2YWJsZTxSPikucGlwZShcbiAgICAgIGRpc3RpbmN0VW50aWxDaGFuZ2VkKCksXG4gICAgICBzaGFyZVJlcGxheSh7XG4gICAgICAgIHJlZkNvdW50OiB0cnVlLFxuICAgICAgICBidWZmZXJTaXplOiAxLFxuICAgICAgfSksXG4gICAgICB0YWtlVW50aWwodGhpcy5kZXN0cm95JClcbiAgICApO1xuICB9XG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgYW4gZWZmZWN0LlxuICAgKlxuICAgKiBUaGlzIGVmZmVjdCBpcyBzdWJzY3JpYmVkIHRvIGZvciB0aGUgbGlmZSBvZiB0aGUgQENvbXBvbmVudC5cbiAgICogQHBhcmFtIGdlbmVyYXRvciBBIGZ1bmN0aW9uIHRoYXQgdGFrZXMgYW4gb3JpZ2luIE9ic2VydmFibGUgaW5wdXQgYW5kXG4gICAqICAgICByZXR1cm5zIGFuIE9ic2VydmFibGUuIFRoZSBPYnNlcnZhYmxlIHRoYXQgaXMgcmV0dXJuZWQgd2lsbCBiZVxuICAgKiAgICAgc3Vic2NyaWJlZCB0byBmb3IgdGhlIGxpZmUgb2YgdGhlIGNvbXBvbmVudC5cbiAgICogQHJldHVybiBBIGZ1bmN0aW9uIHRoYXQsIHdoZW4gY2FsbGVkLCB3aWxsIHRyaWdnZXIgdGhlIG9yaWdpbiBPYnNlcnZhYmxlLlxuICAgKi9cbiAgZWZmZWN0PFxuICAgIC8vIFRoaXMgdHlwZSBxdWlja2x5IGJlY2FtZSBwYXJ0IG9mIGVmZmVjdCAnQVBJJ1xuICAgIFByb3ZpZGVkVHlwZSA9IHZvaWQsXG4gICAgLy8gVGhlIGFjdHVhbCBvcmlnaW4kIHR5cGUsIHdoaWNoIGNvdWxkIGJlIHVua25vd24sIHdoZW4gbm90IHNwZWNpZmllZFxuICAgIE9yaWdpblR5cGUgZXh0ZW5kcyBPYnNlcnZhYmxlPFByb3ZpZGVkVHlwZT4gfCB1bmtub3duID0gT2JzZXJ2YWJsZTxcbiAgICAgIFByb3ZpZGVkVHlwZVxuICAgID4sXG4gICAgLy8gVW53cmFwcGVkIGFjdHVhbCB0eXBlIG9mIHRoZSBvcmlnaW4kIE9ic2VydmFibGUsIGFmdGVyIGRlZmF1bHQgd2FzIGFwcGxpZWRcbiAgICBPYnNlcnZhYmxlVHlwZSA9IE9yaWdpblR5cGUgZXh0ZW5kcyBPYnNlcnZhYmxlPGluZmVyIEE+ID8gQSA6IG5ldmVyLFxuICAgIC8vIFJldHVybiBlaXRoZXIgYW4gZW1wdHkgY2FsbGJhY2sgb3IgYSBmdW5jdGlvbiByZXF1aXJpbmcgc3BlY2lmaWMgdHlwZXMgYXMgaW5wdXRzXG4gICAgUmV0dXJuVHlwZSA9IFByb3ZpZGVkVHlwZSB8IE9ic2VydmFibGVUeXBlIGV4dGVuZHMgdm9pZFxuICAgICAgPyAoKSA9PiB2b2lkXG4gICAgICA6IChcbiAgICAgICAgICBvYnNlcnZhYmxlT3JWYWx1ZTogT2JzZXJ2YWJsZVR5cGUgfCBPYnNlcnZhYmxlPE9ic2VydmFibGVUeXBlPlxuICAgICAgICApID0+IFN1YnNjcmlwdGlvblxuICA+KGdlbmVyYXRvcjogKG9yaWdpbiQ6IE9yaWdpblR5cGUpID0+IE9ic2VydmFibGU8dW5rbm93bj4pOiBSZXR1cm5UeXBlIHtcbiAgICBjb25zdCBvcmlnaW4kID0gbmV3IFN1YmplY3Q8T2JzZXJ2YWJsZVR5cGU+KCk7XG4gICAgZ2VuZXJhdG9yKG9yaWdpbiQgYXMgT3JpZ2luVHlwZSlcbiAgICAgIC8vIHRpZWQgdG8gdGhlIGxpZmVjeWNsZSDwn5GHIG9mIENvbXBvbmVudFN0b3JlXG4gICAgICAucGlwZSh0YWtlVW50aWwodGhpcy5kZXN0cm95JCkpXG4gICAgICAuc3Vic2NyaWJlKCk7XG5cbiAgICByZXR1cm4gKCgoXG4gICAgICBvYnNlcnZhYmxlT3JWYWx1ZT86IE9ic2VydmFibGVUeXBlIHwgT2JzZXJ2YWJsZTxPYnNlcnZhYmxlVHlwZT5cbiAgICApOiBTdWJzY3JpcHRpb24gPT4ge1xuICAgICAgY29uc3Qgb2JzZXJ2YWJsZSQgPSBpc09ic2VydmFibGUob2JzZXJ2YWJsZU9yVmFsdWUpXG4gICAgICAgID8gb2JzZXJ2YWJsZU9yVmFsdWVcbiAgICAgICAgOiBvZihvYnNlcnZhYmxlT3JWYWx1ZSk7XG4gICAgICByZXR1cm4gb2JzZXJ2YWJsZSQucGlwZSh0YWtlVW50aWwodGhpcy5kZXN0cm95JCkpLnN1YnNjcmliZSgodmFsdWUpID0+IHtcbiAgICAgICAgLy8gYW55IG5ldyDwn5GHIHZhbHVlIGlzIHB1c2hlZCBpbnRvIGEgc3RyZWFtXG4gICAgICAgIG9yaWdpbiQubmV4dCh2YWx1ZSk7XG4gICAgICB9KTtcbiAgICB9KSBhcyB1bmtub3duKSBhcyBSZXR1cm5UeXBlO1xuICB9XG59XG5cbmZ1bmN0aW9uIHByb2Nlc3NTZWxlY3RvckFyZ3M8XG4gIE8gZXh0ZW5kcyBBcnJheTxPYnNlcnZhYmxlPHVua25vd24+IHwgU2VsZWN0Q29uZmlnIHwgUHJvamVjdG9yRm4+LFxuICBSLFxuICBQcm9qZWN0b3JGbiA9ICguLi5hOiB1bmtub3duW10pID0+IFJcbj4oXG4gIGFyZ3M6IE9cbik6IHtcbiAgb2JzZXJ2YWJsZXM6IE9ic2VydmFibGU8dW5rbm93bj5bXTtcbiAgcHJvamVjdG9yOiBQcm9qZWN0b3JGbjtcbiAgY29uZmlnOiBSZXF1aXJlZDxTZWxlY3RDb25maWc+O1xufSB7XG4gIGNvbnN0IHNlbGVjdG9yQXJncyA9IEFycmF5LmZyb20oYXJncyk7XG4gIC8vIEFzc2lnbiBkZWZhdWx0IHZhbHVlcy5cbiAgbGV0IGNvbmZpZzogUmVxdWlyZWQ8U2VsZWN0Q29uZmlnPiA9IHsgZGVib3VuY2U6IGZhbHNlIH07XG4gIGxldCBwcm9qZWN0b3I6IFByb2plY3RvckZuO1xuICAvLyBMYXN0IGFyZ3VtZW50IGlzIGVpdGhlciBwcm9qZWN0b3Igb3IgY29uZmlnXG4gIGNvbnN0IHByb2plY3Rvck9yQ29uZmlnID0gc2VsZWN0b3JBcmdzLnBvcCgpIGFzIFByb2plY3RvckZuIHwgU2VsZWN0Q29uZmlnO1xuXG4gIGlmICh0eXBlb2YgcHJvamVjdG9yT3JDb25maWcgIT09ICdmdW5jdGlvbicpIHtcbiAgICAvLyBXZSBnb3QgdGhlIGNvbmZpZyBhcyB0aGUgbGFzdCBhcmd1bWVudCwgcmVwbGFjZSBhbnkgZGVmYXVsdCB2YWx1ZXMgd2l0aCBpdC5cbiAgICBjb25maWcgPSB7IC4uLmNvbmZpZywgLi4ucHJvamVjdG9yT3JDb25maWcgfTtcbiAgICAvLyBQb3AgdGhlIG5leHQgYXJncywgd2hpY2ggd291bGQgYmUgdGhlIHByb2plY3RvciBmbi5cbiAgICBwcm9qZWN0b3IgPSBzZWxlY3RvckFyZ3MucG9wKCkgYXMgUHJvamVjdG9yRm47XG4gIH0gZWxzZSB7XG4gICAgcHJvamVjdG9yID0gcHJvamVjdG9yT3JDb25maWc7XG4gIH1cbiAgLy8gVGhlIE9ic2VydmFibGVzIHRvIGNvbWJpbmUsIGlmIHRoZXJlIGFyZSBhbnkuXG4gIGNvbnN0IG9ic2VydmFibGVzID0gc2VsZWN0b3JBcmdzIGFzIE9ic2VydmFibGU8dW5rbm93bj5bXTtcbiAgcmV0dXJuIHtcbiAgICBvYnNlcnZhYmxlcyxcbiAgICBwcm9qZWN0b3IsXG4gICAgY29uZmlnLFxuICB9O1xufVxuIl19