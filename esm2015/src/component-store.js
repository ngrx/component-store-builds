import { isObservable, of, ReplaySubject, throwError, combineLatest, Subject, queueScheduler, scheduled, } from 'rxjs';
import { concatMap, takeUntil, withLatestFrom, map, distinctUntilChanged, shareReplay, take, } from 'rxjs/operators';
import { debounceSync } from './debounce-sync';
import { Injectable, Optional, InjectionToken, Inject, } from '@angular/core';
export const INITIAL_STATE_TOKEN = new InjectionToken('@ngrx/component-store Initial State');
export class ComponentStore {
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
        this.state$ = this.select((s) => s);
        // State can be initialized either through constructor or setState.
        if (defaultState) {
            this.initState(defaultState);
        }
    }
    /** Completes all relevant Observable streams. */
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
     * @param updaterFn A static updater function that takes 2 parameters (the
     * current state and an argument object) and returns a new instance of the
     * state.
     * @return A function that accepts one argument which is forwarded as the
     *     second argument to `updaterFn`. Every time this function is called
     *     subscribers will be notified of the state change.
     */
    updater(updaterFn) {
        return ((observableOrValue) => {
            let initializationError;
            // We can receive either the value or an observable. In case it's a
            // simple value, we'll wrap it with `of` operator to turn it into
            // Observable.
            const observable$ = isObservable(observableOrValue)
                ? observableOrValue
                : of(observableOrValue);
            const subscription = observable$
                .pipe(concatMap((value) => this.isInitialized
                ? // Push the value into queueScheduler
                    scheduled([value], queueScheduler).pipe(withLatestFrom(this.stateSubject$))
                : // If state was not initialized, we'll throw an error.
                    throwError(new Error(this.notInitializedErrorMessage))), takeUntil(this.destroy$))
                .subscribe({
                next: ([value, currentState]) => {
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    this.stateSubject$.next(updaterFn(currentState, value));
                },
                error: (error) => {
                    initializationError = error;
                    this.stateSubject$.error(error);
                },
            });
            if (initializationError) {
                // prettier-ignore
                throw /** @type {!Error} */ (initializationError);
            }
            return subscription;
        });
    }
    /**
     * Initializes state. If it was already initialized then it resets the
     * state.
     */
    initState(state) {
        scheduled([state], queueScheduler).subscribe((s) => {
            this.isInitialized = true;
            this.stateSubject$.next(s);
        });
    }
    /**
     * Sets the state specific value.
     * @param stateOrUpdaterFn object of the same type as the state or an
     * updaterFn, returning such object.
     */
    setState(stateOrUpdaterFn) {
        if (typeof stateOrUpdaterFn !== 'function') {
            this.initState(stateOrUpdaterFn);
        }
        else {
            this.updater(stateOrUpdaterFn)();
        }
    }
    /**
     * Patches the state with provided partial state.
     *
     * @param partialStateOrUpdaterFn a partial state or a partial updater
     * function that accepts the state and returns the partial state.
     * @throws Error if the state is not initialized.
     */
    patchState(partialStateOrUpdaterFn) {
        const patchedState = typeof partialStateOrUpdaterFn === 'function'
            ? partialStateOrUpdaterFn(this.get())
            : partialStateOrUpdaterFn;
        this.updater((state, partialState) => (Object.assign(Object.assign({}, state), partialState)))(patchedState);
    }
    get(projector) {
        if (!this.isInitialized) {
            throw new Error(this.notInitializedErrorMessage);
        }
        let value;
        this.stateSubject$.pipe(take(1)).subscribe((state) => {
            value = projector ? projector(state) : state;
        });
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        return value;
    }
    select(...args) {
        const { observables, projector, config } = processSelectorArgs(args);
        let observable$;
        // If there are no Observables to combine, then we'll just map the value.
        if (observables.length === 0) {
            observable$ = this.stateSubject$.pipe(config.debounce ? debounceSync() : (source$) => source$, map(projector));
        }
        else {
            // If there are multiple arguments, then we're aggregating selectors, so we need
            // to take the combineLatest of them before calling the map function.
            observable$ = combineLatest(observables).pipe(config.debounce ? debounceSync() : (source$) => source$, map((projectorArgs) => projector(...projectorArgs)));
        }
        return observable$.pipe(distinctUntilChanged(), shareReplay({
            refCount: true,
            bufferSize: 1,
        }), takeUntil(this.destroy$));
    }
    /**
     * Creates an effect.
     *
     * This effect is subscribed to throughout the lifecycle of the ComponentStore.
     * @param generator A function that takes an origin Observable input and
     *     returns an Observable. The Observable that is returned will be
     *     subscribed to for the life of the component.
     * @return A function that, when called, will trigger the origin Observable.
     */
    effect(generator) {
        const origin$ = new Subject();
        generator(origin$)
            // tied to the lifecycle 👇 of ComponentStore
            .pipe(takeUntil(this.destroy$))
            .subscribe();
        return ((observableOrValue) => {
            const observable$ = isObservable(observableOrValue)
                ? observableOrValue
                : of(observableOrValue);
            return observable$.pipe(takeUntil(this.destroy$)).subscribe((value) => {
                // any new 👇 value is pushed into a stream
                origin$.next(value);
            });
        });
    }
}
/** @type {!Array<{type: !Function, args: (undefined|!Array<?>)}>} */
ComponentStore.decorators = [
    { type: Injectable }
];
/**
 * @type {function(): !Array<(null|{
 *   type: ?,
 *   decorators: (undefined|!Array<{type: !Function, args: (undefined|!Array<?>)}>),
 * })>}
 * @nocollapse
 */
