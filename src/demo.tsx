import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import { Form, Instance, registerTemplate } from './components/form';

registerTemplate('demo', () => {
    return [
        {
            label: 'test1',
            name: 'test1',
            children: () => {
                return <input placeholder="Input something..." />;
            },
        },
    ];
});

const App: React.FC = () => {
    const [formInstance, setFormInstance] = useState<Instance>(undefined);

    return (
        <div>
            <Form
                onInstanceInitialize={(instance) => {
                    setFormInstance(instance);
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

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
