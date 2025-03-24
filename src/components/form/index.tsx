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
    useState,
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
import { CompareUtil } from '../../utilities/compare-util.class';

export type FormTemplateRegistry = (helpers: FormTemplateRegistryHelpers) => FormItemProps[];

const eventEmitter = new EventEmitter();
const EVENT_NAMES = {
    EXTERNAL_BULK_ALTER_VALUES: Symbol(''),
    EXTERNAL_SET_VALUES: Symbol(''),
    EXTERNAL_VALIDATE_REQUEST: Symbol(''),
    EXTERNAL_VALIDATE_RESPONSE: Symbol(''),
    PARTIAL_CHANGE: Symbol(''),
    REFRESH_ITEM_STATE: Symbol(''),
    REFRESH_ITEM_VALUE: Symbol(''),
    REFRESH_REGISTRATION_STATE: Symbol(''),
    REGISTER_ITEM: Symbol(''),
    UNREGISTER_ITEM: Symbol(''),
    USE_FORM_UPDATE: Symbol(''),
};

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
    children?: JSX.Element;
    defaultValue?: any;
    disabled?: boolean;
    errorMessageProps?: React.HTMLAttributes<HTMLDivElement>;
    errorWrapperProps?: React.HTMLAttributes<HTMLDivElement> | false;
    extra?: React.ReactNode;
    label?: React.ReactNode;
    readOnly?: boolean;
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

class FormInstance {
    public constructor(
        private readonly options: {
            formValue: Value;
            useFormId: string;
        },
    ) {
        Object.defineProperty(this, 'useFormId', {
            writable: false,
            value: options?.useFormId,
        });
    }

    public clearValues(inputNames?: string[]) {
        eventEmitter.emit(EVENT_NAMES.EXTERNAL_BULK_ALTER_VALUES, this.options?.useFormId, inputNames, false);
    }

    public resetValues(inputNames?: string[]) {
        eventEmitter.emit(EVENT_NAMES.EXTERNAL_BULK_ALTER_VALUES, this.options?.useFormId, inputNames, true);
    }

    public setValue(name: string, value: any) {
        if (StringUtil.isFalsyString(name)) return;
        eventEmitter.emit(EVENT_NAMES.EXTERNAL_SET_VALUES, this.options?.useFormId, { [name]: value });
    }

    public setValues(newValues: Value) {
        eventEmitter.emit(EVENT_NAMES.EXTERNAL_SET_VALUES, this.options?.useFormId, newValues);
    }

    public getValues() {
        return { ...this.options?.formValue };
    }

    public getValue(name: string) {
        if (StringUtil.isFalsyString(name)) return;
        return { ...this.options?.formValue }[name];
    }

    public async validate(inputNames?: string) {
        return new Promise<SubmitValue>((resolve) => {
            const requestId = UUIDUtil.generateV4();
            const handler = (currentRequestId: string, value: SubmitValue) => {
                if (requestId !== currentRequestId) return;
                eventEmitter.removeListener(EVENT_NAMES.EXTERNAL_VALIDATE_RESPONSE, handler);
                resolve(value);
            };
            eventEmitter.addListener(EVENT_NAMES.EXTERNAL_VALIDATE_RESPONSE, handler);
            eventEmitter.emit(EVENT_NAMES.EXTERNAL_VALIDATE_REQUEST, this.options?.useFormId, requestId, inputNames);
        });
    }
}

