/* eslint-disable @typescript-eslint/no-unnecessary-type-constraint */
import React, { BaseSyntheticEvent, cloneElement, isValidElement, JSX, useContext, useEffect, useRef } from 'react';
import { useUpdate } from 'ahooks';
import { StringUtil } from '@open-norantec/toolchain/dist/utilities/string-util.class';
import EventEmitter from 'eventemitter3';
import { Map as ImmutableMap } from 'immutable';
import { CSSObject } from '@emotion/react';
import { css, cx } from '@emotion/css';
import { ComponentProviderUtil } from '../../utilities/component-provider-util.class';
import { Direction } from '../../enums/direction.enum';
import { PiXCircleFill } from 'react-icons/pi';

const formTemplateMap = new Map<string, FormTemplateRegistry>();

interface FormItemBaseProps
    extends Omit<React.HTMLAttributes<HTMLDivElement>, 'value' | 'onChange' | 'children' | 'defaultValue'> {
    dangerColor?: string;
    dense?: number;
    labelProps?: React.HTMLAttributes<HTMLDivElement>;
    maxWidth?: number | string;
    minWidth?: number | string;
}

type GetPartialTemplateFn = (id: string, names?: string[]) => FormItemProps[];

export interface FormTemplateRegistryHelpers {
    getPartialTemplate: GetPartialTemplateFn;
}

export interface FormChildrenRegistryHelpers extends FormTemplateRegistryHelpers {
    getPartialTemplate: GetPartialTemplateFn;
    render: (propsList: FormItemProps[]) => JSX.Element[];
}

export interface FormStatic {
    registerTemplate: (name: string, registry: FormTemplateRegistry) => void;
}

export type ComponentPropsItem = any[];

export interface ComponentProps {
    [name: string]: ComponentPropsItem;
}

export interface FormProps extends FormItemBaseProps {
    children?: JSX.Element | JSX.Element[] | ((helpers: FormChildrenRegistryHelpers) => JSX.Element | JSX.Element[]);
    componentProps?: ComponentProps;
    defaultValues?: any;
    disabled?: boolean;
    readOnly?: boolean;
    sx?: {
        wrapper?: CSSObject;
    };
    onChange?: (value: Value, changedFields: string[]) => void;
    onInstanceInitialize?: (formInstance: Instance) => void;
}

export interface Value {
    [name: string]: any;
}

export interface ErrorMap {
    [name: string]: string[];
}

export interface ItemContext {
    componentProps: ComponentPropsItem;
    defaultValue: any;
    errorMessages: string[];
    formValue: Value;
}

export interface SubmitValue {
    errors?: ErrorMap;
    value?: Value;
}

export interface Instance {
    clearValues: (names?: string[]) => void;
    resetValues: (names?: string[]) => void;
    setValue: (name: string, value?: any) => void;
    setValues: (values?: Value) => void;
    submit: () => Promise<SubmitValue>;
}

export interface EffectActionHelpers {
    clear: () => void;
    reset: () => void;
    set: (value: any) => void;
}

export interface EffectItem {
    dependencies: string[];
    action: (value: Value, helpers: EffectActionHelpers) => void | Promise<void>;
}

export interface FormItemSerializer {
    incoming?: (incomingValue: any) => any;
    outgoing?: (outgoingValue: any) => any;
}

export type Validator = (value: any, formValue: Value) => Promise<string> | string;

export interface FormItemProps extends FormItemBaseProps {
    name: string;
    children?: JSX.Element | JSX.Element[] | ((context: ItemContext) => JSX.Element | JSX.Element[]);
    defaultValue?: any;
    disabled?: boolean | ((context: ItemContext) => boolean);
    effects?: EffectItem[];
    errorMessageProps?: React.HTMLAttributes<HTMLDivElement>;
    errorWrapperProps?: React.HTMLAttributes<HTMLDivElement> | false;
    label?: React.ReactNode;
    readOnly?: boolean | ((context: ItemContext) => boolean);
    required?: boolean;
    serializer?: FormItemSerializer;
    sx?: {
        wrapper?: CSSObject;
        headerWrapper?: CSSObject;
        headerLabel?: CSSObject;
        headerControls?: CSSObject;
        elementWrapper?: CSSObject;
        errorWrapper?: CSSObject;
        errorMessage?: CSSObject;
        errorMessageIcon?: CSSObject;
    };
    validators?: Validator[];
    hideCondition?: (context: ItemContext) => boolean;
    registerCondition?: (context: ItemContext) => boolean;
}

