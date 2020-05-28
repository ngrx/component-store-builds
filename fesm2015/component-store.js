/**
 * @license NgRx 9.2.0
 * (c) 2015-2018 Brandon Roberts, Mike Ryan, Rob Wormald, Victor Savkin
 * License: MIT
 */
import { ReplaySubject, isObservable, of, throwError } from 'rxjs';
import { concatMap, withLatestFrom, takeUntil } from 'rxjs/operators';

class ComponentStore {
    constructor(defaultState) {
        this.stateSubject$ = new ReplaySubject(1);
        this.isInitialized = false;
        this.state$ = this.stateSubject$.asObservable();
        // Should be used only in ngOnDestroy.
        this.destroySubject$ = new ReplaySubject(1);
        // Exposed to any extending Store to be used for the teardowns.
        this.destroy$ = this.destroySubject$.asObservable();
        // State can be initialized either through constructor, or initState or
        // setState.
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
     *     second argument to `updaterFn`. Everytime this function is called
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
                .pipe(concatMap(value => this.isInitialized
                ? of(value).pipe(withLatestFrom(this.stateSubject$))
                : // If state was not initialized, we'll throw an error.
                    throwError(Error(`${this.constructor.name} has not been initialized`))), takeUntil(this.destroy$))
                .subscribe({
                next: ([value, currentState]) => {
                    this.stateSubject$.next(updaterFn(currentState, value));
                },
                error: error => {
                    initializationError = error;
                    this.stateSubject$.error(error);
                },
            });
            if (initializationError) {
                throw initializationError;
            }
            return subscription;
        });
    }
    /**
     * Initializes state. If it was already initialized then it resets the
     * state.
     */
    initState(state) {
        this.isInitialized = true;
        this.stateSubject$.next(state);
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
}

/**
 * DO NOT EDIT
 *
 * This file is automatically generated at build
 */

export { ComponentStore };
//# sourceMappingURL=component-store.js.map
