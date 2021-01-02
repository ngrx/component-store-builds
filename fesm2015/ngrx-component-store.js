import { Observable, Subscription, asapScheduler, ReplaySubject, isObservable, of, scheduled, queueScheduler, throwError, combineLatest, Subject, EMPTY } from 'rxjs';
import { concatMap, withLatestFrom, takeUntil, take, map, distinctUntilChanged, shareReplay, tap, catchError } from 'rxjs/operators';
import { InjectionToken, Injectable, Optional, Inject } from '@angular/core';

/**
 * @fileoverview added by tsickle
 * Generated from: src/debounce-sync.ts
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
/**
 * @template T
 * @return {?}
 */
function debounceSync() {
    return (/**
     * @param {?} source
     * @return {?}
     */
    (source) => new Observable((/**
     * @param {?} observer
     * @return {?}
     */
    (observer) => {
        /** @type {?} */
        let actionSubscription;
        /** @type {?} */
        let actionValue;
        /** @type {?} */
        const rootSubscription = new Subscription();
        rootSubscription.add(source.subscribe({
            complete: (/**
             * @return {?}
             */
            () => {
                if (actionSubscription) {
                    observer.next(actionValue);
                }
                observer.complete();
            }),
            error: (/**
             * @param {?} error
             * @return {?}
             */
            (error) => {
                observer.error(error);
            }),
            next: (/**
             * @param {?} value
             * @return {?}
             */
            (value) => {
                actionValue = value;
                if (!actionSubscription) {
                    actionSubscription = asapScheduler.schedule((/**
                     * @return {?}
                     */
                    () => {
                        observer.next(actionValue);
                        actionSubscription = undefined;
                    }));
                    rootSubscription.add(actionSubscription);
                }
            }),
        }));
        return rootSubscription;
    })));
}

/**
 * @fileoverview added by tsickle
 * Generated from: src/component-store.ts
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
/**
 * @record
 */
function SelectConfig() { }
if (false) {
    /** @type {?|undefined} */
    SelectConfig.prototype.debounce;
}
/** @type {?} */
const INITIAL_STATE_TOKEN = new InjectionToken('@ngrx/component-store Initial State');
/**
 * @template T
 */
