import { isObservable, of, ReplaySubject, throwError, combineLatest, Subject, queueScheduler, scheduled, } from 'rxjs';
import { concatMap, takeUntil, withLatestFrom, map, distinctUntilChanged, shareReplay, take, } from 'rxjs/operators';
import { debounceSync } from './debounce-sync';
import { Injectable, Optional, InjectionToken, Inject, } from '@angular/core';
import * as i0 from "@angular/core";
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
/** @nocollapse */ ComponentStore.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "12.2.6", ngImport: i0, type: ComponentStore, deps: [{ token: INITIAL_STATE_TOKEN, optional: true }], target: i0.ɵɵFactoryTarget.Injectable });
/** @nocollapse */ ComponentStore.ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "12.2.6", ngImport: i0, type: ComponentStore });
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "12.2.6", ngImport: i0, type: ComponentStore, decorators: [{
            type: Injectable
        }], ctorParameters: function () { return [{ type: undefined, decorators: [{
                    type: Optional
                }, {
                    type: Inject,
                    args: [INITIAL_STATE_TOKEN]
                }] }]; } });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcG9uZW50LXN0b3JlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vbW9kdWxlcy9jb21wb25lbnQtc3RvcmUvc3JjL2NvbXBvbmVudC1zdG9yZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQ0wsWUFBWSxFQUVaLEVBQUUsRUFDRixhQUFhLEVBRWIsVUFBVSxFQUNWLGFBQWEsRUFDYixPQUFPLEVBQ1AsY0FBYyxFQUNkLFNBQVMsR0FDVixNQUFNLE1BQU0sQ0FBQztBQUNkLE9BQU8sRUFDTCxTQUFTLEVBQ1QsU0FBUyxFQUNULGNBQWMsRUFDZCxHQUFHLEVBQ0gsb0JBQW9CLEVBQ3BCLFdBQVcsRUFDWCxJQUFJLEdBQ0wsTUFBTSxnQkFBZ0IsQ0FBQztBQUN4QixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFDL0MsT0FBTyxFQUNMLFVBQVUsRUFFVixRQUFRLEVBQ1IsY0FBYyxFQUNkLE1BQU0sR0FDUCxNQUFNLGVBQWUsQ0FBQzs7QUFNdkIsTUFBTSxDQUFDLE1BQU0sbUJBQW1CLEdBQUcsSUFBSSxjQUFjLENBQ25ELHFDQUFxQyxDQUN0QyxDQUFDO0FBYUYsTUFBTSxPQUFPLGNBQWM7SUFjekIsWUFBcUQsWUFBZ0I7UUFickUsc0NBQXNDO1FBQ3JCLG9CQUFlLEdBQUcsSUFBSSxhQUFhLENBQU8sQ0FBQyxDQUFDLENBQUM7UUFDOUQsOERBQThEO1FBQ3JELGFBQVEsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLFlBQVksRUFBRSxDQUFDO1FBRXZDLGtCQUFhLEdBQUcsSUFBSSxhQUFhLENBQUksQ0FBQyxDQUFDLENBQUM7UUFDakQsa0JBQWEsR0FBRyxLQUFLLENBQUM7UUFDdEIsK0JBQTBCLEdBQ2hDLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLGlDQUFpQztZQUN6RCw2REFBNkQsQ0FBQztRQUNoRSxzRUFBc0U7UUFDN0QsV0FBTSxHQUFrQixJQUFJLENB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QUMsS0FBSyxFQUFFLEVBQUU7Z0JBQ3BFLDJDQUEyQztnQkFDM0MsT0FBTyxDQUFDLElBQUksQ0FBQyxLQUF1QixDQUFDLENBQUM7WUFDeEMsQ0FBQyxDQUFDLENBQUM7UUFDTCxDQUFDLENBQTBCLENBQUM7SUFDOUIsQ0FBQzs7OEhBcFFVLGNBQWMsa0JBY08sbUJBQW1CO2tJQWR4QyxjQUFjOzJGQUFkLGNBQWM7a0JBRDFCLFVBQVU7OzBCQWVJLFFBQVE7OzBCQUFJLE1BQU07MkJBQUMsbUJBQW1COztBQXlQckQsU0FBUyxtQkFBbUIsQ0FLMUIsSUFBZTtJQU1mLE1BQU0sWUFBWSxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDdEMseUJBQXlCO0lBQ3pCLElBQUksTUFBTSxHQUEyQixFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsQ0FBQztJQUN6RCxJQUFJLFNBQXNCLENBQUM7SUFDM0IsOENBQThDO0lBQzlDLE1BQU0saUJBQWlCLEdBQUcsWUFBWSxDQUFDLEdBQUcsRUFBZ0MsQ0FBQztJQUUzRSxJQUFJLE9BQU8saUJBQWlCLEtBQUssVUFBVSxFQUFFO1FBQzNDLDhFQUE4RTtRQUM5RSxNQUFNLG1DQUFRLE1BQU0sR0FBSyxpQkFBaUIsQ0FBRSxDQUFDO1FBQzdDLHNEQUFzRDtRQUN0RCxTQUFTLEdBQUcsWUFBWSxDQUFDLEdBQUcsRUFBaUIsQ0FBQztLQUMvQztTQUFNO1FBQ0wsU0FBUyxHQUFHLGlCQUFpQixDQUFDO0tBQy9CO0lBQ0QsZ0RBQWdEO0lBQ2hELE1BQU0sV0FBVyxHQUFHLFlBQXFDLENBQUM7SUFDMUQsT0FBTztRQUNMLFdBQVc7UUFDWCxTQUFTO1FBQ1QsTUFBTTtLQUNQLENBQUM7QUFDSixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtcbiAgaXNPYnNlcnZhYmxlLFxuICBPYnNlcnZhYmxlLFxuICBvZixcbiAgUmVwbGF5U3ViamVjdCxcbiAgU3Vic2NyaXB0aW9uLFxuICB0aHJvd0Vycm9yLFxuICBjb21iaW5lTGF0ZXN0LFxuICBTdWJqZWN0LFxuICBxdWV1ZVNjaGVkdWxlcixcbiAgc2NoZWR1bGVkLFxufSBmcm9tICdyeGpzJztcbmltcG9ydCB7XG4gIGNvbmNhdE1hcCxcbiAgdGFrZVVudGlsLFxuICB3aXRoTGF0ZXN0RnJvbSxcbiAgbWFwLFxuICBkaXN0aW5jdFVudGlsQ2hhbmdlZCxcbiAgc2hhcmVSZXBsYXksXG4gIHRha2UsXG59IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCB7IGRlYm91bmNlU3luYyB9IGZyb20gJy4vZGVib3VuY2Utc3luYyc7XG5pbXBvcnQge1xuICBJbmplY3RhYmxlLFxuICBPbkRlc3Ryb3ksXG4gIE9wdGlvbmFsLFxuICBJbmplY3Rpb25Ub2tlbixcbiAgSW5qZWN0LFxufSBmcm9tICdAYW5ndWxhci9jb3JlJztcblxuZXhwb3J0IGludGVyZmFjZSBTZWxlY3RDb25maWcge1xuICBkZWJvdW5jZT86IGJvb2xlYW47XG59XG5cbmV4cG9ydCBjb25zdCBJTklUSUFMX1NUQVRFX1RPS0VOID0gbmV3IEluamVjdGlvblRva2VuKFxuICAnQG5ncngvY29tcG9uZW50LXN0b3JlIEluaXRpYWwgU3RhdGUnXG4pO1xuXG5leHBvcnQgdHlwZSBTZWxlY3RvclJlc3VsdHM8U2VsZWN0b3JzIGV4dGVuZHMgT2JzZXJ2YWJsZTx1bmtub3duPltdPiA9IHtcbiAgW0tleSBpbiBrZXlvZiBTZWxlY3RvcnNdOiBTZWxlY3RvcnNbS2V5XSBleHRlbmRzIE9ic2VydmFibGU8aW5mZXIgVT5cbiAgICA/IFVcbiAgICA6IG5ldmVyO1xufTtcblxuZXhwb3J0IHR5cGUgUHJvamVjdG9yPFNlbGVjdG9ycyBleHRlbmRzIE9ic2VydmFibGU8dW5rbm93bj5bXSwgUmVzdWx0PiA9IChcbiAgLi4uYXJnczogU2VsZWN0b3JSZXN1bHRzPFNlbGVjdG9ycz5cbikgPT4gUmVzdWx0O1xuXG5ASW5qZWN0YWJsZSgpXG5leHBvcnQgY2xhc3MgQ29tcG9uZW50U3RvcmU8VCBleHRlbmRzIG9iamVjdD4gaW1wbGVtZW50cyBPbkRlc3Ryb3kge1xuICAvLyBTaG91bGQgYmUgdXNlZCBvbmx5IGluIG5nT25EZXN0cm95LlxuICBwcml2YXRlIHJlYWRvbmx5IGRlc3Ryb3lTdWJqZWN0JCA9IG5ldyBSZXBsYXlTdWJqZWN0PHZvaWQ+KDEpO1xuICAvLyBFeHBvc2VkIHRvIGFueSBleHRlbmRpbmcgU3RvcmUgdG8gYmUgdXNlZCBmb3IgdGhlIHRlYXJkb3duLlxuICByZWFkb25seSBkZXN0cm95JCA9IHRoaXMuZGVzdHJveVN1YmplY3QkLmFzT2JzZXJ2YWJsZSgpO1xuXG4gIHByaXZhdGUgcmVhZG9ubHkgc3RhdGVTdWJqZWN0JCA9IG5ldyBSZXBsYXlTdWJqZWN0PFQ+KDEpO1xuICBwcml2YXRlIGlzSW5pdGlhbGl6ZWQgPSBmYWxzZTtcbiAgcHJpdmF0ZSBub3RJbml0aWFsaXplZEVycm9yTWVzc2FnZSA9XG4gICAgYCR7dGhpcy5jb25zdHJ1Y3Rvci5uYW1lfSBoYXMgbm90IGJlZW4gaW5pdGlhbGl6ZWQgeWV0LiBgICtcbiAgICBgUGxlYXNlIG1ha2Ugc3VyZSBpdCBpcyBpbml0aWFsaXplZCBiZWZvcmUgdXBkYXRpbmcvZ2V0dGluZy5gO1xuICAvLyBOZWVkcyB0byBiZSBhZnRlciBkZXN0cm95JCBpcyBkZWNsYXJlZCBiZWNhdXNlIGl0J3MgdXNlZCBpbiBzZWxlY3QuXG4gIHJlYWRvbmx5IHN0YXRlJDogT2JzZXJ2YWJsZTxUPiA9IHRoaXMuc2VsZWN0KChzKSA9PiBzKTtcblxuICBjb25zdHJ1Y3RvcihAT3B0aW9uYWwoKSBASW5qZWN0KElOSVRJQUxfU1RBVEVfVE9LRU4pIGRlZmF1bHRTdGF0ZT86IFQpIHtcbiAgICAvLyBTdGF0ZSBjYW4gYmUgaW5pdGlhbGl6ZWQgZWl0aGVyIHRocm91Z2ggY29uc3RydWN0b3Igb3Igc2V0U3RhdGUuXG4gICAgaWYgKGRlZmF1bHRTdGF0ZSkge1xuICAgICAgdGhpcy5pbml0U3RhdGUoZGVmYXVsdFN0YXRlKTtcbiAgICB9XG4gIH1cblxuICAvKiogQ29tcGxldGVzIGFsbCByZWxldmFudCBPYnNlcnZhYmxlIHN0cmVhbXMuICovXG4gIG5nT25EZXN0cm95KCkge1xuICAgIHRoaXMuc3RhdGVTdWJqZWN0JC5jb21wbGV0ZSgpO1xuICAgIHRoaXMuZGVzdHJveVN1YmplY3QkLm5leHQoKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGVzIGFuIHVwZGF0ZXIuXG4gICAqXG4gICAqIFRocm93cyBhbiBlcnJvciBpZiB1cGRhdGVyIGlzIGNhbGxlZCB3aXRoIHN5bmNocm9ub3VzIHZhbHVlcyAoZWl0aGVyXG4gICAqIGltcGVyYXRpdmUgdmFsdWUgb3IgT2JzZXJ2YWJsZSB0aGF0IGlzIHN5bmNocm9ub3VzKSBiZWZvcmUgQ29tcG9uZW50U3RvcmVcbiAgICogaXMgaW5pdGlhbGl6ZWQuIElmIGNhbGxlZCB3aXRoIGFzeW5jIE9ic2VydmFibGUgYmVmb3JlIGluaXRpYWxpemF0aW9uIHRoZW5cbiAgICogc3RhdGUgd2lsbCBub3QgYmUgdXBkYXRlZCBhbmQgc3Vic2NyaXB0aW9uIHdvdWxkIGJlIGNsb3NlZC5cbiAgICpcbiAgICogQHBhcmFtIHVwZGF0ZXJGbiBBIHN0YXRpYyB1cGRhdGVyIGZ1bmN0aW9uIHRoYXQgdGFrZXMgMiBwYXJhbWV0ZXJzICh0aGVcbiAgICogY3VycmVudCBzdGF0ZSBhbmQgYW4gYXJndW1lbnQgb2JqZWN0KSBhbmQgcmV0dXJucyBhIG5ldyBpbnN0YW5jZSBvZiB0aGVcbiAgICogc3RhdGUuXG4gICAqIEByZXR1cm4gQSBmdW5jdGlvbiB0aGF0IGFjY2VwdHMgb25lIGFyZ3VtZW50IHdoaWNoIGlzIGZvcndhcmRlZCBhcyB0aGVcbiAgICogICAgIHNlY29uZCBhcmd1bWVudCB0byBgdXBkYXRlckZuYC4gRXZlcnkgdGltZSB0aGlzIGZ1bmN0aW9uIGlzIGNhbGxlZFxuICAgKiAgICAgc3Vic2NyaWJlcnMgd2lsbCBiZSBub3RpZmllZCBvZiB0aGUgc3RhdGUgY2hhbmdlLlxuICAgKi9cbiAgdXBkYXRlcjxcbiAgICAvLyBBbGxvdyB0byBmb3JjZS1wcm92aWRlIHRoZSB0eXBlXG4gICAgUHJvdmlkZWRUeXBlID0gdm9pZCxcbiAgICAvLyBUaGlzIHR5cGUgaXMgZGVyaXZlZCBmcm9tIHRoZSBgdmFsdWVgIHByb3BlcnR5LCBkZWZhdWx0aW5nIHRvIHZvaWQgaWYgaXQncyBtaXNzaW5nXG4gICAgT3JpZ2luVHlwZSA9IFByb3ZpZGVkVHlwZSxcbiAgICAvLyBUaGUgVmFsdWUgdHlwZSBpcyBhc3NpZ25lZCBmcm9tIHRoZSBPcmlnaW5cbiAgICBWYWx1ZVR5cGUgPSBPcmlnaW5UeXBlLFxuICAgIC8vIFJldHVybiBlaXRoZXIgYW4gZW1wdHkgY2FsbGJhY2sgb3IgYSBmdW5jdGlvbiByZXF1aXJpbmcgc3BlY2lmaWMgdHlwZXMgYXMgaW5wdXRzXG4gICAgUmV0dXJuVHlwZSA9IE9yaWdpblR5cGUgZXh0ZW5kcyB2b2lkXG4gICAgICA/ICgpID0+IHZvaWRcbiAgICAgIDogKG9ic2VydmFibGVPclZhbHVlOiBWYWx1ZVR5cGUgfCBPYnNlcnZhYmxlPFZhbHVlVHlwZT4pID0+IFN1YnNjcmlwdGlvblxuICA+KHVwZGF0ZXJGbjogKHN0YXRlOiBULCB2YWx1ZTogT3JpZ2luVHlwZSkgPT4gVCk6IFJldHVyblR5cGUge1xuICAgIHJldHVybiAoKFxuICAgICAgb2JzZXJ2YWJsZU9yVmFsdWU/OiBPcmlnaW5UeXBlIHwgT2JzZXJ2YWJsZTxPcmlnaW5UeXBlPlxuICAgICk6IFN1YnNjcmlwdGlvbiA9PiB7XG4gICAgICBsZXQgaW5pdGlhbGl6YXRpb25FcnJvcjogRXJyb3IgfCB1bmRlZmluZWQ7XG4gICAgICAvLyBXZSBjYW4gcmVjZWl2ZSBlaXRoZXIgdGhlIHZhbHVlIG9yIGFuIG9ic2VydmFibGUuIEluIGNhc2UgaXQncyBhXG4gICAgICAvLyBzaW1wbGUgdmFsdWUsIHdlJ2xsIHdyYXAgaXQgd2l0aCBgb2ZgIG9wZXJhdG9yIHRvIHR1cm4gaXQgaW50b1xuICAgICAgLy8gT2JzZXJ2YWJsZS5cbiAgICAgIGNvbnN0IG9ic2VydmFibGUkID0gaXNPYnNlcnZhYmxlKG9ic2VydmFibGVPclZhbHVlKVxuICAgICAgICA/IG9ic2VydmFibGVPclZhbHVlXG4gICAgICAgIDogb2Yob2JzZXJ2YWJsZU9yVmFsdWUpO1xuICAgICAgY29uc3Qgc3Vic2NyaXB0aW9uID0gb2JzZXJ2YWJsZSRcbiAgICAgICAgLnBpcGUoXG4gICAgICAgICAgY29uY2F0TWFwKCh2YWx1ZSkgPT5cbiAgICAgICAgICAgIHRoaXMuaXNJbml0aWFsaXplZFxuICAgICAgICAgICAgICA/IC8vIFB1c2ggdGhlIHZhbHVlIGludG8gcXVldWVTY2hlZHVsZXJcbiAgICAgICAgICAgICAgICBzY2hlZHVsZWQoW3ZhbHVlXSwgcXVldWVTY2hlZHVsZXIpLnBpcGUoXG4gICAgICAgICAgICAgICAgICB3aXRoTGF0ZXN0RnJvbSh0aGlzLnN0YXRlU3ViamVjdCQpXG4gICAgICAgICAgICAgICAgKVxuICAgICAgICAgICAgICA6IC8vIElmIHN0YXRlIHdhcyBub3QgaW5pdGlhbGl6ZWQsIHdlJ2xsIHRocm93IGFuIGVycm9yLlxuICAgICAgICAgICAgICAgIHRocm93RXJyb3IobmV3IEVycm9yKHRoaXMubm90SW5pdGlhbGl6ZWRFcnJvck1lc3NhZ2UpKVxuICAgICAgICAgICksXG4gICAgICAgICAgdGFrZVVudGlsKHRoaXMuZGVzdHJveSQpXG4gICAgICAgIClcbiAgICAgICAgLnN1YnNjcmliZSh7XG4gICAgICAgICAgbmV4dDogKFt2YWx1ZSwgY3VycmVudFN0YXRlXSkgPT4ge1xuICAgICAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1ub24tbnVsbC1hc3NlcnRpb25cbiAgICAgICAgICAgIHRoaXMuc3RhdGVTdWJqZWN0JC5uZXh0KHVwZGF0ZXJGbihjdXJyZW50U3RhdGUsIHZhbHVlISkpO1xuICAgICAgICAgIH0sXG4gICAgICAgICAgZXJyb3I6IChlcnJvcjogRXJyb3IpID0+IHtcbiAgICAgICAgICAgIGluaXRpYWxpemF0aW9uRXJyb3IgPSBlcnJvcjtcbiAgICAgICAgICAgIHRoaXMuc3RhdGVTdWJqZWN0JC5lcnJvcihlcnJvcik7XG4gICAgICAgICAgfSxcbiAgICAgICAgfSk7XG5cbiAgICAgIGlmIChpbml0aWFsaXphdGlvbkVycm9yKSB7XG4gICAgICAgIC8vIHByZXR0aWVyLWlnbm9yZVxuICAgICAgICB0aHJvdyAvKiogQHR5cGUgeyFFcnJvcn0gKi8gKGluaXRpYWxpemF0aW9uRXJyb3IpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHN1YnNjcmlwdGlvbjtcbiAgICB9KSBhcyB1bmtub3duIGFzIFJldHVyblR5cGU7XG4gIH1cblxuICAvKipcbiAgICogSW5pdGlhbGl6ZXMgc3RhdGUuIElmIGl0IHdhcyBhbHJlYWR5IGluaXRpYWxpemVkIHRoZW4gaXQgcmVzZXRzIHRoZVxuICAgKiBzdGF0ZS5cbiAgICovXG4gIHByaXZhdGUgaW5pdFN0YXRlKHN0YXRlOiBUKTogdm9pZCB7XG4gICAgc2NoZWR1bGVkKFtzdGF0ZV0sIHF1ZXVlU2NoZWR1bGVyKS5zdWJzY3JpYmUoKHMpID0+IHtcbiAgICAgIHRoaXMuaXNJbml0aWFsaXplZCA9IHRydWU7XG4gICAgICB0aGlzLnN0YXRlU3ViamVjdCQubmV4dChzKTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBTZXRzIHRoZSBzdGF0ZSBzcGVjaWZpYyB2YWx1ZS5cbiAgICogQHBhcmFtIHN0YXRlT3JVcGRhdGVyRm4gb2JqZWN0IG9mIHRoZSBzYW1lIHR5cGUgYXMgdGhlIHN0YXRlIG9yIGFuXG4gICAqIHVwZGF0ZXJGbiwgcmV0dXJuaW5nIHN1Y2ggb2JqZWN0LlxuICAgKi9cbiAgc2V0U3RhdGUoc3RhdGVPclVwZGF0ZXJGbjogVCB8ICgoc3RhdGU6IFQpID0+IFQpKTogdm9pZCB7XG4gICAgaWYgKHR5cGVvZiBzdGF0ZU9yVXBkYXRlckZuICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICB0aGlzLmluaXRTdGF0ZShzdGF0ZU9yVXBkYXRlckZuKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy51cGRhdGVyKHN0YXRlT3JVcGRhdGVyRm4gYXMgKHN0YXRlOiBUKSA9PiBUKSgpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBQYXRjaGVzIHRoZSBzdGF0ZSB3aXRoIHByb3ZpZGVkIHBhcnRpYWwgc3RhdGUuXG4gICAqXG4gICAqIEBwYXJhbSBwYXJ0aWFsU3RhdGVPclVwZGF0ZXJGbiBhIHBhcnRpYWwgc3RhdGUgb3IgYSBwYXJ0aWFsIHVwZGF0ZXJcbiAgICogZnVuY3Rpb24gdGhhdCBhY2NlcHRzIHRoZSBzdGF0ZSBhbmQgcmV0dXJucyB0aGUgcGFydGlhbCBzdGF0ZS5cbiAgICogQHRocm93cyBFcnJvciBpZiB0aGUgc3RhdGUgaXMgbm90IGluaXRpYWxpemVkLlxuICAgKi9cbiAgcGF0Y2hTdGF0ZShcbiAgICBwYXJ0aWFsU3RhdGVPclVwZGF0ZXJGbjpcbiAgICAgIHwgUGFydGlhbDxUPlxuICAgICAgfCBPYnNlcnZhYmxlPFBhcnRpYWw8VD4+XG4gICAgICB8ICgoc3RhdGU6IFQpID0+IFBhcnRpYWw8VD4pXG4gICk6IHZvaWQge1xuICAgIGNvbnN0IHBhdGNoZWRTdGF0ZSA9XG4gICAgICB0eXBlb2YgcGFydGlhbFN0YXRlT3JVcGRhdGVyRm4gPT09ICdmdW5jdGlvbidcbiAgICAgICAgPyBwYXJ0aWFsU3RhdGVPclVwZGF0ZXJGbih0aGlzLmdldCgpKVxuICAgICAgICA6IHBhcnRpYWxTdGF0ZU9yVXBkYXRlckZuO1xuXG4gICAgdGhpcy51cGRhdGVyKChzdGF0ZSwgcGFydGlhbFN0YXRlOiBQYXJ0aWFsPFQ+KSA9PiAoe1xuICAgICAgLi4uc3RhdGUsXG4gICAgICAuLi5wYXJ0aWFsU3RhdGUsXG4gICAgfSkpKHBhdGNoZWRTdGF0ZSk7XG4gIH1cblxuICBwcm90ZWN0ZWQgZ2V0KCk6IFQ7XG4gIHByb3RlY3RlZCBnZXQ8Uj4ocHJvamVjdG9yOiAoczogVCkgPT4gUik6IFI7XG4gIHByb3RlY3RlZCBnZXQ8Uj4ocHJvamVjdG9yPzogKHM6IFQpID0+IFIpOiBSIHwgVCB7XG4gICAgaWYgKCF0aGlzLmlzSW5pdGlhbGl6ZWQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcih0aGlzLm5vdEluaXRpYWxpemVkRXJyb3JNZXNzYWdlKTtcbiAgICB9XG4gICAgbGV0IHZhbHVlOiBSIHwgVDtcblxuICAgIHRoaXMuc3RhdGVTdWJqZWN0JC5waXBlKHRha2UoMSkpLnN1YnNjcmliZSgoc3RhdGUpID0+IHtcbiAgICAgIHZhbHVlID0gcHJvamVjdG9yID8gcHJvamVjdG9yKHN0YXRlKSA6IHN0YXRlO1xuICAgIH0pO1xuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tbm9uLW51bGwtYXNzZXJ0aW9uXG4gICAgcmV0dXJuIHZhbHVlITtcbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgc2VsZWN0b3IuXG4gICAqXG4gICAqIEBwYXJhbSBwcm9qZWN0b3IgQSBwdXJlIHByb2plY3Rpb24gZnVuY3Rpb24gdGhhdCB0YWtlcyB0aGUgY3VycmVudCBzdGF0ZSBhbmRcbiAgICogICByZXR1cm5zIHNvbWUgbmV3IHNsaWNlL3Byb2plY3Rpb24gb2YgdGhhdCBzdGF0ZS5cbiAgICogQHBhcmFtIGNvbmZpZyBTZWxlY3RDb25maWcgdGhhdCBjaGFuZ2VzIHRoZSBiZWhhdmlvciBvZiBzZWxlY3RvciwgaW5jbHVkaW5nXG4gICAqICAgdGhlIGRlYm91bmNpbmcgb2YgdGhlIHZhbHVlcyB1bnRpbCB0aGUgc3RhdGUgaXMgc2V0dGxlZC5cbiAgICogQHJldHVybiBBbiBvYnNlcnZhYmxlIG9mIHRoZSBwcm9qZWN0b3IgcmVzdWx0cy5cbiAgICovXG4gIHNlbGVjdDxSZXN1bHQ+KFxuICAgIHByb2plY3RvcjogKHM6IFQpID0+IFJlc3VsdCxcbiAgICBjb25maWc/OiBTZWxlY3RDb25maWdcbiAgKTogT2JzZXJ2YWJsZTxSZXN1bHQ+O1xuICBzZWxlY3Q8U2VsZWN0b3JzIGV4dGVuZHMgT2JzZXJ2YWJsZTx1bmtub3duPltdLCBSZXN1bHQ+KFxuICAgIC4uLmFyZ3M6IFsuLi5zZWxlY3RvcnM6IFNlbGVjdG9ycywgcHJvamVjdG9yOiBQcm9qZWN0b3I8U2VsZWN0b3JzLCBSZXN1bHQ+XVxuICApOiBPYnNlcnZhYmxlPFJlc3VsdD47XG4gIHNlbGVjdDxTZWxlY3RvcnMgZXh0ZW5kcyBPYnNlcnZhYmxlPHVua25vd24+W10sIFJlc3VsdD4oXG4gICAgLi4uYXJnczogW1xuICAgICAgLi4uc2VsZWN0b3JzOiBTZWxlY3RvcnMsXG4gICAgICBwcm9qZWN0b3I6IFByb2plY3RvcjxTZWxlY3RvcnMsIFJlc3VsdD4sXG4gICAgICBjb25maWc6IFNlbGVjdENvbmZpZ1xuICAgIF1cbiAgKTogT2JzZXJ2YWJsZTxSZXN1bHQ+O1xuICBzZWxlY3Q8XG4gICAgU2VsZWN0b3JzIGV4dGVuZHMgQXJyYXk8T2JzZXJ2YWJsZTx1bmtub3duPiB8IFNlbGVjdENvbmZpZyB8IFByb2plY3RvckZuPixcbiAgICBSZXN1bHQsXG4gICAgUHJvamVjdG9yRm4gPSAoLi4uYTogdW5rbm93bltdKSA9PiBSZXN1bHRcbiAgPiguLi5hcmdzOiBTZWxlY3RvcnMpOiBPYnNlcnZhYmxlPFJlc3VsdD4ge1xuICAgIGNvbnN0IHsgb2JzZXJ2YWJsZXMsIHByb2plY3RvciwgY29uZmlnIH0gPSBwcm9jZXNzU2VsZWN0b3JBcmdzPFxuICAgICAgU2VsZWN0b3JzLFxuICAgICAgUmVzdWx0XG4gICAgPihhcmdzKTtcblxuICAgIGxldCBvYnNlcnZhYmxlJDogT2JzZXJ2YWJsZTxSZXN1bHQ+O1xuICAgIC8vIElmIHRoZXJlIGFyZSBubyBPYnNlcnZhYmxlcyB0byBjb21iaW5lLCB0aGVuIHdlJ2xsIGp1c3QgbWFwIHRoZSB2YWx1ZS5cbiAgICBpZiAob2JzZXJ2YWJsZXMubGVuZ3RoID09PSAwKSB7XG4gICAgICBvYnNlcnZhYmxlJCA9IHRoaXMuc3RhdGVTdWJqZWN0JC5waXBlKFxuICAgICAgICBjb25maWcuZGVib3VuY2UgPyBkZWJvdW5jZVN5bmMoKSA6IChzb3VyY2UkKSA9PiBzb3VyY2UkLFxuICAgICAgICBtYXAocHJvamVjdG9yKVxuICAgICAgKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gSWYgdGhlcmUgYXJlIG11bHRpcGxlIGFyZ3VtZW50cywgdGhlbiB3ZSdyZSBhZ2dyZWdhdGluZyBzZWxlY3RvcnMsIHNvIHdlIG5lZWRcbiAgICAgIC8vIHRvIHRha2UgdGhlIGNvbWJpbmVMYXRlc3Qgb2YgdGhlbSBiZWZvcmUgY2FsbGluZyB0aGUgbWFwIGZ1bmN0aW9uLlxuICAgICAgb2JzZXJ2YWJsZSQgPSBjb21iaW5lTGF0ZXN0KG9ic2VydmFibGVzKS5waXBlKFxuICAgICAgICBjb25maWcuZGVib3VuY2UgPyBkZWJvdW5jZVN5bmMoKSA6IChzb3VyY2UkKSA9PiBzb3VyY2UkLFxuICAgICAgICBtYXAoKHByb2plY3RvckFyZ3MpID0+IHByb2plY3RvciguLi5wcm9qZWN0b3JBcmdzKSlcbiAgICAgICk7XG4gICAgfVxuXG4gICAgcmV0dXJuIG9ic2VydmFibGUkLnBpcGUoXG4gICAgICBkaXN0aW5jdFVudGlsQ2hhbmdlZCgpLFxuICAgICAgc2hhcmVSZXBsYXkoe1xuICAgICAgICByZWZDb3VudDogdHJ1ZSxcbiAgICAgICAgYnVmZmVyU2l6ZTogMSxcbiAgICAgIH0pLFxuICAgICAgdGFrZVVudGlsKHRoaXMuZGVzdHJveSQpXG4gICAgKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGVzIGFuIGVmZmVjdC5cbiAgICpcbiAgICogVGhpcyBlZmZlY3QgaXMgc3Vic2NyaWJlZCB0byB0aHJvdWdob3V0IHRoZSBsaWZlY3ljbGUgb2YgdGhlIENvbXBvbmVudFN0b3JlLlxuICAgKiBAcGFyYW0gZ2VuZXJhdG9yIEEgZnVuY3Rpb24gdGhhdCB0YWtlcyBhbiBvcmlnaW4gT2JzZXJ2YWJsZSBpbnB1dCBhbmRcbiAgICogICAgIHJldHVybnMgYW4gT2JzZXJ2YWJsZS4gVGhlIE9ic2VydmFibGUgdGhhdCBpcyByZXR1cm5lZCB3aWxsIGJlXG4gICAqICAgICBzdWJzY3JpYmVkIHRvIGZvciB0aGUgbGlmZSBvZiB0aGUgY29tcG9uZW50LlxuICAgKiBAcmV0dXJuIEEgZnVuY3Rpb24gdGhhdCwgd2hlbiBjYWxsZWQsIHdpbGwgdHJpZ2dlciB0aGUgb3JpZ2luIE9ic2VydmFibGUuXG4gICAqL1xuICBlZmZlY3Q8XG4gICAgLy8gVGhpcyB0eXBlIHF1aWNrbHkgYmVjYW1lIHBhcnQgb2YgZWZmZWN0ICdBUEknXG4gICAgUHJvdmlkZWRUeXBlID0gdm9pZCxcbiAgICAvLyBUaGUgYWN0dWFsIG9yaWdpbiQgdHlwZSwgd2hpY2ggY291bGQgYmUgdW5rbm93biwgd2hlbiBub3Qgc3BlY2lmaWVkXG4gICAgT3JpZ2luVHlwZSBleHRlbmRzXG4gICAgICB8IE9ic2VydmFibGU8UHJvdmlkZWRUeXBlPlxuICAgICAgfCB1bmtub3duID0gT2JzZXJ2YWJsZTxQcm92aWRlZFR5cGU+LFxuICAgIC8vIFVud3JhcHBlZCBhY3R1YWwgdHlwZSBvZiB0aGUgb3JpZ2luJCBPYnNlcnZhYmxlLCBhZnRlciBkZWZhdWx0IHdhcyBhcHBsaWVkXG4gICAgT2JzZXJ2YWJsZVR5cGUgPSBPcmlnaW5UeXBlIGV4dGVuZHMgT2JzZXJ2YWJsZTxpbmZlciBBPiA/IEEgOiBuZXZlcixcbiAgICAvLyBSZXR1cm4gZWl0aGVyIGFuIGVtcHR5IGNhbGxiYWNrIG9yIGEgZnVuY3Rpb24gcmVxdWlyaW5nIHNwZWNpZmljIHR5cGVzIGFzIGlucHV0c1xuICAgIFJldHVyblR5cGUgPSBQcm92aWRlZFR5cGUgfCBPYnNlcnZhYmxlVHlwZSBleHRlbmRzIHZvaWRcbiAgICAgID8gKCkgPT4gdm9pZFxuICAgICAgOiAoXG4gICAgICAgICAgb2JzZXJ2YWJsZU9yVmFsdWU6IE9ic2VydmFibGVUeXBlIHwgT2JzZXJ2YWJsZTxPYnNlcnZhYmxlVHlwZT5cbiAgICAgICAgKSA9PiBTdWJzY3JpcHRpb25cbiAgPihnZW5lcmF0b3I6IChvcmlnaW4kOiBPcmlnaW5UeXBlKSA9PiBPYnNlcnZhYmxlPHVua25vd24+KTogUmV0dXJuVHlwZSB7XG4gICAgY29uc3Qgb3JpZ2luJCA9IG5ldyBTdWJqZWN0PE9ic2VydmFibGVUeXBlPigpO1xuICAgIGdlbmVyYXRvcihvcmlnaW4kIGFzIE9yaWdpblR5cGUpXG4gICAgICAvLyB0aWVkIHRvIHRoZSBsaWZlY3ljbGUg8J+RhyBvZiBDb21wb25lbnRTdG9yZVxuICAgICAgLnBpcGUodGFrZVVudGlsKHRoaXMuZGVzdHJveSQpKVxuICAgICAgLnN1YnNjcmliZSgpO1xuXG4gICAgcmV0dXJuICgoXG4gICAgICBvYnNlcnZhYmxlT3JWYWx1ZT86IE9ic2VydmFibGVUeXBlIHwgT2JzZXJ2YWJsZTxPYnNlcnZhYmxlVHlwZT5cbiAgICApOiBTdWJzY3JpcHRpb24gPT4ge1xuICAgICAgY29uc3Qgb2JzZXJ2YWJsZSQgPSBpc09ic2VydmFibGUob2JzZXJ2YWJsZU9yVmFsdWUpXG4gICAgICAgID8gb2JzZXJ2YWJsZU9yVmFsdWVcbiAgICAgICAgOiBvZihvYnNlcnZhYmxlT3JWYWx1ZSk7XG4gICAgICByZXR1cm4gb2JzZXJ2YWJsZSQucGlwZSh0YWtlVW50aWwodGhpcy5kZXN0cm95JCkpLnN1YnNjcmliZSgodmFsdWUpID0+IHtcbiAgICAgICAgLy8gYW55IG5ldyDwn5GHIHZhbHVlIGlzIHB1c2hlZCBpbnRvIGEgc3RyZWFtXG4gICAgICAgIG9yaWdpbiQubmV4dCh2YWx1ZSBhcyBPYnNlcnZhYmxlVHlwZSk7XG4gICAgICB9KTtcbiAgICB9KSBhcyB1bmtub3duIGFzIFJldHVyblR5cGU7XG4gIH1cbn1cblxuZnVuY3Rpb24gcHJvY2Vzc1NlbGVjdG9yQXJnczxcbiAgU2VsZWN0b3JzIGV4dGVuZHMgQXJyYXk8T2JzZXJ2YWJsZTx1bmtub3duPiB8IFNlbGVjdENvbmZpZyB8IFByb2plY3RvckZuPixcbiAgUmVzdWx0LFxuICBQcm9qZWN0b3JGbiA9ICguLi5hOiB1bmtub3duW10pID0+IFJlc3VsdFxuPihcbiAgYXJnczogU2VsZWN0b3JzXG4pOiB7XG4gIG9ic2VydmFibGVzOiBPYnNlcnZhYmxlPHVua25vd24+W107XG4gIHByb2plY3RvcjogUHJvamVjdG9yRm47XG4gIGNvbmZpZzogUmVxdWlyZWQ8U2VsZWN0Q29uZmlnPjtcbn0ge1xuICBjb25zdCBzZWxlY3RvckFyZ3MgPSBBcnJheS5mcm9tKGFyZ3MpO1xuICAvLyBBc3NpZ24gZGVmYXVsdCB2YWx1ZXMuXG4gIGxldCBjb25maWc6IFJlcXVpcmVkPFNlbGVjdENvbmZpZz4gPSB7IGRlYm91bmNlOiBmYWxzZSB9O1xuICBsZXQgcHJvamVjdG9yOiBQcm9qZWN0b3JGbjtcbiAgLy8gTGFzdCBhcmd1bWVudCBpcyBlaXRoZXIgcHJvamVjdG9yIG9yIGNvbmZpZ1xuICBjb25zdCBwcm9qZWN0b3JPckNvbmZpZyA9IHNlbGVjdG9yQXJncy5wb3AoKSBhcyBQcm9qZWN0b3JGbiB8IFNlbGVjdENvbmZpZztcblxuICBpZiAodHlwZW9mIHByb2plY3Rvck9yQ29uZmlnICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgLy8gV2UgZ290IHRoZSBjb25maWcgYXMgdGhlIGxhc3QgYXJndW1lbnQsIHJlcGxhY2UgYW55IGRlZmF1bHQgdmFsdWVzIHdpdGggaXQuXG4gICAgY29uZmlnID0geyAuLi5jb25maWcsIC4uLnByb2plY3Rvck9yQ29uZmlnIH07XG4gICAgLy8gUG9wIHRoZSBuZXh0IGFyZ3MsIHdoaWNoIHdvdWxkIGJlIHRoZSBwcm9qZWN0b3IgZm4uXG4gICAgcHJvamVjdG9yID0gc2VsZWN0b3JBcmdzLnBvcCgpIGFzIFByb2plY3RvckZuO1xuICB9IGVsc2Uge1xuICAgIHByb2plY3RvciA9IHByb2plY3Rvck9yQ29uZmlnO1xuICB9XG4gIC8vIFRoZSBPYnNlcnZhYmxlcyB0byBjb21iaW5lLCBpZiB0aGVyZSBhcmUgYW55LlxuICBjb25zdCBvYnNlcnZhYmxlcyA9IHNlbGVjdG9yQXJncyBhcyBPYnNlcnZhYmxlPHVua25vd24+W107XG4gIHJldHVybiB7XG4gICAgb2JzZXJ2YWJsZXMsXG4gICAgcHJvamVjdG9yLFxuICAgIGNvbmZpZyxcbiAgfTtcbn1cbiJdfQ==