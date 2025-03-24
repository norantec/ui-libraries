import { StringUtil } from '@open-norantec/utilities/dist/string-util.class';
import * as React from 'react';
import { HashRouter, Route, Routes, BrowserRouter, MemoryRouter, StaticRouter, Outlet } from 'react-router-dom';
import * as _ from 'lodash';

export { HashRouter, Route, Routes, BrowserRouter, MemoryRouter, StaticRouter, Outlet };

export interface Page {
    layout?: React.LazyExoticComponent<() => React.JSX.Element>;
    page?: React.LazyExoticComponent<() => React.JSX.Element>;
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
            path={StringUtil.isFalsyString(pathname) ? '' : pathname}
            element={React.createElement(page?.layout ?? page?.page)}
        >
            {page?.page && <Route path="" element={React.createElement(page?.page)} />}
            {_.isPlainObject(page?.children) && (
                <>
                    {...Object.entries(page?.children).map(([subPathname, subPage]) => {
                        return generateRoutes(subPage, subPathname);
                    })}
                </>
            )}
        </Route>
    );
};

export const CentralRouter = <T extends object>({
    page = {},
    router: Router = HashRouter,
    routerProps,
}: CentralRouterProps<T>) => {
    return (
        <React.Suspense>
            <Router {...routerProps}>
                <Routes>{generateRoutes(page, '')}</Routes>
            </Router>
        </React.Suspense>
    );
};
