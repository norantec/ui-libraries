import { useUpdate } from 'ahooks';
import { JSX, useCallback, useContext, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import * as React from 'react';
import { EventEmitter } from 'eventemitter3';
import { ComponentProviderUtil } from '../../utilities/component-provider-util.class';
import { CSSObject } from '@emotion/react';
import * as _ from 'lodash';
import { cx } from '@emotion/css';
import { Set } from 'immutable';
import { StringUtil } from '@open-norantec/utilities/dist/string-util.class';
import { PiXCircleFill } from 'react-icons/pi';
import { UUIDUtil } from '@open-norantec/utilities/dist/uuid-util.class';

export interface FormValues {
  [name: string]: any;
}

export interface FormValidateResult {
  errors?: Record<string, string[]> | null;
  value?: FormValues;
}

export interface FormInstance {
  clearValues: (names?: string[], clearValidationErrors?: boolean) => void;
  getValue: (name: string) => any;
  getValues: () => FormValues;
  resetValues: (names?: string[], clearValidationErrors?: boolean) => void;
  setValue: (name: string, value: any) => void;
  setValues: (values: FormValues) => void;
  validate: (names?: string[]) => Promise<FormValidateResult>;
}

interface FormItemBaseProps {
  dangerColor?: string;
  dense?: number;
  emptyValues?: any[];
  labelProps?: React.HTMLAttributes<HTMLDivElement>;
  maxWidth?: number | string;
  minWidth?: number | string;
}

export interface FormItemContext {
  defaultValue: any;
  value: any;
  values: FormValues;
}

export type Validator = {
  validateOnChange?: boolean;
  validateOnValidation?: boolean;
  validate: (value: any, formValue: FormValues) => Promise<string> | string;
};

export interface FormProps
  extends
    FormItemBaseProps,
    Omit<React.HTMLAttributes<HTMLFormElement>, 'value' | 'onChange' | 'children' | 'defaultValue'> {
  action?: string;
  method?: 'get' | 'post';
  children?: JSX.Element | JSX.Element[];
  disabled?: boolean;
  readOnly?: boolean;
  sx?: {
    wrapper?: CSSObject;
  };
  onInstanceChange?: (instance: any) => void;
}

type Component<T = any> = [React.FC<T>, T];

export interface FormItemProps<T = any>
  extends
    FormItemBaseProps,
    Omit<React.HTMLAttributes<HTMLDivElement>, 'value' | 'onChange' | 'children' | 'defaultValue'> {
  name: string;
  children?: Component<T>;
  defaultValue?: any;
  disabled?: boolean;
  errorMessageProps?: React.HTMLAttributes<HTMLDivElement>;
  errorWrapperProps?: React.HTMLAttributes<HTMLDivElement> | false;
  extra?: React.ReactNode | ((context: FormItemContext) => React.ReactNode);
  label?: React.ReactNode | ((context: FormItemContext) => React.ReactNode);
  readOnly?: boolean;
  required?: boolean | string | ((value: any, formValue: FormValues) => string);
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
  hideCondition?: (context: FormItemContext) => boolean;
  onChange?: (
    oldValue: any,
    newValue: any,
    source: 'clear' | 'item' | 'register' | 'reset' | 'set',
    oldFormValues: FormValues,
  ) => void;
  registerCondition?: (context: FormItemContext) => boolean;
}

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
    dangerColor: '#FF0000',
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
          lineHeight: 1.2,
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

const EmitterContext = React.createContext<EventEmitter>(null);
const FormValuesContext = React.createContext<FormValues>({});
const RegisteredFieldsContext = React.createContext<Set<string>>(Set());

const FORM_EVENT_NAMES = {
  REGISTRATION_STATUSES_CHANGE: Symbol(''),
  REQUEST_CLEAR_ITEMS_VALUE: Symbol(''),
  REQUEST_RESET_ITEMS_VALUE: Symbol(''),
  REQUEST_SET_ITEMS_VALUE: Symbol(''),
  REQUEST_VALIDATION_ERRORS: Symbol(''),
};

const FORM_ITEM_EVENT_NAMES = {
  CACHE_UPDATE: Symbol(''),
  VALUE_CHANGE: Symbol(''),
  REGISTRATION_STATUS_CHANGE: Symbol(''),
  REPLY_VALIDATION_ERRORS: Symbol(''),
};

const Form: React.ForwardRefExoticComponent<FormProps & React.RefAttributes<HTMLFormElement>> = React.forwardRef<
  HTMLFormElement,
  FormProps
>(function (inputProps, outerRef) {
  const { sx, children, action, method, onInstanceChange, ...props } = useFormComponentConfig(inputProps);
  const update = useUpdate();
  const classNames = useFormClassNames(sx);
  const innerRef = useRef<HTMLFormElement>(null);
  const emitter = useRef(new EventEmitter());
  const formValuesRef = useRef<FormValues>({});
  const registeredFieldsRef = useRef<Set<string>>(Set());
  const createFormInstance = useCallback(() => {
    return {
      getValue: (name: string) => {
        if (StringUtil.isFalsyString(name) || !registeredFieldsRef.current?.has?.(name)) return;
        return formValuesRef.current[name];
      },
      getValues: () => {
        return Object.entries(formValuesRef.current)
          .filter(([name]) => registeredFieldsRef.current?.has?.(name))
          .reduce((result, [name, value]) => {
            result[name] = value;
            return result;
          }, {} as FormValues);
      },
      setValue: (name, value) => {
        setTimeout(() => {
          emitter.current?.emit?.(FORM_EVENT_NAMES.REQUEST_SET_ITEMS_VALUE, { [name]: value });
        }, 0);
      },
      setValues: (values) => {
        setTimeout(() => {
          emitter.current?.emit?.(FORM_EVENT_NAMES.REQUEST_SET_ITEMS_VALUE, values);
        }, 0);
      },
      clearValues: (names?: string[], clearValidationErrors = true) => {
        setTimeout(() => {
          emitter.current?.emit?.(FORM_EVENT_NAMES.REQUEST_CLEAR_ITEMS_VALUE, names, clearValidationErrors);
        }, 0);
      },
      resetValues: (names?: string[], clearValidationErrors = true) => {
        setTimeout(() => {
          emitter.current?.emit?.(FORM_EVENT_NAMES.REQUEST_RESET_ITEMS_VALUE, names, clearValidationErrors);
        }, 0);
      },
      validate: async (names?: string[]) => {
        const finalNames =
          Array.isArray(names) && names.length > 0
            ? names.filter((name) => registeredFieldsRef.current?.has?.(name))
            : Array.from(registeredFieldsRef.current);
        return await new Promise<FormValidateResult>((resolve) => {
          const requestId = UUIDUtil.generateV4();
          const finalValues = finalNames.reduce((result, name) => {
            result[name] = formValuesRef.current?.[name];
            return result;
          }, {} as FormValues);
          const errorsMap: FormValidateResult['errors'] = {};
          const handleResponse = (responseId: string, name: string, errors: string[]) => {
            if (responseId !== requestId) return;

            errorsMap[name] = errors;

            if (finalNames.every((finalName) => Object.prototype.hasOwnProperty.call(errorsMap, finalName))) {
              emitter.current?.removeListener?.(FORM_ITEM_EVENT_NAMES.REPLY_VALIDATION_ERRORS, handleResponse);

              const finalErrors = Object.entries(errorsMap).reduce(
                (result, [name, errors]) => {
                  if (Array.isArray(errors) && errors.length > 0) {
                    result[name] = errors;
                  }
                  return result;
                },
                {} as FormValidateResult['errors'],
              );

              if (Object.keys(finalErrors).length === 0) {
                resolve({
                  errors: null,
                  value: finalValues,
                });
              } else {
                resolve({
                  value: null,
                  errors: finalErrors,
                });
              }
            }
          };

          emitter.current?.addListener?.(FORM_ITEM_EVENT_NAMES.REPLY_VALIDATION_ERRORS, handleResponse);
          emitter.current?.emit?.(FORM_EVENT_NAMES.REQUEST_VALIDATION_ERRORS, requestId, finalNames);
        });
      },
    } as FormInstance;
  }, [formValuesRef.current, registeredFieldsRef.current, emitter.current]);

  useImperativeHandle(outerRef, () => innerRef.current);

  useEffect(() => {
    if (!(emitter.current instanceof EventEmitter)) return;

    const handleValueChange = (name: string, value: any) => {
      if (StringUtil.isFalsyString(name)) return;
      formValuesRef.current = {
        ...formValuesRef.current,
        [name]: value,
      };
      update();
    };

    emitter.current.addListener(FORM_ITEM_EVENT_NAMES.VALUE_CHANGE, handleValueChange);
  }, [emitter.current, formValuesRef.current]);

  useEffect(() => {
    if (!(emitter.current instanceof EventEmitter)) return;

    const handleRegistrationStatusChange = (name: string, registered: boolean) => {
      if (typeof registered !== 'boolean' || StringUtil.isFalsyString(name)) return;
      registeredFieldsRef.current = registered
        ? registeredFieldsRef.current.add(name)
        : registeredFieldsRef.current.delete(name);
      update();
    };

    emitter.current.addListener(FORM_ITEM_EVENT_NAMES.REGISTRATION_STATUS_CHANGE, handleRegistrationStatusChange);
  }, [emitter.current, registeredFieldsRef.current]);

  useEffect(() => {
    if (!(emitter.current instanceof EventEmitter)) return;
    emitter.current.emit(FORM_EVENT_NAMES.REGISTRATION_STATUSES_CHANGE, registeredFieldsRef.current);
    onInstanceChange?.(createFormInstance());
  }, [emitter.current, formValuesRef.current, registeredFieldsRef.current, onInstanceChange]);

  return (
    <form
      {..._.omit(props, ['dangerColor'])}
      action={action}
      method={method}
      ref={innerRef}
      className={cx(classNames?.wrapper, props?.className)}
    >
      <EmitterContext.Provider value={emitter.current}>
        <FormValuesContext.Provider value={formValuesRef.current}>
          <RegisteredFieldsContext.Provider value={registeredFieldsRef.current}>
            {children}
          </RegisteredFieldsContext.Provider>
        </FormValuesContext.Provider>
      </EmitterContext.Provider>
    </form>
  );
});

const FormItem = function <T>(inputProps: FormItemProps<T>) {
  const {
    name,
    children,
    label,
    defaultValue,
    labelProps,
    errorWrapperProps,
    errorMessageProps,
    sx,
    extra,
    validators: inputValidators,
    required,
    emptyValues: inputEmptyValues = ['', null, undefined],
    registerCondition,
    hideCondition,
    onChange,
    ...props
  } = useFormItemComponentConfig(inputProps);
  const innerEmitterRef = useRef(new EventEmitter());
  const changeEventNameRef = useRef(Symbol());
  const update = useUpdate();
  const classNames = useFormItemClassNames(sx);
  const valueRef = useRef<any>(defaultValue);
  const registeredRef = useRef(false);
  const hiddenRef = useRef(false);
  const rawFormValues = useContext(FormValuesContext);
  const registeredFields = useContext(RegisteredFieldsContext);
  const emitter = useContext(EmitterContext);
  const errorsRef = useRef<string[]>([]);
  const shouldValidateRef = useRef(false);
  const [emptyValues, setEmptyValues] = useState<any[]>(['', null, undefined]);
  const formValuesRef = useRef<FormValues>({});
  const isEmptyValue = useCallback(
    (value: any) => {
      const result = (Array.isArray(emptyValues) ? emptyValues : ['', null, undefined]).includes(value);
      return result;
    },
    [emptyValues],
  );
  const getValidatorResult = useCallback(
    async (reason: 'change' | 'validation', value: any) => {
      if (!shouldValidateRef.current && reason !== 'validation') return [];

      let normalizedValidators = Array.isArray(inputValidators)
        ? inputValidators.filter((validator) => typeof validator?.validate === 'function')
        : [];

      if (!required && isEmptyValue(valueRef.current)) {
        normalizedValidators = [];
      }

      if (required === true || !StringUtil.isFalsyString(required) || typeof required === 'function') {
        normalizedValidators.unshift({
          validateOnChange: true,
          validateOnValidation: true,
          validate: (value, formValues) => {
            if (typeof required === 'function') {
              return required(value, formValues);
            } else if (typeof value === 'undefined' || (typeof value === 'string' && value.length === 0)) {
              return !StringUtil.isFalsyString(required) ? (required as string) : 'It is a required field';
            }
          },
        } as Validator);
      }

      return await Promise.all(
        normalizedValidators
          .filter((validator) => {
            switch (reason) {
              case 'change':
                return validator?.validateOnChange !== false;
              case 'validation':
                return validator?.validateOnValidation !== false;
            }
          })
          .map((item) => {
            return item?.validate?.(value, formValuesRef.current);
          }),
      ).then((result) => result?.filter?.((message) => !StringUtil.isFalsyString(message)));
    },
    [inputValidators, required, isEmptyValue],
  );
  const childElement = useMemo(() => {
    if (Array.isArray(children)) {
      return React.createElement(children[0], {
        ...children[1],
        value: valueRef.current,
        onChange: (...params: any[]) => {
          innerEmitterRef.current?.emit?.(changeEventNameRef.current, params);
        },
      });
    }
    return null;
  }, [children?.[0], children?.[1], valueRef.current]);

  useEffect(() => {
    if (!(innerEmitterRef.current instanceof EventEmitter)) return;

    const handleChange = (args: any[]) => {
      const oldValue = valueRef.current;
      const outgoingValue = (() => {
        let result: any;
        if ((args?.[0] as any)?._reactName === 'onChange' || (args?.[0] as React.BaseSyntheticEvent)?.target) {
          result = (args?.[0] as React.BaseSyntheticEvent)?.target?.value;
        } else {
          result = args?.[0];
        }
        return result;
      })();
      valueRef.current = outgoingValue;
      shouldValidateRef.current = true;
      getValidatorResult('change', outgoingValue).then((result) => {
        errorsRef.current = result;
        update();
      });
      update();
      onChange?.(oldValue, outgoingValue, 'item', formValuesRef.current);
      children?.[1]?.onChange?.(...args);
    };

    innerEmitterRef.current.addListener(changeEventNameRef.current, handleChange);

    return () => {
      innerEmitterRef.current.removeAllListeners(changeEventNameRef.current);
    };
  }, [
    children?.[0],
    children?.[1],
    valueRef.current,
    inputValidators,
    required,
    name,
    isEmptyValue,
    onChange,
    getValidatorResult,
  ]);

  useEffect(() => {
    formValuesRef.current = Object.entries(rawFormValues).reduce((result, [name, value]) => {
      if (registeredFields?.has?.(name)) result[name] = value;
      return result;
    }, {} as FormValues);
    update();
  }, [rawFormValues, registeredFields]);

  useEffect(() => {
    if (_.isEqual(inputEmptyValues, emptyValues)) return;
    setEmptyValues(inputEmptyValues);
  }, [inputEmptyValues, emptyValues]);

  useEffect(() => {
    if (StringUtil.isFalsyString(name)) return;
    if (typeof registerCondition === 'function') {
      emitter?.emit?.(
        FORM_ITEM_EVENT_NAMES.REGISTRATION_STATUS_CHANGE,
        name,
        registerCondition({
          defaultValue,
          value: valueRef.current,
          values: formValuesRef.current,
        })
          ? true
          : false,
      );
    } else {
      emitter?.emit?.(FORM_ITEM_EVENT_NAMES.REGISTRATION_STATUS_CHANGE, name, true);
    }
  }, [registerCondition, valueRef.current, defaultValue, emitter, name]);

  useEffect(() => {
    if (typeof hideCondition !== 'function') {
      hiddenRef.current = false;
    } else {
      hiddenRef.current = Boolean(
        hideCondition({
          defaultValue,
          values: formValuesRef.current,
          value: valueRef.current,
        }),
      );
    }
    update();
  }, [hideCondition, valueRef.current, defaultValue]);

  useEffect(() => {
    if (StringUtil.isFalsyString(name)) return;
    emitter?.emit?.(FORM_ITEM_EVENT_NAMES.VALUE_CHANGE, name, valueRef.current);
  }, [emitter, valueRef.current, name]);

  useEffect(() => {
    if (!(emitter instanceof EventEmitter)) return;

    const handleRegistrationStatusesChange = (registeredFields: Set<string>) => {
      const registered = registeredFields?.has?.(name);
      if (registeredRef.current === registered) return;
      registeredRef.current = registered;
      if (registered && isEmptyValue(valueRef.current) && !isEmptyValue(defaultValue)) {
        const oldValue = valueRef.current;
        valueRef.current = defaultValue;
        onChange?.(oldValue, defaultValue, 'register', formValuesRef.current);
      }
      update();
    };

    const handleRequestClearItemsValue = (names?: string[], clearValidationErrors?: boolean) => {
      const finalNames = Array.isArray(names) ? names.filter((name) => !StringUtil.isFalsyString(name)) : null;
      if (!Array.isArray(finalNames) || finalNames.includes(name)) {
        if (isEmptyValue(valueRef.current)) return;
        const oldValue = valueRef.current;
        valueRef.current = undefined;
        if (!clearValidationErrors) {
          getValidatorResult('change', undefined).then((result) => {
            errorsRef.current = result;
            update();
          });
        } else {
          errorsRef.current = [];
          update();
        }
        onChange?.(oldValue, undefined, 'clear', formValuesRef.current);
      }
    };

    const handleRequestResetItemsValue = (names?: string[], clearValidationErrors?: boolean) => {
      const finalNames = Array.isArray(names) ? names.filter((name) => !StringUtil.isFalsyString(name)) : null;
      if (!Array.isArray(finalNames) || finalNames.includes(name)) {
        if (valueRef.current === defaultValue) return;
        const oldValue = valueRef.current;
        valueRef.current = defaultValue;
        if (!clearValidationErrors) {
          getValidatorResult('change', defaultValue).then((result) => {
            errorsRef.current = result;
            update();
          });
        } else {
          errorsRef.current = [];
          update();
        }
        update();
        onChange?.(oldValue, defaultValue, 'reset', formValuesRef.current);
      }
    };

    const handleRequestSetItemsValue = (values?: FormValues) => {
      if (!Object.keys(values || {}).includes(name) || valueRef.current === values?.[name]) return;
      const oldValue = valueRef.current;
      let newValue = values?.[name];
      if (isEmptyValue(newValue)) newValue = defaultValue;
      valueRef.current = newValue;
      getValidatorResult('change', newValue).then((result) => {
        errorsRef.current = result;
        update();
      });
      onChange?.(oldValue, newValue, 'set', formValuesRef.current);
    };

    const handleRequestValidationErrors = (requestId: string, names: string[]) => {
      if (!names?.includes?.(name)) return;
      shouldValidateRef.current = true;
      update();
      getValidatorResult('validation', valueRef.current).then((result) => {
        errorsRef.current = result;
        update();
        emitter.emit(FORM_ITEM_EVENT_NAMES.REPLY_VALIDATION_ERRORS, requestId, name, result);
      });
    };

    emitter.addListener(FORM_EVENT_NAMES.REGISTRATION_STATUSES_CHANGE, handleRegistrationStatusesChange);
    emitter.addListener(FORM_EVENT_NAMES.REQUEST_CLEAR_ITEMS_VALUE, handleRequestClearItemsValue);
    emitter.addListener(FORM_EVENT_NAMES.REQUEST_RESET_ITEMS_VALUE, handleRequestResetItemsValue);
    emitter.addListener(FORM_EVENT_NAMES.REQUEST_SET_ITEMS_VALUE, handleRequestSetItemsValue);
    emitter.addListener(FORM_EVENT_NAMES.REQUEST_VALIDATION_ERRORS, handleRequestValidationErrors);

    return () => {
      emitter.removeListener(FORM_EVENT_NAMES.REGISTRATION_STATUSES_CHANGE, handleRegistrationStatusesChange);
      emitter.removeListener(FORM_EVENT_NAMES.REQUEST_CLEAR_ITEMS_VALUE, handleRequestClearItemsValue);
      emitter.removeListener(FORM_EVENT_NAMES.REQUEST_RESET_ITEMS_VALUE, handleRequestResetItemsValue);
      emitter.removeListener(FORM_EVENT_NAMES.REQUEST_SET_ITEMS_VALUE, handleRequestSetItemsValue);
      emitter.removeListener(FORM_EVENT_NAMES.REQUEST_VALIDATION_ERRORS, handleRequestValidationErrors);
    };
  }, [
    emitter,
    registeredRef.current,
    name,
    defaultValue,
    valueRef.current,
    inputValidators,
    required,
    shouldValidateRef.current,
    onChange,
    getValidatorResult,
  ]);

  if (!registeredRef.current) return <></>;

  return (
    <div
      data-form-item-name={name}
      {..._.omit(props, ['required', 'dangerColor', 'minWidth', 'maxWidth'])}
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
        {typeof label !== 'undefined' && (
          <div {...labelProps} className={cx(classNames?.headerLabel, labelProps?.className)}>
            {(() => {
              if (typeof label === 'function') {
                return label({
                  defaultValue,
                  value: valueRef.current,
                  values: formValuesRef.current,
                });
              }
              return label;
            })()}
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
      <div className={cx(classNames?.elementWrapper)}>{childElement}</div>
      {(() => {
        if (typeof extra === 'function') {
          return extra({
            defaultValue,
            value: valueRef.current,
            values: formValuesRef.current,
          });
        }
        return extra;
      })()}
      {(() => {
        if (Array.isArray(errorsRef.current) && errorsRef.current?.length > 0 && errorWrapperProps !== false) {
          return (
            <div {...errorWrapperProps} className={cx(classNames?.errorWrapper, errorWrapperProps?.className)}>
              {errorsRef.current?.map((errorMessage, index) => (
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
        return <></>;
      })()}
    </div>
  );
};

export { Form, FormItem };
