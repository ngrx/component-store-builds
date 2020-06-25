/**
 * @fileoverview added by tsickle
 * Generated from: src/debounce-sync.ts
 * @suppress {checkTypes,constantProperty,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
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
import { asapScheduler, Observable, Subscription, } from 'rxjs';
/**
 * @template T
 * @return {?}
 */
export function debounceSync() {
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
            (error) => observer.error(error)),
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVib3VuY2Utc3luYy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL21vZHVsZXMvY29tcG9uZW50LXN0b3JlL3NyYy9kZWJvdW5jZS1zeW5jLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUF3QkEsT0FBTyxFQUNMLGFBQWEsRUFFYixVQUFVLEVBQ1YsWUFBWSxHQUNiLE1BQU0sTUFBTSxDQUFDOzs7OztBQUVkLE1BQU0sVUFBVSxZQUFZO0lBQzFCOzs7O0lBQU8sQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUNoQixJQUFJLFVBQVU7Ozs7SUFBSSxDQUFDLFFBQVEsRUFBRSxFQUFFOztZQUN6QixrQkFBNEM7O1lBQzVDLFdBQTBCOztjQUN4QixnQkFBZ0IsR0FBRyxJQUFJLFlBQVksRUFBRTtRQUMzQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQ2xCLE1BQU0sQ0FBQyxTQUFTLENBQUM7WUFDZixRQUFROzs7WUFBRSxHQUFHLEVBQUU7Z0JBQ2IsSUFBSSxrQkFBa0IsRUFBRTtvQkFDdEIsUUFBUSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQztpQkFDNUI7Z0JBQ0QsUUFBUSxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ3RCLENBQUMsQ0FBQTtZQUNELEtBQUs7Ozs7WUFBRSxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQTtZQUN2QyxJQUFJOzs7O1lBQUUsQ0FBQyxLQUFLLEVBQUUsRUFBRTtnQkFDZCxXQUFXLEdBQUcsS0FBSyxDQUFDO2dCQUNwQixJQUFJLENBQUMsa0JBQWtCLEVBQUU7b0JBQ3ZCLGtCQUFrQixHQUFHLGFBQWEsQ0FBQyxRQUFROzs7b0JBQUMsR0FBRyxFQUFFO3dCQUMvQyxRQUFRLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDO3dCQUMzQixrQkFBa0IsR0FBRyxTQUFTLENBQUM7b0JBQ2pDLENBQUMsRUFBQyxDQUFDO29CQUNILGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO2lCQUMxQztZQUNILENBQUMsQ0FBQTtTQUNGLENBQUMsQ0FDSCxDQUFDO1FBQ0YsT0FBTyxnQkFBZ0IsQ0FBQztJQUMxQixDQUFDLEVBQUMsRUFBQztBQUNQLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlIE1JVCBMaWNlbnNlXG4gKlxuICogQ29weXJpZ2h0IChjKSAyMDE3LTIwMjAgTmljaG9sYXMgSmFtaWVzb24gYW5kIGNvbnRyaWJ1dG9yc1xuICpcbiAqIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhIGNvcHlcbiAqIG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlIFwiU29mdHdhcmVcIiksIHRvIGRlYWxcbiAqIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHNcbiAqIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGxcbiAqIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXQgcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpc1xuICogZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcbiAqXG4gKiBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZCBpbiBhbGxcbiAqIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4gKlxuICogVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTUyBPUlxuICogSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksXG4gKiBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEVcbiAqIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVJcbiAqIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sXG4gKiBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRVxuICogU09GVFdBUkUuXG4gKi9cblxuaW1wb3J0IHtcbiAgYXNhcFNjaGVkdWxlcixcbiAgTW9ub1R5cGVPcGVyYXRvckZ1bmN0aW9uLFxuICBPYnNlcnZhYmxlLFxuICBTdWJzY3JpcHRpb24sXG59IGZyb20gJ3J4anMnO1xuXG5leHBvcnQgZnVuY3Rpb24gZGVib3VuY2VTeW5jPFQ+KCk6IE1vbm9UeXBlT3BlcmF0b3JGdW5jdGlvbjxUPiB7XG4gIHJldHVybiAoc291cmNlKSA9PlxuICAgIG5ldyBPYnNlcnZhYmxlPFQ+KChvYnNlcnZlcikgPT4ge1xuICAgICAgbGV0IGFjdGlvblN1YnNjcmlwdGlvbjogU3Vic2NyaXB0aW9uIHwgdW5kZWZpbmVkO1xuICAgICAgbGV0IGFjdGlvblZhbHVlOiBUIHwgdW5kZWZpbmVkO1xuICAgICAgY29uc3Qgcm9vdFN1YnNjcmlwdGlvbiA9IG5ldyBTdWJzY3JpcHRpb24oKTtcbiAgICAgIHJvb3RTdWJzY3JpcHRpb24uYWRkKFxuICAgICAgICBzb3VyY2Uuc3Vic2NyaWJlKHtcbiAgICAgICAgICBjb21wbGV0ZTogKCkgPT4ge1xuICAgICAgICAgICAgaWYgKGFjdGlvblN1YnNjcmlwdGlvbikge1xuICAgICAgICAgICAgICBvYnNlcnZlci5uZXh0KGFjdGlvblZhbHVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG9ic2VydmVyLmNvbXBsZXRlKCk7XG4gICAgICAgICAgfSxcbiAgICAgICAgICBlcnJvcjogKGVycm9yKSA9PiBvYnNlcnZlci5lcnJvcihlcnJvciksXG4gICAgICAgICAgbmV4dDogKHZhbHVlKSA9PiB7XG4gICAgICAgICAgICBhY3Rpb25WYWx1ZSA9IHZhbHVlO1xuICAgICAgICAgICAgaWYgKCFhY3Rpb25TdWJzY3JpcHRpb24pIHtcbiAgICAgICAgICAgICAgYWN0aW9uU3Vic2NyaXB0aW9uID0gYXNhcFNjaGVkdWxlci5zY2hlZHVsZSgoKSA9PiB7XG4gICAgICAgICAgICAgICAgb2JzZXJ2ZXIubmV4dChhY3Rpb25WYWx1ZSk7XG4gICAgICAgICAgICAgICAgYWN0aW9uU3Vic2NyaXB0aW9uID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgcm9vdFN1YnNjcmlwdGlvbi5hZGQoYWN0aW9uU3Vic2NyaXB0aW9uKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9LFxuICAgICAgICB9KVxuICAgICAgKTtcbiAgICAgIHJldHVybiByb290U3Vic2NyaXB0aW9uO1xuICAgIH0pO1xufVxuIl19