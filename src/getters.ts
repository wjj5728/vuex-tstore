import { Store, ActionContext } from "vuex";
import { qualifyKey, Result, Partial } from "./util";

/**
 * Represents a Vuex Getter Handler.
 */
export type GetterHandler<TModuleState, TRootState, TResult> = (
  state: TModuleState,
  rootState: TRootState
) => TResult;

/**
 * Represents a function that gets the value of a Vuex getter.
 */
export type GetAccessor<TModuleState, TRootState, TResult> = (
  store: Store<TRootState> | ActionContext<TModuleState, TRootState>
) => TResult;

/**
 * Provides an interface for accessors from a list of getters.
 *
 * Given an object that matches the type `TGetters` (below), this type
 * provides an interface that matches the type `TGetAccessors` (below).
 *
 * ```typescript
 * interface TGetters {
 *   [key: string | number | symbol]: (
 *     state?: TModuleState,
 *     getters?: any,
 *     rootState?: TRootState,
 *     rootGetters?: any
 *   ) => TResult
 * }
 *
 * type TGetAccessors = {
 *   [key in keyof TGetters]: () => TResult
 * }
 * ```
 */
export type GetAccessors<TModuleState, TRootState, TGetters> = {
  [key in keyof TGetters]: GetAccessor<
    TModuleState,
    TRootState,
    Result<TGetters[key]>
  >
};

/**
 * Provides an interface for wrapped getter accessors.
 *
 * Given an object that matches the type `TGetAccessors` (below), this type
 * reflects an interface that matches the type `TWrappedGetters` (below).
 *
 * ```typescript
 * interface TGetAccessors {
 *   [key: string | number | Symbol]: () => TResult
 * }
 *
 * type WrappedGetters = {
 *   [key in keyof TGetAccessors]: TResult
 * }
 * ```
 */
export type WrappedGetters<TGetAccessors> = {
  [key in keyof TGetAccessors]: Result<TGetAccessors[key]>
};

/**
 * Converts a dictionary of GetAccessors into a WrappedGetters implementation.
 *
 * This looks like a scary way to handle this, but it works. I'm explicitly
 * choosing to bypass the type system to tell the compiler "trust me, this
 * does what we expect it to do" in order to avoid having to make an already
 * complex type system *even more* complex. Basically, we're creating a wrapper
 * around the getters so that they don't need to reference the store all
 * the time.
 *
 * @param store Provides a reference to the store to execute getters against.
 * @param getters Provides a reference to the getter definitions to create wrappers around.
 *
 * ```typescript
 * import { Store } from 'vuex';
 * import { getStoreAccessors } from 'vuex-typescript';
 * const { read } = getStoreAccessors('');
 *
 * const options = {
 *   getters: {
 *     foo(state) { return 'bar'; },
 *     hello(state) { return (name: string) => `Hello, ${name}`; },
 *   },
 * };
 *
 * const store = new Store(options);
 * const getters = wrapGetters(store, options.getters);
 *
 * getters.foo; // 'bar'
 * getters.hello('world'); // 'Hello, world'
 * ```
 */
export function wrapGetters<
  TModuleState,
  TRootState,
  TGetters extends object,
  TGetAccessors = GetAccessors<TModuleState, TRootState, TGetters>,
  TWrappedGetters = WrappedGetters<TGetAccessors>
>(
  store: Store<TRootState>,
  getters: TGetAccessors,
  namespace: string
): TWrappedGetters {
  const result = {};

  for (const [key, getter] of Object.entries(getters)) {
    Object.defineProperty(result, key, {
      get() {
        return store.getters[qualifyKey(getter, namespace)];
      }
    });
  }

  return result as TWrappedGetters;
}