const EVENTS = {
    CHANGE: Symbol(''),
    CLEAR_VALUES: Symbol(''),
    DEFAULT_VALUE_REQUEST: Symbol(''),
    DEFAULT_VALUE_RESPONSE: Symbol(''),
    NAMES_REQUEST: Symbol(''),
    NAMES_RESPONSE: Symbol(''),
    REGISTER_ITEM: Symbol(''),
    RESET_VALUES: Symbol(''),
    SUBMIT_REQUEST: Symbol(''),
    SUBMIT_RESPONSE: Symbol(''),
    SET_VALUES: Symbol(''),
    UNREGISTER_ITEM: Symbol(''),
    VALUE_REQUEST: Symbol(''),
    VALUE_RESPONSE: Symbol(''),
};

const { Provider: FormProvider, useComponentConfig: useFormComponentConfig } = ComponentProviderUtil.create<FormProps>({
    defaults: {
        disabled: false,
        readOnly: false,
        dense: 4,
        dangerColor: '#FF0000',
    },
    presets: ({ props }) => {
        return {
            sx: {
                wrapper: {
                    display: 'flex',
                    flexDirection: 'column',
                    flexWrap: 'wrap',
                    alignItems: 'flex-start',
                    '& > *': {
                        marginBottom: 2 * props?.dense,
                    },
                },
            },
        };
    },
});

export { FormProvider };

const { Provider: FormItemProvider, useComponentConfig: useFormItemComponentConfig } =
    ComponentProviderUtil.create<FormItemProps>({
        defaults: {
            required: false,
            validators: [],
            effects: [],
        },
        presets: ({ props, direction }) => {
            return {
                sx: {
                    wrapper: {
                        maxWidth: '100%',
                    },
                    headerWrapper: {
                        display: 'flex',
                        flexDirection: 'row',
                        flexWrap: 'nowrap',
                        alignItems: 'center',
                    },
                    headerLabel: {
                        userSelect: 'none',
                        position: 'relative',
                        ...(() => {
                            if (props?.required) {
                                return {
                                    '&::before': {
                                        content: '"*"',
                                        lineHeight: 1,
                                        color: props?.dangerColor,
                                        fontWeight: 'bolder',
                                    },
                                };
                            }
                            return {};
                        })(),
                        flexGrow: 1,
                        flexShrink: 1,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        alignItems: 'center',
                    },
                    headerControls: {
                        display: 'flex',
                        flexWrap: 'nowrap',
                        flexDirection: 'row',
                        flexGrow: 0,
                        flexShrink: 0,
                    },
                    elementWrapper: {
                        display: 'flex',
                        flexDirection: 'row',
                        flexWrap: 'nowrap',
                        alignItems: 'flex-start',
                    },
                    errorWrapper: {
                        display: 'flex',
                        flexDirection: 'column',
                        flexWrap: 'nowrap',
                        alignItems: 'flex-start',
                        maxWidth: '100%',
                    },
                    errorMessage: {
                        maxWidth: '100%',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        display: 'inline-block',
                        position: 'relative',
                        boxSizing: 'border-box',
                        color: props?.dangerColor,
                        lineHeight: 1,
                        marginTop: 4,
                        ...(() => {
                            switch (direction) {
                                case Direction.LTR: {
                                    return {
                                        paddingLeft: props?.dense,
                                    };
                                }
                                case Direction.RTL: {
                                    return {
                                        paddingRight: props?.dense,
                                    };
                                }
                            }
                        })(),
                    },
                    errorMessageIcon: {
                        position: 'absolute',
                        top: 0,
                        ...(() => {
                            switch (direction) {
                                case Direction.LTR: {
                                    return {
                                        left: 0,
                                    };
                                }
                                case Direction.RTL: {
                                    return {
                                        right: 0,
                                    };
                                }
                            }
                        })(),
                    },
                },
            };
        },
    });

