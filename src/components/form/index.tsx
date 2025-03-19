/* eslint-disable @typescript-eslint/no-unnecessary-type-constraint */
import * as React from 'react';
import {
    BaseSyntheticEvent,
    cloneElement,
    isValidElement,
    JSX,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
} from 'react';
import { useUpdate } from 'ahooks';
import { StringUtil } from '@open-norantec/utilities/dist/string-util.class';
import { EventEmitter } from 'eventemitter3';
import { Map as ImmutableMap, Set as ImmutableSet } from 'immutable';
import { CSSObject } from '@emotion/react';
import { cx } from '@emotion/css';
import { ComponentProviderUtil } from '../../utilities/component-provider-util.class';
import { PiXCircleFill } from 'react-icons/pi';
import * as _ from 'lodash';
import { usePreviousValueEffect } from '../../hooks/use-previous-value-effect';
import { UUIDUtil } from '@open-norantec/utilities/dist/uuid-util.class';

export type FormTemplateRegistry = (helpers: FormTemplateRegistryHelpers) => FormItemProps[];

interface ValueState {
    data: any;
    errorMessages: string[];
}

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
    disabled?: boolean;
    form?: FormInstance;
    readOnly?: boolean;
    sx?: {
        wrapper?: CSSObject;
    };
    onChange?: (value: Value, changedFields: string[]) => void;
}

export interface Value {
    [name: string]: any;
}

export interface ErrorMap {
    [name: string]: string[];
}

export interface ItemContext {
    defaultValue: any;
    errorMessages: string[];
    formValueStateMap: ImmutableMap<string, ValueState>;
    value: any;
}

export interface SubmitValue {
    errors?: ErrorMap;
    value?: Value;
}

export interface FormItemProps extends FormItemBaseProps {
    name: string;
    children?: JSX.Element | JSX.Element[] | ((context: ItemContext) => JSX.Element | JSX.Element[]);
    defaultValue?: any;
    disabled?: boolean | ((context: ItemContext) => boolean);
    errorMessageProps?: React.HTMLAttributes<HTMLDivElement>;
    errorWrapperProps?: React.HTMLAttributes<HTMLDivElement> | false;
    extra?: React.ReactNode;
    label?: React.ReactNode;
    readOnly?: boolean | ((context: ItemContext) => boolean);
    required?: boolean | string;
    serializer?: FormItemSerializer;
    sx?: {
        wrapper?: CSSObject;
        headerWrapper?: CSSObject;
        headerLabel?: CSSObject;
        headerControls?: CSSObject;
        elementWrapper?: CSSObject;
        errorWrapper?: CSSObject;
        errorMessage?: CSSObject;
        errorMessageContent?: CSSObject;
        errorMessageIcon?: CSSObject;
    };
    validators?: Validator[];
    hideCondition?: (context: ItemContext) => boolean;
    registerCondition?: (context: ItemContext) => boolean;
}

export interface FormItemSerializer {
    incoming?: (incomingValue: any) => any;
    outgoing?: (outgoingValue: any) => any;
}

export type Validator = {
    validateOnChange?: boolean;
    validateOnValidation?: boolean;
    validate: (value: any, formValue: Value) => Promise<string> | string;
};

interface IFormInstance {
    clearValues: (names?: string[]) => void;
    getValue: (name: string) => any;
    getValues: () => Value;
    resetValues: (names?: string[]) => void;
    setValue: (name: string, value?: any) => void;
    setValues: (values?: Value) => void;
    validate: (names?: string[]) => Promise<SubmitValue>;
}

class FormInstance {
    public clearValues: (names?: string[]) => void;
    public getValue: (name: string) => any;
    public getValues: () => Value;
    public resetValues: (names?: string[]) => void;
    public setValue: (name: string, value?: any) => void;
    public setValues: (values?: Value) => void;
    public validate: (names?: string[]) => Promise<SubmitValue>;

