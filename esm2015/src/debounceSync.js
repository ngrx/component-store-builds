/**
 * @fileoverview added by tsickle
 * Generated from: src/debounceSync.ts
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
    source => new Observable((/**
     * @param {?} observer
     * @return {?}
     */
    observer => {
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
            error => observer.error(error)),
            next: (/**
             * @param {?} value
             * @return {?}
             */
            value => {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVib3VuY2VTeW5jLmpzIiwic291cmNlUm9vdCI6Im5nOi8vQG5ncngvY29tcG9uZW50LXN0b3JlLyIsInNvdXJjZXMiOlsic3JjL2RlYm91bmNlU3luYy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBd0JBLE9BQU8sRUFDTCxhQUFhLEVBRWIsVUFBVSxFQUNWLFlBQVksR0FDYixNQUFNLE1BQU0sQ0FBQzs7Ozs7QUFFZCxNQUFNLFVBQVUsWUFBWTtJQUMxQjs7OztJQUFPLE1BQU0sQ0FBQyxFQUFFLENBQ2QsSUFBSSxVQUFVOzs7O0lBQUksUUFBUSxDQUFDLEVBQUU7O1lBQ3ZCLGtCQUE0Qzs7WUFDNUMsV0FBMEI7O2NBQ3hCLGdCQUFnQixHQUFHLElBQUksWUFBWSxFQUFFO1FBQzNDLGdCQUFnQixDQUFDLEdBQUcsQ0FDbEIsTUFBTSxDQUFDLFNBQVMsQ0FBQztZQUNmLFFBQVE7OztZQUFFLEdBQUcsRUFBRTtnQkFDYixJQUFJLGtCQUFrQixFQUFFO29CQUN0QixRQUFRLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDO2lCQUM1QjtnQkFDRCxRQUFRLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDdEIsQ0FBQyxDQUFBO1lBQ0QsS0FBSzs7OztZQUFFLEtBQUssQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQTtZQUNyQyxJQUFJOzs7O1lBQUUsS0FBSyxDQUFDLEVBQUU7Z0JBQ1osV0FBVyxHQUFHLEtBQUssQ0FBQztnQkFDcEIsSUFBSSxDQUFDLGtCQUFrQixFQUFFO29CQUN2QixrQkFBa0IsR0FBRyxhQUFhLENBQUMsUUFBUTs7O29CQUFDLEdBQUcsRUFBRTt3QkFDL0MsUUFBUSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQzt3QkFDM0Isa0JBQWtCLEdBQUcsU0FBUyxDQUFDO29CQUNqQyxDQUFDLEVBQUMsQ0FBQztvQkFDSCxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsa0JBQWtCLENBQUMsQ0FBQztpQkFDMUM7WUFDSCxDQUFDLENBQUE7U0FDRixDQUFDLENBQ0gsQ0FBQztRQUNGLE9BQU8sZ0JBQWdCLENBQUM7SUFDMUIsQ0FBQyxFQUFDLEVBQUM7QUFDUCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZSBNSVQgTGljZW5zZVxuICpcbiAqIENvcHlyaWdodCAoYykgMjAxNy0yMDIwIE5pY2hvbGFzIEphbWllc29uIGFuZCBjb250cmlidXRvcnNcbiAqXG4gKiBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYSBjb3B5XG4gKiBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsXG4gKiBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzXG4gKiB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsXG4gKiBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXNcbiAqIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4gKlxuICogVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWQgaW4gYWxsXG4gKiBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuICpcbiAqIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1MgT1JcbiAqIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZLFxuICogRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFXG4gKiBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSXG4gKiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLFxuICogT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEVcbiAqIFNPRlRXQVJFLlxuICovXG5cbmltcG9ydCB7XG4gIGFzYXBTY2hlZHVsZXIsXG4gIE1vbm9UeXBlT3BlcmF0b3JGdW5jdGlvbixcbiAgT2JzZXJ2YWJsZSxcbiAgU3Vic2NyaXB0aW9uLFxufSBmcm9tICdyeGpzJztcblxuZXhwb3J0IGZ1bmN0aW9uIGRlYm91bmNlU3luYzxUPigpOiBNb25vVHlwZU9wZXJhdG9yRnVuY3Rpb248VD4ge1xuICByZXR1cm4gc291cmNlID0+XG4gICAgbmV3IE9ic2VydmFibGU8VD4ob2JzZXJ2ZXIgPT4ge1xuICAgICAgbGV0IGFjdGlvblN1YnNjcmlwdGlvbjogU3Vic2NyaXB0aW9uIHwgdW5kZWZpbmVkO1xuICAgICAgbGV0IGFjdGlvblZhbHVlOiBUIHwgdW5kZWZpbmVkO1xuICAgICAgY29uc3Qgcm9vdFN1YnNjcmlwdGlvbiA9IG5ldyBTdWJzY3JpcHRpb24oKTtcbiAgICAgIHJvb3RTdWJzY3JpcHRpb24uYWRkKFxuICAgICAgICBzb3VyY2Uuc3Vic2NyaWJlKHtcbiAgICAgICAgICBjb21wbGV0ZTogKCkgPT4ge1xuICAgICAgICAgICAgaWYgKGFjdGlvblN1YnNjcmlwdGlvbikge1xuICAgICAgICAgICAgICBvYnNlcnZlci5uZXh0KGFjdGlvblZhbHVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG9ic2VydmVyLmNvbXBsZXRlKCk7XG4gICAgICAgICAgfSxcbiAgICAgICAgICBlcnJvcjogZXJyb3IgPT4gb2JzZXJ2ZXIuZXJyb3IoZXJyb3IpLFxuICAgICAgICAgIG5leHQ6IHZhbHVlID0+IHtcbiAgICAgICAgICAgIGFjdGlvblZhbHVlID0gdmFsdWU7XG4gICAgICAgICAgICBpZiAoIWFjdGlvblN1YnNjcmlwdGlvbikge1xuICAgICAgICAgICAgICBhY3Rpb25TdWJzY3JpcHRpb24gPSBhc2FwU2NoZWR1bGVyLnNjaGVkdWxlKCgpID0+IHtcbiAgICAgICAgICAgICAgICBvYnNlcnZlci5uZXh0KGFjdGlvblZhbHVlKTtcbiAgICAgICAgICAgICAgICBhY3Rpb25TdWJzY3JpcHRpb24gPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICByb290U3Vic2NyaXB0aW9uLmFkZChhY3Rpb25TdWJzY3JpcHRpb24pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0sXG4gICAgICAgIH0pXG4gICAgICApO1xuICAgICAgcmV0dXJuIHJvb3RTdWJzY3JpcHRpb247XG4gICAgfSk7XG59XG4iXX0=