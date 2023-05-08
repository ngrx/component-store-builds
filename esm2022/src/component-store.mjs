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
        if (args.length === 1) {
            const projector = args[0];
            return computed(() => projector(this.state()));
        }
        const optionsOrProjector = args[args.length - 1];
        if (typeof optionsOrProjector === 'function') {
            const signals = args.slice(0, -1);
            return computed(() => {
                const values = signals.map((signal) => signal());
                return optionsOrProjector(...values);
            });
        }
        if (args.length === 2) {
            const projector = args[0];
            return computed(() => projector(this.state()), optionsOrProjector);
        }
        const signals = args.slice(0, -2);
        const projector = args[args.length - 2];
        return computed(() => {
            const values = signals.map((signal) => signal());
            return projector(...values);
        }, optionsOrProjector);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcG9uZW50LXN0b3JlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vbW9kdWxlcy9jb21wb25lbnQtc3RvcmUvc3JjL2NvbXBvbmVudC1zdG9yZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQ0wsWUFBWSxFQUVaLEVBQUUsRUFDRixhQUFhLEVBRWIsVUFBVSxFQUNWLGFBQWEsRUFDYixPQUFPLEVBQ1AsY0FBYyxFQUNkLFNBQVMsRUFDVCxhQUFhLEVBQ2IsS0FBSyxHQUVOLE1BQU0sTUFBTSxDQUFDO0FBQ2QsT0FBTyxFQUNMLFNBQVMsRUFDVCxjQUFjLEVBQ2QsR0FBRyxFQUNILG9CQUFvQixFQUNwQixXQUFXLEVBQ1gsSUFBSSxFQUNKLEdBQUcsRUFDSCxVQUFVLEVBQ1YsU0FBUyxHQUNWLE1BQU0sZ0JBQWdCLENBQUM7QUFDeEIsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBQy9DLE9BQU8sRUFDTCxVQUFVLEVBRVYsUUFBUSxFQUNSLGNBQWMsRUFDZCxNQUFNLEVBQ04sU0FBUyxFQUVULFFBQVEsR0FFVCxNQUFNLGVBQWUsQ0FBQztBQUN2QixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQztBQUMvRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sNEJBQTRCLENBQUM7O0FBTXRELE1BQU0sQ0FBQyxNQUFNLG1CQUFtQixHQUFHLElBQUksY0FBYyxDQUNuRCxxQ0FBcUMsQ0FDdEMsQ0FBQztBQTJCRixNQUNhLGNBQWM7SUFnQnpCLFlBQXFELFlBQWdCO1FBZnJFLHNDQUFzQztRQUNyQixvQkFBZSxHQUFHLElBQUksYUFBYSxDQUFPLENBQUMsQ0FBQyxDQUFDO1FBQzlELDhEQUE4RDtRQUNyRCxhQUFRLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxZQUFZLEVBQUUsQ0FBQztRQUV2QyxrQkFBYSxHQUFHLElBQUksYUFBYSxD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QUFDLENBQUMsQ0FBQyxLQUFLLFVBQVUsRUFBRTtRQUN0RSw0QkFBNEI7UUFDNUIsT0FBTztZQUNMLDRCQUE0QixFQUFFLFlBQVksQ0FBQyxDQUFDLENBQW9CO1lBQ2hFLFNBQVMsRUFBRSxTQUFTO1lBQ3BCLE1BQU07U0FDUCxDQUFDO0tBQ0g7SUFFRCxNQUFNLFNBQVMsR0FBRyxZQUFZLENBQUMsR0FBRyxFQUFpQixDQUFDO0lBRXBELHFEQUFxRDtJQUNyRCxNQUFNLFdBQVcsR0FBRyxZQUFxQyxDQUFDO0lBQzFELE9BQU87UUFDTCw0QkFBNEIsRUFBRSxXQUFXO1FBQ3pDLFNBQVM7UUFDVCxNQUFNO0tBQ1AsQ0FBQztBQUNKLENBQUM7QUFFRCxTQUFTLGNBQWMsQ0FBQyxHQUEyQjtJQUNqRCxPQUFPLE9BQVEsR0FBb0IsQ0FBQyxRQUFRLEtBQUssV0FBVyxDQUFDO0FBQy9ELENBQUM7QUFFRCxTQUFTLGdCQUFnQixDQUN2Qiw0QkFBaUUsRUFDakUsU0FBa0I7SUFFbEIsT0FBTyxDQUNMLEtBQUssQ0FBQyxPQUFPLENBQUMsNEJBQTRCLENBQUM7UUFDM0MsNEJBQTRCLENBQUMsTUFBTSxLQUFLLENBQUM7UUFDekMsU0FBUyxDQUNWLENBQUM7QUFDSixDQUFDO0FBRUQsU0FBUyxZQUFZO0lBQ25CLE9BQU8sQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLE9BQU8sQ0FBQztBQUM5QixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtcbiAgaXNPYnNlcnZhYmxlLFxuICBPYnNlcnZhYmxlLFxuICBvZixcbiAgUmVwbGF5U3ViamVjdCxcbiAgU3Vic2NyaXB0aW9uLFxuICB0aHJvd0Vycm9yLFxuICBjb21iaW5lTGF0ZXN0LFxuICBTdWJqZWN0LFxuICBxdWV1ZVNjaGVkdWxlcixcbiAgc2NoZWR1bGVkLFxuICBhc2FwU2NoZWR1bGVyLFxuICBFTVBUWSxcbiAgT2JzZXJ2ZWRWYWx1ZU9mLFxufSBmcm9tICdyeGpzJztcbmltcG9ydCB7XG4gIHRha2VVbnRpbCxcbiAgd2l0aExhdGVzdEZyb20sXG4gIG1hcCxcbiAgZGlzdGluY3RVbnRpbENoYW5nZWQsXG4gIHNoYXJlUmVwbGF5LFxuICB0YWtlLFxuICB0YXAsXG4gIGNhdGNoRXJyb3IsXG4gIG9ic2VydmVPbixcbn0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0IHsgZGVib3VuY2VTeW5jIH0gZnJvbSAnLi9kZWJvdW5jZS1zeW5jJztcbmltcG9ydCB7XG4gIEluamVjdGFibGUsXG4gIE9uRGVzdHJveSxcbiAgT3B0aW9uYWwsXG4gIEluamVjdGlvblRva2VuLFxuICBJbmplY3QsXG4gIGlzRGV2TW9kZSxcbiAgU2lnbmFsLFxuICBjb21wdXRlZCxcbiAgdHlwZSBWYWx1ZUVxdWFsaXR5Rm4sXG59IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0IHsgaXNPblN0YXRlSW5pdERlZmluZWQsIGlzT25TdG9yZUluaXREZWZpbmVkIH0gZnJvbSAnLi9saWZlY3ljbGVfaG9va3MnO1xuaW1wb3J0IHsgdG9TaWduYWwgfSBmcm9tICdAYW5ndWxhci9jb3JlL3J4anMtaW50ZXJvcCc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgU2VsZWN0Q29uZmlnIHtcbiAgZGVib3VuY2U/OiBib29sZWFuO1xufVxuXG5leHBvcnQgY29uc3QgSU5JVElBTF9TVEFURV9UT0tFTiA9IG5ldyBJbmplY3Rpb25Ub2tlbihcbiAgJ0BuZ3J4L2NvbXBvbmVudC1zdG9yZSBJbml0aWFsIFN0YXRlJ1xuKTtcblxuZXhwb3J0IHR5cGUgU2VsZWN0b3JSZXN1bHRzPFNlbGVjdG9ycyBleHRlbmRzIE9ic2VydmFibGU8dW5rbm93bj5bXT4gPSB7XG4gIFtLZXkgaW4ga2V5b2YgU2VsZWN0b3JzXTogU2VsZWN0b3JzW0tleV0gZXh0ZW5kcyBPYnNlcnZhYmxlPGluZmVyIFU+XG4gICAgPyBVXG4gICAgOiBuZXZlcjtcbn07XG5cbmV4cG9ydCB0eXBlIFByb2plY3RvcjxTZWxlY3RvcnMgZXh0ZW5kcyBPYnNlcnZhYmxlPHVua25vd24+W10sIFJlc3VsdD4gPSAoXG4gIC4uLmFyZ3M6IFNlbGVjdG9yUmVzdWx0czxTZWxlY3RvcnM+XG4pID0+IFJlc3VsdDtcblxudHlwZSBTaWduYWxzUHJvamVjdG9yPFNpZ25hbHMgZXh0ZW5kcyBTaWduYWw8dW5rbm93bj5bXSwgUmVzdWx0PiA9IChcbiAgLi4udmFsdWVzOiB7XG4gICAgW0tleSBpbiBrZXlvZiBTaWduYWxzXTogU2lnbmFsc1tLZXldIGV4dGVuZHMgU2lnbmFsPGluZmVyIFZhbHVlPlxuICAgICAgPyBWYWx1ZVxuICAgICAgOiBuZXZlcjtcbiAgfVxuKSA9PiBSZXN1bHQ7XG5cbmludGVyZmFjZSBTZWxlY3RTaWduYWxPcHRpb25zPFQ+IHtcbiAgLyoqXG4gICAqIEEgY29tcGFyaXNvbiBmdW5jdGlvbiB3aGljaCBkZWZpbmVzIGVxdWFsaXR5IGZvciBzZWxlY3QgcmVzdWx0cy5cbiAgICovXG4gIGVxdWFsPzogVmFsdWVFcXVhbGl0eUZuPFQ+O1xufVxuXG5ASW5qZWN0YWJsZSgpXG5leHBvcnQgY2xhc3MgQ29tcG9uZW50U3RvcmU8VCBleHRlbmRzIG9iamVjdD4gaW1wbGVtZW50cyBPbkRlc3Ryb3kge1xuICAvLyBTaG91bGQgYmUgdXNlZCBvbmx5IGluIG5nT25EZXN0cm95LlxuICBwcml2YXRlIHJlYWRvbmx5IGRlc3Ryb3lTdWJqZWN0JCA9IG5ldyBSZXBsYXlTdWJqZWN0PHZvaWQ+KDEpO1xuICAvLyBFeHBvc2VkIHRvIGFueSBleHRlbmRpbmcgU3RvcmUgdG8gYmUgdXNlZCBmb3IgdGhlIHRlYXJkb3duLlxuICByZWFkb25seSBkZXN0cm95JCA9IHRoaXMuZGVzdHJveVN1YmplY3QkLmFzT2JzZXJ2YWJsZSgpO1xuXG4gIHByaXZhdGUgcmVhZG9ubHkgc3RhdGVTdWJqZWN0JCA9IG5ldyBSZXBsYXlTdWJqZWN0PFQ+KDEpO1xuICBwcml2YXRlIGlzSW5pdGlhbGl6ZWQgPSBmYWxzZTtcbiAgLy8gTmVlZHMgdG8gYmUgYWZ0ZXIgZGVzdHJveSQgaXMgZGVjbGFyZWQgYmVjYXVzZSBpdCdzIHVzZWQgaW4gc2VsZWN0LlxuICByZWFkb25seSBzdGF0ZSQ6IE9ic2VydmFibGU8VD4gPSB0aGlzLnNlbGVjdCgocykgPT4gcyk7XG4gIHJlYWRvbmx5IHN0YXRlOiBTaWduYWw8VD4gPSB0b1NpZ25hbChcbiAgICB0aGlzLnN0YXRlU3ViamVjdCQucGlwZSh0YWtlVW50aWwodGhpcy5kZXN0cm95JCkpLFxuICAgIHsgcmVxdWlyZVN5bmM6IGZhbHNlLCBtYW51YWxDbGVhbnVwOiB0cnVlIH1cbiAgKSBhcyBTaWduYWw8VD47XG4gIHByaXZhdGUgybVoYXNQcm92aWRlciA9IGZhbHNlO1xuXG4gIGNvbnN0cnVjdG9yKEBPcHRpb25hbCgpIEBJbmplY3QoSU5JVElBTF9TVEFURV9UT0tFTikgZGVmYXVsdFN0YXRlPzogVCkge1xuICAgIC8vIFN0YXRlIGNhbiBiZSBpbml0aWFsaXplZCBlaXRoZXIgdGhyb3VnaCBjb25zdHJ1Y3RvciBvciBzZXRTdGF0ZS5cbiAgICBpZiAoZGVmYXVsdFN0YXRlKSB7XG4gICAgICB0aGlzLmluaXRTdGF0ZShkZWZhdWx0U3RhdGUpO1xuICAgIH1cblxuICAgIHRoaXMuY2hlY2tQcm92aWRlckZvckhvb2tzKCk7XG4gIH1cblxuICAvKiogQ29tcGxldGVzIGFsbCByZWxldmFudCBPYnNlcnZhYmxlIHN0cmVhbXMuICovXG4gIG5nT25EZXN0cm95KCkge1xuICAgIHRoaXMuc3RhdGVTdWJqZWN0JC5jb21wbGV0ZSgpO1xuICAgIHRoaXMuZGVzdHJveVN1YmplY3QkLm5leHQoKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGVzIGFuIHVwZGF0ZXIuXG4gICAqXG4gICAqIFRocm93cyBhbiBlcnJvciBpZiB1cGRhdGVyIGlzIGNhbGxlZCB3aXRoIHN5bmNocm9ub3VzIHZhbHVlcyAoZWl0aGVyXG4gICAqIGltcGVyYXRpdmUgdmFsdWUgb3IgT2JzZXJ2YWJsZSB0aGF0IGlzIHN5bmNocm9ub3VzKSBiZWZvcmUgQ29tcG9uZW50U3RvcmVcbiAgICogaXMgaW5pdGlhbGl6ZWQuIElmIGNhbGxlZCB3aXRoIGFzeW5jIE9ic2VydmFibGUgYmVmb3JlIGluaXRpYWxpemF0aW9uIHRoZW5cbiAgICogc3RhdGUgd2lsbCBub3QgYmUgdXBkYXRlZCBhbmQgc3Vic2NyaXB0aW9uIHdvdWxkIGJlIGNsb3NlZC5cbiAgICpcbiAgICogQHBhcmFtIHVwZGF0ZXJGbiBBIHN0YXRpYyB1cGRhdGVyIGZ1bmN0aW9uIHRoYXQgdGFrZXMgMiBwYXJhbWV0ZXJzICh0aGVcbiAgICogY3VycmVudCBzdGF0ZSBhbmQgYW4gYXJndW1lbnQgb2JqZWN0KSBhbmQgcmV0dXJucyBhIG5ldyBpbnN0YW5jZSBvZiB0aGVcbiAgICogc3RhdGUuXG4gICAqIEByZXR1cm4gQSBmdW5jdGlvbiB0aGF0IGFjY2VwdHMgb25lIGFyZ3VtZW50IHdoaWNoIGlzIGZvcndhcmRlZCBhcyB0aGVcbiAgICogICAgIHNlY29uZCBhcmd1bWVudCB0byBgdXBkYXRlckZuYC4gRXZlcnkgdGltZSB0aGlzIGZ1bmN0aW9uIGlzIGNhbGxlZFxuICAgKiAgICAgc3Vic2NyaWJlcnMgd2lsbCBiZSBub3RpZmllZCBvZiB0aGUgc3RhdGUgY2hhbmdlLlxuICAgKi9cbiAgdXBkYXRlcjxcbiAgICAvLyBBbGxvdyB0byBmb3JjZS1wcm92aWRlIHRoZSB0eXBlXG4gICAgUHJvdmlkZWRUeXBlID0gdm9pZCxcbiAgICAvLyBUaGlzIHR5cGUgaXMgZGVyaXZlZCBmcm9tIHRoZSBgdmFsdWVgIHByb3BlcnR5LCBkZWZhdWx0aW5nIHRvIHZvaWQgaWYgaXQncyBtaXNzaW5nXG4gICAgT3JpZ2luVHlwZSA9IFByb3ZpZGVkVHlwZSxcbiAgICAvLyBUaGUgVmFsdWUgdHlwZSBpcyBhc3NpZ25lZCBmcm9tIHRoZSBPcmlnaW5cbiAgICBWYWx1ZVR5cGUgPSBPcmlnaW5UeXBlLFxuICAgIC8vIFJldHVybiBlaXRoZXIgYW4gZW1wdHkgY2FsbGJhY2sgb3IgYSBmdW5jdGlvbiByZXF1aXJpbmcgc3BlY2lmaWMgdHlwZXMgYXMgaW5wdXRzXG4gICAgUmV0dXJuVHlwZSA9IE9yaWdpblR5cGUgZXh0ZW5kcyB2b2lkXG4gICAgICA/ICgpID0+IHZvaWRcbiAgICAgIDogKG9ic2VydmFibGVPclZhbHVlOiBWYWx1ZVR5cGUgfCBPYnNlcnZhYmxlPFZhbHVlVHlwZT4pID0+IFN1YnNjcmlwdGlvblxuICA+KHVwZGF0ZXJGbjogKHN0YXRlOiBULCB2YWx1ZTogT3JpZ2luVHlwZSkgPT4gVCk6IFJldHVyblR5cGUge1xuICAgIHJldHVybiAoKFxuICAgICAgb2JzZXJ2YWJsZU9yVmFsdWU/OiBPcmlnaW5UeXBlIHwgT2JzZXJ2YWJsZTxPcmlnaW5UeXBlPlxuICAgICk6IFN1YnNjcmlwdGlvbiA9PiB7XG4gICAgICAvLyBXZSBuZWVkIHRvIGV4cGxpY2l0bHkgdGhyb3cgYW4gZXJyb3IgaWYgYSBzeW5jaHJvbm91cyBlcnJvciBvY2N1cnMuXG4gICAgICAvLyBUaGlzIGlzIG5lY2Vzc2FyeSB0byBtYWtlIHN5bmNocm9ub3VzIGVycm9ycyBjYXRjaGFibGUuXG4gICAgICBsZXQgaXNTeW5jVXBkYXRlID0gdHJ1ZTtcbiAgICAgIGxldCBzeW5jRXJyb3I6IHVua25vd247XG4gICAgICAvLyBXZSBjYW4gcmVjZWl2ZSBlaXRoZXIgdGhlIHZhbHVlIG9yIGFuIG9ic2VydmFibGUuIEluIGNhc2UgaXQncyBhXG4gICAgICAvLyBzaW1wbGUgdmFsdWUsIHdlJ2xsIHdyYXAgaXQgd2l0aCBgb2ZgIG9wZXJhdG9yIHRvIHR1cm4gaXQgaW50b1xuICAgICAgLy8gT2JzZXJ2YWJsZS5cbiAgICAgIGNvbnN0IG9ic2VydmFibGUkID0gaXNPYnNlcnZhYmxlKG9ic2VydmFibGVPclZhbHVlKVxuICAgICAgICA/IG9ic2VydmFibGVPclZhbHVlXG4gICAgICAgIDogb2Yob2JzZXJ2YWJsZU9yVmFsdWUpO1xuICAgICAgY29uc3Qgc3Vic2NyaXB0aW9uID0gb2JzZXJ2YWJsZSRcbiAgICAgICAgLnBpcGUoXG4gICAgICAgICAgLy8gUHVzaCB0aGUgdmFsdWUgaW50byBxdWV1ZVNjaGVkdWxlclxuICAgICAgICAgIG9ic2VydmVPbihxdWV1ZVNjaGVkdWxlciksXG4gICAgICAgICAgLy8gSWYgdGhlIHN0YXRlIGlzIG5vdCBpbml0aWFsaXplZCB5ZXQsIHdlJ2xsIHRocm93IGFuIGVycm9yLlxuICAgICAgICAgIHRhcCgoKSA9PiB0aGlzLmFzc2VydFN0YXRlSXNJbml0aWFsaXplZCgpKSxcbiAgICAgICAgICB3aXRoTGF0ZXN0RnJvbSh0aGlzLnN0YXRlU3ViamVjdCQpLFxuICAgICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tbm9uLW51bGwtYXNzZXJ0aW9uXG4gICAgICAgICAgbWFwKChbdmFsdWUsIGN1cnJlbnRTdGF0ZV0pID0+IHVwZGF0ZXJGbihjdXJyZW50U3RhdGUsIHZhbHVlISkpLFxuICAgICAgICAgIHRhcCgobmV3U3RhdGUpID0+IHRoaXMuc3RhdGVTdWJqZWN0JC5uZXh0KG5ld1N0YXRlKSksXG4gICAgICAgICAgY2F0Y2hFcnJvcigoZXJyb3I6IHVua25vd24pID0+IHtcbiAgICAgICAgICAgIGlmIChpc1N5bmNVcGRhdGUpIHtcbiAgICAgICAgICAgICAgc3luY0Vycm9yID0gZXJyb3I7XG4gICAgICAgICAgICAgIHJldHVybiBFTVBUWTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIHRocm93RXJyb3IoZXJyb3IpO1xuICAgICAgICAgIH0pLFxuICAgICAgICAgIHRha2VVbnRpbCh0aGlzLmRlc3Ryb3kkKVxuICAgICAgICApXG4gICAgICAgIC5zdWJzY3JpYmUoKTtcblxuICAgICAgaWYgKHN5bmNFcnJvcikge1xuICAgICAgICB0aHJvdyBzeW5jRXJyb3I7XG4gICAgICB9XG4gICAgICBpc1N5bmNVcGRhdGUgPSBmYWxzZTtcblxuICAgICAgcmV0dXJuIHN1YnNjcmlwdGlvbjtcbiAgICB9KSBhcyB1bmtub3duIGFzIFJldHVyblR5cGU7XG4gIH1cblxuICAvKipcbiAgICogSW5pdGlhbGl6ZXMgc3RhdGUuIElmIGl0IHdhcyBhbHJlYWR5IGluaXRpYWxpemVkIHRoZW4gaXQgcmVzZXRzIHRoZVxuICAgKiBzdGF0ZS5cbiAgICovXG4gIHByaXZhdGUgaW5pdFN0YXRlKHN0YXRlOiBUKTogdm9pZCB7XG4gICAgc2NoZWR1bGVkKFtzdGF0ZV0sIHF1ZXVlU2NoZWR1bGVyKS5zdWJzY3JpYmUoKHMpID0+IHtcbiAgICAgIHRoaXMuaXNJbml0aWFsaXplZCA9IHRydWU7XG4gICAgICB0aGlzLnN0YXRlU3ViamVjdCQubmV4dChzKTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBTZXRzIHRoZSBzdGF0ZSBzcGVjaWZpYyB2YWx1ZS5cbiAgICogQHBhcmFtIHN0YXRlT3JVcGRhdGVyRm4gb2JqZWN0IG9mIHRoZSBzYW1lIHR5cGUgYXMgdGhlIHN0YXRlIG9yIGFuXG4gICAqIHVwZGF0ZXJGbiwgcmV0dXJuaW5nIHN1Y2ggb2JqZWN0LlxuICAgKi9cbiAgc2V0U3RhdGUoc3RhdGVPclVwZGF0ZXJGbjogVCB8ICgoc3RhdGU6IFQpID0+IFQpKTogdm9pZCB7XG4gICAgaWYgKHR5cGVvZiBzdGF0ZU9yVXBkYXRlckZuICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICB0aGlzLmluaXRTdGF0ZShzdGF0ZU9yVXBkYXRlckZuKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy51cGRhdGVyKHN0YXRlT3JVcGRhdGVyRm4gYXMgKHN0YXRlOiBUKSA9PiBUKSgpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBQYXRjaGVzIHRoZSBzdGF0ZSB3aXRoIHByb3ZpZGVkIHBhcnRpYWwgc3RhdGUuXG4gICAqXG4gICAqIEBwYXJhbSBwYXJ0aWFsU3RhdGVPclVwZGF0ZXJGbiBhIHBhcnRpYWwgc3RhdGUgb3IgYSBwYXJ0aWFsIHVwZGF0ZXJcbiAgICogZnVuY3Rpb24gdGhhdCBhY2NlcHRzIHRoZSBzdGF0ZSBhbmQgcmV0dXJucyB0aGUgcGFydGlhbCBzdGF0ZS5cbiAgICogQHRocm93cyBFcnJvciBpZiB0aGUgc3RhdGUgaXMgbm90IGluaXRpYWxpemVkLlxuICAgKi9cbiAgcGF0Y2hTdGF0ZShcbiAgICBwYXJ0aWFsU3RhdGVPclVwZGF0ZXJGbjpcbiAgICAgIHwgUGFydGlhbDxUPlxuICAgICAgfCBPYnNlcnZhYmxlPFBhcnRpYWw8VD4+XG4gICAgICB8ICgoc3RhdGU6IFQpID0+IFBhcnRpYWw8VD4pXG4gICk6IHZvaWQge1xuICAgIGNvbnN0IHBhdGNoZWRTdGF0ZSA9XG4gICAgICB0eXBlb2YgcGFydGlhbFN0YXRlT3JVcGRhdGVyRm4gPT09ICdmdW5jdGlvbidcbiAgICAgICAgPyBwYXJ0aWFsU3RhdGVPclVwZGF0ZXJGbih0aGlzLmdldCgpKVxuICAgICAgICA6IHBhcnRpYWxTdGF0ZU9yVXBkYXRlckZuO1xuXG4gICAgdGhpcy51cGRhdGVyKChzdGF0ZSwgcGFydGlhbFN0YXRlOiBQYXJ0aWFsPFQ+KSA9PiAoe1xuICAgICAgLi4uc3RhdGUsXG4gICAgICAuLi5wYXJ0aWFsU3RhdGUsXG4gICAgfSkpKHBhdGNoZWRTdGF0ZSk7XG4gIH1cblxuICBwcm90ZWN0ZWQgZ2V0KCk6IFQ7XG4gIHByb3RlY3RlZCBnZXQ8Uj4ocHJvamVjdG9yOiAoczogVCkgPT4gUik6IFI7XG4gIHByb3RlY3RlZCBnZXQ8Uj4ocHJvamVjdG9yPzogKHM6IFQpID0+IFIpOiBSIHwgVCB7XG4gICAgdGhpcy5hc3NlcnRTdGF0ZUlzSW5pdGlhbGl6ZWQoKTtcbiAgICBsZXQgdmFsdWU6IFIgfCBUO1xuXG4gICAgdGhpcy5zdGF0ZVN1YmplY3QkLnBpcGUodGFrZSgxKSkuc3Vic2NyaWJlKChzdGF0ZSkgPT4ge1xuICAgICAgdmFsdWUgPSBwcm9qZWN0b3IgPyBwcm9qZWN0b3Ioc3RhdGUpIDogc3RhdGU7XG4gICAgfSk7XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1ub24tbnVsbC1hc3NlcnRpb25cbiAgICByZXR1cm4gdmFsdWUhO1xuICB9XG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBzZWxlY3Rvci5cbiAgICpcbiAgICogQHBhcmFtIHByb2plY3RvciBBIHB1cmUgcHJvamVjdGlvbiBmdW5jdGlvbiB0aGF0IHRha2VzIHRoZSBjdXJyZW50IHN0YXRlIGFuZFxuICAgKiAgIHJldHVybnMgc29tZSBuZXcgc2xpY2UvcHJvamVjdGlvbiBvZiB0aGF0IHN0YXRlLlxuICAgKiBAcGFyYW0gY29uZmlnIFNlbGVjdENvbmZpZyB0aGF0IGNoYW5nZXMgdGhlIGJlaGF2aW9yIG9mIHNlbGVjdG9yLCBpbmNsdWRpbmdcbiAgICogICB0aGUgZGVib3VuY2luZyBvZiB0aGUgdmFsdWVzIHVudGlsIHRoZSBzdGF0ZSBpcyBzZXR0bGVkLlxuICAgKiBAcmV0dXJuIEFuIG9ic2VydmFibGUgb2YgdGhlIHByb2plY3RvciByZXN1bHRzLlxuICAgKi9cbiAgc2VsZWN0PFJlc3VsdD4oXG4gICAgcHJvamVjdG9yOiAoczogVCkgPT4gUmVzdWx0LFxuICAgIGNvbmZpZz86IFNlbGVjdENvbmZpZ1xuICApOiBPYnNlcnZhYmxlPFJlc3VsdD47XG4gIHNlbGVjdDxTZWxlY3RvcnNPYmplY3QgZXh0ZW5kcyBSZWNvcmQ8c3RyaW5nLCBPYnNlcnZhYmxlPHVua25vd24+Pj4oXG4gICAgc2VsZWN0b3JzT2JqZWN0OiBTZWxlY3RvcnNPYmplY3QsXG4gICAgY29uZmlnPzogU2VsZWN0Q29uZmlnXG4gICk6IE9ic2VydmFibGU8e1xuICAgIFtLIGluIGtleW9mIFNlbGVjdG9yc09iamVjdF06IE9ic2VydmVkVmFsdWVPZjxTZWxlY3RvcnNPYmplY3RbS10+O1xuICB9PjtcbiAgc2VsZWN0PFNlbGVjdG9ycyBleHRlbmRzIE9ic2VydmFibGU8dW5rbm93bj5bXSwgUmVzdWx0PihcbiAgICAuLi5zZWxlY3RvcnNXaXRoUHJvamVjdG9yOiBbXG4gICAgICAuLi5zZWxlY3RvcnM6IFNlbGVjdG9ycyxcbiAgICAgIHByb2plY3RvcjogUHJvamVjdG9yPFNlbGVjdG9ycywgUmVzdWx0PlxuICAgIF1cbiAgKTogT2JzZXJ2YWJsZTxSZXN1bHQ+O1xuICBzZWxlY3Q8U2VsZWN0b3JzIGV4dGVuZHMgT2JzZXJ2YWJsZTx1bmtub3duPltdLCBSZXN1bHQ+KFxuICAgIC4uLnNlbGVjdG9yc1dpdGhQcm9qZWN0b3JBbmRDb25maWc6IFtcbiAgICAgIC4uLnNlbGVjdG9yczogU2VsZWN0b3JzLFxuICAgICAgcHJvamVjdG9yOiBQcm9qZWN0b3I8U2VsZWN0b3JzLCBSZXN1bHQ+LFxuICAgICAgY29uZmlnOiBTZWxlY3RDb25maWdcbiAgICBdXG4gICk6IE9ic2VydmFibGU8UmVzdWx0PjtcbiAgc2VsZWN0PFxuICAgIFNlbGVjdG9ycyBleHRlbmRzIEFycmF5PFxuICAgICAgT2JzZXJ2YWJsZTx1bmtub3duPiB8IFNlbGVjdENvbmZpZyB8IFByb2plY3RvckZuIHwgU2VsZWN0b3JzT2JqZWN0XG4gICAgPixcbiAgICBSZXN1bHQsXG4gICAgUHJvamVjdG9yRm4gZXh0ZW5kcyAoLi4uYTogdW5rbm93bltdKSA9PiBSZXN1bHQsXG4gICAgU2VsZWN0b3JzT2JqZWN0IGV4dGVuZHMgUmVjb3JkPHN0cmluZywgT2JzZXJ2YWJsZTx1bmtub3duPj5cbiAgPiguLi5hcmdzOiBTZWxlY3RvcnMpOiBPYnNlcnZhYmxlPFJlc3VsdD4ge1xuICAgIGNvbnN0IHsgb2JzZXJ2YWJsZXNPclNlbGVjdG9yc09iamVjdCwgcHJvamVjdG9yLCBjb25maWcgfSA9XG4gICAgICBwcm9jZXNzU2VsZWN0b3JBcmdzPFNlbGVjdG9ycywgUmVzdWx0LCBQcm9qZWN0b3JGbiwgU2VsZWN0b3JzT2JqZWN0PihcbiAgICAgICAgYXJnc1xuICAgICAgKTtcblxuICAgIGNvbnN0IHNvdXJjZSQgPSBoYXNQcm9qZWN0Rm5Pbmx5KG9ic2VydmFibGVzT3JTZWxlY3RvcnNPYmplY3QsIHByb2plY3RvcilcbiAgICAgID8gdGhpcy5zdGF0ZVN1YmplY3QkXG4gICAgICA6IGNvbWJpbmVMYXRlc3Qob2JzZXJ2YWJsZXNPclNlbGVjdG9yc09iamVjdCBhcyBhbnkpO1xuXG4gICAgcmV0dXJuIHNvdXJjZSQucGlwZShcbiAgICAgIGNvbmZpZy5kZWJvdW5jZSA/IGRlYm91bmNlU3luYygpIDogbm9vcE9wZXJhdG9yKCksXG4gICAgICAocHJvamVjdG9yXG4gICAgICAgID8gbWFwKChwcm9qZWN0b3JBcmdzKSA9PlxuICAgICAgICAgICAgLy8gcHJvamVjdG9yQXJncyBjb3VsZCBiZSBhbiBBcnJheSBpbiBjYXNlIHdoZXJlIHRoZSBlbnRpcmUgc3RhdGUgaXMgYW4gQXJyYXksIHNvIGFkZGluZyB0aGlzIGNoZWNrXG4gICAgICAgICAgICAob2JzZXJ2YWJsZXNPclNlbGVjdG9yc09iamVjdCBhcyBPYnNlcnZhYmxlPHVua25vd24+W10pLmxlbmd0aCA+XG4gICAgICAgICAgICAgIDAgJiYgQXJyYXkuaXNBcnJheShwcm9qZWN0b3JBcmdzKVxuICAgICAgICAgICAgICA/IHByb2plY3RvciguLi5wcm9qZWN0b3JBcmdzKVxuICAgICAgICAgICAgICA6IHByb2plY3Rvcihwcm9qZWN0b3JBcmdzKVxuICAgICAgICAgIClcbiAgICAgICAgOiBub29wT3BlcmF0b3IoKSkgYXMgKCkgPT4gT2JzZXJ2YWJsZTxSZXN1bHQ+LFxuICAgICAgZGlzdGluY3RVbnRpbENoYW5nZWQoKSxcbiAgICAgIHNoYXJlUmVwbGF5KHtcbiAgICAgICAgcmVmQ291bnQ6IHRydWUsXG4gICAgICAgIGJ1ZmZlclNpemU6IDEsXG4gICAgICB9KSxcbiAgICAgIHRha2VVbnRpbCh0aGlzLmRlc3Ryb3kkKVxuICAgICk7XG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlcyBhIHNpZ25hbCBmcm9tIHRoZSBwcm92aWRlZCBzdGF0ZSBwcm9qZWN0b3IgZnVuY3Rpb24uXG4gICAqL1xuICBzZWxlY3RTaWduYWw8UmVzdWx0PihcbiAgICBwcm9qZWN0b3I6IChzdGF0ZTogVCkgPT4gUmVzdWx0LFxuICAgIG9wdGlvbnM/OiBTZWxlY3RTaWduYWxPcHRpb25zPFJlc3VsdD5cbiAgKTogU2lnbmFsPFJlc3VsdD47XG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgc2lnbmFsIGJ5IGNvbWJpbmluZyBwcm92aWRlZCBzaWduYWxzLlxuICAgKi9cbiAgc2VsZWN0U2lnbmFsPFNpZ25hbHMgZXh0ZW5kcyBTaWduYWw8dW5rbm93bj5bXSwgUmVzdWx0PihcbiAgICAuLi5hcmdzOiBbLi4uc2lnbmFsczogU2lnbmFscywgcHJvamVjdG9yOiBTaWduYWxzUHJvamVjdG9yPFNpZ25hbHMsIFJlc3VsdD5dXG4gICk6IFNpZ25hbDxSZXN1bHQ+O1xuICAvKipcbiAgICogQ3JlYXRlcyBhIHNpZ25hbCBieSBjb21iaW5pbmcgcHJvdmlkZWQgc2lnbmFscy5cbiAgICovXG4gIHNlbGVjdFNpZ25hbDxTaWduYWxzIGV4dGVuZHMgU2lnbmFsPHVua25vd24+W10sIFJlc3VsdD4oXG4gICAgLi4uYXJnczogW1xuICAgICAgLi4uc2lnbmFsczogU2lnbmFscyxcbiAgICAgIHByb2plY3RvcjogU2lnbmFsc1Byb2plY3RvcjxTaWduYWxzLCBSZXN1bHQ+LFxuICAgICAgb3B0aW9uczogU2VsZWN0U2lnbmFsT3B0aW9uczxSZXN1bHQ+XG4gICAgXVxuICApOiBTaWduYWw8UmVzdWx0PjtcbiAgc2VsZWN0U2lnbmFsKFxuICAgIC4uLmFyZ3M6XG4gICAgICB8IFsoc3RhdGU6IFQpID0+IHVua25vd24sIFNlbGVjdFNpZ25hbE9wdGlvbnM8dW5rbm93bj4/XVxuICAgICAgfCBbXG4gICAgICAgICAgLi4uc2lnbmFsczogU2lnbmFsPHVua25vd24+W10sXG4gICAgICAgICAgcHJvamVjdG9yOiAoLi4udmFsdWVzOiB1bmtub3duW10pID0+IHVua25vd25cbiAgICAgICAgXVxuICAgICAgfCBbXG4gICAgICAgICAgLi4uc2lnbmFsczogU2lnbmFsPHVua25vd24+W10sXG4gICAgICAgICAgcHJvamVjdG9yOiAoLi4udmFsdWVzOiB1bmtub3duW10pID0+IHVua25vd24sXG4gICAgICAgICAgb3B0aW9uczogU2VsZWN0U2lnbmFsT3B0aW9uczx1bmtub3duPlxuICAgICAgICBdXG4gICk6IFNpZ25hbDx1bmtub3duPiB7XG4gICAgaWYgKGFyZ3MubGVuZ3RoID09PSAxKSB7XG4gICAgICBjb25zdCBwcm9qZWN0b3IgPSBhcmdzWzBdIGFzIChzdGF0ZTogVCkgPT4gdW5rbm93bjtcbiAgICAgIHJldHVybiBjb21wdXRlZCgoKSA9PiBwcm9qZWN0b3IodGhpcy5zdGF0ZSgpKSk7XG4gICAgfVxuXG4gICAgY29uc3Qgb3B0aW9uc09yUHJvamVjdG9yID0gYXJnc1thcmdzLmxlbmd0aCAtIDFdIGFzIChcbiAgICAgIC4uLnZhbHVlczogdW5rbm93bltdXG4gICAgKSA9PiB1bmtub3duIHwgU2VsZWN0U2lnbmFsT3B0aW9uczx1bmtub3duPjtcbiAgICBpZiAodHlwZW9mIG9wdGlvbnNPclByb2plY3RvciA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgY29uc3Qgc2lnbmFscyA9IGFyZ3Muc2xpY2UoMCwgLTEpIGFzIFNpZ25hbDx1bmtub3duPltdO1xuXG4gICAgICByZXR1cm4gY29tcHV0ZWQoKCkgPT4ge1xuICAgICAgICBjb25zdCB2YWx1ZXMgPSBzaWduYWxzLm1hcCgoc2lnbmFsKSA9PiBzaWduYWwoKSk7XG4gICAgICAgIHJldHVybiBvcHRpb25zT3JQcm9qZWN0b3IoLi4udmFsdWVzKTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGlmIChhcmdzLmxlbmd0aCA9PT0gMikge1xuICAgICAgY29uc3QgcHJvamVjdG9yID0gYXJnc1swXSBhcyAoc3RhdGU6IFQpID0+IHVua25vd247XG4gICAgICByZXR1cm4gY29tcHV0ZWQoKCkgPT4gcHJvamVjdG9yKHRoaXMuc3RhdGUoKSksIG9wdGlvbnNPclByb2plY3Rvcik7XG4gICAgfVxuXG4gICAgY29uc3Qgc2lnbmFscyA9IGFyZ3Muc2xpY2UoMCwgLTIpIGFzIFNpZ25hbDx1bmtub3duPltdO1xuICAgIGNvbnN0IHByb2plY3RvciA9IGFyZ3NbYXJncy5sZW5ndGggLSAyXSBhcyAoXG4gICAgICAuLi52YWx1ZXM6IHVua25vd25bXVxuICAgICkgPT4gdW5rbm93bjtcbiAgICByZXR1cm4gY29tcHV0ZWQoKCkgPT4ge1xuICAgICAgY29uc3QgdmFsdWVzID0gc2lnbmFscy5tYXAoKHNpZ25hbCkgPT4gc2lnbmFsKCkpO1xuICAgICAgcmV0dXJuIHByb2plY3RvciguLi52YWx1ZXMpO1xuICAgIH0sIG9wdGlvbnNPclByb2plY3Rvcik7XG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlcyBhbiBlZmZlY3QuXG4gICAqXG4gICAqIFRoaXMgZWZmZWN0IGlzIHN1YnNjcmliZWQgdG8gdGhyb3VnaG91dCB0aGUgbGlmZWN5Y2xlIG9mIHRoZSBDb21wb25lbnRTdG9yZS5cbiAgICogQHBhcmFtIGdlbmVyYXRvciBBIGZ1bmN0aW9uIHRoYXQgdGFrZXMgYW4gb3JpZ2luIE9ic2VydmFibGUgaW5wdXQgYW5kXG4gICAqICAgICByZXR1cm5zIGFuIE9ic2VydmFibGUuIFRoZSBPYnNlcnZhYmxlIHRoYXQgaXMgcmV0dXJuZWQgd2lsbCBiZVxuICAgKiAgICAgc3Vic2NyaWJlZCB0byBmb3IgdGhlIGxpZmUgb2YgdGhlIGNvbXBvbmVudC5cbiAgICogQHJldHVybiBBIGZ1bmN0aW9uIHRoYXQsIHdoZW4gY2FsbGVkLCB3aWxsIHRyaWdnZXIgdGhlIG9yaWdpbiBPYnNlcnZhYmxlLlxuICAgKi9cbiAgZWZmZWN0PFxuICAgIC8vIFRoaXMgdHlwZSBxdWlja2x5IGJlY2FtZSBwYXJ0IG9mIGVmZmVjdCAnQVBJJ1xuICAgIFByb3ZpZGVkVHlwZSA9IHZvaWQsXG4gICAgLy8gVGhlIGFjdHVhbCBvcmlnaW4kIHR5cGUsIHdoaWNoIGNvdWxkIGJlIHVua25vd24sIHdoZW4gbm90IHNwZWNpZmllZFxuICAgIE9yaWdpblR5cGUgZXh0ZW5kc1xuICAgICAgfCBPYnNlcnZhYmxlPFByb3ZpZGVkVHlwZT5cbiAgICAgIHwgdW5rbm93biA9IE9ic2VydmFibGU8UHJvdmlkZWRUeXBlPixcbiAgICAvLyBVbndyYXBwZWQgYWN0dWFsIHR5cGUgb2YgdGhlIG9yaWdpbiQgT2JzZXJ2YWJsZSwgYWZ0ZXIgZGVmYXVsdCB3YXMgYXBwbGllZFxuICAgIE9ic2VydmFibGVUeXBlID0gT3JpZ2luVHlwZSBleHRlbmRzIE9ic2VydmFibGU8aW5mZXIgQT4gPyBBIDogbmV2ZXIsXG4gICAgLy8gUmV0dXJuIGVpdGhlciBhbiBvcHRpb25hbCBjYWxsYmFjayBvciBhIGZ1bmN0aW9uIHJlcXVpcmluZyBzcGVjaWZpYyB0eXBlcyBhcyBpbnB1dHNcbiAgICBSZXR1cm5UeXBlID0gUHJvdmlkZWRUeXBlIHwgT2JzZXJ2YWJsZVR5cGUgZXh0ZW5kcyB2b2lkXG4gICAgICA/IChcbiAgICAgICAgICBvYnNlcnZhYmxlT3JWYWx1ZT86IE9ic2VydmFibGVUeXBlIHwgT2JzZXJ2YWJsZTxPYnNlcnZhYmxlVHlwZT5cbiAgICAgICAgKSA9PiBTdWJzY3JpcHRpb25cbiAgICAgIDogKFxuICAgICAgICAgIG9ic2VydmFibGVPclZhbHVlOiBPYnNlcnZhYmxlVHlwZSB8IE9ic2VydmFibGU8T2JzZXJ2YWJsZVR5cGU+XG4gICAgICAgICkgPT4gU3Vic2NyaXB0aW9uXG4gID4oZ2VuZXJhdG9yOiAob3JpZ2luJDogT3JpZ2luVHlwZSkgPT4gT2JzZXJ2YWJsZTx1bmtub3duPik6IFJldHVyblR5cGUge1xuICAgIGNvbnN0IG9yaWdpbiQgPSBuZXcgU3ViamVjdDxPYnNlcnZhYmxlVHlwZT4oKTtcbiAgICBnZW5lcmF0b3Iob3JpZ2luJCBhcyBPcmlnaW5UeXBlKVxuICAgICAgLy8gdGllZCB0byB0aGUgbGlmZWN5Y2xlIPCfkYcgb2YgQ29tcG9uZW50U3RvcmVcbiAgICAgIC5waXBlKHRha2VVbnRpbCh0aGlzLmRlc3Ryb3kkKSlcbiAgICAgIC5zdWJzY3JpYmUoKTtcblxuICAgIHJldHVybiAoKFxuICAgICAgb2JzZXJ2YWJsZU9yVmFsdWU/OiBPYnNlcnZhYmxlVHlwZSB8IE9ic2VydmFibGU8T2JzZXJ2YWJsZVR5cGU+XG4gICAgKTogU3Vic2NyaXB0aW9uID0+IHtcbiAgICAgIGNvbnN0IG9ic2VydmFibGUkID0gaXNPYnNlcnZhYmxlKG9ic2VydmFibGVPclZhbHVlKVxuICAgICAgICA/IG9ic2VydmFibGVPclZhbHVlXG4gICAgICAgIDogb2Yob2JzZXJ2YWJsZU9yVmFsdWUpO1xuICAgICAgcmV0dXJuIG9ic2VydmFibGUkLnBpcGUodGFrZVVudGlsKHRoaXMuZGVzdHJveSQpKS5zdWJzY3JpYmUoKHZhbHVlKSA9PiB7XG4gICAgICAgIC8vIGFueSBuZXcg8J+RhyB2YWx1ZSBpcyBwdXNoZWQgaW50byBhIHN0cmVhbVxuICAgICAgICBvcmlnaW4kLm5leHQodmFsdWUgYXMgT2JzZXJ2YWJsZVR5cGUpO1xuICAgICAgfSk7XG4gICAgfSkgYXMgdW5rbm93biBhcyBSZXR1cm5UeXBlO1xuICB9XG5cbiAgLyoqXG4gICAqIFVzZWQgdG8gY2hlY2sgaWYgbGlmZWN5Y2xlIGhvb2tzIGFyZSBkZWZpbmVkXG4gICAqIGJ1dCBub3QgdXNlZCB3aXRoIHByb3ZpZGVDb21wb25lbnRTdG9yZSgpXG4gICAqL1xuICBwcml2YXRlIGNoZWNrUHJvdmlkZXJGb3JIb29rcygpIHtcbiAgICBhc2FwU2NoZWR1bGVyLnNjaGVkdWxlKCgpID0+IHtcbiAgICAgIGlmIChcbiAgICAgICAgaXNEZXZNb2RlKCkgJiZcbiAgICAgICAgKGlzT25TdG9yZUluaXREZWZpbmVkKHRoaXMpIHx8IGlzT25TdGF0ZUluaXREZWZpbmVkKHRoaXMpKSAmJlxuICAgICAgICAhdGhpcy7JtWhhc1Byb3ZpZGVyXG4gICAgICApIHtcbiAgICAgICAgY29uc3Qgd2FybmluZ3MgPSBbXG4gICAgICAgICAgaXNPblN0b3JlSW5pdERlZmluZWQodGhpcykgPyAnT25TdG9yZUluaXQnIDogJycsXG4gICAgICAgICAgaXNPblN0YXRlSW5pdERlZmluZWQodGhpcykgPyAnT25TdGF0ZUluaXQnIDogJycsXG4gICAgICAgIF0uZmlsdGVyKChkZWZpbmVkKSA9PiBkZWZpbmVkKTtcblxuICAgICAgICBjb25zb2xlLndhcm4oXG4gICAgICAgICAgYEBuZ3J4L2NvbXBvbmVudC1zdG9yZTogJHtcbiAgICAgICAgICAgIHRoaXMuY29uc3RydWN0b3IubmFtZVxuICAgICAgICAgIH0gaGFzIHRoZSAke3dhcm5pbmdzLmpvaW4oJyBhbmQgJyl9IGAgK1xuICAgICAgICAgICAgJ2xpZmVjeWNsZSBob29rKHMpIGltcGxlbWVudGVkIHdpdGhvdXQgYmVpbmcgcHJvdmlkZWQgdXNpbmcgdGhlICcgK1xuICAgICAgICAgICAgYHByb3ZpZGVDb21wb25lbnRTdG9yZSgke3RoaXMuY29uc3RydWN0b3IubmFtZX0pIGZ1bmN0aW9uLiBgICtcbiAgICAgICAgICAgIGBUbyByZXNvbHZlIHRoaXMsIHByb3ZpZGUgdGhlIGNvbXBvbmVudCBzdG9yZSB2aWEgcHJvdmlkZUNvbXBvbmVudFN0b3JlKCR7dGhpcy5jb25zdHJ1Y3Rvci5uYW1lfSlgXG4gICAgICAgICk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIGFzc2VydFN0YXRlSXNJbml0aWFsaXplZCgpOiB2b2lkIHtcbiAgICBpZiAoIXRoaXMuaXNJbml0aWFsaXplZCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICBgJHt0aGlzLmNvbnN0cnVjdG9yLm5hbWV9IGhhcyBub3QgYmVlbiBpbml0aWFsaXplZCB5ZXQuIGAgK1xuICAgICAgICAgIGBQbGVhc2UgbWFrZSBzdXJlIGl0IGlzIGluaXRpYWxpemVkIGJlZm9yZSB1cGRhdGluZy9nZXR0aW5nLmBcbiAgICAgICk7XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIHByb2Nlc3NTZWxlY3RvckFyZ3M8XG4gIFNlbGVjdG9ycyBleHRlbmRzIEFycmF5PFxuICAgIE9ic2VydmFibGU8dW5rbm93bj4gfCBTZWxlY3RDb25maWcgfCBQcm9qZWN0b3JGbiB8IFNlbGVjdG9yc09iamVjdFxuICA+LFxuICBSZXN1bHQsXG4gIFByb2plY3RvckZuIGV4dGVuZHMgKC4uLmE6IHVua25vd25bXSkgPT4gUmVzdWx0LFxuICBTZWxlY3RvcnNPYmplY3QgZXh0ZW5kcyBSZWNvcmQ8c3RyaW5nLCBPYnNlcnZhYmxlPHVua25vd24+PlxuPihcbiAgYXJnczogU2VsZWN0b3JzXG4pOlxuICB8IHtcbiAgICAgIG9ic2VydmFibGVzT3JTZWxlY3RvcnNPYmplY3Q6IE9ic2VydmFibGU8dW5rbm93bj5bXTtcbiAgICAgIHByb2plY3RvcjogUHJvamVjdG9yRm47XG4gICAgICBjb25maWc6IFJlcXVpcmVkPFNlbGVjdENvbmZpZz47XG4gICAgfVxuICB8IHtcbiAgICAgIG9ic2VydmFibGVzT3JTZWxlY3RvcnNPYmplY3Q6IFNlbGVjdG9yc09iamVjdDtcbiAgICAgIHByb2plY3RvcjogdW5kZWZpbmVkO1xuICAgICAgY29uZmlnOiBSZXF1aXJlZDxTZWxlY3RDb25maWc+O1xuICAgIH0ge1xuICBjb25zdCBzZWxlY3RvckFyZ3MgPSBBcnJheS5mcm9tKGFyZ3MpO1xuICAvLyBBc3NpZ24gZGVmYXVsdCB2YWx1ZXMuXG4gIGxldCBjb25maWc6IFJlcXVpcmVkPFNlbGVjdENvbmZpZz4gPSB7IGRlYm91bmNlOiBmYWxzZSB9O1xuXG4gIC8vIExhc3QgYXJndW1lbnQgaXMgZWl0aGVyIGNvbmZpZyBvciBwcm9qZWN0b3Igb3Igc2VsZWN0b3JzT2JqZWN0XG4gIGlmIChpc1NlbGVjdENvbmZpZyhzZWxlY3RvckFyZ3Nbc2VsZWN0b3JBcmdzLmxlbmd0aCAtIDFdKSkge1xuICAgIGNvbmZpZyA9IHsgLi4uY29uZmlnLCAuLi5zZWxlY3RvckFyZ3MucG9wKCkgfTtcbiAgfVxuXG4gIC8vIEF0IHRoaXMgcG9pbnQgc2VsZWN0b3JBcmdzIGlzIGVpdGhlciBwcm9qZWN0b3IsIHNlbGVjdG9ycyB3aXRoIHByb2plY3RvciBvciBzZWxlY3RvcnNPYmplY3RcbiAgaWYgKHNlbGVjdG9yQXJncy5sZW5ndGggPT09IDEgJiYgdHlwZW9mIHNlbGVjdG9yQXJnc1swXSAhPT0gJ2Z1bmN0aW9uJykge1xuICAgIC8vIHRoaXMgaXMgYSBzZWxlY3RvcnNPYmplY3RcbiAgICByZXR1cm4ge1xuICAgICAgb2JzZXJ2YWJsZXNPclNlbGVjdG9yc09iamVjdDogc2VsZWN0b3JBcmdzWzBdIGFzIFNlbGVjdG9yc09iamVjdCxcbiAgICAgIHByb2plY3RvcjogdW5kZWZpbmVkLFxuICAgICAgY29uZmlnLFxuICAgIH07XG4gIH1cblxuICBjb25zdCBwcm9qZWN0b3IgPSBzZWxlY3RvckFyZ3MucG9wKCkgYXMgUHJvamVjdG9yRm47XG5cbiAgLy8gVGhlIE9ic2VydmFibGVzIHRvIGNvbWJpbmUsIGlmIHRoZXJlIGFyZSBhbnkgbGVmdC5cbiAgY29uc3Qgb2JzZXJ2YWJsZXMgPSBzZWxlY3RvckFyZ3MgYXMgT2JzZXJ2YWJsZTx1bmtub3duPltdO1xuICByZXR1cm4ge1xuICAgIG9ic2VydmFibGVzT3JTZWxlY3RvcnNPYmplY3Q6IG9ic2VydmFibGVzLFxuICAgIHByb2plY3RvcixcbiAgICBjb25maWcsXG4gIH07XG59XG5cbmZ1bmN0aW9uIGlzU2VsZWN0Q29uZmlnKGFyZzogU2VsZWN0Q29uZmlnIHwgdW5rbm93bik6IGFyZyBpcyBTZWxlY3RDb25maWcge1xuICByZXR1cm4gdHlwZW9mIChhcmcgYXMgU2VsZWN0Q29uZmlnKS5kZWJvdW5jZSAhPT0gJ3VuZGVmaW5lZCc7XG59XG5cbmZ1bmN0aW9uIGhhc1Byb2plY3RGbk9ubHkoXG4gIG9ic2VydmFibGVzT3JTZWxlY3RvcnNPYmplY3Q6IHVua25vd25bXSB8IFJlY29yZDxzdHJpbmcsIHVua25vd24+LFxuICBwcm9qZWN0b3I6IHVua25vd25cbikge1xuICByZXR1cm4gKFxuICAgIEFycmF5LmlzQXJyYXkob2JzZXJ2YWJsZXNPclNlbGVjdG9yc09iamVjdCkgJiZcbiAgICBvYnNlcnZhYmxlc09yU2VsZWN0b3JzT2JqZWN0Lmxlbmd0aCA9PT0gMCAmJlxuICAgIHByb2plY3RvclxuICApO1xufVxuXG5mdW5jdGlvbiBub29wT3BlcmF0b3IoKTogPFQ+KHNvdXJjZSQ6IE9ic2VydmFibGU8VD4pID0+IHR5cGVvZiBzb3VyY2UkIHtcbiAgcmV0dXJuIChzb3VyY2UkKSA9PiBzb3VyY2UkO1xufVxuIl19