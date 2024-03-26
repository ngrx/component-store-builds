import { InjectionToken, inject } from '@angular/core';
import { take } from 'rxjs/operators';
/**
 * Checks to see if the OnInitStore lifecycle hook
 * is defined on the ComponentStore.
 *
 * @param cs ComponentStore type
 * @returns boolean
 */
export function isOnStoreInitDefined(cs) {
    return typeof cs.ngrxOnStoreInit === 'function';
}
/**
 * Checks to see if the OnInitState lifecycle hook
 * is defined on the ComponentStore.
 *
 * @param cs ComponentStore type
 * @returns boolean
 */
export function isOnStateInitDefined(cs) {
    return typeof cs.ngrxOnStateInit === 'function';
}
/**
 * @description
 *
 * Function that returns the ComponentStore
 * class registered as a provider,
 * and uses a factory provider to instantiate the
 * ComponentStore and run the lifecycle hooks
 * defined on the ComponentStore.
 *
 * @param componentStoreClass The ComponentStore with lifecycle hooks
 * @returns Provider[]
 *
 * @usageNotes
 *
 * ```ts
 * @Injectable()
 * export class MyStore
 *    extends ComponentStore<{ init: boolean }>
 *    implements OnStoreInit, OnStateInit
 *   {
 *
 *   constructor() {
 *     super({ init: true });
 *   }
 *
 *   ngrxOnStoreInit() {
 *     // runs once after store has been instantiated
 *   }
 *
 *   ngrxOnStateInit() {
 *     // runs once after store state has been initialized
 *   }
 * }
 *
 * @Component({
 *   providers: [
 *     provideComponentStore(MyStore)
 *   ]
 * })
 * export class MyComponent {
 *   constructor(private myStore: MyStore) {}
 * }
 * ```
 */
