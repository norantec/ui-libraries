import * as _ from 'lodash';

export class CompareUtil {
    public static compare(input1: any, input2: any): boolean {
        return _.isEqualWith(input1, input2, (value1, value2) => {
            if (typeof value1 === 'function' && typeof value2 === 'function') {
                return (
                    Function.prototype.toString.call(value1).replace(/\s+/g, '') ===
                    Function.prototype.toString.call(value2).replace(/\s+/g, '')
                );
            }
            return undefined;
        });
    }
}
