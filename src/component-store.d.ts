import { Observable, Subscription } from 'rxjs';
import { OnDestroy, InjectionToken } from '@angular/core';
export interface SelectConfig {
    debounce?: boolean;
}
export declare const initialStateToken: InjectionToken<unknown>;
export declare class ComponentStore<T extends object> implements OnDestroy {
    private readonly destroySubject$;
    readonly destroy$: Observable<void>;
    private readonly stateSubject$;
    private isInitialized;
    private notInitializedErrorMessage;
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
     *     second argument to `updaterFn`. Every time this function is called
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
    protected get(): T;
    protected get<R>(projector: (s: T) => R): R;
    /**
     * Creates a selector.
     *
     * This supports combining up to 4 selectors. More could be added as needed.
     *
     * @param projector A pure projection function that takes the current state and
     *   returns some new slice/projection of that state.
     * @param config SelectConfig that changes the behavior of selector, including
     *   the debouncing of the values until the state is settled.
     * @return An observable of the projector results.
     */
    select<R>(projector: (s: T) => R, config?: SelectConfig): Observable<R>;
    select<R, S1>(s1: Observable<S1>, projector: (s1: S1) => R, config?: SelectConfig): Observable<R>;
    select<R, S1, S2>(s1: Observable<S1>, s2: Observable<S2>, projector: (s1: S1, s2: S2) => R, config?: SelectConfig): Observable<R>;
    select<R, S1, S2, S3>(s1: Observable<S1>, s2: Observable<S2>, s3: Observable<S3>, projector: (s1: S1, s2: S2, s3: S3) => R, config?: SelectConfig): Observable<R>;
    select<R, S1, S2, S3, S4>(s1: Observable<S1>, s2: Observable<S2>, s3: Observable<S3>, s4: Observable<S4>, projector: (s1: S1, s2: S2, s3: S3, s4: S4) => R, config?: SelectConfig): Observable<R>;
    /**
     * Creates an effect.
     *
     * This effect is subscribed to for the life of the @Component.
     * @param generator A function that takes an origin Observable input and
     *     returns an Observable. The Observable that is returned will be
     *     subscribed to for the life of the component.
     * @return A function that, when called, will trigger the origin Observable.
     */
    effect<ProvidedType = void, OriginType extends Observable<ProvidedType> | unknown = Observable<ProvidedType>, ObservableType = OriginType extends Observable<infer A> ? A : never, ReturnType = ProvidedType | ObservableType extends void ? () => void : (observableOrValue: ObservableType | Observable<ObservableType>) => Subscription>(generator: (origin$: OriginType) => Observable<unknown>): ReturnType;
}
