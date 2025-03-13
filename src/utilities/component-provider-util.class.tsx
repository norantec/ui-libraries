import * as React from 'react';
import { createContext, useContext, useEffect, useRef } from 'react';
import { useUpdate } from 'ahooks';
import { ColorSchemeFinalValue, useColorScheme } from '../hooks/use-color-scheme';
import { ObjectUtil } from './object-util.class';
import * as _ from 'lodash';
import { Direction } from '../enums/direction.enum';
import { useDirection } from '../hooks/use-direction';
import mustache from 'mustache';
import { CSSObject } from '@emotion/react';
import { css } from '@emotion/css';
import { StringUtil } from '@open-norantec/utilities/dist/string-util.class';

interface PropsGeneratorContext<T> {
    colorScheme: ColorSchemeFinalValue;
    direction: Direction;
    props: T;
}

type PropsGeneratorFn<T> = (context: PropsGeneratorContext<T>) => Partial<T>;
type PatcherFn<T> = (...propsList: Partial<T>[]) => T;

function extractDependencies(template: string, whiteList: string[] = []): string[] {
    const tokens = mustache.parse(template);
    const fields = new Set<string>();

    function traverse(tokenList: any[]): void {
        for (const token of tokenList) {
            if (token[0] === 'name') {
                fields.add(token[1]);
            } else if (Array.isArray(token[4])) {
                traverse(token[4]);
            }
        }
    }

    traverse(tokens);
    return Array.from(fields).filter((field) => whiteList.includes(field));
}

function traverseObject(inputObject: object, handler: (key: string, value: any) => void) {
    if (!_.isPlainObject(inputObject)) return;
    Object.entries(inputObject).forEach(([key, value]) => {
        handler?.(key, value);
        if (_.isPlainObject(value)) {
            traverseObject(value, handler);
        }
    });
}

function topologicalSort(values: Record<string, string[]>): string[] {
    const inDegree: Record<string, number> = {};
    const graph: Record<string, string[]> = {};
    const result: string[] = [];
    const zeroInDegreeQueue: string[] = [];

    for (const [value, dependencies] of Object.entries(values)) {
        if (!Array.isArray(graph[value])) graph[value] = [];
        inDegree[value] = inDegree[value] || 0;
        for (const dependency of dependencies) {
            if (!Array.isArray(graph[dependency])) graph[dependency] = [];
            graph[dependency].push(value);
            inDegree[value] = (inDegree[value] || 0) + 1;
        }
    }

    for (const [value, degree] of Object.entries(inDegree)) {
        if (degree === 0) zeroInDegreeQueue.push(value);
    }

    while (zeroInDegreeQueue.length > 0) {
        const current = zeroInDegreeQueue.shift()!;
        result.push(current);
        for (const dependent of graph[current]) {
            inDegree[dependent] -= 1;
            if (inDegree[dependent] === 0) zeroInDegreeQueue.push(dependent);
        }
    }

    if (result.length === Object.keys(values).length) {
        return result;
    } else {
        throw new Error(`Circular dependencies detected: ${result.join(', ')}`);
    }
}

type TransformFn = (key: string) => string;

function transformKeys<T extends Record<string, any>>(inputObject: T, transformFn: TransformFn): T {
    if (!_.isPlainObject(inputObject)) return {} as T;
    return Object.entries(inputObject).reduce((result, [key, value]) => {
        const transformedKey = transformFn(key);
        if (StringUtil.isFalsyString(transformedKey)) return result;
        result[transformFn(key)] = _.isPlainObject(value) ? transformKeys(value, transformFn) : value;
        return result;
    }, {}) as T;
}

export interface ComponentConfig<T> {
    defaults?: Partial<T>;
    presets?: PropsGeneratorFn<T>;
    overrides?: PropsGeneratorFn<T>;
    patcher?: PatcherFn<T>;
}

export interface ComponentProviderProps<T> extends ComponentConfig<T> {
    children: React.ReactNode;
}

export class ComponentProviderUtil {
    public static create<T extends Record<string, any>>(config?: ComponentConfig<T>) {
        const generateProps = (...propsList: Array<Partial<T> | T>): T => {
            const rawProps = ObjectUtil.merge({ sources: propsList });
            if (typeof config?.patcher !== 'function') {
                return rawProps as T;
            }
            return ObjectUtil.merge({ sources: [rawProps, config.patcher(...propsList)] });
        };
        const Context = createContext<ComponentConfig<T>>(config);
        const Provider: React.FC<ComponentProviderProps<T>> = ({ defaults, presets, overrides, children }) => {
            return (
                <Context.Provider
                    value={ObjectUtil.merge({
                        sources: [
                            _.pick(config, ['defaults', 'overrides', 'presets']),
                            {
                                defaults,
                                overrides: (context) => {
                                    return generateProps(config?.overrides?.(context), overrides?.(context));
                                },
                                presets: (context) => {
                                    return generateProps(config?.presets?.(context), presets?.(context));
                                },
                            },
                        ],
                    })}
                >
                    {children}
                </Context.Provider>
            );
        };

        const useComponentConfig = (inputProps: T) => {
            const update = useUpdate();
            const context = useContext(Context);
            const resultRef = useRef<Partial<T>>({});
            const colorScheme = useColorScheme();
            const direction = useDirection();

            useEffect(() => {
                let finalProps = generateProps(config?.defaults, inputProps);
                const generatorContext: PropsGeneratorContext<T> = {
                    props: finalProps,
                    direction,
                    colorScheme,
                };
                finalProps = generateProps(finalProps, context?.presets?.(generatorContext));
                finalProps = generateProps(finalProps, inputProps, context?.overrides?.(generatorContext));

                if (_.isEqual(resultRef.current, finalProps)) {
                    return;
                }

                resultRef.current = finalProps;
                update();
            }, [context, inputProps, resultRef.current, colorScheme]);

            return resultRef.current;
        };

        const useClassNames = (cssObjectMap: Record<string, CSSObject>) => {
            const update = useUpdate();
            const classNameMapRef = useRef<Record<string, string>>({});

            useEffect(() => {
                if (!_.isPlainObject(cssObjectMap)) return;

                const whiteList = Object.keys(cssObjectMap);
                const dependenciesMap = new Map<string, string[]>();

                Object.entries(cssObjectMap).forEach(([key, value]) => {
                    if (!Array.isArray(dependenciesMap.get(key))) dependenciesMap.set(key, []);
                    traverseObject(value, (objectEntryKey) => {
                        dependenciesMap.set(
                            key,
                            dependenciesMap.get(key).concat(extractDependencies(objectEntryKey, whiteList)),
                        );
                    });
                });

                classNameMapRef.current = topologicalSort(Object.fromEntries(dependenciesMap.entries())).reduce(
                    (result, value) => {
                        const transformedCSSObject = transformKeys(cssObjectMap?.[value], (key) => {
                            return mustache.render(key, result);
                        });
                        result[value] = css(transformedCSSObject);
                        return result;
                    },
                    {},
                );

                update();
            }, [cssObjectMap]);

            return classNameMapRef.current;
        };

        return {
            Provider,
            useClassNames,
            useComponentConfig,
        };
    }
}
