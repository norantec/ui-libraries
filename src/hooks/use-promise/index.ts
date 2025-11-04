import { useUpdate } from 'ahooks';
import { useMemo, useRef } from 'react';
import { PartialDeep, Paths } from 'type-fest';
import * as _ from 'lodash';
import { diff } from 'deep-object-diff';

function getLeafPaths<T extends object>(inputObject: T, parentPath: Paths<T>[] = []) {
  let paths: Paths<T>[] = [];
  _.forOwn(inputObject, (value, key) => {
    const currentPath = [...parentPath, key] as Paths<T>[];
    if (_.isObject(value) && Object.keys(value).length > 0 && !_.isArray(value)) {
      paths = paths.concat(getLeafPaths(value as T, currentPath));
    } else {
      paths.push(currentPath.join('.') as Paths<T>);
    }
  });
  return paths;
}

type GenericFunction = (...params: unknown[]) => Promise<unknown>;

export interface UsePromiseReturn<T extends GenericFunction> {
  pendingParams: Paths<Parameters<T>>[] | null;
  error?: Error;
  result?: Awaited<ReturnType<T>>;
  run: (...params: Parameters<T>) => ReturnType<T>;
}

export const usePromise = <T extends GenericFunction>(promiseFn: T) => {
  const lastRequestObjectRef = useRef<PartialDeep<Parameters<T>>>(null);
  const pendingParamsRef = useRef<UsePromiseReturn<T>['pendingParams']>(null);
  const errorRef = useRef<Error>(undefined);
  const resultRef = useRef<UsePromiseReturn<T>['result']>(undefined);
  const update = useUpdate();
  const run = useMemo<UsePromiseReturn<T>['run']>(() => {
    return (async (...params) => {
      const finalParams = Array.isArray(params) ? params : [];
      pendingParamsRef.current = getLeafPaths(diff(lastRequestObjectRef.current, finalParams));
      update();

      try {
        resultRef.current = (await promiseFn(...finalParams)) as Awaited<ReturnType<T>>;
        errorRef.current = undefined;
      } catch (error) {
        resultRef.current = undefined;
        errorRef.current = error as unknown as Error;
      } finally {
        pendingParamsRef.current = null;
        lastRequestObjectRef.current = finalParams as PartialDeep<Parameters<T>>;
      }

      update();
    }) as UsePromiseReturn<T>['run'];
  }, [promiseFn, lastRequestObjectRef.current]);

  return {
    run,
    pendingParams: pendingParamsRef.current,
    error: errorRef.current,
    result: resultRef.current,
  };
};
