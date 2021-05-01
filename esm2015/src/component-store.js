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
ComponentStore.decorators = [
    { type: Injectable }
];
/** @nocollapse */
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcG9uZW50LXN0b3JlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vbW9kdWxlcy9jb21wb25lbnQtc3RvcmUvc3JjL2NvbXBvbmVudC1zdG9yZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQ0wsWUFBWSxFQUVaLEVBQUUsRUFDRixhQUFhLEVBRWIsVUFBVSxFQUNWLGFBQWEsRUFDYixPQUFPLEVBQ1AsY0FBYyxFQUNkLFNBQVMsR0FDVixNQUFNLE1BQU0sQ0FBQztBQUNkLE9BQU8sRUFDTCxTQUFTLEVBQ1QsU0FBUyxFQUNULGNBQWMsRUFDZCxHQUFHLEVBQ0gsb0JBQW9CLEVBQ3BCLFdBQVcsRUFDWCxJQUFJLEdBQ0wsTUFBTSxnQkFBZ0IsQ0FBQztBQUN4QixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFDL0MsT0FBTyxFQUNMLFVBQVUsRUFFVixRQUFRLEVBQ1IsY0FBYyxFQUNkLE1BQU0sR0FDUCxNQUFNLGVBQWUsQ0FBQztBQU12QixNQUFNLENBQUMsTUFBTSxtQkFBbUIsR0FBRyxJQUFJLGNBQWMsQ0FDbkQscUNBQXFDLENBQ3RDLENBQUM7QUFhRixNQUFNLE9BQU8sY0FBYztJQWN6QixZQUFxRCxZQUFnQjtRQWJyRSxzQ0FBc0M7UUFDckIsb0JBQWUsR0FBRyxJQUFJLGFBQWEsQ0FBTyxDQUFDLENBQUMsQ0FBQztRQUM5RCw4REFBOEQ7UUFDckQsYUFBUSxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsWUFBWSxFQUFFLENBQUM7UUFFdkMsa0JBQWEsR0FBRyxJQUFJLGFBQWEsQ0FBSSxDQUFDLENBQUMsQ0FBQztRQUNqRCxrQkFBYSxHQUFHLEtBQUssQ0FBQztRQUN0QiwrQkFBMEIsR0FDaEMsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksaUNBQWlDO1lBQ3pELDZEQUE2RCxDQUFDO1FBQ2hFLHNFQUFzRTtRQUM3RCxXQUFNLEdBQWtCLElBQUksQ0FB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QyxLQUFLLEVBQUUsRUFBRTtnQkFDcEUsMkNBQTJDO2dCQUMzQyxPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ3RCLENBQUMsQ0FBQyxDQUFDO1FBQ0wsQ0FBQyxDQUEyQixDQUFDO0lBQy9CLENBQUM7OztZQXJRRixVQUFVOzs7OzRDQWVJLFFBQVEsWUFBSSxNQUFNLFNBQUMsbUJBQW1COztBQXlQckQsU0FBUyxtQkFBbUIsQ0FLMUIsSUFBZTtJQU1mLE1BQU0sWUFBWSxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDdEMseUJBQXlCO0lBQ3pCLElBQUksTUFBTSxHQUEyQixFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsQ0FBQztJQUN6RCxJQUFJLFNBQXNCLENBQUM7SUFDM0IsOENBQThDO0lBQzlDLE1BQU0saUJBQWlCLEdBQUcsWUFBWSxDQUFDLEdBQUcsRUFBZ0MsQ0FBQztJQUUzRSxJQUFJLE9BQU8saUJBQWlCLEtBQUssVUFBVSxFQUFFO1FBQzNDLDhFQUE4RTtRQUM5RSxNQUFNLG1DQUFRLE1BQU0sR0FBSyxpQkFBaUIsQ0FBRSxDQUFDO1FBQzdDLHNEQUFzRDtRQUN0RCxTQUFTLEdBQUcsWUFBWSxDQUFDLEdBQUcsRUFBaUIsQ0FBQztLQUMvQztTQUFNO1FBQ0wsU0FBUyxHQUFHLGlCQUFpQixDQUFDO0tBQy9CO0lBQ0QsZ0RBQWdEO0lBQ2hELE1BQU0sV0FBVyxHQUFHLFlBQXFDLENBQUM7SUFDMUQsT0FBTztRQUNMLFdBQVc7UUFDWCxTQUFTO1FBQ1QsTUFBTTtLQUNQLENBQUM7QUFDSixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtcbiAgaXNPYnNlcnZhYmxlLFxuICBPYnNlcnZhYmxlLFxuICBvZixcbiAgUmVwbGF5U3ViamVjdCxcbiAgU3Vic2NyaXB0aW9uLFxuICB0aHJvd0Vycm9yLFxuICBjb21iaW5lTGF0ZXN0LFxuICBTdWJqZWN0LFxuICBxdWV1ZVNjaGVkdWxlcixcbiAgc2NoZWR1bGVkLFxufSBmcm9tICdyeGpzJztcbmltcG9ydCB7XG4gIGNvbmNhdE1hcCxcbiAgdGFrZVVudGlsLFxuICB3aXRoTGF0ZXN0RnJvbSxcbiAgbWFwLFxuICBkaXN0aW5jdFVudGlsQ2hhbmdlZCxcbiAgc2hhcmVSZXBsYXksXG4gIHRha2UsXG59IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCB7IGRlYm91bmNlU3luYyB9IGZyb20gJy4vZGVib3VuY2Utc3luYyc7XG5pbXBvcnQge1xuICBJbmplY3RhYmxlLFxuICBPbkRlc3Ryb3ksXG4gIE9wdGlvbmFsLFxuICBJbmplY3Rpb25Ub2tlbixcbiAgSW5qZWN0LFxufSBmcm9tICdAYW5ndWxhci9jb3JlJztcblxuZXhwb3J0IGludGVyZmFjZSBTZWxlY3RDb25maWcge1xuICBkZWJvdW5jZT86IGJvb2xlYW47XG59XG5cbmV4cG9ydCBjb25zdCBJTklUSUFMX1NUQVRFX1RPS0VOID0gbmV3IEluamVjdGlvblRva2VuKFxuICAnQG5ncngvY29tcG9uZW50LXN0b3JlIEluaXRpYWwgU3RhdGUnXG4pO1xuXG5leHBvcnQgdHlwZSBTZWxlY3RvclJlc3VsdHM8U2VsZWN0b3JzIGV4dGVuZHMgT2JzZXJ2YWJsZTx1bmtub3duPltdPiA9IHtcbiAgW0tleSBpbiBrZXlvZiBTZWxlY3RvcnNdOiBTZWxlY3RvcnNbS2V5XSBleHRlbmRzIE9ic2VydmFibGU8aW5mZXIgVT5cbiAgICA/IFVcbiAgICA6IG5ldmVyO1xufTtcblxuZXhwb3J0IHR5cGUgUHJvamVjdG9yPFNlbGVjdG9ycyBleHRlbmRzIE9ic2VydmFibGU8dW5rbm93bj5bXSwgUmVzdWx0PiA9IChcbiAgLi4uYXJnczogU2VsZWN0b3JSZXN1bHRzPFNlbGVjdG9ycz5cbikgPT4gUmVzdWx0O1xuXG5ASW5qZWN0YWJsZSgpXG5leHBvcnQgY2xhc3MgQ29tcG9uZW50U3RvcmU8VCBleHRlbmRzIG9iamVjdD4gaW1wbGVtZW50cyBPbkRlc3Ryb3kge1xuICAvLyBTaG91bGQgYmUgdXNlZCBvbmx5IGluIG5nT25EZXN0cm95LlxuICBwcml2YXRlIHJlYWRvbmx5IGRlc3Ryb3lTdWJqZWN0JCA9IG5ldyBSZXBsYXlTdWJqZWN0PHZvaWQ+KDEpO1xuICAvLyBFeHBvc2VkIHRvIGFueSBleHRlbmRpbmcgU3RvcmUgdG8gYmUgdXNlZCBmb3IgdGhlIHRlYXJkb3duLlxuICByZWFkb25seSBkZXN0cm95JCA9IHRoaXMuZGVzdHJveVN1YmplY3QkLmFzT2JzZXJ2YWJsZSgpO1xuXG4gIHByaXZhdGUgcmVhZG9ubHkgc3RhdGVTdWJqZWN0JCA9IG5ldyBSZXBsYXlTdWJqZWN0PFQ+KDEpO1xuICBwcml2YXRlIGlzSW5pdGlhbGl6ZWQgPSBmYWxzZTtcbiAgcHJpdmF0ZSBub3RJbml0aWFsaXplZEVycm9yTWVzc2FnZSA9XG4gICAgYCR7dGhpcy5jb25zdHJ1Y3Rvci5uYW1lfSBoYXMgbm90IGJlZW4gaW5pdGlhbGl6ZWQgeWV0LiBgICtcbiAgICBgUGxlYXNlIG1ha2Ugc3VyZSBpdCBpcyBpbml0aWFsaXplZCBiZWZvcmUgdXBkYXRpbmcvZ2V0dGluZy5gO1xuICAvLyBOZWVkcyB0byBiZSBhZnRlciBkZXN0cm95JCBpcyBkZWNsYXJlZCBiZWNhdXNlIGl0J3MgdXNlZCBpbiBzZWxlY3QuXG4gIHJlYWRvbmx5IHN0YXRlJDogT2JzZXJ2YWJsZTxUPiA9IHRoaXMuc2VsZWN0KChzKSA9PiBzKTtcblxuICBjb25zdHJ1Y3RvcihAT3B0aW9uYWwoKSBASW5qZWN0KElOSVRJQUxfU1RBVEVfVE9LRU4pIGRlZmF1bHRTdGF0ZT86IFQpIHtcbiAgICAvLyBTdGF0ZSBjYW4gYmUgaW5pdGlhbGl6ZWQgZWl0aGVyIHRocm91Z2ggY29uc3RydWN0b3Igb3Igc2V0U3RhdGUuXG4gICAgaWYgKGRlZmF1bHRTdGF0ZSkge1xuICAgICAgdGhpcy5pbml0U3RhdGUoZGVmYXVsdFN0YXRlKTtcbiAgICB9XG4gIH1cblxuICAvKiogQ29tcGxldGVzIGFsbCByZWxldmFudCBPYnNlcnZhYmxlIHN0cmVhbXMuICovXG4gIG5nT25EZXN0cm95KCkge1xuICAgIHRoaXMuc3RhdGVTdWJqZWN0JC5jb21wbGV0ZSgpO1xuICAgIHRoaXMuZGVzdHJveVN1YmplY3QkLm5leHQoKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGVzIGFuIHVwZGF0ZXIuXG4gICAqXG4gICAqIFRocm93cyBhbiBlcnJvciBpZiB1cGRhdGVyIGlzIGNhbGxlZCB3aXRoIHN5bmNocm9ub3VzIHZhbHVlcyAoZWl0aGVyXG4gICAqIGltcGVyYXRpdmUgdmFsdWUgb3IgT2JzZXJ2YWJsZSB0aGF0IGlzIHN5bmNocm9ub3VzKSBiZWZvcmUgQ29tcG9uZW50U3RvcmVcbiAgICogaXMgaW5pdGlhbGl6ZWQuIElmIGNhbGxlZCB3aXRoIGFzeW5jIE9ic2VydmFibGUgYmVmb3JlIGluaXRpYWxpemF0aW9uIHRoZW5cbiAgICogc3RhdGUgd2lsbCBub3QgYmUgdXBkYXRlZCBhbmQgc3Vic2NyaXB0aW9uIHdvdWxkIGJlIGNsb3NlZC5cbiAgICpcbiAgICogQHBhcmFtIHVwZGF0ZXJGbiBBIHN0YXRpYyB1cGRhdGVyIGZ1bmN0aW9uIHRoYXQgdGFrZXMgMiBwYXJhbWV0ZXJzICh0aGVcbiAgICogY3VycmVudCBzdGF0ZSBhbmQgYW4gYXJndW1lbnQgb2JqZWN0KSBhbmQgcmV0dXJucyBhIG5ldyBpbnN0YW5jZSBvZiB0aGVcbiAgICogc3RhdGUuXG4gICAqIEByZXR1cm4gQSBmdW5jdGlvbiB0aGF0IGFjY2VwdHMgb25lIGFyZ3VtZW50IHdoaWNoIGlzIGZvcndhcmRlZCBhcyB0aGVcbiAgICogICAgIHNlY29uZCBhcmd1bWVudCB0byBgdXBkYXRlckZuYC4gRXZlcnkgdGltZSB0aGlzIGZ1bmN0aW9uIGlzIGNhbGxlZFxuICAgKiAgICAgc3Vic2NyaWJlcnMgd2lsbCBiZSBub3RpZmllZCBvZiB0aGUgc3RhdGUgY2hhbmdlLlxuICAgKi9cbiAgdXBkYXRlcjxcbiAgICAvLyBBbGxvdyB0byBmb3JjZS1wcm92aWRlIHRoZSB0eXBlXG4gICAgUHJvdmlkZWRUeXBlID0gdm9pZCxcbiAgICAvLyBUaGlzIHR5cGUgaXMgZGVyaXZlZCBmcm9tIHRoZSBgdmFsdWVgIHByb3BlcnR5LCBkZWZhdWx0aW5nIHRvIHZvaWQgaWYgaXQncyBtaXNzaW5nXG4gICAgT3JpZ2luVHlwZSA9IFByb3ZpZGVkVHlwZSxcbiAgICAvLyBUaGUgVmFsdWUgdHlwZSBpcyBhc3NpZ25lZCBmcm9tIHRoZSBPcmlnaW5cbiAgICBWYWx1ZVR5cGUgPSBPcmlnaW5UeXBlLFxuICAgIC8vIFJldHVybiBlaXRoZXIgYW4gZW1wdHkgY2FsbGJhY2sgb3IgYSBmdW5jdGlvbiByZXF1aXJpbmcgc3BlY2lmaWMgdHlwZXMgYXMgaW5wdXRzXG4gICAgUmV0dXJuVHlwZSA9IE9yaWdpblR5cGUgZXh0ZW5kcyB2b2lkXG4gICAgICA/ICgpID0+IHZvaWRcbiAgICAgIDogKG9ic2VydmFibGVPclZhbHVlOiBWYWx1ZVR5cGUgfCBPYnNlcnZhYmxlPFZhbHVlVHlwZT4pID0+IFN1YnNjcmlwdGlvblxuICA+KHVwZGF0ZXJGbjogKHN0YXRlOiBULCB2YWx1ZTogT3JpZ2luVHlwZSkgPT4gVCk6IFJldHVyblR5cGUge1xuICAgIHJldHVybiAoKChcbiAgICAgIG9ic2VydmFibGVPclZhbHVlPzogT3JpZ2luVHlwZSB8IE9ic2VydmFibGU8T3JpZ2luVHlwZT5cbiAgICApOiBTdWJzY3JpcHRpb24gPT4ge1xuICAgICAgbGV0IGluaXRpYWxpemF0aW9uRXJyb3I6IEVycm9yIHwgdW5kZWZpbmVkO1xuICAgICAgLy8gV2UgY2FuIHJlY2VpdmUgZWl0aGVyIHRoZSB2YWx1ZSBvciBhbiBvYnNlcnZhYmxlLiBJbiBjYXNlIGl0J3MgYVxuICAgICAgLy8gc2ltcGxlIHZhbHVlLCB3ZSdsbCB3cmFwIGl0IHdpdGggYG9mYCBvcGVyYXRvciB0byB0dXJuIGl0IGludG9cbiAgICAgIC8vIE9ic2VydmFibGUuXG4gICAgICBjb25zdCBvYnNlcnZhYmxlJCA9IGlzT2JzZXJ2YWJsZShvYnNlcnZhYmxlT3JWYWx1ZSlcbiAgICAgICAgPyBvYnNlcnZhYmxlT3JWYWx1ZVxuICAgICAgICA6IG9mKG9ic2VydmFibGVPclZhbHVlKTtcbiAgICAgIGNvbnN0IHN1YnNjcmlwdGlvbiA9IG9ic2VydmFibGUkXG4gICAgICAgIC5waXBlKFxuICAgICAgICAgIGNvbmNhdE1hcCgodmFsdWUpID0+XG4gICAgICAgICAgICB0aGlzLmlzSW5pdGlhbGl6ZWRcbiAgICAgICAgICAgICAgPyAvLyBQdXNoIHRoZSB2YWx1ZSBpbnRvIHF1ZXVlU2NoZWR1bGVyXG4gICAgICAgICAgICAgICAgc2NoZWR1bGVkKFt2YWx1ZV0sIHF1ZXVlU2NoZWR1bGVyKS5waXBlKFxuICAgICAgICAgICAgICAgICAgd2l0aExhdGVzdEZyb20odGhpcy5zdGF0ZVN1YmplY3QkKVxuICAgICAgICAgICAgICAgIClcbiAgICAgICAgICAgICAgOiAvLyBJZiBzdGF0ZSB3YXMgbm90IGluaXRpYWxpemVkLCB3ZSdsbCB0aHJvdyBhbiBlcnJvci5cbiAgICAgICAgICAgICAgICB0aHJvd0Vycm9yKG5ldyBFcnJvcih0aGlzLm5vdEluaXRpYWxpemVkRXJyb3JNZXNzYWdlKSlcbiAgICAgICAgICApLFxuICAgICAgICAgIHRha2VVbnRpbCh0aGlzLmRlc3Ryb3kkKVxuICAgICAgICApXG4gICAgICAgIC5zdWJzY3JpYmUoe1xuICAgICAgICAgIG5leHQ6IChbdmFsdWUsIGN1cnJlbnRTdGF0ZV0pID0+IHtcbiAgICAgICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tbm9uLW51bGwtYXNzZXJ0aW9uXG4gICAgICAgICAgICB0aGlzLnN0YXRlU3ViamVjdCQubmV4dCh1cGRhdGVyRm4oY3VycmVudFN0YXRlLCB2YWx1ZSEpKTtcbiAgICAgICAgICB9LFxuICAgICAgICAgIGVycm9yOiAoZXJyb3I6IEVycm9yKSA9PiB7XG4gICAgICAgICAgICBpbml0aWFsaXphdGlvbkVycm9yID0gZXJyb3I7XG4gICAgICAgICAgICB0aGlzLnN0YXRlU3ViamVjdCQuZXJyb3IoZXJyb3IpO1xuICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuXG4gICAgICBpZiAoaW5pdGlhbGl6YXRpb25FcnJvcikge1xuICAgICAgICAvLyBwcmV0dGllci1pZ25vcmVcbiAgICAgICAgdGhyb3cgLyoqIEB0eXBlIHshRXJyb3J9ICovIChpbml0aWFsaXphdGlvbkVycm9yKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBzdWJzY3JpcHRpb247XG4gICAgfSkgYXMgdW5rbm93bikgYXMgUmV0dXJuVHlwZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplcyBzdGF0ZS4gSWYgaXQgd2FzIGFscmVhZHkgaW5pdGlhbGl6ZWQgdGhlbiBpdCByZXNldHMgdGhlXG4gICAqIHN0YXRlLlxuICAgKi9cbiAgcHJpdmF0ZSBpbml0U3RhdGUoc3RhdGU6IFQpOiB2b2lkIHtcbiAgICBzY2hlZHVsZWQoW3N0YXRlXSwgcXVldWVTY2hlZHVsZXIpLnN1YnNjcmliZSgocykgPT4ge1xuICAgICAgdGhpcy5pc0luaXRpYWxpemVkID0gdHJ1ZTtcbiAgICAgIHRoaXMuc3RhdGVTdWJqZWN0JC5uZXh0KHMpO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIFNldHMgdGhlIHN0YXRlIHNwZWNpZmljIHZhbHVlLlxuICAgKiBAcGFyYW0gc3RhdGVPclVwZGF0ZXJGbiBvYmplY3Qgb2YgdGhlIHNhbWUgdHlwZSBhcyB0aGUgc3RhdGUgb3IgYW5cbiAgICogdXBkYXRlckZuLCByZXR1cm5pbmcgc3VjaCBvYmplY3QuXG4gICAqL1xuICBzZXRTdGF0ZShzdGF0ZU9yVXBkYXRlckZuOiBUIHwgKChzdGF0ZTogVCkgPT4gVCkpOiB2b2lkIHtcbiAgICBpZiAodHlwZW9mIHN0YXRlT3JVcGRhdGVyRm4gIT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHRoaXMuaW5pdFN0YXRlKHN0YXRlT3JVcGRhdGVyRm4pO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnVwZGF0ZXIoc3RhdGVPclVwZGF0ZXJGbiBhcyAoc3RhdGU6IFQpID0+IFQpKCk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFBhdGNoZXMgdGhlIHN0YXRlIHdpdGggcHJvdmlkZWQgcGFydGlhbCBzdGF0ZS5cbiAgICpcbiAgICogQHBhcmFtIHBhcnRpYWxTdGF0ZU9yVXBkYXRlckZuIGEgcGFydGlhbCBzdGF0ZSBvciBhIHBhcnRpYWwgdXBkYXRlclxuICAgKiBmdW5jdGlvbiB0aGF0IGFjY2VwdHMgdGhlIHN0YXRlIGFuZCByZXR1cm5zIHRoZSBwYXJ0aWFsIHN0YXRlLlxuICAgKiBAdGhyb3dzIEVycm9yIGlmIHRoZSBzdGF0ZSBpcyBub3QgaW5pdGlhbGl6ZWQuXG4gICAqL1xuICBwYXRjaFN0YXRlKFxuICAgIHBhcnRpYWxTdGF0ZU9yVXBkYXRlckZuOlxuICAgICAgfCBQYXJ0aWFsPFQ+XG4gICAgICB8IE9ic2VydmFibGU8UGFydGlhbDxUPj5cbiAgICAgIHwgKChzdGF0ZTogVCkgPT4gUGFydGlhbDxUPilcbiAgKTogdm9pZCB7XG4gICAgY29uc3QgcGF0Y2hlZFN0YXRlID1cbiAgICAgIHR5cGVvZiBwYXJ0aWFsU3RhdGVPclVwZGF0ZXJGbiA9PT0gJ2Z1bmN0aW9uJ1xuICAgICAgICA/IHBhcnRpYWxTdGF0ZU9yVXBkYXRlckZuKHRoaXMuZ2V0KCkpXG4gICAgICAgIDogcGFydGlhbFN0YXRlT3JVcGRhdGVyRm47XG5cbiAgICB0aGlzLnVwZGF0ZXIoKHN0YXRlLCBwYXJ0aWFsU3RhdGU6IFBhcnRpYWw8VD4pID0+ICh7XG4gICAgICAuLi5zdGF0ZSxcbiAgICAgIC4uLnBhcnRpYWxTdGF0ZSxcbiAgICB9KSkocGF0Y2hlZFN0YXRlKTtcbiAgfVxuXG4gIHByb3RlY3RlZCBnZXQoKTogVDtcbiAgcHJvdGVjdGVkIGdldDxSPihwcm9qZWN0b3I6IChzOiBUKSA9PiBSKTogUjtcbiAgcHJvdGVjdGVkIGdldDxSPihwcm9qZWN0b3I/OiAoczogVCkgPT4gUik6IFIgfCBUIHtcbiAgICBpZiAoIXRoaXMuaXNJbml0aWFsaXplZCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKHRoaXMubm90SW5pdGlhbGl6ZWRFcnJvck1lc3NhZ2UpO1xuICAgIH1cbiAgICBsZXQgdmFsdWU6IFIgfCBUO1xuXG4gICAgdGhpcy5zdGF0ZVN1YmplY3QkLnBpcGUodGFrZSgxKSkuc3Vic2NyaWJlKChzdGF0ZSkgPT4ge1xuICAgICAgdmFsdWUgPSBwcm9qZWN0b3IgPyBwcm9qZWN0b3Ioc3RhdGUpIDogc3RhdGU7XG4gICAgfSk7XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1ub24tbnVsbC1hc3NlcnRpb25cbiAgICByZXR1cm4gdmFsdWUhO1xuICB9XG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBzZWxlY3Rvci5cbiAgICpcbiAgICogQHBhcmFtIHByb2plY3RvciBBIHB1cmUgcHJvamVjdGlvbiBmdW5jdGlvbiB0aGF0IHRha2VzIHRoZSBjdXJyZW50IHN0YXRlIGFuZFxuICAgKiAgIHJldHVybnMgc29tZSBuZXcgc2xpY2UvcHJvamVjdGlvbiBvZiB0aGF0IHN0YXRlLlxuICAgKiBAcGFyYW0gY29uZmlnIFNlbGVjdENvbmZpZyB0aGF0IGNoYW5nZXMgdGhlIGJlaGF2aW9yIG9mIHNlbGVjdG9yLCBpbmNsdWRpbmdcbiAgICogICB0aGUgZGVib3VuY2luZyBvZiB0aGUgdmFsdWVzIHVudGlsIHRoZSBzdGF0ZSBpcyBzZXR0bGVkLlxuICAgKiBAcmV0dXJuIEFuIG9ic2VydmFibGUgb2YgdGhlIHByb2plY3RvciByZXN1bHRzLlxuICAgKi9cbiAgc2VsZWN0PFJlc3VsdD4oXG4gICAgcHJvamVjdG9yOiAoczogVCkgPT4gUmVzdWx0LFxuICAgIGNvbmZpZz86IFNlbGVjdENvbmZpZ1xuICApOiBPYnNlcnZhYmxlPFJlc3VsdD47XG4gIHNlbGVjdDxTZWxlY3RvcnMgZXh0ZW5kcyBPYnNlcnZhYmxlPHVua25vd24+W10sIFJlc3VsdD4oXG4gICAgLi4uYXJnczogWy4uLnNlbGVjdG9yczogU2VsZWN0b3JzLCBwcm9qZWN0b3I6IFByb2plY3RvcjxTZWxlY3RvcnMsIFJlc3VsdD5dXG4gICk6IE9ic2VydmFibGU8UmVzdWx0PjtcbiAgc2VsZWN0PFNlbGVjdG9ycyBleHRlbmRzIE9ic2VydmFibGU8dW5rbm93bj5bXSwgUmVzdWx0PihcbiAgICAuLi5hcmdzOiBbXG4gICAgICAuLi5zZWxlY3RvcnM6IFNlbGVjdG9ycyxcbiAgICAgIHByb2plY3RvcjogUHJvamVjdG9yPFNlbGVjdG9ycywgUmVzdWx0PixcbiAgICAgIGNvbmZpZzogU2VsZWN0Q29uZmlnXG4gICAgXVxuICApOiBPYnNlcnZhYmxlPFJlc3VsdD47XG4gIHNlbGVjdDxcbiAgICBTZWxlY3RvcnMgZXh0ZW5kcyBBcnJheTxPYnNlcnZhYmxlPHVua25vd24+IHwgU2VsZWN0Q29uZmlnIHwgUHJvamVjdG9yRm4+LFxuICAgIFJlc3VsdCxcbiAgICBQcm9qZWN0b3JGbiA9ICguLi5hOiB1bmtub3duW10pID0+IFJlc3VsdFxuICA+KC4uLmFyZ3M6IFNlbGVjdG9ycyk6IE9ic2VydmFibGU8UmVzdWx0PiB7XG4gICAgY29uc3QgeyBvYnNlcnZhYmxlcywgcHJvamVjdG9yLCBjb25maWcgfSA9IHByb2Nlc3NTZWxlY3RvckFyZ3M8XG4gICAgICBTZWxlY3RvcnMsXG4gICAgICBSZXN1bHRcbiAgICA+KGFyZ3MpO1xuXG4gICAgbGV0IG9ic2VydmFibGUkOiBPYnNlcnZhYmxlPFJlc3VsdD47XG4gICAgLy8gSWYgdGhlcmUgYXJlIG5vIE9ic2VydmFibGVzIHRvIGNvbWJpbmUsIHRoZW4gd2UnbGwganVzdCBtYXAgdGhlIHZhbHVlLlxuICAgIGlmIChvYnNlcnZhYmxlcy5sZW5ndGggPT09IDApIHtcbiAgICAgIG9ic2VydmFibGUkID0gdGhpcy5zdGF0ZVN1YmplY3QkLnBpcGUoXG4gICAgICAgIGNvbmZpZy5kZWJvdW5jZSA/IGRlYm91bmNlU3luYygpIDogKHNvdXJjZSQpID0+IHNvdXJjZSQsXG4gICAgICAgIG1hcChwcm9qZWN0b3IpXG4gICAgICApO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBJZiB0aGVyZSBhcmUgbXVsdGlwbGUgYXJndW1lbnRzLCB0aGVuIHdlJ3JlIGFnZ3JlZ2F0aW5nIHNlbGVjdG9ycywgc28gd2UgbmVlZFxuICAgICAgLy8gdG8gdGFrZSB0aGUgY29tYmluZUxhdGVzdCBvZiB0aGVtIGJlZm9yZSBjYWxsaW5nIHRoZSBtYXAgZnVuY3Rpb24uXG4gICAgICBvYnNlcnZhYmxlJCA9IGNvbWJpbmVMYXRlc3Qob2JzZXJ2YWJsZXMpLnBpcGUoXG4gICAgICAgIGNvbmZpZy5kZWJvdW5jZSA/IGRlYm91bmNlU3luYygpIDogKHNvdXJjZSQpID0+IHNvdXJjZSQsXG4gICAgICAgIG1hcCgocHJvamVjdG9yQXJncykgPT4gcHJvamVjdG9yKC4uLnByb2plY3RvckFyZ3MpKVxuICAgICAgKTtcbiAgICB9XG5cbiAgICByZXR1cm4gb2JzZXJ2YWJsZSQucGlwZShcbiAgICAgIGRpc3RpbmN0VW50aWxDaGFuZ2VkKCksXG4gICAgICBzaGFyZVJlcGxheSh7XG4gICAgICAgIHJlZkNvdW50OiB0cnVlLFxuICAgICAgICBidWZmZXJTaXplOiAxLFxuICAgICAgfSksXG4gICAgICB0YWtlVW50aWwodGhpcy5kZXN0cm95JClcbiAgICApO1xuICB9XG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgYW4gZWZmZWN0LlxuICAgKlxuICAgKiBUaGlzIGVmZmVjdCBpcyBzdWJzY3JpYmVkIHRvIHRocm91Z2hvdXQgdGhlIGxpZmVjeWNsZSBvZiB0aGUgQ29tcG9uZW50U3RvcmUuXG4gICAqIEBwYXJhbSBnZW5lcmF0b3IgQSBmdW5jdGlvbiB0aGF0IHRha2VzIGFuIG9yaWdpbiBPYnNlcnZhYmxlIGlucHV0IGFuZFxuICAgKiAgICAgcmV0dXJucyBhbiBPYnNlcnZhYmxlLiBUaGUgT2JzZXJ2YWJsZSB0aGF0IGlzIHJldHVybmVkIHdpbGwgYmVcbiAgICogICAgIHN1YnNjcmliZWQgdG8gZm9yIHRoZSBsaWZlIG9mIHRoZSBjb21wb25lbnQuXG4gICAqIEByZXR1cm4gQSBmdW5jdGlvbiB0aGF0LCB3aGVuIGNhbGxlZCwgd2lsbCB0cmlnZ2VyIHRoZSBvcmlnaW4gT2JzZXJ2YWJsZS5cbiAgICovXG4gIGVmZmVjdDxcbiAgICAvLyBUaGlzIHR5cGUgcXVpY2tseSBiZWNhbWUgcGFydCBvZiBlZmZlY3QgJ0FQSSdcbiAgICBQcm92aWRlZFR5cGUgPSB2b2lkLFxuICAgIC8vIFRoZSBhY3R1YWwgb3JpZ2luJCB0eXBlLCB3aGljaCBjb3VsZCBiZSB1bmtub3duLCB3aGVuIG5vdCBzcGVjaWZpZWRcbiAgICBPcmlnaW5UeXBlIGV4dGVuZHNcbiAgICAgIHwgT2JzZXJ2YWJsZTxQcm92aWRlZFR5cGU+XG4gICAgICB8IHVua25vd24gPSBPYnNlcnZhYmxlPFByb3ZpZGVkVHlwZT4sXG4gICAgLy8gVW53cmFwcGVkIGFjdHVhbCB0eXBlIG9mIHRoZSBvcmlnaW4kIE9ic2VydmFibGUsIGFmdGVyIGRlZmF1bHQgd2FzIGFwcGxpZWRcbiAgICBPYnNlcnZhYmxlVHlwZSA9IE9yaWdpblR5cGUgZXh0ZW5kcyBPYnNlcnZhYmxlPGluZmVyIEE+ID8gQSA6IG5ldmVyLFxuICAgIC8vIFJldHVybiBlaXRoZXIgYW4gZW1wdHkgY2FsbGJhY2sgb3IgYSBmdW5jdGlvbiByZXF1aXJpbmcgc3BlY2lmaWMgdHlwZXMgYXMgaW5wdXRzXG4gICAgUmV0dXJuVHlwZSA9IFByb3ZpZGVkVHlwZSB8IE9ic2VydmFibGVUeXBlIGV4dGVuZHMgdm9pZFxuICAgICAgPyAoKSA9PiB2b2lkXG4gICAgICA6IChcbiAgICAgICAgICBvYnNlcnZhYmxlT3JWYWx1ZTogT2JzZXJ2YWJsZVR5cGUgfCBPYnNlcnZhYmxlPE9ic2VydmFibGVUeXBlPlxuICAgICAgICApID0+IFN1YnNjcmlwdGlvblxuICA+KGdlbmVyYXRvcjogKG9yaWdpbiQ6IE9yaWdpblR5cGUpID0+IE9ic2VydmFibGU8dW5rbm93bj4pOiBSZXR1cm5UeXBlIHtcbiAgICBjb25zdCBvcmlnaW4kID0gbmV3IFN1YmplY3Q8T2JzZXJ2YWJsZVR5cGU+KCk7XG4gICAgZ2VuZXJhdG9yKG9yaWdpbiQgYXMgT3JpZ2luVHlwZSlcbiAgICAgIC8vIHRpZWQgdG8gdGhlIGxpZmVjeWNsZSDwn5GHIG9mIENvbXBvbmVudFN0b3JlXG4gICAgICAucGlwZSh0YWtlVW50aWwodGhpcy5kZXN0cm95JCkpXG4gICAgICAuc3Vic2NyaWJlKCk7XG5cbiAgICByZXR1cm4gKCgoXG4gICAgICBvYnNlcnZhYmxlT3JWYWx1ZT86IE9ic2VydmFibGVUeXBlIHwgT2JzZXJ2YWJsZTxPYnNlcnZhYmxlVHlwZT5cbiAgICApOiBTdWJzY3JpcHRpb24gPT4ge1xuICAgICAgY29uc3Qgb2JzZXJ2YWJsZSQgPSBpc09ic2VydmFibGUob2JzZXJ2YWJsZU9yVmFsdWUpXG4gICAgICAgID8gb2JzZXJ2YWJsZU9yVmFsdWVcbiAgICAgICAgOiBvZihvYnNlcnZhYmxlT3JWYWx1ZSk7XG4gICAgICByZXR1cm4gb2JzZXJ2YWJsZSQucGlwZSh0YWtlVW50aWwodGhpcy5kZXN0cm95JCkpLnN1YnNjcmliZSgodmFsdWUpID0+IHtcbiAgICAgICAgLy8gYW55IG5ldyDwn5GHIHZhbHVlIGlzIHB1c2hlZCBpbnRvIGEgc3RyZWFtXG4gICAgICAgIG9yaWdpbiQubmV4dCh2YWx1ZSk7XG4gICAgICB9KTtcbiAgICB9KSBhcyB1bmtub3duKSBhcyBSZXR1cm5UeXBlO1xuICB9XG59XG5cbmZ1bmN0aW9uIHByb2Nlc3NTZWxlY3RvckFyZ3M8XG4gIFNlbGVjdG9ycyBleHRlbmRzIEFycmF5PE9ic2VydmFibGU8dW5rbm93bj4gfCBTZWxlY3RDb25maWcgfCBQcm9qZWN0b3JGbj4sXG4gIFJlc3VsdCxcbiAgUHJvamVjdG9yRm4gPSAoLi4uYTogdW5rbm93bltdKSA9PiBSZXN1bHRcbj4oXG4gIGFyZ3M6IFNlbGVjdG9yc1xuKToge1xuICBvYnNlcnZhYmxlczogT2JzZXJ2YWJsZTx1bmtub3duPltdO1xuICBwcm9qZWN0b3I6IFByb2plY3RvckZuO1xuICBjb25maWc6IFJlcXVpcmVkPFNlbGVjdENvbmZpZz47XG59IHtcbiAgY29uc3Qgc2VsZWN0b3JBcmdzID0gQXJyYXkuZnJvbShhcmdzKTtcbiAgLy8gQXNzaWduIGRlZmF1bHQgdmFsdWVzLlxuICBsZXQgY29uZmlnOiBSZXF1aXJlZDxTZWxlY3RDb25maWc+ID0geyBkZWJvdW5jZTogZmFsc2UgfTtcbiAgbGV0IHByb2plY3RvcjogUHJvamVjdG9yRm47XG4gIC8vIExhc3QgYXJndW1lbnQgaXMgZWl0aGVyIHByb2plY3RvciBvciBjb25maWdcbiAgY29uc3QgcHJvamVjdG9yT3JDb25maWcgPSBzZWxlY3RvckFyZ3MucG9wKCkgYXMgUHJvamVjdG9yRm4gfCBTZWxlY3RDb25maWc7XG5cbiAgaWYgKHR5cGVvZiBwcm9qZWN0b3JPckNvbmZpZyAhPT0gJ2Z1bmN0aW9uJykge1xuICAgIC8vIFdlIGdvdCB0aGUgY29uZmlnIGFzIHRoZSBsYXN0IGFyZ3VtZW50LCByZXBsYWNlIGFueSBkZWZhdWx0IHZhbHVlcyB3aXRoIGl0LlxuICAgIGNvbmZpZyA9IHsgLi4uY29uZmlnLCAuLi5wcm9qZWN0b3JPckNvbmZpZyB9O1xuICAgIC8vIFBvcCB0aGUgbmV4dCBhcmdzLCB3aGljaCB3b3VsZCBiZSB0aGUgcHJvamVjdG9yIGZuLlxuICAgIHByb2plY3RvciA9IHNlbGVjdG9yQXJncy5wb3AoKSBhcyBQcm9qZWN0b3JGbjtcbiAgfSBlbHNlIHtcbiAgICBwcm9qZWN0b3IgPSBwcm9qZWN0b3JPckNvbmZpZztcbiAgfVxuICAvLyBUaGUgT2JzZXJ2YWJsZXMgdG8gY29tYmluZSwgaWYgdGhlcmUgYXJlIGFueS5cbiAgY29uc3Qgb2JzZXJ2YWJsZXMgPSBzZWxlY3RvckFyZ3MgYXMgT2JzZXJ2YWJsZTx1bmtub3duPltdO1xuICByZXR1cm4ge1xuICAgIG9ic2VydmFibGVzLFxuICAgIHByb2plY3RvcixcbiAgICBjb25maWcsXG4gIH07XG59XG4iXX0=