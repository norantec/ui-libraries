import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { Form, useForm, registerTemplate, FormProvider } from './components/form';

registerTemplate('demo', () => {
    return [
        {
            label: 'test1',
            name: 'test1',
            children: () => {
                return <input placeholder="Input something..." />;
            },
        },
        {
            label: 'test2',
            name: 'test2',
            required: true,
            children: () => {
                return <input placeholder="Input something..." />;
            },
        },
    ];
});

const App: React.FC = () => {
    const formInstance = useForm();

    useEffect(() => {
        console.log('LENCONDA:formInstance:', formInstance?.getValues?.());
    }, [formInstance]);

    return (
        <div>
            <Form
                instance={formInstance}
                defaultValues={{
                    test2: 'asd',
                }}
            >
                {({ getPartialTemplate, render }) => render(getPartialTemplate('demo'))}
            </Form>
            <button
                onClick={() => {
                    formInstance?.submit?.()?.then((values) => {
                        console.log('LENCONDA:DEMO:values', values);
                    });
                }}
            >
                Submit
            </button>
        </div>
    );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
    <FormProvider>
        <App />
    </FormProvider>,
);
