import { StringUtil } from '@open-norantec/utilities/dist/string-util.class';
import * as React from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';
import * as _ from 'lodash';

export interface Page {
    layoutPath?: string;
    pagePath?: string;
    children?: Record<string, Page>;
}

export interface CentralRouterProps<T> {
    router?: (props: T) => React.JSX.Element;
    routerProps?: T;
    page?: Page;
}

const generateRoutes = (page: Page, pathname: string) => {
    if (!_.isPlainObject(page)) return null;
    return (
        <Route
            path={StringUtil.isFalsyString(pathname) ? '/' : pathname}
            element={React.createElement(
                React.lazy(
                    () => import(StringUtil.isFalsyString(page?.layoutPath) ? page?.pagePath : page?.layoutPath),
                ),
            )}
        >
            {!StringUtil.isFalsyString(page?.layoutPath) && (
                <Route path="" element={React.createElement(React.lazy(() => import(page?.pagePath)))} />
            )}
            {...Object.entries(page?.children).map(([subPathname, subPage]) => {
                return generateRoutes(subPage, subPathname);
            })}
        </Route>
    );
};

export const CentralRouter = <T extends object>({
    page = {},
    router: Router = HashRouter,
    routerProps,
}: CentralRouterProps<T>) => {
    return React.createElement(Router, routerProps, <Routes>{generateRoutes(page, '')}</Routes>);
};
