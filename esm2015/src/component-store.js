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
function EffectReturnFn() { }
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
        s => s));
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
            value => this.isInitialized
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
                error => {
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
            value => {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcG9uZW50LXN0b3JlLmpzIiwic291cmNlUm9vdCI6Im5nOi8vQG5ncngvY29tcG9uZW50LXN0b3JlLyIsInNvdXJjZXMiOlsic3JjL2NvbXBvbmVudC1zdG9yZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7OztBQUFBLE9BQU8sRUFDTCxZQUFZLEVBRVosRUFBRSxFQUNGLGFBQWEsRUFFYixVQUFVLEVBQ1YsYUFBYSxFQUNiLE9BQU8sR0FDUixNQUFNLE1BQU0sQ0FBQztBQUNkLE9BQU8sRUFDTCxTQUFTLEVBQ1QsU0FBUyxFQUNULGNBQWMsRUFDZCxHQUFHLEVBQ0gsb0JBQW9CLEVBQ3BCLFdBQVcsR0FDWixNQUFNLGdCQUFnQixDQUFDO0FBQ3hCLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQzs7Ozs7OztBQU05Qyw2QkFHQzs7OztBQUVELE1BQU0sT0FBTyxjQUFjOzs7O0lBV3pCLFlBQVksWUFBZ0I7O1FBVFgsb0JBQWUsR0FBRyxJQUFJLGFBQWEsQ0FBTyxDQUFDLENBQUMsQ0FBQzs7UUFFckQsYUFBUSxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsWUFBWSxFQUFFLENBQUM7UUFFdkMsa0JBQWEsR0FBRyxJQUFJLGFBQWEsQ0FBSSxDQUFDLENBQUMsQ0FBQztRQUNqRCxrQkFBYSxHQUFHLEtBQUssQ0FBQzs7UUFFckIsV0FBTSxHQUFrQixJQUFJLENBQUMsTUFBTTs7OztRQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFDLENBQUM7UUFHbkQsdUVBQXVFO1FBQ3ZFLFlBQVk7UUFDWixJQUFJLFlBQVksRUFBRTtZQUNoQixJQUFJLENBQUMsU0FBUyxDQUFDLFlBQVksQ0FBQyxDQUFDO1NBQzlCO0lBQ0gsQ0FBQzs7Ozs7SUFHRCxXQUFXO1FBQ1QsSUFBSSxDQUFDLGFBQWEsQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUM5QixJQUFJLENBQUMsZUFBZSxDQUFDLElBQUksRUFBRSxDQUFDO0lBQzlCLENBQUM7Ozs7Ozs7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RSxDQUFDO1NBQ2QsQ0FBQyxFQUNGLFNBQVMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQ3pCO1FBQ0QsT0FBTyx5QkFBeUIsQ0FBQztJQUNuQyxDQUFDOzs7Ozs7Ozs7OztJQVdELE1BQU0sQ0FDSixTQUFvRDs7Y0FFOUMsT0FBTyxHQUFHLElBQUksT0FBTyxFQUFLO1FBQ2hDLFNBQVMsQ0FBQyxPQUFPLENBQUM7WUFDaEIsNkNBQTZDO2FBQzVDLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO2FBQzlCLFNBQVMsRUFBRSxDQUFDO1FBRWY7Ozs7UUFBTyxDQUFDLGlCQUFxQyxFQUFnQixFQUFFOztrQkFDdkQsV0FBVyxHQUFHLFlBQVksQ0FBQyxpQkFBaUIsQ0FBQztnQkFDakQsQ0FBQyxDQUFDLGlCQUFpQjtnQkFDbkIsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQztZQUN6QixPQUFPLFdBQVcsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLFNBQVM7Ozs7WUFBQyxLQUFLLENBQUMsRUFBRTtnQkFDbEUsMkNBQTJDO2dCQUMzQyxPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ3RCLENBQUMsRUFBQyxDQUFDO1FBQ0wsQ0FBQyxFQUFDO0lBQ0osQ0FBQztDQUNGOzs7Ozs7SUE1TEMseUNBQThEOztJQUU5RCxrQ0FBd0Q7Ozs7O0lBRXhELHVDQUF5RDs7Ozs7SUFDekQsdUNBQThCOztJQUU5QixnQ0FBcUQiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge1xuICBpc09ic2VydmFibGUsXG4gIE9ic2VydmFibGUsXG4gIG9mLFxuICBSZXBsYXlTdWJqZWN0LFxuICBTdWJzY3JpcHRpb24sXG4gIHRocm93RXJyb3IsXG4gIGNvbWJpbmVMYXRlc3QsXG4gIFN1YmplY3QsXG59IGZyb20gJ3J4anMnO1xuaW1wb3J0IHtcbiAgY29uY2F0TWFwLFxuICB0YWtlVW50aWwsXG4gIHdpdGhMYXRlc3RGcm9tLFxuICBtYXAsXG4gIGRpc3RpbmN0VW50aWxDaGFuZ2VkLFxuICBzaGFyZVJlcGxheSxcbn0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0IHsgZGVib3VuY2VTeW5jIH0gZnJvbSAnLi9kZWJvdW5jZVN5bmMnO1xuXG4vKipcbiAqIFJldHVybiB0eXBlIG9mIHRoZSBlZmZlY3QsIHRoYXQgYmVoYXZlcyBkaWZmZXJlbnRseSBiYXNlZCBvbiB3aGV0aGVyIHRoZVxuICogYXJndW1lbnQgaXMgcGFzc2VkIHRvIHRoZSBjYWxsYmFjay5cbiAqL1xuaW50ZXJmYWNlIEVmZmVjdFJldHVybkZuPFQ+IHtcbiAgKCk6IHZvaWQ7XG4gICh0OiBUIHwgT2JzZXJ2YWJsZTxUPik6IFN1YnNjcmlwdGlvbjtcbn1cblxuZXhwb3J0IGNsYXNzIENvbXBvbmVudFN0b3JlPFQgZXh0ZW5kcyBvYmplY3Q+IHtcbiAgLy8gU2hvdWxkIGJlIHVzZWQgb25seSBpbiBuZ09uRGVzdHJveS5cbiAgcHJpdmF0ZSByZWFkb25seSBkZXN0cm95U3ViamVjdCQgPSBuZXcgUmVwbGF5U3ViamVjdDx2b2lkPigxKTtcbiAgLy8gRXhwb3NlZCB0byBhbnkgZXh0ZW5kaW5nIFN0b3JlIHRvIGJlIHVzZWQgZm9yIHRoZSB0ZWFyZG93bnMuXG4gIHJlYWRvbmx5IGRlc3Ryb3kkID0gdGhpcy5kZXN0cm95U3ViamVjdCQuYXNPYnNlcnZhYmxlKCk7XG5cbiAgcHJpdmF0ZSByZWFkb25seSBzdGF0ZVN1YmplY3QkID0gbmV3IFJlcGxheVN1YmplY3Q8VD4oMSk7XG4gIHByaXZhdGUgaXNJbml0aWFsaXplZCA9IGZhbHNlO1xuICAvLyBOZWVkcyB0byBiZSBhZnRlciBkZXN0cm95JCBpcyBkZWNsYXJlZCBiZWNhdXNlIGl0J3MgdXNlZCBpbiBzZWxlY3QuXG4gIHJlYWRvbmx5IHN0YXRlJDogT2JzZXJ2YWJsZTxUPiA9IHRoaXMuc2VsZWN0KHMgPT4gcyk7XG5cbiAgY29uc3RydWN0b3IoZGVmYXVsdFN0YXRlPzogVCkge1xuICAgIC8vIFN0YXRlIGNhbiBiZSBpbml0aWFsaXplZCBlaXRoZXIgdGhyb3VnaCBjb25zdHJ1Y3Rvciwgb3IgaW5pdFN0YXRlIG9yXG4gICAgLy8gc2V0U3RhdGUuXG4gICAgaWYgKGRlZmF1bHRTdGF0ZSkge1xuICAgICAgdGhpcy5pbml0U3RhdGUoZGVmYXVsdFN0YXRlKTtcbiAgICB9XG4gIH1cblxuICAvKiogQ29tcGxldGVzIGFsbCByZWxldmFudCBPYnNlcnZhYmxlIHN0cmVhbXMuICovXG4gIG5nT25EZXN0cm95KCkge1xuICAgIHRoaXMuc3RhdGVTdWJqZWN0JC5jb21wbGV0ZSgpO1xuICAgIHRoaXMuZGVzdHJveVN1YmplY3QkLm5leHQoKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGVzIGFuIHVwZGF0ZXIuXG4gICAqXG4gICAqIFRocm93cyBhbiBlcnJvciBpZiB1cGRhdGVyIGlzIGNhbGxlZCB3aXRoIHN5bmNocm9ub3VzIHZhbHVlcyAoZWl0aGVyXG4gICAqIGltcGVyYXRpdmUgdmFsdWUgb3IgT2JzZXJ2YWJsZSB0aGF0IGlzIHN5bmNocm9ub3VzKSBiZWZvcmUgQ29tcG9uZW50U3RvcmVcbiAgICogaXMgaW5pdGlhbGl6ZWQuIElmIGNhbGxlZCB3aXRoIGFzeW5jIE9ic2VydmFibGUgYmVmb3JlIGluaXRpYWxpemF0aW9uIHRoZW5cbiAgICogc3RhdGUgd2lsbCBub3QgYmUgdXBkYXRlZCBhbmQgc3Vic2NyaXB0aW9uIHdvdWxkIGJlIGNsb3NlZC5cbiAgICpcbiAgICogQHBhcmFtIHVwZGF0ZXJGbiBBIHN0YXRpYyB1cGRhdGVyIGZ1bmN0aW9uIHRoYXQgdGFrZXMgMiBwYXJhbWV0ZXJzICh0aGVcbiAgICogY3VycmVudCBzdGF0ZSBhbmQgYW4gYXJndW1lbnQgb2JqZWN0KSBhbmQgcmV0dXJucyBhIG5ldyBpbnN0YW5jZSBvZiB0aGVcbiAgICogc3RhdGUuXG4gICAqIEByZXR1cm4gQSBmdW5jdGlvbiB0aGF0IGFjY2VwdHMgb25lIGFyZ3VtZW50IHdoaWNoIGlzIGZvcndhcmRlZCBhcyB0aGVcbiAgICogICAgIHNlY29uZCBhcmd1bWVudCB0byBgdXBkYXRlckZuYC4gRXZlcnl0aW1lIHRoaXMgZnVuY3Rpb24gaXMgY2FsbGVkXG4gICAqICAgICBzdWJzY3JpYmVycyB3aWxsIGJlIG5vdGlmaWVkIG9mIHRoZSBzdGF0ZSBjaGFuZ2UuXG4gICAqL1xuICB1cGRhdGVyPFY+KFxuICAgIHVwZGF0ZXJGbjogKHN0YXRlOiBULCB2YWx1ZTogVikgPT4gVFxuICApOiB1bmtub3duIGV4dGVuZHMgViA/ICgpID0+IHZvaWQgOiAodDogViB8IE9ic2VydmFibGU8Vj4pID0+IFN1YnNjcmlwdGlvbiB7XG4gICAgcmV0dXJuICgob2JzZXJ2YWJsZU9yVmFsdWU/OiBWIHwgT2JzZXJ2YWJsZTxWPik6IFN1YnNjcmlwdGlvbiA9PiB7XG4gICAgICBsZXQgaW5pdGlhbGl6YXRpb25FcnJvcjogRXJyb3IgfCB1bmRlZmluZWQ7XG4gICAgICAvLyBXZSBjYW4gcmVjZWl2ZSBlaXRoZXIgdGhlIHZhbHVlIG9yIGFuIG9ic2VydmFibGUuIEluIGNhc2UgaXQncyBhXG4gICAgICAvLyBzaW1wbGUgdmFsdWUsIHdlJ2xsIHdyYXAgaXQgd2l0aCBgb2ZgIG9wZXJhdG9yIHRvIHR1cm4gaXQgaW50b1xuICAgICAgLy8gT2JzZXJ2YWJsZS5cbiAgICAgIGNvbnN0IG9ic2VydmFibGUkID0gaXNPYnNlcnZhYmxlKG9ic2VydmFibGVPclZhbHVlKVxuICAgICAgICA/IG9ic2VydmFibGVPclZhbHVlXG4gICAgICAgIDogb2Yob2JzZXJ2YWJsZU9yVmFsdWUpO1xuICAgICAgY29uc3Qgc3Vic2NyaXB0aW9uID0gb2JzZXJ2YWJsZSRcbiAgICAgICAgLnBpcGUoXG4gICAgICAgICAgY29uY2F0TWFwKFxuICAgICAgICAgICAgdmFsdWUgPT5cbiAgICAgICAgICAgICAgdGhpcy5pc0luaXRpYWxpemVkXG4gICAgICAgICAgICAgICAgPyBvZih2YWx1ZSkucGlwZSh3aXRoTGF0ZXN0RnJvbSh0aGlzLnN0YXRlU3ViamVjdCQpKVxuICAgICAgICAgICAgICAgIDogLy8gSWYgc3RhdGUgd2FzIG5vdCBpbml0aWFsaXplZCwgd2UnbGwgdGhyb3cgYW4gZXJyb3IuXG4gICAgICAgICAgICAgICAgICB0aHJvd0Vycm9yKFxuICAgICAgICAgICAgICAgICAgICBFcnJvcihgJHt0aGlzLmNvbnN0cnVjdG9yLm5hbWV9IGhhcyBub3QgYmVlbiBpbml0aWFsaXplZGApXG4gICAgICAgICAgICAgICAgICApXG4gICAgICAgICAgKSxcbiAgICAgICAgICB0YWtlVW50aWwodGhpcy5kZXN0cm95JClcbiAgICAgICAgKVxuICAgICAgICAuc3Vic2NyaWJlKHtcbiAgICAgICAgICBuZXh0OiAoW3ZhbHVlLCBjdXJyZW50U3RhdGVdKSA9PiB7XG4gICAgICAgICAgICB0aGlzLnN0YXRlU3ViamVjdCQubmV4dCh1cGRhdGVyRm4oY3VycmVudFN0YXRlLCB2YWx1ZSEpKTtcbiAgICAgICAgICB9LFxuICAgICAgICAgIGVycm9yOiBlcnJvciA9PiB7XG4gICAgICAgICAgICBpbml0aWFsaXphdGlvbkVycm9yID0gZXJyb3I7XG4gICAgICAgICAgICB0aGlzLnN0YXRlU3ViamVjdCQuZXJyb3IoZXJyb3IpO1xuICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuXG4gICAgICBpZiAoaW5pdGlhbGl6YXRpb25FcnJvcikge1xuICAgICAgICB0aHJvdyBpbml0aWFsaXphdGlvbkVycm9yO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHN1YnNjcmlwdGlvbjtcbiAgICB9KSBhcyB1bmtub3duIGV4dGVuZHMgVlxuICAgICAgPyAoKSA9PiB2b2lkXG4gICAgICA6ICh0OiBWIHwgT2JzZXJ2YWJsZTxWPikgPT4gU3Vic2NyaXB0aW9uO1xuICB9XG5cbiAgLyoqXG4gICAqIEluaXRpYWxpemVzIHN0YXRlLiBJZiBpdCB3YXMgYWxyZWFkeSBpbml0aWFsaXplZCB0aGVuIGl0IHJlc2V0cyB0aGVcbiAgICogc3RhdGUuXG4gICAqL1xuICBwcml2YXRlIGluaXRTdGF0ZShzdGF0ZTogVCk6IHZvaWQge1xuICAgIHRoaXMuaXNJbml0aWFsaXplZCA9IHRydWU7XG4gICAgdGhpcy5zdGF0ZVN1YmplY3QkLm5leHQoc3RhdGUpO1xuICB9XG5cbiAgLyoqXG4gICAqIFNldHMgdGhlIHN0YXRlIHNwZWNpZmljIHZhbHVlLlxuICAgKiBAcGFyYW0gc3RhdGVPclVwZGF0ZXJGbiBvYmplY3Qgb2YgdGhlIHNhbWUgdHlwZSBhcyB0aGUgc3RhdGUgb3IgYW5cbiAgICogdXBkYXRlckZuLCByZXR1cm5pbmcgc3VjaCBvYmplY3QuXG4gICAqL1xuICBzZXRTdGF0ZShzdGF0ZU9yVXBkYXRlckZuOiBUIHwgKChzdGF0ZTogVCkgPT4gVCkpOiB2b2lkIHtcbiAgICBpZiAodHlwZW9mIHN0YXRlT3JVcGRhdGVyRm4gIT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHRoaXMuaW5pdFN0YXRlKHN0YXRlT3JVcGRhdGVyRm4pO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnVwZGF0ZXIoc3RhdGVPclVwZGF0ZXJGbiBhcyAoc3RhdGU6IFQpID0+IFQpKCk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIENyZWF0ZXMgYSBzZWxlY3Rvci5cbiAgICpcbiAgICogVGhpcyBzdXBwb3J0cyBjaGFpbmluZyB1cCB0byA0IHNlbGVjdG9ycy4gTW9yZSBjb3VsZCBiZSBhZGRlZCBhcyBuZWVkZWQuXG4gICAqXG4gICAqIEBwYXJhbSBwcm9qZWN0b3IgQSBwdXJlIHByb2plY3Rpb24gZnVuY3Rpb24gdGhhdCB0YWtlcyB0aGUgY3VycmVudCBzdGF0ZSBhbmRcbiAgICogICByZXR1cm5zIHNvbWUgbmV3IHNsaWNlL3Byb2plY3Rpb24gb2YgdGhhdCBzdGF0ZS5cbiAgICogQHJldHVybiBBbiBvYnNlcnZhYmxlIG9mIHRoZSBwcm9qZWN0b3IgcmVzdWx0cy5cbiAgICovXG4gIHNlbGVjdDxSPihwcm9qZWN0b3I6IChzOiBUKSA9PiBSKTogT2JzZXJ2YWJsZTxSPjtcbiAgc2VsZWN0PFIsIFMxPihzMTogT2JzZXJ2YWJsZTxTMT4sIHByb2plY3RvcjogKHMxOiBTMSkgPT4gUik6IE9ic2VydmFibGU8Uj47XG4gIHNlbGVjdDxSLCBTMSwgUzI+KFxuICAgIHMxOiBPYnNlcnZhYmxlPFMxPixcbiAgICBzMjogT2JzZXJ2YWJsZTxTMj4sXG4gICAgcHJvamVjdG9yOiAoczE6IFMxLCBzMjogUzIpID0+IFJcbiAgKTogT2JzZXJ2YWJsZTxSPjtcbiAgc2VsZWN0PFIsIFMxLCBTMiwgUzM+KFxuICAgIHMxOiBPYnNlcnZhYmxlPFMxPixcbiAgICBzMjogT2JzZXJ2YWJsZTxTMj4sXG4gICAgczM6IE9ic2VydmFibGU8UzM+LFxuICAgIHByb2plY3RvcjogKHMxOiBTMSwgczI6IFMyLCBzMzogUzMpID0+IFJcbiAgKTogT2JzZXJ2YWJsZTxSPjtcbiAgc2VsZWN0PFIsIFMxLCBTMiwgUzMsIFM0PihcbiAgICBzMTogT2JzZXJ2YWJsZTxTMT4sXG4gICAgczI6IE9ic2VydmFibGU8UzI+LFxuICAgIHMzOiBPYnNlcnZhYmxlPFMzPixcbiAgICBzNDogT2JzZXJ2YWJsZTxTND4sXG4gICAgcHJvamVjdG9yOiAoczE6IFMxLCBzMjogUzIsIHMzOiBTMywgczQ6IFM0KSA9PiBSXG4gICk6IE9ic2VydmFibGU8Uj47XG4gIHNlbGVjdDxSPiguLi5hcmdzOiBhbnlbXSk6IE9ic2VydmFibGU8Uj4ge1xuICAgIGxldCBvYnNlcnZhYmxlJDogT2JzZXJ2YWJsZTxSPjtcbiAgICAvLyBwcm9qZWN0IGlzIGFsd2F5cyB0aGUgbGFzdCBhcmd1bWVudCwgc28gYHBvcGAgaXQgZnJvbSBhcmdzLlxuICAgIGNvbnN0IHByb2plY3RvcjogKC4uLmFyZ3M6IGFueVtdKSA9PiBSID0gYXJncy5wb3AoKTtcbiAgICBpZiAoYXJncy5sZW5ndGggPT09IDApIHtcbiAgICAgIC8vIElmIHByb2plY3RvciB3YXMgdGhlIG9ubHkgYXJndW1lbnQgdGhlbiB3ZSdsbCB1c2UgbWFwIG9wZXJhdG9yLlxuICAgICAgb2JzZXJ2YWJsZSQgPSB0aGlzLnN0YXRlU3ViamVjdCQucGlwZShtYXAocHJvamVjdG9yKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIElmIHRoZXJlIGFyZSBtdWx0aXBsZSBhcmd1bWVudHMsIHdlJ3JlIGNoYWluaW5nIHNlbGVjdG9ycywgc28gd2UgbmVlZFxuICAgICAgLy8gdG8gdGFrZSB0aGUgY29tYmluZUxhdGVzdCBvZiB0aGVtIGJlZm9yZSBjYWxsaW5nIHRoZSBtYXAgZnVuY3Rpb24uXG4gICAgICBvYnNlcnZhYmxlJCA9IGNvbWJpbmVMYXRlc3QoYXJncykucGlwZShcbiAgICAgICAgLy8gVGhlIG1vc3QgcGVyZm9ybWFudCB3YXkgdG8gY29tYmluZSBPYnNlcnZhYmxlcyBhdm9pZGluZyB1bm5lY2Vzc2FyeVxuICAgICAgICAvLyBlbWlzc2lvbnMgYW5kIHByb2plY3RvciBjYWxscy5cbiAgICAgICAgZGVib3VuY2VTeW5jKCksXG4gICAgICAgIG1hcCgoYXJnczogYW55W10pID0+IHByb2plY3RvciguLi5hcmdzKSlcbiAgICAgICk7XG4gICAgfVxuICAgIGNvbnN0IGRpc3RpbmN0U2hhcmVkT2JzZXJ2YWJsZSQgPSBvYnNlcnZhYmxlJC5waXBlKFxuICAgICAgZGlzdGluY3RVbnRpbENoYW5nZWQoKSxcbiAgICAgIHNoYXJlUmVwbGF5KHtcbiAgICAgICAgcmVmQ291bnQ6IHRydWUsXG4gICAgICAgIGJ1ZmZlclNpemU6IDEsXG4gICAgICB9KSxcbiAgICAgIHRha2VVbnRpbCh0aGlzLmRlc3Ryb3kkKVxuICAgICk7XG4gICAgcmV0dXJuIGRpc3RpbmN0U2hhcmVkT2JzZXJ2YWJsZSQ7XG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlcyBhbiBlZmZlY3QuXG4gICAqXG4gICAqIFRoaXMgZWZmZWN0IGlzIHN1YnNjcmliZWQgdG8gZm9yIHRoZSBsaWZlIG9mIHRoZSBAQ29tcG9uZW50LlxuICAgKiBAcGFyYW0gZ2VuZXJhdG9yIEEgZnVuY3Rpb24gdGhhdCB0YWtlcyBhbiBvcmlnaW4gT2JzZXJ2YWJsZSBpbnB1dCBhbmRcbiAgICogICAgIHJldHVybnMgYW4gT2JzZXJ2YWJsZS4gVGhlIE9ic2VydmFibGUgdGhhdCBpcyByZXR1cm5lZCB3aWxsIGJlXG4gICAqICAgICBzdWJzY3JpYmVkIHRvIGZvciB0aGUgbGlmZSBvZiB0aGUgY29tcG9uZW50LlxuICAgKiBAcmV0dXJuIEEgZnVuY3Rpb24gdGhhdCwgd2hlbiBjYWxsZWQsIHdpbGwgdHJpZ2dlciB0aGUgb3JpZ2luIE9ic2VydmFibGUuXG4gICAqL1xuICBlZmZlY3Q8ViwgUiA9IHVua25vd24+KFxuICAgIGdlbmVyYXRvcjogKG9yaWdpbiQ6IE9ic2VydmFibGU8Vj4pID0+IE9ic2VydmFibGU8Uj5cbiAgKTogRWZmZWN0UmV0dXJuRm48Vj4ge1xuICAgIGNvbnN0IG9yaWdpbiQgPSBuZXcgU3ViamVjdDxWPigpO1xuICAgIGdlbmVyYXRvcihvcmlnaW4kKVxuICAgICAgLy8gdGllZCB0byB0aGUgbGlmZWN5Y2xlIPCfkYcgb2YgQ29tcG9uZW50U3RvcmVcbiAgICAgIC5waXBlKHRha2VVbnRpbCh0aGlzLmRlc3Ryb3kkKSlcbiAgICAgIC5zdWJzY3JpYmUoKTtcblxuICAgIHJldHVybiAob2JzZXJ2YWJsZU9yVmFsdWU/OiBWIHwgT2JzZXJ2YWJsZTxWPik6IFN1YnNjcmlwdGlvbiA9PiB7XG4gICAgICBjb25zdCBvYnNlcnZhYmxlJCA9IGlzT2JzZXJ2YWJsZShvYnNlcnZhYmxlT3JWYWx1ZSlcbiAgICAgICAgPyBvYnNlcnZhYmxlT3JWYWx1ZVxuICAgICAgICA6IG9mKG9ic2VydmFibGVPclZhbHVlKTtcbiAgICAgIHJldHVybiBvYnNlcnZhYmxlJC5waXBlKHRha2VVbnRpbCh0aGlzLmRlc3Ryb3kkKSkuc3Vic2NyaWJlKHZhbHVlID0+IHtcbiAgICAgICAgLy8gYW55IG5ldyDwn5GHIHZhbHVlIGlzIHB1c2hlZCBpbnRvIGEgc3RyZWFtXG4gICAgICAgIG9yaWdpbiQubmV4dCh2YWx1ZSk7XG4gICAgICB9KTtcbiAgICB9O1xuICB9XG59XG4iXX0=