export { FormItemProvider };

const EventContext = React.createContext<EventEmitter>(null);
const ComponentPropsContext = React.createContext<ComponentProps>(null);
const ValueContext = React.createContext<ImmutableMap<string, any>>(null);
const ErrorMessagesContext = React.createContext<Record<string, string[]>>({});
const BasePropsContext = React.createContext<Pick<FormProps, 'defaultValues'>>({});

export const Form = React.forwardRef<HTMLDivElement, FormProps>((inputProps, ref) => {
    const {
        children: inputChildren = [],
        dense,
        dangerColor,
        labelProps,
        maxWidth,
        minWidth,
        componentProps = {},
        disabled = false,
        readOnly = false,
        defaultValues = {},
        sx,
        onChange,
        onInstanceInitialize,
    } = useFormComponentConfig(inputProps);
    const getPartialTemplate: GetPartialTemplateFn = (id, names) => {
        const registryFunction = formTemplateMap.get(id);

        if (typeof registryFunction !== 'function') {
            return [];
        }

        const formItems = registryFunction({
            getPartialTemplate,
        });

        if (!Array.isArray(formItems)) {
            return [];
        }

        if (!Array.isArray(names) || names.length === 0) {
            return formItems;
        }

        return names.map((name) => formItems.find((formItem) => formItem.name === name));
    };
    let normalizedChildren = [];

    if (typeof inputChildren === 'function') {
        const generatedChildren = inputChildren({
            getPartialTemplate,
            render: (propsList) => propsList.map((props) => <FormItem {...props} />),
        });
        if (Array.isArray(generatedChildren)) {
            normalizedChildren = generatedChildren;
        } else if (isValidElement(generatedChildren)) {
            normalizedChildren = [generatedChildren];
        } else {
            normalizedChildren = [];
        }
    } else if (Array.isArray(inputChildren)) {
        normalizedChildren = inputChildren;
    } else if (isValidElement(inputChildren)) {
        normalizedChildren = [inputChildren];
    } else {
        normalizedChildren = [];
    }

    const update = useUpdate();
    const formInstanceRef = useRef<Instance>(undefined);
    const valueRef = useRef<ImmutableMap<string, any>>(ImmutableMap());
    const errorsMapRef = useRef<ImmutableMap<string, string[]>>(ImmutableMap());
    const eventEmitterRef = useRef(new EventEmitter());
    const handleChange = (value: ImmutableMap<string, any>, changedFields: string[]) => {
        const formValue = value.toJS();
        onChange?.(formValue, changedFields);
        let newErrorsMap = errorsMapRef.current;
        changedFields.forEach((field) => {
            newErrorsMap = newErrorsMap.delete(field);
        });
        valueRef.current = value;
        errorsMapRef.current = newErrorsMap;
        update();
        eventEmitterRef.current.emit(EVENTS.CHANGE, formValue, changedFields);
    };

    useEffect(() => {
        const handleResetOrClear = (event: symbol, names?: string[]) => {
            if (![EVENTS.CLEAR_VALUES, EVENTS.RESET_VALUES].includes(event)) {
                return;
            }

            let newRawValue = valueRef.current;
            let normailzedNames = Array.isArray(names) ? names.filter((name) => !StringUtil.isFalsyString(name)) : [];

            if (!normailzedNames.length) {
                normailzedNames = Object.keys(valueRef.current.toJS());
            }

            if (normailzedNames.length === 0) {
                return;
            }

            switch (event) {
                case EVENTS.CLEAR_VALUES: {
                    normailzedNames.forEach((name) => {
                        const value = undefined;
                        if (newRawValue.get(name) === value) {
                            return;
                        }
                        newRawValue = newRawValue.set(name, value);
                    });
                    handleChange(newRawValue, normailzedNames);
                    break;
                }
                case EVENTS.RESET_VALUES: {
                    Promise.all(
                        normailzedNames.map((name) => {
                            return new Promise<{ name: string; defaultValue?: any }>((resolve) => {
                                const requestId = Symbol('');
                                const handler = (currentRequestId, defaultValue) => {
                                    if (requestId !== currentRequestId) {
                                        return;
                                    }
                                    eventEmitterRef.current.removeListener(EVENTS.DEFAULT_VALUE_RESPONSE, handler);
                                    resolve({
                                        name,
                                        defaultValue,
                                    });
                                };
                                eventEmitterRef.current.addListener(EVENTS.DEFAULT_VALUE_RESPONSE, handler);
                                eventEmitterRef.current.emit(EVENTS.DEFAULT_VALUE_REQUEST, name, requestId);
                            });
                        }),
                    ).then((resultList) => {
                        resultList.forEach(({ name, defaultValue }) => {
                            newRawValue = newRawValue.set(name, defaultValue);
                        });
                        handleChange(
                            newRawValue,
                            resultList.map(({ name }) => name),
                        );
                    });
                    break;
                }
            }
        };
        eventEmitterRef.current.addListener(EVENTS.REGISTER_ITEM, (name: string, defaultValue?: any) => {
            if (StringUtil.isFalsyString(name) || valueRef.current.has(name)) {
                return;
            }
            let newRawValue = valueRef.current;
            newRawValue = newRawValue.set(name, defaultValue);
            handleChange(newRawValue, [name]);
        });
        eventEmitterRef.current.addListener(EVENTS.UNREGISTER_ITEM, (name: string) => {
            if (StringUtil.isFalsyString(name) || !valueRef.current.has(name)) {
                return;
            }
            let newRawValue = valueRef.current;
            newRawValue = newRawValue.delete(name);
            handleChange(newRawValue, [name]);
        });
        eventEmitterRef.current.addListener(EVENTS.SET_VALUES, (value: Value) => {
            let newRawValue = valueRef.current;
            const changedFields: string[] = [];

            Object.entries(value).forEach(([name, value]) => {
                changedFields.push(name);
                newRawValue = newRawValue.set(name, value);
            });

            if (!changedFields.length) {
                return;
            }

            handleChange(newRawValue, changedFields);
        });
        eventEmitterRef.current.addListener(EVENTS.RESET_VALUES, (names?: string[]) =>
            handleResetOrClear(EVENTS.RESET_VALUES, names),
        );
        eventEmitterRef.current.addListener(EVENTS.CLEAR_VALUES, (names?: string[]) =>
            handleResetOrClear(EVENTS.CLEAR_VALUES, names),
        );
        eventEmitterRef.current.addListener(EVENTS.NAMES_REQUEST, (requestId: symbol) => {
            eventEmitterRef.current.emit(EVENTS.NAMES_RESPONSE, requestId, Object.keys(valueRef.current.toJS()));
        });
        eventEmitterRef.current.addListener(EVENTS.VALUE_REQUEST, (requestId: symbol) => {
            eventEmitterRef.current.emit(EVENTS.VALUE_RESPONSE, requestId, valueRef.current.toJS());
        });
        return () => {
            eventEmitterRef.current.removeAllListeners(EVENTS.REGISTER_ITEM);
            eventEmitterRef.current.removeAllListeners(EVENTS.UNREGISTER_ITEM);
            eventEmitterRef.current.removeAllListeners(EVENTS.SET_VALUES);
            eventEmitterRef.current.removeAllListeners(EVENTS.RESET_VALUES);
            eventEmitterRef.current.removeAllListeners(EVENTS.CLEAR_VALUES);
            eventEmitterRef.current.removeAllListeners(EVENTS.NAMES_REQUEST);
            eventEmitterRef.current.removeAllListeners(EVENTS.VALUE_REQUEST);
        };
    }, [valueRef.current, formInstanceRef.current]);

    useEffect(() => {
        formInstanceRef.current = {
            clearValues: (names) => {
                eventEmitterRef.current.emit(EVENTS.CLEAR_VALUES, names);
            },
            resetValues: (names) => {
                eventEmitterRef.current.emit(EVENTS.RESET_VALUES, names);
            },
            setValue: (name, value) => {
                eventEmitterRef.current.emit(EVENTS.SET_VALUES, { [name]: value });
            },
            setValues: (values) => {
                eventEmitterRef.current.emit(EVENTS.SET_VALUES, values);
            },
            submit: async () => {
                const names = await new Promise<string[]>((resolve) => {
                    const requestId = Symbol('');
                    const namesResponseHandler = (currentRequestId: symbol, names: string[]) => {
                        if (currentRequestId !== requestId) {
                            return;
                        }
                        eventEmitterRef.current.removeListener(EVENTS.NAMES_RESPONSE, namesResponseHandler);
                        resolve(names);
                    };
                    eventEmitterRef.current.addListener(EVENTS.NAMES_RESPONSE, namesResponseHandler);
                    eventEmitterRef.current.emit(EVENTS.NAMES_REQUEST, requestId);
                });
                const value = await new Promise<Value>((resolve) => {
                    const requestId = Symbol('');
                    const valueResponseHandler = (currentRequestId: symbol, names: string[]) => {
                        if (currentRequestId !== requestId) {
                            return;
                        }
                        eventEmitterRef.current.removeListener(EVENTS.VALUE_RESPONSE, valueResponseHandler);
                        resolve(names);
                    };
                    eventEmitterRef.current.addListener(EVENTS.VALUE_RESPONSE, valueResponseHandler);
                    eventEmitterRef.current.emit(EVENTS.VALUE_REQUEST, requestId);
                });
                const errorsMap = await new Promise<ImmutableMap<string, string[] | null>>((resolve) => {
                    const requestId = Symbol('');
                    let result = ImmutableMap<string, string[] | null>();
                    const submitResponseHandler = (currentRequestId: symbol, name: string, messages: string[]) => {
                        if (currentRequestId !== requestId || !Object.prototype.hasOwnProperty.call(value, name)) {
                            return;
                        }

                        const normalizedMessages = Array.isArray(messages)
                            ? messages.filter((message) => !StringUtil.isFalsyString(message))
                            : [];
                        result = result.set(name, normalizedMessages?.length > 0 ? normalizedMessages : null);
                        const currentKeys = Object.keys(result.toJS());

                        if (names?.every?.((name) => currentKeys.includes(name))) {
                            eventEmitterRef.current.removeListener(EVENTS.SUBMIT_RESPONSE, submitResponseHandler);
                            resolve(result);
                        }
                    };
                    eventEmitterRef.current.addListener(EVENTS.SUBMIT_RESPONSE, submitResponseHandler);
                    eventEmitterRef.current.emit(EVENTS.SUBMIT_REQUEST, requestId);
                });
                errorsMapRef.current = errorsMap;
                update();
                const errors = Object.entries(errorsMap.toJS()).reduce(
                    (result, [key, value]) => {
                        if (value === null) {
                            return result;
                        }
                        result[key] = value;
                        return result;
                    },
                    {} as { [name: string]: string[] },
                );

                return {
                    value: Object.keys(errors).length === 0 ? value : undefined,
                    errors: Object.keys(errors).length === 0 ? undefined : errors,
                };
            },
        };
        update();
    }, [eventEmitterRef.current]);

    useEffect(() => {
        onInstanceInitialize?.(formInstanceRef.current);
    }, [onInstanceInitialize, formInstanceRef.current]);

    return (
        <EventContext.Provider value={eventEmitterRef.current}>
            <ValueContext.Provider value={valueRef.current}>
                <ComponentPropsContext.Provider value={componentProps}>
                    <ErrorMessagesContext.Provider value={errorsMapRef.current.toJS()}>
                        <BasePropsContext.Provider
                            value={{
                                defaultValues,
                            }}
                        >
                            <div ref={ref} className={cx(css(sx?.wrapper))}>
                                {normalizedChildren.map((childItem) => {
                                    return cloneElement(childItem, {
                                        dense,
                                        dangerColor,
                                        labelProps,
                                        maxWidth,
                                        minWidth,
                                        disabled,
                                        readOnly,
                                    });
                                })}
                            </div>
                        </BasePropsContext.Provider>
                    </ErrorMessagesContext.Provider>
                </ComponentPropsContext.Provider>
            </ValueContext.Provider>
        </EventContext.Provider>
    );
});

