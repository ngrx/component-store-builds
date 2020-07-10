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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVib3VuY2Utc3luYy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL21vZHVsZXMvY29tcG9uZW50LXN0b3JlL3NyYy9kZWJvdW5jZS1zeW5jLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUF3QkEsT0FBTyxFQUNMLGFBQWEsRUFFYixVQUFVLEVBQ1YsWUFBWSxHQUNiLE1BQU0sTUFBTSxDQUFDOzs7OztBQUVkLE1BQU0sVUFBVSxZQUFZO0lBQzFCOzs7O0lBQU8sQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUNoQixJQUFJLFVBQVU7Ozs7SUFBSSxDQUFDLFFBQVEsRUFBRSxFQUFFOztZQUN6QixrQkFBNEM7O1lBQzVDLFdBQTBCOztjQUN4QixnQkFBZ0IsR0FBRyxJQUFJLFlBQVksRUFBRTtRQUMzQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQ2xCLE1BQU0sQ0FBQyxTQUFTLENBQUM7WUFDZixRQUFROzs7WUFBRSxHQUFHLEVBQUU7Z0JBQ2IsSUFBSSxrQkFBa0IsRUFBRTtvQkFDdEIsUUFBUSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQztpQkFDNUI7Z0JBQ0QsUUFBUSxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ3RCLENBQUMsQ0FBQTtZQUNELEtBQUs7Ozs7WUFBRSxDQUFDLEtBQUssRUFBRSxFQUFFO2dCQUNmLFFBQVEsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDeEIsQ0FBQyxDQUFBO1lBQ0QsSUFBSTs7OztZQUFFLENBQUMsS0FBSyxFQUFFLEVBQUU7Z0JBQ2QsV0FBVyxHQUFHLEtBQUssQ0FBQztnQkFDcEIsSUFBSSxDQUFDLGtCQUFrQixFQUFFO29CQUN2QixrQkFBa0IsR0FBRyxhQUFhLENBQUMsUUFBUTs7O29CQUFDLEdBQUcsRUFBRTt3QkFDL0MsUUFBUSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQzt3QkFDM0Isa0JBQWtCLEdBQUcsU0FBUyxDQUFDO29CQUNqQyxDQUFDLEVBQUMsQ0FBQztvQkFDSCxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsa0JBQWtCLENBQUMsQ0FBQztpQkFDMUM7WUFDSCxDQUFDLENBQUE7U0FDRixDQUFDLENBQ0gsQ0FBQztRQUNGLE9BQU8sZ0JBQWdCLENBQUM7SUFDMUIsQ0FBQyxFQUFDLEVBQUM7QUFDUCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZSBNSVQgTGljZW5zZVxuICpcbiAqIENvcHlyaWdodCAoYykgMjAxNy0yMDIwIE5pY2hvbGFzIEphbWllc29uIGFuZCBjb250cmlidXRvcnNcbiAqXG4gKiBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYSBjb3B5XG4gKiBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsXG4gKiBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzXG4gKiB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsXG4gKiBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXNcbiAqIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4gKlxuICogVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWQgaW4gYWxsXG4gKiBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuICpcbiAqIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1MgT1JcbiAqIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZLFxuICogRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFXG4gKiBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSXG4gKiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLFxuICogT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEVcbiAqIFNPRlRXQVJFLlxuICovXG5cbmltcG9ydCB7XG4gIGFzYXBTY2hlZHVsZXIsXG4gIE1vbm9UeXBlT3BlcmF0b3JGdW5jdGlvbixcbiAgT2JzZXJ2YWJsZSxcbiAgU3Vic2NyaXB0aW9uLFxufSBmcm9tICdyeGpzJztcblxuZXhwb3J0IGZ1bmN0aW9uIGRlYm91bmNlU3luYzxUPigpOiBNb25vVHlwZU9wZXJhdG9yRnVuY3Rpb248VD4ge1xuICByZXR1cm4gKHNvdXJjZSkgPT5cbiAgICBuZXcgT2JzZXJ2YWJsZTxUPigob2JzZXJ2ZXIpID0+IHtcbiAgICAgIGxldCBhY3Rpb25TdWJzY3JpcHRpb246IFN1YnNjcmlwdGlvbiB8IHVuZGVmaW5lZDtcbiAgICAgIGxldCBhY3Rpb25WYWx1ZTogVCB8IHVuZGVmaW5lZDtcbiAgICAgIGNvbnN0IHJvb3RTdWJzY3JpcHRpb24gPSBuZXcgU3Vic2NyaXB0aW9uKCk7XG4gICAgICByb290U3Vic2NyaXB0aW9uLmFkZChcbiAgICAgICAgc291cmNlLnN1YnNjcmliZSh7XG4gICAgICAgICAgY29tcGxldGU6ICgpID0+IHtcbiAgICAgICAgICAgIGlmIChhY3Rpb25TdWJzY3JpcHRpb24pIHtcbiAgICAgICAgICAgICAgb2JzZXJ2ZXIubmV4dChhY3Rpb25WYWx1ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBvYnNlcnZlci5jb21wbGV0ZSgpO1xuICAgICAgICAgIH0sXG4gICAgICAgICAgZXJyb3I6IChlcnJvcikgPT4ge1xuICAgICAgICAgICAgb2JzZXJ2ZXIuZXJyb3IoZXJyb3IpO1xuICAgICAgICAgIH0sXG4gICAgICAgICAgbmV4dDogKHZhbHVlKSA9PiB7XG4gICAgICAgICAgICBhY3Rpb25WYWx1ZSA9IHZhbHVlO1xuICAgICAgICAgICAgaWYgKCFhY3Rpb25TdWJzY3JpcHRpb24pIHtcbiAgICAgICAgICAgICAgYWN0aW9uU3Vic2NyaXB0aW9uID0gYXNhcFNjaGVkdWxlci5zY2hlZHVsZSgoKSA9PiB7XG4gICAgICAgICAgICAgICAgb2JzZXJ2ZXIubmV4dChhY3Rpb25WYWx1ZSk7XG4gICAgICAgICAgICAgICAgYWN0aW9uU3Vic2NyaXB0aW9uID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgcm9vdFN1YnNjcmlwdGlvbi5hZGQoYWN0aW9uU3Vic2NyaXB0aW9uKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9LFxuICAgICAgICB9KVxuICAgICAgKTtcbiAgICAgIHJldHVybiByb290U3Vic2NyaXB0aW9uO1xuICAgIH0pO1xufVxuIl19