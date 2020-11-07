/**
 * @fileoverview added by tsickle
 * Generated from: src/tap-response.ts
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
import { EMPTY } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
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
export function tapResponse(nextFn, errorFn, completeFn) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGFwLXJlc3BvbnNlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vbW9kdWxlcy9jb21wb25lbnQtc3RvcmUvc3JjL3RhcC1yZXNwb25zZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7OztBQUFBLE9BQU8sRUFBRSxLQUFLLEVBQWMsTUFBTSxNQUFNLENBQUM7QUFFekMsT0FBTyxFQUFFLFVBQVUsRUFBRSxHQUFHLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFzQmpELE1BQU0sVUFBVSxXQUFXLENBQ3pCLE1BQXlCLEVBQ3pCLE9BQWlDLEVBQ2pDLFVBQXVCO0lBRXZCOzs7O0lBQU8sQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUNoQixNQUFNLENBQUMsSUFBSSxDQUNULEdBQUcsQ0FBQztRQUNGLElBQUksRUFBRSxNQUFNO1FBQ1osS0FBSyxFQUFFLE9BQU87UUFDZCxRQUFRLEVBQUUsVUFBVTtLQUNyQixDQUFDLEVBQ0YsVUFBVTs7O0lBQUMsR0FBRyxFQUFFLENBQUMsS0FBSyxFQUFDLENBQ3hCLEVBQUM7QUFDTixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgRU1QVFksIE9ic2VydmFibGUgfSBmcm9tICdyeGpzJztcblxuaW1wb3J0IHsgY2F0Y2hFcnJvciwgdGFwIH0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuXG4vKipcbiAqIEhhbmRsZXMgdGhlIHJlc3BvbnNlIGluIENvbXBvbmVudFN0b3JlIGVmZmVjdHMgaW4gYSBzYWZlIHdheSwgd2l0aG91dFxuICogYWRkaXRpb25hbCBib2lsZXJwbGF0ZS5cbiAqIEl0IGVuZm9yY2VzIHRoYXQgdGhlIGVycm9yIGNhc2UgaXMgaGFuZGxlZCBhbmQgdGhhdCB0aGUgZWZmZWN0IHdvdWxkIHN0aWxsIGJlXG4gKiBydW5uaW5nIHNob3VsZCBhbiBlcnJvciBvY2N1ci5cbiAqXG4gKiBUYWtlcyBhbiBvcHRpb25hbCB0aGlyZCBhcmd1bWVudCBmb3IgYSBgY29tcGxldGVgIGNhbGxiYWNrLlxuICpcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIHJlYWRvbmx5IGRpc21pc3NlZEFsZXJ0cyA9IHRoaXMuZWZmZWN0PEFsZXJ0PihhbGVydCQgPT4ge1xuICogIHJldHVybiBhbGVydCQucGlwZShcbiAqICAgICAgY29uY2F0TWFwKFxuICogICAgICAgICAgKGFsZXJ0KSA9PiB0aGlzLmFsZXJ0c1NlcnZpY2UuZGlzbWlzc0FsZXJ0KGFsZXJ0KS5waXBlKFxuICogICAgICAgICAgICAgIHRhcFJlc3BvbnNlKFxuICogICAgICAgICAgICAgICAgIChkaXNtaXNzZWRBbGVydCkgPT4gdGhpcy5hbGVydERpc21pc3NlZChkaXNtaXNzZWRBbGVydCksXG4gKiAgICAgICAgICAgICAgICAgKGVycm9yKSA9PiB0aGlzLmxvZ0Vycm9yKGVycm9yKSxcbiAqICAgICAgICAgICAgICApKSkpO1xuICogICB9KTtcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gdGFwUmVzcG9uc2U8VD4oXG4gIG5leHRGbjogKG5leHQ6IFQpID0+IHZvaWQsXG4gIGVycm9yRm46IChlcnJvcjogdW5rbm93bikgPT4gdm9pZCxcbiAgY29tcGxldGVGbj86ICgpID0+IHZvaWRcbik6IChzb3VyY2U6IE9ic2VydmFibGU8VD4pID0+IE9ic2VydmFibGU8VD4ge1xuICByZXR1cm4gKHNvdXJjZSkgPT5cbiAgICBzb3VyY2UucGlwZShcbiAgICAgIHRhcCh7XG4gICAgICAgIG5leHQ6IG5leHRGbixcbiAgICAgICAgZXJyb3I6IGVycm9yRm4sXG4gICAgICAgIGNvbXBsZXRlOiBjb21wbGV0ZUZuLFxuICAgICAgfSksXG4gICAgICBjYXRjaEVycm9yKCgpID0+IEVNUFRZKVxuICAgICk7XG59XG4iXX0=