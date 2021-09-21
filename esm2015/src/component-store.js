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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcG9uZW50LXN0b3JlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vbW9kdWxlcy9jb21wb25lbnQtc3RvcmUvc3JjL2NvbXBvbmVudC1zdG9yZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQ0wsWUFBWSxFQUVaLEVBQUUsRUFDRixhQUFhLEVBRWIsVUFBVSxFQUNWLGFBQWEsRUFDYixPQUFPLEVBQ1AsY0FBYyxFQUNkLFNBQVMsR0FDVixNQUFNLE1BQU0sQ0FBQztBQUNkLE9BQU8sRUFDTCxTQUFTLEVBQ1QsU0FBUyxFQUNULGNBQWMsRUFDZCxHQUFHLEVBQ0gsb0JBQW9CLEVBQ3BCLFdBQVcsRUFDWCxJQUFJLEdBQ0wsTUFBTSxnQkFBZ0IsQ0FBQztBQUN4QixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFDL0MsT0FBTyxFQUNMLFVBQVUsRUFFVixRQUFRLEVBQ1IsY0FBYyxFQUNkLE1BQU0sR0FDUCxNQUFNLGVBQWUsQ0FBQztBQU12QixNQUFNLENBQUMsTUFBTSxtQkFBbUIsR0FBRyxJQUFJLGNBQWMsQ0FDbkQscUNBQXFDLENBQ3RDLENBQUM7QUFhRixNQUFNLE9BQU8sY0FBYztJQWN6QixZQUFxRCxZQUFnQjtRQWJyRSxzQ0FBc0M7UUFDckIsb0JBQWUsR0FBRyxJQUFJLGFBQWEsQ0FBTyxDQUFDLENBQUMsQ0FBQztRQUM5RCw4REFBOEQ7UUFDckQsYUFBUSxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsWUFBWSxFQUFFLENBQUM7UUFFdkMsa0JBQWEsR0FBRyxJQUFJLGFBQWEsQ0FBSSxDQUFDLENBQUMsQ0FBQztRQUNqRCxrQkFBYSxHQUFHLEtBQUssQ0FBQztRQUN0QiwrQkFBMEIsR0FDaEMsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksaUNBQWlDO1lBQ3pELDZEQUE2RCxDQUFDO1FBQ2hFLHNFQUFzRTtRQUM3RCxXQUFNLEdBQWtCLElBQUksQ0FB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QyxLQUFLLEVBQUUsRUFBRTtnQkFDcEUsMkNBQTJDO2dCQUMzQyxPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ3RCLENBQUMsQ0FBQyxDQUFDO1FBQ0wsQ0FBQyxDQUEyQixDQUFDO0lBQy9CLENBQUM7Ozs7WUFyUUYsVUFBVTs7Ozs7Ozs7Ozs0Q0FlSSxRQUFRLFlBQUksTUFBTSxTQUFDLG1CQUFtQjs7QUF5UHJELFNBQVMsbUJBQW1CLENBSzFCLElBQWU7SUFNZixNQUFNLFlBQVksR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ3RDLHlCQUF5QjtJQUN6QixJQUFJLE1BQU0sR0FBMkIsRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLENBQUM7SUFDekQsSUFBSSxTQUFzQixDQUFDO0lBQzNCLDhDQUE4QztJQUM5QyxNQUFNLGlCQUFpQixHQUFHLFlBQVksQ0FBQyxHQUFHLEVBQWdDLENBQUM7SUFFM0UsSUFBSSxPQUFPLGlCQUFpQixLQUFLLFVBQVUsRUFBRTtRQUMzQyw4RUFBOEU7UUFDOUUsTUFBTSxtQ0FBUSxNQUFNLEdBQUssaUJBQWlCLENBQUUsQ0FBQztRQUM3QyxzREFBc0Q7UUFDdEQsU0FBUyxHQUFHLFlBQVksQ0FBQyxHQUFHLEVBQWlCLENBQUM7S0FDL0M7U0FBTTtRQUNMLFNBQVMsR0FBRyxpQkFBaUIsQ0FBQztLQUMvQjtJQUNELGdEQUFnRDtJQUNoRCxNQUFNLFdBQVcsR0FBRyxZQUFxQyxDQUFDO0lBQzFELE9BQU87UUFDTCxXQUFXO1FBQ1gsU0FBUztRQUNULE1BQU07S0FDUCxDQUFDO0FBQ0osQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7XG4gIGlzT2JzZXJ2YWJsZSxcbiAgT2JzZXJ2YWJsZSxcbiAgb2YsXG4gIFJlcGxheVN1YmplY3QsXG4gIFN1YnNjcmlwdGlvbixcbiAgdGhyb3dFcnJvcixcbiAgY29tYmluZUxhdGVzdCxcbiAgU3ViamVjdCxcbiAgcXVldWVTY2hlZHVsZXIsXG4gIHNjaGVkdWxlZCxcbn0gZnJvbSAncnhqcyc7XG5pbXBvcnQge1xuICBjb25jYXRNYXAsXG4gIHRha2VVbnRpbCxcbiAgd2l0aExhdGVzdEZyb20sXG4gIG1hcCxcbiAgZGlzdGluY3RVbnRpbENoYW5nZWQsXG4gIHNoYXJlUmVwbGF5LFxuICB0YWtlLFxufSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQgeyBkZWJvdW5jZVN5bmMgfSBmcm9tICcuL2RlYm91bmNlLXN5bmMnO1xuaW1wb3J0IHtcbiAgSW5qZWN0YWJsZSxcbiAgT25EZXN0cm95LFxuICBPcHRpb25hbCxcbiAgSW5qZWN0aW9uVG9rZW4sXG4gIEluamVjdCxcbn0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgU2VsZWN0Q29uZmlnIHtcbiAgZGVib3VuY2U/OiBib29sZWFuO1xufVxuXG5leHBvcnQgY29uc3QgSU5JVElBTF9TVEFURV9UT0tFTiA9IG5ldyBJbmplY3Rpb25Ub2tlbihcbiAgJ0BuZ3J4L2NvbXBvbmVudC1zdG9yZSBJbml0aWFsIFN0YXRlJ1xuKTtcblxuZXhwb3J0IHR5cGUgU2VsZWN0b3JSZXN1bHRzPFNlbGVjdG9ycyBleHRlbmRzIE9ic2VydmFibGU8dW5rbm93bj5bXT4gPSB7XG4gIFtLZXkgaW4ga2V5b2YgU2VsZWN0b3JzXTogU2VsZWN0b3JzW0tleV0gZXh0ZW5kcyBPYnNlcnZhYmxlPGluZmVyIFU+XG4gICAgPyBVXG4gICAgOiBuZXZlcjtcbn07XG5cbmV4cG9ydCB0eXBlIFByb2plY3RvcjxTZWxlY3RvcnMgZXh0ZW5kcyBPYnNlcnZhYmxlPHVua25vd24+W10sIFJlc3VsdD4gPSAoXG4gIC4uLmFyZ3M6IFNlbGVjdG9yUmVzdWx0czxTZWxlY3RvcnM+XG4pID0+IFJlc3VsdDtcblxuQEluamVjdGFibGUoKVxuZXhwb3J0IGNsYXNzIENvbXBvbmVudFN0b3JlPFQgZXh0ZW5kcyBvYmplY3Q+IGltcGxlbWVudHMgT25EZXN0cm95IHtcbiAgLy8gU2hvdWxkIGJlIHVzZWQgb25seSBpbiBuZ09uRGVzdHJveS5cbiAgcHJpdmF0ZSByZWFkb25seSBkZXN0cm95U3ViamVjdCQgPSBuZXcgUmVwbGF5U3ViamVjdDx2b2lkPigxKTtcbiAgLy8gRXhwb3NlZCB0byBhbnkgZXh0ZW5kaW5nIFN0b3JlIHRvIGJlIHVzZWQgZm9yIHRoZSB0ZWFyZG93bi5cbiAgcmVhZG9ubHkgZGVzdHJveSQgPSB0aGlzLmRlc3Ryb3lTdWJqZWN0JC5hc09ic2VydmFibGUoKTtcblxuICBwcml2YXRlIHJlYWRvbmx5IHN0YXRlU3ViamVjdCQgPSBuZXcgUmVwbGF5U3ViamVjdDxUPigxKTtcbiAgcHJpdmF0ZSBpc0luaXRpYWxpemVkID0gZmFsc2U7XG4gIHByaXZhdGUgbm90SW5pdGlhbGl6ZWRFcnJvck1lc3NhZ2UgPVxuICAgIGAke3RoaXMuY29uc3RydWN0b3IubmFtZX0gaGFzIG5vdCBiZWVuIGluaXRpYWxpemVkIHlldC4gYCArXG4gICAgYFBsZWFzZSBtYWtlIHN1cmUgaXQgaXMgaW5pdGlhbGl6ZWQgYmVmb3JlIHVwZGF0aW5nL2dldHRpbmcuYDtcbiAgLy8gTmVlZHMgdG8gYmUgYWZ0ZXIgZGVzdHJveSQgaXMgZGVjbGFyZWQgYmVjYXVzZSBpdCdzIHVzZWQgaW4gc2VsZWN0LlxuICByZWFkb25seSBzdGF0ZSQ6IE9ic2VydmFibGU8VD4gPSB0aGlzLnNlbGVjdCgocykgPT4gcyk7XG5cbiAgY29uc3RydWN0b3IoQE9wdGlvbmFsKCkgQEluamVjdChJTklUSUFMX1NUQVRFX1RPS0VOKSBkZWZhdWx0U3RhdGU/OiBUKSB7XG4gICAgLy8gU3RhdGUgY2FuIGJlIGluaXRpYWxpemVkIGVpdGhlciB0aHJvdWdoIGNvbnN0cnVjdG9yIG9yIHNldFN0YXRlLlxuICAgIGlmIChkZWZhdWx0U3RhdGUpIHtcbiAgICAgIHRoaXMuaW5pdFN0YXRlKGRlZmF1bHRTdGF0ZSk7XG4gICAgfVxuICB9XG5cbiAgLyoqIENvbXBsZXRlcyBhbGwgcmVsZXZhbnQgT2JzZXJ2YWJsZSBzdHJlYW1zLiAqL1xuICBuZ09uRGVzdHJveSgpIHtcbiAgICB0aGlzLnN0YXRlU3ViamVjdCQuY29tcGxldGUoKTtcbiAgICB0aGlzLmRlc3Ryb3lTdWJqZWN0JC5uZXh0KCk7XG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlcyBhbiB1cGRhdGVyLlxuICAgKlxuICAgKiBUaHJvd3MgYW4gZXJyb3IgaWYgdXBkYXRlciBpcyBjYWxsZWQgd2l0aCBzeW5jaHJvbm91cyB2YWx1ZXMgKGVpdGhlclxuICAgKiBpbXBlcmF0aXZlIHZhbHVlIG9yIE9ic2VydmFibGUgdGhhdCBpcyBzeW5jaHJvbm91cykgYmVmb3JlIENvbXBvbmVudFN0b3JlXG4gICAqIGlzIGluaXRpYWxpemVkLiBJZiBjYWxsZWQgd2l0aCBhc3luYyBPYnNlcnZhYmxlIGJlZm9yZSBpbml0aWFsaXphdGlvbiB0aGVuXG4gICAqIHN0YXRlIHdpbGwgbm90IGJlIHVwZGF0ZWQgYW5kIHN1YnNjcmlwdGlvbiB3b3VsZCBiZSBjbG9zZWQuXG4gICAqXG4gICAqIEBwYXJhbSB1cGRhdGVyRm4gQSBzdGF0aWMgdXBkYXRlciBmdW5jdGlvbiB0aGF0IHRha2VzIDIgcGFyYW1ldGVycyAodGhlXG4gICAqIGN1cnJlbnQgc3RhdGUgYW5kIGFuIGFyZ3VtZW50IG9iamVjdCkgYW5kIHJldHVybnMgYSBuZXcgaW5zdGFuY2Ugb2YgdGhlXG4gICAqIHN0YXRlLlxuICAgKiBAcmV0dXJuIEEgZnVuY3Rpb24gdGhhdCBhY2NlcHRzIG9uZSBhcmd1bWVudCB3aGljaCBpcyBmb3J3YXJkZWQgYXMgdGhlXG4gICAqICAgICBzZWNvbmQgYXJndW1lbnQgdG8gYHVwZGF0ZXJGbmAuIEV2ZXJ5IHRpbWUgdGhpcyBmdW5jdGlvbiBpcyBjYWxsZWRcbiAgICogICAgIHN1YnNjcmliZXJzIHdpbGwgYmUgbm90aWZpZWQgb2YgdGhlIHN0YXRlIGNoYW5nZS5cbiAgICovXG4gIHVwZGF0ZXI8XG4gICAgLy8gQWxsb3cgdG8gZm9yY2UtcHJvdmlkZSB0aGUgdHlwZVxuICAgIFByb3ZpZGVkVHlwZSA9IHZvaWQsXG4gICAgLy8gVGhpcyB0eXBlIGlzIGRlcml2ZWQgZnJvbSB0aGUgYHZhbHVlYCBwcm9wZXJ0eSwgZGVmYXVsdGluZyB0byB2b2lkIGlmIGl0J3MgbWlzc2luZ1xuICAgIE9yaWdpblR5cGUgPSBQcm92aWRlZFR5cGUsXG4gICAgLy8gVGhlIFZhbHVlIHR5cGUgaXMgYXNzaWduZWQgZnJvbSB0aGUgT3JpZ2luXG4gICAgVmFsdWVUeXBlID0gT3JpZ2luVHlwZSxcbiAgICAvLyBSZXR1cm4gZWl0aGVyIGFuIGVtcHR5IGNhbGxiYWNrIG9yIGEgZnVuY3Rpb24gcmVxdWlyaW5nIHNwZWNpZmljIHR5cGVzIGFzIGlucHV0c1xuICAgIFJldHVyblR5cGUgPSBPcmlnaW5UeXBlIGV4dGVuZHMgdm9pZFxuICAgICAgPyAoKSA9PiB2b2lkXG4gICAgICA6IChvYnNlcnZhYmxlT3JWYWx1ZTogVmFsdWVUeXBlIHwgT2JzZXJ2YWJsZTxWYWx1ZVR5cGU+KSA9PiBTdWJzY3JpcHRpb25cbiAgPih1cGRhdGVyRm46IChzdGF0ZTogVCwgdmFsdWU6IE9yaWdpblR5cGUpID0+IFQpOiBSZXR1cm5UeXBlIHtcbiAgICByZXR1cm4gKCgoXG4gICAgICBvYnNlcnZhYmxlT3JWYWx1ZT86IE9yaWdpblR5cGUgfCBPYnNlcnZhYmxlPE9yaWdpblR5cGU+XG4gICAgKTogU3Vic2NyaXB0aW9uID0+IHtcbiAgICAgIGxldCBpbml0aWFsaXphdGlvbkVycm9yOiBFcnJvciB8IHVuZGVmaW5lZDtcbiAgICAgIC8vIFdlIGNhbiByZWNlaXZlIGVpdGhlciB0aGUgdmFsdWUgb3IgYW4gb2JzZXJ2YWJsZS4gSW4gY2FzZSBpdCdzIGFcbiAgICAgIC8vIHNpbXBsZSB2YWx1ZSwgd2UnbGwgd3JhcCBpdCB3aXRoIGBvZmAgb3BlcmF0b3IgdG8gdHVybiBpdCBpbnRvXG4gICAgICAvLyBPYnNlcnZhYmxlLlxuICAgICAgY29uc3Qgb2JzZXJ2YWJsZSQgPSBpc09ic2VydmFibGUob2JzZXJ2YWJsZU9yVmFsdWUpXG4gICAgICAgID8gb2JzZXJ2YWJsZU9yVmFsdWVcbiAgICAgICAgOiBvZihvYnNlcnZhYmxlT3JWYWx1ZSk7XG4gICAgICBjb25zdCBzdWJzY3JpcHRpb24gPSBvYnNlcnZhYmxlJFxuICAgICAgICAucGlwZShcbiAgICAgICAgICBjb25jYXRNYXAoKHZhbHVlKSA9PlxuICAgICAgICAgICAgdGhpcy5pc0luaXRpYWxpemVkXG4gICAgICAgICAgICAgID8gLy8gUHVzaCB0aGUgdmFsdWUgaW50byBxdWV1ZVNjaGVkdWxlclxuICAgICAgICAgICAgICAgIHNjaGVkdWxlZChbdmFsdWVdLCBxdWV1ZVNjaGVkdWxlcikucGlwZShcbiAgICAgICAgICAgICAgICAgIHdpdGhMYXRlc3RGcm9tKHRoaXMuc3RhdGVTdWJqZWN0JClcbiAgICAgICAgICAgICAgICApXG4gICAgICAgICAgICAgIDogLy8gSWYgc3RhdGUgd2FzIG5vdCBpbml0aWFsaXplZCwgd2UnbGwgdGhyb3cgYW4gZXJyb3IuXG4gICAgICAgICAgICAgICAgdGhyb3dFcnJvcihuZXcgRXJyb3IodGhpcy5ub3RJbml0aWFsaXplZEVycm9yTWVzc2FnZSkpXG4gICAgICAgICAgKSxcbiAgICAgICAgICB0YWtlVW50aWwodGhpcy5kZXN0cm95JClcbiAgICAgICAgKVxuICAgICAgICAuc3Vic2NyaWJlKHtcbiAgICAgICAgICBuZXh0OiAoW3ZhbHVlLCBjdXJyZW50U3RhdGVdKSA9PiB7XG4gICAgICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLW5vbi1udWxsLWFzc2VydGlvblxuICAgICAgICAgICAgdGhpcy5zdGF0ZVN1YmplY3QkLm5leHQodXBkYXRlckZuKGN1cnJlbnRTdGF0ZSwgdmFsdWUhKSk7XG4gICAgICAgICAgfSxcbiAgICAgICAgICBlcnJvcjogKGVycm9yOiBFcnJvcikgPT4ge1xuICAgICAgICAgICAgaW5pdGlhbGl6YXRpb25FcnJvciA9IGVycm9yO1xuICAgICAgICAgICAgdGhpcy5zdGF0ZVN1YmplY3QkLmVycm9yKGVycm9yKTtcbiAgICAgICAgICB9LFxuICAgICAgICB9KTtcblxuICAgICAgaWYgKGluaXRpYWxpemF0aW9uRXJyb3IpIHtcbiAgICAgICAgLy8gcHJldHRpZXItaWdub3JlXG4gICAgICAgIHRocm93IC8qKiBAdHlwZSB7IUVycm9yfSAqLyAoaW5pdGlhbGl6YXRpb25FcnJvcik7XG4gICAgICB9XG4gICAgICByZXR1cm4gc3Vic2NyaXB0aW9uO1xuICAgIH0pIGFzIHVua25vd24pIGFzIFJldHVyblR5cGU7XG4gIH1cblxuICAvKipcbiAgICogSW5pdGlhbGl6ZXMgc3RhdGUuIElmIGl0IHdhcyBhbHJlYWR5IGluaXRpYWxpemVkIHRoZW4gaXQgcmVzZXRzIHRoZVxuICAgKiBzdGF0ZS5cbiAgICovXG4gIHByaXZhdGUgaW5pdFN0YXRlKHN0YXRlOiBUKTogdm9pZCB7XG4gICAgc2NoZWR1bGVkKFtzdGF0ZV0sIHF1ZXVlU2NoZWR1bGVyKS5zdWJzY3JpYmUoKHMpID0+IHtcbiAgICAgIHRoaXMuaXNJbml0aWFsaXplZCA9IHRydWU7XG4gICAgICB0aGlzLnN0YXRlU3ViamVjdCQubmV4dChzKTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBTZXRzIHRoZSBzdGF0ZSBzcGVjaWZpYyB2YWx1ZS5cbiAgICogQHBhcmFtIHN0YXRlT3JVcGRhdGVyRm4gb2JqZWN0IG9mIHRoZSBzYW1lIHR5cGUgYXMgdGhlIHN0YXRlIG9yIGFuXG4gICAqIHVwZGF0ZXJGbiwgcmV0dXJuaW5nIHN1Y2ggb2JqZWN0LlxuICAgKi9cbiAgc2V0U3RhdGUoc3RhdGVPclVwZGF0ZXJGbjogVCB8ICgoc3RhdGU6IFQpID0+IFQpKTogdm9pZCB7XG4gICAgaWYgKHR5cGVvZiBzdGF0ZU9yVXBkYXRlckZuICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICB0aGlzLmluaXRTdGF0ZShzdGF0ZU9yVXBkYXRlckZuKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy51cGRhdGVyKHN0YXRlT3JVcGRhdGVyRm4gYXMgKHN0YXRlOiBUKSA9PiBUKSgpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBQYXRjaGVzIHRoZSBzdGF0ZSB3aXRoIHByb3ZpZGVkIHBhcnRpYWwgc3RhdGUuXG4gICAqXG4gICAqIEBwYXJhbSBwYXJ0aWFsU3RhdGVPclVwZGF0ZXJGbiBhIHBhcnRpYWwgc3RhdGUgb3IgYSBwYXJ0aWFsIHVwZGF0ZXJcbiAgICogZnVuY3Rpb24gdGhhdCBhY2NlcHRzIHRoZSBzdGF0ZSBhbmQgcmV0dXJucyB0aGUgcGFydGlhbCBzdGF0ZS5cbiAgICogQHRocm93cyBFcnJvciBpZiB0aGUgc3RhdGUgaXMgbm90IGluaXRpYWxpemVkLlxuICAgKi9cbiAgcGF0Y2hTdGF0ZShcbiAgICBwYXJ0aWFsU3RhdGVPclVwZGF0ZXJGbjpcbiAgICAgIHwgUGFydGlhbDxUPlxuICAgICAgfCBPYnNlcnZhYmxlPFBhcnRpYWw8VD4+XG4gICAgICB8ICgoc3RhdGU6IFQpID0+IFBhcnRpYWw8VD4pXG4gICk6IHZvaWQge1xuICAgIGNvbnN0IHBhdGNoZWRTdGF0ZSA9XG4gICAgICB0eXBlb2YgcGFydGlhbFN0YXRlT3JVcGRhdGVyRm4gPT09ICdmdW5jdGlvbidcbiAgICAgICAgPyBwYXJ0aWFsU3RhdGVPclVwZGF0ZXJGbih0aGlzLmdldCgpKVxuICAgICAgICA6IHBhcnRpYWxTdGF0ZU9yVXBkYXRlckZuO1xuXG4gICAgdGhpcy51cGRhdGVyKChzdGF0ZSwgcGFydGlhbFN0YXRlOiBQYXJ0aWFsPFQ+KSA9PiAoe1xuICAgICAgLi4uc3RhdGUsXG4gICAgICAuLi5wYXJ0aWFsU3RhdGUsXG4gICAgfSkpKHBhdGNoZWRTdGF0ZSk7XG4gIH1cblxuICBwcm90ZWN0ZWQgZ2V0KCk6IFQ7XG4gIHByb3RlY3RlZCBnZXQ8Uj4ocHJvamVjdG9yOiAoczogVCkgPT4gUik6IFI7XG4gIHByb3RlY3RlZCBnZXQ8Uj4ocHJvamVjdG9yPzogKHM6IFQpID0+IFIpOiBSIHwgVCB7XG4gICAgaWYgKCF0aGlzLmlzSW5pdGlhbGl6ZWQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcih0aGlzLm5vdEluaXRpYWxpemVkRXJyb3JNZXNzYWdlKTtcbiAgICB9XG4gICAgbGV0IHZhbHVlOiBSIHwgVDtcblxuICAgIHRoaXMuc3RhdGVTdWJqZWN0JC5waXBlKHRha2UoMSkpLnN1YnNjcmliZSgoc3RhdGUpID0+IHtcbiAgICAgIHZhbHVlID0gcHJvamVjdG9yID8gcHJvamVjdG9yKHN0YXRlKSA6IHN0YXRlO1xuICAgIH0pO1xuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tbm9uLW51bGwtYXNzZXJ0aW9uXG4gICAgcmV0dXJuIHZhbHVlITtcbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgc2VsZWN0b3IuXG4gICAqXG4gICAqIEBwYXJhbSBwcm9qZWN0b3IgQSBwdXJlIHByb2plY3Rpb24gZnVuY3Rpb24gdGhhdCB0YWtlcyB0aGUgY3VycmVudCBzdGF0ZSBhbmRcbiAgICogICByZXR1cm5zIHNvbWUgbmV3IHNsaWNlL3Byb2plY3Rpb24gb2YgdGhhdCBzdGF0ZS5cbiAgICogQHBhcmFtIGNvbmZpZyBTZWxlY3RDb25maWcgdGhhdCBjaGFuZ2VzIHRoZSBiZWhhdmlvciBvZiBzZWxlY3RvciwgaW5jbHVkaW5nXG4gICAqICAgdGhlIGRlYm91bmNpbmcgb2YgdGhlIHZhbHVlcyB1bnRpbCB0aGUgc3RhdGUgaXMgc2V0dGxlZC5cbiAgICogQHJldHVybiBBbiBvYnNlcnZhYmxlIG9mIHRoZSBwcm9qZWN0b3IgcmVzdWx0cy5cbiAgICovXG4gIHNlbGVjdDxSZXN1bHQ+KFxuICAgIHByb2plY3RvcjogKHM6IFQpID0+IFJlc3VsdCxcbiAgICBjb25maWc/OiBTZWxlY3RDb25maWdcbiAgKTogT2JzZXJ2YWJsZTxSZXN1bHQ+O1xuICBzZWxlY3Q8U2VsZWN0b3JzIGV4dGVuZHMgT2JzZXJ2YWJsZTx1bmtub3duPltdLCBSZXN1bHQ+KFxuICAgIC4uLmFyZ3M6IFsuLi5zZWxlY3RvcnM6IFNlbGVjdG9ycywgcHJvamVjdG9yOiBQcm9qZWN0b3I8U2VsZWN0b3JzLCBSZXN1bHQ+XVxuICApOiBPYnNlcnZhYmxlPFJlc3VsdD47XG4gIHNlbGVjdDxTZWxlY3RvcnMgZXh0ZW5kcyBPYnNlcnZhYmxlPHVua25vd24+W10sIFJlc3VsdD4oXG4gICAgLi4uYXJnczogW1xuICAgICAgLi4uc2VsZWN0b3JzOiBTZWxlY3RvcnMsXG4gICAgICBwcm9qZWN0b3I6IFByb2plY3RvcjxTZWxlY3RvcnMsIFJlc3VsdD4sXG4gICAgICBjb25maWc6IFNlbGVjdENvbmZpZ1xuICAgIF1cbiAgKTogT2JzZXJ2YWJsZTxSZXN1bHQ+O1xuICBzZWxlY3Q8XG4gICAgU2VsZWN0b3JzIGV4dGVuZHMgQXJyYXk8T2JzZXJ2YWJsZTx1bmtub3duPiB8IFNlbGVjdENvbmZpZyB8IFByb2plY3RvckZuPixcbiAgICBSZXN1bHQsXG4gICAgUHJvamVjdG9yRm4gPSAoLi4uYTogdW5rbm93bltdKSA9PiBSZXN1bHRcbiAgPiguLi5hcmdzOiBTZWxlY3RvcnMpOiBPYnNlcnZhYmxlPFJlc3VsdD4ge1xuICAgIGNvbnN0IHsgb2JzZXJ2YWJsZXMsIHByb2plY3RvciwgY29uZmlnIH0gPSBwcm9jZXNzU2VsZWN0b3JBcmdzPFxuICAgICAgU2VsZWN0b3JzLFxuICAgICAgUmVzdWx0XG4gICAgPihhcmdzKTtcblxuICAgIGxldCBvYnNlcnZhYmxlJDogT2JzZXJ2YWJsZTxSZXN1bHQ+O1xuICAgIC8vIElmIHRoZXJlIGFyZSBubyBPYnNlcnZhYmxlcyB0byBjb21iaW5lLCB0aGVuIHdlJ2xsIGp1c3QgbWFwIHRoZSB2YWx1ZS5cbiAgICBpZiAob2JzZXJ2YWJsZXMubGVuZ3RoID09PSAwKSB7XG4gICAgICBvYnNlcnZhYmxlJCA9IHRoaXMuc3RhdGVTdWJqZWN0JC5waXBlKFxuICAgICAgICBjb25maWcuZGVib3VuY2UgPyBkZWJvdW5jZVN5bmMoKSA6IChzb3VyY2UkKSA9PiBzb3VyY2UkLFxuICAgICAgICBtYXAocHJvamVjdG9yKVxuICAgICAgKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gSWYgdGhlcmUgYXJlIG11bHRpcGxlIGFyZ3VtZW50cywgdGhlbiB3ZSdyZSBhZ2dyZWdhdGluZyBzZWxlY3RvcnMsIHNvIHdlIG5lZWRcbiAgICAgIC8vIHRvIHRha2UgdGhlIGNvbWJpbmVMYXRlc3Qgb2YgdGhlbSBiZWZvcmUgY2FsbGluZyB0aGUgbWFwIGZ1bmN0aW9uLlxuICAgICAgb2JzZXJ2YWJsZSQgPSBjb21iaW5lTGF0ZXN0KG9ic2VydmFibGVzKS5waXBlKFxuICAgICAgICBjb25maWcuZGVib3VuY2UgPyBkZWJvdW5jZVN5bmMoKSA6IChzb3VyY2UkKSA9PiBzb3VyY2UkLFxuICAgICAgICBtYXAoKHByb2plY3RvckFyZ3MpID0+IHByb2plY3RvciguLi5wcm9qZWN0b3JBcmdzKSlcbiAgICAgICk7XG4gICAgfVxuXG4gICAgcmV0dXJuIG9ic2VydmFibGUkLnBpcGUoXG4gICAgICBkaXN0aW5jdFVudGlsQ2hhbmdlZCgpLFxuICAgICAgc2hhcmVSZXBsYXkoe1xuICAgICAgICByZWZDb3VudDogdHJ1ZSxcbiAgICAgICAgYnVmZmVyU2l6ZTogMSxcbiAgICAgIH0pLFxuICAgICAgdGFrZVVudGlsKHRoaXMuZGVzdHJveSQpXG4gICAgKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGVzIGFuIGVmZmVjdC5cbiAgICpcbiAgICogVGhpcyBlZmZlY3QgaXMgc3Vic2NyaWJlZCB0byB0aHJvdWdob3V0IHRoZSBsaWZlY3ljbGUgb2YgdGhlIENvbXBvbmVudFN0b3JlLlxuICAgKiBAcGFyYW0gZ2VuZXJhdG9yIEEgZnVuY3Rpb24gdGhhdCB0YWtlcyBhbiBvcmlnaW4gT2JzZXJ2YWJsZSBpbnB1dCBhbmRcbiAgICogICAgIHJldHVybnMgYW4gT2JzZXJ2YWJsZS4gVGhlIE9ic2VydmFibGUgdGhhdCBpcyByZXR1cm5lZCB3aWxsIGJlXG4gICAqICAgICBzdWJzY3JpYmVkIHRvIGZvciB0aGUgbGlmZSBvZiB0aGUgY29tcG9uZW50LlxuICAgKiBAcmV0dXJuIEEgZnVuY3Rpb24gdGhhdCwgd2hlbiBjYWxsZWQsIHdpbGwgdHJpZ2dlciB0aGUgb3JpZ2luIE9ic2VydmFibGUuXG4gICAqL1xuICBlZmZlY3Q8XG4gICAgLy8gVGhpcyB0eXBlIHF1aWNrbHkgYmVjYW1lIHBhcnQgb2YgZWZmZWN0ICdBUEknXG4gICAgUHJvdmlkZWRUeXBlID0gdm9pZCxcbiAgICAvLyBUaGUgYWN0dWFsIG9yaWdpbiQgdHlwZSwgd2hpY2ggY291bGQgYmUgdW5rbm93biwgd2hlbiBub3Qgc3BlY2lmaWVkXG4gICAgT3JpZ2luVHlwZSBleHRlbmRzXG4gICAgICB8IE9ic2VydmFibGU8UHJvdmlkZWRUeXBlPlxuICAgICAgfCB1bmtub3duID0gT2JzZXJ2YWJsZTxQcm92aWRlZFR5cGU+LFxuICAgIC8vIFVud3JhcHBlZCBhY3R1YWwgdHlwZSBvZiB0aGUgb3JpZ2luJCBPYnNlcnZhYmxlLCBhZnRlciBkZWZhdWx0IHdhcyBhcHBsaWVkXG4gICAgT2JzZXJ2YWJsZVR5cGUgPSBPcmlnaW5UeXBlIGV4dGVuZHMgT2JzZXJ2YWJsZTxpbmZlciBBPiA/IEEgOiBuZXZlcixcbiAgICAvLyBSZXR1cm4gZWl0aGVyIGFuIGVtcHR5IGNhbGxiYWNrIG9yIGEgZnVuY3Rpb24gcmVxdWlyaW5nIHNwZWNpZmljIHR5cGVzIGFzIGlucHV0c1xuICAgIFJldHVyblR5cGUgPSBQcm92aWRlZFR5cGUgfCBPYnNlcnZhYmxlVHlwZSBleHRlbmRzIHZvaWRcbiAgICAgID8gKCkgPT4gdm9pZFxuICAgICAgOiAoXG4gICAgICAgICAgb2JzZXJ2YWJsZU9yVmFsdWU6IE9ic2VydmFibGVUeXBlIHwgT2JzZXJ2YWJsZTxPYnNlcnZhYmxlVHlwZT5cbiAgICAgICAgKSA9PiBTdWJzY3JpcHRpb25cbiAgPihnZW5lcmF0b3I6IChvcmlnaW4kOiBPcmlnaW5UeXBlKSA9PiBPYnNlcnZhYmxlPHVua25vd24+KTogUmV0dXJuVHlwZSB7XG4gICAgY29uc3Qgb3JpZ2luJCA9IG5ldyBTdWJqZWN0PE9ic2VydmFibGVUeXBlPigpO1xuICAgIGdlbmVyYXRvcihvcmlnaW4kIGFzIE9yaWdpblR5cGUpXG4gICAgICAvLyB0aWVkIHRvIHRoZSBsaWZlY3ljbGUg8J+RhyBvZiBDb21wb25lbnRTdG9yZVxuICAgICAgLnBpcGUodGFrZVVudGlsKHRoaXMuZGVzdHJveSQpKVxuICAgICAgLnN1YnNjcmliZSgpO1xuXG4gICAgcmV0dXJuICgoKFxuICAgICAgb2JzZXJ2YWJsZU9yVmFsdWU/OiBPYnNlcnZhYmxlVHlwZSB8IE9ic2VydmFibGU8T2JzZXJ2YWJsZVR5cGU+XG4gICAgKTogU3Vic2NyaXB0aW9uID0+IHtcbiAgICAgIGNvbnN0IG9ic2VydmFibGUkID0gaXNPYnNlcnZhYmxlKG9ic2VydmFibGVPclZhbHVlKVxuICAgICAgICA/IG9ic2VydmFibGVPclZhbHVlXG4gICAgICAgIDogb2Yob2JzZXJ2YWJsZU9yVmFsdWUpO1xuICAgICAgcmV0dXJuIG9ic2VydmFibGUkLnBpcGUodGFrZVVudGlsKHRoaXMuZGVzdHJveSQpKS5zdWJzY3JpYmUoKHZhbHVlKSA9PiB7XG4gICAgICAgIC8vIGFueSBuZXcg8J+RhyB2YWx1ZSBpcyBwdXNoZWQgaW50byBhIHN0cmVhbVxuICAgICAgICBvcmlnaW4kLm5leHQodmFsdWUpO1xuICAgICAgfSk7XG4gICAgfSkgYXMgdW5rbm93bikgYXMgUmV0dXJuVHlwZTtcbiAgfVxufVxuXG5mdW5jdGlvbiBwcm9jZXNzU2VsZWN0b3JBcmdzPFxuICBTZWxlY3RvcnMgZXh0ZW5kcyBBcnJheTxPYnNlcnZhYmxlPHVua25vd24+IHwgU2VsZWN0Q29uZmlnIHwgUHJvamVjdG9yRm4+LFxuICBSZXN1bHQsXG4gIFByb2plY3RvckZuID0gKC4uLmE6IHVua25vd25bXSkgPT4gUmVzdWx0XG4+KFxuICBhcmdzOiBTZWxlY3RvcnNcbik6IHtcbiAgb2JzZXJ2YWJsZXM6IE9ic2VydmFibGU8dW5rbm93bj5bXTtcbiAgcHJvamVjdG9yOiBQcm9qZWN0b3JGbjtcbiAgY29uZmlnOiBSZXF1aXJlZDxTZWxlY3RDb25maWc+O1xufSB7XG4gIGNvbnN0IHNlbGVjdG9yQXJncyA9IEFycmF5LmZyb20oYXJncyk7XG4gIC8vIEFzc2lnbiBkZWZhdWx0IHZhbHVlcy5cbiAgbGV0IGNvbmZpZzogUmVxdWlyZWQ8U2VsZWN0Q29uZmlnPiA9IHsgZGVib3VuY2U6IGZhbHNlIH07XG4gIGxldCBwcm9qZWN0b3I6IFByb2plY3RvckZuO1xuICAvLyBMYXN0IGFyZ3VtZW50IGlzIGVpdGhlciBwcm9qZWN0b3Igb3IgY29uZmlnXG4gIGNvbnN0IHByb2plY3Rvck9yQ29uZmlnID0gc2VsZWN0b3JBcmdzLnBvcCgpIGFzIFByb2plY3RvckZuIHwgU2VsZWN0Q29uZmlnO1xuXG4gIGlmICh0eXBlb2YgcHJvamVjdG9yT3JDb25maWcgIT09ICdmdW5jdGlvbicpIHtcbiAgICAvLyBXZSBnb3QgdGhlIGNvbmZpZyBhcyB0aGUgbGFzdCBhcmd1bWVudCwgcmVwbGFjZSBhbnkgZGVmYXVsdCB2YWx1ZXMgd2l0aCBpdC5cbiAgICBjb25maWcgPSB7IC4uLmNvbmZpZywgLi4ucHJvamVjdG9yT3JDb25maWcgfTtcbiAgICAvLyBQb3AgdGhlIG5leHQgYXJncywgd2hpY2ggd291bGQgYmUgdGhlIHByb2plY3RvciBmbi5cbiAgICBwcm9qZWN0b3IgPSBzZWxlY3RvckFyZ3MucG9wKCkgYXMgUHJvamVjdG9yRm47XG4gIH0gZWxzZSB7XG4gICAgcHJvamVjdG9yID0gcHJvamVjdG9yT3JDb25maWc7XG4gIH1cbiAgLy8gVGhlIE9ic2VydmFibGVzIHRvIGNvbWJpbmUsIGlmIHRoZXJlIGFyZSBhbnkuXG4gIGNvbnN0IG9ic2VydmFibGVzID0gc2VsZWN0b3JBcmdzIGFzIE9ic2VydmFibGU8dW5rbm93bj5bXTtcbiAgcmV0dXJuIHtcbiAgICBvYnNlcnZhYmxlcyxcbiAgICBwcm9qZWN0b3IsXG4gICAgY29uZmlnLFxuICB9O1xufVxuIl19