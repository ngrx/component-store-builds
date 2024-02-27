import * as operators from '@ngrx/operators';
export * from './component-store';
export { provideComponentStore, OnStateInit, OnStoreInit, } from './lifecycle_hooks';
/**
 * @deprecated Use `tapResponse` from `@ngrx/operators` instead.
 */
export declare const tapResponse: typeof operators.tapResponse;
