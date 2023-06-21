import { isObservable, of, ReplaySubject, throwError, combineLatest, Subject, queueScheduler, scheduled, asapScheduler, EMPTY, } from 'rxjs';
import { takeUntil, withLatestFrom, map, distinctUntilChanged, shareReplay, take, tap, catchError, observeOn, } from 'rxjs/operators';
import { debounceSync } from './debounce-sync';
import { Injectable, Optional, InjectionToken, Inject, isDevMode, computed, } from '@angular/core';
import { isOnStateInitDefined, isOnStoreInitDefined } from './lifecycle_hooks';
import { toSignal } from '@angular/core/rxjs-interop';
import * as i0 from "@angular/core";
export const INITIAL_STATE_TOKEN = new InjectionToken('@ngrx/component-store Initial State');
class ComponentStore {
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
        const defaultEqualityFn = (previous, current) => previous === current;
        const options = typeof selectSignalArgs[args.length - 1] === 'object'
            ? {
                equal: selectSignalArgs.pop().equal ||
                    defaultEqualityFn,
            }
            : { equal: defaultEqualityFn };
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
    /** @nocollapse */ static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "16.0.0", ngImport: i0, type: ComponentStore, deps: [{ token: INITIAL_STATE_TOKEN, optional: true }], target: i0.ɵɵFactoryTarget.Injectable }); }
    /** @nocollapse */ static { this.ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "16.0.0", ngImport: i0, type: ComponentStore }); }
}
export { ComponentStore };
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "16.0.0", ngImport: i0, type: ComponentStore, decorators: [{
            type: Injectable
        }], ctorParameters: function () { return [{ type: undefined, decorators: [{
                    type: Optional
                }, {
                    type: Inject,
                    args: [INITIAL_STATE_TOKEN]
                }] }]; } });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcG9uZW50LXN0b3JlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vbW9kdWxlcy9jb21wb25lbnQtc3RvcmUvc3JjL2NvbXBvbmVudC1zdG9yZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQ0wsWUFBWSxFQUVaLEVBQUUsRUFDRixhQUFhLEVBRWIsVUFBVSxFQUNWLGFBQWEsRUFDYixPQUFPLEVBQ1AsY0FBYyxFQUNkLFNBQVMsRUFDVCxhQUFhLEVBQ2IsS0FBSyxHQUVOLE1BQU0sTUFBTSxDQUFDO0FBQ2QsT0FBTyxFQUNMLFNBQVMsRUFDVCxjQUFjLEVBQ2QsR0FBRyxFQUNILG9CQUFvQixFQUNwQixXQUFXLEVBQ1gsSUFBSSxFQUNKLEdBQUcsRUFDSCxVQUFVLEVBQ1YsU0FBUyxHQUNWLE1BQU0sZ0JBQWdCLENBQUM7QUFDeEIsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBQy9DLE9BQU8sRUFDTCxVQUFVLEVBRVYsUUFBUSxFQUNSLGNBQWMsRUFDZCxNQUFNLEVBQ04sU0FBUyxFQUVULFFBQVEsR0FHVCxNQUFNLGVBQWUsQ0FBQztBQUN2QixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQztBQUMvRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sNEJBQTRCLENBQUM7O0FBT3RELE1BQU0sQ0FBQyxNQUFNLG1CQUFtQixHQUFHLElBQUksY0FBYyxDQUNuRCxxQ0FBcUMsQ0FDdEMsQ0FBQztBQTJCRixNQUNhLGNBQWM7SUFnQnpCLFlBQXFELFlBQWdCO1FBZnJFLHNDQUFzQztRQUNyQixvQkFBZSxHQUFHLElBQUksYUFBYSxDQUFPLENBQUMsQ0FBQyxDQUFDO1FBQzlELDhEQUE4RDtRQUNyRCxhQUFRLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxZQUFZLEVBQUUsQ0FBQztRQUV2QyxrQkFBYSxHQUFHLElBQUksYUFBYSxD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QUVwRCxxREFBcUQ7SUFDckQsTUFBTSxXQUFXLEdBQUcsWUFBcUMsQ0FBQztJQUMxRCxPQUFPO1FBQ0wsNEJBQTRCLEVBQUUsV0FBVztRQUN6QyxTQUFTO1FBQ1QsTUFBTTtLQUNQLENBQUM7QUFDSixDQUFDO0FBRUQsU0FBUyxjQUFjLENBQ3JCLEdBQW9DO0lBRXBDLE1BQU0sUUFBUSxHQUFHLEdBQTRCLENBQUM7SUFDOUMsT0FBTyxDQUNMLE9BQU8sUUFBUSxDQUFDLFFBQVEsS0FBSyxXQUFXO1FBQ3hDLE9BQU8sUUFBUSxDQUFDLEtBQUssS0FBSyxXQUFXLENBQ3RDLENBQUM7QUFDSixDQUFDO0FBRUQsU0FBUyxnQkFBZ0IsQ0FDdkIsNEJBQWlFLEVBQ2pFLFNBQWtCO0lBRWxCLE9BQU8sQ0FDTCxLQUFLLENBQUMsT0FBTyxDQUFDLDRCQUE0QixDQUFDO1FBQzNDLDRCQUE0QixDQUFDLE1BQU0sS0FBSyxDQUFDO1FBQ3pDLFNBQVMsQ0FDVixDQUFDO0FBQ0osQ0FBQztBQUVELFNBQVMsWUFBWTtJQUNuQixPQUFPLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxPQUFPLENBQUM7QUFDOUIsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7XG4gIGlzT2JzZXJ2YWJsZSxcbiAgT2JzZXJ2YWJsZSxcbiAgb2YsXG4gIFJlcGxheVN1YmplY3QsXG4gIFN1YnNjcmlwdGlvbixcbiAgdGhyb3dFcnJvcixcbiAgY29tYmluZUxhdGVzdCxcbiAgU3ViamVjdCxcbiAgcXVldWVTY2hlZHVsZXIsXG4gIHNjaGVkdWxlZCxcbiAgYXNhcFNjaGVkdWxlcixcbiAgRU1QVFksXG4gIE9ic2VydmVkVmFsdWVPZixcbn0gZnJvbSAncnhqcyc7XG5pbXBvcnQge1xuICB0YWtlVW50aWwsXG4gIHdpdGhMYXRlc3RGcm9tLFxuICBtYXAsXG4gIGRpc3RpbmN0VW50aWxDaGFuZ2VkLFxuICBzaGFyZVJlcGxheSxcbiAgdGFrZSxcbiAgdGFwLFxuICBjYXRjaEVycm9yLFxuICBvYnNlcnZlT24sXG59IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCB7IGRlYm91bmNlU3luYyB9IGZyb20gJy4vZGVib3VuY2Utc3luYyc7XG5pbXBvcnQge1xuICBJbmplY3RhYmxlLFxuICBPbkRlc3Ryb3ksXG4gIE9wdGlvbmFsLFxuICBJbmplY3Rpb25Ub2tlbixcbiAgSW5qZWN0LFxuICBpc0Rldk1vZGUsXG4gIFNpZ25hbCxcbiAgY29tcHV0ZWQsXG4gIHR5cGUgVmFsdWVFcXVhbGl0eUZuLFxuICB0eXBlIENyZWF0ZUNvbXB1dGVkT3B0aW9ucyxcbn0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQgeyBpc09uU3RhdGVJbml0RGVmaW5lZCwgaXNPblN0b3JlSW5pdERlZmluZWQgfSBmcm9tICcuL2xpZmVjeWNsZV9ob29rcyc7XG5pbXBvcnQgeyB0b1NpZ25hbCB9IGZyb20gJ0Bhbmd1bGFyL2NvcmUvcnhqcy1pbnRlcm9wJztcblxuZXhwb3J0IGludGVyZmFjZSBTZWxlY3RDb25maWc8VCA9IHVua25vd24+IHtcbiAgZGVib3VuY2U/OiBib29sZWFuO1xuICBlcXVhbD86IFZhbHVlRXF1YWxpdHlGbjxUPjtcbn1cblxuZXhwb3J0IGNvbnN0IElOSVRJQUxfU1RBVEVfVE9LRU4gPSBuZXcgSW5qZWN0aW9uVG9rZW4oXG4gICdAbmdyeC9jb21wb25lbnQtc3RvcmUgSW5pdGlhbCBTdGF0ZSdcbik7XG5cbmV4cG9ydCB0eXBlIFNlbGVjdG9yUmVzdWx0czxTZWxlY3RvcnMgZXh0ZW5kcyBPYnNlcnZhYmxlPHVua25vd24+W10+ID0ge1xuICBbS2V5IGluIGtleW9mIFNlbGVjdG9yc106IFNlbGVjdG9yc1tLZXldIGV4dGVuZHMgT2JzZXJ2YWJsZTxpbmZlciBVPlxuICAgID8gVVxuICAgIDogbmV2ZXI7XG59O1xuXG5leHBvcnQgdHlwZSBQcm9qZWN0b3I8U2VsZWN0b3JzIGV4dGVuZHMgT2JzZXJ2YWJsZTx1bmtub3duPltdLCBSZXN1bHQ+ID0gKFxuICAuLi5hcmdzOiBTZWxlY3RvclJlc3VsdHM8U2VsZWN0b3JzPlxuKSA9PiBSZXN1bHQ7XG5cbnR5cGUgU2lnbmFsc1Byb2plY3RvcjxTaWduYWxzIGV4dGVuZHMgU2lnbmFsPHVua25vd24+W10sIFJlc3VsdD4gPSAoXG4gIC4uLnZhbHVlczoge1xuICAgIFtLZXkgaW4ga2V5b2YgU2lnbmFsc106IFNpZ25hbHNbS2V5XSBleHRlbmRzIFNpZ25hbDxpbmZlciBWYWx1ZT5cbiAgICAgID8gVmFsdWVcbiAgICAgIDogbmV2ZXI7XG4gIH1cbikgPT4gUmVzdWx0O1xuXG5pbnRlcmZhY2UgU2VsZWN0U2lnbmFsT3B0aW9uczxUPiB7XG4gIC8qKlxuICAgKiBBIGNvbXBhcmlzb24gZnVuY3Rpb24gd2hpY2ggZGVmaW5lcyBlcXVhbGl0eSBmb3Igc2VsZWN0IHJlc3VsdHMuXG4gICAqL1xuICBlcXVhbD86IFZhbHVlRXF1YWxpdHlGbjxUPjtcbn1cblxuQEluamVjdGFibGUoKVxuZXhwb3J0IGNsYXNzIENvbXBvbmVudFN0b3JlPFQgZXh0ZW5kcyBvYmplY3Q+IGltcGxlbWVudHMgT25EZXN0cm95IHtcbiAgLy8gU2hvdWxkIGJlIHVzZWQgb25seSBpbiBuZ09uRGVzdHJveS5cbiAgcHJpdmF0ZSByZWFkb25seSBkZXN0cm95U3ViamVjdCQgPSBuZXcgUmVwbGF5U3ViamVjdDx2b2lkPigxKTtcbiAgLy8gRXhwb3NlZCB0byBhbnkgZXh0ZW5kaW5nIFN0b3JlIHRvIGJlIHVzZWQgZm9yIHRoZSB0ZWFyZG93bi5cbiAgcmVhZG9ubHkgZGVzdHJveSQgPSB0aGlzLmRlc3Ryb3lTdWJqZWN0JC5hc09ic2VydmFibGUoKTtcblxuICBwcml2YXRlIHJlYWRvbmx5IHN0YXRlU3ViamVjdCQgPSBuZXcgUmVwbGF5U3ViamVjdDxUPigxKTtcbiAgcHJpdmF0ZSBpc0luaXRpYWxpemVkID0gZmFsc2U7XG4gIC8vIE5lZWRzIHRvIGJlIGFmdGVyIGRlc3Ryb3kkIGlzIGRlY2xhcmVkIGJlY2F1c2UgaXQncyB1c2VkIGluIHNlbGVjdC5cbiAgcmVhZG9ubHkgc3RhdGUkOiBPYnNlcnZhYmxlPFQ+ID0gdGhpcy5zZWxlY3QoKHMpID0+IHMpO1xuICByZWFkb25seSBzdGF0ZTogU2lnbmFsPFQ+ID0gdG9TaWduYWwoXG4gICAgdGhpcy5zdGF0ZVN1YmplY3QkLnBpcGUodGFrZVVudGlsKHRoaXMuZGVzdHJveSQpKSxcbiAgICB7IHJlcXVpcmVTeW5jOiBmYWxzZSwgbWFudWFsQ2xlYW51cDogdHJ1ZSB9XG4gICkgYXMgU2lnbmFsPFQ+O1xuICBwcml2YXRlIMm1aGFzUHJvdmlkZXIgPSBmYWxzZTtcblxuICBjb25zdHJ1Y3RvcihAT3B0aW9uYWwoKSBASW5qZWN0KElOSVRJQUxfU1RBVEVfVE9LRU4pIGRlZmF1bHRTdGF0ZT86IFQpIHtcbiAgICAvLyBTdGF0ZSBjYW4gYmUgaW5pdGlhbGl6ZWQgZWl0aGVyIHRocm91Z2ggY29uc3RydWN0b3Igb3Igc2V0U3RhdGUuXG4gICAgaWYgKGRlZmF1bHRTdGF0ZSkge1xuICAgICAgdGhpcy5pbml0U3RhdGUoZGVmYXVsdFN0YXRlKTtcbiAgICB9XG5cbiAgICB0aGlzLmNoZWNrUHJvdmlkZXJGb3JIb29rcygpO1xuICB9XG5cbiAgLyoqIENvbXBsZXRlcyBhbGwgcmVsZXZhbnQgT2JzZXJ2YWJsZSBzdHJlYW1zLiAqL1xuICBuZ09uRGVzdHJveSgpIHtcbiAgICB0aGlzLnN0YXRlU3ViamVjdCQuY29tcGxldGUoKTtcbiAgICB0aGlzLmRlc3Ryb3lTdWJqZWN0JC5uZXh0KCk7XG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlcyBhbiB1cGRhdGVyLlxuICAgKlxuICAgKiBUaHJvd3MgYW4gZXJyb3IgaWYgdXBkYXRlciBpcyBjYWxsZWQgd2l0aCBzeW5jaHJvbm91cyB2YWx1ZXMgKGVpdGhlclxuICAgKiBpbXBlcmF0aXZlIHZhbHVlIG9yIE9ic2VydmFibGUgdGhhdCBpcyBzeW5jaHJvbm91cykgYmVmb3JlIENvbXBvbmVudFN0b3JlXG4gICAqIGlzIGluaXRpYWxpemVkLiBJZiBjYWxsZWQgd2l0aCBhc3luYyBPYnNlcnZhYmxlIGJlZm9yZSBpbml0aWFsaXphdGlvbiB0aGVuXG4gICAqIHN0YXRlIHdpbGwgbm90IGJlIHVwZGF0ZWQgYW5kIHN1YnNjcmlwdGlvbiB3b3VsZCBiZSBjbG9zZWQuXG4gICAqXG4gICAqIEBwYXJhbSB1cGRhdGVyRm4gQSBzdGF0aWMgdXBkYXRlciBmdW5jdGlvbiB0aGF0IHRha2VzIDIgcGFyYW1ldGVycyAodGhlXG4gICAqIGN1cnJlbnQgc3RhdGUgYW5kIGFuIGFyZ3VtZW50IG9iamVjdCkgYW5kIHJldHVybnMgYSBuZXcgaW5zdGFuY2Ugb2YgdGhlXG4gICAqIHN0YXRlLlxuICAgKiBAcmV0dXJuIEEgZnVuY3Rpb24gdGhhdCBhY2NlcHRzIG9uZSBhcmd1bWVudCB3aGljaCBpcyBmb3J3YXJkZWQgYXMgdGhlXG4gICAqICAgICBzZWNvbmQgYXJndW1lbnQgdG8gYHVwZGF0ZXJGbmAuIEV2ZXJ5IHRpbWUgdGhpcyBmdW5jdGlvbiBpcyBjYWxsZWRcbiAgICogICAgIHN1YnNjcmliZXJzIHdpbGwgYmUgbm90aWZpZWQgb2YgdGhlIHN0YXRlIGNoYW5nZS5cbiAgICovXG4gIHVwZGF0ZXI8XG4gICAgLy8gQWxsb3cgdG8gZm9yY2UtcHJvdmlkZSB0aGUgdHlwZVxuICAgIFByb3ZpZGVkVHlwZSA9IHZvaWQsXG4gICAgLy8gVGhpcyB0eXBlIGlzIGRlcml2ZWQgZnJvbSB0aGUgYHZhbHVlYCBwcm9wZXJ0eSwgZGVmYXVsdGluZyB0byB2b2lkIGlmIGl0J3MgbWlzc2luZ1xuICAgIE9yaWdpblR5cGUgPSBQcm92aWRlZFR5cGUsXG4gICAgLy8gVGhlIFZhbHVlIHR5cGUgaXMgYXNzaWduZWQgZnJvbSB0aGUgT3JpZ2luXG4gICAgVmFsdWVUeXBlID0gT3JpZ2luVHlwZSxcbiAgICAvLyBSZXR1cm4gZWl0aGVyIGFuIGVtcHR5IGNhbGxiYWNrIG9yIGEgZnVuY3Rpb24gcmVxdWlyaW5nIHNwZWNpZmljIHR5cGVzIGFzIGlucHV0c1xuICAgIFJldHVyblR5cGUgPSBPcmlnaW5UeXBlIGV4dGVuZHMgdm9pZFxuICAgICAgPyAoKSA9PiB2b2lkXG4gICAgICA6IChvYnNlcnZhYmxlT3JWYWx1ZTogVmFsdWVUeXBlIHwgT2JzZXJ2YWJsZTxWYWx1ZVR5cGU+KSA9PiBTdWJzY3JpcHRpb25cbiAgPih1cGRhdGVyRm46IChzdGF0ZTogVCwgdmFsdWU6IE9yaWdpblR5cGUpID0+IFQpOiBSZXR1cm5UeXBlIHtcbiAgICByZXR1cm4gKChcbiAgICAgIG9ic2VydmFibGVPclZhbHVlPzogT3JpZ2luVHlwZSB8IE9ic2VydmFibGU8T3JpZ2luVHlwZT5cbiAgICApOiBTdWJzY3JpcHRpb24gPT4ge1xuICAgICAgLy8gV2UgbmVlZCB0byBleHBsaWNpdGx5IHRocm93IGFuIGVycm9yIGlmIGEgc3luY2hyb25vdXMgZXJyb3Igb2NjdXJzLlxuICAgICAgLy8gVGhpcyBpcyBuZWNlc3NhcnkgdG8gbWFrZSBzeW5jaHJvbm91cyBlcnJvcnMgY2F0Y2hhYmxlLlxuICAgICAgbGV0IGlzU3luY1VwZGF0ZSA9IHRydWU7XG4gICAgICBsZXQgc3luY0Vycm9yOiB1bmtub3duO1xuICAgICAgLy8gV2UgY2FuIHJlY2VpdmUgZWl0aGVyIHRoZSB2YWx1ZSBvciBhbiBvYnNlcnZhYmxlLiBJbiBjYXNlIGl0J3MgYVxuICAgICAgLy8gc2ltcGxlIHZhbHVlLCB3ZSdsbCB3cmFwIGl0IHdpdGggYG9mYCBvcGVyYXRvciB0byB0dXJuIGl0IGludG9cbiAgICAgIC8vIE9ic2VydmFibGUuXG4gICAgICBjb25zdCBvYnNlcnZhYmxlJCA9IGlzT2JzZXJ2YWJsZShvYnNlcnZhYmxlT3JWYWx1ZSlcbiAgICAgICAgPyBvYnNlcnZhYmxlT3JWYWx1ZVxuICAgICAgICA6IG9mKG9ic2VydmFibGVPclZhbHVlKTtcbiAgICAgIGNvbnN0IHN1YnNjcmlwdGlvbiA9IG9ic2VydmFibGUkXG4gICAgICAgIC5waXBlKFxuICAgICAgICAgIC8vIFB1c2ggdGhlIHZhbHVlIGludG8gcXVldWVTY2hlZHVsZXJcbiAgICAgICAgICBvYnNlcnZlT24ocXVldWVTY2hlZHVsZXIpLFxuICAgICAgICAgIC8vIElmIHRoZSBzdGF0ZSBpcyBub3QgaW5pdGlhbGl6ZWQgeWV0LCB3ZSdsbCB0aHJvdyBhbiBlcnJvci5cbiAgICAgICAgICB0YXAoKCkgPT4gdGhpcy5hc3NlcnRTdGF0ZUlzSW5pdGlhbGl6ZWQoKSksXG4gICAgICAgICAgd2l0aExhdGVzdEZyb20odGhpcy5zdGF0ZVN1YmplY3QkKSxcbiAgICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLW5vbi1udWxsLWFzc2VydGlvblxuICAgICAgICAgIG1hcCgoW3ZhbHVlLCBjdXJyZW50U3RhdGVdKSA9PiB1cGRhdGVyRm4oY3VycmVudFN0YXRlLCB2YWx1ZSEpKSxcbiAgICAgICAgICB0YXAoKG5ld1N0YXRlKSA9PiB0aGlzLnN0YXRlU3ViamVjdCQubmV4dChuZXdTdGF0ZSkpLFxuICAgICAgICAgIGNhdGNoRXJyb3IoKGVycm9yOiB1bmtub3duKSA9PiB7XG4gICAgICAgICAgICBpZiAoaXNTeW5jVXBkYXRlKSB7XG4gICAgICAgICAgICAgIHN5bmNFcnJvciA9IGVycm9yO1xuICAgICAgICAgICAgICByZXR1cm4gRU1QVFk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiB0aHJvd0Vycm9yKGVycm9yKTtcbiAgICAgICAgICB9KSxcbiAgICAgICAgICB0YWtlVW50aWwodGhpcy5kZXN0cm95JClcbiAgICAgICAgKVxuICAgICAgICAuc3Vic2NyaWJlKCk7XG5cbiAgICAgIGlmIChzeW5jRXJyb3IpIHtcbiAgICAgICAgdGhyb3cgc3luY0Vycm9yO1xuICAgICAgfVxuICAgICAgaXNTeW5jVXBkYXRlID0gZmFsc2U7XG5cbiAgICAgIHJldHVybiBzdWJzY3JpcHRpb247XG4gICAgfSkgYXMgdW5rbm93biBhcyBSZXR1cm5UeXBlO1xuICB9XG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemVzIHN0YXRlLiBJZiBpdCB3YXMgYWxyZWFkeSBpbml0aWFsaXplZCB0aGVuIGl0IHJlc2V0cyB0aGVcbiAgICogc3RhdGUuXG4gICAqL1xuICBwcml2YXRlIGluaXRTdGF0ZShzdGF0ZTogVCk6IHZvaWQge1xuICAgIHNjaGVkdWxlZChbc3RhdGVdLCBxdWV1ZVNjaGVkdWxlcikuc3Vic2NyaWJlKChzKSA9PiB7XG4gICAgICB0aGlzLmlzSW5pdGlhbGl6ZWQgPSB0cnVlO1xuICAgICAgdGhpcy5zdGF0ZVN1YmplY3QkLm5leHQocyk7XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogU2V0cyB0aGUgc3RhdGUgc3BlY2lmaWMgdmFsdWUuXG4gICAqIEBwYXJhbSBzdGF0ZU9yVXBkYXRlckZuIG9iamVjdCBvZiB0aGUgc2FtZSB0eXBlIGFzIHRoZSBzdGF0ZSBvciBhblxuICAgKiB1cGRhdGVyRm4sIHJldHVybmluZyBzdWNoIG9iamVjdC5cbiAgICovXG4gIHNldFN0YXRlKHN0YXRlT3JVcGRhdGVyRm46IFQgfCAoKHN0YXRlOiBUKSA9PiBUKSk6IHZvaWQge1xuICAgIGlmICh0eXBlb2Ygc3RhdGVPclVwZGF0ZXJGbiAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgdGhpcy5pbml0U3RhdGUoc3RhdGVPclVwZGF0ZXJGbik7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMudXBkYXRlcihzdGF0ZU9yVXBkYXRlckZuIGFzIChzdGF0ZTogVCkgPT4gVCkoKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogUGF0Y2hlcyB0aGUgc3RhdGUgd2l0aCBwcm92aWRlZCBwYXJ0aWFsIHN0YXRlLlxuICAgKlxuICAgKiBAcGFyYW0gcGFydGlhbFN0YXRlT3JVcGRhdGVyRm4gYSBwYXJ0aWFsIHN0YXRlIG9yIGEgcGFydGlhbCB1cGRhdGVyXG4gICAqIGZ1bmN0aW9uIHRoYXQgYWNjZXB0cyB0aGUgc3RhdGUgYW5kIHJldHVybnMgdGhlIHBhcnRpYWwgc3RhdGUuXG4gICAqIEB0aHJvd3MgRXJyb3IgaWYgdGhlIHN0YXRlIGlzIG5vdCBpbml0aWFsaXplZC5cbiAgICovXG4gIHBhdGNoU3RhdGUoXG4gICAgcGFydGlhbFN0YXRlT3JVcGRhdGVyRm46XG4gICAgICB8IFBhcnRpYWw8VD5cbiAgICAgIHwgT2JzZXJ2YWJsZTxQYXJ0aWFsPFQ+PlxuICAgICAgfCAoKHN0YXRlOiBUKSA9PiBQYXJ0aWFsPFQ+KVxuICApOiB2b2lkIHtcbiAgICBjb25zdCBwYXRjaGVkU3RhdGUgPVxuICAgICAgdHlwZW9mIHBhcnRpYWxTdGF0ZU9yVXBkYXRlckZuID09PSAnZnVuY3Rpb24nXG4gICAgICAgID8gcGFydGlhbFN0YXRlT3JVcGRhdGVyRm4odGhpcy5nZXQoKSlcbiAgICAgICAgOiBwYXJ0aWFsU3RhdGVPclVwZGF0ZXJGbjtcblxuICAgIHRoaXMudXBkYXRlcigoc3RhdGUsIHBhcnRpYWxTdGF0ZTogUGFydGlhbDxUPikgPT4gKHtcbiAgICAgIC4uLnN0YXRlLFxuICAgICAgLi4ucGFydGlhbFN0YXRlLFxuICAgIH0pKShwYXRjaGVkU3RhdGUpO1xuICB9XG5cbiAgcHJvdGVjdGVkIGdldCgpOiBUO1xuICBwcm90ZWN0ZWQgZ2V0PFI+KHByb2plY3RvcjogKHM6IFQpID0+IFIpOiBSO1xuICBwcm90ZWN0ZWQgZ2V0PFI+KHByb2plY3Rvcj86IChzOiBUKSA9PiBSKTogUiB8IFQge1xuICAgIHRoaXMuYXNzZXJ0U3RhdGVJc0luaXRpYWxpemVkKCk7XG4gICAgbGV0IHZhbHVlOiBSIHwgVDtcblxuICAgIHRoaXMuc3RhdGVTdWJqZWN0JC5waXBlKHRha2UoMSkpLnN1YnNjcmliZSgoc3RhdGUpID0+IHtcbiAgICAgIHZhbHVlID0gcHJvamVjdG9yID8gcHJvamVjdG9yKHN0YXRlKSA6IHN0YXRlO1xuICAgIH0pO1xuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tbm9uLW51bGwtYXNzZXJ0aW9uXG4gICAgcmV0dXJuIHZhbHVlITtcbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgc2VsZWN0b3IuXG4gICAqXG4gICAqIEBwYXJhbSBwcm9qZWN0b3IgQSBwdXJlIHByb2plY3Rpb24gZnVuY3Rpb24gdGhhdCB0YWtlcyB0aGUgY3VycmVudCBzdGF0ZSBhbmRcbiAgICogICByZXR1cm5zIHNvbWUgbmV3IHNsaWNlL3Byb2plY3Rpb24gb2YgdGhhdCBzdGF0ZS5cbiAgICogQHBhcmFtIGNvbmZpZyBTZWxlY3RDb25maWcgdGhhdCBjaGFuZ2VzIHRoZSBiZWhhdmlvciBvZiBzZWxlY3RvciwgaW5jbHVkaW5nXG4gICAqICAgdGhlIGRlYm91bmNpbmcgb2YgdGhlIHZhbHVlcyB1bnRpbCB0aGUgc3RhdGUgaXMgc2V0dGxlZC5cbiAgICogQHJldHVybiBBbiBvYnNlcnZhYmxlIG9mIHRoZSBwcm9qZWN0b3IgcmVzdWx0cy5cbiAgICovXG4gIHNlbGVjdDxSZXN1bHQ+KFxuICAgIHByb2plY3RvcjogKHM6IFQpID0+IFJlc3VsdCxcbiAgICBjb25maWc/OiBTZWxlY3RDb25maWc8UmVzdWx0PlxuICApOiBPYnNlcnZhYmxlPFJlc3VsdD47XG4gIHNlbGVjdDxTZWxlY3RvcnNPYmplY3QgZXh0ZW5kcyBSZWNvcmQ8c3RyaW5nLCBPYnNlcnZhYmxlPHVua25vd24+Pj4oXG4gICAgc2VsZWN0b3JzT2JqZWN0OiBTZWxlY3RvcnNPYmplY3QsXG4gICAgY29uZmlnPzogU2VsZWN0Q29uZmlnPHtcbiAgICAgIFtLIGluIGtleW9mIFNlbGVjdG9yc09iamVjdF06IE9ic2VydmVkVmFsdWVPZjxTZWxlY3RvcnNPYmplY3RbS10+O1xuICAgIH0+XG4gICk6IE9ic2VydmFibGU8e1xuICAgIFtLIGluIGtleW9mIFNlbGVjdG9yc09iamVjdF06IE9ic2VydmVkVmFsdWVPZjxTZWxlY3RvcnNPYmplY3RbS10+O1xuICB9PjtcbiAgc2VsZWN0PFNlbGVjdG9ycyBleHRlbmRzIE9ic2VydmFibGU8dW5rbm93bj5bXSwgUmVzdWx0PihcbiAgICAuLi5zZWxlY3RvcnNXaXRoUHJvamVjdG9yOiBbXG4gICAgICAuLi5zZWxlY3RvcnM6IFNlbGVjdG9ycyxcbiAgICAgIHByb2plY3RvcjogUHJvamVjdG9yPFNlbGVjdG9ycywgUmVzdWx0PlxuICAgIF1cbiAgKTogT2JzZXJ2YWJsZTxSZXN1bHQ+O1xuICBzZWxlY3Q8U2VsZWN0b3JzIGV4dGVuZHMgT2JzZXJ2YWJsZTx1bmtub3duPltdLCBSZXN1bHQ+KFxuICAgIC4uLnNlbGVjdG9yc1dpdGhQcm9qZWN0b3JBbmRDb25maWc6IFtcbiAgICAgIC4uLnNlbGVjdG9yczogU2VsZWN0b3JzLFxuICAgICAgcHJvamVjdG9yOiBQcm9qZWN0b3I8U2VsZWN0b3JzLCBSZXN1bHQ+LFxuICAgICAgY29uZmlnOiBTZWxlY3RDb25maWc8UmVzdWx0PlxuICAgIF1cbiAgKTogT2JzZXJ2YWJsZTxSZXN1bHQ+O1xuICBzZWxlY3Q8XG4gICAgU2VsZWN0b3JzIGV4dGVuZHMgQXJyYXk8XG4gICAgICBPYnNlcnZhYmxlPHVua25vd24+IHwgU2VsZWN0Q29uZmlnPFJlc3VsdD4gfCBQcm9qZWN0b3JGbiB8IFNlbGVjdG9yc09iamVjdFxuICAgID4sXG4gICAgUmVzdWx0LFxuICAgIFByb2plY3RvckZuIGV4dGVuZHMgKC4uLmE6IHVua25vd25bXSkgPT4gUmVzdWx0LFxuICAgIFNlbGVjdG9yc09iamVjdCBleHRlbmRzIFJlY29yZDxzdHJpbmcsIE9ic2VydmFibGU8dW5rbm93bj4+XG4gID4oLi4uYXJnczogU2VsZWN0b3JzKTogT2JzZXJ2YWJsZTxSZXN1bHQ+IHtcbiAgICBjb25zdCB7IG9ic2VydmFibGVzT3JTZWxlY3RvcnNPYmplY3QsIHByb2plY3RvciwgY29uZmlnIH0gPVxuICAgICAgcHJvY2Vzc1NlbGVjdG9yQXJnczxTZWxlY3RvcnMsIFJlc3VsdCwgUHJvamVjdG9yRm4sIFNlbGVjdG9yc09iamVjdD4oXG4gICAgICAgIGFyZ3NcbiAgICAgICk7XG5cbiAgICBjb25zdCBzb3VyY2UkID0gaGFzUHJvamVjdEZuT25seShvYnNlcnZhYmxlc09yU2VsZWN0b3JzT2JqZWN0LCBwcm9qZWN0b3IpXG4gICAgICA/IHRoaXMuc3RhdGVTdWJqZWN0JFxuICAgICAgOiBjb21iaW5lTGF0ZXN0KG9ic2VydmFibGVzT3JTZWxlY3RvcnNPYmplY3QgYXMgYW55KTtcblxuICAgIHJldHVybiBzb3VyY2UkLnBpcGUoXG4gICAgICBjb25maWcuZGVib3VuY2UgPyBkZWJvdW5jZVN5bmMoKSA6IG5vb3BPcGVyYXRvcigpLFxuICAgICAgKHByb2plY3RvclxuICAgICAgICA/IG1hcCgocHJvamVjdG9yQXJncykgPT5cbiAgICAgICAgICAgIC8vIHByb2plY3RvckFyZ3MgY291bGQgYmUgYW4gQXJyYXkgaW4gY2FzZSB3aGVyZSB0aGUgZW50aXJlIHN0YXRlIGlzIGFuIEFycmF5LCBzbyBhZGRpbmcgdGhpcyBjaGVja1xuICAgICAgICAgICAgKG9ic2VydmFibGVzT3JTZWxlY3RvcnNPYmplY3QgYXMgT2JzZXJ2YWJsZTx1bmtub3duPltdKS5sZW5ndGggPlxuICAgICAgICAgICAgICAwICYmIEFycmF5LmlzQXJyYXkocHJvamVjdG9yQXJncylcbiAgICAgICAgICAgICAgPyBwcm9qZWN0b3IoLi4ucHJvamVjdG9yQXJncylcbiAgICAgICAgICAgICAgOiBwcm9qZWN0b3IocHJvamVjdG9yQXJncylcbiAgICAgICAgICApXG4gICAgICAgIDogbm9vcE9wZXJhdG9yKCkpIGFzICgpID0+IE9ic2VydmFibGU8UmVzdWx0PixcbiAgICAgIGRpc3RpbmN0VW50aWxDaGFuZ2VkKGNvbmZpZy5lcXVhbCksXG4gICAgICBzaGFyZVJlcGxheSh7XG4gICAgICAgIHJlZkNvdW50OiB0cnVlLFxuICAgICAgICBidWZmZXJTaXplOiAxLFxuICAgICAgfSksXG4gICAgICB0YWtlVW50aWwodGhpcy5kZXN0cm95JClcbiAgICApO1xuICB9XG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBzaWduYWwgZnJvbSB0aGUgcHJvdmlkZWQgc3RhdGUgcHJvamVjdG9yIGZ1bmN0aW9uLlxuICAgKi9cbiAgc2VsZWN0U2lnbmFsPFJlc3VsdD4oXG4gICAgcHJvamVjdG9yOiAoc3RhdGU6IFQpID0+IFJlc3VsdCxcbiAgICBvcHRpb25zPzogU2VsZWN0U2lnbmFsT3B0aW9uczxSZXN1bHQ+XG4gICk6IFNpZ25hbDxSZXN1bHQ+O1xuICAvKipcbiAgICogQ3JlYXRlcyBhIHNpZ25hbCBieSBjb21iaW5pbmcgcHJvdmlkZWQgc2lnbmFscy5cbiAgICovXG4gIHNlbGVjdFNpZ25hbDxTaWduYWxzIGV4dGVuZHMgU2lnbmFsPHVua25vd24+W10sIFJlc3VsdD4oXG4gICAgLi4uYXJnczogWy4uLnNpZ25hbHM6IFNpZ25hbHMsIHByb2plY3RvcjogU2lnbmFsc1Byb2plY3RvcjxTaWduYWxzLCBSZXN1bHQ+XVxuICApOiBTaWduYWw8UmVzdWx0PjtcbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBzaWduYWwgYnkgY29tYmluaW5nIHByb3ZpZGVkIHNpZ25hbHMuXG4gICAqL1xuICBzZWxlY3RTaWduYWw8U2lnbmFscyBleHRlbmRzIFNpZ25hbDx1bmtub3duPltdLCBSZXN1bHQ+KFxuICAgIC4uLmFyZ3M6IFtcbiAgICAgIC4uLnNpZ25hbHM6IFNpZ25hbHMsXG4gICAgICBwcm9qZWN0b3I6IFNpZ25hbHNQcm9qZWN0b3I8U2lnbmFscywgUmVzdWx0PixcbiAgICAgIG9wdGlvbnM6IFNlbGVjdFNpZ25hbE9wdGlvbnM8UmVzdWx0PlxuICAgIF1cbiAgKTogU2lnbmFsPFJlc3VsdD47XG4gIHNlbGVjdFNpZ25hbChcbiAgICAuLi5hcmdzOlxuICAgICAgfCBbKHN0YXRlOiBUKSA9PiB1bmtub3duLCBTZWxlY3RTaWduYWxPcHRpb25zPHVua25vd24+P11cbiAgICAgIHwgW1xuICAgICAgICAgIC4uLnNpZ25hbHM6IFNpZ25hbDx1bmtub3duPltdLFxuICAgICAgICAgIHByb2plY3RvcjogKC4uLnZhbHVlczogdW5rbm93bltdKSA9PiB1bmtub3duXG4gICAgICAgIF1cbiAgICAgIHwgW1xuICAgICAgICAgIC4uLnNpZ25hbHM6IFNpZ25hbDx1bmtub3duPltdLFxuICAgICAgICAgIHByb2plY3RvcjogKC4uLnZhbHVlczogdW5rbm93bltdKSA9PiB1bmtub3duLFxuICAgICAgICAgIG9wdGlvbnM6IFNlbGVjdFNpZ25hbE9wdGlvbnM8dW5rbm93bj5cbiAgICAgICAgXVxuICApOiBTaWduYWw8dW5rbm93bj4ge1xuICAgIGNvbnN0IHNlbGVjdFNpZ25hbEFyZ3MgPSBbLi4uYXJnc107XG4gICAgY29uc3QgZGVmYXVsdEVxdWFsaXR5Rm46IFZhbHVlRXF1YWxpdHlGbjx1bmtub3duPiA9IChwcmV2aW91cywgY3VycmVudCkgPT5cbiAgICAgIHByZXZpb3VzID09PSBjdXJyZW50O1xuXG4gICAgY29uc3Qgb3B0aW9uczogQ3JlYXRlQ29tcHV0ZWRPcHRpb25zPHVua25vd24+ID1cbiAgICAgIHR5cGVvZiBzZWxlY3RTaWduYWxBcmdzW2FyZ3MubGVuZ3RoIC0gMV0gPT09ICdvYmplY3QnXG4gICAgICAgID8ge1xuICAgICAgICAgICAgZXF1YWw6XG4gICAgICAgICAgICAgIChzZWxlY3RTaWduYWxBcmdzLnBvcCgpIGFzIFNlbGVjdFNpZ25hbE9wdGlvbnM8dW5rbm93bj4pLmVxdWFsIHx8XG4gICAgICAgICAgICAgIGRlZmF1bHRFcXVhbGl0eUZuLFxuICAgICAgICAgIH1cbiAgICAgICAgOiB7IGVxdWFsOiBkZWZhdWx0RXF1YWxpdHlGbiB9O1xuICAgIGNvbnN0IHByb2plY3RvciA9IHNlbGVjdFNpZ25hbEFyZ3MucG9wKCkgYXMgKFxuICAgICAgLi4udmFsdWVzOiB1bmtub3duW11cbiAgICApID0+IHVua25vd247XG4gICAgY29uc3Qgc2lnbmFscyA9IHNlbGVjdFNpZ25hbEFyZ3MgYXMgU2lnbmFsPHVua25vd24+W107XG5cbiAgICBjb25zdCBjb21wdXRhdGlvbiA9XG4gICAgICBzaWduYWxzLmxlbmd0aCA9PT0gMFxuICAgICAgICA/ICgpID0+IHByb2plY3Rvcih0aGlzLnN0YXRlKCkpXG4gICAgICAgIDogKCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgdmFsdWVzID0gc2lnbmFscy5tYXAoKHNpZ25hbCkgPT4gc2lnbmFsKCkpO1xuICAgICAgICAgICAgcmV0dXJuIHByb2plY3RvciguLi52YWx1ZXMpO1xuICAgICAgICAgIH07XG5cbiAgICByZXR1cm4gY29tcHV0ZWQoY29tcHV0YXRpb24sIG9wdGlvbnMpO1xuICB9XG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgYW4gZWZmZWN0LlxuICAgKlxuICAgKiBUaGlzIGVmZmVjdCBpcyBzdWJzY3JpYmVkIHRvIHRocm91Z2hvdXQgdGhlIGxpZmVjeWNsZSBvZiB0aGUgQ29tcG9uZW50U3RvcmUuXG4gICAqIEBwYXJhbSBnZW5lcmF0b3IgQSBmdW5jdGlvbiB0aGF0IHRha2VzIGFuIG9yaWdpbiBPYnNlcnZhYmxlIGlucHV0IGFuZFxuICAgKiAgICAgcmV0dXJucyBhbiBPYnNlcnZhYmxlLiBUaGUgT2JzZXJ2YWJsZSB0aGF0IGlzIHJldHVybmVkIHdpbGwgYmVcbiAgICogICAgIHN1YnNjcmliZWQgdG8gZm9yIHRoZSBsaWZlIG9mIHRoZSBjb21wb25lbnQuXG4gICAqIEByZXR1cm4gQSBmdW5jdGlvbiB0aGF0LCB3aGVuIGNhbGxlZCwgd2lsbCB0cmlnZ2VyIHRoZSBvcmlnaW4gT2JzZXJ2YWJsZS5cbiAgICovXG4gIGVmZmVjdDxcbiAgICAvLyBUaGlzIHR5cGUgcXVpY2tseSBiZWNhbWUgcGFydCBvZiBlZmZlY3QgJ0FQSSdcbiAgICBQcm92aWRlZFR5cGUgPSB2b2lkLFxuICAgIC8vIFRoZSBhY3R1YWwgb3JpZ2luJCB0eXBlLCB3aGljaCBjb3VsZCBiZSB1bmtub3duLCB3aGVuIG5vdCBzcGVjaWZpZWRcbiAgICBPcmlnaW5UeXBlIGV4dGVuZHNcbiAgICAgIHwgT2JzZXJ2YWJsZTxQcm92aWRlZFR5cGU+XG4gICAgICB8IHVua25vd24gPSBPYnNlcnZhYmxlPFByb3ZpZGVkVHlwZT4sXG4gICAgLy8gVW53cmFwcGVkIGFjdHVhbCB0eXBlIG9mIHRoZSBvcmlnaW4kIE9ic2VydmFibGUsIGFmdGVyIGRlZmF1bHQgd2FzIGFwcGxpZWRcbiAgICBPYnNlcnZhYmxlVHlwZSA9IE9yaWdpblR5cGUgZXh0ZW5kcyBPYnNlcnZhYmxlPGluZmVyIEE+ID8gQSA6IG5ldmVyLFxuICAgIC8vIFJldHVybiBlaXRoZXIgYW4gb3B0aW9uYWwgY2FsbGJhY2sgb3IgYSBmdW5jdGlvbiByZXF1aXJpbmcgc3BlY2lmaWMgdHlwZXMgYXMgaW5wdXRzXG4gICAgUmV0dXJuVHlwZSA9IFByb3ZpZGVkVHlwZSB8IE9ic2VydmFibGVUeXBlIGV4dGVuZHMgdm9pZFxuICAgICAgPyAoXG4gICAgICAgICAgb2JzZXJ2YWJsZU9yVmFsdWU/OiBPYnNlcnZhYmxlVHlwZSB8IE9ic2VydmFibGU8T2JzZXJ2YWJsZVR5cGU+XG4gICAgICAgICkgPT4gU3Vic2NyaXB0aW9uXG4gICAgICA6IChcbiAgICAgICAgICBvYnNlcnZhYmxlT3JWYWx1ZTogT2JzZXJ2YWJsZVR5cGUgfCBPYnNlcnZhYmxlPE9ic2VydmFibGVUeXBlPlxuICAgICAgICApID0+IFN1YnNjcmlwdGlvblxuICA+KGdlbmVyYXRvcjogKG9yaWdpbiQ6IE9yaWdpblR5cGUpID0+IE9ic2VydmFibGU8dW5rbm93bj4pOiBSZXR1cm5UeXBlIHtcbiAgICBjb25zdCBvcmlnaW4kID0gbmV3IFN1YmplY3Q8T2JzZXJ2YWJsZVR5cGU+KCk7XG4gICAgZ2VuZXJhdG9yKG9yaWdpbiQgYXMgT3JpZ2luVHlwZSlcbiAgICAgIC8vIHRpZWQgdG8gdGhlIGxpZmVjeWNsZSDwn5GHIG9mIENvbXBvbmVudFN0b3JlXG4gICAgICAucGlwZSh0YWtlVW50aWwodGhpcy5kZXN0cm95JCkpXG4gICAgICAuc3Vic2NyaWJlKCk7XG5cbiAgICByZXR1cm4gKChcbiAgICAgIG9ic2VydmFibGVPclZhbHVlPzogT2JzZXJ2YWJsZVR5cGUgfCBPYnNlcnZhYmxlPE9ic2VydmFibGVUeXBlPlxuICAgICk6IFN1YnNjcmlwdGlvbiA9PiB7XG4gICAgICBjb25zdCBvYnNlcnZhYmxlJCA9IGlzT2JzZXJ2YWJsZShvYnNlcnZhYmxlT3JWYWx1ZSlcbiAgICAgICAgPyBvYnNlcnZhYmxlT3JWYWx1ZVxuICAgICAgICA6IG9mKG9ic2VydmFibGVPclZhbHVlKTtcbiAgICAgIHJldHVybiBvYnNlcnZhYmxlJC5waXBlKHRha2VVbnRpbCh0aGlzLmRlc3Ryb3kkKSkuc3Vic2NyaWJlKCh2YWx1ZSkgPT4ge1xuICAgICAgICAvLyBhbnkgbmV3IPCfkYcgdmFsdWUgaXMgcHVzaGVkIGludG8gYSBzdHJlYW1cbiAgICAgICAgb3JpZ2luJC5uZXh0KHZhbHVlIGFzIE9ic2VydmFibGVUeXBlKTtcbiAgICAgIH0pO1xuICAgIH0pIGFzIHVua25vd24gYXMgUmV0dXJuVHlwZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBVc2VkIHRvIGNoZWNrIGlmIGxpZmVjeWNsZSBob29rcyBhcmUgZGVmaW5lZFxuICAgKiBidXQgbm90IHVzZWQgd2l0aCBwcm92aWRlQ29tcG9uZW50U3RvcmUoKVxuICAgKi9cbiAgcHJpdmF0ZSBjaGVja1Byb3ZpZGVyRm9ySG9va3MoKSB7XG4gICAgYXNhcFNjaGVkdWxlci5zY2hlZHVsZSgoKSA9PiB7XG4gICAgICBpZiAoXG4gICAgICAgIGlzRGV2TW9kZSgpICYmXG4gICAgICAgIChpc09uU3RvcmVJbml0RGVmaW5lZCh0aGlzKSB8fCBpc09uU3RhdGVJbml0RGVmaW5lZCh0aGlzKSkgJiZcbiAgICAgICAgIXRoaXMuybVoYXNQcm92aWRlclxuICAgICAgKSB7XG4gICAgICAgIGNvbnN0IHdhcm5pbmdzID0gW1xuICAgICAgICAgIGlzT25TdG9yZUluaXREZWZpbmVkKHRoaXMpID8gJ09uU3RvcmVJbml0JyA6ICcnLFxuICAgICAgICAgIGlzT25TdGF0ZUluaXREZWZpbmVkKHRoaXMpID8gJ09uU3RhdGVJbml0JyA6ICcnLFxuICAgICAgICBdLmZpbHRlcigoZGVmaW5lZCkgPT4gZGVmaW5lZCk7XG5cbiAgICAgICAgY29uc29sZS53YXJuKFxuICAgICAgICAgIGBAbmdyeC9jb21wb25lbnQtc3RvcmU6ICR7XG4gICAgICAgICAgICB0aGlzLmNvbnN0cnVjdG9yLm5hbWVcbiAgICAgICAgICB9IGhhcyB0aGUgJHt3YXJuaW5ncy5qb2luKCcgYW5kICcpfSBgICtcbiAgICAgICAgICAgICdsaWZlY3ljbGUgaG9vayhzKSBpbXBsZW1lbnRlZCB3aXRob3V0IGJlaW5nIHByb3ZpZGVkIHVzaW5nIHRoZSAnICtcbiAgICAgICAgICAgIGBwcm92aWRlQ29tcG9uZW50U3RvcmUoJHt0aGlzLmNvbnN0cnVjdG9yLm5hbWV9KSBmdW5jdGlvbi4gYCArXG4gICAgICAgICAgICBgVG8gcmVzb2x2ZSB0aGlzLCBwcm92aWRlIHRoZSBjb21wb25lbnQgc3RvcmUgdmlhIHByb3ZpZGVDb21wb25lbnRTdG9yZSgke3RoaXMuY29uc3RydWN0b3IubmFtZX0pYFxuICAgICAgICApO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3NlcnRTdGF0ZUlzSW5pdGlhbGl6ZWQoKTogdm9pZCB7XG4gICAgaWYgKCF0aGlzLmlzSW5pdGlhbGl6ZWQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgYCR7dGhpcy5jb25zdHJ1Y3Rvci5uYW1lfSBoYXMgbm90IGJlZW4gaW5pdGlhbGl6ZWQgeWV0LiBgICtcbiAgICAgICAgICBgUGxlYXNlIG1ha2Ugc3VyZSBpdCBpcyBpbml0aWFsaXplZCBiZWZvcmUgdXBkYXRpbmcvZ2V0dGluZy5gXG4gICAgICApO1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBwcm9jZXNzU2VsZWN0b3JBcmdzPFxuICBTZWxlY3RvcnMgZXh0ZW5kcyBBcnJheTxcbiAgICBPYnNlcnZhYmxlPHVua25vd24+IHwgU2VsZWN0Q29uZmlnPFJlc3VsdD4gfCBQcm9qZWN0b3JGbiB8IFNlbGVjdG9yc09iamVjdFxuICA+LFxuICBSZXN1bHQsXG4gIFByb2plY3RvckZuIGV4dGVuZHMgKC4uLmE6IHVua25vd25bXSkgPT4gUmVzdWx0LFxuICBTZWxlY3RvcnNPYmplY3QgZXh0ZW5kcyBSZWNvcmQ8c3RyaW5nLCBPYnNlcnZhYmxlPHVua25vd24+PlxuPihcbiAgYXJnczogU2VsZWN0b3JzXG4pOlxuICB8IHtcbiAgICAgIG9ic2VydmFibGVzT3JTZWxlY3RvcnNPYmplY3Q6IE9ic2VydmFibGU8dW5rbm93bj5bXTtcbiAgICAgIHByb2plY3RvcjogUHJvamVjdG9yRm47XG4gICAgICBjb25maWc6IFJlcXVpcmVkPFNlbGVjdENvbmZpZzxSZXN1bHQ+PjtcbiAgICB9XG4gIHwge1xuICAgICAgb2JzZXJ2YWJsZXNPclNlbGVjdG9yc09iamVjdDogU2VsZWN0b3JzT2JqZWN0O1xuICAgICAgcHJvamVjdG9yOiB1bmRlZmluZWQ7XG4gICAgICBjb25maWc6IFJlcXVpcmVkPFNlbGVjdENvbmZpZzxSZXN1bHQ+PjtcbiAgICB9IHtcbiAgY29uc3Qgc2VsZWN0b3JBcmdzID0gQXJyYXkuZnJvbShhcmdzKTtcbiAgY29uc3QgZGVmYXVsdEVxdWFsaXR5Rm46IFZhbHVlRXF1YWxpdHlGbjxSZXN1bHQ+ID0gKHByZXZpb3VzLCBjdXJyZW50KSA9PlxuICAgIHByZXZpb3VzID09PSBjdXJyZW50O1xuXG4gIC8vIEFzc2lnbiBkZWZhdWx0IHZhbHVlcy5cbiAgbGV0IGNvbmZpZzogUmVxdWlyZWQ8U2VsZWN0Q29uZmlnPFJlc3VsdD4+ID0ge1xuICAgIGRlYm91bmNlOiBmYWxzZSxcbiAgICBlcXVhbDogZGVmYXVsdEVxdWFsaXR5Rm4sXG4gIH07XG5cbiAgLy8gTGFzdCBhcmd1bWVudCBpcyBlaXRoZXIgY29uZmlnIG9yIHByb2plY3RvciBvciBzZWxlY3RvcnNPYmplY3RcbiAgaWYgKGlzU2VsZWN0Q29uZmlnKHNlbGVjdG9yQXJnc1tzZWxlY3RvckFyZ3MubGVuZ3RoIC0gMV0pKSB7XG4gICAgY29uZmlnID0geyAuLi5jb25maWcsIC4uLnNlbGVjdG9yQXJncy5wb3AoKSB9O1xuICB9XG5cbiAgLy8gQXQgdGhpcyBwb2ludCBzZWxlY3RvckFyZ3MgaXMgZWl0aGVyIHByb2plY3Rvciwgc2VsZWN0b3JzIHdpdGggcHJvamVjdG9yIG9yIHNlbGVjdG9yc09iamVjdFxuICBpZiAoc2VsZWN0b3JBcmdzLmxlbmd0aCA9PT0gMSAmJiB0eXBlb2Ygc2VsZWN0b3JBcmdzWzBdICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgLy8gdGhpcyBpcyBhIHNlbGVjdG9yc09iamVjdFxuICAgIHJldHVybiB7XG4gICAgICBvYnNlcnZhYmxlc09yU2VsZWN0b3JzT2JqZWN0OiBzZWxlY3RvckFyZ3NbMF0gYXMgU2VsZWN0b3JzT2JqZWN0LFxuICAgICAgcHJvamVjdG9yOiB1bmRlZmluZWQsXG4gICAgICBjb25maWcsXG4gICAgfTtcbiAgfVxuXG4gIGNvbnN0IHByb2plY3RvciA9IHNlbGVjdG9yQXJncy5wb3AoKSBhcyBQcm9qZWN0b3JGbjtcblxuICAvLyBUaGUgT2JzZXJ2YWJsZXMgdG8gY29tYmluZSwgaWYgdGhlcmUgYXJlIGFueSBsZWZ0LlxuICBjb25zdCBvYnNlcnZhYmxlcyA9IHNlbGVjdG9yQXJncyBhcyBPYnNlcnZhYmxlPHVua25vd24+W107XG4gIHJldHVybiB7XG4gICAgb2JzZXJ2YWJsZXNPclNlbGVjdG9yc09iamVjdDogb2JzZXJ2YWJsZXMsXG4gICAgcHJvamVjdG9yLFxuICAgIGNvbmZpZyxcbiAgfTtcbn1cblxuZnVuY3Rpb24gaXNTZWxlY3RDb25maWcoXG4gIGFyZzogU2VsZWN0Q29uZmlnPHVua25vd24+IHwgdW5rbm93blxuKTogYXJnIGlzIFNlbGVjdENvbmZpZzx1bmtub3duPiB7XG4gIGNvbnN0IHR5cGVkQXJnID0gYXJnIGFzIFNlbGVjdENvbmZpZzx1bmtub3duPjtcbiAgcmV0dXJuIChcbiAgICB0eXBlb2YgdHlwZWRBcmcuZGVib3VuY2UgIT09ICd1bmRlZmluZWQnIHx8XG4gICAgdHlwZW9mIHR5cGVkQXJnLmVxdWFsICE9PSAndW5kZWZpbmVkJ1xuICApO1xufVxuXG5mdW5jdGlvbiBoYXNQcm9qZWN0Rm5Pbmx5KFxuICBvYnNlcnZhYmxlc09yU2VsZWN0b3JzT2JqZWN0OiB1bmtub3duW10gfCBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPixcbiAgcHJvamVjdG9yOiB1bmtub3duXG4pIHtcbiAgcmV0dXJuIChcbiAgICBBcnJheS5pc0FycmF5KG9ic2VydmFibGVzT3JTZWxlY3RvcnNPYmplY3QpICYmXG4gICAgb2JzZXJ2YWJsZXNPclNlbGVjdG9yc09iamVjdC5sZW5ndGggPT09IDAgJiZcbiAgICBwcm9qZWN0b3JcbiAgKTtcbn1cblxuZnVuY3Rpb24gbm9vcE9wZXJhdG9yKCk6IDxUPihzb3VyY2UkOiBPYnNlcnZhYmxlPFQ+KSA9PiB0eXBlb2Ygc291cmNlJCB7XG4gIHJldHVybiAoc291cmNlJCkgPT4gc291cmNlJDtcbn1cbiJdfQ==