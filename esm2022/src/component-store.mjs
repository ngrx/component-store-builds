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
    /** @nocollapse */ static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "16.2.3", ngImport: i0, type: ComponentStore, deps: [{ token: INITIAL_STATE_TOKEN, optional: true }], target: i0.ɵɵFactoryTarget.Injectable }); }
    /** @nocollapse */ static { this.ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "16.2.3", ngImport: i0, type: ComponentStore }); }
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "16.2.3", ngImport: i0, type: ComponentStore, decorators: [{
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcG9uZW50LXN0b3JlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vbW9kdWxlcy9jb21wb25lbnQtc3RvcmUvc3JjL2NvbXBvbmVudC1zdG9yZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQ0wsWUFBWSxFQUVaLEVBQUUsRUFDRixhQUFhLEVBRWIsVUFBVSxFQUNWLGFBQWEsRUFDYixPQUFPLEVBQ1AsY0FBYyxFQUNkLFNBQVMsRUFDVCxhQUFhLEVBQ2IsS0FBSyxHQUVOLE1BQU0sTUFBTSxDQUFDO0FBQ2QsT0FBTyxFQUNMLFNBQVMsRUFDVCxjQUFjLEVBQ2QsR0FBRyxFQUNILG9CQUFvQixFQUNwQixXQUFXLEVBQ1gsSUFBSSxFQUNKLEdBQUcsRUFDSCxVQUFVLEVBQ1YsU0FBUyxHQUNWLE1BQU0sZ0JBQWdCLENBQUM7QUFDeEIsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBQy9DLE9BQU8sRUFDTCxVQUFVLEVBRVYsUUFBUSxFQUNSLGNBQWMsRUFDZCxNQUFNLEVBQ04sU0FBUyxFQUVULFFBQVEsR0FHVCxNQUFNLGVBQWUsQ0FBQztBQUN2QixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQztBQUMvRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sNEJBQTRCLENBQUM7O0FBT3RELE1BQU0sQ0FBQyxNQUFNLG1CQUFtQixHQUFHLElBQUksY0FBYyxDQUNuRCxxQ0FBcUMsQ0FDdEMsQ0FBQztBQTRCRixNQUFNLE9BQU8sY0FBYztJQWdCekIsWUFBcUQsWUFBZ0I7UUFmckUsc0NBQXNDO1FBQ3JCLG9CQUFlLEdBQUcsSUFBSSxhQUFhLENBQU8sQ0FBQyxDQUFDLENBQUM7UUFDOUQsOERBQThEO1FBQ3JELGFBQVEsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLFlBQVksRUFBRSxDQUFDO1FBRXZDLGtCQUFhLEdBQUcsSUFBSSxh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cURBQXFEO0lBQ3JELE1BQU0sV0FBVyxHQUFHLFlBQXFDLENBQUM7SUFDMUQsT0FBTztRQUNMLDRCQUE0QixFQUFFLFdBQVc7UUFDekMsU0FBUztRQUNULE1BQU07S0FDUCxDQUFDO0FBQ0osQ0FBQztBQUVELFNBQVMsY0FBYyxDQUNyQixHQUFvQztJQUVwQyxNQUFNLFFBQVEsR0FBRyxHQUE0QixDQUFDO0lBQzlDLE9BQU8sQ0FDTCxPQUFPLFFBQVEsQ0FBQyxRQUFRLEtBQUssV0FBVztRQUN4QyxPQUFPLFFBQVEsQ0FBQyxLQUFLLEtBQUssV0FBVyxDQUN0QyxDQUFDO0FBQ0osQ0FBQztBQUVELFNBQVMsZ0JBQWdCLENBQ3ZCLDRCQUFpRSxFQUNqRSxTQUFrQjtJQUVsQixPQUFPLENBQ0wsS0FBSyxDQUFDLE9BQU8sQ0FBQyw0QkFBNEIsQ0FBQztRQUMzQyw0QkFBNEIsQ0FBQyxNQUFNLEtBQUssQ0FBQztRQUN6QyxTQUFTLENBQ1YsQ0FBQztBQUNKLENBQUM7QUFFRCxTQUFTLFlBQVk7SUFDbkIsT0FBTyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsT0FBTyxDQUFDO0FBQzlCLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge1xuICBpc09ic2VydmFibGUsXG4gIE9ic2VydmFibGUsXG4gIG9mLFxuICBSZXBsYXlTdWJqZWN0LFxuICBTdWJzY3JpcHRpb24sXG4gIHRocm93RXJyb3IsXG4gIGNvbWJpbmVMYXRlc3QsXG4gIFN1YmplY3QsXG4gIHF1ZXVlU2NoZWR1bGVyLFxuICBzY2hlZHVsZWQsXG4gIGFzYXBTY2hlZHVsZXIsXG4gIEVNUFRZLFxuICBPYnNlcnZlZFZhbHVlT2YsXG59IGZyb20gJ3J4anMnO1xuaW1wb3J0IHtcbiAgdGFrZVVudGlsLFxuICB3aXRoTGF0ZXN0RnJvbSxcbiAgbWFwLFxuICBkaXN0aW5jdFVudGlsQ2hhbmdlZCxcbiAgc2hhcmVSZXBsYXksXG4gIHRha2UsXG4gIHRhcCxcbiAgY2F0Y2hFcnJvcixcbiAgb2JzZXJ2ZU9uLFxufSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQgeyBkZWJvdW5jZVN5bmMgfSBmcm9tICcuL2RlYm91bmNlLXN5bmMnO1xuaW1wb3J0IHtcbiAgSW5qZWN0YWJsZSxcbiAgT25EZXN0cm95LFxuICBPcHRpb25hbCxcbiAgSW5qZWN0aW9uVG9rZW4sXG4gIEluamVjdCxcbiAgaXNEZXZNb2RlLFxuICBTaWduYWwsXG4gIGNvbXB1dGVkLFxuICB0eXBlIFZhbHVlRXF1YWxpdHlGbixcbiAgdHlwZSBDcmVhdGVDb21wdXRlZE9wdGlvbnMsXG59IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0IHsgaXNPblN0YXRlSW5pdERlZmluZWQsIGlzT25TdG9yZUluaXREZWZpbmVkIH0gZnJvbSAnLi9saWZlY3ljbGVfaG9va3MnO1xuaW1wb3J0IHsgdG9TaWduYWwgfSBmcm9tICdAYW5ndWxhci9jb3JlL3J4anMtaW50ZXJvcCc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgU2VsZWN0Q29uZmlnPFQgPSB1bmtub3duPiB7XG4gIGRlYm91bmNlPzogYm9vbGVhbjtcbiAgZXF1YWw/OiBWYWx1ZUVxdWFsaXR5Rm48VD47XG59XG5cbmV4cG9ydCBjb25zdCBJTklUSUFMX1NUQVRFX1RPS0VOID0gbmV3IEluamVjdGlvblRva2VuKFxuICAnQG5ncngvY29tcG9uZW50LXN0b3JlIEluaXRpYWwgU3RhdGUnXG4pO1xuXG5leHBvcnQgdHlwZSBTZWxlY3RvclJlc3VsdHM8U2VsZWN0b3JzIGV4dGVuZHMgT2JzZXJ2YWJsZTx1bmtub3duPltdPiA9IHtcbiAgW0tleSBpbiBrZXlvZiBTZWxlY3RvcnNdOiBTZWxlY3RvcnNbS2V5XSBleHRlbmRzIE9ic2VydmFibGU8aW5mZXIgVT5cbiAgICA/IFVcbiAgICA6IG5ldmVyO1xufTtcblxuZXhwb3J0IHR5cGUgUHJvamVjdG9yPFNlbGVjdG9ycyBleHRlbmRzIE9ic2VydmFibGU8dW5rbm93bj5bXSwgUmVzdWx0PiA9IChcbiAgLi4uYXJnczogU2VsZWN0b3JSZXN1bHRzPFNlbGVjdG9ycz5cbikgPT4gUmVzdWx0O1xuXG50eXBlIFNpZ25hbHNQcm9qZWN0b3I8U2lnbmFscyBleHRlbmRzIFNpZ25hbDx1bmtub3duPltdLCBSZXN1bHQ+ID0gKFxuICAuLi52YWx1ZXM6IHtcbiAgICBbS2V5IGluIGtleW9mIFNpZ25hbHNdOiBTaWduYWxzW0tleV0gZXh0ZW5kcyBTaWduYWw8aW5mZXIgVmFsdWU+XG4gICAgICA/IFZhbHVlXG4gICAgICA6IG5ldmVyO1xuICB9XG4pID0+IFJlc3VsdDtcblxuaW50ZXJmYWNlIFNlbGVjdFNpZ25hbE9wdGlvbnM8VD4ge1xuICAvKipcbiAgICogQSBjb21wYXJpc29uIGZ1bmN0aW9uIHdoaWNoIGRlZmluZXMgZXF1YWxpdHkgZm9yIHNlbGVjdCByZXN1bHRzLlxuICAgKi9cbiAgZXF1YWw/OiBWYWx1ZUVxdWFsaXR5Rm48VD47XG59XG5cbkBJbmplY3RhYmxlKClcbmV4cG9ydCBjbGFzcyBDb21wb25lbnRTdG9yZTxUIGV4dGVuZHMgb2JqZWN0PiBpbXBsZW1lbnRzIE9uRGVzdHJveSB7XG4gIC8vIFNob3VsZCBiZSB1c2VkIG9ubHkgaW4gbmdPbkRlc3Ryb3kuXG4gIHByaXZhdGUgcmVhZG9ubHkgZGVzdHJveVN1YmplY3QkID0gbmV3IFJlcGxheVN1YmplY3Q8dm9pZD4oMSk7XG4gIC8vIEV4cG9zZWQgdG8gYW55IGV4dGVuZGluZyBTdG9yZSB0byBiZSB1c2VkIGZvciB0aGUgdGVhcmRvd24uXG4gIHJlYWRvbmx5IGRlc3Ryb3kkID0gdGhpcy5kZXN0cm95U3ViamVjdCQuYXNPYnNlcnZhYmxlKCk7XG5cbiAgcHJpdmF0ZSByZWFkb25seSBzdGF0ZVN1YmplY3QkID0gbmV3IFJlcGxheVN1YmplY3Q8VD4oMSk7XG4gIHByaXZhdGUgaXNJbml0aWFsaXplZCA9IGZhbHNlO1xuICAvLyBOZWVkcyB0byBiZSBhZnRlciBkZXN0cm95JCBpcyBkZWNsYXJlZCBiZWNhdXNlIGl0J3MgdXNlZCBpbiBzZWxlY3QuXG4gIHJlYWRvbmx5IHN0YXRlJDogT2JzZXJ2YWJsZTxUPiA9IHRoaXMuc2VsZWN0KChzKSA9PiBzKTtcbiAgcmVhZG9ubHkgc3RhdGU6IFNpZ25hbDxUPiA9IHRvU2lnbmFsKFxuICAgIHRoaXMuc3RhdGVTdWJqZWN0JC5waXBlKHRha2VVbnRpbCh0aGlzLmRlc3Ryb3kkKSksXG4gICAgeyByZXF1aXJlU3luYzogZmFsc2UsIG1hbnVhbENsZWFudXA6IHRydWUgfVxuICApIGFzIFNpZ25hbDxUPjtcbiAgcHJpdmF0ZSDJtWhhc1Byb3ZpZGVyID0gZmFsc2U7XG5cbiAgY29uc3RydWN0b3IoQE9wdGlvbmFsKCkgQEluamVjdChJTklUSUFMX1NUQVRFX1RPS0VOKSBkZWZhdWx0U3RhdGU/OiBUKSB7XG4gICAgLy8gU3RhdGUgY2FuIGJlIGluaXRpYWxpemVkIGVpdGhlciB0aHJvdWdoIGNvbnN0cnVjdG9yIG9yIHNldFN0YXRlLlxuICAgIGlmIChkZWZhdWx0U3RhdGUpIHtcbiAgICAgIHRoaXMuaW5pdFN0YXRlKGRlZmF1bHRTdGF0ZSk7XG4gICAgfVxuXG4gICAgdGhpcy5jaGVja1Byb3ZpZGVyRm9ySG9va3MoKTtcbiAgfVxuXG4gIC8qKiBDb21wbGV0ZXMgYWxsIHJlbGV2YW50IE9ic2VydmFibGUgc3RyZWFtcy4gKi9cbiAgbmdPbkRlc3Ryb3koKSB7XG4gICAgdGhpcy5zdGF0ZVN1YmplY3QkLmNvbXBsZXRlKCk7XG4gICAgdGhpcy5kZXN0cm95U3ViamVjdCQubmV4dCgpO1xuICB9XG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgYW4gdXBkYXRlci5cbiAgICpcbiAgICogVGhyb3dzIGFuIGVycm9yIGlmIHVwZGF0ZXIgaXMgY2FsbGVkIHdpdGggc3luY2hyb25vdXMgdmFsdWVzIChlaXRoZXJcbiAgICogaW1wZXJhdGl2ZSB2YWx1ZSBvciBPYnNlcnZhYmxlIHRoYXQgaXMgc3luY2hyb25vdXMpIGJlZm9yZSBDb21wb25lbnRTdG9yZVxuICAgKiBpcyBpbml0aWFsaXplZC4gSWYgY2FsbGVkIHdpdGggYXN5bmMgT2JzZXJ2YWJsZSBiZWZvcmUgaW5pdGlhbGl6YXRpb24gdGhlblxuICAgKiBzdGF0ZSB3aWxsIG5vdCBiZSB1cGRhdGVkIGFuZCBzdWJzY3JpcHRpb24gd291bGQgYmUgY2xvc2VkLlxuICAgKlxuICAgKiBAcGFyYW0gdXBkYXRlckZuIEEgc3RhdGljIHVwZGF0ZXIgZnVuY3Rpb24gdGhhdCB0YWtlcyAyIHBhcmFtZXRlcnMgKHRoZVxuICAgKiBjdXJyZW50IHN0YXRlIGFuZCBhbiBhcmd1bWVudCBvYmplY3QpIGFuZCByZXR1cm5zIGEgbmV3IGluc3RhbmNlIG9mIHRoZVxuICAgKiBzdGF0ZS5cbiAgICogQHJldHVybiBBIGZ1bmN0aW9uIHRoYXQgYWNjZXB0cyBvbmUgYXJndW1lbnQgd2hpY2ggaXMgZm9yd2FyZGVkIGFzIHRoZVxuICAgKiAgICAgc2Vjb25kIGFyZ3VtZW50IHRvIGB1cGRhdGVyRm5gLiBFdmVyeSB0aW1lIHRoaXMgZnVuY3Rpb24gaXMgY2FsbGVkXG4gICAqICAgICBzdWJzY3JpYmVycyB3aWxsIGJlIG5vdGlmaWVkIG9mIHRoZSBzdGF0ZSBjaGFuZ2UuXG4gICAqL1xuICB1cGRhdGVyPFxuICAgIC8vIEFsbG93IHRvIGZvcmNlLXByb3ZpZGUgdGhlIHR5cGVcbiAgICBQcm92aWRlZFR5cGUgPSB2b2lkLFxuICAgIC8vIFRoaXMgdHlwZSBpcyBkZXJpdmVkIGZyb20gdGhlIGB2YWx1ZWAgcHJvcGVydHksIGRlZmF1bHRpbmcgdG8gdm9pZCBpZiBpdCdzIG1pc3NpbmdcbiAgICBPcmlnaW5UeXBlID0gUHJvdmlkZWRUeXBlLFxuICAgIC8vIFRoZSBWYWx1ZSB0eXBlIGlzIGFzc2lnbmVkIGZyb20gdGhlIE9yaWdpblxuICAgIFZhbHVlVHlwZSA9IE9yaWdpblR5cGUsXG4gICAgLy8gUmV0dXJuIGVpdGhlciBhbiBlbXB0eSBjYWxsYmFjayBvciBhIGZ1bmN0aW9uIHJlcXVpcmluZyBzcGVjaWZpYyB0eXBlcyBhcyBpbnB1dHNcbiAgICBSZXR1cm5UeXBlID0gT3JpZ2luVHlwZSBleHRlbmRzIHZvaWRcbiAgICAgID8gKCkgPT4gdm9pZFxuICAgICAgOiAob2JzZXJ2YWJsZU9yVmFsdWU6IFZhbHVlVHlwZSB8IE9ic2VydmFibGU8VmFsdWVUeXBlPikgPT4gU3Vic2NyaXB0aW9uXG4gID4odXBkYXRlckZuOiAoc3RhdGU6IFQsIHZhbHVlOiBPcmlnaW5UeXBlKSA9PiBUKTogUmV0dXJuVHlwZSB7XG4gICAgcmV0dXJuICgoXG4gICAgICBvYnNlcnZhYmxlT3JWYWx1ZT86IE9yaWdpblR5cGUgfCBPYnNlcnZhYmxlPE9yaWdpblR5cGU+XG4gICAgKTogU3Vic2NyaXB0aW9uID0+IHtcbiAgICAgIC8vIFdlIG5lZWQgdG8gZXhwbGljaXRseSB0aHJvdyBhbiBlcnJvciBpZiBhIHN5bmNocm9ub3VzIGVycm9yIG9jY3Vycy5cbiAgICAgIC8vIFRoaXMgaXMgbmVjZXNzYXJ5IHRvIG1ha2Ugc3luY2hyb25vdXMgZXJyb3JzIGNhdGNoYWJsZS5cbiAgICAgIGxldCBpc1N5bmNVcGRhdGUgPSB0cnVlO1xuICAgICAgbGV0IHN5bmNFcnJvcjogdW5rbm93bjtcbiAgICAgIC8vIFdlIGNhbiByZWNlaXZlIGVpdGhlciB0aGUgdmFsdWUgb3IgYW4gb2JzZXJ2YWJsZS4gSW4gY2FzZSBpdCdzIGFcbiAgICAgIC8vIHNpbXBsZSB2YWx1ZSwgd2UnbGwgd3JhcCBpdCB3aXRoIGBvZmAgb3BlcmF0b3IgdG8gdHVybiBpdCBpbnRvXG4gICAgICAvLyBPYnNlcnZhYmxlLlxuICAgICAgY29uc3Qgb2JzZXJ2YWJsZSQgPSBpc09ic2VydmFibGUob2JzZXJ2YWJsZU9yVmFsdWUpXG4gICAgICAgID8gb2JzZXJ2YWJsZU9yVmFsdWVcbiAgICAgICAgOiBvZihvYnNlcnZhYmxlT3JWYWx1ZSk7XG4gICAgICBjb25zdCBzdWJzY3JpcHRpb24gPSBvYnNlcnZhYmxlJFxuICAgICAgICAucGlwZShcbiAgICAgICAgICAvLyBQdXNoIHRoZSB2YWx1ZSBpbnRvIHF1ZXVlU2NoZWR1bGVyXG4gICAgICAgICAgb2JzZXJ2ZU9uKHF1ZXVlU2NoZWR1bGVyKSxcbiAgICAgICAgICAvLyBJZiB0aGUgc3RhdGUgaXMgbm90IGluaXRpYWxpemVkIHlldCwgd2UnbGwgdGhyb3cgYW4gZXJyb3IuXG4gICAgICAgICAgdGFwKCgpID0+IHRoaXMuYXNzZXJ0U3RhdGVJc0luaXRpYWxpemVkKCkpLFxuICAgICAgICAgIHdpdGhMYXRlc3RGcm9tKHRoaXMuc3RhdGVTdWJqZWN0JCksXG4gICAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1ub24tbnVsbC1hc3NlcnRpb25cbiAgICAgICAgICBtYXAoKFt2YWx1ZSwgY3VycmVudFN0YXRlXSkgPT4gdXBkYXRlckZuKGN1cnJlbnRTdGF0ZSwgdmFsdWUhKSksXG4gICAgICAgICAgdGFwKChuZXdTdGF0ZSkgPT4gdGhpcy5zdGF0ZVN1YmplY3QkLm5leHQobmV3U3RhdGUpKSxcbiAgICAgICAgICBjYXRjaEVycm9yKChlcnJvcjogdW5rbm93bikgPT4ge1xuICAgICAgICAgICAgaWYgKGlzU3luY1VwZGF0ZSkge1xuICAgICAgICAgICAgICBzeW5jRXJyb3IgPSBlcnJvcjtcbiAgICAgICAgICAgICAgcmV0dXJuIEVNUFRZO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gdGhyb3dFcnJvcihlcnJvcik7XG4gICAgICAgICAgfSksXG4gICAgICAgICAgdGFrZVVudGlsKHRoaXMuZGVzdHJveSQpXG4gICAgICAgIClcbiAgICAgICAgLnN1YnNjcmliZSgpO1xuXG4gICAgICBpZiAoc3luY0Vycm9yKSB7XG4gICAgICAgIHRocm93IHN5bmNFcnJvcjtcbiAgICAgIH1cbiAgICAgIGlzU3luY1VwZGF0ZSA9IGZhbHNlO1xuXG4gICAgICByZXR1cm4gc3Vic2NyaXB0aW9uO1xuICAgIH0pIGFzIHVua25vd24gYXMgUmV0dXJuVHlwZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplcyBzdGF0ZS4gSWYgaXQgd2FzIGFscmVhZHkgaW5pdGlhbGl6ZWQgdGhlbiBpdCByZXNldHMgdGhlXG4gICAqIHN0YXRlLlxuICAgKi9cbiAgcHJpdmF0ZSBpbml0U3RhdGUoc3RhdGU6IFQpOiB2b2lkIHtcbiAgICBzY2hlZHVsZWQoW3N0YXRlXSwgcXVldWVTY2hlZHVsZXIpLnN1YnNjcmliZSgocykgPT4ge1xuICAgICAgdGhpcy5pc0luaXRpYWxpemVkID0gdHJ1ZTtcbiAgICAgIHRoaXMuc3RhdGVTdWJqZWN0JC5uZXh0KHMpO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIFNldHMgdGhlIHN0YXRlIHNwZWNpZmljIHZhbHVlLlxuICAgKiBAcGFyYW0gc3RhdGVPclVwZGF0ZXJGbiBvYmplY3Qgb2YgdGhlIHNhbWUgdHlwZSBhcyB0aGUgc3RhdGUgb3IgYW5cbiAgICogdXBkYXRlckZuLCByZXR1cm5pbmcgc3VjaCBvYmplY3QuXG4gICAqL1xuICBzZXRTdGF0ZShzdGF0ZU9yVXBkYXRlckZuOiBUIHwgKChzdGF0ZTogVCkgPT4gVCkpOiB2b2lkIHtcbiAgICBpZiAodHlwZW9mIHN0YXRlT3JVcGRhdGVyRm4gIT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHRoaXMuaW5pdFN0YXRlKHN0YXRlT3JVcGRhdGVyRm4pO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnVwZGF0ZXIoc3RhdGVPclVwZGF0ZXJGbiBhcyAoc3RhdGU6IFQpID0+IFQpKCk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFBhdGNoZXMgdGhlIHN0YXRlIHdpdGggcHJvdmlkZWQgcGFydGlhbCBzdGF0ZS5cbiAgICpcbiAgICogQHBhcmFtIHBhcnRpYWxTdGF0ZU9yVXBkYXRlckZuIGEgcGFydGlhbCBzdGF0ZSBvciBhIHBhcnRpYWwgdXBkYXRlclxuICAgKiBmdW5jdGlvbiB0aGF0IGFjY2VwdHMgdGhlIHN0YXRlIGFuZCByZXR1cm5zIHRoZSBwYXJ0aWFsIHN0YXRlLlxuICAgKiBAdGhyb3dzIEVycm9yIGlmIHRoZSBzdGF0ZSBpcyBub3QgaW5pdGlhbGl6ZWQuXG4gICAqL1xuICBwYXRjaFN0YXRlKFxuICAgIHBhcnRpYWxTdGF0ZU9yVXBkYXRlckZuOlxuICAgICAgfCBQYXJ0aWFsPFQ+XG4gICAgICB8IE9ic2VydmFibGU8UGFydGlhbDxUPj5cbiAgICAgIHwgKChzdGF0ZTogVCkgPT4gUGFydGlhbDxUPilcbiAgKTogdm9pZCB7XG4gICAgY29uc3QgcGF0Y2hlZFN0YXRlID1cbiAgICAgIHR5cGVvZiBwYXJ0aWFsU3RhdGVPclVwZGF0ZXJGbiA9PT0gJ2Z1bmN0aW9uJ1xuICAgICAgICA/IHBhcnRpYWxTdGF0ZU9yVXBkYXRlckZuKHRoaXMuZ2V0KCkpXG4gICAgICAgIDogcGFydGlhbFN0YXRlT3JVcGRhdGVyRm47XG5cbiAgICB0aGlzLnVwZGF0ZXIoKHN0YXRlLCBwYXJ0aWFsU3RhdGU6IFBhcnRpYWw8VD4pID0+ICh7XG4gICAgICAuLi5zdGF0ZSxcbiAgICAgIC4uLnBhcnRpYWxTdGF0ZSxcbiAgICB9KSkocGF0Y2hlZFN0YXRlKTtcbiAgfVxuXG4gIHByb3RlY3RlZCBnZXQoKTogVDtcbiAgcHJvdGVjdGVkIGdldDxSPihwcm9qZWN0b3I6IChzOiBUKSA9PiBSKTogUjtcbiAgcHJvdGVjdGVkIGdldDxSPihwcm9qZWN0b3I/OiAoczogVCkgPT4gUik6IFIgfCBUIHtcbiAgICB0aGlzLmFzc2VydFN0YXRlSXNJbml0aWFsaXplZCgpO1xuICAgIGxldCB2YWx1ZTogUiB8IFQ7XG5cbiAgICB0aGlzLnN0YXRlU3ViamVjdCQucGlwZSh0YWtlKDEpKS5zdWJzY3JpYmUoKHN0YXRlKSA9PiB7XG4gICAgICB2YWx1ZSA9IHByb2plY3RvciA/IHByb2plY3RvcihzdGF0ZSkgOiBzdGF0ZTtcbiAgICB9KTtcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLW5vbi1udWxsLWFzc2VydGlvblxuICAgIHJldHVybiB2YWx1ZSE7XG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlcyBhIHNlbGVjdG9yLlxuICAgKlxuICAgKiBAcGFyYW0gcHJvamVjdG9yIEEgcHVyZSBwcm9qZWN0aW9uIGZ1bmN0aW9uIHRoYXQgdGFrZXMgdGhlIGN1cnJlbnQgc3RhdGUgYW5kXG4gICAqICAgcmV0dXJucyBzb21lIG5ldyBzbGljZS9wcm9qZWN0aW9uIG9mIHRoYXQgc3RhdGUuXG4gICAqIEBwYXJhbSBjb25maWcgU2VsZWN0Q29uZmlnIHRoYXQgY2hhbmdlcyB0aGUgYmVoYXZpb3Igb2Ygc2VsZWN0b3IsIGluY2x1ZGluZ1xuICAgKiAgIHRoZSBkZWJvdW5jaW5nIG9mIHRoZSB2YWx1ZXMgdW50aWwgdGhlIHN0YXRlIGlzIHNldHRsZWQuXG4gICAqIEByZXR1cm4gQW4gb2JzZXJ2YWJsZSBvZiB0aGUgcHJvamVjdG9yIHJlc3VsdHMuXG4gICAqL1xuICBzZWxlY3Q8UmVzdWx0PihcbiAgICBwcm9qZWN0b3I6IChzOiBUKSA9PiBSZXN1bHQsXG4gICAgY29uZmlnPzogU2VsZWN0Q29uZmlnPFJlc3VsdD5cbiAgKTogT2JzZXJ2YWJsZTxSZXN1bHQ+O1xuICBzZWxlY3Q8U2VsZWN0b3JzT2JqZWN0IGV4dGVuZHMgUmVjb3JkPHN0cmluZywgT2JzZXJ2YWJsZTx1bmtub3duPj4+KFxuICAgIHNlbGVjdG9yc09iamVjdDogU2VsZWN0b3JzT2JqZWN0LFxuICAgIGNvbmZpZz86IFNlbGVjdENvbmZpZzx7XG4gICAgICBbSyBpbiBrZXlvZiBTZWxlY3RvcnNPYmplY3RdOiBPYnNlcnZlZFZhbHVlT2Y8U2VsZWN0b3JzT2JqZWN0W0tdPjtcbiAgICB9PlxuICApOiBPYnNlcnZhYmxlPHtcbiAgICBbSyBpbiBrZXlvZiBTZWxlY3RvcnNPYmplY3RdOiBPYnNlcnZlZFZhbHVlT2Y8U2VsZWN0b3JzT2JqZWN0W0tdPjtcbiAgfT47XG4gIHNlbGVjdDxTZWxlY3RvcnMgZXh0ZW5kcyBPYnNlcnZhYmxlPHVua25vd24+W10sIFJlc3VsdD4oXG4gICAgLi4uc2VsZWN0b3JzV2l0aFByb2plY3RvcjogW1xuICAgICAgLi4uc2VsZWN0b3JzOiBTZWxlY3RvcnMsXG4gICAgICBwcm9qZWN0b3I6IFByb2plY3RvcjxTZWxlY3RvcnMsIFJlc3VsdD5cbiAgICBdXG4gICk6IE9ic2VydmFibGU8UmVzdWx0PjtcbiAgc2VsZWN0PFNlbGVjdG9ycyBleHRlbmRzIE9ic2VydmFibGU8dW5rbm93bj5bXSwgUmVzdWx0PihcbiAgICAuLi5zZWxlY3RvcnNXaXRoUHJvamVjdG9yQW5kQ29uZmlnOiBbXG4gICAgICAuLi5zZWxlY3RvcnM6IFNlbGVjdG9ycyxcbiAgICAgIHByb2plY3RvcjogUHJvamVjdG9yPFNlbGVjdG9ycywgUmVzdWx0PixcbiAgICAgIGNvbmZpZzogU2VsZWN0Q29uZmlnPFJlc3VsdD5cbiAgICBdXG4gICk6IE9ic2VydmFibGU8UmVzdWx0PjtcbiAgc2VsZWN0PFxuICAgIFNlbGVjdG9ycyBleHRlbmRzIEFycmF5PFxuICAgICAgT2JzZXJ2YWJsZTx1bmtub3duPiB8IFNlbGVjdENvbmZpZzxSZXN1bHQ+IHwgUHJvamVjdG9yRm4gfCBTZWxlY3RvcnNPYmplY3RcbiAgICA+LFxuICAgIFJlc3VsdCxcbiAgICBQcm9qZWN0b3JGbiBleHRlbmRzICguLi5hOiB1bmtub3duW10pID0+IFJlc3VsdCxcbiAgICBTZWxlY3RvcnNPYmplY3QgZXh0ZW5kcyBSZWNvcmQ8c3RyaW5nLCBPYnNlcnZhYmxlPHVua25vd24+PlxuICA+KC4uLmFyZ3M6IFNlbGVjdG9ycyk6IE9ic2VydmFibGU8UmVzdWx0PiB7XG4gICAgY29uc3QgeyBvYnNlcnZhYmxlc09yU2VsZWN0b3JzT2JqZWN0LCBwcm9qZWN0b3IsIGNvbmZpZyB9ID1cbiAgICAgIHByb2Nlc3NTZWxlY3RvckFyZ3M8U2VsZWN0b3JzLCBSZXN1bHQsIFByb2plY3RvckZuLCBTZWxlY3RvcnNPYmplY3Q+KFxuICAgICAgICBhcmdzXG4gICAgICApO1xuXG4gICAgY29uc3Qgc291cmNlJCA9IGhhc1Byb2plY3RGbk9ubHkob2JzZXJ2YWJsZXNPclNlbGVjdG9yc09iamVjdCwgcHJvamVjdG9yKVxuICAgICAgPyB0aGlzLnN0YXRlU3ViamVjdCRcbiAgICAgIDogY29tYmluZUxhdGVzdChvYnNlcnZhYmxlc09yU2VsZWN0b3JzT2JqZWN0IGFzIGFueSk7XG5cbiAgICByZXR1cm4gc291cmNlJC5waXBlKFxuICAgICAgY29uZmlnLmRlYm91bmNlID8gZGVib3VuY2VTeW5jKCkgOiBub29wT3BlcmF0b3IoKSxcbiAgICAgIChwcm9qZWN0b3JcbiAgICAgICAgPyBtYXAoKHByb2plY3RvckFyZ3MpID0+XG4gICAgICAgICAgICAvLyBwcm9qZWN0b3JBcmdzIGNvdWxkIGJlIGFuIEFycmF5IGluIGNhc2Ugd2hlcmUgdGhlIGVudGlyZSBzdGF0ZSBpcyBhbiBBcnJheSwgc28gYWRkaW5nIHRoaXMgY2hlY2tcbiAgICAgICAgICAgIChvYnNlcnZhYmxlc09yU2VsZWN0b3JzT2JqZWN0IGFzIE9ic2VydmFibGU8dW5rbm93bj5bXSkubGVuZ3RoID5cbiAgICAgICAgICAgICAgMCAmJiBBcnJheS5pc0FycmF5KHByb2plY3RvckFyZ3MpXG4gICAgICAgICAgICAgID8gcHJvamVjdG9yKC4uLnByb2plY3RvckFyZ3MpXG4gICAgICAgICAgICAgIDogcHJvamVjdG9yKHByb2plY3RvckFyZ3MpXG4gICAgICAgICAgKVxuICAgICAgICA6IG5vb3BPcGVyYXRvcigpKSBhcyAoKSA9PiBPYnNlcnZhYmxlPFJlc3VsdD4sXG4gICAgICBkaXN0aW5jdFVudGlsQ2hhbmdlZChjb25maWcuZXF1YWwpLFxuICAgICAgc2hhcmVSZXBsYXkoe1xuICAgICAgICByZWZDb3VudDogdHJ1ZSxcbiAgICAgICAgYnVmZmVyU2l6ZTogMSxcbiAgICAgIH0pLFxuICAgICAgdGFrZVVudGlsKHRoaXMuZGVzdHJveSQpXG4gICAgKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgc2lnbmFsIGZyb20gdGhlIHByb3ZpZGVkIHN0YXRlIHByb2plY3RvciBmdW5jdGlvbi5cbiAgICovXG4gIHNlbGVjdFNpZ25hbDxSZXN1bHQ+KFxuICAgIHByb2plY3RvcjogKHN0YXRlOiBUKSA9PiBSZXN1bHQsXG4gICAgb3B0aW9ucz86IFNlbGVjdFNpZ25hbE9wdGlvbnM8UmVzdWx0PlxuICApOiBTaWduYWw8UmVzdWx0PjtcbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBzaWduYWwgYnkgY29tYmluaW5nIHByb3ZpZGVkIHNpZ25hbHMuXG4gICAqL1xuICBzZWxlY3RTaWduYWw8U2lnbmFscyBleHRlbmRzIFNpZ25hbDx1bmtub3duPltdLCBSZXN1bHQ+KFxuICAgIC4uLmFyZ3M6IFsuLi5zaWduYWxzOiBTaWduYWxzLCBwcm9qZWN0b3I6IFNpZ25hbHNQcm9qZWN0b3I8U2lnbmFscywgUmVzdWx0Pl1cbiAgKTogU2lnbmFsPFJlc3VsdD47XG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgc2lnbmFsIGJ5IGNvbWJpbmluZyBwcm92aWRlZCBzaWduYWxzLlxuICAgKi9cbiAgc2VsZWN0U2lnbmFsPFNpZ25hbHMgZXh0ZW5kcyBTaWduYWw8dW5rbm93bj5bXSwgUmVzdWx0PihcbiAgICAuLi5hcmdzOiBbXG4gICAgICAuLi5zaWduYWxzOiBTaWduYWxzLFxuICAgICAgcHJvamVjdG9yOiBTaWduYWxzUHJvamVjdG9yPFNpZ25hbHMsIFJlc3VsdD4sXG4gICAgICBvcHRpb25zOiBTZWxlY3RTaWduYWxPcHRpb25zPFJlc3VsdD5cbiAgICBdXG4gICk6IFNpZ25hbDxSZXN1bHQ+O1xuICBzZWxlY3RTaWduYWwoXG4gICAgLi4uYXJnczpcbiAgICAgIHwgWyhzdGF0ZTogVCkgPT4gdW5rbm93biwgU2VsZWN0U2lnbmFsT3B0aW9uczx1bmtub3duPj9dXG4gICAgICB8IFtcbiAgICAgICAgICAuLi5zaWduYWxzOiBTaWduYWw8dW5rbm93bj5bXSxcbiAgICAgICAgICBwcm9qZWN0b3I6ICguLi52YWx1ZXM6IHVua25vd25bXSkgPT4gdW5rbm93blxuICAgICAgICBdXG4gICAgICB8IFtcbiAgICAgICAgICAuLi5zaWduYWxzOiBTaWduYWw8dW5rbm93bj5bXSxcbiAgICAgICAgICBwcm9qZWN0b3I6ICguLi52YWx1ZXM6IHVua25vd25bXSkgPT4gdW5rbm93bixcbiAgICAgICAgICBvcHRpb25zOiBTZWxlY3RTaWduYWxPcHRpb25zPHVua25vd24+XG4gICAgICAgIF1cbiAgKTogU2lnbmFsPHVua25vd24+IHtcbiAgICBjb25zdCBzZWxlY3RTaWduYWxBcmdzID0gWy4uLmFyZ3NdO1xuICAgIGNvbnN0IGRlZmF1bHRFcXVhbGl0eUZuOiBWYWx1ZUVxdWFsaXR5Rm48dW5rbm93bj4gPSAocHJldmlvdXMsIGN1cnJlbnQpID0+XG4gICAgICBwcmV2aW91cyA9PT0gY3VycmVudDtcblxuICAgIGNvbnN0IG9wdGlvbnM6IENyZWF0ZUNvbXB1dGVkT3B0aW9uczx1bmtub3duPiA9XG4gICAgICB0eXBlb2Ygc2VsZWN0U2lnbmFsQXJnc1thcmdzLmxlbmd0aCAtIDFdID09PSAnb2JqZWN0J1xuICAgICAgICA/IHtcbiAgICAgICAgICAgIGVxdWFsOlxuICAgICAgICAgICAgICAoc2VsZWN0U2lnbmFsQXJncy5wb3AoKSBhcyBTZWxlY3RTaWduYWxPcHRpb25zPHVua25vd24+KS5lcXVhbCB8fFxuICAgICAgICAgICAgICBkZWZhdWx0RXF1YWxpdHlGbixcbiAgICAgICAgICB9XG4gICAgICAgIDogeyBlcXVhbDogZGVmYXVsdEVxdWFsaXR5Rm4gfTtcbiAgICBjb25zdCBwcm9qZWN0b3IgPSBzZWxlY3RTaWduYWxBcmdzLnBvcCgpIGFzIChcbiAgICAgIC4uLnZhbHVlczogdW5rbm93bltdXG4gICAgKSA9PiB1bmtub3duO1xuICAgIGNvbnN0IHNpZ25hbHMgPSBzZWxlY3RTaWduYWxBcmdzIGFzIFNpZ25hbDx1bmtub3duPltdO1xuXG4gICAgY29uc3QgY29tcHV0YXRpb24gPVxuICAgICAgc2lnbmFscy5sZW5ndGggPT09IDBcbiAgICAgICAgPyAoKSA9PiBwcm9qZWN0b3IodGhpcy5zdGF0ZSgpKVxuICAgICAgICA6ICgpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHZhbHVlcyA9IHNpZ25hbHMubWFwKChzaWduYWwpID0+IHNpZ25hbCgpKTtcbiAgICAgICAgICAgIHJldHVybiBwcm9qZWN0b3IoLi4udmFsdWVzKTtcbiAgICAgICAgICB9O1xuXG4gICAgcmV0dXJuIGNvbXB1dGVkKGNvbXB1dGF0aW9uLCBvcHRpb25zKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGVzIGFuIGVmZmVjdC5cbiAgICpcbiAgICogVGhpcyBlZmZlY3QgaXMgc3Vic2NyaWJlZCB0byB0aHJvdWdob3V0IHRoZSBsaWZlY3ljbGUgb2YgdGhlIENvbXBvbmVudFN0b3JlLlxuICAgKiBAcGFyYW0gZ2VuZXJhdG9yIEEgZnVuY3Rpb24gdGhhdCB0YWtlcyBhbiBvcmlnaW4gT2JzZXJ2YWJsZSBpbnB1dCBhbmRcbiAgICogICAgIHJldHVybnMgYW4gT2JzZXJ2YWJsZS4gVGhlIE9ic2VydmFibGUgdGhhdCBpcyByZXR1cm5lZCB3aWxsIGJlXG4gICAqICAgICBzdWJzY3JpYmVkIHRvIGZvciB0aGUgbGlmZSBvZiB0aGUgY29tcG9uZW50LlxuICAgKiBAcmV0dXJuIEEgZnVuY3Rpb24gdGhhdCwgd2hlbiBjYWxsZWQsIHdpbGwgdHJpZ2dlciB0aGUgb3JpZ2luIE9ic2VydmFibGUuXG4gICAqL1xuICBlZmZlY3Q8XG4gICAgLy8gVGhpcyB0eXBlIHF1aWNrbHkgYmVjYW1lIHBhcnQgb2YgZWZmZWN0ICdBUEknXG4gICAgUHJvdmlkZWRUeXBlID0gdm9pZCxcbiAgICAvLyBUaGUgYWN0dWFsIG9yaWdpbiQgdHlwZSwgd2hpY2ggY291bGQgYmUgdW5rbm93biwgd2hlbiBub3Qgc3BlY2lmaWVkXG4gICAgT3JpZ2luVHlwZSBleHRlbmRzXG4gICAgICB8IE9ic2VydmFibGU8UHJvdmlkZWRUeXBlPlxuICAgICAgfCB1bmtub3duID0gT2JzZXJ2YWJsZTxQcm92aWRlZFR5cGU+LFxuICAgIC8vIFVud3JhcHBlZCBhY3R1YWwgdHlwZSBvZiB0aGUgb3JpZ2luJCBPYnNlcnZhYmxlLCBhZnRlciBkZWZhdWx0IHdhcyBhcHBsaWVkXG4gICAgT2JzZXJ2YWJsZVR5cGUgPSBPcmlnaW5UeXBlIGV4dGVuZHMgT2JzZXJ2YWJsZTxpbmZlciBBPiA/IEEgOiBuZXZlcixcbiAgICAvLyBSZXR1cm4gZWl0aGVyIGFuIG9wdGlvbmFsIGNhbGxiYWNrIG9yIGEgZnVuY3Rpb24gcmVxdWlyaW5nIHNwZWNpZmljIHR5cGVzIGFzIGlucHV0c1xuICAgIFJldHVyblR5cGUgPSBQcm92aWRlZFR5cGUgfCBPYnNlcnZhYmxlVHlwZSBleHRlbmRzIHZvaWRcbiAgICAgID8gKFxuICAgICAgICAgIG9ic2VydmFibGVPclZhbHVlPzogT2JzZXJ2YWJsZVR5cGUgfCBPYnNlcnZhYmxlPE9ic2VydmFibGVUeXBlPlxuICAgICAgICApID0+IFN1YnNjcmlwdGlvblxuICAgICAgOiAoXG4gICAgICAgICAgb2JzZXJ2YWJsZU9yVmFsdWU6IE9ic2VydmFibGVUeXBlIHwgT2JzZXJ2YWJsZTxPYnNlcnZhYmxlVHlwZT5cbiAgICAgICAgKSA9PiBTdWJzY3JpcHRpb25cbiAgPihnZW5lcmF0b3I6IChvcmlnaW4kOiBPcmlnaW5UeXBlKSA9PiBPYnNlcnZhYmxlPHVua25vd24+KTogUmV0dXJuVHlwZSB7XG4gICAgY29uc3Qgb3JpZ2luJCA9IG5ldyBTdWJqZWN0PE9ic2VydmFibGVUeXBlPigpO1xuICAgIGdlbmVyYXRvcihvcmlnaW4kIGFzIE9yaWdpblR5cGUpXG4gICAgICAvLyB0aWVkIHRvIHRoZSBsaWZlY3ljbGUg8J+RhyBvZiBDb21wb25lbnRTdG9yZVxuICAgICAgLnBpcGUodGFrZVVudGlsKHRoaXMuZGVzdHJveSQpKVxuICAgICAgLnN1YnNjcmliZSgpO1xuXG4gICAgcmV0dXJuICgoXG4gICAgICBvYnNlcnZhYmxlT3JWYWx1ZT86IE9ic2VydmFibGVUeXBlIHwgT2JzZXJ2YWJsZTxPYnNlcnZhYmxlVHlwZT5cbiAgICApOiBTdWJzY3JpcHRpb24gPT4ge1xuICAgICAgY29uc3Qgb2JzZXJ2YWJsZSQgPSBpc09ic2VydmFibGUob2JzZXJ2YWJsZU9yVmFsdWUpXG4gICAgICAgID8gb2JzZXJ2YWJsZU9yVmFsdWVcbiAgICAgICAgOiBvZihvYnNlcnZhYmxlT3JWYWx1ZSk7XG4gICAgICByZXR1cm4gb2JzZXJ2YWJsZSQucGlwZSh0YWtlVW50aWwodGhpcy5kZXN0cm95JCkpLnN1YnNjcmliZSgodmFsdWUpID0+IHtcbiAgICAgICAgLy8gYW55IG5ldyDwn5GHIHZhbHVlIGlzIHB1c2hlZCBpbnRvIGEgc3RyZWFtXG4gICAgICAgIG9yaWdpbiQubmV4dCh2YWx1ZSBhcyBPYnNlcnZhYmxlVHlwZSk7XG4gICAgICB9KTtcbiAgICB9KSBhcyB1bmtub3duIGFzIFJldHVyblR5cGU7XG4gIH1cblxuICAvKipcbiAgICogVXNlZCB0byBjaGVjayBpZiBsaWZlY3ljbGUgaG9va3MgYXJlIGRlZmluZWRcbiAgICogYnV0IG5vdCB1c2VkIHdpdGggcHJvdmlkZUNvbXBvbmVudFN0b3JlKClcbiAgICovXG4gIHByaXZhdGUgY2hlY2tQcm92aWRlckZvckhvb2tzKCkge1xuICAgIGFzYXBTY2hlZHVsZXIuc2NoZWR1bGUoKCkgPT4ge1xuICAgICAgaWYgKFxuICAgICAgICBpc0Rldk1vZGUoKSAmJlxuICAgICAgICAoaXNPblN0b3JlSW5pdERlZmluZWQodGhpcykgfHwgaXNPblN0YXRlSW5pdERlZmluZWQodGhpcykpICYmXG4gICAgICAgICF0aGlzLsm1aGFzUHJvdmlkZXJcbiAgICAgICkge1xuICAgICAgICBjb25zdCB3YXJuaW5ncyA9IFtcbiAgICAgICAgICBpc09uU3RvcmVJbml0RGVmaW5lZCh0aGlzKSA/ICdPblN0b3JlSW5pdCcgOiAnJyxcbiAgICAgICAgICBpc09uU3RhdGVJbml0RGVmaW5lZCh0aGlzKSA/ICdPblN0YXRlSW5pdCcgOiAnJyxcbiAgICAgICAgXS5maWx0ZXIoKGRlZmluZWQpID0+IGRlZmluZWQpO1xuXG4gICAgICAgIGNvbnNvbGUud2FybihcbiAgICAgICAgICBgQG5ncngvY29tcG9uZW50LXN0b3JlOiAke1xuICAgICAgICAgICAgdGhpcy5jb25zdHJ1Y3Rvci5uYW1lXG4gICAgICAgICAgfSBoYXMgdGhlICR7d2FybmluZ3Muam9pbignIGFuZCAnKX0gYCArXG4gICAgICAgICAgICAnbGlmZWN5Y2xlIGhvb2socykgaW1wbGVtZW50ZWQgd2l0aG91dCBiZWluZyBwcm92aWRlZCB1c2luZyB0aGUgJyArXG4gICAgICAgICAgICBgcHJvdmlkZUNvbXBvbmVudFN0b3JlKCR7dGhpcy5jb25zdHJ1Y3Rvci5uYW1lfSkgZnVuY3Rpb24uIGAgK1xuICAgICAgICAgICAgYFRvIHJlc29sdmUgdGhpcywgcHJvdmlkZSB0aGUgY29tcG9uZW50IHN0b3JlIHZpYSBwcm92aWRlQ29tcG9uZW50U3RvcmUoJHt0aGlzLmNvbnN0cnVjdG9yLm5hbWV9KWBcbiAgICAgICAgKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgYXNzZXJ0U3RhdGVJc0luaXRpYWxpemVkKCk6IHZvaWQge1xuICAgIGlmICghdGhpcy5pc0luaXRpYWxpemVkKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgIGAke3RoaXMuY29uc3RydWN0b3IubmFtZX0gaGFzIG5vdCBiZWVuIGluaXRpYWxpemVkIHlldC4gYCArXG4gICAgICAgICAgYFBsZWFzZSBtYWtlIHN1cmUgaXQgaXMgaW5pdGlhbGl6ZWQgYmVmb3JlIHVwZGF0aW5nL2dldHRpbmcuYFxuICAgICAgKTtcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gcHJvY2Vzc1NlbGVjdG9yQXJnczxcbiAgU2VsZWN0b3JzIGV4dGVuZHMgQXJyYXk8XG4gICAgT2JzZXJ2YWJsZTx1bmtub3duPiB8IFNlbGVjdENvbmZpZzxSZXN1bHQ+IHwgUHJvamVjdG9yRm4gfCBTZWxlY3RvcnNPYmplY3RcbiAgPixcbiAgUmVzdWx0LFxuICBQcm9qZWN0b3JGbiBleHRlbmRzICguLi5hOiB1bmtub3duW10pID0+IFJlc3VsdCxcbiAgU2VsZWN0b3JzT2JqZWN0IGV4dGVuZHMgUmVjb3JkPHN0cmluZywgT2JzZXJ2YWJsZTx1bmtub3duPj5cbj4oXG4gIGFyZ3M6IFNlbGVjdG9yc1xuKTpcbiAgfCB7XG4gICAgICBvYnNlcnZhYmxlc09yU2VsZWN0b3JzT2JqZWN0OiBPYnNlcnZhYmxlPHVua25vd24+W107XG4gICAgICBwcm9qZWN0b3I6IFByb2plY3RvckZuO1xuICAgICAgY29uZmlnOiBSZXF1aXJlZDxTZWxlY3RDb25maWc8UmVzdWx0Pj47XG4gICAgfVxuICB8IHtcbiAgICAgIG9ic2VydmFibGVzT3JTZWxlY3RvcnNPYmplY3Q6IFNlbGVjdG9yc09iamVjdDtcbiAgICAgIHByb2plY3RvcjogdW5kZWZpbmVkO1xuICAgICAgY29uZmlnOiBSZXF1aXJlZDxTZWxlY3RDb25maWc8UmVzdWx0Pj47XG4gICAgfSB7XG4gIGNvbnN0IHNlbGVjdG9yQXJncyA9IEFycmF5LmZyb20oYXJncyk7XG4gIGNvbnN0IGRlZmF1bHRFcXVhbGl0eUZuOiBWYWx1ZUVxdWFsaXR5Rm48UmVzdWx0PiA9IChwcmV2aW91cywgY3VycmVudCkgPT5cbiAgICBwcmV2aW91cyA9PT0gY3VycmVudDtcblxuICAvLyBBc3NpZ24gZGVmYXVsdCB2YWx1ZXMuXG4gIGxldCBjb25maWc6IFJlcXVpcmVkPFNlbGVjdENvbmZpZzxSZXN1bHQ+PiA9IHtcbiAgICBkZWJvdW5jZTogZmFsc2UsXG4gICAgZXF1YWw6IGRlZmF1bHRFcXVhbGl0eUZuLFxuICB9O1xuXG4gIC8vIExhc3QgYXJndW1lbnQgaXMgZWl0aGVyIGNvbmZpZyBvciBwcm9qZWN0b3Igb3Igc2VsZWN0b3JzT2JqZWN0XG4gIGlmIChpc1NlbGVjdENvbmZpZyhzZWxlY3RvckFyZ3Nbc2VsZWN0b3JBcmdzLmxlbmd0aCAtIDFdKSkge1xuICAgIGNvbmZpZyA9IHsgLi4uY29uZmlnLCAuLi5zZWxlY3RvckFyZ3MucG9wKCkgfTtcbiAgfVxuXG4gIC8vIEF0IHRoaXMgcG9pbnQgc2VsZWN0b3JBcmdzIGlzIGVpdGhlciBwcm9qZWN0b3IsIHNlbGVjdG9ycyB3aXRoIHByb2plY3RvciBvciBzZWxlY3RvcnNPYmplY3RcbiAgaWYgKHNlbGVjdG9yQXJncy5sZW5ndGggPT09IDEgJiYgdHlwZW9mIHNlbGVjdG9yQXJnc1swXSAhPT0gJ2Z1bmN0aW9uJykge1xuICAgIC8vIHRoaXMgaXMgYSBzZWxlY3RvcnNPYmplY3RcbiAgICByZXR1cm4ge1xuICAgICAgb2JzZXJ2YWJsZXNPclNlbGVjdG9yc09iamVjdDogc2VsZWN0b3JBcmdzWzBdIGFzIFNlbGVjdG9yc09iamVjdCxcbiAgICAgIHByb2plY3RvcjogdW5kZWZpbmVkLFxuICAgICAgY29uZmlnLFxuICAgIH07XG4gIH1cblxuICBjb25zdCBwcm9qZWN0b3IgPSBzZWxlY3RvckFyZ3MucG9wKCkgYXMgUHJvamVjdG9yRm47XG5cbiAgLy8gVGhlIE9ic2VydmFibGVzIHRvIGNvbWJpbmUsIGlmIHRoZXJlIGFyZSBhbnkgbGVmdC5cbiAgY29uc3Qgb2JzZXJ2YWJsZXMgPSBzZWxlY3RvckFyZ3MgYXMgT2JzZXJ2YWJsZTx1bmtub3duPltdO1xuICByZXR1cm4ge1xuICAgIG9ic2VydmFibGVzT3JTZWxlY3RvcnNPYmplY3Q6IG9ic2VydmFibGVzLFxuICAgIHByb2plY3RvcixcbiAgICBjb25maWcsXG4gIH07XG59XG5cbmZ1bmN0aW9uIGlzU2VsZWN0Q29uZmlnKFxuICBhcmc6IFNlbGVjdENvbmZpZzx1bmtub3duPiB8IHVua25vd25cbik6IGFyZyBpcyBTZWxlY3RDb25maWc8dW5rbm93bj4ge1xuICBjb25zdCB0eXBlZEFyZyA9IGFyZyBhcyBTZWxlY3RDb25maWc8dW5rbm93bj47XG4gIHJldHVybiAoXG4gICAgdHlwZW9mIHR5cGVkQXJnLmRlYm91bmNlICE9PSAndW5kZWZpbmVkJyB8fFxuICAgIHR5cGVvZiB0eXBlZEFyZy5lcXVhbCAhPT0gJ3VuZGVmaW5lZCdcbiAgKTtcbn1cblxuZnVuY3Rpb24gaGFzUHJvamVjdEZuT25seShcbiAgb2JzZXJ2YWJsZXNPclNlbGVjdG9yc09iamVjdDogdW5rbm93bltdIHwgUmVjb3JkPHN0cmluZywgdW5rbm93bj4sXG4gIHByb2plY3RvcjogdW5rbm93blxuKSB7XG4gIHJldHVybiAoXG4gICAgQXJyYXkuaXNBcnJheShvYnNlcnZhYmxlc09yU2VsZWN0b3JzT2JqZWN0KSAmJlxuICAgIG9ic2VydmFibGVzT3JTZWxlY3RvcnNPYmplY3QubGVuZ3RoID09PSAwICYmXG4gICAgcHJvamVjdG9yXG4gICk7XG59XG5cbmZ1bmN0aW9uIG5vb3BPcGVyYXRvcigpOiA8VD4oc291cmNlJDogT2JzZXJ2YWJsZTxUPikgPT4gdHlwZW9mIHNvdXJjZSQge1xuICByZXR1cm4gKHNvdXJjZSQpID0+IHNvdXJjZSQ7XG59XG4iXX0=