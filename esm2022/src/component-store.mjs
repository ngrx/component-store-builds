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
            : noopOperator()), distinctUntilChanged(), shareReplay({
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
    // Assign default values.
    let config = { debounce: false };
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
    return typeof arg.debounce !== 'undefined';
}
function hasProjectFnOnly(observablesOrSelectorsObject, projector) {
    return (Array.isArray(observablesOrSelectorsObject) &&
        observablesOrSelectorsObject.length === 0 &&
        projector);
}
function noopOperator() {
    return (source$) => source$;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcG9uZW50LXN0b3JlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vbW9kdWxlcy9jb21wb25lbnQtc3RvcmUvc3JjL2NvbXBvbmVudC1zdG9yZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQ0wsWUFBWSxFQUVaLEVBQUUsRUFDRixhQUFhLEVBRWIsVUFBVSxFQUNWLGFBQWEsRUFDYixPQUFPLEVBQ1AsY0FBYyxFQUNkLFNBQVMsRUFDVCxhQUFhLEVBQ2IsS0FBSyxHQUVOLE1BQU0sTUFBTSxDQUFDO0FBQ2QsT0FBTyxFQUNMLFNBQVMsRUFDVCxjQUFjLEVBQ2QsR0FBRyxFQUNILG9CQUFvQixFQUNwQixXQUFXLEVBQ1gsSUFBSSxFQUNKLEdBQUcsRUFDSCxVQUFVLEVBQ1YsU0FBUyxHQUNWLE1BQU0sZ0JBQWdCLENBQUM7QUFDeEIsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBQy9DLE9BQU8sRUFDTCxVQUFVLEVBRVYsUUFBUSxFQUNSLGNBQWMsRUFDZCxNQUFNLEVBQ04sU0FBUyxFQUVULFFBQVEsR0FHVCxNQUFNLGVBQWUsQ0FBQztBQUN2QixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQztBQUMvRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sNEJBQTRCLENBQUM7O0FBTXRELE1BQU0sQ0FBQyxNQUFNLG1CQUFtQixHQUFHLElBQUksY0FBYyxDQUNuRCxxQ0FBcUMsQ0FDdEMsQ0FBQztBQTJCRixNQUNhLGNBQWM7SUFnQnpCLFlBQXFELFlBQWdCO1FBZnJFLHNDQUFzQztRQUNyQixvQkFBZSxHQUFHLElBQUksYUFBYSxDQUFPLENBQUMsQ0FBQyxDQUFDO1FBQzlELDhEQUE4RDtRQUNyRCxhQUFRLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxZQUFZLEVBQUUsQ0FBQztRQUV2QyxrQkFBYSxHQUFHLElBQUksYUFBYSxD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U0FBUyxjQUFjLENBQUMsR0FBMkI7SUFDakQsT0FBTyxPQUFRLEdBQW9CLENBQUMsUUFBUSxLQUFLLFdBQVcsQ0FBQztBQUMvRCxDQUFDO0FBRUQsU0FBUyxnQkFBZ0IsQ0FDdkIsNEJBQWlFLEVBQ2pFLFNBQWtCO0lBRWxCLE9BQU8sQ0FDTCxLQUFLLENBQUMsT0FBTyxDQUFDLDRCQUE0QixDQUFDO1FBQzNDLDRCQUE0QixDQUFDLE1BQU0sS0FBSyxDQUFDO1FBQ3pDLFNBQVMsQ0FDVixDQUFDO0FBQ0osQ0FBQztBQUVELFNBQVMsWUFBWTtJQUNuQixPQUFPLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxPQUFPLENBQUM7QUFDOUIsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7XG4gIGlzT2JzZXJ2YWJsZSxcbiAgT2JzZXJ2YWJsZSxcbiAgb2YsXG4gIFJlcGxheVN1YmplY3QsXG4gIFN1YnNjcmlwdGlvbixcbiAgdGhyb3dFcnJvcixcbiAgY29tYmluZUxhdGVzdCxcbiAgU3ViamVjdCxcbiAgcXVldWVTY2hlZHVsZXIsXG4gIHNjaGVkdWxlZCxcbiAgYXNhcFNjaGVkdWxlcixcbiAgRU1QVFksXG4gIE9ic2VydmVkVmFsdWVPZixcbn0gZnJvbSAncnhqcyc7XG5pbXBvcnQge1xuICB0YWtlVW50aWwsXG4gIHdpdGhMYXRlc3RGcm9tLFxuICBtYXAsXG4gIGRpc3RpbmN0VW50aWxDaGFuZ2VkLFxuICBzaGFyZVJlcGxheSxcbiAgdGFrZSxcbiAgdGFwLFxuICBjYXRjaEVycm9yLFxuICBvYnNlcnZlT24sXG59IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCB7IGRlYm91bmNlU3luYyB9IGZyb20gJy4vZGVib3VuY2Utc3luYyc7XG5pbXBvcnQge1xuICBJbmplY3RhYmxlLFxuICBPbkRlc3Ryb3ksXG4gIE9wdGlvbmFsLFxuICBJbmplY3Rpb25Ub2tlbixcbiAgSW5qZWN0LFxuICBpc0Rldk1vZGUsXG4gIFNpZ25hbCxcbiAgY29tcHV0ZWQsXG4gIHR5cGUgVmFsdWVFcXVhbGl0eUZuLFxuICB0eXBlIENyZWF0ZUNvbXB1dGVkT3B0aW9ucyxcbn0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQgeyBpc09uU3RhdGVJbml0RGVmaW5lZCwgaXNPblN0b3JlSW5pdERlZmluZWQgfSBmcm9tICcuL2xpZmVjeWNsZV9ob29rcyc7XG5pbXBvcnQgeyB0b1NpZ25hbCB9IGZyb20gJ0Bhbmd1bGFyL2NvcmUvcnhqcy1pbnRlcm9wJztcblxuZXhwb3J0IGludGVyZmFjZSBTZWxlY3RDb25maWcge1xuICBkZWJvdW5jZT86IGJvb2xlYW47XG59XG5cbmV4cG9ydCBjb25zdCBJTklUSUFMX1NUQVRFX1RPS0VOID0gbmV3IEluamVjdGlvblRva2VuKFxuICAnQG5ncngvY29tcG9uZW50LXN0b3JlIEluaXRpYWwgU3RhdGUnXG4pO1xuXG5leHBvcnQgdHlwZSBTZWxlY3RvclJlc3VsdHM8U2VsZWN0b3JzIGV4dGVuZHMgT2JzZXJ2YWJsZTx1bmtub3duPltdPiA9IHtcbiAgW0tleSBpbiBrZXlvZiBTZWxlY3RvcnNdOiBTZWxlY3RvcnNbS2V5XSBleHRlbmRzIE9ic2VydmFibGU8aW5mZXIgVT5cbiAgICA/IFVcbiAgICA6IG5ldmVyO1xufTtcblxuZXhwb3J0IHR5cGUgUHJvamVjdG9yPFNlbGVjdG9ycyBleHRlbmRzIE9ic2VydmFibGU8dW5rbm93bj5bXSwgUmVzdWx0PiA9IChcbiAgLi4uYXJnczogU2VsZWN0b3JSZXN1bHRzPFNlbGVjdG9ycz5cbikgPT4gUmVzdWx0O1xuXG50eXBlIFNpZ25hbHNQcm9qZWN0b3I8U2lnbmFscyBleHRlbmRzIFNpZ25hbDx1bmtub3duPltdLCBSZXN1bHQ+ID0gKFxuICAuLi52YWx1ZXM6IHtcbiAgICBbS2V5IGluIGtleW9mIFNpZ25hbHNdOiBTaWduYWxzW0tleV0gZXh0ZW5kcyBTaWduYWw8aW5mZXIgVmFsdWU+XG4gICAgICA/IFZhbHVlXG4gICAgICA6IG5ldmVyO1xuICB9XG4pID0+IFJlc3VsdDtcblxuaW50ZXJmYWNlIFNlbGVjdFNpZ25hbE9wdGlvbnM8VD4ge1xuICAvKipcbiAgICogQSBjb21wYXJpc29uIGZ1bmN0aW9uIHdoaWNoIGRlZmluZXMgZXF1YWxpdHkgZm9yIHNlbGVjdCByZXN1bHRzLlxuICAgKi9cbiAgZXF1YWw/OiBWYWx1ZUVxdWFsaXR5Rm48VD47XG59XG5cbkBJbmplY3RhYmxlKClcbmV4cG9ydCBjbGFzcyBDb21wb25lbnRTdG9yZTxUIGV4dGVuZHMgb2JqZWN0PiBpbXBsZW1lbnRzIE9uRGVzdHJveSB7XG4gIC8vIFNob3VsZCBiZSB1c2VkIG9ubHkgaW4gbmdPbkRlc3Ryb3kuXG4gIHByaXZhdGUgcmVhZG9ubHkgZGVzdHJveVN1YmplY3QkID0gbmV3IFJlcGxheVN1YmplY3Q8dm9pZD4oMSk7XG4gIC8vIEV4cG9zZWQgdG8gYW55IGV4dGVuZGluZyBTdG9yZSB0byBiZSB1c2VkIGZvciB0aGUgdGVhcmRvd24uXG4gIHJlYWRvbmx5IGRlc3Ryb3kkID0gdGhpcy5kZXN0cm95U3ViamVjdCQuYXNPYnNlcnZhYmxlKCk7XG5cbiAgcHJpdmF0ZSByZWFkb25seSBzdGF0ZVN1YmplY3QkID0gbmV3IFJlcGxheVN1YmplY3Q8VD4oMSk7XG4gIHByaXZhdGUgaXNJbml0aWFsaXplZCA9IGZhbHNlO1xuICAvLyBOZWVkcyB0byBiZSBhZnRlciBkZXN0cm95JCBpcyBkZWNsYXJlZCBiZWNhdXNlIGl0J3MgdXNlZCBpbiBzZWxlY3QuXG4gIHJlYWRvbmx5IHN0YXRlJDogT2JzZXJ2YWJsZTxUPiA9IHRoaXMuc2VsZWN0KChzKSA9PiBzKTtcbiAgcmVhZG9ubHkgc3RhdGU6IFNpZ25hbDxUPiA9IHRvU2lnbmFsKFxuICAgIHRoaXMuc3RhdGVTdWJqZWN0JC5waXBlKHRha2VVbnRpbCh0aGlzLmRlc3Ryb3kkKSksXG4gICAgeyByZXF1aXJlU3luYzogZmFsc2UsIG1hbnVhbENsZWFudXA6IHRydWUgfVxuICApIGFzIFNpZ25hbDxUPjtcbiAgcHJpdmF0ZSDJtWhhc1Byb3ZpZGVyID0gZmFsc2U7XG5cbiAgY29uc3RydWN0b3IoQE9wdGlvbmFsKCkgQEluamVjdChJTklUSUFMX1NUQVRFX1RPS0VOKSBkZWZhdWx0U3RhdGU/OiBUKSB7XG4gICAgLy8gU3RhdGUgY2FuIGJlIGluaXRpYWxpemVkIGVpdGhlciB0aHJvdWdoIGNvbnN0cnVjdG9yIG9yIHNldFN0YXRlLlxuICAgIGlmIChkZWZhdWx0U3RhdGUpIHtcbiAgICAgIHRoaXMuaW5pdFN0YXRlKGRlZmF1bHRTdGF0ZSk7XG4gICAgfVxuXG4gICAgdGhpcy5jaGVja1Byb3ZpZGVyRm9ySG9va3MoKTtcbiAgfVxuXG4gIC8qKiBDb21wbGV0ZXMgYWxsIHJlbGV2YW50IE9ic2VydmFibGUgc3RyZWFtcy4gKi9cbiAgbmdPbkRlc3Ryb3koKSB7XG4gICAgdGhpcy5zdGF0ZVN1YmplY3QkLmNvbXBsZXRlKCk7XG4gICAgdGhpcy5kZXN0cm95U3ViamVjdCQubmV4dCgpO1xuICB9XG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgYW4gdXBkYXRlci5cbiAgICpcbiAgICogVGhyb3dzIGFuIGVycm9yIGlmIHVwZGF0ZXIgaXMgY2FsbGVkIHdpdGggc3luY2hyb25vdXMgdmFsdWVzIChlaXRoZXJcbiAgICogaW1wZXJhdGl2ZSB2YWx1ZSBvciBPYnNlcnZhYmxlIHRoYXQgaXMgc3luY2hyb25vdXMpIGJlZm9yZSBDb21wb25lbnRTdG9yZVxuICAgKiBpcyBpbml0aWFsaXplZC4gSWYgY2FsbGVkIHdpdGggYXN5bmMgT2JzZXJ2YWJsZSBiZWZvcmUgaW5pdGlhbGl6YXRpb24gdGhlblxuICAgKiBzdGF0ZSB3aWxsIG5vdCBiZSB1cGRhdGVkIGFuZCBzdWJzY3JpcHRpb24gd291bGQgYmUgY2xvc2VkLlxuICAgKlxuICAgKiBAcGFyYW0gdXBkYXRlckZuIEEgc3RhdGljIHVwZGF0ZXIgZnVuY3Rpb24gdGhhdCB0YWtlcyAyIHBhcmFtZXRlcnMgKHRoZVxuICAgKiBjdXJyZW50IHN0YXRlIGFuZCBhbiBhcmd1bWVudCBvYmplY3QpIGFuZCByZXR1cm5zIGEgbmV3IGluc3RhbmNlIG9mIHRoZVxuICAgKiBzdGF0ZS5cbiAgICogQHJldHVybiBBIGZ1bmN0aW9uIHRoYXQgYWNjZXB0cyBvbmUgYXJndW1lbnQgd2hpY2ggaXMgZm9yd2FyZGVkIGFzIHRoZVxuICAgKiAgICAgc2Vjb25kIGFyZ3VtZW50IHRvIGB1cGRhdGVyRm5gLiBFdmVyeSB0aW1lIHRoaXMgZnVuY3Rpb24gaXMgY2FsbGVkXG4gICAqICAgICBzdWJzY3JpYmVycyB3aWxsIGJlIG5vdGlmaWVkIG9mIHRoZSBzdGF0ZSBjaGFuZ2UuXG4gICAqL1xuICB1cGRhdGVyPFxuICAgIC8vIEFsbG93IHRvIGZvcmNlLXByb3ZpZGUgdGhlIHR5cGVcbiAgICBQcm92aWRlZFR5cGUgPSB2b2lkLFxuICAgIC8vIFRoaXMgdHlwZSBpcyBkZXJpdmVkIGZyb20gdGhlIGB2YWx1ZWAgcHJvcGVydHksIGRlZmF1bHRpbmcgdG8gdm9pZCBpZiBpdCdzIG1pc3NpbmdcbiAgICBPcmlnaW5UeXBlID0gUHJvdmlkZWRUeXBlLFxuICAgIC8vIFRoZSBWYWx1ZSB0eXBlIGlzIGFzc2lnbmVkIGZyb20gdGhlIE9yaWdpblxuICAgIFZhbHVlVHlwZSA9IE9yaWdpblR5cGUsXG4gICAgLy8gUmV0dXJuIGVpdGhlciBhbiBlbXB0eSBjYWxsYmFjayBvciBhIGZ1bmN0aW9uIHJlcXVpcmluZyBzcGVjaWZpYyB0eXBlcyBhcyBpbnB1dHNcbiAgICBSZXR1cm5UeXBlID0gT3JpZ2luVHlwZSBleHRlbmRzIHZvaWRcbiAgICAgID8gKCkgPT4gdm9pZFxuICAgICAgOiAob2JzZXJ2YWJsZU9yVmFsdWU6IFZhbHVlVHlwZSB8IE9ic2VydmFibGU8VmFsdWVUeXBlPikgPT4gU3Vic2NyaXB0aW9uXG4gID4odXBkYXRlckZuOiAoc3RhdGU6IFQsIHZhbHVlOiBPcmlnaW5UeXBlKSA9PiBUKTogUmV0dXJuVHlwZSB7XG4gICAgcmV0dXJuICgoXG4gICAgICBvYnNlcnZhYmxlT3JWYWx1ZT86IE9yaWdpblR5cGUgfCBPYnNlcnZhYmxlPE9yaWdpblR5cGU+XG4gICAgKTogU3Vic2NyaXB0aW9uID0+IHtcbiAgICAgIC8vIFdlIG5lZWQgdG8gZXhwbGljaXRseSB0aHJvdyBhbiBlcnJvciBpZiBhIHN5bmNocm9ub3VzIGVycm9yIG9jY3Vycy5cbiAgICAgIC8vIFRoaXMgaXMgbmVjZXNzYXJ5IHRvIG1ha2Ugc3luY2hyb25vdXMgZXJyb3JzIGNhdGNoYWJsZS5cbiAgICAgIGxldCBpc1N5bmNVcGRhdGUgPSB0cnVlO1xuICAgICAgbGV0IHN5bmNFcnJvcjogdW5rbm93bjtcbiAgICAgIC8vIFdlIGNhbiByZWNlaXZlIGVpdGhlciB0aGUgdmFsdWUgb3IgYW4gb2JzZXJ2YWJsZS4gSW4gY2FzZSBpdCdzIGFcbiAgICAgIC8vIHNpbXBsZSB2YWx1ZSwgd2UnbGwgd3JhcCBpdCB3aXRoIGBvZmAgb3BlcmF0b3IgdG8gdHVybiBpdCBpbnRvXG4gICAgICAvLyBPYnNlcnZhYmxlLlxuICAgICAgY29uc3Qgb2JzZXJ2YWJsZSQgPSBpc09ic2VydmFibGUob2JzZXJ2YWJsZU9yVmFsdWUpXG4gICAgICAgID8gb2JzZXJ2YWJsZU9yVmFsdWVcbiAgICAgICAgOiBvZihvYnNlcnZhYmxlT3JWYWx1ZSk7XG4gICAgICBjb25zdCBzdWJzY3JpcHRpb24gPSBvYnNlcnZhYmxlJFxuICAgICAgICAucGlwZShcbiAgICAgICAgICAvLyBQdXNoIHRoZSB2YWx1ZSBpbnRvIHF1ZXVlU2NoZWR1bGVyXG4gICAgICAgICAgb2JzZXJ2ZU9uKHF1ZXVlU2NoZWR1bGVyKSxcbiAgICAgICAgICAvLyBJZiB0aGUgc3RhdGUgaXMgbm90IGluaXRpYWxpemVkIHlldCwgd2UnbGwgdGhyb3cgYW4gZXJyb3IuXG4gICAgICAgICAgdGFwKCgpID0+IHRoaXMuYXNzZXJ0U3RhdGVJc0luaXRpYWxpemVkKCkpLFxuICAgICAgICAgIHdpdGhMYXRlc3RGcm9tKHRoaXMuc3RhdGVTdWJqZWN0JCksXG4gICAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1ub24tbnVsbC1hc3NlcnRpb25cbiAgICAgICAgICBtYXAoKFt2YWx1ZSwgY3VycmVudFN0YXRlXSkgPT4gdXBkYXRlckZuKGN1cnJlbnRTdGF0ZSwgdmFsdWUhKSksXG4gICAgICAgICAgdGFwKChuZXdTdGF0ZSkgPT4gdGhpcy5zdGF0ZVN1YmplY3QkLm5leHQobmV3U3RhdGUpKSxcbiAgICAgICAgICBjYXRjaEVycm9yKChlcnJvcjogdW5rbm93bikgPT4ge1xuICAgICAgICAgICAgaWYgKGlzU3luY1VwZGF0ZSkge1xuICAgICAgICAgICAgICBzeW5jRXJyb3IgPSBlcnJvcjtcbiAgICAgICAgICAgICAgcmV0dXJuIEVNUFRZO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gdGhyb3dFcnJvcihlcnJvcik7XG4gICAgICAgICAgfSksXG4gICAgICAgICAgdGFrZVVudGlsKHRoaXMuZGVzdHJveSQpXG4gICAgICAgIClcbiAgICAgICAgLnN1YnNjcmliZSgpO1xuXG4gICAgICBpZiAoc3luY0Vycm9yKSB7XG4gICAgICAgIHRocm93IHN5bmNFcnJvcjtcbiAgICAgIH1cbiAgICAgIGlzU3luY1VwZGF0ZSA9IGZhbHNlO1xuXG4gICAgICByZXR1cm4gc3Vic2NyaXB0aW9uO1xuICAgIH0pIGFzIHVua25vd24gYXMgUmV0dXJuVHlwZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplcyBzdGF0ZS4gSWYgaXQgd2FzIGFscmVhZHkgaW5pdGlhbGl6ZWQgdGhlbiBpdCByZXNldHMgdGhlXG4gICAqIHN0YXRlLlxuICAgKi9cbiAgcHJpdmF0ZSBpbml0U3RhdGUoc3RhdGU6IFQpOiB2b2lkIHtcbiAgICBzY2hlZHVsZWQoW3N0YXRlXSwgcXVldWVTY2hlZHVsZXIpLnN1YnNjcmliZSgocykgPT4ge1xuICAgICAgdGhpcy5pc0luaXRpYWxpemVkID0gdHJ1ZTtcbiAgICAgIHRoaXMuc3RhdGVTdWJqZWN0JC5uZXh0KHMpO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIFNldHMgdGhlIHN0YXRlIHNwZWNpZmljIHZhbHVlLlxuICAgKiBAcGFyYW0gc3RhdGVPclVwZGF0ZXJGbiBvYmplY3Qgb2YgdGhlIHNhbWUgdHlwZSBhcyB0aGUgc3RhdGUgb3IgYW5cbiAgICogdXBkYXRlckZuLCByZXR1cm5pbmcgc3VjaCBvYmplY3QuXG4gICAqL1xuICBzZXRTdGF0ZShzdGF0ZU9yVXBkYXRlckZuOiBUIHwgKChzdGF0ZTogVCkgPT4gVCkpOiB2b2lkIHtcbiAgICBpZiAodHlwZW9mIHN0YXRlT3JVcGRhdGVyRm4gIT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHRoaXMuaW5pdFN0YXRlKHN0YXRlT3JVcGRhdGVyRm4pO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnVwZGF0ZXIoc3RhdGVPclVwZGF0ZXJGbiBhcyAoc3RhdGU6IFQpID0+IFQpKCk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFBhdGNoZXMgdGhlIHN0YXRlIHdpdGggcHJvdmlkZWQgcGFydGlhbCBzdGF0ZS5cbiAgICpcbiAgICogQHBhcmFtIHBhcnRpYWxTdGF0ZU9yVXBkYXRlckZuIGEgcGFydGlhbCBzdGF0ZSBvciBhIHBhcnRpYWwgdXBkYXRlclxuICAgKiBmdW5jdGlvbiB0aGF0IGFjY2VwdHMgdGhlIHN0YXRlIGFuZCByZXR1cm5zIHRoZSBwYXJ0aWFsIHN0YXRlLlxuICAgKiBAdGhyb3dzIEVycm9yIGlmIHRoZSBzdGF0ZSBpcyBub3QgaW5pdGlhbGl6ZWQuXG4gICAqL1xuICBwYXRjaFN0YXRlKFxuICAgIHBhcnRpYWxTdGF0ZU9yVXBkYXRlckZuOlxuICAgICAgfCBQYXJ0aWFsPFQ+XG4gICAgICB8IE9ic2VydmFibGU8UGFydGlhbDxUPj5cbiAgICAgIHwgKChzdGF0ZTogVCkgPT4gUGFydGlhbDxUPilcbiAgKTogdm9pZCB7XG4gICAgY29uc3QgcGF0Y2hlZFN0YXRlID1cbiAgICAgIHR5cGVvZiBwYXJ0aWFsU3RhdGVPclVwZGF0ZXJGbiA9PT0gJ2Z1bmN0aW9uJ1xuICAgICAgICA/IHBhcnRpYWxTdGF0ZU9yVXBkYXRlckZuKHRoaXMuZ2V0KCkpXG4gICAgICAgIDogcGFydGlhbFN0YXRlT3JVcGRhdGVyRm47XG5cbiAgICB0aGlzLnVwZGF0ZXIoKHN0YXRlLCBwYXJ0aWFsU3RhdGU6IFBhcnRpYWw8VD4pID0+ICh7XG4gICAgICAuLi5zdGF0ZSxcbiAgICAgIC4uLnBhcnRpYWxTdGF0ZSxcbiAgICB9KSkocGF0Y2hlZFN0YXRlKTtcbiAgfVxuXG4gIHByb3RlY3RlZCBnZXQoKTogVDtcbiAgcHJvdGVjdGVkIGdldDxSPihwcm9qZWN0b3I6IChzOiBUKSA9PiBSKTogUjtcbiAgcHJvdGVjdGVkIGdldDxSPihwcm9qZWN0b3I/OiAoczogVCkgPT4gUik6IFIgfCBUIHtcbiAgICB0aGlzLmFzc2VydFN0YXRlSXNJbml0aWFsaXplZCgpO1xuICAgIGxldCB2YWx1ZTogUiB8IFQ7XG5cbiAgICB0aGlzLnN0YXRlU3ViamVjdCQucGlwZSh0YWtlKDEpKS5zdWJzY3JpYmUoKHN0YXRlKSA9PiB7XG4gICAgICB2YWx1ZSA9IHByb2plY3RvciA/IHByb2plY3RvcihzdGF0ZSkgOiBzdGF0ZTtcbiAgICB9KTtcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLW5vbi1udWxsLWFzc2VydGlvblxuICAgIHJldHVybiB2YWx1ZSE7XG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlcyBhIHNlbGVjdG9yLlxuICAgKlxuICAgKiBAcGFyYW0gcHJvamVjdG9yIEEgcHVyZSBwcm9qZWN0aW9uIGZ1bmN0aW9uIHRoYXQgdGFrZXMgdGhlIGN1cnJlbnQgc3RhdGUgYW5kXG4gICAqICAgcmV0dXJucyBzb21lIG5ldyBzbGljZS9wcm9qZWN0aW9uIG9mIHRoYXQgc3RhdGUuXG4gICAqIEBwYXJhbSBjb25maWcgU2VsZWN0Q29uZmlnIHRoYXQgY2hhbmdlcyB0aGUgYmVoYXZpb3Igb2Ygc2VsZWN0b3IsIGluY2x1ZGluZ1xuICAgKiAgIHRoZSBkZWJvdW5jaW5nIG9mIHRoZSB2YWx1ZXMgdW50aWwgdGhlIHN0YXRlIGlzIHNldHRsZWQuXG4gICAqIEByZXR1cm4gQW4gb2JzZXJ2YWJsZSBvZiB0aGUgcHJvamVjdG9yIHJlc3VsdHMuXG4gICAqL1xuICBzZWxlY3Q8UmVzdWx0PihcbiAgICBwcm9qZWN0b3I6IChzOiBUKSA9PiBSZXN1bHQsXG4gICAgY29uZmlnPzogU2VsZWN0Q29uZmlnXG4gICk6IE9ic2VydmFibGU8UmVzdWx0PjtcbiAgc2VsZWN0PFNlbGVjdG9yc09iamVjdCBleHRlbmRzIFJlY29yZDxzdHJpbmcsIE9ic2VydmFibGU8dW5rbm93bj4+PihcbiAgICBzZWxlY3RvcnNPYmplY3Q6IFNlbGVjdG9yc09iamVjdCxcbiAgICBjb25maWc/OiBTZWxlY3RDb25maWdcbiAgKTogT2JzZXJ2YWJsZTx7XG4gICAgW0sgaW4ga2V5b2YgU2VsZWN0b3JzT2JqZWN0XTogT2JzZXJ2ZWRWYWx1ZU9mPFNlbGVjdG9yc09iamVjdFtLXT47XG4gIH0+O1xuICBzZWxlY3Q8U2VsZWN0b3JzIGV4dGVuZHMgT2JzZXJ2YWJsZTx1bmtub3duPltdLCBSZXN1bHQ+KFxuICAgIC4uLnNlbGVjdG9yc1dpdGhQcm9qZWN0b3I6IFtcbiAgICAgIC4uLnNlbGVjdG9yczogU2VsZWN0b3JzLFxuICAgICAgcHJvamVjdG9yOiBQcm9qZWN0b3I8U2VsZWN0b3JzLCBSZXN1bHQ+XG4gICAgXVxuICApOiBPYnNlcnZhYmxlPFJlc3VsdD47XG4gIHNlbGVjdDxTZWxlY3RvcnMgZXh0ZW5kcyBPYnNlcnZhYmxlPHVua25vd24+W10sIFJlc3VsdD4oXG4gICAgLi4uc2VsZWN0b3JzV2l0aFByb2plY3RvckFuZENvbmZpZzogW1xuICAgICAgLi4uc2VsZWN0b3JzOiBTZWxlY3RvcnMsXG4gICAgICBwcm9qZWN0b3I6IFByb2plY3RvcjxTZWxlY3RvcnMsIFJlc3VsdD4sXG4gICAgICBjb25maWc6IFNlbGVjdENvbmZpZ1xuICAgIF1cbiAgKTogT2JzZXJ2YWJsZTxSZXN1bHQ+O1xuICBzZWxlY3Q8XG4gICAgU2VsZWN0b3JzIGV4dGVuZHMgQXJyYXk8XG4gICAgICBPYnNlcnZhYmxlPHVua25vd24+IHwgU2VsZWN0Q29uZmlnIHwgUHJvamVjdG9yRm4gfCBTZWxlY3RvcnNPYmplY3RcbiAgICA+LFxuICAgIFJlc3VsdCxcbiAgICBQcm9qZWN0b3JGbiBleHRlbmRzICguLi5hOiB1bmtub3duW10pID0+IFJlc3VsdCxcbiAgICBTZWxlY3RvcnNPYmplY3QgZXh0ZW5kcyBSZWNvcmQ8c3RyaW5nLCBPYnNlcnZhYmxlPHVua25vd24+PlxuICA+KC4uLmFyZ3M6IFNlbGVjdG9ycyk6IE9ic2VydmFibGU8UmVzdWx0PiB7XG4gICAgY29uc3QgeyBvYnNlcnZhYmxlc09yU2VsZWN0b3JzT2JqZWN0LCBwcm9qZWN0b3IsIGNvbmZpZyB9ID1cbiAgICAgIHByb2Nlc3NTZWxlY3RvckFyZ3M8U2VsZWN0b3JzLCBSZXN1bHQsIFByb2plY3RvckZuLCBTZWxlY3RvcnNPYmplY3Q+KFxuICAgICAgICBhcmdzXG4gICAgICApO1xuXG4gICAgY29uc3Qgc291cmNlJCA9IGhhc1Byb2plY3RGbk9ubHkob2JzZXJ2YWJsZXNPclNlbGVjdG9yc09iamVjdCwgcHJvamVjdG9yKVxuICAgICAgPyB0aGlzLnN0YXRlU3ViamVjdCRcbiAgICAgIDogY29tYmluZUxhdGVzdChvYnNlcnZhYmxlc09yU2VsZWN0b3JzT2JqZWN0IGFzIGFueSk7XG5cbiAgICByZXR1cm4gc291cmNlJC5waXBlKFxuICAgICAgY29uZmlnLmRlYm91bmNlID8gZGVib3VuY2VTeW5jKCkgOiBub29wT3BlcmF0b3IoKSxcbiAgICAgIChwcm9qZWN0b3JcbiAgICAgICAgPyBtYXAoKHByb2plY3RvckFyZ3MpID0+XG4gICAgICAgICAgICAvLyBwcm9qZWN0b3JBcmdzIGNvdWxkIGJlIGFuIEFycmF5IGluIGNhc2Ugd2hlcmUgdGhlIGVudGlyZSBzdGF0ZSBpcyBhbiBBcnJheSwgc28gYWRkaW5nIHRoaXMgY2hlY2tcbiAgICAgICAgICAgIChvYnNlcnZhYmxlc09yU2VsZWN0b3JzT2JqZWN0IGFzIE9ic2VydmFibGU8dW5rbm93bj5bXSkubGVuZ3RoID5cbiAgICAgICAgICAgICAgMCAmJiBBcnJheS5pc0FycmF5KHByb2plY3RvckFyZ3MpXG4gICAgICAgICAgICAgID8gcHJvamVjdG9yKC4uLnByb2plY3RvckFyZ3MpXG4gICAgICAgICAgICAgIDogcHJvamVjdG9yKHByb2plY3RvckFyZ3MpXG4gICAgICAgICAgKVxuICAgICAgICA6IG5vb3BPcGVyYXRvcigpKSBhcyAoKSA9PiBPYnNlcnZhYmxlPFJlc3VsdD4sXG4gICAgICBkaXN0aW5jdFVudGlsQ2hhbmdlZCgpLFxuICAgICAgc2hhcmVSZXBsYXkoe1xuICAgICAgICByZWZDb3VudDogdHJ1ZSxcbiAgICAgICAgYnVmZmVyU2l6ZTogMSxcbiAgICAgIH0pLFxuICAgICAgdGFrZVVudGlsKHRoaXMuZGVzdHJveSQpXG4gICAgKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgc2lnbmFsIGZyb20gdGhlIHByb3ZpZGVkIHN0YXRlIHByb2plY3RvciBmdW5jdGlvbi5cbiAgICovXG4gIHNlbGVjdFNpZ25hbDxSZXN1bHQ+KFxuICAgIHByb2plY3RvcjogKHN0YXRlOiBUKSA9PiBSZXN1bHQsXG4gICAgb3B0aW9ucz86IFNlbGVjdFNpZ25hbE9wdGlvbnM8UmVzdWx0PlxuICApOiBTaWduYWw8UmVzdWx0PjtcbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBzaWduYWwgYnkgY29tYmluaW5nIHByb3ZpZGVkIHNpZ25hbHMuXG4gICAqL1xuICBzZWxlY3RTaWduYWw8U2lnbmFscyBleHRlbmRzIFNpZ25hbDx1bmtub3duPltdLCBSZXN1bHQ+KFxuICAgIC4uLmFyZ3M6IFsuLi5zaWduYWxzOiBTaWduYWxzLCBwcm9qZWN0b3I6IFNpZ25hbHNQcm9qZWN0b3I8U2lnbmFscywgUmVzdWx0Pl1cbiAgKTogU2lnbmFsPFJlc3VsdD47XG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgc2lnbmFsIGJ5IGNvbWJpbmluZyBwcm92aWRlZCBzaWduYWxzLlxuICAgKi9cbiAgc2VsZWN0U2lnbmFsPFNpZ25hbHMgZXh0ZW5kcyBTaWduYWw8dW5rbm93bj5bXSwgUmVzdWx0PihcbiAgICAuLi5hcmdzOiBbXG4gICAgICAuLi5zaWduYWxzOiBTaWduYWxzLFxuICAgICAgcHJvamVjdG9yOiBTaWduYWxzUHJvamVjdG9yPFNpZ25hbHMsIFJlc3VsdD4sXG4gICAgICBvcHRpb25zOiBTZWxlY3RTaWduYWxPcHRpb25zPFJlc3VsdD5cbiAgICBdXG4gICk6IFNpZ25hbDxSZXN1bHQ+O1xuICBzZWxlY3RTaWduYWwoXG4gICAgLi4uYXJnczpcbiAgICAgIHwgWyhzdGF0ZTogVCkgPT4gdW5rbm93biwgU2VsZWN0U2lnbmFsT3B0aW9uczx1bmtub3duPj9dXG4gICAgICB8IFtcbiAgICAgICAgICAuLi5zaWduYWxzOiBTaWduYWw8dW5rbm93bj5bXSxcbiAgICAgICAgICBwcm9qZWN0b3I6ICguLi52YWx1ZXM6IHVua25vd25bXSkgPT4gdW5rbm93blxuICAgICAgICBdXG4gICAgICB8IFtcbiAgICAgICAgICAuLi5zaWduYWxzOiBTaWduYWw8dW5rbm93bj5bXSxcbiAgICAgICAgICBwcm9qZWN0b3I6ICguLi52YWx1ZXM6IHVua25vd25bXSkgPT4gdW5rbm93bixcbiAgICAgICAgICBvcHRpb25zOiBTZWxlY3RTaWduYWxPcHRpb25zPHVua25vd24+XG4gICAgICAgIF1cbiAgKTogU2lnbmFsPHVua25vd24+IHtcbiAgICBjb25zdCBzZWxlY3RTaWduYWxBcmdzID0gWy4uLmFyZ3NdO1xuICAgIGNvbnN0IGRlZmF1bHRFcXVhbGl0eUZuOiBWYWx1ZUVxdWFsaXR5Rm48dW5rbm93bj4gPSAocHJldmlvdXMsIGN1cnJlbnQpID0+XG4gICAgICBwcmV2aW91cyA9PT0gY3VycmVudDtcblxuICAgIGNvbnN0IG9wdGlvbnM6IENyZWF0ZUNvbXB1dGVkT3B0aW9uczx1bmtub3duPiA9XG4gICAgICB0eXBlb2Ygc2VsZWN0U2lnbmFsQXJnc1thcmdzLmxlbmd0aCAtIDFdID09PSAnb2JqZWN0J1xuICAgICAgICA/IHtcbiAgICAgICAgICAgIGVxdWFsOlxuICAgICAgICAgICAgICAoc2VsZWN0U2lnbmFsQXJncy5wb3AoKSBhcyBTZWxlY3RTaWduYWxPcHRpb25zPHVua25vd24+KS5lcXVhbCB8fFxuICAgICAgICAgICAgICBkZWZhdWx0RXF1YWxpdHlGbixcbiAgICAgICAgICB9XG4gICAgICAgIDogeyBlcXVhbDogZGVmYXVsdEVxdWFsaXR5Rm4gfTtcbiAgICBjb25zdCBwcm9qZWN0b3IgPSBzZWxlY3RTaWduYWxBcmdzLnBvcCgpIGFzIChcbiAgICAgIC4uLnZhbHVlczogdW5rbm93bltdXG4gICAgKSA9PiB1bmtub3duO1xuICAgIGNvbnN0IHNpZ25hbHMgPSBzZWxlY3RTaWduYWxBcmdzIGFzIFNpZ25hbDx1bmtub3duPltdO1xuXG4gICAgY29uc3QgY29tcHV0YXRpb24gPVxuICAgICAgc2lnbmFscy5sZW5ndGggPT09IDBcbiAgICAgICAgPyAoKSA9PiBwcm9qZWN0b3IodGhpcy5zdGF0ZSgpKVxuICAgICAgICA6ICgpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHZhbHVlcyA9IHNpZ25hbHMubWFwKChzaWduYWwpID0+IHNpZ25hbCgpKTtcbiAgICAgICAgICAgIHJldHVybiBwcm9qZWN0b3IoLi4udmFsdWVzKTtcbiAgICAgICAgICB9O1xuXG4gICAgcmV0dXJuIGNvbXB1dGVkKGNvbXB1dGF0aW9uLCBvcHRpb25zKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGVzIGFuIGVmZmVjdC5cbiAgICpcbiAgICogVGhpcyBlZmZlY3QgaXMgc3Vic2NyaWJlZCB0byB0aHJvdWdob3V0IHRoZSBsaWZlY3ljbGUgb2YgdGhlIENvbXBvbmVudFN0b3JlLlxuICAgKiBAcGFyYW0gZ2VuZXJhdG9yIEEgZnVuY3Rpb24gdGhhdCB0YWtlcyBhbiBvcmlnaW4gT2JzZXJ2YWJsZSBpbnB1dCBhbmRcbiAgICogICAgIHJldHVybnMgYW4gT2JzZXJ2YWJsZS4gVGhlIE9ic2VydmFibGUgdGhhdCBpcyByZXR1cm5lZCB3aWxsIGJlXG4gICAqICAgICBzdWJzY3JpYmVkIHRvIGZvciB0aGUgbGlmZSBvZiB0aGUgY29tcG9uZW50LlxuICAgKiBAcmV0dXJuIEEgZnVuY3Rpb24gdGhhdCwgd2hlbiBjYWxsZWQsIHdpbGwgdHJpZ2dlciB0aGUgb3JpZ2luIE9ic2VydmFibGUuXG4gICAqL1xuICBlZmZlY3Q8XG4gICAgLy8gVGhpcyB0eXBlIHF1aWNrbHkgYmVjYW1lIHBhcnQgb2YgZWZmZWN0ICdBUEknXG4gICAgUHJvdmlkZWRUeXBlID0gdm9pZCxcbiAgICAvLyBUaGUgYWN0dWFsIG9yaWdpbiQgdHlwZSwgd2hpY2ggY291bGQgYmUgdW5rbm93biwgd2hlbiBub3Qgc3BlY2lmaWVkXG4gICAgT3JpZ2luVHlwZSBleHRlbmRzXG4gICAgICB8IE9ic2VydmFibGU8UHJvdmlkZWRUeXBlPlxuICAgICAgfCB1bmtub3duID0gT2JzZXJ2YWJsZTxQcm92aWRlZFR5cGU+LFxuICAgIC8vIFVud3JhcHBlZCBhY3R1YWwgdHlwZSBvZiB0aGUgb3JpZ2luJCBPYnNlcnZhYmxlLCBhZnRlciBkZWZhdWx0IHdhcyBhcHBsaWVkXG4gICAgT2JzZXJ2YWJsZVR5cGUgPSBPcmlnaW5UeXBlIGV4dGVuZHMgT2JzZXJ2YWJsZTxpbmZlciBBPiA/IEEgOiBuZXZlcixcbiAgICAvLyBSZXR1cm4gZWl0aGVyIGFuIG9wdGlvbmFsIGNhbGxiYWNrIG9yIGEgZnVuY3Rpb24gcmVxdWlyaW5nIHNwZWNpZmljIHR5cGVzIGFzIGlucHV0c1xuICAgIFJldHVyblR5cGUgPSBQcm92aWRlZFR5cGUgfCBPYnNlcnZhYmxlVHlwZSBleHRlbmRzIHZvaWRcbiAgICAgID8gKFxuICAgICAgICAgIG9ic2VydmFibGVPclZhbHVlPzogT2JzZXJ2YWJsZVR5cGUgfCBPYnNlcnZhYmxlPE9ic2VydmFibGVUeXBlPlxuICAgICAgICApID0+IFN1YnNjcmlwdGlvblxuICAgICAgOiAoXG4gICAgICAgICAgb2JzZXJ2YWJsZU9yVmFsdWU6IE9ic2VydmFibGVUeXBlIHwgT2JzZXJ2YWJsZTxPYnNlcnZhYmxlVHlwZT5cbiAgICAgICAgKSA9PiBTdWJzY3JpcHRpb25cbiAgPihnZW5lcmF0b3I6IChvcmlnaW4kOiBPcmlnaW5UeXBlKSA9PiBPYnNlcnZhYmxlPHVua25vd24+KTogUmV0dXJuVHlwZSB7XG4gICAgY29uc3Qgb3JpZ2luJCA9IG5ldyBTdWJqZWN0PE9ic2VydmFibGVUeXBlPigpO1xuICAgIGdlbmVyYXRvcihvcmlnaW4kIGFzIE9yaWdpblR5cGUpXG4gICAgICAvLyB0aWVkIHRvIHRoZSBsaWZlY3ljbGUg8J+RhyBvZiBDb21wb25lbnRTdG9yZVxuICAgICAgLnBpcGUodGFrZVVudGlsKHRoaXMuZGVzdHJveSQpKVxuICAgICAgLnN1YnNjcmliZSgpO1xuXG4gICAgcmV0dXJuICgoXG4gICAgICBvYnNlcnZhYmxlT3JWYWx1ZT86IE9ic2VydmFibGVUeXBlIHwgT2JzZXJ2YWJsZTxPYnNlcnZhYmxlVHlwZT5cbiAgICApOiBTdWJzY3JpcHRpb24gPT4ge1xuICAgICAgY29uc3Qgb2JzZXJ2YWJsZSQgPSBpc09ic2VydmFibGUob2JzZXJ2YWJsZU9yVmFsdWUpXG4gICAgICAgID8gb2JzZXJ2YWJsZU9yVmFsdWVcbiAgICAgICAgOiBvZihvYnNlcnZhYmxlT3JWYWx1ZSk7XG4gICAgICByZXR1cm4gb2JzZXJ2YWJsZSQucGlwZSh0YWtlVW50aWwodGhpcy5kZXN0cm95JCkpLnN1YnNjcmliZSgodmFsdWUpID0+IHtcbiAgICAgICAgLy8gYW55IG5ldyDwn5GHIHZhbHVlIGlzIHB1c2hlZCBpbnRvIGEgc3RyZWFtXG4gICAgICAgIG9yaWdpbiQubmV4dCh2YWx1ZSBhcyBPYnNlcnZhYmxlVHlwZSk7XG4gICAgICB9KTtcbiAgICB9KSBhcyB1bmtub3duIGFzIFJldHVyblR5cGU7XG4gIH1cblxuICAvKipcbiAgICogVXNlZCB0byBjaGVjayBpZiBsaWZlY3ljbGUgaG9va3MgYXJlIGRlZmluZWRcbiAgICogYnV0IG5vdCB1c2VkIHdpdGggcHJvdmlkZUNvbXBvbmVudFN0b3JlKClcbiAgICovXG4gIHByaXZhdGUgY2hlY2tQcm92aWRlckZvckhvb2tzKCkge1xuICAgIGFzYXBTY2hlZHVsZXIuc2NoZWR1bGUoKCkgPT4ge1xuICAgICAgaWYgKFxuICAgICAgICBpc0Rldk1vZGUoKSAmJlxuICAgICAgICAoaXNPblN0b3JlSW5pdERlZmluZWQodGhpcykgfHwgaXNPblN0YXRlSW5pdERlZmluZWQodGhpcykpICYmXG4gICAgICAgICF0aGlzLsm1aGFzUHJvdmlkZXJcbiAgICAgICkge1xuICAgICAgICBjb25zdCB3YXJuaW5ncyA9IFtcbiAgICAgICAgICBpc09uU3RvcmVJbml0RGVmaW5lZCh0aGlzKSA/ICdPblN0b3JlSW5pdCcgOiAnJyxcbiAgICAgICAgICBpc09uU3RhdGVJbml0RGVmaW5lZCh0aGlzKSA/ICdPblN0YXRlSW5pdCcgOiAnJyxcbiAgICAgICAgXS5maWx0ZXIoKGRlZmluZWQpID0+IGRlZmluZWQpO1xuXG4gICAgICAgIGNvbnNvbGUud2FybihcbiAgICAgICAgICBgQG5ncngvY29tcG9uZW50LXN0b3JlOiAke1xuICAgICAgICAgICAgdGhpcy5jb25zdHJ1Y3Rvci5uYW1lXG4gICAgICAgICAgfSBoYXMgdGhlICR7d2FybmluZ3Muam9pbignIGFuZCAnKX0gYCArXG4gICAgICAgICAgICAnbGlmZWN5Y2xlIGhvb2socykgaW1wbGVtZW50ZWQgd2l0aG91dCBiZWluZyBwcm92aWRlZCB1c2luZyB0aGUgJyArXG4gICAgICAgICAgICBgcHJvdmlkZUNvbXBvbmVudFN0b3JlKCR7dGhpcy5jb25zdHJ1Y3Rvci5uYW1lfSkgZnVuY3Rpb24uIGAgK1xuICAgICAgICAgICAgYFRvIHJlc29sdmUgdGhpcywgcHJvdmlkZSB0aGUgY29tcG9uZW50IHN0b3JlIHZpYSBwcm92aWRlQ29tcG9uZW50U3RvcmUoJHt0aGlzLmNvbnN0cnVjdG9yLm5hbWV9KWBcbiAgICAgICAgKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgYXNzZXJ0U3RhdGVJc0luaXRpYWxpemVkKCk6IHZvaWQge1xuICAgIGlmICghdGhpcy5pc0luaXRpYWxpemVkKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgIGAke3RoaXMuY29uc3RydWN0b3IubmFtZX0gaGFzIG5vdCBiZWVuIGluaXRpYWxpemVkIHlldC4gYCArXG4gICAgICAgICAgYFBsZWFzZSBtYWtlIHN1cmUgaXQgaXMgaW5pdGlhbGl6ZWQgYmVmb3JlIHVwZGF0aW5nL2dldHRpbmcuYFxuICAgICAgKTtcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gcHJvY2Vzc1NlbGVjdG9yQXJnczxcbiAgU2VsZWN0b3JzIGV4dGVuZHMgQXJyYXk8XG4gICAgT2JzZXJ2YWJsZTx1bmtub3duPiB8IFNlbGVjdENvbmZpZyB8IFByb2plY3RvckZuIHwgU2VsZWN0b3JzT2JqZWN0XG4gID4sXG4gIFJlc3VsdCxcbiAgUHJvamVjdG9yRm4gZXh0ZW5kcyAoLi4uYTogdW5rbm93bltdKSA9PiBSZXN1bHQsXG4gIFNlbGVjdG9yc09iamVjdCBleHRlbmRzIFJlY29yZDxzdHJpbmcsIE9ic2VydmFibGU8dW5rbm93bj4+XG4+KFxuICBhcmdzOiBTZWxlY3RvcnNcbik6XG4gIHwge1xuICAgICAgb2JzZXJ2YWJsZXNPclNlbGVjdG9yc09iamVjdDogT2JzZXJ2YWJsZTx1bmtub3duPltdO1xuICAgICAgcHJvamVjdG9yOiBQcm9qZWN0b3JGbjtcbiAgICAgIGNvbmZpZzogUmVxdWlyZWQ8U2VsZWN0Q29uZmlnPjtcbiAgICB9XG4gIHwge1xuICAgICAgb2JzZXJ2YWJsZXNPclNlbGVjdG9yc09iamVjdDogU2VsZWN0b3JzT2JqZWN0O1xuICAgICAgcHJvamVjdG9yOiB1bmRlZmluZWQ7XG4gICAgICBjb25maWc6IFJlcXVpcmVkPFNlbGVjdENvbmZpZz47XG4gICAgfSB7XG4gIGNvbnN0IHNlbGVjdG9yQXJncyA9IEFycmF5LmZyb20oYXJncyk7XG4gIC8vIEFzc2lnbiBkZWZhdWx0IHZhbHVlcy5cbiAgbGV0IGNvbmZpZzogUmVxdWlyZWQ8U2VsZWN0Q29uZmlnPiA9IHsgZGVib3VuY2U6IGZhbHNlIH07XG5cbiAgLy8gTGFzdCBhcmd1bWVudCBpcyBlaXRoZXIgY29uZmlnIG9yIHByb2plY3RvciBvciBzZWxlY3RvcnNPYmplY3RcbiAgaWYgKGlzU2VsZWN0Q29uZmlnKHNlbGVjdG9yQXJnc1tzZWxlY3RvckFyZ3MubGVuZ3RoIC0gMV0pKSB7XG4gICAgY29uZmlnID0geyAuLi5jb25maWcsIC4uLnNlbGVjdG9yQXJncy5wb3AoKSB9O1xuICB9XG5cbiAgLy8gQXQgdGhpcyBwb2ludCBzZWxlY3RvckFyZ3MgaXMgZWl0aGVyIHByb2plY3Rvciwgc2VsZWN0b3JzIHdpdGggcHJvamVjdG9yIG9yIHNlbGVjdG9yc09iamVjdFxuICBpZiAoc2VsZWN0b3JBcmdzLmxlbmd0aCA9PT0gMSAmJiB0eXBlb2Ygc2VsZWN0b3JBcmdzWzBdICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgLy8gdGhpcyBpcyBhIHNlbGVjdG9yc09iamVjdFxuICAgIHJldHVybiB7XG4gICAgICBvYnNlcnZhYmxlc09yU2VsZWN0b3JzT2JqZWN0OiBzZWxlY3RvckFyZ3NbMF0gYXMgU2VsZWN0b3JzT2JqZWN0LFxuICAgICAgcHJvamVjdG9yOiB1bmRlZmluZWQsXG4gICAgICBjb25maWcsXG4gICAgfTtcbiAgfVxuXG4gIGNvbnN0IHByb2plY3RvciA9IHNlbGVjdG9yQXJncy5wb3AoKSBhcyBQcm9qZWN0b3JGbjtcblxuICAvLyBUaGUgT2JzZXJ2YWJsZXMgdG8gY29tYmluZSwgaWYgdGhlcmUgYXJlIGFueSBsZWZ0LlxuICBjb25zdCBvYnNlcnZhYmxlcyA9IHNlbGVjdG9yQXJncyBhcyBPYnNlcnZhYmxlPHVua25vd24+W107XG4gIHJldHVybiB7XG4gICAgb2JzZXJ2YWJsZXNPclNlbGVjdG9yc09iamVjdDogb2JzZXJ2YWJsZXMsXG4gICAgcHJvamVjdG9yLFxuICAgIGNvbmZpZyxcbiAgfTtcbn1cblxuZnVuY3Rpb24gaXNTZWxlY3RDb25maWcoYXJnOiBTZWxlY3RDb25maWcgfCB1bmtub3duKTogYXJnIGlzIFNlbGVjdENvbmZpZyB7XG4gIHJldHVybiB0eXBlb2YgKGFyZyBhcyBTZWxlY3RDb25maWcpLmRlYm91bmNlICE9PSAndW5kZWZpbmVkJztcbn1cblxuZnVuY3Rpb24gaGFzUHJvamVjdEZuT25seShcbiAgb2JzZXJ2YWJsZXNPclNlbGVjdG9yc09iamVjdDogdW5rbm93bltdIHwgUmVjb3JkPHN0cmluZywgdW5rbm93bj4sXG4gIHByb2plY3RvcjogdW5rbm93blxuKSB7XG4gIHJldHVybiAoXG4gICAgQXJyYXkuaXNBcnJheShvYnNlcnZhYmxlc09yU2VsZWN0b3JzT2JqZWN0KSAmJlxuICAgIG9ic2VydmFibGVzT3JTZWxlY3RvcnNPYmplY3QubGVuZ3RoID09PSAwICYmXG4gICAgcHJvamVjdG9yXG4gICk7XG59XG5cbmZ1bmN0aW9uIG5vb3BPcGVyYXRvcigpOiA8VD4oc291cmNlJDogT2JzZXJ2YWJsZTxUPikgPT4gdHlwZW9mIHNvdXJjZSQge1xuICByZXR1cm4gKHNvdXJjZSQpID0+IHNvdXJjZSQ7XG59XG4iXX0=