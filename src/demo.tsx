import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
// import { Form, FormItemProvider, FormProvider, useForm, Validator } from './components/form/ng';
import { Form, FormInstance, FormItem, FormItemProvider, FormProvider, Validator } from './components/form';
import { ProviderFactory } from './components/provider-factory';
import { useEffect, useState } from 'react';
import { StringUtil } from '@open-norantec/utilities/dist/string-util.class';
import { Scrollable, ScrollableProvider } from './components/scrollable';
import { css } from '@emotion/css';
import { AutoHide, AutoHideProvider } from './components/auto-hide';

interface InputProps extends Omit<React.HTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value?: string;
  placeholder?: string;
  onChange?: (value: string, event: React.ChangeEvent<HTMLInputElement>) => void;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ value, onChange, ...props }, ref) => {
  const innerRef = React.useRef<HTMLInputElement>(undefined);

  React.useImperativeHandle(ref, () => innerRef.current);

  useEffect(() => {
    if (!(innerRef.current instanceof HTMLInputElement)) return;
    innerRef.current.value = StringUtil.isFalsyString(value) ? '' : value;
  }, [value, innerRef.current]);

  return (
    <input
      {...props}
      ref={innerRef}
      onChange={(event) => {
        onChange?.(StringUtil.isFalsyString(event?.target?.value) ? undefined : event.target.value, event);
      }}
    />
  );
});