const UNINITIALIZED = Symbol('');

export const FormItem: React.FC<FormItemProps> = (inputProps) => {
    const {
        name,
        children,
        required,
        label,
        disabled,
        readOnly,
        serializer,
        defaultValue,
        validators,
        effects,
        errorWrapperProps,
        errorMessageProps,
        sx,
        registerCondition,
        hideCondition,
        ...props
    } = useFormItemComponentConfig(inputProps);
    const update = useUpdate();
    const eventEmitter = useContext(EventContext);
    const componentPropsMap = useContext(ComponentPropsContext);
    const formValueMap = useContext(ValueContext);
    const errorMessagesMap = useContext(ErrorMessagesContext);
    const baseProps = useContext(BasePropsContext);
    const hiddenRef = useRef(true);
    const formItemContextRef = useRef<ItemContext>(undefined);
    const defaultValueRef = useRef<any>(UNINITIALIZED);
    const getContext = (): ItemContext => ({
        formValue: formValueMap.toJS(),
        defaultValue: defaultValueRef.current,
        componentProps: componentPropsMap?.[name],
        errorMessages: errorMessagesMap?.[name],
    });

    useEffect(() => {
        defaultValueRef.current = baseProps?.defaultValues?.[name] ?? defaultValue;
        update();
    }, [name, defaultValue, baseProps?.defaultValues?.[name]]);

    useEffect(() => {
        formItemContextRef.current = getContext();
        update();
    }, [componentPropsMap?.[name], formValueMap, name, defaultValueRef.current, errorMessagesMap?.[name]]);

    useEffect(() => {
        const handleSubmitRequest = (requestId: symbol) => {
            const normalizedValidators = Array.isArray(validators)
                ? validators.filter((validator) => typeof validator === 'function')
                : [];

            if (required) {
                normalizedValidators.unshift((value) => {
                    if (typeof value === 'undefined') {
                        return 'It is a required field';
                    }
                    return;
                });
            }

            Promise.all(
                normalizedValidators.map((validator) => validator(formValueMap?.get?.(name), formValueMap.toJS())),
            ).then((messages) => {
                eventEmitter.emit(
                    EVENTS.SUBMIT_RESPONSE,
                    requestId,
                    name,
                    messages.filter((message) => !StringUtil.isFalsyString(message)),
                );
            });
        };
        const handleChange = async (value: Value, changedFields: string[]) => {
            for (const effect of effects) {
                let dependencies = [];

                if (Array.isArray(effect?.dependencies)) {
                    dependencies = effect.dependencies.filter(
                        (dependency) => !StringUtil.isFalsyString(dependency) && dependency !== name,
                    );
                }

                if (
                    changedFields?.every?.((changeField) => !dependencies.includes(changeField)) ||
                    typeof effect?.action !== 'function'
                ) {
                    break;
                }

                await effect.action(value, {
                    reset: () => eventEmitter.emit(EVENTS.RESET_VALUES, [name]),
                    clear: () => eventEmitter.emit(EVENTS.CLEAR_VALUES, [name]),
                    set: (value) => eventEmitter.emit(EVENTS.SET_VALUES, { [name]: value }),
                });
            }
        };
        const handleDefaultValueRequest = (currentName: string, requestId: symbol) => {
            if (currentName !== name) {
                return;
            }
            eventEmitter.emit(EVENTS.DEFAULT_VALUE_RESPONSE, requestId, defaultValueRef.current);
        };
        eventEmitter.addListener(EVENTS.SUBMIT_REQUEST, handleSubmitRequest);
        eventEmitter.addListener(EVENTS.CHANGE, handleChange);
        eventEmitter.addListener(EVENTS.DEFAULT_VALUE_REQUEST, handleDefaultValueRequest);
        return () => {
            eventEmitter.removeListener(EVENTS.SUBMIT_REQUEST, handleSubmitRequest);
            eventEmitter.removeListener(EVENTS.CHANGE, handleChange);
            eventEmitter.removeListener(EVENTS.DEFAULT_VALUE_REQUEST, handleDefaultValueRequest);
        };
    }, [eventEmitter, validators, name, formValueMap, required, effects, defaultValueRef.current]);

    useEffect(() => {
        if (defaultValueRef.current === UNINITIALIZED) {
            return;
        }

        const register =
            typeof registerCondition !== 'function' ? true : registerCondition?.(formItemContextRef.current);

        if (register) {
            eventEmitter.emit(EVENTS.REGISTER_ITEM, name, defaultValueRef.current);
        } else {
            eventEmitter.emit(EVENTS.UNREGISTER_ITEM, name);
        }
    }, [name, formItemContextRef.current, defaultValueRef.current, registerCondition]);

    useEffect(() => {
        if (typeof hideCondition === 'function') {
            hiddenRef.current = hideCondition(formItemContextRef.current);
        } else if (typeof hideCondition === 'boolean') {
            hiddenRef.current = hideCondition;
        } else {
            hiddenRef.current = false;
        }
        update();
    }, [formItemContextRef.current, hideCondition]);

    let normalizedChildren = typeof children === 'function' ? children(formItemContextRef.current) : children;

    if (!Array.isArray(normalizedChildren)) {
        normalizedChildren = normalizedChildren ? [normalizedChildren] : [];
    }

    const parsedValue =
        typeof serializer?.incoming === 'function'
            ? serializer.incoming(formValueMap?.get?.(name))
            : formValueMap?.get?.(name);

    if (!formValueMap.has(name)) {
        return null;
    }

    return (
        <div
            {...props}
            className={cx(css(sx?.wrapper), props?.className)}
            style={{
                ...props?.style,
                ...(() => {
                    if (hiddenRef.current) {
                        return {
                            display: 'none',
                        };
                    }
                    return {};
                })(),
            }}
        >
            <div className={cx(css(sx?.headerWrapper))}>
                {label && <div className={cx(css(sx?.headerLabel))}>{label}</div>}
                <div
                    className={cx(css(sx?.headerControls))}
                    style={{
                        flex: 'unset',
                        flexGrow: 0,
                        flexShrink: 0,
                    }}
                ></div>
            </div>
            <div className={cx(css(sx?.elementWrapper))}>
                {normalizedChildren.slice(0, 1).map((element, elementIndex) =>
                    cloneElement(element, {
                        disabled:
                            element.props?.disabled ??
                            (() => {
                                return typeof disabled === 'function' ? disabled(getContext()) : disabled;
                            })(),
                        readOnly:
                            element.props?.readOnly ??
                            (() => {
                                return typeof readOnly === 'function' ? readOnly(getContext()) : readOnly;
                            })(),
                        ...componentPropsMap?.[name]?.[elementIndex],
                        value: parsedValue,
                        onChange: (value: any, ...others: any[]) => {
                            eventEmitter.emit(EVENTS.SET_VALUES, {
                                [name]: (() => {
                                    let result: any;
                                    if (typeof serializer?.outgoing === 'function') {
                                        result = serializer.outgoing(value);
                                    } else if ((value as any)?._reactName === 'onChange') {
                                        result = (value as BaseSyntheticEvent)?.target?.value;
                                    } else {
                                        result = value;
                                    }
                                    return result;
                                })(),
                            });
                            element?.props?.onChange?.(value, ...others);
                            componentPropsMap?.[name]?.[elementIndex]?.onChange?.(value, ...others);
                        },
                    }),
                )}
            </div>
            {errorMessagesMap?.[name]?.length > 0 && errorWrapperProps !== false && (
                <div {...errorWrapperProps} className={cx(css(sx?.errorWrapper), errorWrapperProps?.className)}>
                    {errorMessagesMap?.[name].map((errorMessage, index) => (
                        <div
                            key={index}
                            {...errorMessageProps}
                            className={cx(css(sx?.errorMessage), errorMessageProps?.className)}
                        >
                            <PiXCircleFill className={css(sx?.errorMessageIcon)} />
                            {errorMessage}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export interface FormFormatterProps<T> {
    value?: T;
    children: (value: T, onChange: (value?: T) => void) => React.ReactNode;
    onChange?: (value?: T) => void;
}

export const FormFormatter = <T extends any = any>({ value, onChange, children }: FormFormatterProps<T>) =>
    children?.(value, onChange);

export type FormTemplateRegistry = (helpers: FormTemplateRegistryHelpers) => FormItemProps[];

export const registerTemplate = (name: string, registry: FormTemplateRegistry) => {
    if (StringUtil.isFalsyString(name)) {
        return;
    }
    formTemplateMap.set(name, registry);
};
