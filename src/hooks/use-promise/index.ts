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

export interface UsePromiseReturn<P extends unknown[], R, T extends (...params: P) => Promise<R>> {
    pendingParams: Paths<P>[];
    error?: Error;
    result?: R;
    run: T;
}

export const usePromise = <P extends any[], R, T extends (...params: P) => Promise<R>>(promiseFn: T) => {
    const lastRequestObjectRef = useRef<PartialDeep<P>>(null);
    const pendingParamsRef = useRef<UsePromiseReturn<P, R, T>['pendingParams']>([]);
    const errorRef = useRef<Error>(undefined);
    const resultRef = useRef<UsePromiseReturn<P, R, T>['result']>(undefined);
    const update = useUpdate();
    const run = useMemo<UsePromiseReturn<P, R, T>['run']>(() => {
        return (async (...params) => {
            const finalParams: P = Array.isArray(params) ? params : ([] as P);
            pendingParamsRef.current = getLeafPaths(diff(lastRequestObjectRef.current, finalParams));
            update();

            try {
                resultRef.current = await promiseFn(...finalParams);
                errorRef.current = undefined;
            } catch (error) {
                resultRef.current = undefined;
                errorRef.current = error as unknown as Error;
            } finally {
                pendingParamsRef.current = [];
                lastRequestObjectRef.current = finalParams as PartialDeep<P>;
            }

            update();
        }) as UsePromiseReturn<P, R, T>['run'];
    }, [promiseFn, lastRequestObjectRef.current]);

    return {
        run,
        pendingParams: pendingParamsRef.current,
        error: errorRef.current,
        result: resultRef.current,
    };
};
