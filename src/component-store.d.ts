import { Observable, Subscription } from 'rxjs';
export declare class ComponentStore<T extends object> {
    private readonly destroySubject$;
    readonly destroy$: Observable<void>;
    private readonly stateSubject$;
    private isInitialized;
    readonly state$: Observable<T>;
    constructor(defaultState?: T);
    /** Completes all relevant Observable streams. */
    ngOnDestroy(): void;
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
    updater<V>(updaterFn: (state: T, value: V) => T): unknown extends V ? () => void : (t: V | Observable<V>) => Subscription;
    /**
     * Initializes state. If it was already initialized then it resets the
     * state.
     */
    private initState;
    /**
     * Sets the state specific value.
     * @param stateOrUpdaterFn object of the same type as the state or an
     * updaterFn, returning such object.
     */
    setState(stateOrUpdaterFn: T | ((state: T) => T)): void;
    /**
     * Creates a selector.
     *
     * This supports chaining up to 4 selectors. More could be added as needed.
     *
     * @param projector A pure projection function that takes the current state and
     *   returns some new slice/projection of that state.
     * @return An observable of the projector results.
     */
    select<R>(projector: (s: T) => R): Observable<R>;
    select<R, S1>(s1: Observable<S1>, projector: (s1: S1) => R): Observable<R>;
    select<R, S1, S2>(s1: Observable<S1>, s2: Observable<S2>, projector: (s1: S1, s2: S2) => R): Observable<R>;
    select<R, S1, S2, S3>(s1: Observable<S1>, s2: Observable<S2>, s3: Observable<S3>, projector: (s1: S1, s2: S2, s3: S3) => R): Observable<R>;
    select<R, S1, S2, S3, S4>(s1: Observable<S1>, s2: Observable<S2>, s3: Observable<S3>, s4: Observable<S4>, projector: (s1: S1, s2: S2, s3: S3, s4: S4) => R): Observable<R>;
}