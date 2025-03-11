import { useUpdate } from 'ahooks';
import { useEffect, useRef } from 'react';
import { Direction } from '../../enums/direction.enum';
import { StringUtil } from '@open-norantec/toolchain/dist/utilities/string-util.class';

const getDirection = (): Direction => {
    const rawDirection = document.documentElement.getAttribute('dir');
    let newDirection: Direction;

    if (!StringUtil.isFalsyString(rawDirection) && rawDirection.toLowerCase() === Direction.RTL) {
        newDirection = Direction.RTL;
    } else {
        newDirection = Direction.LTR;
    }

    return newDirection;
};

export const useDirection = () => {
    const direction = useRef<Direction>(getDirection());
    const update = useUpdate();

    useEffect(() => {
        const observer = new MutationObserver(() => {
            const newDir = getDirection();
            if (newDir !== direction.current) {
                direction.current = newDir;
                update();
            }
        });

        observer.observe(document.documentElement, {
            attributes: true,
        });

        return () => {
            observer.disconnect();
        };
    }, []);

    return direction.current;
};
