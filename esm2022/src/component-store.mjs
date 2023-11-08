import { isObservable, of, ReplaySubject, throwError, combineLatest, Subject, queueScheduler, scheduled, asapScheduler, EMPTY, } from 'rxjs';
import { takeUntil, withLatestFrom, map, distinctUntilChanged, shareReplay, take, tap, catchError, observeOn, } from 'rxjs/operators';
import { debounceSync } from './debounce-sync';
import { Injectable, Optional, InjectionToken, Inject, isDevMode, computed, } from '@angular/core';
import { isOnStateInitDefined, isOnStoreInitDefined } from './lifecycle_hooks';
import { toSignal } from '@angular/core/rxjs-interop';
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
        // Needs to be after destroy$ is declared because it's used in select.
        this.state$ = this.select((s) => s);
        this.state = toSignal(this.stateSubject$.pipe(takeUntil(this.destroy$)), { requireSync: false, manualCleanup: true });
        this.ɵhasProvider = false;
        // State can be initialized either through constructor or setState.
        if (defaultState) {
            this.initState(defaultState);
        }
        this.checkProviderForHooks();
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
            // We need to explicitly throw an error if a synchronous error occurs.
            // This is necessary to make synchronous errors catchable.
            let isSyncUpdate = true;
            let syncError;
            // We can receive either the value or an observable. In case it's a
            // simple value, we'll wrap it with `of` operator to turn it into
            // Observable.
            const observable$ = isObservable(observableOrValue)
                ? observableOrValue
                : of(observableOrValue);
            const subscription = observable$
                .pipe(
            // Push the value into queueScheduler
            observeOn(queueScheduler), 
            // If the state is not initialized yet, we'll throw an error.
            tap(() => this.assertStateIsInitialized()), withLatestFrom(this.stateSubject$), 
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            map(([value, currentState]) => updaterFn(currentState, value)), tap((newState) => this.stateSubject$.next(newState)), catchError((error) => {
                if (isSyncUpdate) {
                    syncError = error;
                    return EMPTY;
                }
                return throwError(error);
            }), takeUntil(this.destroy$))
                .subscribe();
            if (syncError) {
                throw syncError;
            }
            isSyncUpdate = false;
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
        this.assertStateIsInitialized();
        let value;
        this.stateSubject$.pipe(take(1)).subscribe((state) => {
            value = projector ? projector(state) : state;
        });
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        return value;
    }
    select(...args) {
        const { observablesOrSelectorsObject, projector, config } = processSelectorArgs(args);
        const source$ = hasProjectFnOnly(observablesOrSelectorsObject, projector)
            ? this.stateSubject$
            : combineLatest(observablesOrSelectorsObject);
        return source$.pipe(config.debounce ? debounceSync() : noopOperator(), (projector
            ? map((projectorArgs) => 
            // projectorArgs could be an Array in case where the entire state is an Array, so adding this check
            observablesOrSelectorsObject.length >
                0 && Array.isArray(projectorArgs)
                ? projector(...projectorArgs)
                : projector(projectorArgs))
            : noopOperator()), distinctUntilChanged(config.equal), shareReplay({
            refCount: true,
            bufferSize: 1,
        }), takeUntil(this.destroy$));
    }
    selectSignal(...args) {
        const selectSignalArgs = [...args];
        const options = typeof selectSignalArgs[args.length - 1] === 'object'
            ? selectSignalArgs.pop()
            : {};
        const projector = selectSignalArgs.pop();
        const signals = selectSignalArgs;
        const computation = signals.length === 0
            ? () => projector(this.state())
            : () => {
                const values = signals.map((signal) => signal());
                return projector(...values);
            };
        return computed(computation, options);
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
    /**
     * Used to check if lifecycle hooks are defined
     * but not used with provideComponentStore()
     */
    checkProviderForHooks() {
        asapScheduler.schedule(() => {
            if (isDevMode() &&
                (isOnStoreInitDefined(this) || isOnStateInitDefined(this)) &&
                !this.ɵhasProvider) {
                const warnings = [
                    isOnStoreInitDefined(this) ? 'OnStoreInit' : '',
                    isOnStateInitDefined(this) ? 'OnStateInit' : '',
                ].filter((defined) => defined);
                console.warn(`@ngrx/component-store: ${this.constructor.name} has the ${warnings.join(' and ')} ` +
                    'lifecycle hook(s) implemented without being provided using the ' +
                    `provideComponentStore(${this.constructor.name}) function. ` +
                    `To resolve this, provide the component store via provideComponentStore(${this.constructor.name})`);
            }
        });
    }
    assertStateIsInitialized() {
        if (!this.isInitialized) {
            throw new Error(`${this.constructor.name} has not been initialized yet. ` +
                `Please make sure it is initialized before updating/getting.`);
        }
    }
    /** @nocollapse */ static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "17.0.0", ngImport: i0, type: ComponentStore, deps: [{ token: INITIAL_STATE_TOKEN, optional: true }], target: i0.ɵɵFactoryTarget.Injectable }); }
    /** @nocollapse */ static { this.ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "17.0.0", ngImport: i0, type: ComponentStore }); }
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "17.0.0", ngImport: i0, type: ComponentStore, decorators: [{
            type: Injectable
        }], ctorParameters: () => [{ type: undefined, decorators: [{
                    type: Optional
                }, {
                    type: Inject,
                    args: [INITIAL_STATE_TOKEN]
                }] }] });
