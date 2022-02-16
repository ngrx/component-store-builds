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
        this.updater((state, partialState) => ({
            ...state,
            ...partialState,
        }))(patchedState);
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
/** @nocollapse */ /** @nocollapse */ ComponentStore.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "13.0.0", ngImport: i0, type: ComponentStore, deps: [{ token: INITIAL_STATE_TOKEN, optional: true }], target: i0.ɵɵFactoryTarget.Injectable });
/** @nocollapse */ /** @nocollapse */ ComponentStore.ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "13.0.0", ngImport: i0, type: ComponentStore });
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "13.0.0", ngImport: i0, type: ComponentStore, decorators: [{
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
        config = { ...config, ...projectorOrConfig };
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcG9uZW50LXN0b3JlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vbW9kdWxlcy9jb21wb25lbnQtc3RvcmUvc3JjL2NvbXBvbmVudC1zdG9yZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQ0wsWUFBWSxFQUVaLEVBQUUsRUFDRixhQUFhLEVBRWIsVUFBVSxFQUNWLGFBQWEsRUFDYixPQUFPLEVBQ1AsY0FBYyxFQUNkLFNBQVMsR0FDVixNQUFNLE1BQU0sQ0FBQztBQUNkLE9BQU8sRUFDTCxTQUFTLEVBQ1QsU0FBUyxFQUNULGNBQWMsRUFDZCxHQUFHLEVBQ0gsb0JBQW9CLEVBQ3BCLFdBQVcsRUFDWCxJQUFJLEdBQ0wsTUFBTSxnQkFBZ0IsQ0FBQztBQUN4QixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFDL0MsT0FBTyxFQUNMLFVBQVUsRUFFVixRQUFRLEVBQ1IsY0FBYyxFQUNkLE1BQU0sR0FDUCxNQUFNLGVBQWUsQ0FBQzs7QUFNdkIsTUFBTSxDQUFDLE1BQU0sbUJBQW1CLEdBQUcsSUFBSSxjQUFjLENBQ25ELHFDQUFxQyxDQUN0QyxDQUFDO0FBYUYsTUFBTSxPQUFPLGNBQWM7SUFjekIsWUFBcUQsWUFBZ0I7UUFickUsc0NBQXNDO1FBQ3JCLG9CQUFlLEdBQUcsSUFBSSxhQUFhLENBQU8sQ0FBQyxDQUFDLENBQUM7UUFDOUQsOERBQThEO1FBQ3JELGFBQVEsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLFlBQVksRUFBRSxDQUFDO1FBRXZDLGtCQUFhLEdBQUcsSUFBSSxhQUFhLENBQUksQ0FBQyxDQUFDLENBQUM7UUFDakQsa0JBQWEsR0FBRyxLQUFLLENBQUM7UUFDdEIsK0JBQTBCLEdBQ2hDLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLGlDQUFpQztZQUN6RCw2REFBNkQsQ0FBQztRQUNoRSxzRUFBc0U7UUFDN0QsV0FBTSxHQUFrQixJQUFJLENB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QUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRTtnQkFDcEUsMkNBQTJDO2dCQUMzQyxPQUFPLENBQUMsSUFBSSxDQUFDLEtBQXVCLENBQUMsQ0FBQztZQUN4QyxDQUFDLENBQUMsQ0FBQztRQUNMLENBQUMsQ0FBMEIsQ0FBQztJQUM5QixDQUFDOztpSkFwUVUsY0FBYyxrQkFjTyxtQkFBbUI7cUpBZHhDLGNBQWM7MkZBQWQsY0FBYztrQkFEMUIsVUFBVTs7MEJBZUksUUFBUTs7MEJBQUksTUFBTTsyQkFBQyxtQkFBbUI7O0FBeVByRCxTQUFTLG1CQUFtQixDQUsxQixJQUFlO0lBTWYsTUFBTSxZQUFZLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUN0Qyx5QkFBeUI7SUFDekIsSUFBSSxNQUFNLEdBQTJCLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxDQUFDO0lBQ3pELElBQUksU0FBc0IsQ0FBQztJQUMzQiw4Q0FBOEM7SUFDOUMsTUFBTSxpQkFBaUIsR0FBRyxZQUFZLENBQUMsR0FBRyxFQUFnQyxDQUFDO0lBRTNFLElBQUksT0FBTyxpQkFBaUIsS0FBSyxVQUFVLEVBQUU7UUFDM0MsOEVBQThFO1FBQzlFLE1BQU0sR0FBRyxFQUFFLEdBQUcsTUFBTSxFQUFFLEdBQUcsaUJBQWlCLEVBQUUsQ0FBQztRQUM3QyxzREFBc0Q7UUFDdEQsU0FBUyxHQUFHLFlBQVksQ0FBQyxHQUFHLEVBQWlCLENBQUM7S0FDL0M7U0FBTTtRQUNMLFNBQVMsR0FBRyxpQkFBaUIsQ0FBQztLQUMvQjtJQUNELGdEQUFnRDtJQUNoRCxNQUFNLFdBQVcsR0FBRyxZQUFxQyxDQUFDO0lBQzFELE9BQU87UUFDTCxXQUFXO1FBQ1gsU0FBUztRQUNULE1BQU07S0FDUCxDQUFDO0FBQ0osQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7XG4gIGlzT2JzZXJ2YWJsZSxcbiAgT2JzZXJ2YWJsZSxcbiAgb2YsXG4gIFJlcGxheVN1YmplY3QsXG4gIFN1YnNjcmlwdGlvbixcbiAgdGhyb3dFcnJvcixcbiAgY29tYmluZUxhdGVzdCxcbiAgU3ViamVjdCxcbiAgcXVldWVTY2hlZHVsZXIsXG4gIHNjaGVkdWxlZCxcbn0gZnJvbSAncnhqcyc7XG5pbXBvcnQge1xuICBjb25jYXRNYXAsXG4gIHRha2VVbnRpbCxcbiAgd2l0aExhdGVzdEZyb20sXG4gIG1hcCxcbiAgZGlzdGluY3RVbnRpbENoYW5nZWQsXG4gIHNoYXJlUmVwbGF5LFxuICB0YWtlLFxufSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQgeyBkZWJvdW5jZVN5bmMgfSBmcm9tICcuL2RlYm91bmNlLXN5bmMnO1xuaW1wb3J0IHtcbiAgSW5qZWN0YWJsZSxcbiAgT25EZXN0cm95LFxuICBPcHRpb25hbCxcbiAgSW5qZWN0aW9uVG9rZW4sXG4gIEluamVjdCxcbn0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgU2VsZWN0Q29uZmlnIHtcbiAgZGVib3VuY2U/OiBib29sZWFuO1xufVxuXG5leHBvcnQgY29uc3QgSU5JVElBTF9TVEFURV9UT0tFTiA9IG5ldyBJbmplY3Rpb25Ub2tlbihcbiAgJ0BuZ3J4L2NvbXBvbmVudC1zdG9yZSBJbml0aWFsIFN0YXRlJ1xuKTtcblxuZXhwb3J0IHR5cGUgU2VsZWN0b3JSZXN1bHRzPFNlbGVjdG9ycyBleHRlbmRzIE9ic2VydmFibGU8dW5rbm93bj5bXT4gPSB7XG4gIFtLZXkgaW4ga2V5b2YgU2VsZWN0b3JzXTogU2VsZWN0b3JzW0tleV0gZXh0ZW5kcyBPYnNlcnZhYmxlPGluZmVyIFU+XG4gICAgPyBVXG4gICAgOiBuZXZlcjtcbn07XG5cbmV4cG9ydCB0eXBlIFByb2plY3RvcjxTZWxlY3RvcnMgZXh0ZW5kcyBPYnNlcnZhYmxlPHVua25vd24+W10sIFJlc3VsdD4gPSAoXG4gIC4uLmFyZ3M6IFNlbGVjdG9yUmVzdWx0czxTZWxlY3RvcnM+XG4pID0+IFJlc3VsdDtcblxuQEluamVjdGFibGUoKVxuZXhwb3J0IGNsYXNzIENvbXBvbmVudFN0b3JlPFQgZXh0ZW5kcyBvYmplY3Q+IGltcGxlbWVudHMgT25EZXN0cm95IHtcbiAgLy8gU2hvdWxkIGJlIHVzZWQgb25seSBpbiBuZ09uRGVzdHJveS5cbiAgcHJpdmF0ZSByZWFkb25seSBkZXN0cm95U3ViamVjdCQgPSBuZXcgUmVwbGF5U3ViamVjdDx2b2lkPigxKTtcbiAgLy8gRXhwb3NlZCB0byBhbnkgZXh0ZW5kaW5nIFN0b3JlIHRvIGJlIHVzZWQgZm9yIHRoZSB0ZWFyZG93bi5cbiAgcmVhZG9ubHkgZGVzdHJveSQgPSB0aGlzLmRlc3Ryb3lTdWJqZWN0JC5hc09ic2VydmFibGUoKTtcblxuICBwcml2YXRlIHJlYWRvbmx5IHN0YXRlU3ViamVjdCQgPSBuZXcgUmVwbGF5U3ViamVjdDxUPigxKTtcbiAgcHJpdmF0ZSBpc0luaXRpYWxpemVkID0gZmFsc2U7XG4gIHByaXZhdGUgbm90SW5pdGlhbGl6ZWRFcnJvck1lc3NhZ2UgPVxuICAgIGAke3RoaXMuY29uc3RydWN0b3IubmFtZX0gaGFzIG5vdCBiZWVuIGluaXRpYWxpemVkIHlldC4gYCArXG4gICAgYFBsZWFzZSBtYWtlIHN1cmUgaXQgaXMgaW5pdGlhbGl6ZWQgYmVmb3JlIHVwZGF0aW5nL2dldHRpbmcuYDtcbiAgLy8gTmVlZHMgdG8gYmUgYWZ0ZXIgZGVzdHJveSQgaXMgZGVjbGFyZWQgYmVjYXVzZSBpdCdzIHVzZWQgaW4gc2VsZWN0LlxuICByZWFkb25seSBzdGF0ZSQ6IE9ic2VydmFibGU8VD4gPSB0aGlzLnNlbGVjdCgocykgPT4gcyk7XG5cbiAgY29uc3RydWN0b3IoQE9wdGlvbmFsKCkgQEluamVjdChJTklUSUFMX1NUQVRFX1RPS0VOKSBkZWZhdWx0U3RhdGU/OiBUKSB7XG4gICAgLy8gU3RhdGUgY2FuIGJlIGluaXRpYWxpemVkIGVpdGhlciB0aHJvdWdoIGNvbnN0cnVjdG9yIG9yIHNldFN0YXRlLlxuICAgIGlmIChkZWZhdWx0U3RhdGUpIHtcbiAgICAgIHRoaXMuaW5pdFN0YXRlKGRlZmF1bHRTdGF0ZSk7XG4gICAgfVxuICB9XG5cbiAgLyoqIENvbXBsZXRlcyBhbGwgcmVsZXZhbnQgT2JzZXJ2YWJsZSBzdHJlYW1zLiAqL1xuICBuZ09uRGVzdHJveSgpIHtcbiAgICB0aGlzLnN0YXRlU3ViamVjdCQuY29tcGxldGUoKTtcbiAgICB0aGlzLmRlc3Ryb3lTdWJqZWN0JC5uZXh0KCk7XG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlcyBhbiB1cGRhdGVyLlxuICAgKlxuICAgKiBUaHJvd3MgYW4gZXJyb3IgaWYgdXBkYXRlciBpcyBjYWxsZWQgd2l0aCBzeW5jaHJvbm91cyB2YWx1ZXMgKGVpdGhlclxuICAgKiBpbXBlcmF0aXZlIHZhbHVlIG9yIE9ic2VydmFibGUgdGhhdCBpcyBzeW5jaHJvbm91cykgYmVmb3JlIENvbXBvbmVudFN0b3JlXG4gICAqIGlzIGluaXRpYWxpemVkLiBJZiBjYWxsZWQgd2l0aCBhc3luYyBPYnNlcnZhYmxlIGJlZm9yZSBpbml0aWFsaXphdGlvbiB0aGVuXG4gICAqIHN0YXRlIHdpbGwgbm90IGJlIHVwZGF0ZWQgYW5kIHN1YnNjcmlwdGlvbiB3b3VsZCBiZSBjbG9zZWQuXG4gICAqXG4gICAqIEBwYXJhbSB1cGRhdGVyRm4gQSBzdGF0aWMgdXBkYXRlciBmdW5jdGlvbiB0aGF0IHRha2VzIDIgcGFyYW1ldGVycyAodGhlXG4gICAqIGN1cnJlbnQgc3RhdGUgYW5kIGFuIGFyZ3VtZW50IG9iamVjdCkgYW5kIHJldHVybnMgYSBuZXcgaW5zdGFuY2Ugb2YgdGhlXG4gICAqIHN0YXRlLlxuICAgKiBAcmV0dXJuIEEgZnVuY3Rpb24gdGhhdCBhY2NlcHRzIG9uZSBhcmd1bWVudCB3aGljaCBpcyBmb3J3YXJkZWQgYXMgdGhlXG4gICAqICAgICBzZWNvbmQgYXJndW1lbnQgdG8gYHVwZGF0ZXJGbmAuIEV2ZXJ5IHRpbWUgdGhpcyBmdW5jdGlvbiBpcyBjYWxsZWRcbiAgICogICAgIHN1YnNjcmliZXJzIHdpbGwgYmUgbm90aWZpZWQgb2YgdGhlIHN0YXRlIGNoYW5nZS5cbiAgICovXG4gIHVwZGF0ZXI8XG4gICAgLy8gQWxsb3cgdG8gZm9yY2UtcHJvdmlkZSB0aGUgdHlwZVxuICAgIFByb3ZpZGVkVHlwZSA9IHZvaWQsXG4gICAgLy8gVGhpcyB0eXBlIGlzIGRlcml2ZWQgZnJvbSB0aGUgYHZhbHVlYCBwcm9wZXJ0eSwgZGVmYXVsdGluZyB0byB2b2lkIGlmIGl0J3MgbWlzc2luZ1xuICAgIE9yaWdpblR5cGUgPSBQcm92aWRlZFR5cGUsXG4gICAgLy8gVGhlIFZhbHVlIHR5cGUgaXMgYXNzaWduZWQgZnJvbSB0aGUgT3JpZ2luXG4gICAgVmFsdWVUeXBlID0gT3JpZ2luVHlwZSxcbiAgICAvLyBSZXR1cm4gZWl0aGVyIGFuIGVtcHR5IGNhbGxiYWNrIG9yIGEgZnVuY3Rpb24gcmVxdWlyaW5nIHNwZWNpZmljIHR5cGVzIGFzIGlucHV0c1xuICAgIFJldHVyblR5cGUgPSBPcmlnaW5UeXBlIGV4dGVuZHMgdm9pZFxuICAgICAgPyAoKSA9PiB2b2lkXG4gICAgICA6IChvYnNlcnZhYmxlT3JWYWx1ZTogVmFsdWVUeXBlIHwgT2JzZXJ2YWJsZTxWYWx1ZVR5cGU+KSA9PiBTdWJzY3JpcHRpb25cbiAgPih1cGRhdGVyRm46IChzdGF0ZTogVCwgdmFsdWU6IE9yaWdpblR5cGUpID0+IFQpOiBSZXR1cm5UeXBlIHtcbiAgICByZXR1cm4gKChcbiAgICAgIG9ic2VydmFibGVPclZhbHVlPzogT3JpZ2luVHlwZSB8IE9ic2VydmFibGU8T3JpZ2luVHlwZT5cbiAgICApOiBTdWJzY3JpcHRpb24gPT4ge1xuICAgICAgbGV0IGluaXRpYWxpemF0aW9uRXJyb3I6IEVycm9yIHwgdW5kZWZpbmVkO1xuICAgICAgLy8gV2UgY2FuIHJlY2VpdmUgZWl0aGVyIHRoZSB2YWx1ZSBvciBhbiBvYnNlcnZhYmxlLiBJbiBjYXNlIGl0J3MgYVxuICAgICAgLy8gc2ltcGxlIHZhbHVlLCB3ZSdsbCB3cmFwIGl0IHdpdGggYG9mYCBvcGVyYXRvciB0byB0dXJuIGl0IGludG9cbiAgICAgIC8vIE9ic2VydmFibGUuXG4gICAgICBjb25zdCBvYnNlcnZhYmxlJCA9IGlzT2JzZXJ2YWJsZShvYnNlcnZhYmxlT3JWYWx1ZSlcbiAgICAgICAgPyBvYnNlcnZhYmxlT3JWYWx1ZVxuICAgICAgICA6IG9mKG9ic2VydmFibGVPclZhbHVlKTtcbiAgICAgIGNvbnN0IHN1YnNjcmlwdGlvbiA9IG9ic2VydmFibGUkXG4gICAgICAgIC5waXBlKFxuICAgICAgICAgIGNvbmNhdE1hcCgodmFsdWUpID0+XG4gICAgICAgICAgICB0aGlzLmlzSW5pdGlhbGl6ZWRcbiAgICAgICAgICAgICAgPyAvLyBQdXNoIHRoZSB2YWx1ZSBpbnRvIHF1ZXVlU2NoZWR1bGVyXG4gICAgICAgICAgICAgICAgc2NoZWR1bGVkKFt2YWx1ZV0sIHF1ZXVlU2NoZWR1bGVyKS5waXBlKFxuICAgICAgICAgICAgICAgICAgd2l0aExhdGVzdEZyb20odGhpcy5zdGF0ZVN1YmplY3QkKVxuICAgICAgICAgICAgICAgIClcbiAgICAgICAgICAgICAgOiAvLyBJZiBzdGF0ZSB3YXMgbm90IGluaXRpYWxpemVkLCB3ZSdsbCB0aHJvdyBhbiBlcnJvci5cbiAgICAgICAgICAgICAgICB0aHJvd0Vycm9yKG5ldyBFcnJvcih0aGlzLm5vdEluaXRpYWxpemVkRXJyb3JNZXNzYWdlKSlcbiAgICAgICAgICApLFxuICAgICAgICAgIHRha2VVbnRpbCh0aGlzLmRlc3Ryb3kkKVxuICAgICAgICApXG4gICAgICAgIC5zdWJzY3JpYmUoe1xuICAgICAgICAgIG5leHQ6IChbdmFsdWUsIGN1cnJlbnRTdGF0ZV0pID0+IHtcbiAgICAgICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tbm9uLW51bGwtYXNzZXJ0aW9uXG4gICAgICAgICAgICB0aGlzLnN0YXRlU3ViamVjdCQubmV4dCh1cGRhdGVyRm4oY3VycmVudFN0YXRlLCB2YWx1ZSEpKTtcbiAgICAgICAgICB9LFxuICAgICAgICAgIGVycm9yOiAoZXJyb3I6IEVycm9yKSA9PiB7XG4gICAgICAgICAgICBpbml0aWFsaXphdGlvbkVycm9yID0gZXJyb3I7XG4gICAgICAgICAgICB0aGlzLnN0YXRlU3ViamVjdCQuZXJyb3IoZXJyb3IpO1xuICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuXG4gICAgICBpZiAoaW5pdGlhbGl6YXRpb25FcnJvcikge1xuICAgICAgICAvLyBwcmV0dGllci1pZ25vcmVcbiAgICAgICAgdGhyb3cgLyoqIEB0eXBlIHshRXJyb3J9ICovIChpbml0aWFsaXphdGlvbkVycm9yKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBzdWJzY3JpcHRpb247XG4gICAgfSkgYXMgdW5rbm93biBhcyBSZXR1cm5UeXBlO1xuICB9XG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemVzIHN0YXRlLiBJZiBpdCB3YXMgYWxyZWFkeSBpbml0aWFsaXplZCB0aGVuIGl0IHJlc2V0cyB0aGVcbiAgICogc3RhdGUuXG4gICAqL1xuICBwcml2YXRlIGluaXRTdGF0ZShzdGF0ZTogVCk6IHZvaWQge1xuICAgIHNjaGVkdWxlZChbc3RhdGVdLCBxdWV1ZVNjaGVkdWxlcikuc3Vic2NyaWJlKChzKSA9PiB7XG4gICAgICB0aGlzLmlzSW5pdGlhbGl6ZWQgPSB0cnVlO1xuICAgICAgdGhpcy5zdGF0ZVN1YmplY3QkLm5leHQocyk7XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogU2V0cyB0aGUgc3RhdGUgc3BlY2lmaWMgdmFsdWUuXG4gICAqIEBwYXJhbSBzdGF0ZU9yVXBkYXRlckZuIG9iamVjdCBvZiB0aGUgc2FtZSB0eXBlIGFzIHRoZSBzdGF0ZSBvciBhblxuICAgKiB1cGRhdGVyRm4sIHJldHVybmluZyBzdWNoIG9iamVjdC5cbiAgICovXG4gIHNldFN0YXRlKHN0YXRlT3JVcGRhdGVyRm46IFQgfCAoKHN0YXRlOiBUKSA9PiBUKSk6IHZvaWQge1xuICAgIGlmICh0eXBlb2Ygc3RhdGVPclVwZGF0ZXJGbiAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgdGhpcy5pbml0U3RhdGUoc3RhdGVPclVwZGF0ZXJGbik7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMudXBkYXRlcihzdGF0ZU9yVXBkYXRlckZuIGFzIChzdGF0ZTogVCkgPT4gVCkoKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogUGF0Y2hlcyB0aGUgc3RhdGUgd2l0aCBwcm92aWRlZCBwYXJ0aWFsIHN0YXRlLlxuICAgKlxuICAgKiBAcGFyYW0gcGFydGlhbFN0YXRlT3JVcGRhdGVyRm4gYSBwYXJ0aWFsIHN0YXRlIG9yIGEgcGFydGlhbCB1cGRhdGVyXG4gICAqIGZ1bmN0aW9uIHRoYXQgYWNjZXB0cyB0aGUgc3RhdGUgYW5kIHJldHVybnMgdGhlIHBhcnRpYWwgc3RhdGUuXG4gICAqIEB0aHJvd3MgRXJyb3IgaWYgdGhlIHN0YXRlIGlzIG5vdCBpbml0aWFsaXplZC5cbiAgICovXG4gIHBhdGNoU3RhdGUoXG4gICAgcGFydGlhbFN0YXRlT3JVcGRhdGVyRm46XG4gICAgICB8IFBhcnRpYWw8VD5cbiAgICAgIHwgT2JzZXJ2YWJsZTxQYXJ0aWFsPFQ+PlxuICAgICAgfCAoKHN0YXRlOiBUKSA9PiBQYXJ0aWFsPFQ+KVxuICApOiB2b2lkIHtcbiAgICBjb25zdCBwYXRjaGVkU3RhdGUgPVxuICAgICAgdHlwZW9mIHBhcnRpYWxTdGF0ZU9yVXBkYXRlckZuID09PSAnZnVuY3Rpb24nXG4gICAgICAgID8gcGFydGlhbFN0YXRlT3JVcGRhdGVyRm4odGhpcy5nZXQoKSlcbiAgICAgICAgOiBwYXJ0aWFsU3RhdGVPclVwZGF0ZXJGbjtcblxuICAgIHRoaXMudXBkYXRlcigoc3RhdGUsIHBhcnRpYWxTdGF0ZTogUGFydGlhbDxUPikgPT4gKHtcbiAgICAgIC4uLnN0YXRlLFxuICAgICAgLi4ucGFydGlhbFN0YXRlLFxuICAgIH0pKShwYXRjaGVkU3RhdGUpO1xuICB9XG5cbiAgcHJvdGVjdGVkIGdldCgpOiBUO1xuICBwcm90ZWN0ZWQgZ2V0PFI+KHByb2plY3RvcjogKHM6IFQpID0+IFIpOiBSO1xuICBwcm90ZWN0ZWQgZ2V0PFI+KHByb2plY3Rvcj86IChzOiBUKSA9PiBSKTogUiB8IFQge1xuICAgIGlmICghdGhpcy5pc0luaXRpYWxpemVkKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IodGhpcy5ub3RJbml0aWFsaXplZEVycm9yTWVzc2FnZSk7XG4gICAgfVxuICAgIGxldCB2YWx1ZTogUiB8IFQ7XG5cbiAgICB0aGlzLnN0YXRlU3ViamVjdCQucGlwZSh0YWtlKDEpKS5zdWJzY3JpYmUoKHN0YXRlKSA9PiB7XG4gICAgICB2YWx1ZSA9IHByb2plY3RvciA/IHByb2plY3RvcihzdGF0ZSkgOiBzdGF0ZTtcbiAgICB9KTtcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLW5vbi1udWxsLWFzc2VydGlvblxuICAgIHJldHVybiB2YWx1ZSE7XG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlcyBhIHNlbGVjdG9yLlxuICAgKlxuICAgKiBAcGFyYW0gcHJvamVjdG9yIEEgcHVyZSBwcm9qZWN0aW9uIGZ1bmN0aW9uIHRoYXQgdGFrZXMgdGhlIGN1cnJlbnQgc3RhdGUgYW5kXG4gICAqICAgcmV0dXJucyBzb21lIG5ldyBzbGljZS9wcm9qZWN0aW9uIG9mIHRoYXQgc3RhdGUuXG4gICAqIEBwYXJhbSBjb25maWcgU2VsZWN0Q29uZmlnIHRoYXQgY2hhbmdlcyB0aGUgYmVoYXZpb3Igb2Ygc2VsZWN0b3IsIGluY2x1ZGluZ1xuICAgKiAgIHRoZSBkZWJvdW5jaW5nIG9mIHRoZSB2YWx1ZXMgdW50aWwgdGhlIHN0YXRlIGlzIHNldHRsZWQuXG4gICAqIEByZXR1cm4gQW4gb2JzZXJ2YWJsZSBvZiB0aGUgcHJvamVjdG9yIHJlc3VsdHMuXG4gICAqL1xuICBzZWxlY3Q8UmVzdWx0PihcbiAgICBwcm9qZWN0b3I6IChzOiBUKSA9PiBSZXN1bHQsXG4gICAgY29uZmlnPzogU2VsZWN0Q29uZmlnXG4gICk6IE9ic2VydmFibGU8UmVzdWx0PjtcbiAgc2VsZWN0PFNlbGVjdG9ycyBleHRlbmRzIE9ic2VydmFibGU8dW5rbm93bj5bXSwgUmVzdWx0PihcbiAgICAuLi5hcmdzOiBbLi4uc2VsZWN0b3JzOiBTZWxlY3RvcnMsIHByb2plY3RvcjogUHJvamVjdG9yPFNlbGVjdG9ycywgUmVzdWx0Pl1cbiAgKTogT2JzZXJ2YWJsZTxSZXN1bHQ+O1xuICBzZWxlY3Q8U2VsZWN0b3JzIGV4dGVuZHMgT2JzZXJ2YWJsZTx1bmtub3duPltdLCBSZXN1bHQ+KFxuICAgIC4uLmFyZ3M6IFtcbiAgICAgIC4uLnNlbGVjdG9yczogU2VsZWN0b3JzLFxuICAgICAgcHJvamVjdG9yOiBQcm9qZWN0b3I8U2VsZWN0b3JzLCBSZXN1bHQ+LFxuICAgICAgY29uZmlnOiBTZWxlY3RDb25maWdcbiAgICBdXG4gICk6IE9ic2VydmFibGU8UmVzdWx0PjtcbiAgc2VsZWN0PFxuICAgIFNlbGVjdG9ycyBleHRlbmRzIEFycmF5PE9ic2VydmFibGU8dW5rbm93bj4gfCBTZWxlY3RDb25maWcgfCBQcm9qZWN0b3JGbj4sXG4gICAgUmVzdWx0LFxuICAgIFByb2plY3RvckZuID0gKC4uLmE6IHVua25vd25bXSkgPT4gUmVzdWx0XG4gID4oLi4uYXJnczogU2VsZWN0b3JzKTogT2JzZXJ2YWJsZTxSZXN1bHQ+IHtcbiAgICBjb25zdCB7IG9ic2VydmFibGVzLCBwcm9qZWN0b3IsIGNvbmZpZyB9ID0gcHJvY2Vzc1NlbGVjdG9yQXJnczxcbiAgICAgIFNlbGVjdG9ycyxcbiAgICAgIFJlc3VsdFxuICAgID4oYXJncyk7XG5cbiAgICBsZXQgb2JzZXJ2YWJsZSQ6IE9ic2VydmFibGU8UmVzdWx0PjtcbiAgICAvLyBJZiB0aGVyZSBhcmUgbm8gT2JzZXJ2YWJsZXMgdG8gY29tYmluZSwgdGhlbiB3ZSdsbCBqdXN0IG1hcCB0aGUgdmFsdWUuXG4gICAgaWYgKG9ic2VydmFibGVzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgb2JzZXJ2YWJsZSQgPSB0aGlzLnN0YXRlU3ViamVjdCQucGlwZShcbiAgICAgICAgY29uZmlnLmRlYm91bmNlID8gZGVib3VuY2VTeW5jKCkgOiAoc291cmNlJCkgPT4gc291cmNlJCxcbiAgICAgICAgbWFwKHByb2plY3RvcilcbiAgICAgICk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIElmIHRoZXJlIGFyZSBtdWx0aXBsZSBhcmd1bWVudHMsIHRoZW4gd2UncmUgYWdncmVnYXRpbmcgc2VsZWN0b3JzLCBzbyB3ZSBuZWVkXG4gICAgICAvLyB0byB0YWtlIHRoZSBjb21iaW5lTGF0ZXN0IG9mIHRoZW0gYmVmb3JlIGNhbGxpbmcgdGhlIG1hcCBmdW5jdGlvbi5cbiAgICAgIG9ic2VydmFibGUkID0gY29tYmluZUxhdGVzdChvYnNlcnZhYmxlcykucGlwZShcbiAgICAgICAgY29uZmlnLmRlYm91bmNlID8gZGVib3VuY2VTeW5jKCkgOiAoc291cmNlJCkgPT4gc291cmNlJCxcbiAgICAgICAgbWFwKChwcm9qZWN0b3JBcmdzKSA9PiBwcm9qZWN0b3IoLi4ucHJvamVjdG9yQXJncykpXG4gICAgICApO1xuICAgIH1cblxuICAgIHJldHVybiBvYnNlcnZhYmxlJC5waXBlKFxuICAgICAgZGlzdGluY3RVbnRpbENoYW5nZWQoKSxcbiAgICAgIHNoYXJlUmVwbGF5KHtcbiAgICAgICAgcmVmQ291bnQ6IHRydWUsXG4gICAgICAgIGJ1ZmZlclNpemU6IDEsXG4gICAgICB9KSxcbiAgICAgIHRha2VVbnRpbCh0aGlzLmRlc3Ryb3kkKVxuICAgICk7XG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlcyBhbiBlZmZlY3QuXG4gICAqXG4gICAqIFRoaXMgZWZmZWN0IGlzIHN1YnNjcmliZWQgdG8gdGhyb3VnaG91dCB0aGUgbGlmZWN5Y2xlIG9mIHRoZSBDb21wb25lbnRTdG9yZS5cbiAgICogQHBhcmFtIGdlbmVyYXRvciBBIGZ1bmN0aW9uIHRoYXQgdGFrZXMgYW4gb3JpZ2luIE9ic2VydmFibGUgaW5wdXQgYW5kXG4gICAqICAgICByZXR1cm5zIGFuIE9ic2VydmFibGUuIFRoZSBPYnNlcnZhYmxlIHRoYXQgaXMgcmV0dXJuZWQgd2lsbCBiZVxuICAgKiAgICAgc3Vic2NyaWJlZCB0byBmb3IgdGhlIGxpZmUgb2YgdGhlIGNvbXBvbmVudC5cbiAgICogQHJldHVybiBBIGZ1bmN0aW9uIHRoYXQsIHdoZW4gY2FsbGVkLCB3aWxsIHRyaWdnZXIgdGhlIG9yaWdpbiBPYnNlcnZhYmxlLlxuICAgKi9cbiAgZWZmZWN0PFxuICAgIC8vIFRoaXMgdHlwZSBxdWlja2x5IGJlY2FtZSBwYXJ0IG9mIGVmZmVjdCAnQVBJJ1xuICAgIFByb3ZpZGVkVHlwZSA9IHZvaWQsXG4gICAgLy8gVGhlIGFjdHVhbCBvcmlnaW4kIHR5cGUsIHdoaWNoIGNvdWxkIGJlIHVua25vd24sIHdoZW4gbm90IHNwZWNpZmllZFxuICAgIE9yaWdpblR5cGUgZXh0ZW5kc1xuICAgICAgfCBPYnNlcnZhYmxlPFByb3ZpZGVkVHlwZT5cbiAgICAgIHwgdW5rbm93biA9IE9ic2VydmFibGU8UHJvdmlkZWRUeXBlPixcbiAgICAvLyBVbndyYXBwZWQgYWN0dWFsIHR5cGUgb2YgdGhlIG9yaWdpbiQgT2JzZXJ2YWJsZSwgYWZ0ZXIgZGVmYXVsdCB3YXMgYXBwbGllZFxuICAgIE9ic2VydmFibGVUeXBlID0gT3JpZ2luVHlwZSBleHRlbmRzIE9ic2VydmFibGU8aW5mZXIgQT4gPyBBIDogbmV2ZXIsXG4gICAgLy8gUmV0dXJuIGVpdGhlciBhbiBlbXB0eSBjYWxsYmFjayBvciBhIGZ1bmN0aW9uIHJlcXVpcmluZyBzcGVjaWZpYyB0eXBlcyBhcyBpbnB1dHNcbiAgICBSZXR1cm5UeXBlID0gUHJvdmlkZWRUeXBlIHwgT2JzZXJ2YWJsZVR5cGUgZXh0ZW5kcyB2b2lkXG4gICAgICA/ICgpID0+IHZvaWRcbiAgICAgIDogKFxuICAgICAgICAgIG9ic2VydmFibGVPclZhbHVlOiBPYnNlcnZhYmxlVHlwZSB8IE9ic2VydmFibGU8T2JzZXJ2YWJsZVR5cGU+XG4gICAgICAgICkgPT4gU3Vic2NyaXB0aW9uXG4gID4oZ2VuZXJhdG9yOiAob3JpZ2luJDogT3JpZ2luVHlwZSkgPT4gT2JzZXJ2YWJsZTx1bmtub3duPik6IFJldHVyblR5cGUge1xuICAgIGNvbnN0IG9yaWdpbiQgPSBuZXcgU3ViamVjdDxPYnNlcnZhYmxlVHlwZT4oKTtcbiAgICBnZW5lcmF0b3Iob3JpZ2luJCBhcyBPcmlnaW5UeXBlKVxuICAgICAgLy8gdGllZCB0byB0aGUgbGlmZWN5Y2xlIPCfkYcgb2YgQ29tcG9uZW50U3RvcmVcbiAgICAgIC5waXBlKHRha2VVbnRpbCh0aGlzLmRlc3Ryb3kkKSlcbiAgICAgIC5zdWJzY3JpYmUoKTtcblxuICAgIHJldHVybiAoKFxuICAgICAgb2JzZXJ2YWJsZU9yVmFsdWU/OiBPYnNlcnZhYmxlVHlwZSB8IE9ic2VydmFibGU8T2JzZXJ2YWJsZVR5cGU+XG4gICAgKTogU3Vic2NyaXB0aW9uID0+IHtcbiAgICAgIGNvbnN0IG9ic2VydmFibGUkID0gaXNPYnNlcnZhYmxlKG9ic2VydmFibGVPclZhbHVlKVxuICAgICAgICA/IG9ic2VydmFibGVPclZhbHVlXG4gICAgICAgIDogb2Yob2JzZXJ2YWJsZU9yVmFsdWUpO1xuICAgICAgcmV0dXJuIG9ic2VydmFibGUkLnBpcGUodGFrZVVudGlsKHRoaXMuZGVzdHJveSQpKS5zdWJzY3JpYmUoKHZhbHVlKSA9PiB7XG4gICAgICAgIC8vIGFueSBuZXcg8J+RhyB2YWx1ZSBpcyBwdXNoZWQgaW50byBhIHN0cmVhbVxuICAgICAgICBvcmlnaW4kLm5leHQodmFsdWUgYXMgT2JzZXJ2YWJsZVR5cGUpO1xuICAgICAgfSk7XG4gICAgfSkgYXMgdW5rbm93biBhcyBSZXR1cm5UeXBlO1xuICB9XG59XG5cbmZ1bmN0aW9uIHByb2Nlc3NTZWxlY3RvckFyZ3M8XG4gIFNlbGVjdG9ycyBleHRlbmRzIEFycmF5PE9ic2VydmFibGU8dW5rbm93bj4gfCBTZWxlY3RDb25maWcgfCBQcm9qZWN0b3JGbj4sXG4gIFJlc3VsdCxcbiAgUHJvamVjdG9yRm4gPSAoLi4uYTogdW5rbm93bltdKSA9PiBSZXN1bHRcbj4oXG4gIGFyZ3M6IFNlbGVjdG9yc1xuKToge1xuICBvYnNlcnZhYmxlczogT2JzZXJ2YWJsZTx1bmtub3duPltdO1xuICBwcm9qZWN0b3I6IFByb2plY3RvckZuO1xuICBjb25maWc6IFJlcXVpcmVkPFNlbGVjdENvbmZpZz47XG59IHtcbiAgY29uc3Qgc2VsZWN0b3JBcmdzID0gQXJyYXkuZnJvbShhcmdzKTtcbiAgLy8gQXNzaWduIGRlZmF1bHQgdmFsdWVzLlxuICBsZXQgY29uZmlnOiBSZXF1aXJlZDxTZWxlY3RDb25maWc+ID0geyBkZWJvdW5jZTogZmFsc2UgfTtcbiAgbGV0IHByb2plY3RvcjogUHJvamVjdG9yRm47XG4gIC8vIExhc3QgYXJndW1lbnQgaXMgZWl0aGVyIHByb2plY3RvciBvciBjb25maWdcbiAgY29uc3QgcHJvamVjdG9yT3JDb25maWcgPSBzZWxlY3RvckFyZ3MucG9wKCkgYXMgUHJvamVjdG9yRm4gfCBTZWxlY3RDb25maWc7XG5cbiAgaWYgKHR5cGVvZiBwcm9qZWN0b3JPckNvbmZpZyAhPT0gJ2Z1bmN0aW9uJykge1xuICAgIC8vIFdlIGdvdCB0aGUgY29uZmlnIGFzIHRoZSBsYXN0IGFyZ3VtZW50LCByZXBsYWNlIGFueSBkZWZhdWx0IHZhbHVlcyB3aXRoIGl0LlxuICAgIGNvbmZpZyA9IHsgLi4uY29uZmlnLCAuLi5wcm9qZWN0b3JPckNvbmZpZyB9O1xuICAgIC8vIFBvcCB0aGUgbmV4dCBhcmdzLCB3aGljaCB3b3VsZCBiZSB0aGUgcHJvamVjdG9yIGZuLlxuICAgIHByb2plY3RvciA9IHNlbGVjdG9yQXJncy5wb3AoKSBhcyBQcm9qZWN0b3JGbjtcbiAgfSBlbHNlIHtcbiAgICBwcm9qZWN0b3IgPSBwcm9qZWN0b3JPckNvbmZpZztcbiAgfVxuICAvLyBUaGUgT2JzZXJ2YWJsZXMgdG8gY29tYmluZSwgaWYgdGhlcmUgYXJlIGFueS5cbiAgY29uc3Qgb2JzZXJ2YWJsZXMgPSBzZWxlY3RvckFyZ3MgYXMgT2JzZXJ2YWJsZTx1bmtub3duPltdO1xuICByZXR1cm4ge1xuICAgIG9ic2VydmFibGVzLFxuICAgIHByb2plY3RvcixcbiAgICBjb25maWcsXG4gIH07XG59XG4iXX0=