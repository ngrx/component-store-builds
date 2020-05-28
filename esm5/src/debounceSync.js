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
export function debounceSync() {
    return function (source) {
        return new Observable(function (observer) {
            var actionSubscription;
            var actionValue;
            var rootSubscription = new Subscription();
            rootSubscription.add(source.subscribe({
                complete: function () {
                    if (actionSubscription) {
                        observer.next(actionValue);
                    }
                    observer.complete();
                },
                error: function (error) { return observer.error(error); },
                next: function (value) {
                    actionValue = value;
                    if (!actionSubscription) {
                        actionSubscription = asapScheduler.schedule(function () {
                            observer.next(actionValue);
                            actionSubscription = undefined;
                        });
                        rootSubscription.add(actionSubscription);
                    }
                },
            }));
            return rootSubscription;
        });
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVib3VuY2VTeW5jLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vbW9kdWxlcy9jb21wb25lbnQtc3RvcmUvc3JjL2RlYm91bmNlU3luYy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztHQXNCRztBQUVILE9BQU8sRUFDTCxhQUFhLEVBRWIsVUFBVSxFQUNWLFlBQVksR0FDYixNQUFNLE1BQU0sQ0FBQztBQUVkLE1BQU0sVUFBVSxZQUFZO0lBQzFCLE9BQU8sVUFBQSxNQUFNO1FBQ1gsT0FBQSxJQUFJLFVBQVUsQ0FBSSxVQUFBLFFBQVE7WUFDeEIsSUFBSSxrQkFBNEMsQ0FBQztZQUNqRCxJQUFJLFdBQTBCLENBQUM7WUFDL0IsSUFBTSxnQkFBZ0IsR0FBRyxJQUFJLFlBQVksRUFBRSxDQUFDO1lBQzVDLGdCQUFnQixDQUFDLEdBQUcsQ0FDbEIsTUFBTSxDQUFDLFNBQVMsQ0FBQztnQkFDZixRQUFRLEVBQUU7b0JBQ1IsSUFBSSxrQkFBa0IsRUFBRTt3QkFDdEIsUUFBUSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQztxQkFDNUI7b0JBQ0QsUUFBUSxDQUFDLFFBQVEsRUFBRSxDQUFDO2dCQUN0QixDQUFDO2dCQUNELEtBQUssRUFBRSxVQUFBLEtBQUssSUFBSSxPQUFBLFFBQVEsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLEVBQXJCLENBQXFCO2dCQUNyQyxJQUFJLEVBQUUsVUFBQSxLQUFLO29CQUNULFdBQVcsR0FBRyxLQUFLLENBQUM7b0JBQ3BCLElBQUksQ0FBQyxrQkFBa0IsRUFBRTt3QkFDdkIsa0JBQWtCLEdBQUcsYUFBYSxDQUFDLFFBQVEsQ0FBQzs0QkFDMUMsUUFBUSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQzs0QkFDM0Isa0JBQWtCLEdBQUcsU0FBUyxDQUFDO3dCQUNqQyxDQUFDLENBQUMsQ0FBQzt3QkFDSCxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsa0JBQWtCLENBQUMsQ0FBQztxQkFDMUM7Z0JBQ0gsQ0FBQzthQUNGLENBQUMsQ0FDSCxDQUFDO1lBQ0YsT0FBTyxnQkFBZ0IsQ0FBQztRQUMxQixDQUFDLENBQUM7SUExQkYsQ0EwQkUsQ0FBQztBQUNQLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlIE1JVCBMaWNlbnNlXG4gKlxuICogQ29weXJpZ2h0IChjKSAyMDE3LTIwMjAgTmljaG9sYXMgSmFtaWVzb24gYW5kIGNvbnRyaWJ1dG9yc1xuICpcbiAqIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhIGNvcHlcbiAqIG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlIFwiU29mdHdhcmVcIiksIHRvIGRlYWxcbiAqIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHNcbiAqIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGxcbiAqIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXQgcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpc1xuICogZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcbiAqXG4gKiBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZCBpbiBhbGxcbiAqIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4gKlxuICogVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTUyBPUlxuICogSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksXG4gKiBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEVcbiAqIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVJcbiAqIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sXG4gKiBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRVxuICogU09GVFdBUkUuXG4gKi9cblxuaW1wb3J0IHtcbiAgYXNhcFNjaGVkdWxlcixcbiAgTW9ub1R5cGVPcGVyYXRvckZ1bmN0aW9uLFxuICBPYnNlcnZhYmxlLFxuICBTdWJzY3JpcHRpb24sXG59IGZyb20gJ3J4anMnO1xuXG5leHBvcnQgZnVuY3Rpb24gZGVib3VuY2VTeW5jPFQ+KCk6IE1vbm9UeXBlT3BlcmF0b3JGdW5jdGlvbjxUPiB7XG4gIHJldHVybiBzb3VyY2UgPT5cbiAgICBuZXcgT2JzZXJ2YWJsZTxUPihvYnNlcnZlciA9PiB7XG4gICAgICBsZXQgYWN0aW9uU3Vic2NyaXB0aW9uOiBTdWJzY3JpcHRpb24gfCB1bmRlZmluZWQ7XG4gICAgICBsZXQgYWN0aW9uVmFsdWU6IFQgfCB1bmRlZmluZWQ7XG4gICAgICBjb25zdCByb290U3Vic2NyaXB0aW9uID0gbmV3IFN1YnNjcmlwdGlvbigpO1xuICAgICAgcm9vdFN1YnNjcmlwdGlvbi5hZGQoXG4gICAgICAgIHNvdXJjZS5zdWJzY3JpYmUoe1xuICAgICAgICAgIGNvbXBsZXRlOiAoKSA9PiB7XG4gICAgICAgICAgICBpZiAoYWN0aW9uU3Vic2NyaXB0aW9uKSB7XG4gICAgICAgICAgICAgIG9ic2VydmVyLm5leHQoYWN0aW9uVmFsdWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgb2JzZXJ2ZXIuY29tcGxldGUoKTtcbiAgICAgICAgICB9LFxuICAgICAgICAgIGVycm9yOiBlcnJvciA9PiBvYnNlcnZlci5lcnJvcihlcnJvciksXG4gICAgICAgICAgbmV4dDogdmFsdWUgPT4ge1xuICAgICAgICAgICAgYWN0aW9uVmFsdWUgPSB2YWx1ZTtcbiAgICAgICAgICAgIGlmICghYWN0aW9uU3Vic2NyaXB0aW9uKSB7XG4gICAgICAgICAgICAgIGFjdGlvblN1YnNjcmlwdGlvbiA9IGFzYXBTY2hlZHVsZXIuc2NoZWR1bGUoKCkgPT4ge1xuICAgICAgICAgICAgICAgIG9ic2VydmVyLm5leHQoYWN0aW9uVmFsdWUpO1xuICAgICAgICAgICAgICAgIGFjdGlvblN1YnNjcmlwdGlvbiA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgIHJvb3RTdWJzY3JpcHRpb24uYWRkKGFjdGlvblN1YnNjcmlwdGlvbik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSxcbiAgICAgICAgfSlcbiAgICAgICk7XG4gICAgICByZXR1cm4gcm9vdFN1YnNjcmlwdGlvbjtcbiAgICB9KTtcbn1cbiJdfQ==