export function provideComponentStore(componentStoreClass) {
    const CS_WITH_HOOKS = new InjectionToken('@ngrx/component-store ComponentStore with Hooks');
    return [
        { provide: CS_WITH_HOOKS, useClass: componentStoreClass },
        {
            provide: componentStoreClass,
            useFactory: () => {
                const componentStore = inject(CS_WITH_HOOKS);
                // Set private property that CS has been provided with lifecycle hooks
                componentStore['ɵhasProvider'] = true;
                if (isOnStoreInitDefined(componentStore)) {
                    componentStore.ngrxOnStoreInit();
                }
                if (isOnStateInitDefined(componentStore)) {
                    componentStore.state$
                        .pipe(take(1))
                        .subscribe(() => componentStore.ngrxOnStateInit());
                }
                return componentStore;
            },
        },
    ];
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGlmZWN5Y2xlX2hvb2tzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vbW9kdWxlcy9jb21wb25lbnQtc3RvcmUvc3JjL2xpZmVjeWNsZV9ob29rcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQVksY0FBYyxFQUFRLE1BQU0sRUFBRSxNQUFNLGVBQWUsQ0FBQztBQUN2RSxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sZ0JBQWdCLENBQUM7QUFvQnRDOzs7Ozs7R0FNRztBQUNILE1BQU0sVUFBVSxvQkFBb0IsQ0FBQyxFQUFXO0lBQzlDLE9BQU8sT0FBUSxFQUFrQixDQUFDLGVBQWUsS0FBSyxVQUFVLENBQUM7QUFDbkUsQ0FBQztBQUVEOzs7Ozs7R0FNRztBQUNILE1BQU0sVUFBVSxvQkFBb0IsQ0FBQyxFQUFXO0lBQzlDLE9BQU8sT0FBUSxFQUFrQixDQUFDLGVBQWUsS0FBSyxVQUFVLENBQUM7QUFDbkUsQ0FBQztBQUVEOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBMkNHO0FBQ0gsTUFBTSxVQUFVLHFCQUFxQixDQUNuQyxtQkFBNEM7SUFFNUMsTUFBTSxhQUFhLEdBQUcsSUFBSSxjQUFjLENBQ3RDLGlEQUFpRCxDQUNsRCxDQUFDO0lBRUYsT0FBTztRQUNMLEVBQUUsT0FBTyxFQUFFLGFBQWEsRUFBRSxRQUFRLEVBQUUsbUJBQW1CLEVBQUU7UUFDekQ7WUFDRSxPQUFPLEVBQUUsbUJBQW1CO1lBQzVCLFVBQVUsRUFBRSxHQUFHLEVBQUU7Z0JBQ2YsTUFBTSxjQUFjLEdBQUcsTUFBTSxDQUFDLGFBQWEsQ0FBQyxDQUFDO2dCQUU3QyxzRUFBc0U7Z0JBQ3RFLGNBQWMsQ0FBQyxjQUFjLENBQUMsR0FBRyxJQUFJLENBQUM7Z0JBRXRDLElBQUksb0JBQW9CLENBQUMsY0FBYyxDQUFDLEVBQUUsQ0FBQztvQkFDekMsY0FBYyxDQUFDLGVBQWUsRUFBRSxDQUFDO2dCQUNuQyxDQUFDO2dCQUVELElBQUksb0JBQW9CLENBQUMsY0FBYyxDQUFDLEVBQUUsQ0FBQztvQkFDekMsY0FBYyxDQUFDLE1BQU07eUJBQ2xCLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7eUJBQ2IsU0FBUyxDQUFDLEdBQUcsRUFBRSxDQUFDLGNBQWMsQ0FBQyxlQUFlLEVBQUUsQ0FBQyxDQUFDO2dCQUN2RCxDQUFDO2dCQUVELE9BQU8sY0FBYyxDQUFDO1lBQ3hCLENBQUM7U0FDRjtLQUNGLENBQUM7QUFDSixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgUHJvdmlkZXIsIEluamVjdGlvblRva2VuLCBUeXBlLCBpbmplY3QgfSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7IHRha2UgfSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQgeyBDb21wb25lbnRTdG9yZSB9IGZyb20gJy4vY29tcG9uZW50LXN0b3JlJztcblxuLyoqXG4gKiBUaGUgaW50ZXJmYWNlIGZvciB0aGUgbGlmZWN5Y2xlIGhvb2tcbiAqIGNhbGxlZCBhZnRlciB0aGUgQ29tcG9uZW50U3RvcmUgaXMgaW5zdGFudGlhdGVkLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIE9uU3RvcmVJbml0IHtcbiAgcmVhZG9ubHkgbmdyeE9uU3RvcmVJbml0OiAoKSA9PiB2b2lkO1xufVxuXG4vKipcbiAqIFRoZSBpbnRlcmZhY2UgZm9yIHRoZSBsaWZlY3ljbGUgaG9va1xuICogY2FsbGVkIG9ubHkgb25jZSBhZnRlciB0aGUgQ29tcG9uZW50U3RvcmVcbiAqIHN0YXRlIGlzIGZpcnN0IGluaXRpYWxpemVkLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIE9uU3RhdGVJbml0IHtcbiAgcmVhZG9ubHkgbmdyeE9uU3RhdGVJbml0OiAoKSA9PiB2b2lkO1xufVxuXG4vKipcbiAqIENoZWNrcyB0byBzZWUgaWYgdGhlIE9uSW5pdFN0b3JlIGxpZmVjeWNsZSBob29rXG4gKiBpcyBkZWZpbmVkIG9uIHRoZSBDb21wb25lbnRTdG9yZS5cbiAqXG4gKiBAcGFyYW0gY3MgQ29tcG9uZW50U3RvcmUgdHlwZVxuICogQHJldHVybnMgYm9vbGVhblxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNPblN0b3JlSW5pdERlZmluZWQoY3M6IHVua25vd24pOiBjcyBpcyBPblN0b3JlSW5pdCB7XG4gIHJldHVybiB0eXBlb2YgKGNzIGFzIE9uU3RvcmVJbml0KS5uZ3J4T25TdG9yZUluaXQgPT09ICdmdW5jdGlvbic7XG59XG5cbi8qKlxuICogQ2hlY2tzIHRvIHNlZSBpZiB0aGUgT25Jbml0U3RhdGUgbGlmZWN5Y2xlIGhvb2tcbiAqIGlzIGRlZmluZWQgb24gdGhlIENvbXBvbmVudFN0b3JlLlxuICpcbiAqIEBwYXJhbSBjcyBDb21wb25lbnRTdG9yZSB0eXBlXG4gKiBAcmV0dXJucyBib29sZWFuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc09uU3RhdGVJbml0RGVmaW5lZChjczogdW5rbm93bik6IGNzIGlzIE9uU3RhdGVJbml0IHtcbiAgcmV0dXJuIHR5cGVvZiAoY3MgYXMgT25TdGF0ZUluaXQpLm5ncnhPblN0YXRlSW5pdCA9PT0gJ2Z1bmN0aW9uJztcbn1cblxuLyoqXG4gKiBAZGVzY3JpcHRpb25cbiAqXG4gKiBGdW5jdGlvbiB0aGF0IHJldHVybnMgdGhlIENvbXBvbmVudFN0b3JlXG4gKiBjbGFzcyByZWdpc3RlcmVkIGFzIGEgcHJvdmlkZXIsXG4gKiBhbmQgdXNlcyBhIGZhY3RvcnkgcHJvdmlkZXIgdG8gaW5zdGFudGlhdGUgdGhlXG4gKiBDb21wb25lbnRTdG9yZSBhbmQgcnVuIHRoZSBsaWZlY3ljbGUgaG9va3NcbiAqIGRlZmluZWQgb24gdGhlIENvbXBvbmVudFN0b3JlLlxuICpcbiAqIEBwYXJhbSBjb21wb25lbnRTdG9yZUNsYXNzIFRoZSBDb21wb25lbnRTdG9yZSB3aXRoIGxpZmVjeWNsZSBob29rc1xuICogQHJldHVybnMgUHJvdmlkZXJbXVxuICpcbiAqIEB1c2FnZU5vdGVzXG4gKlxuICogYGBgdHNcbiAqIEBJbmplY3RhYmxlKClcbiAqIGV4cG9ydCBjbGFzcyBNeVN0b3JlXG4gKiAgICBleHRlbmRzIENvbXBvbmVudFN0b3JlPHsgaW5pdDogYm9vbGVhbiB9PlxuICogICAgaW1wbGVtZW50cyBPblN0b3JlSW5pdCwgT25TdGF0ZUluaXRcbiAqICAge1xuICpcbiAqICAgY29uc3RydWN0b3IoKSB7XG4gKiAgICAgc3VwZXIoeyBpbml0OiB0cnVlIH0pO1xuICogICB9XG4gKlxuICogICBuZ3J4T25TdG9yZUluaXQoKSB7XG4gKiAgICAgLy8gcnVucyBvbmNlIGFmdGVyIHN0b3JlIGhhcyBiZWVuIGluc3RhbnRpYXRlZFxuICogICB9XG4gKlxuICogICBuZ3J4T25TdGF0ZUluaXQoKSB7XG4gKiAgICAgLy8gcnVucyBvbmNlIGFmdGVyIHN0b3JlIHN0YXRlIGhhcyBiZWVuIGluaXRpYWxpemVkXG4gKiAgIH1cbiAqIH1cbiAqXG4gKiBAQ29tcG9uZW50KHtcbiAqICAgcHJvdmlkZXJzOiBbXG4gKiAgICAgcHJvdmlkZUNvbXBvbmVudFN0b3JlKE15U3RvcmUpXG4gKiAgIF1cbiAqIH0pXG4gKiBleHBvcnQgY2xhc3MgTXlDb21wb25lbnQge1xuICogICBjb25zdHJ1Y3Rvcihwcml2YXRlIG15U3RvcmU6IE15U3RvcmUpIHt9XG4gKiB9XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHByb3ZpZGVDb21wb25lbnRTdG9yZTxUIGV4dGVuZHMgb2JqZWN0PihcbiAgY29tcG9uZW50U3RvcmVDbGFzczogVHlwZTxDb21wb25lbnRTdG9yZTxUPj5cbik6IFByb3ZpZGVyW10ge1xuICBjb25zdCBDU19XSVRIX0hPT0tTID0gbmV3IEluamVjdGlvblRva2VuPENvbXBvbmVudFN0b3JlPFQ+PihcbiAgICAnQG5ncngvY29tcG9uZW50LXN0b3JlIENvbXBvbmVudFN0b3JlIHdpdGggSG9va3MnXG4gICk7XG5cbiAgcmV0dXJuIFtcbiAgICB7IHByb3ZpZGU6IENTX1dJVEhfSE9PS1MsIHVzZUNsYXNzOiBjb21wb25lbnRTdG9yZUNsYXNzIH0sXG4gICAge1xuICAgICAgcHJvdmlkZTogY29tcG9uZW50U3RvcmVDbGFzcyxcbiAgICAgIHVzZUZhY3Rvcnk6ICgpID0+IHtcbiAgICAgICAgY29uc3QgY29tcG9uZW50U3RvcmUgPSBpbmplY3QoQ1NfV0lUSF9IT09LUyk7XG5cbiAgICAgICAgLy8gU2V0IHByaXZhdGUgcHJvcGVydHkgdGhhdCBDUyBoYXMgYmVlbiBwcm92aWRlZCB3aXRoIGxpZmVjeWNsZSBob29rc1xuICAgICAgICBjb21wb25lbnRTdG9yZVsnybVoYXNQcm92aWRlciddID0gdHJ1ZTtcblxuICAgICAgICBpZiAoaXNPblN0b3JlSW5pdERlZmluZWQoY29tcG9uZW50U3RvcmUpKSB7XG4gICAgICAgICAgY29tcG9uZW50U3RvcmUubmdyeE9uU3RvcmVJbml0KCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoaXNPblN0YXRlSW5pdERlZmluZWQoY29tcG9uZW50U3RvcmUpKSB7XG4gICAgICAgICAgY29tcG9uZW50U3RvcmUuc3RhdGUkXG4gICAgICAgICAgICAucGlwZSh0YWtlKDEpKVxuICAgICAgICAgICAgLnN1YnNjcmliZSgoKSA9PiBjb21wb25lbnRTdG9yZS5uZ3J4T25TdGF0ZUluaXQoKSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gY29tcG9uZW50U3RvcmU7XG4gICAgICB9LFxuICAgIH0sXG4gIF07XG59XG4iXX0=