const getDefinedPropertyValue = (instance: FormInstance, key: string | symbol) => {
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

export const useForm = () => {
    const update = useUpdate();
    const formInstanceRef = useRef<FormInstance>(
        new FormInstance({
            useFormId: UUIDUtil.generateV4(),
            formValue: null,
        }),
    );

    useEffect(() => {
        const handler = (useFormId: string | null, formValue: Value) => {
            if (
                StringUtil.isFalsyString(useFormId) ||
                useFormId !== getDefinedPropertyValue(formInstanceRef.current, 'useFormId')
            ) {
                return;
            }

            formInstanceRef.current = new FormInstance({
                useFormId,
                formValue,
            });

            update();
        };

        eventEmitter.addListener(EVENT_NAMES.USE_FORM_UPDATE, handler);

        return () => {
            eventEmitter.removeListener(EVENT_NAMES.USE_FORM_UPDATE, handler);
        };
    }, [formInstanceRef.current]);

    return formInstanceRef.current;
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
    preInputMerger: (context) => ({
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
    }),
    preInputMerger: ({ finalProps }) => {
        return {
            sx: {
                wrapper: {
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    flexWrap: 'nowrap',
                    marginBottom: finalProps?.dense * 2,
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
                    marginBottom: finalProps?.dense / 2,
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
        form: formInstance,
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

    const getFinalNames = useCallback(
        (inputNames?: string[], includeUnregisteredFieldNames = false): string[] => {
            const names = Array.isArray(inputNames)
                ? inputNames.filter((inputName) => formValueStateMapRef.current.has(inputName))
                : Array.from(formValueStateMapRef.current.keys());
            return !includeUnregisteredFieldNames
                ? names.filter((name) => registratedFieldNamesRef.current.has(name))
                : names;
        },
        [formValueStateMapRef.current, registratedFieldNamesRef.current],
    );

    const validate = useCallback(
        async (inputNames?: string[], isChangeMode = false) => {
            const names = getFinalNames(inputNames);

            if (names.length === 0) return null;

            const formValue = getFormValue(formValueStateMapRef.current);
            const result: SubmitValue = {
                value: Object.entries(formValue).reduce((result, [name, value]) => {
                    if (!names.includes(name)) return result;
                    result[name] = value;
                    return result;
                }, {} as Value),
                errors: await Promise.all(
                    children
                        .filter((child) => names.includes(child?.props?.name))
                        .map((child) => {
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
                                        if (
                                            typeof value === 'undefined' ||
                                            (typeof value === 'string' && value.length === 0)
                                        ) {
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
            names.forEach((name) => {
                if (!currentValueStateMap.has(name)) return;
                currentValueStateMap = currentValueStateMap.set(name, {
                    ...currentValueStateMap.get(name),
                    errorMessages: result.errors?.[name],
                });
            });
            formValueStateMapRef.current = currentValueStateMap;

            update();

            return result;
        },
        [children, formValueStateMapRef.current, registratedFieldNamesRef.current, getFinalNames],
    );

    const handleAlterValues = useCallback(
        (inputNames: string[], isReset = false, includeUnregisteredFieldNames = false) => {
            const names = getFinalNames(inputNames, includeUnregisteredFieldNames);
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
            const newFormValue = getFormValue(currentFormValueStateMap);
            onChange?.(newFormValue, names);
            validate(names, true);
            eventEmitterRef.current.emit(EVENT_NAMES.REFRESH_ITEM_VALUE, _.pick(newFormValue, names));
        },
        [formValueStateMapRef.current, validate, getFinalNames],
    );

    usePreviousValueEffect(
        () => {
            eventEmitter.emit(
                EVENT_NAMES.USE_FORM_UPDATE,
                getDefinedPropertyValue(formInstance, 'useFormId'),
                getFormValue(formValueStateMapRef.current),
            );
        },
        [formInstance, formValueStateMapRef.current],
        (previousValue: [string, Value]) => {
            if (
                !(formInstance instanceof FormInstance) ||
                (getDefinedPropertyValue(formInstance, 'useFormId') === previousValue?.[0] &&
                    CompareUtil.compare(getFormValue(formValueStateMapRef.current), previousValue?.[1]))
            ) {
                return undefined;
            }
            return [getDefinedPropertyValue(formInstance, 'useFormId'), getFormValue(formValueStateMapRef.current)] as [
                string,
                Value,
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
        const handleRegisterItem = (name: string) => {
            if (registratedFieldNamesRef.current.has(name)) return;
            registratedFieldNamesRef.current = registratedFieldNamesRef.current.add(name);
            update();
            eventEmitterRef.current.emit(EVENT_NAMES.REFRESH_ITEM_VALUE, {
                [name]: formValueStateMapRef.current?.get?.(name)?.data,
            });
        };

        const handleUnregisterItem = (name: string) => {
            if (!registratedFieldNamesRef.current.has(name)) return;
            registratedFieldNamesRef.current = registratedFieldNamesRef.current.delete(name);
            handleAlterValues([name], true);
            update();
        };

        const handlePartialChange = (updatePart: Value) => {
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

        eventEmitterRef.current.addListener(EVENT_NAMES.REGISTER_ITEM, handleRegisterItem);
        eventEmitterRef.current.addListener(EVENT_NAMES.UNREGISTER_ITEM, handleUnregisterItem);
        eventEmitterRef.current.addListener(EVENT_NAMES.PARTIAL_CHANGE, handlePartialChange);

        return () => {
            eventEmitterRef.current.removeListener(EVENT_NAMES.REGISTER_ITEM, handleRegisterItem);
            eventEmitterRef.current.removeListener(EVENT_NAMES.UNREGISTER_ITEM, handleUnregisterItem);
            eventEmitterRef.current.removeListener(EVENT_NAMES.PARTIAL_CHANGE, handlePartialChange);
        };
    }, [formValueStateMapRef.current, handleAlterValues, validate]);

    useEffect(() => {
        const useFormId = getDefinedPropertyValue(formInstance, 'useFormId');

        const handleExternalSetValues = (currentUseFormId: string, newValues: Value) => {
            if (!_.isObjectLike(newValues) || currentUseFormId !== useFormId) return;
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
            const newFormValue = getFormValue(currentFormValueStateMap);
            onChange?.(newFormValue, names);
            validate(names, true);
            eventEmitterRef.current.emit(EVENT_NAMES.REFRESH_ITEM_VALUE, _.pick(newFormValue, names));
        };

        const handleExternalBulkAlterValues = (currentUseFormId: string, inputNames: string[], isReset = false) => {
            if (currentUseFormId !== useFormId) return;
            handleAlterValues(inputNames, isReset);
        };

        const handleExternalValidateRequest = (currentUseFormId: string, requestId: string, inputNames: string[]) => {
            if (currentUseFormId !== useFormId) return;
            validate(inputNames, false).then((result) => {
                eventEmitter.emit(EVENT_NAMES.EXTERNAL_VALIDATE_RESPONSE, requestId, result);
            });
        };

        eventEmitter.addListener(EVENT_NAMES.EXTERNAL_SET_VALUES, handleExternalSetValues);
        eventEmitter.addListener(EVENT_NAMES.EXTERNAL_BULK_ALTER_VALUES, handleExternalBulkAlterValues);
        eventEmitter.addListener(EVENT_NAMES.EXTERNAL_VALIDATE_REQUEST, handleExternalValidateRequest);

        return () => {
            eventEmitter.removeListener(EVENT_NAMES.EXTERNAL_SET_VALUES, handleExternalSetValues);
            eventEmitter.removeListener(EVENT_NAMES.EXTERNAL_BULK_ALTER_VALUES, handleExternalBulkAlterValues);
            eventEmitter.removeListener(EVENT_NAMES.EXTERNAL_VALIDATE_REQUEST, handleExternalValidateRequest);
        };
    }, [formInstance, formValueStateMapRef.current, children, validate]);

    useEffect(() => {
        if (!Array.isArray(children)) return;
        eventEmitterRef.current.emit(EVENT_NAMES.REFRESH_ITEM_STATE, formValueStateMapRef.current);
        update();
    }, [formValueStateMapRef.current]);

    useEffect(() => {
        eventEmitterRef.current.emit(
            EVENT_NAMES.REFRESH_REGISTRATION_STATE,
            registratedFieldNamesRef.current?.toArray?.(),
        );
    }, [registratedFieldNamesRef.current]);

    return (
        <EventContext.Provider value={eventEmitterRef.current}>
            <div ref={ref} className={cx(classNames?.wrapper)}>
                {children}
            </div>
        </EventContext.Provider>
    );
});

export const FormItem: React.FC<FormItemProps> = (inputProps) => {
    const {
        name,
        children,
        label,
        defaultValue,
        serializer,
        labelProps,
        errorWrapperProps,
        errorMessageProps,
        sx,
        extra,
        registerCondition,
        hideCondition,
        ...props
    } = useFormItemComponentConfig(inputProps);
    const classNames = useFormItemClassNames(sx);
    const contextEventEmitter = useContext(EventContext);
    const [innerValue, setInnerValue] = useState(undefined);
    const errorMessagesRef = useRef<string[]>([]);
    const hiddenRef = useRef(true);
    const registeredRef = useRef(false);
    const update = useUpdate();

    const generateIncomingValue = (value: any) => {
        if (typeof serializer?.incoming === 'function') return serializer.incoming(value);
        return value;
    };

    useEffect(() => {
        if (!(contextEventEmitter instanceof EventEmitter) || StringUtil.isFalsyString(name)) return;

        const handleRefreshItemState = (formValueStateMap: ImmutableMap<string, ValueState>) => {
            const newValue = formValueStateMap?.get?.(name)?.data;
            const newErrorMessages = formValueStateMap?.get?.(name)?.errorMessages;
            const context: ItemContext = {
                formValueStateMap,
                value: newValue,
                errorMessages: newErrorMessages,
                defaultValue,
            };
            const newHiddenState = typeof hideCondition === 'function' ? hideCondition(context) : false;
            const shouldRegister = typeof registerCondition === 'function' ? registerCondition(context) : true;

            if (newHiddenState !== hiddenRef.current) {
                hiddenRef.current = newHiddenState;
                update();
            }

            contextEventEmitter.emit(shouldRegister ? EVENT_NAMES.REGISTER_ITEM : EVENT_NAMES.UNREGISTER_ITEM, name);

            if (!_.isEqual(errorMessagesRef.current, newErrorMessages)) {
                errorMessagesRef.current = newErrorMessages;
                update();
            }
        };

        contextEventEmitter.addListener(EVENT_NAMES.REFRESH_ITEM_STATE, handleRefreshItemState);

        return () => {
            contextEventEmitter.removeListener(EVENT_NAMES.REFRESH_ITEM_STATE, handleRefreshItemState);
        };
    }, [
        contextEventEmitter,
        name,
        hiddenRef.current,
        defaultValue,
        errorMessagesRef.current,
        hideCondition,
        registerCondition,
    ]);

    useEffect(() => {
        if (!(contextEventEmitter instanceof EventEmitter) || StringUtil.isFalsyString(name)) return;

        const handleRefreshItemValue = (value: Value) => {
            if (!_.isObjectLike(value)) return;
            if (Object.keys(value).includes(name)) {
                setInnerValue(value?.[name]);
            }
        };

        contextEventEmitter.addListener(EVENT_NAMES.REFRESH_ITEM_VALUE, handleRefreshItemValue);

        return () => {
            contextEventEmitter.removeListener(EVENT_NAMES.REFRESH_ITEM_VALUE, handleRefreshItemValue);
        };
    }, [name, contextEventEmitter]);

    useEffect(() => {
        if (!(contextEventEmitter instanceof EventEmitter) || StringUtil.isFalsyString(name)) return;

        const handleRefreshRegistrationState = (registratedFieldNames: string[]) => {
            const currentRestrated = registratedFieldNames?.includes?.(name);
            if (registeredRef.current !== currentRestrated) {
                registeredRef.current = currentRestrated;
                update();
            }
        };

        contextEventEmitter.addListener(EVENT_NAMES.REFRESH_REGISTRATION_STATE, handleRefreshRegistrationState);

        return () => {
            contextEventEmitter.removeListener(EVENT_NAMES.REFRESH_REGISTRATION_STATE, handleRefreshRegistrationState);
        };
    }, [contextEventEmitter, name, registeredRef.current]);

    if (!registeredRef.current) return null;

    return (
        <div
            {..._.omit(props, [
                'required',
                'validators',
                'dangerColor',
                'minWidth',
                'maxWidth',
                'defaultValue',
                'registerCondition',
                'hideCondition',
            ])}
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
                {children &&
                    cloneElement(children, {
                        value: generateIncomingValue(innerValue),
                        onChange: (value: any, ...others: any[]) => {
                            const outgoingValue = (() => {
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
                            })();
                            contextEventEmitter?.emit?.(EVENT_NAMES.PARTIAL_CHANGE, {
                                [name]: outgoingValue,
                            });
                            setInnerValue(generateIncomingValue(outgoingValue));
                            children?.props?.onChange?.(value, ...others);
                        },
                    })}
            </div>
            {(() => {
                if (
                    Array.isArray(errorMessagesRef.current) &&
                    errorMessagesRef.current?.length > 0 &&
                    errorWrapperProps !== false
                ) {
                    return (
                        <div
                            {...errorWrapperProps}
                            className={cx(classNames?.errorWrapper, errorWrapperProps?.className)}
                        >
                            {errorMessagesRef.current.map((errorMessage, index) => (
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