ComponentStore.ctorParameters = () => [
    { type: undefined, decorators: [{ type: Optional }, { type: Inject, args: [INITIAL_STATE_TOKEN,] }] }
];
function processSelectorArgs(args) {
    const selectorArgs = Array.from(args);
    // Assign default values.
    let config = { debounce: false };
    let projector;
    // Last argument is either projector or config
    const projectorOrConfig = selectorArgs.pop();
    if (typeof projectorOrConfig !== 'function') {
        // We got the config as the last argument, replace any default values with it.
        config = Object.assign(Object.assign({}, config), projectorOrConfig);
        // Pop the next args, which would be the projector fn.
        projector = selectorArgs.pop();
    }
    else {
        projector = projectorOrConfig;
    }
    // The Observables to combine, if there are any.
    const observables = selectorArgs;
    return {
        observables,
        projector,
        config,
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcG9uZW50LXN0b3JlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vbW9kdWxlcy9jb21wb25lbnQtc3RvcmUvc3JjL2NvbXBvbmVudC1zdG9yZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQ0wsWUFBWSxFQUVaLEVBQUUsRUFDRixhQUFhLEVBRWIsVUFBVSxFQUNWLGFBQWEsRUFDYixPQUFPLEVBQ1AsY0FBYyxFQUNkLFNBQVMsR0FDVixNQUFNLE1BQU0sQ0FBQztBQUNkLE9BQU8sRUFDTCxTQUFTLEVBQ1QsU0FBUyxFQUNULGNBQWMsRUFDZCxHQUFHLEVBQ0gsb0JBQW9CLEVBQ3BCLFdBQVcsRUFDWCxJQUFJLEdBQ0wsTUFBTSxnQkFBZ0IsQ0FBQztBQUN4QixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFDL0MsT0FBTyxFQUNMLFVBQVUsRUFFVixRQUFRLEVBQ1IsY0FBYyxFQUNkLE1BQU0sR0FDUCxNQUFNLGVBQWUsQ0FBQztBQU12QixNQUFNLENBQUMsTUFBTSxtQkFBbUIsR0FBRyxJQUFJLGNBQWMsQ0FDbkQscUNBQXFDLENBQ3RDLENBQUM7QUFhRixNQUFNLE9BQU8sY0FBYztJQWN6QixZQUFxRCxZQUFnQjtRQWJyRSxzQ0FBc0M7UUFDckIsb0JBQWUsR0FBRyxJQUFJLGFBQWEsQ0FBTyxDQUFDLENBQUMsQ0FBQztRQUM5RCw4REFBOEQ7UUFDckQsYUFBUSxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsWUFBWSxFQUFFLENBQUM7UUFFdkMsa0JBQWEsR0FBRyxJQUFJLGFBQWEsQ0FBSSxDQUFDLENBQUMsQ0FBQztRQUNqRCxrQkFBYSxHQUFHLEtBQUssQ0FBQztRQUN0QiwrQkFBMEIsR0FDaEMsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksaUNBQWlDO1lBQ3pELDZEQUE2RCxDQUFDO1FBQ2hFLHNFQUFzRTtRQUM3RCxXQUFNLEdBQWtCLElBQUksQ0FB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QyxLQUFLLEVBQUUsRUFBRTtnQkFDcEUsMkNBQTJDO2dCQUMzQyxPQUFPLENBQUMsSUFBSSxDQUFDLEtBQXVCLENBQUMsQ0FBQztZQUN4QyxDQUFDLENBQUMsQ0FBQztRQUNMLENBQUMsQ0FBMEIsQ0FBQztJQUM5QixDQUFDOzs7O1lBclFGLFVBQVU7Ozs7Ozs7Ozs7NENBZUksUUFBUSxZQUFJLE1BQU0sU0FBQyxtQkFBbUI7O0FBeVByRCxTQUFTLG1CQUFtQixDQUsxQixJQUFlO0lBTWYsTUFBTSxZQUFZLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUN0Qyx5QkFBeUI7SUFDekIsSUFBSSxNQUFNLEdBQTJCLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxDQUFDO0lBQ3pELElBQUksU0FBc0IsQ0FBQztJQUMzQiw4Q0FBOEM7SUFDOUMsTUFBTSxpQkFBaUIsR0FBRyxZQUFZLENBQUMsR0FBRyxFQUFnQyxDQUFDO0lBRTNFLElBQUksT0FBTyxpQkFBaUIsS0FBSyxVQUFVLEVBQUU7UUFDM0MsOEVBQThFO1FBQzlFLE1BQU0sbUNBQVEsTUFBTSxHQUFLLGlCQUFpQixDQUFFLENBQUM7UUFDN0Msc0RBQXNEO1FBQ3RELFNBQVMsR0FBRyxZQUFZLENBQUMsR0FBRyxFQUFpQixDQUFDO0tBQy9DO1NBQU07UUFDTCxTQUFTLEdBQUcsaUJBQWlCLENBQUM7S0FDL0I7SUFDRCxnREFBZ0Q7SUFDaEQsTUFBTSxXQUFXLEdBQUcsWUFBcUMsQ0FBQztJQUMxRCxPQUFPO1FBQ0wsV0FBVztRQUNYLFNBQVM7UUFDVCxNQUFNO0tBQ1AsQ0FBQztBQUNKLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge1xuICBpc09ic2VydmFibGUsXG4gIE9ic2VydmFibGUsXG4gIG9mLFxuICBSZXBsYXlTdWJqZWN0LFxuICBTdWJzY3JpcHRpb24sXG4gIHRocm93RXJyb3IsXG4gIGNvbWJpbmVMYXRlc3QsXG4gIFN1YmplY3QsXG4gIHF1ZXVlU2NoZWR1bGVyLFxuICBzY2hlZHVsZWQsXG59IGZyb20gJ3J4anMnO1xuaW1wb3J0IHtcbiAgY29uY2F0TWFwLFxuICB0YWtlVW50aWwsXG4gIHdpdGhMYXRlc3RGcm9tLFxuICBtYXAsXG4gIGRpc3RpbmN0VW50aWxDaGFuZ2VkLFxuICBzaGFyZVJlcGxheSxcbiAgdGFrZSxcbn0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0IHsgZGVib3VuY2VTeW5jIH0gZnJvbSAnLi9kZWJvdW5jZS1zeW5jJztcbmltcG9ydCB7XG4gIEluamVjdGFibGUsXG4gIE9uRGVzdHJveSxcbiAgT3B0aW9uYWwsXG4gIEluamVjdGlvblRva2VuLFxuICBJbmplY3QsXG59IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuXG5leHBvcnQgaW50ZXJmYWNlIFNlbGVjdENvbmZpZyB7XG4gIGRlYm91bmNlPzogYm9vbGVhbjtcbn1cblxuZXhwb3J0IGNvbnN0IElOSVRJQUxfU1RBVEVfVE9LRU4gPSBuZXcgSW5qZWN0aW9uVG9rZW4oXG4gICdAbmdyeC9jb21wb25lbnQtc3RvcmUgSW5pdGlhbCBTdGF0ZSdcbik7XG5cbmV4cG9ydCB0eXBlIFNlbGVjdG9yUmVzdWx0czxTZWxlY3RvcnMgZXh0ZW5kcyBPYnNlcnZhYmxlPHVua25vd24+W10+ID0ge1xuICBbS2V5IGluIGtleW9mIFNlbGVjdG9yc106IFNlbGVjdG9yc1tLZXldIGV4dGVuZHMgT2JzZXJ2YWJsZTxpbmZlciBVPlxuICAgID8gVVxuICAgIDogbmV2ZXI7XG59O1xuXG5leHBvcnQgdHlwZSBQcm9qZWN0b3I8U2VsZWN0b3JzIGV4dGVuZHMgT2JzZXJ2YWJsZTx1bmtub3duPltdLCBSZXN1bHQ+ID0gKFxuICAuLi5hcmdzOiBTZWxlY3RvclJlc3VsdHM8U2VsZWN0b3JzPlxuKSA9PiBSZXN1bHQ7XG5cbkBJbmplY3RhYmxlKClcbmV4cG9ydCBjbGFzcyBDb21wb25lbnRTdG9yZTxUIGV4dGVuZHMgb2JqZWN0PiBpbXBsZW1lbnRzIE9uRGVzdHJveSB7XG4gIC8vIFNob3VsZCBiZSB1c2VkIG9ubHkgaW4gbmdPbkRlc3Ryb3kuXG4gIHByaXZhdGUgcmVhZG9ubHkgZGVzdHJveVN1YmplY3QkID0gbmV3IFJlcGxheVN1YmplY3Q8dm9pZD4oMSk7XG4gIC8vIEV4cG9zZWQgdG8gYW55IGV4dGVuZGluZyBTdG9yZSB0byBiZSB1c2VkIGZvciB0aGUgdGVhcmRvd24uXG4gIHJlYWRvbmx5IGRlc3Ryb3kkID0gdGhpcy5kZXN0cm95U3ViamVjdCQuYXNPYnNlcnZhYmxlKCk7XG5cbiAgcHJpdmF0ZSByZWFkb25seSBzdGF0ZVN1YmplY3QkID0gbmV3IFJlcGxheVN1YmplY3Q8VD4oMSk7XG4gIHByaXZhdGUgaXNJbml0aWFsaXplZCA9IGZhbHNlO1xuICBwcml2YXRlIG5vdEluaXRpYWxpemVkRXJyb3JNZXNzYWdlID1cbiAgICBgJHt0aGlzLmNvbnN0cnVjdG9yLm5hbWV9IGhhcyBub3QgYmVlbiBpbml0aWFsaXplZCB5ZXQuIGAgK1xuICAgIGBQbGVhc2UgbWFrZSBzdXJlIGl0IGlzIGluaXRpYWxpemVkIGJlZm9yZSB1cGRhdGluZy9nZXR0aW5nLmA7XG4gIC8vIE5lZWRzIHRvIGJlIGFmdGVyIGRlc3Ryb3kkIGlzIGRlY2xhcmVkIGJlY2F1c2UgaXQncyB1c2VkIGluIHNlbGVjdC5cbiAgcmVhZG9ubHkgc3RhdGUkOiBPYnNlcnZhYmxlPFQ+ID0gdGhpcy5zZWxlY3QoKHMpID0+IHMpO1xuXG4gIGNvbnN0cnVjdG9yKEBPcHRpb25hbCgpIEBJbmplY3QoSU5JVElBTF9TVEFURV9UT0tFTikgZGVmYXVsdFN0YXRlPzogVCkge1xuICAgIC8vIFN0YXRlIGNhbiBiZSBpbml0aWFsaXplZCBlaXRoZXIgdGhyb3VnaCBjb25zdHJ1Y3RvciBvciBzZXRTdGF0ZS5cbiAgICBpZiAoZGVmYXVsdFN0YXRlKSB7XG4gICAgICB0aGlzLmluaXRTdGF0ZShkZWZhdWx0U3RhdGUpO1xuICAgIH1cbiAgfVxuXG4gIC8qKiBDb21wbGV0ZXMgYWxsIHJlbGV2YW50IE9ic2VydmFibGUgc3RyZWFtcy4gKi9cbiAgbmdPbkRlc3Ryb3koKSB7XG4gICAgdGhpcy5zdGF0ZVN1YmplY3QkLmNvbXBsZXRlKCk7XG4gICAgdGhpcy5kZXN0cm95U3ViamVjdCQubmV4dCgpO1xuICB9XG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgYW4gdXBkYXRlci5cbiAgICpcbiAgICogVGhyb3dzIGFuIGVycm9yIGlmIHVwZGF0ZXIgaXMgY2FsbGVkIHdpdGggc3luY2hyb25vdXMgdmFsdWVzIChlaXRoZXJcbiAgICogaW1wZXJhdGl2ZSB2YWx1ZSBvciBPYnNlcnZhYmxlIHRoYXQgaXMgc3luY2hyb25vdXMpIGJlZm9yZSBDb21wb25lbnRTdG9yZVxuICAgKiBpcyBpbml0aWFsaXplZC4gSWYgY2FsbGVkIHdpdGggYXN5bmMgT2JzZXJ2YWJsZSBiZWZvcmUgaW5pdGlhbGl6YXRpb24gdGhlblxuICAgKiBzdGF0ZSB3aWxsIG5vdCBiZSB1cGRhdGVkIGFuZCBzdWJzY3JpcHRpb24gd291bGQgYmUgY2xvc2VkLlxuICAgKlxuICAgKiBAcGFyYW0gdXBkYXRlckZuIEEgc3RhdGljIHVwZGF0ZXIgZnVuY3Rpb24gdGhhdCB0YWtlcyAyIHBhcmFtZXRlcnMgKHRoZVxuICAgKiBjdXJyZW50IHN0YXRlIGFuZCBhbiBhcmd1bWVudCBvYmplY3QpIGFuZCByZXR1cm5zIGEgbmV3IGluc3RhbmNlIG9mIHRoZVxuICAgKiBzdGF0ZS5cbiAgICogQHJldHVybiBBIGZ1bmN0aW9uIHRoYXQgYWNjZXB0cyBvbmUgYXJndW1lbnQgd2hpY2ggaXMgZm9yd2FyZGVkIGFzIHRoZVxuICAgKiAgICAgc2Vjb25kIGFyZ3VtZW50IHRvIGB1cGRhdGVyRm5gLiBFdmVyeSB0aW1lIHRoaXMgZnVuY3Rpb24gaXMgY2FsbGVkXG4gICAqICAgICBzdWJzY3JpYmVycyB3aWxsIGJlIG5vdGlmaWVkIG9mIHRoZSBzdGF0ZSBjaGFuZ2UuXG4gICAqL1xuICB1cGRhdGVyPFxuICAgIC8vIEFsbG93IHRvIGZvcmNlLXByb3ZpZGUgdGhlIHR5cGVcbiAgICBQcm92aWRlZFR5cGUgPSB2b2lkLFxuICAgIC8vIFRoaXMgdHlwZSBpcyBkZXJpdmVkIGZyb20gdGhlIGB2YWx1ZWAgcHJvcGVydHksIGRlZmF1bHRpbmcgdG8gdm9pZCBpZiBpdCdzIG1pc3NpbmdcbiAgICBPcmlnaW5UeXBlID0gUHJvdmlkZWRUeXBlLFxuICAgIC8vIFRoZSBWYWx1ZSB0eXBlIGlzIGFzc2lnbmVkIGZyb20gdGhlIE9yaWdpblxuICAgIFZhbHVlVHlwZSA9IE9yaWdpblR5cGUsXG4gICAgLy8gUmV0dXJuIGVpdGhlciBhbiBlbXB0eSBjYWxsYmFjayBvciBhIGZ1bmN0aW9uIHJlcXVpcmluZyBzcGVjaWZpYyB0eXBlcyBhcyBpbnB1dHNcbiAgICBSZXR1cm5UeXBlID0gT3JpZ2luVHlwZSBleHRlbmRzIHZvaWRcbiAgICAgID8gKCkgPT4gdm9pZFxuICAgICAgOiAob2JzZXJ2YWJsZU9yVmFsdWU6IFZhbHVlVHlwZSB8IE9ic2VydmFibGU8VmFsdWVUeXBlPikgPT4gU3Vic2NyaXB0aW9uXG4gID4odXBkYXRlckZuOiAoc3RhdGU6IFQsIHZhbHVlOiBPcmlnaW5UeXBlKSA9PiBUKTogUmV0dXJuVHlwZSB7XG4gICAgcmV0dXJuICgoXG4gICAgICBvYnNlcnZhYmxlT3JWYWx1ZT86IE9yaWdpblR5cGUgfCBPYnNlcnZhYmxlPE9yaWdpblR5cGU+XG4gICAgKTogU3Vic2NyaXB0aW9uID0+IHtcbiAgICAgIGxldCBpbml0aWFsaXphdGlvbkVycm9yOiBFcnJvciB8IHVuZGVmaW5lZDtcbiAgICAgIC8vIFdlIGNhbiByZWNlaXZlIGVpdGhlciB0aGUgdmFsdWUgb3IgYW4gb2JzZXJ2YWJsZS4gSW4gY2FzZSBpdCdzIGFcbiAgICAgIC8vIHNpbXBsZSB2YWx1ZSwgd2UnbGwgd3JhcCBpdCB3aXRoIGBvZmAgb3BlcmF0b3IgdG8gdHVybiBpdCBpbnRvXG4gICAgICAvLyBPYnNlcnZhYmxlLlxuICAgICAgY29uc3Qgb2JzZXJ2YWJsZSQgPSBpc09ic2VydmFibGUob2JzZXJ2YWJsZU9yVmFsdWUpXG4gICAgICAgID8gb2JzZXJ2YWJsZU9yVmFsdWVcbiAgICAgICAgOiBvZihvYnNlcnZhYmxlT3JWYWx1ZSk7XG4gICAgICBjb25zdCBzdWJzY3JpcHRpb24gPSBvYnNlcnZhYmxlJFxuICAgICAgICAucGlwZShcbiAgICAgICAgICBjb25jYXRNYXAoKHZhbHVlKSA9PlxuICAgICAgICAgICAgdGhpcy5pc0luaXRpYWxpemVkXG4gICAgICAgICAgICAgID8gLy8gUHVzaCB0aGUgdmFsdWUgaW50byBxdWV1ZVNjaGVkdWxlclxuICAgICAgICAgICAgICAgIHNjaGVkdWxlZChbdmFsdWVdLCBxdWV1ZVNjaGVkdWxlcikucGlwZShcbiAgICAgICAgICAgICAgICAgIHdpdGhMYXRlc3RGcm9tKHRoaXMuc3RhdGVTdWJqZWN0JClcbiAgICAgICAgICAgICAgICApXG4gICAgICAgICAgICAgIDogLy8gSWYgc3RhdGUgd2FzIG5vdCBpbml0aWFsaXplZCwgd2UnbGwgdGhyb3cgYW4gZXJyb3IuXG4gICAgICAgICAgICAgICAgdGhyb3dFcnJvcihuZXcgRXJyb3IodGhpcy5ub3RJbml0aWFsaXplZEVycm9yTWVzc2FnZSkpXG4gICAgICAgICAgKSxcbiAgICAgICAgICB0YWtlVW50aWwodGhpcy5kZXN0cm95JClcbiAgICAgICAgKVxuICAgICAgICAuc3Vic2NyaWJlKHtcbiAgICAgICAgICBuZXh0OiAoW3ZhbHVlLCBjdXJyZW50U3RhdGVdKSA9PiB7XG4gICAgICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLW5vbi1udWxsLWFzc2VydGlvblxuICAgICAgICAgICAgdGhpcy5zdGF0ZVN1YmplY3QkLm5leHQodXBkYXRlckZuKGN1cnJlbnRTdGF0ZSwgdmFsdWUhKSk7XG4gICAgICAgICAgfSxcbiAgICAgICAgICBlcnJvcjogKGVycm9yOiBFcnJvcikgPT4ge1xuICAgICAgICAgICAgaW5pdGlhbGl6YXRpb25FcnJvciA9IGVycm9yO1xuICAgICAgICAgICAgdGhpcy5zdGF0ZVN1YmplY3QkLmVycm9yKGVycm9yKTtcbiAgICAgICAgICB9LFxuICAgICAgICB9KTtcblxuICAgICAgaWYgKGluaXRpYWxpemF0aW9uRXJyb3IpIHtcbiAgICAgICAgLy8gcHJldHRpZXItaWdub3JlXG4gICAgICAgIHRocm93IC8qKiBAdHlwZSB7IUVycm9yfSAqLyAoaW5pdGlhbGl6YXRpb25FcnJvcik7XG4gICAgICB9XG4gICAgICByZXR1cm4gc3Vic2NyaXB0aW9uO1xuICAgIH0pIGFzIHVua25vd24gYXMgUmV0dXJuVHlwZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplcyBzdGF0ZS4gSWYgaXQgd2FzIGFscmVhZHkgaW5pdGlhbGl6ZWQgdGhlbiBpdCByZXNldHMgdGhlXG4gICAqIHN0YXRlLlxuICAgKi9cbiAgcHJpdmF0ZSBpbml0U3RhdGUoc3RhdGU6IFQpOiB2b2lkIHtcbiAgICBzY2hlZHVsZWQoW3N0YXRlXSwgcXVldWVTY2hlZHVsZXIpLnN1YnNjcmliZSgocykgPT4ge1xuICAgICAgdGhpcy5pc0luaXRpYWxpemVkID0gdHJ1ZTtcbiAgICAgIHRoaXMuc3RhdGVTdWJqZWN0JC5uZXh0KHMpO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIFNldHMgdGhlIHN0YXRlIHNwZWNpZmljIHZhbHVlLlxuICAgKiBAcGFyYW0gc3RhdGVPclVwZGF0ZXJGbiBvYmplY3Qgb2YgdGhlIHNhbWUgdHlwZSBhcyB0aGUgc3RhdGUgb3IgYW5cbiAgICogdXBkYXRlckZuLCByZXR1cm5pbmcgc3VjaCBvYmplY3QuXG4gICAqL1xuICBzZXRTdGF0ZShzdGF0ZU9yVXBkYXRlckZuOiBUIHwgKChzdGF0ZTogVCkgPT4gVCkpOiB2b2lkIHtcbiAgICBpZiAodHlwZW9mIHN0YXRlT3JVcGRhdGVyRm4gIT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHRoaXMuaW5pdFN0YXRlKHN0YXRlT3JVcGRhdGVyRm4pO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnVwZGF0ZXIoc3RhdGVPclVwZGF0ZXJGbiBhcyAoc3RhdGU6IFQpID0+IFQpKCk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFBhdGNoZXMgdGhlIHN0YXRlIHdpdGggcHJvdmlkZWQgcGFydGlhbCBzdGF0ZS5cbiAgICpcbiAgICogQHBhcmFtIHBhcnRpYWxTdGF0ZU9yVXBkYXRlckZuIGEgcGFydGlhbCBzdGF0ZSBvciBhIHBhcnRpYWwgdXBkYXRlclxuICAgKiBmdW5jdGlvbiB0aGF0IGFjY2VwdHMgdGhlIHN0YXRlIGFuZCByZXR1cm5zIHRoZSBwYXJ0aWFsIHN0YXRlLlxuICAgKiBAdGhyb3dzIEVycm9yIGlmIHRoZSBzdGF0ZSBpcyBub3QgaW5pdGlhbGl6ZWQuXG4gICAqL1xuICBwYXRjaFN0YXRlKFxuICAgIHBhcnRpYWxTdGF0ZU9yVXBkYXRlckZuOlxuICAgICAgfCBQYXJ0aWFsPFQ+XG4gICAgICB8IE9ic2VydmFibGU8UGFydGlhbDxUPj5cbiAgICAgIHwgKChzdGF0ZTogVCkgPT4gUGFydGlhbDxUPilcbiAgKTogdm9pZCB7XG4gICAgY29uc3QgcGF0Y2hlZFN0YXRlID1cbiAgICAgIHR5cGVvZiBwYXJ0aWFsU3RhdGVPclVwZGF0ZXJGbiA9PT0gJ2Z1bmN0aW9uJ1xuICAgICAgICA/IHBhcnRpYWxTdGF0ZU9yVXBkYXRlckZuKHRoaXMuZ2V0KCkpXG4gICAgICAgIDogcGFydGlhbFN0YXRlT3JVcGRhdGVyRm47XG5cbiAgICB0aGlzLnVwZGF0ZXIoKHN0YXRlLCBwYXJ0aWFsU3RhdGU6IFBhcnRpYWw8VD4pID0+ICh7XG4gICAgICAuLi5zdGF0ZSxcbiAgICAgIC4uLnBhcnRpYWxTdGF0ZSxcbiAgICB9KSkocGF0Y2hlZFN0YXRlKTtcbiAgfVxuXG4gIHByb3RlY3RlZCBnZXQoKTogVDtcbiAgcHJvdGVjdGVkIGdldDxSPihwcm9qZWN0b3I6IChzOiBUKSA9PiBSKTogUjtcbiAgcHJvdGVjdGVkIGdldDxSPihwcm9qZWN0b3I/OiAoczogVCkgPT4gUik6IFIgfCBUIHtcbiAgICBpZiAoIXRoaXMuaXNJbml0aWFsaXplZCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKHRoaXMubm90SW5pdGlhbGl6ZWRFcnJvck1lc3NhZ2UpO1xuICAgIH1cbiAgICBsZXQgdmFsdWU6IFIgfCBUO1xuXG4gICAgdGhpcy5zdGF0ZVN1YmplY3QkLnBpcGUodGFrZSgxKSkuc3Vic2NyaWJlKChzdGF0ZSkgPT4ge1xuICAgICAgdmFsdWUgPSBwcm9qZWN0b3IgPyBwcm9qZWN0b3Ioc3RhdGUpIDogc3RhdGU7XG4gICAgfSk7XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1ub24tbnVsbC1hc3NlcnRpb25cbiAgICByZXR1cm4gdmFsdWUhO1xuICB9XG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBzZWxlY3Rvci5cbiAgICpcbiAgICogQHBhcmFtIHByb2plY3RvciBBIHB1cmUgcHJvamVjdGlvbiBmdW5jdGlvbiB0aGF0IHRha2VzIHRoZSBjdXJyZW50IHN0YXRlIGFuZFxuICAgKiAgIHJldHVybnMgc29tZSBuZXcgc2xpY2UvcHJvamVjdGlvbiBvZiB0aGF0IHN0YXRlLlxuICAgKiBAcGFyYW0gY29uZmlnIFNlbGVjdENvbmZpZyB0aGF0IGNoYW5nZXMgdGhlIGJlaGF2aW9yIG9mIHNlbGVjdG9yLCBpbmNsdWRpbmdcbiAgICogICB0aGUgZGVib3VuY2luZyBvZiB0aGUgdmFsdWVzIHVudGlsIHRoZSBzdGF0ZSBpcyBzZXR0bGVkLlxuICAgKiBAcmV0dXJuIEFuIG9ic2VydmFibGUgb2YgdGhlIHByb2plY3RvciByZXN1bHRzLlxuICAgKi9cbiAgc2VsZWN0PFJlc3VsdD4oXG4gICAgcHJvamVjdG9yOiAoczogVCkgPT4gUmVzdWx0LFxuICAgIGNvbmZpZz86IFNlbGVjdENvbmZpZ1xuICApOiBPYnNlcnZhYmxlPFJlc3VsdD47XG4gIHNlbGVjdDxTZWxlY3RvcnMgZXh0ZW5kcyBPYnNlcnZhYmxlPHVua25vd24+W10sIFJlc3VsdD4oXG4gICAgLi4uYXJnczogWy4uLnNlbGVjdG9yczogU2VsZWN0b3JzLCBwcm9qZWN0b3I6IFByb2plY3RvcjxTZWxlY3RvcnMsIFJlc3VsdD5dXG4gICk6IE9ic2VydmFibGU8UmVzdWx0PjtcbiAgc2VsZWN0PFNlbGVjdG9ycyBleHRlbmRzIE9ic2VydmFibGU8dW5rbm93bj5bXSwgUmVzdWx0PihcbiAgICAuLi5hcmdzOiBbXG4gICAgICAuLi5zZWxlY3RvcnM6IFNlbGVjdG9ycyxcbiAgICAgIHByb2plY3RvcjogUHJvamVjdG9yPFNlbGVjdG9ycywgUmVzdWx0PixcbiAgICAgIGNvbmZpZzogU2VsZWN0Q29uZmlnXG4gICAgXVxuICApOiBPYnNlcnZhYmxlPFJlc3VsdD47XG4gIHNlbGVjdDxcbiAgICBTZWxlY3RvcnMgZXh0ZW5kcyBBcnJheTxPYnNlcnZhYmxlPHVua25vd24+IHwgU2VsZWN0Q29uZmlnIHwgUHJvamVjdG9yRm4+LFxuICAgIFJlc3VsdCxcbiAgICBQcm9qZWN0b3JGbiA9ICguLi5hOiB1bmtub3duW10pID0+IFJlc3VsdFxuICA+KC4uLmFyZ3M6IFNlbGVjdG9ycyk6IE9ic2VydmFibGU8UmVzdWx0PiB7XG4gICAgY29uc3QgeyBvYnNlcnZhYmxlcywgcHJvamVjdG9yLCBjb25maWcgfSA9IHByb2Nlc3NTZWxlY3RvckFyZ3M8XG4gICAgICBTZWxlY3RvcnMsXG4gICAgICBSZXN1bHRcbiAgICA+KGFyZ3MpO1xuXG4gICAgbGV0IG9ic2VydmFibGUkOiBPYnNlcnZhYmxlPFJlc3VsdD47XG4gICAgLy8gSWYgdGhlcmUgYXJlIG5vIE9ic2VydmFibGVzIHRvIGNvbWJpbmUsIHRoZW4gd2UnbGwganVzdCBtYXAgdGhlIHZhbHVlLlxuICAgIGlmIChvYnNlcnZhYmxlcy5sZW5ndGggPT09IDApIHtcbiAgICAgIG9ic2VydmFibGUkID0gdGhpcy5zdGF0ZVN1YmplY3QkLnBpcGUoXG4gICAgICAgIGNvbmZpZy5kZWJvdW5jZSA/IGRlYm91bmNlU3luYygpIDogKHNvdXJjZSQpID0+IHNvdXJjZSQsXG4gICAgICAgIG1hcChwcm9qZWN0b3IpXG4gICAgICApO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBJZiB0aGVyZSBhcmUgbXVsdGlwbGUgYXJndW1lbnRzLCB0aGVuIHdlJ3JlIGFnZ3JlZ2F0aW5nIHNlbGVjdG9ycywgc28gd2UgbmVlZFxuICAgICAgLy8gdG8gdGFrZSB0aGUgY29tYmluZUxhdGVzdCBvZiB0aGVtIGJlZm9yZSBjYWxsaW5nIHRoZSBtYXAgZnVuY3Rpb24uXG4gICAgICBvYnNlcnZhYmxlJCA9IGNvbWJpbmVMYXRlc3Qob2JzZXJ2YWJsZXMpLnBpcGUoXG4gICAgICAgIGNvbmZpZy5kZWJvdW5jZSA/IGRlYm91bmNlU3luYygpIDogKHNvdXJjZSQpID0+IHNvdXJjZSQsXG4gICAgICAgIG1hcCgocHJvamVjdG9yQXJncykgPT4gcHJvamVjdG9yKC4uLnByb2plY3RvckFyZ3MpKVxuICAgICAgKTtcbiAgICB9XG5cbiAgICByZXR1cm4gb2JzZXJ2YWJsZSQucGlwZShcbiAgICAgIGRpc3RpbmN0VW50aWxDaGFuZ2VkKCksXG4gICAgICBzaGFyZVJlcGxheSh7XG4gICAgICAgIHJlZkNvdW50OiB0cnVlLFxuICAgICAgICBidWZmZXJTaXplOiAxLFxuICAgICAgfSksXG4gICAgICB0YWtlVW50aWwodGhpcy5kZXN0cm95JClcbiAgICApO1xuICB9XG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgYW4gZWZmZWN0LlxuICAgKlxuICAgKiBUaGlzIGVmZmVjdCBpcyBzdWJzY3JpYmVkIHRvIHRocm91Z2hvdXQgdGhlIGxpZmVjeWNsZSBvZiB0aGUgQ29tcG9uZW50U3RvcmUuXG4gICAqIEBwYXJhbSBnZW5lcmF0b3IgQSBmdW5jdGlvbiB0aGF0IHRha2VzIGFuIG9yaWdpbiBPYnNlcnZhYmxlIGlucHV0IGFuZFxuICAgKiAgICAgcmV0dXJucyBhbiBPYnNlcnZhYmxlLiBUaGUgT2JzZXJ2YWJsZSB0aGF0IGlzIHJldHVybmVkIHdpbGwgYmVcbiAgICogICAgIHN1YnNjcmliZWQgdG8gZm9yIHRoZSBsaWZlIG9mIHRoZSBjb21wb25lbnQuXG4gICAqIEByZXR1cm4gQSBmdW5jdGlvbiB0aGF0LCB3aGVuIGNhbGxlZCwgd2lsbCB0cmlnZ2VyIHRoZSBvcmlnaW4gT2JzZXJ2YWJsZS5cbiAgICovXG4gIGVmZmVjdDxcbiAgICAvLyBUaGlzIHR5cGUgcXVpY2tseSBiZWNhbWUgcGFydCBvZiBlZmZlY3QgJ0FQSSdcbiAgICBQcm92aWRlZFR5cGUgPSB2b2lkLFxuICAgIC8vIFRoZSBhY3R1YWwgb3JpZ2luJCB0eXBlLCB3aGljaCBjb3VsZCBiZSB1bmtub3duLCB3aGVuIG5vdCBzcGVjaWZpZWRcbiAgICBPcmlnaW5UeXBlIGV4dGVuZHNcbiAgICAgIHwgT2JzZXJ2YWJsZTxQcm92aWRlZFR5cGU+XG4gICAgICB8IHVua25vd24gPSBPYnNlcnZhYmxlPFByb3ZpZGVkVHlwZT4sXG4gICAgLy8gVW53cmFwcGVkIGFjdHVhbCB0eXBlIG9mIHRoZSBvcmlnaW4kIE9ic2VydmFibGUsIGFmdGVyIGRlZmF1bHQgd2FzIGFwcGxpZWRcbiAgICBPYnNlcnZhYmxlVHlwZSA9IE9yaWdpblR5cGUgZXh0ZW5kcyBPYnNlcnZhYmxlPGluZmVyIEE+ID8gQSA6IG5ldmVyLFxuICAgIC8vIFJldHVybiBlaXRoZXIgYW4gZW1wdHkgY2FsbGJhY2sgb3IgYSBmdW5jdGlvbiByZXF1aXJpbmcgc3BlY2lmaWMgdHlwZXMgYXMgaW5wdXRzXG4gICAgUmV0dXJuVHlwZSA9IFByb3ZpZGVkVHlwZSB8IE9ic2VydmFibGVUeXBlIGV4dGVuZHMgdm9pZFxuICAgICAgPyAoKSA9PiB2b2lkXG4gICAgICA6IChcbiAgICAgICAgICBvYnNlcnZhYmxlT3JWYWx1ZTogT2JzZXJ2YWJsZVR5cGUgfCBPYnNlcnZhYmxlPE9ic2VydmFibGVUeXBlPlxuICAgICAgICApID0+IFN1YnNjcmlwdGlvblxuICA+KGdlbmVyYXRvcjogKG9yaWdpbiQ6IE9yaWdpblR5cGUpID0+IE9ic2VydmFibGU8dW5rbm93bj4pOiBSZXR1cm5UeXBlIHtcbiAgICBjb25zdCBvcmlnaW4kID0gbmV3IFN1YmplY3Q8T2JzZXJ2YWJsZVR5cGU+KCk7XG4gICAgZ2VuZXJhdG9yKG9yaWdpbiQgYXMgT3JpZ2luVHlwZSlcbiAgICAgIC8vIHRpZWQgdG8gdGhlIGxpZmVjeWNsZSDwn5GHIG9mIENvbXBvbmVudFN0b3JlXG4gICAgICAucGlwZSh0YWtlVW50aWwodGhpcy5kZXN0cm95JCkpXG4gICAgICAuc3Vic2NyaWJlKCk7XG5cbiAgICByZXR1cm4gKChcbiAgICAgIG9ic2VydmFibGVPclZhbHVlPzogT2JzZXJ2YWJsZVR5cGUgfCBPYnNlcnZhYmxlPE9ic2VydmFibGVUeXBlPlxuICAgICk6IFN1YnNjcmlwdGlvbiA9PiB7XG4gICAgICBjb25zdCBvYnNlcnZhYmxlJCA9IGlzT2JzZXJ2YWJsZShvYnNlcnZhYmxlT3JWYWx1ZSlcbiAgICAgICAgPyBvYnNlcnZhYmxlT3JWYWx1ZVxuICAgICAgICA6IG9mKG9ic2VydmFibGVPclZhbHVlKTtcbiAgICAgIHJldHVybiBvYnNlcnZhYmxlJC5waXBlKHRha2VVbnRpbCh0aGlzLmRlc3Ryb3kkKSkuc3Vic2NyaWJlKCh2YWx1ZSkgPT4ge1xuICAgICAgICAvLyBhbnkgbmV3IPCfkYcgdmFsdWUgaXMgcHVzaGVkIGludG8gYSBzdHJlYW1cbiAgICAgICAgb3JpZ2luJC5uZXh0KHZhbHVlIGFzIE9ic2VydmFibGVUeXBlKTtcbiAgICAgIH0pO1xuICAgIH0pIGFzIHVua25vd24gYXMgUmV0dXJuVHlwZTtcbiAgfVxufVxuXG5mdW5jdGlvbiBwcm9jZXNzU2VsZWN0b3JBcmdzPFxuICBTZWxlY3RvcnMgZXh0ZW5kcyBBcnJheTxPYnNlcnZhYmxlPHVua25vd24+IHwgU2VsZWN0Q29uZmlnIHwgUHJvamVjdG9yRm4+LFxuICBSZXN1bHQsXG4gIFByb2plY3RvckZuID0gKC4uLmE6IHVua25vd25bXSkgPT4gUmVzdWx0XG4+KFxuICBhcmdzOiBTZWxlY3RvcnNcbik6IHtcbiAgb2JzZXJ2YWJsZXM6IE9ic2VydmFibGU8dW5rbm93bj5bXTtcbiAgcHJvamVjdG9yOiBQcm9qZWN0b3JGbjtcbiAgY29uZmlnOiBSZXF1aXJlZDxTZWxlY3RDb25maWc+O1xufSB7XG4gIGNvbnN0IHNlbGVjdG9yQXJncyA9IEFycmF5LmZyb20oYXJncyk7XG4gIC8vIEFzc2lnbiBkZWZhdWx0IHZhbHVlcy5cbiAgbGV0IGNvbmZpZzogUmVxdWlyZWQ8U2VsZWN0Q29uZmlnPiA9IHsgZGVib3VuY2U6IGZhbHNlIH07XG4gIGxldCBwcm9qZWN0b3I6IFByb2plY3RvckZuO1xuICAvLyBMYXN0IGFyZ3VtZW50IGlzIGVpdGhlciBwcm9qZWN0b3Igb3IgY29uZmlnXG4gIGNvbnN0IHByb2plY3Rvck9yQ29uZmlnID0gc2VsZWN0b3JBcmdzLnBvcCgpIGFzIFByb2plY3RvckZuIHwgU2VsZWN0Q29uZmlnO1xuXG4gIGlmICh0eXBlb2YgcHJvamVjdG9yT3JDb25maWcgIT09ICdmdW5jdGlvbicpIHtcbiAgICAvLyBXZSBnb3QgdGhlIGNvbmZpZyBhcyB0aGUgbGFzdCBhcmd1bWVudCwgcmVwbGFjZSBhbnkgZGVmYXVsdCB2YWx1ZXMgd2l0aCBpdC5cbiAgICBjb25maWcgPSB7IC4uLmNvbmZpZywgLi4ucHJvamVjdG9yT3JDb25maWcgfTtcbiAgICAvLyBQb3AgdGhlIG5leHQgYXJncywgd2hpY2ggd291bGQgYmUgdGhlIHByb2plY3RvciBmbi5cbiAgICBwcm9qZWN0b3IgPSBzZWxlY3RvckFyZ3MucG9wKCkgYXMgUHJvamVjdG9yRm47XG4gIH0gZWxzZSB7XG4gICAgcHJvamVjdG9yID0gcHJvamVjdG9yT3JDb25maWc7XG4gIH1cbiAgLy8gVGhlIE9ic2VydmFibGVzIHRvIGNvbWJpbmUsIGlmIHRoZXJlIGFyZSBhbnkuXG4gIGNvbnN0IG9ic2VydmFibGVzID0gc2VsZWN0b3JBcmdzIGFzIE9ic2VydmFibGU8dW5rbm93bj5bXTtcbiAgcmV0dXJuIHtcbiAgICBvYnNlcnZhYmxlcyxcbiAgICBwcm9qZWN0b3IsXG4gICAgY29uZmlnLFxuICB9O1xufVxuIl19