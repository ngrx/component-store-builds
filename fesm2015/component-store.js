/**
 * @license NgRx 9.2.0+1.sha-47e7ba3
 * (c) 2015-2018 Brandon Roberts, Mike Ryan, Rob Wormald, Victor Savkin
 * License: MIT
 */
import { Observable, Subscription, asapScheduler, ReplaySubject, isObservable, of, throwError, combineLatest } from 'rxjs';
import { concatMap, withLatestFrom, takeUntil, map, distinctUntilChanged, shareReplay } from 'rxjs/operators';

/**
 * @license MIT License
 *
 * Copyright (c) 2017-2020 Nicholas Jamieson and contributors
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
function debounceSync() {
    return source => new Observable(observer => {
        let actionSubscription;
        let actionValue;
        const rootSubscription = new Subscription();
        rootSubscription.add(source.subscribe({
            complete: () => {
                if (actionSubscription) {
                    observer.next(actionValue);
                }
                observer.complete();
            },
            error: error => observer.error(error),
            next: value => {
                actionValue = value;
                if (!actionSubscription) {
                    actionSubscription = asapScheduler.schedule(() => {
                        observer.next(actionValue);
                        actionSubscription = undefined;
                    });
                    rootSubscription.add(actionSubscription);
                }
            },
        }));
        return rootSubscription;
    });
}

class ComponentStore {
    constructor(defaultState) {
        // Should be used only in ngOnDestroy.
        this.destroySubject$ = new ReplaySubject(1);
        // Exposed to any extending Store to be used for the teardowns.
        this.destroy$ = this.destroySubject$.asObservable();
        this.stateSubject$ = new ReplaySubject(1);
        this.isInitialized = false;
        // Needs to be after destroy$ is declared because it's used in select.
        this.state$ = this.select(s => s);
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
    select(...args) {
        let observable$;
        // project is always the last argument, so `pop` it from args.
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
            debounceSync(), map((args) => projector(...args)));
        }
        const distinctSharedObservable$ = observable$.pipe(distinctUntilChanged(), shareReplay({
            refCount: true,
            bufferSize: 1,
        }), takeUntil(this.destroy$));
        return distinctSharedObservable$;
    }
}

/**
 * DO NOT EDIT
 *
 * This file is automatically generated at build
 */

export { ComponentStore };
//# sourceMappingURL=component-store.js.map
