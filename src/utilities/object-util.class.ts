import _ from 'lodash';
import React from 'react';

export class ObjectUtil {
    public static merge<T>({
        sources = [],
        overrideArrays = true,
        overrideFunctions = true,
    }: {
        sources: T[];
        overrideArrays?: boolean;
        overrideFunctions?: boolean;
    }) {
        return _.mergeWith({}, ...sources, (objectValue, sourceValue, key) => {
            if (key === 'ref' || key.endsWith('Ref')) {
                return sourceValue;
            }

            if (
                (_.isArray(sourceValue) && overrideArrays) ||
                (_.isFunction(sourceValue) && overrideFunctions) ||
                React.isValidElement(sourceValue) ||
                sourceValue instanceof Element
            ) {
                return sourceValue;
            }
        });
    }
}
