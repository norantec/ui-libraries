import * as React from 'react';
import { useCallback } from 'react';

type CreateFn = <T>(Provider: React.FC<T>, props?: Omit<T, 'children'>) => React.ReactElement;

export interface ProviderFactoryProps {
  providers: (creator: CreateFn) => React.ReactElement[];
}

export const ProviderFactory: React.FC<React.PropsWithChildren<ProviderFactoryProps>> = ({ children, providers }) => {
  const createElement = useCallback(() => {
    const elements = providers?.((Provider, props) => {
      return <Provider {...(props as any)} children={null} />;
    })?.filter?.((element) => {
      return React.isValidElement(element);
    });

    if (!Array.isArray(elements) || elements.length === 0) return null;

    let finalElement: React.ReactElement = children as unknown as React.ReactElement;

    while (elements.length > 0) {
      finalElement = React.cloneElement(elements.pop()!, undefined, finalElement);
    }

    return finalElement;
  }, [providers, children]);
  return createElement();
};
