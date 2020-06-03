/**
 * @fileoverview added by tsickle
 * Generated from: src/component-store.ts
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
import { isObservable, of, ReplaySubject, throwError, combineLatest, Subject, } from 'rxjs';
import { concatMap, takeUntil, withLatestFrom, map, distinctUntilChanged, shareReplay, } from 'rxjs/operators';
import { debounceSync } from './debounceSync';
/**
 * Return type of the effect, that behaves differently based on whether the
 * argument is passed to the callback.
 * @record
 * @template T
 */
export function EffectReturnFn() { }
/**
 * @template T
 */
export class ComponentStore {
    /**
     * @param {?=} defaultState
     */
    constructor(defaultState) {
        // Should be used only in ngOnDestroy.
        this.destroySubject$ = new ReplaySubject(1);
        // Exposed to any extending Store to be used for the teardowns.
        this.destroy$ = this.destroySubject$.asObservable();
        this.stateSubject$ = new ReplaySubject(1);
        this.isInitialized = false;
        // Needs to be after destroy$ is declared because it's used in select.
        this.state$ = this.select((/**
         * @param {?} s
         * @return {?}
         */
        (s) => s));
        // State can be initialized either through constructor, or initState or
        // setState.
        if (defaultState) {
            this.initState(defaultState);
        }
    }
    /**
     * Completes all relevant Observable streams.
     * @return {?}
     */
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
     * @template V
     * @param {?} updaterFn A static updater function that takes 2 parameters (the
     * current state and an argument object) and returns a new instance of the
     * state.
     * @return {?} A function that accepts one argument which is forwarded as the
     *     second argument to `updaterFn`. Everytime this function is called
     *     subscribers will be notified of the state change.
     */
    updater(updaterFn) {
        return (/** @type {?} */ (((/**
         * @param {?=} observableOrValue
         * @return {?}
         */
        (observableOrValue) => {
            /** @type {?} */
            let initializationError;
            // We can receive either the value or an observable. In case it's a
            // simple value, we'll wrap it with `of` operator to turn it into
            // Observable.
            /** @type {?} */
            const observable$ = isObservable(observableOrValue)
                ? observableOrValue
                : of(observableOrValue);
            /** @type {?} */
            const subscription = observable$
                .pipe(concatMap((/**
             * @param {?} value
             * @return {?}
             */
            (value) => this.isInitialized
                ? of(value).pipe(withLatestFrom(this.stateSubject$))
                : // If state was not initialized, we'll throw an error.
                    throwError(Error(`${this.constructor.name} has not been initialized`)))), takeUntil(this.destroy$))
                .subscribe({
                next: (/**
                 * @param {?} __0
                 * @return {?}
                 */
                ([value, currentState]) => {
                    this.stateSubject$.next(updaterFn(currentState, (/** @type {?} */ (value))));
                }),
                error: (/**
                 * @param {?} error
                 * @return {?}
                 */
                (error) => {
                    initializationError = error;
                    this.stateSubject$.error(error);
                }),
            });
            if (initializationError) {
                throw initializationError;
            }
            return subscription;
        }))));
    }
    /**
     * Initializes state. If it was already initialized then it resets the
     * state.
     * @private
     * @param {?} state
     * @return {?}
     */
    initState(state) {
        this.isInitialized = true;
        this.stateSubject$.next(state);
    }
    /**
     * Sets the state specific value.
     * @param {?} stateOrUpdaterFn object of the same type as the state or an
     * updaterFn, returning such object.
     * @return {?}
     */
    setState(stateOrUpdaterFn) {
        if (typeof stateOrUpdaterFn !== 'function') {
            this.initState(stateOrUpdaterFn);
        }
        else {
            this.updater((/** @type {?} */ (stateOrUpdaterFn)))();
        }
    }
    /**
     * @template R
     * @param {...?} args
     * @return {?}
     */
    select(...args) {
        /** @type {?} */
        let observable$;
        // project is always the last argument, so `pop` it from args.
        /** @type {?} */
        const projector = args.pop();
        if (args.length === 0) {
            // If projector was the only argument then we'll use map operator.
            observable$ = this.stateSubject$.pipe(map(projector));
        }
        else {
            // If there are multiple arguments, we're chaining selectors, so we need
            // to take the combineLatest of them before calling the map function.
            observable$ = combineLatest(args).pipe(
            // The most performant way to combine Observables avoiding unnecessary
            // emissions and projector calls.
            debounceSync(), map((/**
             * @param {?} args
             * @return {?}
             */
            (args) => projector(...args))));
        }
        /** @type {?} */
        const distinctSharedObservable$ = observable$.pipe(distinctUntilChanged(), shareReplay({
            refCount: true,
            bufferSize: 1,
        }), takeUntil(this.destroy$));
        return distinctSharedObservable$;
    }
    /**
     * Creates an effect.
     *
     * This effect is subscribed to for the life of the \@Component.
     * @template V, R
     * @param {?} generator A function that takes an origin Observable input and
     *     returns an Observable. The Observable that is returned will be
     *     subscribed to for the life of the component.
     * @return {?} A function that, when called, will trigger the origin Observable.
     */
    effect(generator) {
        /** @type {?} */
        const origin$ = new Subject();
        generator(origin$)
            // tied to the lifecycle 👇 of ComponentStore
            .pipe(takeUntil(this.destroy$))
            .subscribe();
        return (/**
         * @param {?=} observableOrValue
         * @return {?}
         */
        (observableOrValue) => {
            /** @type {?} */
            const observable$ = isObservable(observableOrValue)
                ? observableOrValue
                : of(observableOrValue);
            return observable$.pipe(takeUntil(this.destroy$)).subscribe((/**
             * @param {?} value
             * @return {?}
             */
            (value) => {
                // any new 👇 value is pushed into a stream
                origin$.next(value);
            }));
        });
    }
}
if (false) {
    /**
     * @type {?}
     * @private
     */
    ComponentStore.prototype.destroySubject$;
    /** @type {?} */
    ComponentStore.prototype.destroy$;
    /**
     * @type {?}
     * @private
     */
    ComponentStore.prototype.stateSubject$;
    /**
     * @type {?}
     * @private
     */
    ComponentStore.prototype.isInitialized;
    /** @type {?} */
    ComponentStore.prototype.state$;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcG9uZW50LXN0b3JlLmpzIiwic291cmNlUm9vdCI6Im5nOi8vQG5ncngvY29tcG9uZW50LXN0b3JlLyIsInNvdXJjZXMiOlsic3JjL2NvbXBvbmVudC1zdG9yZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7OztBQUFBLE9BQU8sRUFDTCxZQUFZLEVBRVosRUFBRSxFQUNGLGFBQWEsRUFFYixVQUFVLEVBQ1YsYUFBYSxFQUNiLE9BQU8sR0FDUixNQUFNLE1BQU0sQ0FBQztBQUNkLE9BQU8sRUFDTCxTQUFTLEVBQ1QsU0FBUyxFQUNULGNBQWMsRUFDZCxHQUFHLEVBQ0gsb0JBQW9CLEVBQ3BCLFdBQVcsR0FDWixNQUFNLGdCQUFnQixDQUFDO0FBQ3hCLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQzs7Ozs7OztBQU05QyxvQ0FHQzs7OztBQUVELE1BQU0sT0FBTyxjQUFjOzs7O0lBV3pCLFlBQVksWUFBZ0I7O1FBVFgsb0JBQWUsR0FBRyxJQUFJLGFBQWEsQ0FBTyxDQUFDLENBQUMsQ0FBQzs7UUFFckQsYUFBUSxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsWUFBWSxFQUFFLENBQUM7UUFFdkMsa0JBQWEsR0FBRyxJQUFJLGFBQWEsQ0FBSSxDQUFDLENBQUMsQ0FBQztRQUNqRCxrQkFBYSxHQUFHLEtBQUssQ0FBQzs7UUFFckIsV0FBTSxHQUFrQixJQUFJLENBQUMsTUFBTTs7OztRQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEVBQUMsQ0FBQztRQUdyRCx1RUFBdUU7UUFDdkUsWUFBWTtRQUNaLElBQUksWUFBWSxFQUFFO1lBQ2hCLElBQUksQ0FBQyxTQUFTLENBQUMsWUFBWSxDQUFDLENBQUM7U0FDOUI7SUFDSCxDQUFDOzs7OztJQUdELFdBQVc7UUFDVCxJQUFJLENBQUMsYUFBYSxDQUFDLFFBQVEsRUFBRSxDQUFDO1FBQzlCLElBQUksQ0FBQyxlQUFlLENBQUMsSUFBSSxFQUFFLENBQUM7SUFDOUIsQ0FBQzs7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QUk7WUFDZCxVQUFVLEVBQUUsQ0FBQztTQUNkLENBQUMsRUFDRixTQUFTLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUN6QjtRQUNELE9BQU8seUJBQXlCLENBQUM7SUFDbkMsQ0FBQzs7Ozs7Ozs7Ozs7SUFXRCxNQUFNLENBQ0osU0FBb0Q7O2NBRTlDLE9BQU8sR0FBRyxJQUFJLE9BQU8sRUFBSztRQUNoQyxTQUFTLENBQUMsT0FBTyxDQUFDO1lBQ2hCLDZDQUE2QzthQUM1QyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQzthQUM5QixTQUFTLEVBQUUsQ0FBQztRQUVmOzs7O1FBQU8sQ0FBQyxpQkFBcUMsRUFBZ0IsRUFBRTs7a0JBQ3ZELFdBQVcsR0FBRyxZQUFZLENBQUMsaUJBQWlCLENBQUM7Z0JBQ2pELENBQUMsQ0FBQyxpQkFBaUI7Z0JBQ25CLENBQUMsQ0FBQyxFQUFFLENBQUMsaUJBQWlCLENBQUM7WUFDekIsT0FBTyxXQUFXLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxTQUFTOzs7O1lBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRTtnQkFDcEUsMkNBQTJDO2dCQUMzQyxPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ3RCLENBQUMsRUFBQyxDQUFDO1FBQ0wsQ0FBQyxFQUFDO0lBQ0osQ0FBQztDQUNGOzs7Ozs7SUEzTEMseUNBQThEOztJQUU5RCxrQ0FBd0Q7Ozs7O0lBRXhELHVDQUF5RDs7Ozs7SUFDekQsdUNBQThCOztJQUU5QixnQ0FBdUQiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge1xuICBpc09ic2VydmFibGUsXG4gIE9ic2VydmFibGUsXG4gIG9mLFxuICBSZXBsYXlTdWJqZWN0LFxuICBTdWJzY3JpcHRpb24sXG4gIHRocm93RXJyb3IsXG4gIGNvbWJpbmVMYXRlc3QsXG4gIFN1YmplY3QsXG59IGZyb20gJ3J4anMnO1xuaW1wb3J0IHtcbiAgY29uY2F0TWFwLFxuICB0YWtlVW50aWwsXG4gIHdpdGhMYXRlc3RGcm9tLFxuICBtYXAsXG4gIGRpc3RpbmN0VW50aWxDaGFuZ2VkLFxuICBzaGFyZVJlcGxheSxcbn0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0IHsgZGVib3VuY2VTeW5jIH0gZnJvbSAnLi9kZWJvdW5jZVN5bmMnO1xuXG4vKipcbiAqIFJldHVybiB0eXBlIG9mIHRoZSBlZmZlY3QsIHRoYXQgYmVoYXZlcyBkaWZmZXJlbnRseSBiYXNlZCBvbiB3aGV0aGVyIHRoZVxuICogYXJndW1lbnQgaXMgcGFzc2VkIHRvIHRoZSBjYWxsYmFjay5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBFZmZlY3RSZXR1cm5GbjxUPiB7XG4gICgpOiB2b2lkO1xuICAodDogVCB8IE9ic2VydmFibGU8VD4pOiBTdWJzY3JpcHRpb247XG59XG5cbmV4cG9ydCBjbGFzcyBDb21wb25lbnRTdG9yZTxUIGV4dGVuZHMgb2JqZWN0PiB7XG4gIC8vIFNob3VsZCBiZSB1c2VkIG9ubHkgaW4gbmdPbkRlc3Ryb3kuXG4gIHByaXZhdGUgcmVhZG9ubHkgZGVzdHJveVN1YmplY3QkID0gbmV3IFJlcGxheVN1YmplY3Q8dm9pZD4oMSk7XG4gIC8vIEV4cG9zZWQgdG8gYW55IGV4dGVuZGluZyBTdG9yZSB0byBiZSB1c2VkIGZvciB0aGUgdGVhcmRvd25zLlxuICByZWFkb25seSBkZXN0cm95JCA9IHRoaXMuZGVzdHJveVN1YmplY3QkLmFzT2JzZXJ2YWJsZSgpO1xuXG4gIHByaXZhdGUgcmVhZG9ubHkgc3RhdGVTdWJqZWN0JCA9IG5ldyBSZXBsYXlTdWJqZWN0PFQ+KDEpO1xuICBwcml2YXRlIGlzSW5pdGlhbGl6ZWQgPSBmYWxzZTtcbiAgLy8gTmVlZHMgdG8gYmUgYWZ0ZXIgZGVzdHJveSQgaXMgZGVjbGFyZWQgYmVjYXVzZSBpdCdzIHVzZWQgaW4gc2VsZWN0LlxuICByZWFkb25seSBzdGF0ZSQ6IE9ic2VydmFibGU8VD4gPSB0aGlzLnNlbGVjdCgocykgPT4gcyk7XG5cbiAgY29uc3RydWN0b3IoZGVmYXVsdFN0YXRlPzogVCkge1xuICAgIC8vIFN0YXRlIGNhbiBiZSBpbml0aWFsaXplZCBlaXRoZXIgdGhyb3VnaCBjb25zdHJ1Y3Rvciwgb3IgaW5pdFN0YXRlIG9yXG4gICAgLy8gc2V0U3RhdGUuXG4gICAgaWYgKGRlZmF1bHRTdGF0ZSkge1xuICAgICAgdGhpcy5pbml0U3RhdGUoZGVmYXVsdFN0YXRlKTtcbiAgICB9XG4gIH1cblxuICAvKiogQ29tcGxldGVzIGFsbCByZWxldmFudCBPYnNlcnZhYmxlIHN0cmVhbXMuICovXG4gIG5nT25EZXN0cm95KCkge1xuICAgIHRoaXMuc3RhdGVTdWJqZWN0JC5jb21wbGV0ZSgpO1xuICAgIHRoaXMuZGVzdHJveVN1YmplY3QkLm5leHQoKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGVzIGFuIHVwZGF0ZXIuXG4gICAqXG4gICAqIFRocm93cyBhbiBlcnJvciBpZiB1cGRhdGVyIGlzIGNhbGxlZCB3aXRoIHN5bmNocm9ub3VzIHZhbHVlcyAoZWl0aGVyXG4gICAqIGltcGVyYXRpdmUgdmFsdWUgb3IgT2JzZXJ2YWJsZSB0aGF0IGlzIHN5bmNocm9ub3VzKSBiZWZvcmUgQ29tcG9uZW50U3RvcmVcbiAgICogaXMgaW5pdGlhbGl6ZWQuIElmIGNhbGxlZCB3aXRoIGFzeW5jIE9ic2VydmFibGUgYmVmb3JlIGluaXRpYWxpemF0aW9uIHRoZW5cbiAgICogc3RhdGUgd2lsbCBub3QgYmUgdXBkYXRlZCBhbmQgc3Vic2NyaXB0aW9uIHdvdWxkIGJlIGNsb3NlZC5cbiAgICpcbiAgICogQHBhcmFtIHVwZGF0ZXJGbiBBIHN0YXRpYyB1cGRhdGVyIGZ1bmN0aW9uIHRoYXQgdGFrZXMgMiBwYXJhbWV0ZXJzICh0aGVcbiAgICogY3VycmVudCBzdGF0ZSBhbmQgYW4gYXJndW1lbnQgb2JqZWN0KSBhbmQgcmV0dXJucyBhIG5ldyBpbnN0YW5jZSBvZiB0aGVcbiAgICogc3RhdGUuXG4gICAqIEByZXR1cm4gQSBmdW5jdGlvbiB0aGF0IGFjY2VwdHMgb25lIGFyZ3VtZW50IHdoaWNoIGlzIGZvcndhcmRlZCBhcyB0aGVcbiAgICogICAgIHNlY29uZCBhcmd1bWVudCB0byBgdXBkYXRlckZuYC4gRXZlcnl0aW1lIHRoaXMgZnVuY3Rpb24gaXMgY2FsbGVkXG4gICAqICAgICBzdWJzY3JpYmVycyB3aWxsIGJlIG5vdGlmaWVkIG9mIHRoZSBzdGF0ZSBjaGFuZ2UuXG4gICAqL1xuICB1cGRhdGVyPFY+KFxuICAgIHVwZGF0ZXJGbjogKHN0YXRlOiBULCB2YWx1ZTogVikgPT4gVFxuICApOiB1bmtub3duIGV4dGVuZHMgViA/ICgpID0+IHZvaWQgOiAodDogViB8IE9ic2VydmFibGU8Vj4pID0+IFN1YnNjcmlwdGlvbiB7XG4gICAgcmV0dXJuICgob2JzZXJ2YWJsZU9yVmFsdWU/OiBWIHwgT2JzZXJ2YWJsZTxWPik6IFN1YnNjcmlwdGlvbiA9PiB7XG4gICAgICBsZXQgaW5pdGlhbGl6YXRpb25FcnJvcjogRXJyb3IgfCB1bmRlZmluZWQ7XG4gICAgICAvLyBXZSBjYW4gcmVjZWl2ZSBlaXRoZXIgdGhlIHZhbHVlIG9yIGFuIG9ic2VydmFibGUuIEluIGNhc2UgaXQncyBhXG4gICAgICAvLyBzaW1wbGUgdmFsdWUsIHdlJ2xsIHdyYXAgaXQgd2l0aCBgb2ZgIG9wZXJhdG9yIHRvIHR1cm4gaXQgaW50b1xuICAgICAgLy8gT2JzZXJ2YWJsZS5cbiAgICAgIGNvbnN0IG9ic2VydmFibGUkID0gaXNPYnNlcnZhYmxlKG9ic2VydmFibGVPclZhbHVlKVxuICAgICAgICA/IG9ic2VydmFibGVPclZhbHVlXG4gICAgICAgIDogb2Yob2JzZXJ2YWJsZU9yVmFsdWUpO1xuICAgICAgY29uc3Qgc3Vic2NyaXB0aW9uID0gb2JzZXJ2YWJsZSRcbiAgICAgICAgLnBpcGUoXG4gICAgICAgICAgY29uY2F0TWFwKCh2YWx1ZSkgPT5cbiAgICAgICAgICAgIHRoaXMuaXNJbml0aWFsaXplZFxuICAgICAgICAgICAgICA/IG9mKHZhbHVlKS5waXBlKHdpdGhMYXRlc3RGcm9tKHRoaXMuc3RhdGVTdWJqZWN0JCkpXG4gICAgICAgICAgICAgIDogLy8gSWYgc3RhdGUgd2FzIG5vdCBpbml0aWFsaXplZCwgd2UnbGwgdGhyb3cgYW4gZXJyb3IuXG4gICAgICAgICAgICAgICAgdGhyb3dFcnJvcihcbiAgICAgICAgICAgICAgICAgIEVycm9yKGAke3RoaXMuY29uc3RydWN0b3IubmFtZX0gaGFzIG5vdCBiZWVuIGluaXRpYWxpemVkYClcbiAgICAgICAgICAgICAgICApXG4gICAgICAgICAgKSxcbiAgICAgICAgICB0YWtlVW50aWwodGhpcy5kZXN0cm95JClcbiAgICAgICAgKVxuICAgICAgICAuc3Vic2NyaWJlKHtcbiAgICAgICAgICBuZXh0OiAoW3ZhbHVlLCBjdXJyZW50U3RhdGVdKSA9PiB7XG4gICAgICAgICAgICB0aGlzLnN0YXRlU3ViamVjdCQubmV4dCh1cGRhdGVyRm4oY3VycmVudFN0YXRlLCB2YWx1ZSEpKTtcbiAgICAgICAgICB9LFxuICAgICAgICAgIGVycm9yOiAoZXJyb3IpID0+IHtcbiAgICAgICAgICAgIGluaXRpYWxpemF0aW9uRXJyb3IgPSBlcnJvcjtcbiAgICAgICAgICAgIHRoaXMuc3RhdGVTdWJqZWN0JC5lcnJvcihlcnJvcik7XG4gICAgICAgICAgfSxcbiAgICAgICAgfSk7XG5cbiAgICAgIGlmIChpbml0aWFsaXphdGlvbkVycm9yKSB7XG4gICAgICAgIHRocm93IGluaXRpYWxpemF0aW9uRXJyb3I7XG4gICAgICB9XG4gICAgICByZXR1cm4gc3Vic2NyaXB0aW9uO1xuICAgIH0pIGFzIHVua25vd24gZXh0ZW5kcyBWXG4gICAgICA/ICgpID0+IHZvaWRcbiAgICAgIDogKHQ6IFYgfCBPYnNlcnZhYmxlPFY+KSA9PiBTdWJzY3JpcHRpb247XG4gIH1cblxuICAvKipcbiAgICogSW5pdGlhbGl6ZXMgc3RhdGUuIElmIGl0IHdhcyBhbHJlYWR5IGluaXRpYWxpemVkIHRoZW4gaXQgcmVzZXRzIHRoZVxuICAgKiBzdGF0ZS5cbiAgICovXG4gIHByaXZhdGUgaW5pdFN0YXRlKHN0YXRlOiBUKTogdm9pZCB7XG4gICAgdGhpcy5pc0luaXRpYWxpemVkID0gdHJ1ZTtcbiAgICB0aGlzLnN0YXRlU3ViamVjdCQubmV4dChzdGF0ZSk7XG4gIH1cblxuICAvKipcbiAgICogU2V0cyB0aGUgc3RhdGUgc3BlY2lmaWMgdmFsdWUuXG4gICAqIEBwYXJhbSBzdGF0ZU9yVXBkYXRlckZuIG9iamVjdCBvZiB0aGUgc2FtZSB0eXBlIGFzIHRoZSBzdGF0ZSBvciBhblxuICAgKiB1cGRhdGVyRm4sIHJldHVybmluZyBzdWNoIG9iamVjdC5cbiAgICovXG4gIHNldFN0YXRlKHN0YXRlT3JVcGRhdGVyRm46IFQgfCAoKHN0YXRlOiBUKSA9PiBUKSk6IHZvaWQge1xuICAgIGlmICh0eXBlb2Ygc3RhdGVPclVwZGF0ZXJGbiAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgdGhpcy5pbml0U3RhdGUoc3RhdGVPclVwZGF0ZXJGbik7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMudXBkYXRlcihzdGF0ZU9yVXBkYXRlckZuIGFzIChzdGF0ZTogVCkgPT4gVCkoKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlcyBhIHNlbGVjdG9yLlxuICAgKlxuICAgKiBUaGlzIHN1cHBvcnRzIGNoYWluaW5nIHVwIHRvIDQgc2VsZWN0b3JzLiBNb3JlIGNvdWxkIGJlIGFkZGVkIGFzIG5lZWRlZC5cbiAgICpcbiAgICogQHBhcmFtIHByb2plY3RvciBBIHB1cmUgcHJvamVjdGlvbiBmdW5jdGlvbiB0aGF0IHRha2VzIHRoZSBjdXJyZW50IHN0YXRlIGFuZFxuICAgKiAgIHJldHVybnMgc29tZSBuZXcgc2xpY2UvcHJvamVjdGlvbiBvZiB0aGF0IHN0YXRlLlxuICAgKiBAcmV0dXJuIEFuIG9ic2VydmFibGUgb2YgdGhlIHByb2plY3RvciByZXN1bHRzLlxuICAgKi9cbiAgc2VsZWN0PFI+KHByb2plY3RvcjogKHM6IFQpID0+IFIpOiBPYnNlcnZhYmxlPFI+O1xuICBzZWxlY3Q8UiwgUzE+KHMxOiBPYnNlcnZhYmxlPFMxPiwgcHJvamVjdG9yOiAoczE6IFMxKSA9PiBSKTogT2JzZXJ2YWJsZTxSPjtcbiAgc2VsZWN0PFIsIFMxLCBTMj4oXG4gICAgczE6IE9ic2VydmFibGU8UzE+LFxuICAgIHMyOiBPYnNlcnZhYmxlPFMyPixcbiAgICBwcm9qZWN0b3I6IChzMTogUzEsIHMyOiBTMikgPT4gUlxuICApOiBPYnNlcnZhYmxlPFI+O1xuICBzZWxlY3Q8UiwgUzEsIFMyLCBTMz4oXG4gICAgczE6IE9ic2VydmFibGU8UzE+LFxuICAgIHMyOiBPYnNlcnZhYmxlPFMyPixcbiAgICBzMzogT2JzZXJ2YWJsZTxTMz4sXG4gICAgcHJvamVjdG9yOiAoczE6IFMxLCBzMjogUzIsIHMzOiBTMykgPT4gUlxuICApOiBPYnNlcnZhYmxlPFI+O1xuICBzZWxlY3Q8UiwgUzEsIFMyLCBTMywgUzQ+KFxuICAgIHMxOiBPYnNlcnZhYmxlPFMxPixcbiAgICBzMjogT2JzZXJ2YWJsZTxTMj4sXG4gICAgczM6IE9ic2VydmFibGU8UzM+LFxuICAgIHM0OiBPYnNlcnZhYmxlPFM0PixcbiAgICBwcm9qZWN0b3I6IChzMTogUzEsIHMyOiBTMiwgczM6IFMzLCBzNDogUzQpID0+IFJcbiAgKTogT2JzZXJ2YWJsZTxSPjtcbiAgc2VsZWN0PFI+KC4uLmFyZ3M6IGFueVtdKTogT2JzZXJ2YWJsZTxSPiB7XG4gICAgbGV0IG9ic2VydmFibGUkOiBPYnNlcnZhYmxlPFI+O1xuICAgIC8vIHByb2plY3QgaXMgYWx3YXlzIHRoZSBsYXN0IGFyZ3VtZW50LCBzbyBgcG9wYCBpdCBmcm9tIGFyZ3MuXG4gICAgY29uc3QgcHJvamVjdG9yOiAoLi4uYXJnczogYW55W10pID0+IFIgPSBhcmdzLnBvcCgpO1xuICAgIGlmIChhcmdzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgLy8gSWYgcHJvamVjdG9yIHdhcyB0aGUgb25seSBhcmd1bWVudCB0aGVuIHdlJ2xsIHVzZSBtYXAgb3BlcmF0b3IuXG4gICAgICBvYnNlcnZhYmxlJCA9IHRoaXMuc3RhdGVTdWJqZWN0JC5waXBlKG1hcChwcm9qZWN0b3IpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gSWYgdGhlcmUgYXJlIG11bHRpcGxlIGFyZ3VtZW50cywgd2UncmUgY2hhaW5pbmcgc2VsZWN0b3JzLCBzbyB3ZSBuZWVkXG4gICAgICAvLyB0byB0YWtlIHRoZSBjb21iaW5lTGF0ZXN0IG9mIHRoZW0gYmVmb3JlIGNhbGxpbmcgdGhlIG1hcCBmdW5jdGlvbi5cbiAgICAgIG9ic2VydmFibGUkID0gY29tYmluZUxhdGVzdChhcmdzKS5waXBlKFxuICAgICAgICAvLyBUaGUgbW9zdCBwZXJmb3JtYW50IHdheSB0byBjb21iaW5lIE9ic2VydmFibGVzIGF2b2lkaW5nIHVubmVjZXNzYXJ5XG4gICAgICAgIC8vIGVtaXNzaW9ucyBhbmQgcHJvamVjdG9yIGNhbGxzLlxuICAgICAgICBkZWJvdW5jZVN5bmMoKSxcbiAgICAgICAgbWFwKChhcmdzOiBhbnlbXSkgPT4gcHJvamVjdG9yKC4uLmFyZ3MpKVxuICAgICAgKTtcbiAgICB9XG4gICAgY29uc3QgZGlzdGluY3RTaGFyZWRPYnNlcnZhYmxlJCA9IG9ic2VydmFibGUkLnBpcGUoXG4gICAgICBkaXN0aW5jdFVudGlsQ2hhbmdlZCgpLFxuICAgICAgc2hhcmVSZXBsYXkoe1xuICAgICAgICByZWZDb3VudDogdHJ1ZSxcbiAgICAgICAgYnVmZmVyU2l6ZTogMSxcbiAgICAgIH0pLFxuICAgICAgdGFrZVVudGlsKHRoaXMuZGVzdHJveSQpXG4gICAgKTtcbiAgICByZXR1cm4gZGlzdGluY3RTaGFyZWRPYnNlcnZhYmxlJDtcbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGVzIGFuIGVmZmVjdC5cbiAgICpcbiAgICogVGhpcyBlZmZlY3QgaXMgc3Vic2NyaWJlZCB0byBmb3IgdGhlIGxpZmUgb2YgdGhlIEBDb21wb25lbnQuXG4gICAqIEBwYXJhbSBnZW5lcmF0b3IgQSBmdW5jdGlvbiB0aGF0IHRha2VzIGFuIG9yaWdpbiBPYnNlcnZhYmxlIGlucHV0IGFuZFxuICAgKiAgICAgcmV0dXJucyBhbiBPYnNlcnZhYmxlLiBUaGUgT2JzZXJ2YWJsZSB0aGF0IGlzIHJldHVybmVkIHdpbGwgYmVcbiAgICogICAgIHN1YnNjcmliZWQgdG8gZm9yIHRoZSBsaWZlIG9mIHRoZSBjb21wb25lbnQuXG4gICAqIEByZXR1cm4gQSBmdW5jdGlvbiB0aGF0LCB3aGVuIGNhbGxlZCwgd2lsbCB0cmlnZ2VyIHRoZSBvcmlnaW4gT2JzZXJ2YWJsZS5cbiAgICovXG4gIGVmZmVjdDxWLCBSID0gdW5rbm93bj4oXG4gICAgZ2VuZXJhdG9yOiAob3JpZ2luJDogT2JzZXJ2YWJsZTxWPikgPT4gT2JzZXJ2YWJsZTxSPlxuICApOiBFZmZlY3RSZXR1cm5GbjxWPiB7XG4gICAgY29uc3Qgb3JpZ2luJCA9IG5ldyBTdWJqZWN0PFY+KCk7XG4gICAgZ2VuZXJhdG9yKG9yaWdpbiQpXG4gICAgICAvLyB0aWVkIHRvIHRoZSBsaWZlY3ljbGUg8J+RhyBvZiBDb21wb25lbnRTdG9yZVxuICAgICAgLnBpcGUodGFrZVVudGlsKHRoaXMuZGVzdHJveSQpKVxuICAgICAgLnN1YnNjcmliZSgpO1xuXG4gICAgcmV0dXJuIChvYnNlcnZhYmxlT3JWYWx1ZT86IFYgfCBPYnNlcnZhYmxlPFY+KTogU3Vic2NyaXB0aW9uID0+IHtcbiAgICAgIGNvbnN0IG9ic2VydmFibGUkID0gaXNPYnNlcnZhYmxlKG9ic2VydmFibGVPclZhbHVlKVxuICAgICAgICA/IG9ic2VydmFibGVPclZhbHVlXG4gICAgICAgIDogb2Yob2JzZXJ2YWJsZU9yVmFsdWUpO1xuICAgICAgcmV0dXJuIG9ic2VydmFibGUkLnBpcGUodGFrZVVudGlsKHRoaXMuZGVzdHJveSQpKS5zdWJzY3JpYmUoKHZhbHVlKSA9PiB7XG4gICAgICAgIC8vIGFueSBuZXcg8J+RhyB2YWx1ZSBpcyBwdXNoZWQgaW50byBhIHN0cmVhbVxuICAgICAgICBvcmlnaW4kLm5leHQodmFsdWUpO1xuICAgICAgfSk7XG4gICAgfTtcbiAgfVxufVxuIl19