class ComponentStore {
    /**
     * @param {?=} defaultState
     */
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
        this.state$ = this.select((/**
         * @param {?} s
         * @return {?}
         */
        (s) => s));
        // State can be initialized either through constructor or setState.
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
     * @template ProvidedType, OriginType, ValueType, ReturnType
     * @param {?} updaterFn A static updater function that takes 2 parameters (the
     * current state and an argument object) and returns a new instance of the
     * state.
     * @return {?} A function that accepts one argument which is forwarded as the
     *     second argument to `updaterFn`. Every time this function is called
     *     subscribers will be notified of the state change.
     */
    updater(updaterFn) {
        return (/** @type {?} */ (((/** @type {?} */ (((/**
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
                ? // Push the value into queueScheduler
                    scheduled([value], queueScheduler).pipe(withLatestFrom(this.stateSubject$))
                : // If state was not initialized, we'll throw an error.
                    throwError(new Error(this.notInitializedErrorMessage)))), takeUntil(this.destroy$))
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
                // prettier-ignore
                throw /** @type {!Error} */ (initializationError);
            }
            return subscription;
        })))))));
    }
    /**
     * Initializes state. If it was already initialized then it resets the
     * state.
     * @private
     * @param {?} state
     * @return {?}
     */
    initState(state) {
        scheduled([state], queueScheduler).subscribe((/**
         * @param {?} s
         * @return {?}
         */
        (s) => {
            this.isInitialized = true;
            this.stateSubject$.next(s);
        }));
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
     * Patches the state with provided partial state.
     *
     * @throws Error if the state is not initialized.
     * @param {?} partialStateOrUpdaterFn a partial state or a partial updater
     * function that accepts the state and returns the partial state.
     * @return {?}
     */
    patchState(partialStateOrUpdaterFn) {
        this.setState((/**
         * @param {?} state
         * @return {?}
         */
        (state) => {
            /** @type {?} */
            const patchedState = typeof partialStateOrUpdaterFn === 'function'
                ? partialStateOrUpdaterFn(state)
                : partialStateOrUpdaterFn;
            return Object.assign(Object.assign({}, state), patchedState);
        }));
    }
    /**
     * @protected
     * @template R
     * @param {?=} projector
     * @return {?}
     */
    get(projector) {
        if (!this.isInitialized) {
            throw new Error(this.notInitializedErrorMessage);
        }
        /** @type {?} */
        let value;
        this.stateSubject$.pipe(take(1)).subscribe((/**
         * @param {?} state
         * @return {?}
         */
        (state) => {
            value = projector ? projector(state) : state;
        }));
        return (/** @type {?} */ (value));
    }
    /**
     * @template Selectors, Result, ProjectorFn
     * @param {...?} args
     * @return {?}
     */
    select(...args) {
        const { observables, projector, config } = processSelectorArgs(args);
        /** @type {?} */
        let observable$;
        // If there are no Observables to combine, then we'll just map the value.
        if (observables.length === 0) {
            observable$ = this.stateSubject$.pipe(config.debounce ? debounceSync() : (/**
             * @param {?} source$
             * @return {?}
             */
            (source$) => source$), map(projector));
        }
        else {
            // If there are multiple arguments, then we're aggregating selectors, so we need
            // to take the combineLatest of them before calling the map function.
            observable$ = combineLatest(observables).pipe(config.debounce ? debounceSync() : (/**
             * @param {?} source$
             * @return {?}
             */
            (source$) => source$), map((/**
             * @param {?} projectorArgs
             * @return {?}
             */
            (projectorArgs) => projector(...projectorArgs))));
        }
        return observable$.pipe(distinctUntilChanged(), shareReplay({
            refCount: true,
            bufferSize: 1,
        }), takeUntil(this.destroy$));
    }
    /**
     * Creates an effect.
     *
     * This effect is subscribed to for the life of the \@Component.
     * @template ProvidedType, OriginType, ObservableType, ReturnType
     * @param {?} generator A function that takes an origin Observable input and
     *     returns an Observable. The Observable that is returned will be
     *     subscribed to for the life of the component.
     * @return {?} A function that, when called, will trigger the origin Observable.
     */
    effect(generator) {
        /** @type {?} */
        const origin$ = new Subject();
        generator((/** @type {?} */ (origin$)))
            // tied to the lifecycle 👇 of ComponentStore
            .pipe(takeUntil(this.destroy$))
            .subscribe();
        return (/** @type {?} */ (((/** @type {?} */ (((/**
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
        })))))));
    }
}
ComponentStore.decorators = [
    { type: Injectable }
];
/** @nocollapse */
ComponentStore.ctorParameters = () => [
    { type: undefined, decorators: [{ type: Optional }, { type: Inject, args: [INITIAL_STATE_TOKEN,] }] }
];
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
    /**
     * @type {?}
     * @private
     */
    ComponentStore.prototype.notInitializedErrorMessage;
    /** @type {?} */
    ComponentStore.prototype.state$;
}
/**
 * @template Selectors, Result, ProjectorFn
 * @param {?} args
 * @return {?}
 */
function processSelectorArgs(args) {
    /** @type {?} */
    const selectorArgs = Array.from(args);
    // Assign default values.
    /** @type {?} */
    let config = { debounce: false };
    /** @type {?} */
    let projector;
    // Last argument is either projector or config
    /** @type {?} */
    const projectorOrConfig = (/** @type {?} */ (selectorArgs.pop()));
    if (typeof projectorOrConfig !== 'function') {
        // We got the config as the last argument, replace any default values with it.
        config = Object.assign(Object.assign({}, config), projectorOrConfig);
        // Pop the next args, which would be the projector fn.
        projector = (/** @type {?} */ (selectorArgs.pop()));
    }
    else {
        projector = projectorOrConfig;
    }
    // The Observables to combine, if there are any.
    /** @type {?} */
    const observables = (/** @type {?} */ (selectorArgs));
    return {
        observables,
        projector,
        config,
    };
}

/**
 * @fileoverview added by tsickle
 * Generated from: src/tap-response.ts
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
/**
 * Handles the response in ComponentStore effects in a safe way, without
 * additional boilerplate.
 * It enforces that the error case is handled and that the effect would still be
 * running should an error occur.
 *
 * Takes an optional third argument for a `complete` callback.
 *
 * ```typescript
 * readonly dismissedAlerts = this.effect<Alert>(alert$ => {
 *  return alert$.pipe(
 *      concatMap(
 *          (alert) => this.alertsService.dismissAlert(alert).pipe(
 *              tapResponse(
 *                 (dismissedAlert) => this.alertDismissed(dismissedAlert),
 *                 (error) => this.logError(error),
 *              ))));
 *   });
 * ```
 * @template T
 * @param {?} nextFn
 * @param {?} errorFn
 * @param {?=} completeFn
 * @return {?}
 */
function tapResponse(nextFn, errorFn, completeFn) {
    return (/**
     * @param {?} source
     * @return {?}
     */
    (source) => source.pipe(tap({
        next: nextFn,
        error: errorFn,
        complete: completeFn,
    }), catchError((/**
     * @return {?}
     */
    () => EMPTY))));
}

/**
 * @fileoverview added by tsickle
 * Generated from: src/index.ts
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */

/**
 * @fileoverview added by tsickle
 * Generated from: public_api.ts
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */

/**
 * @fileoverview added by tsickle
 * Generated from: index.ts
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */

/**
 * @fileoverview added by tsickle
 * Generated from: ngrx-component-store.ts
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */

export { ComponentStore, INITIAL_STATE_TOKEN, tapResponse };
//# sourceMappingURL=ngrx-component-store.js.map