function processSelectorArgs(args) {
    const selectorArgs = Array.from(args);
    const defaultEqualityFn = (previous, current) => previous === current;
    // Assign default values.
    let config = {
        debounce: false,
        equal: defaultEqualityFn,
    };
    // Last argument is either config or projector or selectorsObject
    if (isSelectConfig(selectorArgs[selectorArgs.length - 1])) {
        config = { ...config, ...selectorArgs.pop() };
    }
    // At this point selectorArgs is either projector, selectors with projector or selectorsObject
    if (selectorArgs.length === 1 && typeof selectorArgs[0] !== 'function') {
        // this is a selectorsObject
        return {
            observablesOrSelectorsObject: selectorArgs[0],
            projector: undefined,
            config,
        };
    }
    const projector = selectorArgs.pop();
    // The Observables to combine, if there are any left.
    const observables = selectorArgs;
    return {
        observablesOrSelectorsObject: observables,
        projector,
        config,
    };
}
function isSelectConfig(arg) {
    const typedArg = arg;
    return (typeof typedArg.debounce !== 'undefined' ||
        typeof typedArg.equal !== 'undefined');
}
function hasProjectFnOnly(observablesOrSelectorsObject, projector) {
    return (Array.isArray(observablesOrSelectorsObject) &&
        observablesOrSelectorsObject.length === 0 &&
        projector);
}
function noopOperator() {
    return (source$) => source$;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcG9uZW50LXN0b3JlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vbW9kdWxlcy9jb21wb25lbnQtc3RvcmUvc3JjL2NvbXBvbmVudC1zdG9yZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQ0wsWUFBWSxFQUVaLEVBQUUsRUFDRixhQUFhLEVBRWIsVUFBVSxFQUNWLGFBQWEsRUFDYixPQUFPLEVBQ1AsY0FBYyxFQUNkLFNBQVMsRUFDVCxhQUFhLEVBQ2IsS0FBSyxHQUVOLE1BQU0sTUFBTSxDQUFDO0FBQ2QsT0FBTyxFQUNMLFNBQVMsRUFDVCxjQUFjLEVBQ2QsR0FBRyxFQUNILG9CQUFvQixFQUNwQixXQUFXLEVBQ1gsSUFBSSxFQUNKLEdBQUcsRUFDSCxVQUFVLEVBQ1YsU0FBUyxHQUNWLE1BQU0sZ0JBQWdCLENBQUM7QUFDeEIsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBQy9DLE9BQU8sRUFDTCxVQUFVLEVBRVYsUUFBUSxFQUNSLGNBQWMsRUFDZCxNQUFNLEVBQ04sU0FBUyxFQUVULFFBQVEsR0FHVCxNQUFNLGVBQWUsQ0FBQztBQUN2QixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQztBQUMvRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sNEJBQTRCLENBQUM7O0FBT3RELE1BQU0sQ0FBQyxNQUFNLG1CQUFtQixHQUFHLElBQUksY0FBYyxDQUNuRCxxQ0FBcUMsQ0FDdEMsQ0FBQztBQTRCRixNQUFNLE9BQU8sY0FBYztJQWdCekIsWUFBcUQsWUFBZ0I7UUFmckUsc0NBQXNDO1FBQ3JCLG9CQUFlLEdBQUcsSUFBSSxhQUFhLENBQU8sQ0FBQyxDQUFDLENBQUM7UUFDOUQsOERBQThEO1FBQ3JELGFBQVEsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLFlBQVksRUFBRSxDQUFDO1FBRXZDLGtCQUFhLEdBQUcsSUFBSSxh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QU0sUUFBUSxHQUFHLEdBQTRCLENBQUM7SUFDOUMsT0FBTyxDQUNMLE9BQU8sUUFBUSxDQUFDLFFBQVEsS0FBSyxXQUFXO1FBQ3hDLE9BQU8sUUFBUSxDQUFDLEtBQUssS0FBSyxXQUFXLENBQ3RDLENBQUM7QUFDSixDQUFDO0FBRUQsU0FBUyxnQkFBZ0IsQ0FDdkIsNEJBQWlFLEVBQ2pFLFNBQWtCO0lBRWxCLE9BQU8sQ0FDTCxLQUFLLENBQUMsT0FBTyxDQUFDLDRCQUE0QixDQUFDO1FBQzNDLDRCQUE0QixDQUFDLE1BQU0sS0FBSyxDQUFDO1FBQ3pDLFNBQVMsQ0FDVixDQUFDO0FBQ0osQ0FBQztBQUVELFNBQVMsWUFBWTtJQUNuQixPQUFPLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxPQUFPLENBQUM7QUFDOUIsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7XG4gIGlzT2JzZXJ2YWJsZSxcbiAgT2JzZXJ2YWJsZSxcbiAgb2YsXG4gIFJlcGxheVN1YmplY3QsXG4gIFN1YnNjcmlwdGlvbixcbiAgdGhyb3dFcnJvcixcbiAgY29tYmluZUxhdGVzdCxcbiAgU3ViamVjdCxcbiAgcXVldWVTY2hlZHVsZXIsXG4gIHNjaGVkdWxlZCxcbiAgYXNhcFNjaGVkdWxlcixcbiAgRU1QVFksXG4gIE9ic2VydmVkVmFsdWVPZixcbn0gZnJvbSAncnhqcyc7XG5pbXBvcnQge1xuICB0YWtlVW50aWwsXG4gIHdpdGhMYXRlc3RGcm9tLFxuICBtYXAsXG4gIGRpc3RpbmN0VW50aWxDaGFuZ2VkLFxuICBzaGFyZVJlcGxheSxcbiAgdGFrZSxcbiAgdGFwLFxuICBjYXRjaEVycm9yLFxuICBvYnNlcnZlT24sXG59IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCB7IGRlYm91bmNlU3luYyB9IGZyb20gJy4vZGVib3VuY2Utc3luYyc7XG5pbXBvcnQge1xuICBJbmplY3RhYmxlLFxuICBPbkRlc3Ryb3ksXG4gIE9wdGlvbmFsLFxuICBJbmplY3Rpb25Ub2tlbixcbiAgSW5qZWN0LFxuICBpc0Rldk1vZGUsXG4gIFNpZ25hbCxcbiAgY29tcHV0ZWQsXG4gIHR5cGUgVmFsdWVFcXVhbGl0eUZuLFxuICB0eXBlIENyZWF0ZUNvbXB1dGVkT3B0aW9ucyxcbn0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQgeyBpc09uU3RhdGVJbml0RGVmaW5lZCwgaXNPblN0b3JlSW5pdERlZmluZWQgfSBmcm9tICcuL2xpZmVjeWNsZV9ob29rcyc7XG5pbXBvcnQgeyB0b1NpZ25hbCB9IGZyb20gJ0Bhbmd1bGFyL2NvcmUvcnhqcy1pbnRlcm9wJztcblxuZXhwb3J0IGludGVyZmFjZSBTZWxlY3RDb25maWc8VCA9IHVua25vd24+IHtcbiAgZGVib3VuY2U/OiBib29sZWFuO1xuICBlcXVhbD86IFZhbHVlRXF1YWxpdHlGbjxUPjtcbn1cblxuZXhwb3J0IGNvbnN0IElOSVRJQUxfU1RBVEVfVE9LRU4gPSBuZXcgSW5qZWN0aW9uVG9rZW4oXG4gICdAbmdyeC9jb21wb25lbnQtc3RvcmUgSW5pdGlhbCBTdGF0ZSdcbik7XG5cbmV4cG9ydCB0eXBlIFNlbGVjdG9yUmVzdWx0czxTZWxlY3RvcnMgZXh0ZW5kcyBPYnNlcnZhYmxlPHVua25vd24+W10+ID0ge1xuICBbS2V5IGluIGtleW9mIFNlbGVjdG9yc106IFNlbGVjdG9yc1tLZXldIGV4dGVuZHMgT2JzZXJ2YWJsZTxpbmZlciBVPlxuICAgID8gVVxuICAgIDogbmV2ZXI7XG59O1xuXG5leHBvcnQgdHlwZSBQcm9qZWN0b3I8U2VsZWN0b3JzIGV4dGVuZHMgT2JzZXJ2YWJsZTx1bmtub3duPltdLCBSZXN1bHQ+ID0gKFxuICAuLi5hcmdzOiBTZWxlY3RvclJlc3VsdHM8U2VsZWN0b3JzPlxuKSA9PiBSZXN1bHQ7XG5cbnR5cGUgU2lnbmFsc1Byb2plY3RvcjxTaWduYWxzIGV4dGVuZHMgU2lnbmFsPHVua25vd24+W10sIFJlc3VsdD4gPSAoXG4gIC4uLnZhbHVlczoge1xuICAgIFtLZXkgaW4ga2V5b2YgU2lnbmFsc106IFNpZ25hbHNbS2V5XSBleHRlbmRzIFNpZ25hbDxpbmZlciBWYWx1ZT5cbiAgICAgID8gVmFsdWVcbiAgICAgIDogbmV2ZXI7XG4gIH1cbikgPT4gUmVzdWx0O1xuXG5pbnRlcmZhY2UgU2VsZWN0U2lnbmFsT3B0aW9uczxUPiB7XG4gIC8qKlxuICAgKiBBIGNvbXBhcmlzb24gZnVuY3Rpb24gd2hpY2ggZGVmaW5lcyBlcXVhbGl0eSBmb3Igc2VsZWN0IHJlc3VsdHMuXG4gICAqL1xuICBlcXVhbD86IFZhbHVlRXF1YWxpdHlGbjxUPjtcbn1cblxuQEluamVjdGFibGUoKVxuZXhwb3J0IGNsYXNzIENvbXBvbmVudFN0b3JlPFQgZXh0ZW5kcyBvYmplY3Q+IGltcGxlbWVudHMgT25EZXN0cm95IHtcbiAgLy8gU2hvdWxkIGJlIHVzZWQgb25seSBpbiBuZ09uRGVzdHJveS5cbiAgcHJpdmF0ZSByZWFkb25seSBkZXN0cm95U3ViamVjdCQgPSBuZXcgUmVwbGF5U3ViamVjdDx2b2lkPigxKTtcbiAgLy8gRXhwb3NlZCB0byBhbnkgZXh0ZW5kaW5nIFN0b3JlIHRvIGJlIHVzZWQgZm9yIHRoZSB0ZWFyZG93bi5cbiAgcmVhZG9ubHkgZGVzdHJveSQgPSB0aGlzLmRlc3Ryb3lTdWJqZWN0JC5hc09ic2VydmFibGUoKTtcblxuICBwcml2YXRlIHJlYWRvbmx5IHN0YXRlU3ViamVjdCQgPSBuZXcgUmVwbGF5U3ViamVjdDxUPigxKTtcbiAgcHJpdmF0ZSBpc0luaXRpYWxpemVkID0gZmFsc2U7XG4gIC8vIE5lZWRzIHRvIGJlIGFmdGVyIGRlc3Ryb3kkIGlzIGRlY2xhcmVkIGJlY2F1c2UgaXQncyB1c2VkIGluIHNlbGVjdC5cbiAgcmVhZG9ubHkgc3RhdGUkOiBPYnNlcnZhYmxlPFQ+ID0gdGhpcy5zZWxlY3QoKHMpID0+IHMpO1xuICByZWFkb25seSBzdGF0ZTogU2lnbmFsPFQ+ID0gdG9TaWduYWwoXG4gICAgdGhpcy5zdGF0ZVN1YmplY3QkLnBpcGUodGFrZVVudGlsKHRoaXMuZGVzdHJveSQpKSxcbiAgICB7IHJlcXVpcmVTeW5jOiBmYWxzZSwgbWFudWFsQ2xlYW51cDogdHJ1ZSB9XG4gICkgYXMgU2lnbmFsPFQ+O1xuICBwcml2YXRlIMm1aGFzUHJvdmlkZXIgPSBmYWxzZTtcblxuICBjb25zdHJ1Y3RvcihAT3B0aW9uYWwoKSBASW5qZWN0KElOSVRJQUxfU1RBVEVfVE9LRU4pIGRlZmF1bHRTdGF0ZT86IFQpIHtcbiAgICAvLyBTdGF0ZSBjYW4gYmUgaW5pdGlhbGl6ZWQgZWl0aGVyIHRocm91Z2ggY29uc3RydWN0b3Igb3Igc2V0U3RhdGUuXG4gICAgaWYgKGRlZmF1bHRTdGF0ZSkge1xuICAgICAgdGhpcy5pbml0U3RhdGUoZGVmYXVsdFN0YXRlKTtcbiAgICB9XG5cbiAgICB0aGlzLmNoZWNrUHJvdmlkZXJGb3JIb29rcygpO1xuICB9XG5cbiAgLyoqIENvbXBsZXRlcyBhbGwgcmVsZXZhbnQgT2JzZXJ2YWJsZSBzdHJlYW1zLiAqL1xuICBuZ09uRGVzdHJveSgpIHtcbiAgICB0aGlzLnN0YXRlU3ViamVjdCQuY29tcGxldGUoKTtcbiAgICB0aGlzLmRlc3Ryb3lTdWJqZWN0JC5uZXh0KCk7XG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlcyBhbiB1cGRhdGVyLlxuICAgKlxuICAgKiBUaHJvd3MgYW4gZXJyb3IgaWYgdXBkYXRlciBpcyBjYWxsZWQgd2l0aCBzeW5jaHJvbm91cyB2YWx1ZXMgKGVpdGhlclxuICAgKiBpbXBlcmF0aXZlIHZhbHVlIG9yIE9ic2VydmFibGUgdGhhdCBpcyBzeW5jaHJvbm91cykgYmVmb3JlIENvbXBvbmVudFN0b3JlXG4gICAqIGlzIGluaXRpYWxpemVkLiBJZiBjYWxsZWQgd2l0aCBhc3luYyBPYnNlcnZhYmxlIGJlZm9yZSBpbml0aWFsaXphdGlvbiB0aGVuXG4gICAqIHN0YXRlIHdpbGwgbm90IGJlIHVwZGF0ZWQgYW5kIHN1YnNjcmlwdGlvbiB3b3VsZCBiZSBjbG9zZWQuXG4gICAqXG4gICAqIEBwYXJhbSB1cGRhdGVyRm4gQSBzdGF0aWMgdXBkYXRlciBmdW5jdGlvbiB0aGF0IHRha2VzIDIgcGFyYW1ldGVycyAodGhlXG4gICAqIGN1cnJlbnQgc3RhdGUgYW5kIGFuIGFyZ3VtZW50IG9iamVjdCkgYW5kIHJldHVybnMgYSBuZXcgaW5zdGFuY2Ugb2YgdGhlXG4gICAqIHN0YXRlLlxuICAgKiBAcmV0dXJuIEEgZnVuY3Rpb24gdGhhdCBhY2NlcHRzIG9uZSBhcmd1bWVudCB3aGljaCBpcyBmb3J3YXJkZWQgYXMgdGhlXG4gICAqICAgICBzZWNvbmQgYXJndW1lbnQgdG8gYHVwZGF0ZXJGbmAuIEV2ZXJ5IHRpbWUgdGhpcyBmdW5jdGlvbiBpcyBjYWxsZWRcbiAgICogICAgIHN1YnNjcmliZXJzIHdpbGwgYmUgbm90aWZpZWQgb2YgdGhlIHN0YXRlIGNoYW5nZS5cbiAgICovXG4gIHVwZGF0ZXI8XG4gICAgLy8gQWxsb3cgdG8gZm9yY2UtcHJvdmlkZSB0aGUgdHlwZVxuICAgIFByb3ZpZGVkVHlwZSA9IHZvaWQsXG4gICAgLy8gVGhpcyB0eXBlIGlzIGRlcml2ZWQgZnJvbSB0aGUgYHZhbHVlYCBwcm9wZXJ0eSwgZGVmYXVsdGluZyB0byB2b2lkIGlmIGl0J3MgbWlzc2luZ1xuICAgIE9yaWdpblR5cGUgPSBQcm92aWRlZFR5cGUsXG4gICAgLy8gVGhlIFZhbHVlIHR5cGUgaXMgYXNzaWduZWQgZnJvbSB0aGUgT3JpZ2luXG4gICAgVmFsdWVUeXBlID0gT3JpZ2luVHlwZSxcbiAgICAvLyBSZXR1cm4gZWl0aGVyIGFuIGVtcHR5IGNhbGxiYWNrIG9yIGEgZnVuY3Rpb24gcmVxdWlyaW5nIHNwZWNpZmljIHR5cGVzIGFzIGlucHV0c1xuICAgIFJldHVyblR5cGUgPSBPcmlnaW5UeXBlIGV4dGVuZHMgdm9pZFxuICAgICAgPyAoKSA9PiB2b2lkXG4gICAgICA6IChvYnNlcnZhYmxlT3JWYWx1ZTogVmFsdWVUeXBlIHwgT2JzZXJ2YWJsZTxWYWx1ZVR5cGU+KSA9PiBTdWJzY3JpcHRpb25cbiAgPih1cGRhdGVyRm46IChzdGF0ZTogVCwgdmFsdWU6IE9yaWdpblR5cGUpID0+IFQpOiBSZXR1cm5UeXBlIHtcbiAgICByZXR1cm4gKChcbiAgICAgIG9ic2VydmFibGVPclZhbHVlPzogT3JpZ2luVHlwZSB8IE9ic2VydmFibGU8T3JpZ2luVHlwZT5cbiAgICApOiBTdWJzY3JpcHRpb24gPT4ge1xuICAgICAgLy8gV2UgbmVlZCB0byBleHBsaWNpdGx5IHRocm93IGFuIGVycm9yIGlmIGEgc3luY2hyb25vdXMgZXJyb3Igb2NjdXJzLlxuICAgICAgLy8gVGhpcyBpcyBuZWNlc3NhcnkgdG8gbWFrZSBzeW5jaHJvbm91cyBlcnJvcnMgY2F0Y2hhYmxlLlxuICAgICAgbGV0IGlzU3luY1VwZGF0ZSA9IHRydWU7XG4gICAgICBsZXQgc3luY0Vycm9yOiB1bmtub3duO1xuICAgICAgLy8gV2UgY2FuIHJlY2VpdmUgZWl0aGVyIHRoZSB2YWx1ZSBvciBhbiBvYnNlcnZhYmxlLiBJbiBjYXNlIGl0J3MgYVxuICAgICAgLy8gc2ltcGxlIHZhbHVlLCB3ZSdsbCB3cmFwIGl0IHdpdGggYG9mYCBvcGVyYXRvciB0byB0dXJuIGl0IGludG9cbiAgICAgIC8vIE9ic2VydmFibGUuXG4gICAgICBjb25zdCBvYnNlcnZhYmxlJCA9IGlzT2JzZXJ2YWJsZShvYnNlcnZhYmxlT3JWYWx1ZSlcbiAgICAgICAgPyBvYnNlcnZhYmxlT3JWYWx1ZVxuICAgICAgICA6IG9mKG9ic2VydmFibGVPclZhbHVlKTtcbiAgICAgIGNvbnN0IHN1YnNjcmlwdGlvbiA9IG9ic2VydmFibGUkXG4gICAgICAgIC5waXBlKFxuICAgICAgICAgIC8vIFB1c2ggdGhlIHZhbHVlIGludG8gcXVldWVTY2hlZHVsZXJcbiAgICAgICAgICBvYnNlcnZlT24ocXVldWVTY2hlZHVsZXIpLFxuICAgICAgICAgIC8vIElmIHRoZSBzdGF0ZSBpcyBub3QgaW5pdGlhbGl6ZWQgeWV0LCB3ZSdsbCB0aHJvdyBhbiBlcnJvci5cbiAgICAgICAgICB0YXAoKCkgPT4gdGhpcy5hc3NlcnRTdGF0ZUlzSW5pdGlhbGl6ZWQoKSksXG4gICAgICAgICAgd2l0aExhdGVzdEZyb20odGhpcy5zdGF0ZVN1YmplY3QkKSxcbiAgICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLW5vbi1udWxsLWFzc2VydGlvblxuICAgICAgICAgIG1hcCgoW3ZhbHVlLCBjdXJyZW50U3RhdGVdKSA9PiB1cGRhdGVyRm4oY3VycmVudFN0YXRlLCB2YWx1ZSEpKSxcbiAgICAgICAgICB0YXAoKG5ld1N0YXRlKSA9PiB0aGlzLnN0YXRlU3ViamVjdCQubmV4dChuZXdTdGF0ZSkpLFxuICAgICAgICAgIGNhdGNoRXJyb3IoKGVycm9yOiB1bmtub3duKSA9PiB7XG4gICAgICAgICAgICBpZiAoaXNTeW5jVXBkYXRlKSB7XG4gICAgICAgICAgICAgIHN5bmNFcnJvciA9IGVycm9yO1xuICAgICAgICAgICAgICByZXR1cm4gRU1QVFk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiB0aHJvd0Vycm9yKGVycm9yKTtcbiAgICAgICAgICB9KSxcbiAgICAgICAgICB0YWtlVW50aWwodGhpcy5kZXN0cm95JClcbiAgICAgICAgKVxuICAgICAgICAuc3Vic2NyaWJlKCk7XG5cbiAgICAgIGlmIChzeW5jRXJyb3IpIHtcbiAgICAgICAgdGhyb3cgc3luY0Vycm9yO1xuICAgICAgfVxuICAgICAgaXNTeW5jVXBkYXRlID0gZmFsc2U7XG5cbiAgICAgIHJldHVybiBzdWJzY3JpcHRpb247XG4gICAgfSkgYXMgdW5rbm93biBhcyBSZXR1cm5UeXBlO1xuICB9XG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemVzIHN0YXRlLiBJZiBpdCB3YXMgYWxyZWFkeSBpbml0aWFsaXplZCB0aGVuIGl0IHJlc2V0cyB0aGVcbiAgICogc3RhdGUuXG4gICAqL1xuICBwcml2YXRlIGluaXRTdGF0ZShzdGF0ZTogVCk6IHZvaWQge1xuICAgIHNjaGVkdWxlZChbc3RhdGVdLCBxdWV1ZVNjaGVkdWxlcikuc3Vic2NyaWJlKChzKSA9PiB7XG4gICAgICB0aGlzLmlzSW5pdGlhbGl6ZWQgPSB0cnVlO1xuICAgICAgdGhpcy5zdGF0ZVN1YmplY3QkLm5leHQocyk7XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogU2V0cyB0aGUgc3RhdGUgc3BlY2lmaWMgdmFsdWUuXG4gICAqIEBwYXJhbSBzdGF0ZU9yVXBkYXRlckZuIG9iamVjdCBvZiB0aGUgc2FtZSB0eXBlIGFzIHRoZSBzdGF0ZSBvciBhblxuICAgKiB1cGRhdGVyRm4sIHJldHVybmluZyBzdWNoIG9iamVjdC5cbiAgICovXG4gIHNldFN0YXRlKHN0YXRlT3JVcGRhdGVyRm46IFQgfCAoKHN0YXRlOiBUKSA9PiBUKSk6IHZvaWQge1xuICAgIGlmICh0eXBlb2Ygc3RhdGVPclVwZGF0ZXJGbiAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgdGhpcy5pbml0U3RhdGUoc3RhdGVPclVwZGF0ZXJGbik7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMudXBkYXRlcihzdGF0ZU9yVXBkYXRlckZuIGFzIChzdGF0ZTogVCkgPT4gVCkoKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogUGF0Y2hlcyB0aGUgc3RhdGUgd2l0aCBwcm92aWRlZCBwYXJ0aWFsIHN0YXRlLlxuICAgKlxuICAgKiBAcGFyYW0gcGFydGlhbFN0YXRlT3JVcGRhdGVyRm4gYSBwYXJ0aWFsIHN0YXRlIG9yIGEgcGFydGlhbCB1cGRhdGVyXG4gICAqIGZ1bmN0aW9uIHRoYXQgYWNjZXB0cyB0aGUgc3RhdGUgYW5kIHJldHVybnMgdGhlIHBhcnRpYWwgc3RhdGUuXG4gICAqIEB0aHJvd3MgRXJyb3IgaWYgdGhlIHN0YXRlIGlzIG5vdCBpbml0aWFsaXplZC5cbiAgICovXG4gIHBhdGNoU3RhdGUoXG4gICAgcGFydGlhbFN0YXRlT3JVcGRhdGVyRm46XG4gICAgICB8IFBhcnRpYWw8VD5cbiAgICAgIHwgT2JzZXJ2YWJsZTxQYXJ0aWFsPFQ+PlxuICAgICAgfCAoKHN0YXRlOiBUKSA9PiBQYXJ0aWFsPFQ+KVxuICApOiB2b2lkIHtcbiAgICBjb25zdCBwYXRjaGVkU3RhdGUgPVxuICAgICAgdHlwZW9mIHBhcnRpYWxTdGF0ZU9yVXBkYXRlckZuID09PSAnZnVuY3Rpb24nXG4gICAgICAgID8gcGFydGlhbFN0YXRlT3JVcGRhdGVyRm4odGhpcy5nZXQoKSlcbiAgICAgICAgOiBwYXJ0aWFsU3RhdGVPclVwZGF0ZXJGbjtcblxuICAgIHRoaXMudXBkYXRlcigoc3RhdGUsIHBhcnRpYWxTdGF0ZTogUGFydGlhbDxUPikgPT4gKHtcbiAgICAgIC4uLnN0YXRlLFxuICAgICAgLi4ucGFydGlhbFN0YXRlLFxuICAgIH0pKShwYXRjaGVkU3RhdGUpO1xuICB9XG5cbiAgcHJvdGVjdGVkIGdldCgpOiBUO1xuICBwcm90ZWN0ZWQgZ2V0PFI+KHByb2plY3RvcjogKHM6IFQpID0+IFIpOiBSO1xuICBwcm90ZWN0ZWQgZ2V0PFI+KHByb2plY3Rvcj86IChzOiBUKSA9PiBSKTogUiB8IFQge1xuICAgIHRoaXMuYXNzZXJ0U3RhdGVJc0luaXRpYWxpemVkKCk7XG4gICAgbGV0IHZhbHVlOiBSIHwgVDtcblxuICAgIHRoaXMuc3RhdGVTdWJqZWN0JC5waXBlKHRha2UoMSkpLnN1YnNjcmliZSgoc3RhdGUpID0+IHtcbiAgICAgIHZhbHVlID0gcHJvamVjdG9yID8gcHJvamVjdG9yKHN0YXRlKSA6IHN0YXRlO1xuICAgIH0pO1xuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tbm9uLW51bGwtYXNzZXJ0aW9uXG4gICAgcmV0dXJuIHZhbHVlITtcbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgc2VsZWN0b3IuXG4gICAqXG4gICAqIEBwYXJhbSBwcm9qZWN0b3IgQSBwdXJlIHByb2plY3Rpb24gZnVuY3Rpb24gdGhhdCB0YWtlcyB0aGUgY3VycmVudCBzdGF0ZSBhbmRcbiAgICogICByZXR1cm5zIHNvbWUgbmV3IHNsaWNlL3Byb2plY3Rpb24gb2YgdGhhdCBzdGF0ZS5cbiAgICogQHBhcmFtIGNvbmZpZyBTZWxlY3RDb25maWcgdGhhdCBjaGFuZ2VzIHRoZSBiZWhhdmlvciBvZiBzZWxlY3RvciwgaW5jbHVkaW5nXG4gICAqICAgdGhlIGRlYm91bmNpbmcgb2YgdGhlIHZhbHVlcyB1bnRpbCB0aGUgc3RhdGUgaXMgc2V0dGxlZC5cbiAgICogQHJldHVybiBBbiBvYnNlcnZhYmxlIG9mIHRoZSBwcm9qZWN0b3IgcmVzdWx0cy5cbiAgICovXG4gIHNlbGVjdDxSZXN1bHQ+KFxuICAgIHByb2plY3RvcjogKHM6IFQpID0+IFJlc3VsdCxcbiAgICBjb25maWc/OiBTZWxlY3RDb25maWc8UmVzdWx0PlxuICApOiBPYnNlcnZhYmxlPFJlc3VsdD47XG4gIHNlbGVjdDxTZWxlY3RvcnNPYmplY3QgZXh0ZW5kcyBSZWNvcmQ8c3RyaW5nLCBPYnNlcnZhYmxlPHVua25vd24+Pj4oXG4gICAgc2VsZWN0b3JzT2JqZWN0OiBTZWxlY3RvcnNPYmplY3QsXG4gICAgY29uZmlnPzogU2VsZWN0Q29uZmlnPHtcbiAgICAgIFtLIGluIGtleW9mIFNlbGVjdG9yc09iamVjdF06IE9ic2VydmVkVmFsdWVPZjxTZWxlY3RvcnNPYmplY3RbS10+O1xuICAgIH0+XG4gICk6IE9ic2VydmFibGU8e1xuICAgIFtLIGluIGtleW9mIFNlbGVjdG9yc09iamVjdF06IE9ic2VydmVkVmFsdWVPZjxTZWxlY3RvcnNPYmplY3RbS10+O1xuICB9PjtcbiAgc2VsZWN0PFNlbGVjdG9ycyBleHRlbmRzIE9ic2VydmFibGU8dW5rbm93bj5bXSwgUmVzdWx0PihcbiAgICAuLi5zZWxlY3RvcnNXaXRoUHJvamVjdG9yOiBbXG4gICAgICAuLi5zZWxlY3RvcnM6IFNlbGVjdG9ycyxcbiAgICAgIHByb2plY3RvcjogUHJvamVjdG9yPFNlbGVjdG9ycywgUmVzdWx0PlxuICAgIF1cbiAgKTogT2JzZXJ2YWJsZTxSZXN1bHQ+O1xuICBzZWxlY3Q8U2VsZWN0b3JzIGV4dGVuZHMgT2JzZXJ2YWJsZTx1bmtub3duPltdLCBSZXN1bHQ+KFxuICAgIC4uLnNlbGVjdG9yc1dpdGhQcm9qZWN0b3JBbmRDb25maWc6IFtcbiAgICAgIC4uLnNlbGVjdG9yczogU2VsZWN0b3JzLFxuICAgICAgcHJvamVjdG9yOiBQcm9qZWN0b3I8U2VsZWN0b3JzLCBSZXN1bHQ+LFxuICAgICAgY29uZmlnOiBTZWxlY3RDb25maWc8UmVzdWx0PlxuICAgIF1cbiAgKTogT2JzZXJ2YWJsZTxSZXN1bHQ+O1xuICBzZWxlY3Q8XG4gICAgU2VsZWN0b3JzIGV4dGVuZHMgQXJyYXk8XG4gICAgICBPYnNlcnZhYmxlPHVua25vd24+IHwgU2VsZWN0Q29uZmlnPFJlc3VsdD4gfCBQcm9qZWN0b3JGbiB8IFNlbGVjdG9yc09iamVjdFxuICAgID4sXG4gICAgUmVzdWx0LFxuICAgIFByb2plY3RvckZuIGV4dGVuZHMgKC4uLmE6IHVua25vd25bXSkgPT4gUmVzdWx0LFxuICAgIFNlbGVjdG9yc09iamVjdCBleHRlbmRzIFJlY29yZDxzdHJpbmcsIE9ic2VydmFibGU8dW5rbm93bj4+XG4gID4oLi4uYXJnczogU2VsZWN0b3JzKTogT2JzZXJ2YWJsZTxSZXN1bHQ+IHtcbiAgICBjb25zdCB7IG9ic2VydmFibGVzT3JTZWxlY3RvcnNPYmplY3QsIHByb2plY3RvciwgY29uZmlnIH0gPVxuICAgICAgcHJvY2Vzc1NlbGVjdG9yQXJnczxTZWxlY3RvcnMsIFJlc3VsdCwgUHJvamVjdG9yRm4sIFNlbGVjdG9yc09iamVjdD4oXG4gICAgICAgIGFyZ3NcbiAgICAgICk7XG5cbiAgICBjb25zdCBzb3VyY2UkID0gaGFzUHJvamVjdEZuT25seShvYnNlcnZhYmxlc09yU2VsZWN0b3JzT2JqZWN0LCBwcm9qZWN0b3IpXG4gICAgICA/IHRoaXMuc3RhdGVTdWJqZWN0JFxuICAgICAgOiBjb21iaW5lTGF0ZXN0KG9ic2VydmFibGVzT3JTZWxlY3RvcnNPYmplY3QgYXMgYW55KTtcblxuICAgIHJldHVybiBzb3VyY2UkLnBpcGUoXG4gICAgICBjb25maWcuZGVib3VuY2UgPyBkZWJvdW5jZVN5bmMoKSA6IG5vb3BPcGVyYXRvcigpLFxuICAgICAgKHByb2plY3RvclxuICAgICAgICA/IG1hcCgocHJvamVjdG9yQXJncykgPT5cbiAgICAgICAgICAgIC8vIHByb2plY3RvckFyZ3MgY291bGQgYmUgYW4gQXJyYXkgaW4gY2FzZSB3aGVyZSB0aGUgZW50aXJlIHN0YXRlIGlzIGFuIEFycmF5LCBzbyBhZGRpbmcgdGhpcyBjaGVja1xuICAgICAgICAgICAgKG9ic2VydmFibGVzT3JTZWxlY3RvcnNPYmplY3QgYXMgT2JzZXJ2YWJsZTx1bmtub3duPltdKS5sZW5ndGggPlxuICAgICAgICAgICAgICAwICYmIEFycmF5LmlzQXJyYXkocHJvamVjdG9yQXJncylcbiAgICAgICAgICAgICAgPyBwcm9qZWN0b3IoLi4ucHJvamVjdG9yQXJncylcbiAgICAgICAgICAgICAgOiBwcm9qZWN0b3IocHJvamVjdG9yQXJncylcbiAgICAgICAgICApXG4gICAgICAgIDogbm9vcE9wZXJhdG9yKCkpIGFzICgpID0+IE9ic2VydmFibGU8UmVzdWx0PixcbiAgICAgIGRpc3RpbmN0VW50aWxDaGFuZ2VkKGNvbmZpZy5lcXVhbCksXG4gICAgICBzaGFyZVJlcGxheSh7XG4gICAgICAgIHJlZkNvdW50OiB0cnVlLFxuICAgICAgICBidWZmZXJTaXplOiAxLFxuICAgICAgfSksXG4gICAgICB0YWtlVW50aWwodGhpcy5kZXN0cm95JClcbiAgICApO1xuICB9XG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBzaWduYWwgZnJvbSB0aGUgcHJvdmlkZWQgc3RhdGUgcHJvamVjdG9yIGZ1bmN0aW9uLlxuICAgKi9cbiAgc2VsZWN0U2lnbmFsPFJlc3VsdD4oXG4gICAgcHJvamVjdG9yOiAoc3RhdGU6IFQpID0+IFJlc3VsdCxcbiAgICBvcHRpb25zPzogU2VsZWN0U2lnbmFsT3B0aW9uczxSZXN1bHQ+XG4gICk6IFNpZ25hbDxSZXN1bHQ+O1xuICAvKipcbiAgICogQ3JlYXRlcyBhIHNpZ25hbCBieSBjb21iaW5pbmcgcHJvdmlkZWQgc2lnbmFscy5cbiAgICovXG4gIHNlbGVjdFNpZ25hbDxTaWduYWxzIGV4dGVuZHMgU2lnbmFsPHVua25vd24+W10sIFJlc3VsdD4oXG4gICAgLi4uYXJnczogWy4uLnNpZ25hbHM6IFNpZ25hbHMsIHByb2plY3RvcjogU2lnbmFsc1Byb2plY3RvcjxTaWduYWxzLCBSZXN1bHQ+XVxuICApOiBTaWduYWw8UmVzdWx0PjtcbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBzaWduYWwgYnkgY29tYmluaW5nIHByb3ZpZGVkIHNpZ25hbHMuXG4gICAqL1xuICBzZWxlY3RTaWduYWw8U2lnbmFscyBleHRlbmRzIFNpZ25hbDx1bmtub3duPltdLCBSZXN1bHQ+KFxuICAgIC4uLmFyZ3M6IFtcbiAgICAgIC4uLnNpZ25hbHM6IFNpZ25hbHMsXG4gICAgICBwcm9qZWN0b3I6IFNpZ25hbHNQcm9qZWN0b3I8U2lnbmFscywgUmVzdWx0PixcbiAgICAgIG9wdGlvbnM6IFNlbGVjdFNpZ25hbE9wdGlvbnM8UmVzdWx0PlxuICAgIF1cbiAgKTogU2lnbmFsPFJlc3VsdD47XG4gIHNlbGVjdFNpZ25hbChcbiAgICAuLi5hcmdzOlxuICAgICAgfCBbKHN0YXRlOiBUKSA9PiB1bmtub3duLCBTZWxlY3RTaWduYWxPcHRpb25zPHVua25vd24+P11cbiAgICAgIHwgW1xuICAgICAgICAgIC4uLnNpZ25hbHM6IFNpZ25hbDx1bmtub3duPltdLFxuICAgICAgICAgIHByb2plY3RvcjogKC4uLnZhbHVlczogdW5rbm93bltdKSA9PiB1bmtub3duXG4gICAgICAgIF1cbiAgICAgIHwgW1xuICAgICAgICAgIC4uLnNpZ25hbHM6IFNpZ25hbDx1bmtub3duPltdLFxuICAgICAgICAgIHByb2plY3RvcjogKC4uLnZhbHVlczogdW5rbm93bltdKSA9PiB1bmtub3duLFxuICAgICAgICAgIG9wdGlvbnM6IFNlbGVjdFNpZ25hbE9wdGlvbnM8dW5rbm93bj5cbiAgICAgICAgXVxuICApOiBTaWduYWw8dW5rbm93bj4ge1xuICAgIGNvbnN0IHNlbGVjdFNpZ25hbEFyZ3MgPSBbLi4uYXJnc107XG4gICAgY29uc3Qgb3B0aW9uczogQ3JlYXRlQ29tcHV0ZWRPcHRpb25zPHVua25vd24+ID1cbiAgICAgIHR5cGVvZiBzZWxlY3RTaWduYWxBcmdzW2FyZ3MubGVuZ3RoIC0gMV0gPT09ICdvYmplY3QnXG4gICAgICAgID8gKHNlbGVjdFNpZ25hbEFyZ3MucG9wKCkgYXMgU2VsZWN0U2lnbmFsT3B0aW9uczx1bmtub3duPilcbiAgICAgICAgOiB7fTtcbiAgICBjb25zdCBwcm9qZWN0b3IgPSBzZWxlY3RTaWduYWxBcmdzLnBvcCgpIGFzIChcbiAgICAgIC4uLnZhbHVlczogdW5rbm93bltdXG4gICAgKSA9PiB1bmtub3duO1xuICAgIGNvbnN0IHNpZ25hbHMgPSBzZWxlY3RTaWduYWxBcmdzIGFzIFNpZ25hbDx1bmtub3duPltdO1xuXG4gICAgY29uc3QgY29tcHV0YXRpb24gPVxuICAgICAgc2lnbmFscy5sZW5ndGggPT09IDBcbiAgICAgICAgPyAoKSA9PiBwcm9qZWN0b3IodGhpcy5zdGF0ZSgpKVxuICAgICAgICA6ICgpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHZhbHVlcyA9IHNpZ25hbHMubWFwKChzaWduYWwpID0+IHNpZ25hbCgpKTtcbiAgICAgICAgICAgIHJldHVybiBwcm9qZWN0b3IoLi4udmFsdWVzKTtcbiAgICAgICAgICB9O1xuXG4gICAgcmV0dXJuIGNvbXB1dGVkKGNvbXB1dGF0aW9uLCBvcHRpb25zKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGVzIGFuIGVmZmVjdC5cbiAgICpcbiAgICogVGhpcyBlZmZlY3QgaXMgc3Vic2NyaWJlZCB0byB0aHJvdWdob3V0IHRoZSBsaWZlY3ljbGUgb2YgdGhlIENvbXBvbmVudFN0b3JlLlxuICAgKiBAcGFyYW0gZ2VuZXJhdG9yIEEgZnVuY3Rpb24gdGhhdCB0YWtlcyBhbiBvcmlnaW4gT2JzZXJ2YWJsZSBpbnB1dCBhbmRcbiAgICogICAgIHJldHVybnMgYW4gT2JzZXJ2YWJsZS4gVGhlIE9ic2VydmFibGUgdGhhdCBpcyByZXR1cm5lZCB3aWxsIGJlXG4gICAqICAgICBzdWJzY3JpYmVkIHRvIGZvciB0aGUgbGlmZSBvZiB0aGUgY29tcG9uZW50LlxuICAgKiBAcmV0dXJuIEEgZnVuY3Rpb24gdGhhdCwgd2hlbiBjYWxsZWQsIHdpbGwgdHJpZ2dlciB0aGUgb3JpZ2luIE9ic2VydmFibGUuXG4gICAqL1xuICBlZmZlY3Q8XG4gICAgLy8gVGhpcyB0eXBlIHF1aWNrbHkgYmVjYW1lIHBhcnQgb2YgZWZmZWN0ICdBUEknXG4gICAgUHJvdmlkZWRUeXBlID0gdm9pZCxcbiAgICAvLyBUaGUgYWN0dWFsIG9yaWdpbiQgdHlwZSwgd2hpY2ggY291bGQgYmUgdW5rbm93biwgd2hlbiBub3Qgc3BlY2lmaWVkXG4gICAgT3JpZ2luVHlwZSBleHRlbmRzXG4gICAgICB8IE9ic2VydmFibGU8UHJvdmlkZWRUeXBlPlxuICAgICAgfCB1bmtub3duID0gT2JzZXJ2YWJsZTxQcm92aWRlZFR5cGU+LFxuICAgIC8vIFVud3JhcHBlZCBhY3R1YWwgdHlwZSBvZiB0aGUgb3JpZ2luJCBPYnNlcnZhYmxlLCBhZnRlciBkZWZhdWx0IHdhcyBhcHBsaWVkXG4gICAgT2JzZXJ2YWJsZVR5cGUgPSBPcmlnaW5UeXBlIGV4dGVuZHMgT2JzZXJ2YWJsZTxpbmZlciBBPiA/IEEgOiBuZXZlcixcbiAgICAvLyBSZXR1cm4gZWl0aGVyIGFuIG9wdGlvbmFsIGNhbGxiYWNrIG9yIGEgZnVuY3Rpb24gcmVxdWlyaW5nIHNwZWNpZmljIHR5cGVzIGFzIGlucHV0c1xuICAgIFJldHVyblR5cGUgPSBQcm92aWRlZFR5cGUgfCBPYnNlcnZhYmxlVHlwZSBleHRlbmRzIHZvaWRcbiAgICAgID8gKFxuICAgICAgICAgIG9ic2VydmFibGVPclZhbHVlPzogT2JzZXJ2YWJsZVR5cGUgfCBPYnNlcnZhYmxlPE9ic2VydmFibGVUeXBlPlxuICAgICAgICApID0+IFN1YnNjcmlwdGlvblxuICAgICAgOiAoXG4gICAgICAgICAgb2JzZXJ2YWJsZU9yVmFsdWU6IE9ic2VydmFibGVUeXBlIHwgT2JzZXJ2YWJsZTxPYnNlcnZhYmxlVHlwZT5cbiAgICAgICAgKSA9PiBTdWJzY3JpcHRpb25cbiAgPihnZW5lcmF0b3I6IChvcmlnaW4kOiBPcmlnaW5UeXBlKSA9PiBPYnNlcnZhYmxlPHVua25vd24+KTogUmV0dXJuVHlwZSB7XG4gICAgY29uc3Qgb3JpZ2luJCA9IG5ldyBTdWJqZWN0PE9ic2VydmFibGVUeXBlPigpO1xuICAgIGdlbmVyYXRvcihvcmlnaW4kIGFzIE9yaWdpblR5cGUpXG4gICAgICAvLyB0aWVkIHRvIHRoZSBsaWZlY3ljbGUg8J+RhyBvZiBDb21wb25lbnRTdG9yZVxuICAgICAgLnBpcGUodGFrZVVudGlsKHRoaXMuZGVzdHJveSQpKVxuICAgICAgLnN1YnNjcmliZSgpO1xuXG4gICAgcmV0dXJuICgoXG4gICAgICBvYnNlcnZhYmxlT3JWYWx1ZT86IE9ic2VydmFibGVUeXBlIHwgT2JzZXJ2YWJsZTxPYnNlcnZhYmxlVHlwZT5cbiAgICApOiBTdWJzY3JpcHRpb24gPT4ge1xuICAgICAgY29uc3Qgb2JzZXJ2YWJsZSQgPSBpc09ic2VydmFibGUob2JzZXJ2YWJsZU9yVmFsdWUpXG4gICAgICAgID8gb2JzZXJ2YWJsZU9yVmFsdWVcbiAgICAgICAgOiBvZihvYnNlcnZhYmxlT3JWYWx1ZSk7XG4gICAgICByZXR1cm4gb2JzZXJ2YWJsZSQucGlwZSh0YWtlVW50aWwodGhpcy5kZXN0cm95JCkpLnN1YnNjcmliZSgodmFsdWUpID0+IHtcbiAgICAgICAgLy8gYW55IG5ldyDwn5GHIHZhbHVlIGlzIHB1c2hlZCBpbnRvIGEgc3RyZWFtXG4gICAgICAgIG9yaWdpbiQubmV4dCh2YWx1ZSBhcyBPYnNlcnZhYmxlVHlwZSk7XG4gICAgICB9KTtcbiAgICB9KSBhcyB1bmtub3duIGFzIFJldHVyblR5cGU7XG4gIH1cblxuICAvKipcbiAgICogVXNlZCB0byBjaGVjayBpZiBsaWZlY3ljbGUgaG9va3MgYXJlIGRlZmluZWRcbiAgICogYnV0IG5vdCB1c2VkIHdpdGggcHJvdmlkZUNvbXBvbmVudFN0b3JlKClcbiAgICovXG4gIHByaXZhdGUgY2hlY2tQcm92aWRlckZvckhvb2tzKCkge1xuICAgIGFzYXBTY2hlZHVsZXIuc2NoZWR1bGUoKCkgPT4ge1xuICAgICAgaWYgKFxuICAgICAgICBpc0Rldk1vZGUoKSAmJlxuICAgICAgICAoaXNPblN0b3JlSW5pdERlZmluZWQodGhpcykgfHwgaXNPblN0YXRlSW5pdERlZmluZWQodGhpcykpICYmXG4gICAgICAgICF0aGlzLsm1aGFzUHJvdmlkZXJcbiAgICAgICkge1xuICAgICAgICBjb25zdCB3YXJuaW5ncyA9IFtcbiAgICAgICAgICBpc09uU3RvcmVJbml0RGVmaW5lZCh0aGlzKSA/ICdPblN0b3JlSW5pdCcgOiAnJyxcbiAgICAgICAgICBpc09uU3RhdGVJbml0RGVmaW5lZCh0aGlzKSA/ICdPblN0YXRlSW5pdCcgOiAnJyxcbiAgICAgICAgXS5maWx0ZXIoKGRlZmluZWQpID0+IGRlZmluZWQpO1xuXG4gICAgICAgIGNvbnNvbGUud2FybihcbiAgICAgICAgICBgQG5ncngvY29tcG9uZW50LXN0b3JlOiAke1xuICAgICAgICAgICAgdGhpcy5jb25zdHJ1Y3Rvci5uYW1lXG4gICAgICAgICAgfSBoYXMgdGhlICR7d2FybmluZ3Muam9pbignIGFuZCAnKX0gYCArXG4gICAgICAgICAgICAnbGlmZWN5Y2xlIGhvb2socykgaW1wbGVtZW50ZWQgd2l0aG91dCBiZWluZyBwcm92aWRlZCB1c2luZyB0aGUgJyArXG4gICAgICAgICAgICBgcHJvdmlkZUNvbXBvbmVudFN0b3JlKCR7dGhpcy5jb25zdHJ1Y3Rvci5uYW1lfSkgZnVuY3Rpb24uIGAgK1xuICAgICAgICAgICAgYFRvIHJlc29sdmUgdGhpcywgcHJvdmlkZSB0aGUgY29tcG9uZW50IHN0b3JlIHZpYSBwcm92aWRlQ29tcG9uZW50U3RvcmUoJHt0aGlzLmNvbnN0cnVjdG9yLm5hbWV9KWBcbiAgICAgICAgKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgYXNzZXJ0U3RhdGVJc0luaXRpYWxpemVkKCk6IHZvaWQge1xuICAgIGlmICghdGhpcy5pc0luaXRpYWxpemVkKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgIGAke3RoaXMuY29uc3RydWN0b3IubmFtZX0gaGFzIG5vdCBiZWVuIGluaXRpYWxpemVkIHlldC4gYCArXG4gICAgICAgICAgYFBsZWFzZSBtYWtlIHN1cmUgaXQgaXMgaW5pdGlhbGl6ZWQgYmVmb3JlIHVwZGF0aW5nL2dldHRpbmcuYFxuICAgICAgKTtcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gcHJvY2Vzc1NlbGVjdG9yQXJnczxcbiAgU2VsZWN0b3JzIGV4dGVuZHMgQXJyYXk8XG4gICAgT2JzZXJ2YWJsZTx1bmtub3duPiB8IFNlbGVjdENvbmZpZzxSZXN1bHQ+IHwgUHJvamVjdG9yRm4gfCBTZWxlY3RvcnNPYmplY3RcbiAgPixcbiAgUmVzdWx0LFxuICBQcm9qZWN0b3JGbiBleHRlbmRzICguLi5hOiB1bmtub3duW10pID0+IFJlc3VsdCxcbiAgU2VsZWN0b3JzT2JqZWN0IGV4dGVuZHMgUmVjb3JkPHN0cmluZywgT2JzZXJ2YWJsZTx1bmtub3duPj5cbj4oXG4gIGFyZ3M6IFNlbGVjdG9yc1xuKTpcbiAgfCB7XG4gICAgICBvYnNlcnZhYmxlc09yU2VsZWN0b3JzT2JqZWN0OiBPYnNlcnZhYmxlPHVua25vd24+W107XG4gICAgICBwcm9qZWN0b3I6IFByb2plY3RvckZuO1xuICAgICAgY29uZmlnOiBSZXF1aXJlZDxTZWxlY3RDb25maWc8UmVzdWx0Pj47XG4gICAgfVxuICB8IHtcbiAgICAgIG9ic2VydmFibGVzT3JTZWxlY3RvcnNPYmplY3Q6IFNlbGVjdG9yc09iamVjdDtcbiAgICAgIHByb2plY3RvcjogdW5kZWZpbmVkO1xuICAgICAgY29uZmlnOiBSZXF1aXJlZDxTZWxlY3RDb25maWc8UmVzdWx0Pj47XG4gICAgfSB7XG4gIGNvbnN0IHNlbGVjdG9yQXJncyA9IEFycmF5LmZyb20oYXJncyk7XG4gIGNvbnN0IGRlZmF1bHRFcXVhbGl0eUZuOiBWYWx1ZUVxdWFsaXR5Rm48UmVzdWx0PiA9IChwcmV2aW91cywgY3VycmVudCkgPT5cbiAgICBwcmV2aW91cyA9PT0gY3VycmVudDtcblxuICAvLyBBc3NpZ24gZGVmYXVsdCB2YWx1ZXMuXG4gIGxldCBjb25maWc6IFJlcXVpcmVkPFNlbGVjdENvbmZpZzxSZXN1bHQ+PiA9IHtcbiAgICBkZWJvdW5jZTogZmFsc2UsXG4gICAgZXF1YWw6IGRlZmF1bHRFcXVhbGl0eUZuLFxuICB9O1xuXG4gIC8vIExhc3QgYXJndW1lbnQgaXMgZWl0aGVyIGNvbmZpZyBvciBwcm9qZWN0b3Igb3Igc2VsZWN0b3JzT2JqZWN0XG4gIGlmIChpc1NlbGVjdENvbmZpZyhzZWxlY3RvckFyZ3Nbc2VsZWN0b3JBcmdzLmxlbmd0aCAtIDFdKSkge1xuICAgIGNvbmZpZyA9IHsgLi4uY29uZmlnLCAuLi5zZWxlY3RvckFyZ3MucG9wKCkgfTtcbiAgfVxuXG4gIC8vIEF0IHRoaXMgcG9pbnQgc2VsZWN0b3JBcmdzIGlzIGVpdGhlciBwcm9qZWN0b3IsIHNlbGVjdG9ycyB3aXRoIHByb2plY3RvciBvciBzZWxlY3RvcnNPYmplY3RcbiAgaWYgKHNlbGVjdG9yQXJncy5sZW5ndGggPT09IDEgJiYgdHlwZW9mIHNlbGVjdG9yQXJnc1swXSAhPT0gJ2Z1bmN0aW9uJykge1xuICAgIC8vIHRoaXMgaXMgYSBzZWxlY3RvcnNPYmplY3RcbiAgICByZXR1cm4ge1xuICAgICAgb2JzZXJ2YWJsZXNPclNlbGVjdG9yc09iamVjdDogc2VsZWN0b3JBcmdzWzBdIGFzIFNlbGVjdG9yc09iamVjdCxcbiAgICAgIHByb2plY3RvcjogdW5kZWZpbmVkLFxuICAgICAgY29uZmlnLFxuICAgIH07XG4gIH1cblxuICBjb25zdCBwcm9qZWN0b3IgPSBzZWxlY3RvckFyZ3MucG9wKCkgYXMgUHJvamVjdG9yRm47XG5cbiAgLy8gVGhlIE9ic2VydmFibGVzIHRvIGNvbWJpbmUsIGlmIHRoZXJlIGFyZSBhbnkgbGVmdC5cbiAgY29uc3Qgb2JzZXJ2YWJsZXMgPSBzZWxlY3RvckFyZ3MgYXMgT2JzZXJ2YWJsZTx1bmtub3duPltdO1xuICByZXR1cm4ge1xuICAgIG9ic2VydmFibGVzT3JTZWxlY3RvcnNPYmplY3Q6IG9ic2VydmFibGVzLFxuICAgIHByb2plY3RvcixcbiAgICBjb25maWcsXG4gIH07XG59XG5cbmZ1bmN0aW9uIGlzU2VsZWN0Q29uZmlnKFxuICBhcmc6IFNlbGVjdENvbmZpZzx1bmtub3duPiB8IHVua25vd25cbik6IGFyZyBpcyBTZWxlY3RDb25maWc8dW5rbm93bj4ge1xuICBjb25zdCB0eXBlZEFyZyA9IGFyZyBhcyBTZWxlY3RDb25maWc8dW5rbm93bj47XG4gIHJldHVybiAoXG4gICAgdHlwZW9mIHR5cGVkQXJnLmRlYm91bmNlICE9PSAndW5kZWZpbmVkJyB8fFxuICAgIHR5cGVvZiB0eXBlZEFyZy5lcXVhbCAhPT0gJ3VuZGVmaW5lZCdcbiAgKTtcbn1cblxuZnVuY3Rpb24gaGFzUHJvamVjdEZuT25seShcbiAgb2JzZXJ2YWJsZXNPclNlbGVjdG9yc09iamVjdDogdW5rbm93bltdIHwgUmVjb3JkPHN0cmluZywgdW5rbm93bj4sXG4gIHByb2plY3RvcjogdW5rbm93blxuKSB7XG4gIHJldHVybiAoXG4gICAgQXJyYXkuaXNBcnJheShvYnNlcnZhYmxlc09yU2VsZWN0b3JzT2JqZWN0KSAmJlxuICAgIG9ic2VydmFibGVzT3JTZWxlY3RvcnNPYmplY3QubGVuZ3RoID09PSAwICYmXG4gICAgcHJvamVjdG9yXG4gICk7XG59XG5cbmZ1bmN0aW9uIG5vb3BPcGVyYXRvcigpOiA8VD4oc291cmNlJDogT2JzZXJ2YWJsZTxUPikgPT4gdHlwZW9mIHNvdXJjZSQge1xuICByZXR1cm4gKHNvdXJjZSQpID0+IHNvdXJjZSQ7XG59XG4iXX0=