const App: React.FC = () => {
  // const form = useForm();
  const [form, setForm] = useState<FormInstance>();
  const [validators, setValidators] = useState<Validator[]>([]);

  useEffect(() => {
    console.log('LENCONDA:4', form?.getValues?.());
  }, [form]);

  return (
    <div>
      <Form
        // form={form}
        // onChange={(values, changedFields) => {
        //     console.log('LENCONDA:4.1', values, changedFields);
        // }}
        onInstanceChange={setForm}
      >
        <FormItem
          label="Test1"
          name="test1"
          required="必填项"
          validators={[
            {
              validate: (value) => (StringUtil.isFalsyString(value) ? '请输入合法字符串' : undefined),
            },
            ...validators,
          ]}
        >
          {[Input, { placeholder: 'Input something...' }]}
        </FormItem>
        <FormItem
          label="Test2"
          name="test2"
          defaultValue="DEFAULT"
          registerCondition={(context) => {
            const result = !StringUtil.isFalsyString(context?.values?.test1);
            return result;
          }}
          onChange={(o, n, source) => {
            if (source === 'item') {
              console.log('LENCONDA:FUCK');
              form.resetValues(['test3']);
            }
          }}
        >
          {[Input, { placeholder: 'Input something...' }]}
        </FormItem>
        <FormItem
          label="Test3"
          name="test3"
          defaultValue="DEFAULT3"
          registerCondition={(context) => {
            const result = !StringUtil.isFalsyString(context?.values?.test1);
            return result;
          }}
          onChange={() => {
            form.clearValues(['test4']);
          }}
        >
          {[Input, { placeholder: 'Input something...' }]}
        </FormItem>
        <FormItem
          label="Test4"
          name="test4"
          registerCondition={(context) => {
            const result = !StringUtil.isFalsyString(context?.values?.test1);
            return result;
          }}
        >
          {[Input, { placeholder: 'Input something...' }]}
        </FormItem>
      </Form>
      <button
        onClick={() => {
          form?.validate?.()?.then((values) => {
            console.log('LENCONDA:DEMO:values', values);
          });
        }}
      >
        Submit
      </button>
      <button
        onClick={() => {
          form?.setValues?.({
            test1: '123908',
            test2: '123909',
          });
        }}
      >
        Set Values
      </button>
      <button
        onClick={() => {
          form?.resetValues?.();
        }}
      >
        Reset Values
      </button>
      <button
        onClick={() => {
          form?.clearValues?.(['test1', 'test2']);
        }}
      >
        Clear Values
      </button>
      <button
        onClick={() => {
          setValidators([
            {
              validate: (value) => (!(value?.length > 10) ? '不少于10个字符' : ''),
            },
          ]);
        }}
      >
        Add validator
      </button>
      <Scrollable
        className={css({
          maxHeight: 400,
          maxWidth: 400,
          border: '1px solid black',
          whiteSpace: 'nowrap',
        })}
        trackerOffset={[48, 48, 12, 12]}
        onMouseMove={(event) => {
          event.stopPropagation();
        }}
      >
        <p>
          Lorem ipsum dolor sit amet consectetur adipisicing elit. Facilis vitae, blanditiis sapiente fugit, rerum
          exercitationem similique alias unde, ad asperiores placeat vero voluptatum facere dolorum dolore porro dolores
          voluptas mollitia.
        </p>
        <p>
          Lorem ipsum dolor sit amet consectetur, adipisicing elit. Nam earum eum amet quo. Natus animi adipisci quae
          optio harum esse, ex dolore maiores exercitationem repellat quasi, sequi repudiandae. Aliquid, officia!
        </p>
        <p>
          Lorem ipsum dolor sit amet consectetur adipisicing elit. Facilis, dignissimos magnam ipsam odio a assumenda
          explicabo quae eos magni fugiat? Ab ut, debitis molestiae alias dignissimos libero. Architecto, numquam non.
        </p>
        <p>
          Lorem ipsum dolor sit amet consectetur adipisicing elit. Neque, vel impedit aperiam nostrum aut, assumenda
          unde eaque cupiditate eveniet veritatis deleniti nesciunt vero recusandae laboriosam ratione reprehenderit,
          repellendus qui quidem?
        </p>
        <p>
          Lorem ipsum dolor sit amet consectetur adipisicing elit. Incidunt velit ratione enim, commodi porro dolore
          dignissimos ea dolorem exercitationem fuga nemo, reiciendis odio mollitia quisquam id culpa doloremque minus
          aliquam.
        </p>
        <p>
          Lorem ipsum dolor sit amet, consectetur adipisicing elit. Odio ullam perferendis nobis, voluptatem nesciunt
          est voluptas, voluptatibus praesentium laborum consectetur et similique facilis ut quam quod. Quasi distinctio
          ut nulla!
        </p>
        <p>
          Lorem ipsum dolor sit amet consectetur adipisicing elit. Facilis vitae, blanditiis sapiente fugit, rerum
          exercitationem similique alias unde, ad asperiores placeat vero voluptatum facere dolorum dolore porro dolores
          voluptas mollitia.
        </p>
        <p>
          Lorem ipsum dolor sit amet consectetur, adipisicing elit. Nam earum eum amet quo. Natus animi adipisci quae
          optio harum esse, ex dolore maiores exercitationem repellat quasi, sequi repudiandae. Aliquid, officia!
        </p>
        <p>
          Lorem ipsum dolor sit amet consectetur adipisicing elit. Facilis, dignissimos magnam ipsam odio a assumenda
          explicabo quae eos magni fugiat? Ab ut, debitis molestiae alias dignissimos libero. Architecto, numquam non.
        </p>
        <p>
          Lorem ipsum dolor sit amet consectetur adipisicing elit. Neque, vel impedit aperiam nostrum aut, assumenda
          unde eaque cupiditate eveniet veritatis deleniti nesciunt vero recusandae laboriosam ratione reprehenderit,
          repellendus qui quidem?
        </p>
        <p>
          Lorem ipsum dolor sit amet consectetur adipisicing elit. Incidunt velit ratione enim, commodi porro dolore
          dignissimos ea dolorem exercitationem fuga nemo, reiciendis odio mollitia quisquam id culpa doloremque minus
          aliquam.
        </p>
        <p>
          Lorem ipsum dolor sit amet, consectetur adipisicing elit. Odio ullam perferendis nobis, voluptatem nesciunt
          est voluptas, voluptatibus praesentium laborum consectetur et similique facilis ut quam quod. Quasi distinctio
          ut nulla!
        </p>
        <p>
          Lorem ipsum dolor sit amet consectetur adipisicing elit. Facilis vitae, blanditiis sapiente fugit, rerum
          exercitationem similique alias unde, ad asperiores placeat vero voluptatum facere dolorum dolore porro dolores
          voluptas mollitia.
        </p>
        <p>
          Lorem ipsum dolor sit amet consectetur, adipisicing elit. Nam earum eum amet quo. Natus animi adipisci quae
          optio harum esse, ex dolore maiores exercitationem repellat quasi, sequi repudiandae. Aliquid, officia!
        </p>
        <p>
          Lorem ipsum dolor sit amet consectetur adipisicing elit. Facilis, dignissimos magnam ipsam odio a assumenda
          explicabo quae eos magni fugiat? Ab ut, debitis molestiae alias dignissimos libero. Architecto, numquam non.
        </p>
        <p>
          Lorem ipsum dolor sit amet consectetur adipisicing elit. Neque, vel impedit aperiam nostrum aut, assumenda
          unde eaque cupiditate eveniet veritatis deleniti nesciunt vero recusandae laboriosam ratione reprehenderit,
          repellendus qui quidem?
        </p>
        <p>
          Lorem ipsum dolor sit amet consectetur adipisicing elit. Incidunt velit ratione enim, commodi porro dolore
          dignissimos ea dolorem exercitationem fuga nemo, reiciendis odio mollitia quisquam id culpa doloremque minus
          aliquam.
        </p>
        <p>
          Lorem ipsum dolor sit amet, consectetur adipisicing elit. Odio ullam perferendis nobis, voluptatem nesciunt
          est voluptas, voluptatibus praesentium laborum consectetur et similique facilis ut quam quod. Quasi distinctio
          ut nulla!
        </p>
        <p>
          Lorem ipsum dolor sit amet consectetur adipisicing elit. Facilis vitae, blanditiis sapiente fugit, rerum
          exercitationem similique alias unde, ad asperiores placeat vero voluptatum facere dolorum dolore porro dolores
          voluptas mollitia.
        </p>
        <p>
          Lorem ipsum dolor sit amet consectetur, adipisicing elit. Nam earum eum amet quo. Natus animi adipisci quae
          optio harum esse, ex dolore maiores exercitationem repellat quasi, sequi repudiandae. Aliquid, officia!
        </p>
        <p>
          Lorem ipsum dolor sit amet consectetur adipisicing elit. Facilis, dignissimos magnam ipsam odio a assumenda
          explicabo quae eos magni fugiat? Ab ut, debitis molestiae alias dignissimos libero. Architecto, numquam non.
        </p>
        <p>
          Lorem ipsum dolor sit amet consectetur adipisicing elit. Neque, vel impedit aperiam nostrum aut, assumenda
          unde eaque cupiditate eveniet veritatis deleniti nesciunt vero recusandae laboriosam ratione reprehenderit,
          repellendus qui quidem?
        </p>
        <p>
          Lorem ipsum dolor sit amet consectetur adipisicing elit. Incidunt velit ratione enim, commodi porro dolore
          dignissimos ea dolorem exercitationem fuga nemo, reiciendis odio mollitia quisquam id culpa doloremque minus
          aliquam.
        </p>
        <p>
          Lorem ipsum dolor sit amet, consectetur adipisicing elit. Odio ullam perferendis nobis, voluptatem nesciunt
          est voluptas, voluptatibus praesentium laborum consectetur et similique facilis ut quam quod. Quasi distinctio
          ut nulla!
        </p>
        <p>
          Lorem ipsum dolor sit amet consectetur adipisicing elit. Facilis vitae, blanditiis sapiente fugit, rerum
          exercitationem similique alias unde, ad asperiores placeat vero voluptatum facere dolorum dolore porro dolores
          voluptas mollitia.
        </p>
        <p>
          Lorem ipsum dolor sit amet consectetur, adipisicing elit. Nam earum eum amet quo. Natus animi adipisci quae
          optio harum esse, ex dolore maiores exercitationem repellat quasi, sequi repudiandae. Aliquid, officia!
        </p>
        <p>
          Lorem ipsum dolor sit amet consectetur adipisicing elit. Facilis, dignissimos magnam ipsam odio a assumenda
          explicabo quae eos magni fugiat? Ab ut, debitis molestiae alias dignissimos libero. Architecto, numquam non.
        </p>
        <p>
          Lorem ipsum dolor sit amet consectetur adipisicing elit. Neque, vel impedit aperiam nostrum aut, assumenda
          unde eaque cupiditate eveniet veritatis deleniti nesciunt vero recusandae laboriosam ratione reprehenderit,
          repellendus qui quidem?
        </p>
        <p>
          Lorem ipsum dolor sit amet consectetur adipisicing elit. Incidunt velit ratione enim, commodi porro dolore
          dignissimos ea dolorem exercitationem fuga nemo, reiciendis odio mollitia quisquam id culpa doloremque minus
          aliquam.
        </p>
        <p>
          Lorem ipsum dolor sit amet, consectetur adipisicing elit. Odio ullam perferendis nobis, voluptatem nesciunt
          est voluptas, voluptatibus praesentium laborum consectetur et similique facilis ut quam quod. Quasi distinctio
          ut nulla!
        </p>
      </Scrollable>
      <AutoHide
        className={css({
          boxSizing: 'border-box',
          padding: 16,
          top: 20,
        })}
        previewSize={32}
        stickTo="left"
      >
        <div
          className={css({
            width: 360,
            height: 200,
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            border: '1px solid #ccc',
            borderRadius: 16,
            backdropFilter: 'blur(18px)',
            boxShadow: '0 0 10px 0 rgba(0, 0, 0, 0.1)',
            overflow: 'hidden',
          })}
        >
          <div
            className={css({
              width: '100%',
              height: 36,
              backgroundColor: 'rgba(from #ccc r g b / 0.65)',
              borderBottom: '1px solid #ccc',
            })}
          ></div>
        </div>
      </AutoHide>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <ProviderFactory
    providers={(creator) => [
      creator(AutoHideProvider),
      creator(ScrollableProvider),
      creator(FormProvider),
      creator(FormItemProvider, {
        presetProps: () => {
          return {
            sx: {
              wrapper: {
                marginBottom: 8,
              },
            },
          };
        },
      }),
    ]}
  >
    <App />
  </ProviderFactory>,
);
