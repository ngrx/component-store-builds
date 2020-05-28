import { isObservable, of, ReplaySubject, throwError, combineLatest, } from 'rxjs';
import { concatMap, takeUntil, withLatestFrom, map, distinctUntilChanged, shareReplay, } from 'rxjs/operators';
import { debounceSync } from './debounceSync';
export class ComponentStore {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcG9uZW50LXN0b3JlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vbW9kdWxlcy9jb21wb25lbnQtc3RvcmUvc3JjL2NvbXBvbmVudC1zdG9yZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQ0wsWUFBWSxFQUVaLEVBQUUsRUFDRixhQUFhLEVBRWIsVUFBVSxFQUNWLGFBQWEsR0FDZCxNQUFNLE1BQU0sQ0FBQztBQUNkLE9BQU8sRUFDTCxTQUFTLEVBQ1QsU0FBUyxFQUNULGNBQWMsRUFDZCxHQUFHLEVBQ0gsb0JBQW9CLEVBQ3BCLFdBQVcsR0FDWixNQUFNLGdCQUFnQixDQUFDO0FBQ3hCLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQztBQUU5QyxNQUFNLE9BQU8sY0FBYztJQVd6QixZQUFZLFlBQWdCO1FBVjVCLHNDQUFzQztRQUNyQixvQkFBZSxHQUFHLElBQUksYUFBYSxDQUFPLENBQUMsQ0FBQyxDQUFDO1FBQzlELCtEQUErRDtRQUN0RCxhQUFRLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxZQUFZLEVBQUUsQ0FBQztRQUV2QyxrQkFBYSxHQUFHLElBQUksYUFBYSxDQUFJLENBQUMsQ0FBQyxDQUFDO1FBQ2pELGtCQUFhLEdBQUcsS0FBSyxDQUFDO1FBQzlCLHNFQUFzRTtRQUM3RCxXQUFNLEdBQWtCLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUduRCx1RUFBdUU7UUFDdkUsWUFBWTtRQUNaLElBQUksWUFBWSxFQUFFO1lBQ2hCLElBQUksQ0FBQyxTQUFTLENBQUMsWUFBWSxDQUFDLENBQUM7U0FDOUI7SUFDSCxDQUFDO0lBRUQsaURBQWlEO0lBQ2pELFdBQVc7UUFDVCxJQUFJLENBQUMsYUFBYSxDQUFDLFFBQVEsRUFBRSxDQUFDO1FBQzlCLElBQUksQ0FBQyxlQUFlLENBQUMsSUFBSSxFQUFFLENB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RCxvQkFBb0IsRUFBRSxFQUN0QixXQUFXLENBQUM7WUFDVixRQUFRLEVBQUUsSUFBSTtZQUNkLFVBQVUsRUFBRSxDQUFDO1NBQ2QsQ0FBQyxFQUNGLFNBQVMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQ3pCLENBQUM7UUFDRixPQUFPLHlCQUF5QixDQUFDO0lBQ25DLENBQUM7Q0FDRiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7XG4gIGlzT2JzZXJ2YWJsZSxcbiAgT2JzZXJ2YWJsZSxcbiAgb2YsXG4gIFJlcGxheVN1YmplY3QsXG4gIFN1YnNjcmlwdGlvbixcbiAgdGhyb3dFcnJvcixcbiAgY29tYmluZUxhdGVzdCxcbn0gZnJvbSAncnhqcyc7XG5pbXBvcnQge1xuICBjb25jYXRNYXAsXG4gIHRha2VVbnRpbCxcbiAgd2l0aExhdGVzdEZyb20sXG4gIG1hcCxcbiAgZGlzdGluY3RVbnRpbENoYW5nZWQsXG4gIHNoYXJlUmVwbGF5LFxufSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQgeyBkZWJvdW5jZVN5bmMgfSBmcm9tICcuL2RlYm91bmNlU3luYyc7XG5cbmV4cG9ydCBjbGFzcyBDb21wb25lbnRTdG9yZTxUIGV4dGVuZHMgb2JqZWN0PiB7XG4gIC8vIFNob3VsZCBiZSB1c2VkIG9ubHkgaW4gbmdPbkRlc3Ryb3kuXG4gIHByaXZhdGUgcmVhZG9ubHkgZGVzdHJveVN1YmplY3QkID0gbmV3IFJlcGxheVN1YmplY3Q8dm9pZD4oMSk7XG4gIC8vIEV4cG9zZWQgdG8gYW55IGV4dGVuZGluZyBTdG9yZSB0byBiZSB1c2VkIGZvciB0aGUgdGVhcmRvd25zLlxuICByZWFkb25seSBkZXN0cm95JCA9IHRoaXMuZGVzdHJveVN1YmplY3QkLmFzT2JzZXJ2YWJsZSgpO1xuXG4gIHByaXZhdGUgcmVhZG9ubHkgc3RhdGVTdWJqZWN0JCA9IG5ldyBSZXBsYXlTdWJqZWN0PFQ+KDEpO1xuICBwcml2YXRlIGlzSW5pdGlhbGl6ZWQgPSBmYWxzZTtcbiAgLy8gTmVlZHMgdG8gYmUgYWZ0ZXIgZGVzdHJveSQgaXMgZGVjbGFyZWQgYmVjYXVzZSBpdCdzIHVzZWQgaW4gc2VsZWN0LlxuICByZWFkb25seSBzdGF0ZSQ6IE9ic2VydmFibGU8VD4gPSB0aGlzLnNlbGVjdChzID0+IHMpO1xuXG4gIGNvbnN0cnVjdG9yKGRlZmF1bHRTdGF0ZT86IFQpIHtcbiAgICAvLyBTdGF0ZSBjYW4gYmUgaW5pdGlhbGl6ZWQgZWl0aGVyIHRocm91Z2ggY29uc3RydWN0b3IsIG9yIGluaXRTdGF0ZSBvclxuICAgIC8vIHNldFN0YXRlLlxuICAgIGlmIChkZWZhdWx0U3RhdGUpIHtcbiAgICAgIHRoaXMuaW5pdFN0YXRlKGRlZmF1bHRTdGF0ZSk7XG4gICAgfVxuICB9XG5cbiAgLyoqIENvbXBsZXRlcyBhbGwgcmVsZXZhbnQgT2JzZXJ2YWJsZSBzdHJlYW1zLiAqL1xuICBuZ09uRGVzdHJveSgpIHtcbiAgICB0aGlzLnN0YXRlU3ViamVjdCQuY29tcGxldGUoKTtcbiAgICB0aGlzLmRlc3Ryb3lTdWJqZWN0JC5uZXh0KCk7XG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlcyBhbiB1cGRhdGVyLlxuICAgKlxuICAgKiBUaHJvd3MgYW4gZXJyb3IgaWYgdXBkYXRlciBpcyBjYWxsZWQgd2l0aCBzeW5jaHJvbm91cyB2YWx1ZXMgKGVpdGhlclxuICAgKiBpbXBlcmF0aXZlIHZhbHVlIG9yIE9ic2VydmFibGUgdGhhdCBpcyBzeW5jaHJvbm91cykgYmVmb3JlIENvbXBvbmVudFN0b3JlXG4gICAqIGlzIGluaXRpYWxpemVkLiBJZiBjYWxsZWQgd2l0aCBhc3luYyBPYnNlcnZhYmxlIGJlZm9yZSBpbml0aWFsaXphdGlvbiB0aGVuXG4gICAqIHN0YXRlIHdpbGwgbm90IGJlIHVwZGF0ZWQgYW5kIHN1YnNjcmlwdGlvbiB3b3VsZCBiZSBjbG9zZWQuXG4gICAqXG4gICAqIEBwYXJhbSB1cGRhdGVyRm4gQSBzdGF0aWMgdXBkYXRlciBmdW5jdGlvbiB0aGF0IHRha2VzIDIgcGFyYW1ldGVycyAodGhlXG4gICAqIGN1cnJlbnQgc3RhdGUgYW5kIGFuIGFyZ3VtZW50IG9iamVjdCkgYW5kIHJldHVybnMgYSBuZXcgaW5zdGFuY2Ugb2YgdGhlXG4gICAqIHN0YXRlLlxuICAgKiBAcmV0dXJuIEEgZnVuY3Rpb24gdGhhdCBhY2NlcHRzIG9uZSBhcmd1bWVudCB3aGljaCBpcyBmb3J3YXJkZWQgYXMgdGhlXG4gICAqICAgICBzZWNvbmQgYXJndW1lbnQgdG8gYHVwZGF0ZXJGbmAuIEV2ZXJ5dGltZSB0aGlzIGZ1bmN0aW9uIGlzIGNhbGxlZFxuICAgKiAgICAgc3Vic2NyaWJlcnMgd2lsbCBiZSBub3RpZmllZCBvZiB0aGUgc3RhdGUgY2hhbmdlLlxuICAgKi9cbiAgdXBkYXRlcjxWPihcbiAgICB1cGRhdGVyRm46IChzdGF0ZTogVCwgdmFsdWU6IFYpID0+IFRcbiAgKTogdW5rbm93biBleHRlbmRzIFYgPyAoKSA9PiB2b2lkIDogKHQ6IFYgfCBPYnNlcnZhYmxlPFY+KSA9PiBTdWJzY3JpcHRpb24ge1xuICAgIHJldHVybiAoKG9ic2VydmFibGVPclZhbHVlPzogViB8IE9ic2VydmFibGU8Vj4pOiBTdWJzY3JpcHRpb24gPT4ge1xuICAgICAgbGV0IGluaXRpYWxpemF0aW9uRXJyb3I6IEVycm9yIHwgdW5kZWZpbmVkO1xuICAgICAgLy8gV2UgY2FuIHJlY2VpdmUgZWl0aGVyIHRoZSB2YWx1ZSBvciBhbiBvYnNlcnZhYmxlLiBJbiBjYXNlIGl0J3MgYVxuICAgICAgLy8gc2ltcGxlIHZhbHVlLCB3ZSdsbCB3cmFwIGl0IHdpdGggYG9mYCBvcGVyYXRvciB0byB0dXJuIGl0IGludG9cbiAgICAgIC8vIE9ic2VydmFibGUuXG4gICAgICBjb25zdCBvYnNlcnZhYmxlJCA9IGlzT2JzZXJ2YWJsZShvYnNlcnZhYmxlT3JWYWx1ZSlcbiAgICAgICAgPyBvYnNlcnZhYmxlT3JWYWx1ZVxuICAgICAgICA6IG9mKG9ic2VydmFibGVPclZhbHVlKTtcbiAgICAgIGNvbnN0IHN1YnNjcmlwdGlvbiA9IG9ic2VydmFibGUkXG4gICAgICAgIC5waXBlKFxuICAgICAgICAgIGNvbmNhdE1hcChcbiAgICAgICAgICAgIHZhbHVlID0+XG4gICAgICAgICAgICAgIHRoaXMuaXNJbml0aWFsaXplZFxuICAgICAgICAgICAgICAgID8gb2YodmFsdWUpLnBpcGUod2l0aExhdGVzdEZyb20odGhpcy5zdGF0ZVN1YmplY3QkKSlcbiAgICAgICAgICAgICAgICA6IC8vIElmIHN0YXRlIHdhcyBub3QgaW5pdGlhbGl6ZWQsIHdlJ2xsIHRocm93IGFuIGVycm9yLlxuICAgICAgICAgICAgICAgICAgdGhyb3dFcnJvcihcbiAgICAgICAgICAgICAgICAgICAgRXJyb3IoYCR7dGhpcy5jb25zdHJ1Y3Rvci5uYW1lfSBoYXMgbm90IGJlZW4gaW5pdGlhbGl6ZWRgKVxuICAgICAgICAgICAgICAgICAgKVxuICAgICAgICAgICksXG4gICAgICAgICAgdGFrZVVudGlsKHRoaXMuZGVzdHJveSQpXG4gICAgICAgIClcbiAgICAgICAgLnN1YnNjcmliZSh7XG4gICAgICAgICAgbmV4dDogKFt2YWx1ZSwgY3VycmVudFN0YXRlXSkgPT4ge1xuICAgICAgICAgICAgdGhpcy5zdGF0ZVN1YmplY3QkLm5leHQodXBkYXRlckZuKGN1cnJlbnRTdGF0ZSwgdmFsdWUhKSk7XG4gICAgICAgICAgfSxcbiAgICAgICAgICBlcnJvcjogZXJyb3IgPT4ge1xuICAgICAgICAgICAgaW5pdGlhbGl6YXRpb25FcnJvciA9IGVycm9yO1xuICAgICAgICAgICAgdGhpcy5zdGF0ZVN1YmplY3QkLmVycm9yKGVycm9yKTtcbiAgICAgICAgICB9LFxuICAgICAgICB9KTtcblxuICAgICAgaWYgKGluaXRpYWxpemF0aW9uRXJyb3IpIHtcbiAgICAgICAgdGhyb3cgaW5pdGlhbGl6YXRpb25FcnJvcjtcbiAgICAgIH1cbiAgICAgIHJldHVybiBzdWJzY3JpcHRpb247XG4gICAgfSkgYXMgdW5rbm93biBleHRlbmRzIFZcbiAgICAgID8gKCkgPT4gdm9pZFxuICAgICAgOiAodDogViB8IE9ic2VydmFibGU8Vj4pID0+IFN1YnNjcmlwdGlvbjtcbiAgfVxuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplcyBzdGF0ZS4gSWYgaXQgd2FzIGFscmVhZHkgaW5pdGlhbGl6ZWQgdGhlbiBpdCByZXNldHMgdGhlXG4gICAqIHN0YXRlLlxuICAgKi9cbiAgcHJpdmF0ZSBpbml0U3RhdGUoc3RhdGU6IFQpOiB2b2lkIHtcbiAgICB0aGlzLmlzSW5pdGlhbGl6ZWQgPSB0cnVlO1xuICAgIHRoaXMuc3RhdGVTdWJqZWN0JC5uZXh0KHN0YXRlKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBTZXRzIHRoZSBzdGF0ZSBzcGVjaWZpYyB2YWx1ZS5cbiAgICogQHBhcmFtIHN0YXRlT3JVcGRhdGVyRm4gb2JqZWN0IG9mIHRoZSBzYW1lIHR5cGUgYXMgdGhlIHN0YXRlIG9yIGFuXG4gICAqIHVwZGF0ZXJGbiwgcmV0dXJuaW5nIHN1Y2ggb2JqZWN0LlxuICAgKi9cbiAgc2V0U3RhdGUoc3RhdGVPclVwZGF0ZXJGbjogVCB8ICgoc3RhdGU6IFQpID0+IFQpKTogdm9pZCB7XG4gICAgaWYgKHR5cGVvZiBzdGF0ZU9yVXBkYXRlckZuICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICB0aGlzLmluaXRTdGF0ZShzdGF0ZU9yVXBkYXRlckZuKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy51cGRhdGVyKHN0YXRlT3JVcGRhdGVyRm4gYXMgKHN0YXRlOiBUKSA9PiBUKSgpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgc2VsZWN0b3IuXG4gICAqXG4gICAqIFRoaXMgc3VwcG9ydHMgY2hhaW5pbmcgdXAgdG8gNCBzZWxlY3RvcnMuIE1vcmUgY291bGQgYmUgYWRkZWQgYXMgbmVlZGVkLlxuICAgKlxuICAgKiBAcGFyYW0gcHJvamVjdG9yIEEgcHVyZSBwcm9qZWN0aW9uIGZ1bmN0aW9uIHRoYXQgdGFrZXMgdGhlIGN1cnJlbnQgc3RhdGUgYW5kXG4gICAqICAgcmV0dXJucyBzb21lIG5ldyBzbGljZS9wcm9qZWN0aW9uIG9mIHRoYXQgc3RhdGUuXG4gICAqIEByZXR1cm4gQW4gb2JzZXJ2YWJsZSBvZiB0aGUgcHJvamVjdG9yIHJlc3VsdHMuXG4gICAqL1xuICBzZWxlY3Q8Uj4ocHJvamVjdG9yOiAoczogVCkgPT4gUik6IE9ic2VydmFibGU8Uj47XG4gIHNlbGVjdDxSLCBTMT4oczE6IE9ic2VydmFibGU8UzE+LCBwcm9qZWN0b3I6IChzMTogUzEpID0+IFIpOiBPYnNlcnZhYmxlPFI+O1xuICBzZWxlY3Q8UiwgUzEsIFMyPihcbiAgICBzMTogT2JzZXJ2YWJsZTxTMT4sXG4gICAgczI6IE9ic2VydmFibGU8UzI+LFxuICAgIHByb2plY3RvcjogKHMxOiBTMSwgczI6IFMyKSA9PiBSXG4gICk6IE9ic2VydmFibGU8Uj47XG4gIHNlbGVjdDxSLCBTMSwgUzIsIFMzPihcbiAgICBzMTogT2JzZXJ2YWJsZTxTMT4sXG4gICAgczI6IE9ic2VydmFibGU8UzI+LFxuICAgIHMzOiBPYnNlcnZhYmxlPFMzPixcbiAgICBwcm9qZWN0b3I6IChzMTogUzEsIHMyOiBTMiwgczM6IFMzKSA9PiBSXG4gICk6IE9ic2VydmFibGU8Uj47XG4gIHNlbGVjdDxSLCBTMSwgUzIsIFMzLCBTND4oXG4gICAgczE6IE9ic2VydmFibGU8UzE+LFxuICAgIHMyOiBPYnNlcnZhYmxlPFMyPixcbiAgICBzMzogT2JzZXJ2YWJsZTxTMz4sXG4gICAgczQ6IE9ic2VydmFibGU8UzQ+LFxuICAgIHByb2plY3RvcjogKHMxOiBTMSwgczI6IFMyLCBzMzogUzMsIHM0OiBTNCkgPT4gUlxuICApOiBPYnNlcnZhYmxlPFI+O1xuICBzZWxlY3Q8Uj4oLi4uYXJnczogYW55W10pOiBPYnNlcnZhYmxlPFI+IHtcbiAgICBsZXQgb2JzZXJ2YWJsZSQ6IE9ic2VydmFibGU8Uj47XG4gICAgLy8gcHJvamVjdCBpcyBhbHdheXMgdGhlIGxhc3QgYXJndW1lbnQsIHNvIGBwb3BgIGl0IGZyb20gYXJncy5cbiAgICBjb25zdCBwcm9qZWN0b3I6ICguLi5hcmdzOiBhbnlbXSkgPT4gUiA9IGFyZ3MucG9wKCk7XG4gICAgaWYgKGFyZ3MubGVuZ3RoID09PSAwKSB7XG4gICAgICAvLyBJZiBwcm9qZWN0b3Igd2FzIHRoZSBvbmx5IGFyZ3VtZW50IHRoZW4gd2UnbGwgdXNlIG1hcCBvcGVyYXRvci5cbiAgICAgIG9ic2VydmFibGUkID0gdGhpcy5zdGF0ZVN1YmplY3QkLnBpcGUobWFwKHByb2plY3RvcikpO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBJZiB0aGVyZSBhcmUgbXVsdGlwbGUgYXJndW1lbnRzLCB3ZSdyZSBjaGFpbmluZyBzZWxlY3RvcnMsIHNvIHdlIG5lZWRcbiAgICAgIC8vIHRvIHRha2UgdGhlIGNvbWJpbmVMYXRlc3Qgb2YgdGhlbSBiZWZvcmUgY2FsbGluZyB0aGUgbWFwIGZ1bmN0aW9uLlxuICAgICAgb2JzZXJ2YWJsZSQgPSBjb21iaW5lTGF0ZXN0KGFyZ3MpLnBpcGUoXG4gICAgICAgIC8vIFRoZSBtb3N0IHBlcmZvcm1hbnQgd2F5IHRvIGNvbWJpbmUgT2JzZXJ2YWJsZXMgYXZvaWRpbmcgdW5uZWNlc3NhcnlcbiAgICAgICAgLy8gZW1pc3Npb25zIGFuZCBwcm9qZWN0b3IgY2FsbHMuXG4gICAgICAgIGRlYm91bmNlU3luYygpLFxuICAgICAgICBtYXAoKGFyZ3M6IGFueVtdKSA9PiBwcm9qZWN0b3IoLi4uYXJncykpXG4gICAgICApO1xuICAgIH1cbiAgICBjb25zdCBkaXN0aW5jdFNoYXJlZE9ic2VydmFibGUkID0gb2JzZXJ2YWJsZSQucGlwZShcbiAgICAgIGRpc3RpbmN0VW50aWxDaGFuZ2VkKCksXG4gICAgICBzaGFyZVJlcGxheSh7XG4gICAgICAgIHJlZkNvdW50OiB0cnVlLFxuICAgICAgICBidWZmZXJTaXplOiAxLFxuICAgICAgfSksXG4gICAgICB0YWtlVW50aWwodGhpcy5kZXN0cm95JClcbiAgICApO1xuICAgIHJldHVybiBkaXN0aW5jdFNoYXJlZE9ic2VydmFibGUkO1xuICB9XG59XG4iXX0=