    public constructor(useFormId: string, instanceId: string, innerInstance?: IFormInstance) {
        Object.defineProperty(this, 'useFormId', {
            writable: false,
            value: useFormId,
        });
        Object.defineProperty(this, 'instanceId', {
            writable: false,
            value: instanceId,
        });
        this.clearValues = innerInstance?.clearValues;
        this.getValue = innerInstance?.getValue;
        this.getValues = innerInstance?.getValues;
        this.resetValues = innerInstance?.resetValues;
        this.setValue = innerInstance?.setValue;
        this.setValues = innerInstance?.setValues;
        this.validate = innerInstance?.validate;
    }
}

const getDefinedPropertyValue = (instance: IFormInstance, key: string | symbol) => {
    try {
        const result = Object.getOwnPropertyDescriptor(instance, key)?.value ?? null;
        return result;
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e) {
        return null;
    }
};

export const registerTemplate = (name: string, registry: FormTemplateRegistry) => {
    if (StringUtil.isFalsyString(name)) {
        return;
    }
    formTemplateMap.set(name, registry);
};

const EventContext = React.createContext<EventEmitter>(null);
const EVENT_NAMES = {
    EXTERNAL_BULK_ALTER_VALUES: Symbol(''),
    EXTERNAL_SET_VALUES: Symbol(''),
    INSTANCE_UPDATE: Symbol(''),
    PARTIAL_CHANGE: Symbol(''),
    REGISTER_ITEM: Symbol(''),
    UNREGISTER_ITEM: Symbol(''),
};

const eventEmitter = new EventEmitter();

export const useForm = () => {
    const update = useUpdate();
    const instanceRef = useRef<FormInstance>(undefined);
    const idRef = useRef<string>(undefined);

    useEffect(() => {
        const id = UUIDUtil.generateV4();
        idRef.current = id;
        instanceRef.current = new FormInstance(id, UUIDUtil.generateV4());
        update();
    }, []);

    useEffect(() => {
        if (StringUtil.isFalsyString(idRef.current) || !instanceRef.current) return;

        const handler = (useFormId: string | null, instance: FormInstance) => {
            if (
                StringUtil.isFalsyString(useFormId) ||
                useFormId !== idRef.current ||
                getDefinedPropertyValue(instance, 'instanceId') ===
                    getDefinedPropertyValue(instanceRef.current, 'instanceId')
            ) {
                return;
            }
            instanceRef.current = instance;
            update();
        };

        eventEmitter.addListener(EVENT_NAMES.INSTANCE_UPDATE, handler);

        return () => {
            eventEmitter.removeListener(EVENT_NAMES.INSTANCE_UPDATE, handler);
        };
    }, [idRef.current, instanceRef.current]);

    return instanceRef.current;
};

const {
    Provider: FormProvider,
    useComponentConfig: useFormComponentConfig,
    useClassNames: useFormClassNames,
} = ComponentProviderUtil.create<FormProps>({
    defaultProps: () => ({
        disabled: false,
        readOnly: false,
        dense: 4,
        dangerColor: '#FF0000',
        sx: {
            wrapper: {
                display: 'flex',
                flexDirection: 'column',
                flexWrap: 'wrap',
                alignItems: 'flex-start',
            },
        },
    }),
    merger: (context) => ({
        sx: {
            wrapper: {
                '& > *': {
                    marginBottom: 2 * context?.finalProps?.dense,
                },
            },
        },
    }),
});

