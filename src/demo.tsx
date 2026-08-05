import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
// import { Form, FormItemProvider, FormProvider, useForm, Validator } from './components/form/ng';
import { Form, FormInstance, FormItem, FormItemProvider, FormProvider, Validator } from './components/form';
import { ProviderFactory } from './components/provider-factory';
import { useEffect, useRef, useState } from 'react';
import { StringUtil } from '@open-norantec/utilities/dist/string-util.class';
import { Scrollable, ScrollableProvider } from './components/scrollable';
import { css } from '@emotion/css';
import { AutoHide, AutoHideProvider, AutoHideRef } from './components/auto-hide';

interface InputProps extends Omit<React.HTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value?: string;
  placeholder?: string;
  onChange?: (value: string | undefined, event: React.ChangeEvent<HTMLInputElement>) => void;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ value, onChange, ...props }, ref) => {
  const innerRef = React.useRef<HTMLInputElement>(undefined);

  React.useImperativeHandle(ref, () => innerRef.current!);

  useEffect(() => {
    if (!(innerRef.current instanceof HTMLInputElement)) return;
    innerRef.current.value = StringUtil.isFalsyString(value) ? '' : value!;
  }, [value, innerRef.current]);

  return (
    <input
      {...props}
      ref={innerRef as React.LegacyRef<HTMLInputElement> | undefined}
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
  const autoHideRef = useRef<AutoHideRef | null>(null);

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
        filter={{
          mode: 'blacklist',
          fields: [],
        }}
        onInstanceChange={setForm}
      >
        <FormItem label="Test0 (no order)" name="test0" defaultValue="no order, before first ordered">
          {[Input, { placeholder: 'no order, before first ordered' }]}
        </FormItem>
        <FormItem
          label="Test1 (order=10)"
          name="test1"
          order={10}
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
        <FormItem label="Test2 (order=5)" name="test2" order={5} defaultValue="DEFAULT">
          {[Input, { placeholder: 'Input something...' }]}
        </FormItem>
        <FormItem label="Test3 (order=1, smallest → anchor)" name="test3" order={1} defaultValue="DEFAULT3">
          {[Input, { placeholder: 'Input something...' }]}
        </FormItem>
        <FormItem label="Test4 (order=1, same order → def order after test3)" name="test4" order={1}>
          {[Input, { placeholder: 'Input something...' }]}
        </FormItem>
        <FormItem label="Test5 (no order, after ordered)" name="test5">
          {[Input, { placeholder: 'no order, after ordered group' }]}
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
      <button
        onClick={() => {
          autoHideRef.current?.active?.({
            closeEvents: {
              clickOutside: false,
              windowBlur: false,
              mouseleave: false,
            },
            activeDelay: 0,
            hideDelay: 0,
          });
        }}
      >
        Active AutoHide
      </button>
      <button
        onClick={() => {
          autoHideRef.current?.deactive?.();
        }}
      >
        Deactive AutoHide
      </button>
      <AutoHide
        ref={autoHideRef}
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
            backgroundColor: 'rgba(from #eee r g b / 0.6)',
            border: '1px solid #bbb',
            borderRadius: 16,
            backdropFilter: 'blur(8px)',
            boxShadow: '0 8px 16px 0 rgba(0, 0, 0, 0.25)',
            overflow: 'hidden',
          })}
        >
          <div
            className={css({
              width: '100%',
              height: 36,
              backgroundColor: 'rgba(from #ccc r g b / 0.75)',
              borderBottom: '1px solid #bbb',
            })}
          ></div>
          <div
            className={css({
              color: 'black',
              padding: 16,
              fontSize: 14,
              textShadow: '0 2px 8px rgba(255, 255, 255, 0.75)',
            })}
          >
            Lorem ipsum dolor sit amet consectetur adipisicing elit. Dolores quisquam nobis modi qui alias mollitia
            fugiat hic deserunt reiciendis, praesentium odit quis culpa tempora? Fugit, blanditiis dolorem? Ratione,
            recusandae totam.
          </div>
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
