import { Observable, Subscription, ObservedValueOf } from 'rxjs';
import { OnDestroy, InjectionToken, Signal, type ValueEqualityFn } from '@angular/core';
import * as i0 from "@angular/core";
export interface SelectConfig {
    debounce?: boolean;
}
export declare const INITIAL_STATE_TOKEN: InjectionToken<unknown>;
export type SelectorResults<Selectors extends Observable<unknown>[]> = {
    [Key in keyof Selectors]: Selectors[Key] extends Observable<infer U> ? U : never;
};
export type Projector<Selectors extends Observable<unknown>[], Result> = (...args: SelectorResults<Selectors>) => Result;
type SignalsProjector<Signals extends Signal<unknown>[], Result> = (...values: {
    [Key in keyof Signals]: Signals[Key] extends Signal<infer Value> ? Value : never;
}) => Result;
interface SelectSignalOptions<T> {
    /**
     * A comparison function which defines equality for select results.
     */
    equal?: ValueEqualityFn<T>;
}
export declare class ComponentStore<T extends object> implements OnDestroy {
    private readonly destroySubject$;
    readonly destroy$: Observable<void>;
    private readonly stateSubject$;
    private isInitialized;
    readonly state$: Observable<T>;
    readonly state: Signal<T>;
    private ɵhasProvider;
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
    updater<ProvidedType = void, OriginType = ProvidedType, ValueType = OriginType, ReturnType = OriginType extends void ? () => void : (observableOrValue: ValueType | Observable<ValueType>) => Subscription>(updaterFn: (state: T, value: OriginType) => T): ReturnType;
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
     * Patches the state with provided partial state.
     *
     * @param partialStateOrUpdaterFn a partial state or a partial updater
     * function that accepts the state and returns the partial state.
     * @throws Error if the state is not initialized.
     */
    patchState(partialStateOrUpdaterFn: Partial<T> | Observable<Partial<T>> | ((state: T) => Partial<T>)): void;
    protected get(): T;
    protected get<R>(projector: (s: T) => R): R;
    /**
     * Creates a selector.
     *
     * @param projector A pure projection function that takes the current state and
     *   returns some new slice/projection of that state.
     * @param config SelectConfig that changes the behavior of selector, including
     *   the debouncing of the values until the state is settled.
     * @return An observable of the projector results.
     */
    select<Result>(projector: (s: T) => Result, config?: SelectConfig): Observable<Result>;
    select<SelectorsObject extends Record<string, Observable<unknown>>>(selectorsObject: SelectorsObject, config?: SelectConfig): Observable<{
        [K in keyof SelectorsObject]: ObservedValueOf<SelectorsObject[K]>;
    }>;
    select<Selectors extends Observable<unknown>[], Result>(...selectorsWithProjector: [
        ...selectors: Selectors,
        projector: Projector<Selectors, Result>
    ]): Observable<Result>;
    select<Selectors extends Observable<unknown>[], Result>(...selectorsWithProjectorAndConfig: [
        ...selectors: Selectors,
        projector: Projector<Selectors, Result>,
        config: SelectConfig
    ]): Observable<Result>;
    /**
     * Creates a signal from the provided state projector function.
     */
    selectSignal<Result>(projector: (state: T) => Result, options?: SelectSignalOptions<Result>): Signal<Result>;
    /**
     * Creates a signal by combining provided signals.
     */
    selectSignal<Signals extends Signal<unknown>[], Result>(...args: [...signals: Signals, projector: SignalsProjector<Signals, Result>]): Signal<Result>;
    /**
     * Creates a signal by combining provided signals.
     */
    selectSignal<Signals extends Signal<unknown>[], Result>(...args: [
        ...signals: Signals,
        projector: SignalsProjector<Signals, Result>,
        options: SelectSignalOptions<Result>
    ]): Signal<Result>;
    /**
     * Creates an effect.
     *
     * This effect is subscribed to throughout the lifecycle of the ComponentStore.
     * @param generator A function that takes an origin Observable input and
     *     returns an Observable. The Observable that is returned will be
     *     subscribed to for the life of the component.
     * @return A function that, when called, will trigger the origin Observable.
     */
    effect<ProvidedType = void, OriginType extends Observable<ProvidedType> | unknown = Observable<ProvidedType>, ObservableType = OriginType extends Observable<infer A> ? A : never, ReturnType = ProvidedType | ObservableType extends void ? (observableOrValue?: ObservableType | Observable<ObservableType>) => Subscription : (observableOrValue: ObservableType | Observable<ObservableType>) => Subscription>(generator: (origin$: OriginType) => Observable<unknown>): ReturnType;
    /**
     * Used to check if lifecycle hooks are defined
     * but not used with provideComponentStore()
     */
    private checkProviderForHooks;
    private assertStateIsInitialized;
    static ɵfac: i0.ɵɵFactoryDeclaration<ComponentStore<any>, [{ optional: true; }]>;
    static ɵprov: i0.ɵɵInjectableDeclaration<ComponentStore<any>>;
}
export {};