const {
    Provider: FormItemProvider,
    useComponentConfig: useFormItemComponentConfig,
    useClassNames: useFormItemClassNames,
} = ComponentProviderUtil.create<FormItemProps>({
    defaultProps: () => ({
        required: false,
        validators: [],
        effects: [],
    }),
    merger: ({ finalProps }) => {
        return {
            sx: {
                wrapper: {
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    flexWrap: 'nowrap',
                    marginBottom: finalProps?.dense * 4,
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
                        if (finalProps?.required === true || !StringUtil.isFalsyString(finalProps?.required)) {
                            return {
                                '&::before': {
                                    content: '"*"',
                                    lineHeight: 1,
                                    color: finalProps?.dangerColor,
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
                    flexDirection: 'column',
                    flexWrap: 'nowrap',
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
                    display: 'flex',
                    flexDirection: 'row',
                    flexWrap: 'nowrap',
                    position: 'relative',
                    boxSizing: 'border-box',
                    color: finalProps?.dangerColor,
                    lineHeight: 1,
                    marginTop: 4,
                },
                errorMessageIcon: {
                    display: 'inline-block',
                    flexShrink: 0,
                    flexGrow: 0,
                },
                errorMessageContent: {
                    display: 'inline-block',
                    flexShrink: 1,
                    flexGrow: 1,
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                    textOverflow: 'ellipsis',
                },
            },
        };
    },
});

export { FormProvider, FormItemProvider };

const ValueStateMapContext = React.createContext<ImmutableMap<string, ValueState>>(ImmutableMap());
const RegisteredFieldNamesContext = React.createContext<ImmutableSet<string>>(ImmutableSet());
const getFormValue = (valueStateMap: ImmutableMap<string, ValueState>): Value => {
    return Array.from(valueStateMap?.entries?.() ?? []).reduce((result, [name, value]) => {
        result[name] = value?.data;
        return result;
    }, {} as Value);
};

export const Form = React.forwardRef<HTMLDivElement, FormProps>((inputProps, ref) => {
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
    const {
        children: inputChildren = [],
        dense,
        dangerColor,
        labelProps,
        maxWidth,
        minWidth,
        disabled = false,
        readOnly = false,
        sx,
        form,
        onChange,
    } = useFormComponentConfig(inputProps);
    const update = useUpdate();
    const classNames = useFormClassNames(sx);
    const eventEmitterRef = useRef(new EventEmitter());
    const children = useMemo(() => {
        let result: JSX.Element[] = [];

        if (typeof inputChildren === 'function') {
            const generatedChildren = inputChildren({
                getPartialTemplate,
                render: (propsList) => propsList.map((props) => <FormItem {...props} />),
            });
            if (Array.isArray(generatedChildren)) {
                result = generatedChildren;
            } else if (isValidElement(generatedChildren)) {
                result = [generatedChildren];
            } else {
                result = [];
            }
        } else if (Array.isArray(inputChildren)) {
            result = inputChildren;
        } else if (isValidElement(inputChildren)) {
            result = [inputChildren];
        } else {
            result = [];
        }

        return result
            .filter((child) => !StringUtil.isFalsyString(child?.props?.name))
            .map((child, index) => {
                return cloneElement(child, {
                    key: index,
                    dense: child?.props?.dense ?? dense,
                    dangerColor: child?.props?.dangerColor ?? dangerColor,
                    labelProps: child?.props?.labelProps ?? labelProps,
                    maxWidth: child?.props?.maxWidth ?? maxWidth,
                    minWidth: child?.props?.minWidth ?? minWidth,
                    disabled: child?.props?.disabled ?? disabled,
                    readOnly: child?.props?.readOnly ?? readOnly,
                });
            });
    }, [inputChildren]);
    const registratedFieldNamesRef = useRef<ImmutableSet<string>>(ImmutableSet());
    const formValueStateMapRef = useRef<ImmutableMap<string, ValueState>>(ImmutableMap());
    const formInstanceRef = useRef<IFormInstance>(undefined);

    const getFinalNames = useCallback(
        (inputNames?: string[]): string[] => {
            const names = Array.isArray(inputNames)
                ? inputNames.filter((inputName) => formValueStateMapRef.current.has(inputName))
                : Array.from(formValueStateMapRef.current.keys());
            return names;
        },
        [formValueStateMapRef.current],
    );

    const clearValues = useCallback(
        (inputNames?: string[]) => {
            eventEmitterRef?.current?.emit?.(EVENT_NAMES.EXTERNAL_BULK_ALTER_VALUES, inputNames, false);
        },
        [eventEmitterRef.current],
    );

    const resetValues = useCallback(
        (inputNames?: string[]) => {
            eventEmitterRef?.current?.emit?.(EVENT_NAMES.EXTERNAL_BULK_ALTER_VALUES, inputNames, true);
        },
        [eventEmitterRef.current],
    );

    const setValue = useCallback(
        (name: string, value: any) => {
            if (StringUtil.isFalsyString(name)) return;
            eventEmitterRef?.current?.emit?.(EVENT_NAMES.EXTERNAL_SET_VALUES, { [name]: value });
        },
        [eventEmitterRef.current],
    );

    const setValues = useCallback(
        (newValues: Value) => {
            eventEmitterRef?.current?.emit?.(EVENT_NAMES.EXTERNAL_SET_VALUES, newValues);
        },
        [eventEmitterRef.current],
    );

    const validate = useCallback(
        async (inputNames?: string[], isChangeMode = false) => {
            const names = getFinalNames(inputNames);

            if (names.length === 0) return;

            const formValue = getFormValue(formValueStateMapRef.current);
            const result: SubmitValue = {
                value: formValue,
                errors: await Promise.all(
                    children.map((child) => {
                        const required = child?.props?.required;
                        const validators: Validator[] = child?.props?.validators;
                        let normalizedValidators = Array.isArray(validators)
                            ? validators.filter((validator) => typeof validator?.validate === 'function')
                            : [];

                        if (required === true || !StringUtil.isFalsyString(required)) {
                            normalizedValidators.unshift({
                                validateOnChange: true,
                                validateOnValidation: true,
                                validate: (value) => {
                                    if (typeof value === 'undefined') {
                                        return !StringUtil.isFalsyString(required)
                                            ? (required as string)
                                            : 'It is a required field';
                                    }
                                    return;
                                },
                            });
                        }

                        normalizedValidators = normalizedValidators.filter((validator) => {
                            return (
                                (isChangeMode && validator?.validateOnChange !== false) ||
                                (!isChangeMode && validator?.validateOnValidation !== false)
                            );
                        });

                        if (normalizedValidators.length === 0) {
                            return Promise.resolve([child?.props?.name, []] as [string, string[]]);
                        }

                        return Promise.all(
                            normalizedValidators.map((validator) => {
                                return validator.validate(formValue?.[child?.props?.name], formValue);
                            }),
                        ).then((messages) => {
                            return [
                                child?.props?.name,
                                messages.filter((message) => !StringUtil.isFalsyString(message)),
                            ] as [string, string[]];
                        });
                    }),
                ).then((result: Array<[string, string[]]>) => {
                    const finalErrors = Object.fromEntries(result.filter(([, messages]) => messages?.length > 0));
                    if (Object.keys(finalErrors).length === 0) return null;
                    return finalErrors;
                }),
            };

            let currentValueStateMap = formValueStateMapRef.current;

            if (Object.keys(result.errors ?? {}).length === 0) {
                Array.from(formValueStateMapRef.current?.entries?.() ?? []).forEach(([fieldName, valueState]) => {
                    currentValueStateMap = currentValueStateMap.set(fieldName, {
                        ...valueState,
                        errorMessages: [],
                    });
                });
            } else {
                Object.entries(result.errors ?? {}).forEach(([key, errors]) => {
                    if (!currentValueStateMap.has(key)) return;
                    currentValueStateMap = currentValueStateMap.set(key, {
                        ...currentValueStateMap.get(key),
                        errorMessages: errors,
                    });
                });
            }

            formValueStateMapRef.current = currentValueStateMap;
            update();

            return result;
        },
        [children, formValueStateMapRef.current],
    );

    usePreviousValueEffect(
        () => {
            const useFormId = getDefinedPropertyValue(form, 'useFormId');
            if (StringUtil.isFalsyString(useFormId)) return;
            const newInstance = new FormInstance(useFormId, UUIDUtil.generateV4(), formInstanceRef.current);
            eventEmitter?.emit?.(EVENT_NAMES.INSTANCE_UPDATE, useFormId, newInstance);
        },
        [formInstanceRef.current, form],
        (previousValue: [IFormInstance, FormInstance]) => {
            if (
                getDefinedPropertyValue(form, 'instanceId') ===
                    getDefinedPropertyValue(previousValue?.[1], 'instanceId') ||
                formInstanceRef.current === previousValue?.[0]
            ) {
                return;
            }
            return [formInstanceRef.current, form] as [IFormInstance, FormInstance];
        },
    );

    usePreviousValueEffect(
        () => {
            if (!(eventEmitterRef.current instanceof EventEmitter)) return;
            if (!formValueStateMapRef.current) {
                formInstanceRef.current = {
                    clearValues,
                    resetValues,
                    setValue,
                    setValues,
                    getValues: () => {
                        return null;
                    },
                    getValue: () => {
                        return null;
                    },
                    validate: async () => {
                        return null;
                    },
                };
            } else {
                formInstanceRef.current = {
                    clearValues,
                    resetValues,
                    setValue,
                    setValues,
                    getValues: () => {
                        return Array.from(formValueStateMapRef.current.entries()).reduce(
                            (result, currentEntry) => {
                                result[currentEntry?.[0]] = currentEntry?.[1]?.data;
                                return result;
                            },
                            {} as Record<string, any>,
                        );
                    },
                    getValue: (name) => {
                        if (StringUtil.isFalsyString(name)) return;
                        return formValueStateMapRef.current.get(name)?.data;
                    },
                    validate: async (inputNames) => {
                        return await validate(inputNames);
                    },
                };
            }

            update();
        },
        [formValueStateMapRef.current, eventEmitterRef.current],
        (previousValue: [ImmutableMap<string, ValueState>, EventEmitter]) => {
            const previousFormValue = getFormValue(previousValue?.[0]);
            const currentFormValue = getFormValue(formValueStateMapRef?.current);
            if (_.isEqual(previousFormValue, currentFormValue) && eventEmitterRef.current !== previousValue?.[1]) {
                return;
            }
            return [formValueStateMapRef.current, eventEmitterRef.current] as [
                ImmutableMap<string, ValueState>,
                EventEmitter,
            ];
        },
    );

    usePreviousValueEffect(
        () => {
            let formValueStateMap = ImmutableMap<string, ValueState>();
            children.forEach((child) => {
                formValueStateMap = formValueStateMap.set(child?.props?.name, {
                    data: child?.props?.defaultValue,
                    errorMessages: [],
                });
            });
            formValueStateMapRef.current = formValueStateMap;
            update();
        },
        [children],
        (previousValue: any[]) => {
            const childrenPropsList = children?.map?.((child) => _.pick(child?.props, ['defaultValue']));
            return _.isEqual(previousValue, childrenPropsList) ? undefined : childrenPropsList;
        },
    );

    useEffect(() => {
        if (!(eventEmitterRef.current instanceof EventEmitter)) return;

        const partialChangeHandler = (updatePart: Value) => {
            if (!updatePart || !_.isObjectLike(updatePart)) return;
            let currentFormValueStateMap = formValueStateMapRef.current;
            const updatedFields: string[] = [];
            Object.entries(updatePart).forEach(([key, value]) => {
                if (!currentFormValueStateMap.has(key)) return;
                updatedFields.push(key);
                currentFormValueStateMap = currentFormValueStateMap.set(key, {
                    ...currentFormValueStateMap.get(key),
                    data: value,
                });
            });
            formValueStateMapRef.current = currentFormValueStateMap;
            update();
            onChange?.(getFormValue(currentFormValueStateMap), updatedFields);
            validate(updatedFields, true);
        };

        const registerHandler = (name: string) => {
            registratedFieldNamesRef.current = registratedFieldNamesRef.current.add(name);
            update();
        };

        const unregisterHandler = (name: string) => {
            registratedFieldNamesRef.current = registratedFieldNamesRef.current.delete(name);
            update();
        };

        const externalSetValuesHandler = (newValues: Value) => {
            if (!_.isObjectLike(newValues)) return;
            const names = getFinalNames(Object.keys(newValues));
            if (names.length === 0) return;
            let currentFormValueStateMap = formValueStateMapRef.current;
            names.forEach((name) => {
                currentFormValueStateMap = currentFormValueStateMap.set(name, {
                    ...currentFormValueStateMap.get(name),
                    data: newValues?.[name],
                });
            });
            formValueStateMapRef.current = currentFormValueStateMap;
            update();
            onChange?.(getFormValue(currentFormValueStateMap), names);
            validate(names, true);
        };

        const externalBulkAlterValuesHandler = (inputNames: string[], isReset = false) => {
            const names = getFinalNames(inputNames);
            if (names.length === 0) return;
            let currentFormValueStateMap = formValueStateMapRef.current;
            names.forEach((name) => {
                currentFormValueStateMap = currentFormValueStateMap.set(name, {
                    data: isReset
                        ? children?.find?.((child) => child?.props?.name === name)?.props?.defaultValue
                        : undefined,
                    errorMessages: [],
                });
            });
            formValueStateMapRef.current = currentFormValueStateMap;
            update();
            onChange?.(getFormValue(currentFormValueStateMap), names);
            validate(names, true);
        };

        eventEmitterRef.current.addListener(EVENT_NAMES.PARTIAL_CHANGE, partialChangeHandler);
        eventEmitterRef.current.addListener(EVENT_NAMES.REGISTER_ITEM, registerHandler);
        eventEmitterRef.current.addListener(EVENT_NAMES.UNREGISTER_ITEM, unregisterHandler);
        eventEmitterRef.current.addListener(EVENT_NAMES.EXTERNAL_SET_VALUES, externalSetValuesHandler);
        eventEmitterRef.current.addListener(EVENT_NAMES.EXTERNAL_BULK_ALTER_VALUES, externalBulkAlterValuesHandler);

        return () => {
            eventEmitterRef.current.removeListener(EVENT_NAMES.PARTIAL_CHANGE, partialChangeHandler);
            eventEmitterRef.current.removeListener(EVENT_NAMES.REGISTER_ITEM, registerHandler);
            eventEmitterRef.current.removeListener(EVENT_NAMES.UNREGISTER_ITEM, unregisterHandler);
            eventEmitterRef.current.removeListener(EVENT_NAMES.EXTERNAL_SET_VALUES, externalSetValuesHandler);
            eventEmitterRef.current.removeListener(
                EVENT_NAMES.EXTERNAL_BULK_ALTER_VALUES,
                externalBulkAlterValuesHandler,
            );
        };
    }, [eventEmitterRef.current, formValueStateMapRef.current, children]);

    return (
        <EventContext.Provider value={eventEmitterRef.current}>
            <ValueStateMapContext.Provider value={formValueStateMapRef.current}>
                <RegisteredFieldNamesContext.Provider value={registratedFieldNamesRef.current}>
                    <div ref={ref} className={cx(classNames?.wrapper)}>
                        {children}
                    </div>
                </RegisteredFieldNamesContext.Provider>
            </ValueStateMapContext.Provider>
        </EventContext.Provider>
    );
});

export const FormItem: React.FC<FormItemProps> = (inputProps) => {
    const {
        name,
        children,
        label,
        disabled,
        readOnly,
        serializer,
        defaultValue,
        labelProps,
        errorWrapperProps,
        errorMessageProps,
        sx,
        extra,
        registerCondition,
        hideCondition,
        ...props
    } = useFormItemComponentConfig(inputProps);
    const update = useUpdate();
    const classNames = useFormItemClassNames(sx);
    const eventEmitter = useContext(EventContext);
    const formValueStateMap = useContext(ValueStateMapContext);
    const hiddenRef = useRef(true);
    const formItemContextRef = useRef<ItemContext>(undefined);
    const registratedFieldNames = useContext(RegisteredFieldNamesContext);

    const getCurrentValueState = () => formValueStateMap?.get?.(name);

    const getContext = (): ItemContext => {
        const currentValueState = getCurrentValueState();
        return {
            formValueStateMap,
            defaultValue,
            value: currentValueState?.data,
            errorMessages: currentValueState?.errorMessages,
        };
    };

    useEffect(() => {
        formItemContextRef.current = getContext();
        update();
    }, [formValueStateMap, defaultValue]);

    useEffect(() => {
        if (typeof registerCondition !== 'function' ? true : registerCondition?.(formItemContextRef.current)) {
            eventEmitter?.emit?.(EVENT_NAMES.REGISTER_ITEM, name);
        } else {
            eventEmitter?.emit?.(EVENT_NAMES.UNREGISTER_ITEM, name);
        }
    }, [name, formItemContextRef.current, eventEmitter, registerCondition]);

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

    const parsedValue = (() => {
        const value = formValueStateMap?.get?.(name)?.data;

        if (typeof serializer?.incoming === 'function') {
            return serializer.incoming(value);
        }

        return value;
    })();

    if (!registratedFieldNames?.includes?.(name)) return null;

    return (
        <div
            {..._.omit(props, ['required', 'validators', 'dangerColor', 'minWidth', 'maxWidth'])}
            className={cx(classNames?.wrapper, props?.className)}
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
            <div className={cx(classNames?.headerWrapper)}>
                {label && (
                    <div {...labelProps} className={cx(classNames?.headerLabel, labelProps?.className)}>
                        {label}
                    </div>
                )}
                <div
                    className={cx(classNames?.headerControls)}
                    style={{
                        flex: 'unset',
                        flexGrow: 0,
                        flexShrink: 0,
                    }}
                ></div>
            </div>
            <div className={cx(classNames?.elementWrapper)}>
                {normalizedChildren.slice(0, 1).map((element, elementIndex) =>
                    cloneElement(element, {
                        key: elementIndex,
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
                        value: parsedValue,
                        onChange: (value: any, ...others: any[]) => {
                            eventEmitter?.emit?.(EVENT_NAMES.PARTIAL_CHANGE, {
                                [name]: (() => {
                                    let result: any;
                                    if (typeof serializer?.outgoing === 'function') {
                                        result = serializer.outgoing(value);
                                    } else if (
                                        (value as any)?._reactName === 'onChange' ||
                                        (value as BaseSyntheticEvent)?.target
                                    ) {
                                        result = (value as BaseSyntheticEvent)?.target?.value;
                                    } else {
                                        result = value;
                                    }
                                    return result;
                                })(),
                            });
                            element?.props?.onChange?.(value, ...others);
                        },
                    }),
                )}
            </div>
            {(() => {
                const currentValueState = getCurrentValueState();
                if (
                    Array.isArray(currentValueState?.errorMessages) &&
                    currentValueState?.errorMessages?.length > 0 &&
                    errorWrapperProps !== false
                ) {
                    return (
                        <div
                            {...errorWrapperProps}
                            className={cx(classNames?.errorWrapper, errorWrapperProps?.className)}
                        >
                            {currentValueState.errorMessages.map((errorMessage, index) => (
                                <div
                                    key={index}
                                    {...errorMessageProps}
                                    className={cx(classNames?.errorMessage, errorMessageProps?.className)}
                                >
                                    <PiXCircleFill className={classNames?.errorMessageIcon} />
                                    <div className={classNames?.errorMessageContent}>{errorMessage}</div>
                                </div>
                            ))}
                        </div>
                    );
                }
                return null;
            })()}
            {extra}
        </div>
    );
};
