import * as React from 'react';
import { createContext, useContext, useEffect, useRef } from 'react';
import { useUpdate } from 'ahooks';
import { ColorSchemeFinalValue, useColorScheme } from '../hooks/use-color-scheme';
import { ObjectUtil } from './object-util.class';
import * as _ from 'lodash';
import { Direction } from '../enums/direction.enum';
import { useDirection } from '../hooks/use-direction';

interface PropsGeneratorContext<T> {
    colorScheme: ColorSchemeFinalValue;
    direction: Direction;
    props: T;
}

type PropsGeneratorFn<T> = (context: PropsGeneratorContext<T>) => Partial<T>;
type PatcherFn<T> = (...propsList: Partial<T>[]) => T;

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

        return {
            Provider,
            useComponentConfig,
        };
    }
}
