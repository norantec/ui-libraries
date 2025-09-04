import { EventEmitter } from 'eventemitter3';
import * as React from 'react';
import * as _ from 'lodash';
import { UUIDUtil } from '@open-norantec/utilities/dist/uuid-util.class';
import { css, cx } from '@emotion/css';
import { useDirection } from '../../hooks/use-direction';
import { ComponentProviderUtil } from '../../utilities/component-provider-util.class';

const EVENT_INIT = Symbol();
const EVENT_SCROLL_DRAG_START = Symbol();
const EVENT_SCROLL_DRAG_END = Symbol();
const EVENT_SHAPE_CHANGE = Symbol();

const SCROLLABLE_OVERFLOW_VALUES = ['auto', 'scroll', 'overlay'];

const autoHideVerticalTrackerClassName = css({
    '& > [role="vertical-scrollbar-tracker"]': {
        display: 'none',
    },
    '&:hover > [role="vertical-scrollbar-tracker"]': {
        display: 'block',
    },
});
const autoHideHorizontalTrackerClassName = css({
    '& > [role="horizontal-scrollbar-tracker"]': {
        display: 'none',
    },
    '&:hover > [role="horizontal-scrollbar-tracker"]': {
        display: 'block',
    },
});
const verticalTrackerHideClassName = css({ '& > [role="vertical-scrollbar-tracker"]': { display: 'none' } });
const horizontalTrackerHideClassName = css({ '& > [role="horizontal-scrollbar-tracker"]': { display: 'none' } });

export interface ScrollableObserverOptions {
    thumbClassName?: string;
    thumbSizeRatio?: number;
    trackerClassName?: string;
    trackerOffset?: [number | null, number | null];
    trackerSize?: number;
}

export interface ScrollableProps extends React.ComponentProps<'div'>, ScrollableObserverOptions {
    autoHide?: boolean;
    position?: 'absolute' | 'fixed' | 'relative';
}

const { Provider: ScrollableBaseProvider, useComponentConfig: useScrollableBaseComponentConfig } =
    ComponentProviderUtil.create<ScrollableProps>({
        defaultProps: () => ({
            autoHide: true,
        }),
    });

class ScrollableObserver {
    protected unwatch: (() => void) | null = null;
    protected options: ScrollableObserverOptions = {};

    public constructor(
        private readonly id: string,
        private readonly element: HTMLElement,
        initialOptions: ScrollableObserverOptions,
        protected readonly onShapeChange: () => void,
        protected readonly onScrollDragStart?: () => void,
        protected readonly onScrollDragEnd?: () => void,
        protected readonly onDestroy?: () => void,
    ) {
        this.options = { ...initialOptions };
        this.unwatch = this.watch();
    }

    public updateOptions(options: ScrollableObserverOptions) {
        this.options = { ...options };
    }

    protected watch() {
        if (this.unwatch !== null) return;

        let animateId: number | null = null;
        let currentRect: {
            height: number;
            overflowX: string;
            overflowY: string;
            scrollHeight: number;
            scrollWidth: number;
            width: number;
            x: number;
            y: number;
        } | null = null;

        const verticalTrackElement = document.createElement('div');
        const verticalThumbElement = document.createElement('div');

        const horizontalTrackElement = document.createElement('div');
        const horizontalThumbElement = document.createElement('div');

        let verticalInitialScrollTop: number = 0;
        let verticalDragOriginalTop: number | null = null;
        let verticalDragCurrentTop: number | null = null;

        let horizontalInitialScrollLeft: number = 0;
        let horizontalDragOriginalLeft: number | null = null;
        let horizontalDragCurrentLeft: number | null = null;

        const baseThumbClassName = css({
            backgroundColor: '#CFCFCF',
            opacity: 0.75,
            position: 'absolute',
            shadow: '0 0 1px 0 #333333',
        });

        verticalTrackElement.setAttribute('role', 'vertical-scrollbar-tracker');
        verticalTrackElement.setAttribute('data-scroll-id', this.id);
        verticalThumbElement.setAttribute('role', 'vertical-scrollbar-thumb');

        horizontalTrackElement.setAttribute('role', 'horizontal-scrollbar-tracker');
        horizontalTrackElement.setAttribute('data-scroll-id', this.id);
        horizontalThumbElement.setAttribute('role', 'horizontal-scrollbar-thumb');

        verticalTrackElement.appendChild(verticalThumbElement);
        horizontalTrackElement.appendChild(horizontalThumbElement);

        this.element.appendChild(verticalTrackElement);
        this.element.appendChild(horizontalTrackElement);

        const handleVerticalThumbMouseDown = (event: MouseEvent) => {
            event.stopPropagation();
            event.preventDefault();
            this.onScrollDragStart?.();
            verticalInitialScrollTop = this.element.scrollTop;
            verticalDragOriginalTop = event.clientY;
        };

        const handleHorizontalThumbMouseDown = (event: MouseEvent) => {
            event.stopPropagation();
            event.preventDefault();
            this.onScrollDragStart?.();
            horizontalInitialScrollLeft = this.element.scrollLeft;
            horizontalDragOriginalLeft = event.clientX;
        };

        const handleDocumentMouseMove = (event: MouseEvent) => {
            event.stopPropagation();
            event.preventDefault();
            verticalDragCurrentTop = event.clientY;
            horizontalDragCurrentLeft = event.clientX;
        };

        const handleDocumentMouseUp = () => {
            this.onScrollDragEnd?.();

            verticalInitialScrollTop = 0;
            verticalDragOriginalTop = null;
            verticalDragCurrentTop = null;

            horizontalInitialScrollLeft = 0;
            horizontalDragOriginalLeft = null;
            horizontalDragCurrentLeft = null;
        };

        verticalThumbElement.addEventListener('mousedown', handleVerticalThumbMouseDown, true);
        horizontalThumbElement.addEventListener('mousedown', handleHorizontalThumbMouseDown, true);
        document.documentElement.addEventListener('mouseup', handleDocumentMouseUp, true);
        document.documentElement.addEventListener('mousemove', handleDocumentMouseMove, true);

        const start = () => {
            if (!document.contains(this.element)) {
                this.unwatch?.();
                this.onDestroy?.();
                return;
            }

            const {
                trackerSize = 12,
                thumbSizeRatio = 0.5,
                trackerClassName: customTrackerClassName,
                thumbClassName: customThumbClassName,
                trackerOffset,
            } = this.options;
            const thumbSize = trackerSize * (thumbSizeRatio > 1 || thumbSizeRatio <= 0 ? 1 : thumbSizeRatio);
            const trackerClassName = cx(css({ position: 'fixed', zIndex: 9999 }), customTrackerClassName);
            const verticalOffset =
                typeof trackerOffset?.[0] === 'number' && trackerOffset[0] > 0 ? trackerOffset[0] : 0;
            const horizontalOffset =
                typeof trackerOffset?.[1] === 'number' && trackerOffset[1] > 0 ? trackerOffset[1] : 0;

            verticalTrackElement.className = trackerClassName;
            verticalThumbElement.className = cx(
                baseThumbClassName,
                css({ left: '50%', transform: 'translateX(-50%)' }),
                customThumbClassName,
            );
            verticalThumbElement.style.borderRadius = `${thumbSize / 2}px`;

            horizontalTrackElement.className = trackerClassName;
            horizontalThumbElement.className = cx(
                baseThumbClassName,
                css({ top: '50%', transform: 'translateY(-50%)' }),
                customThumbClassName,
            );
            horizontalThumbElement.style.borderRadius = `${thumbSize / 2}px`;

            animateId = requestAnimationFrame(() => {
                const documentBoundingClientRect = document.documentElement.getBoundingClientRect();
                const boundingClientRect = this.element.getBoundingClientRect();

                if (!(boundingClientRect instanceof DOMRect) || !(documentBoundingClientRect instanceof DOMRect)) {
                    start();
                    return;
                }

                const verticalTrackSize = boundingClientRect.height - trackerSize - verticalOffset;
                const horizontalTrackSize = boundingClientRect.width - trackerSize - horizontalOffset;

                if (
                    currentRect?.x !== boundingClientRect.x ||
                    currentRect?.y !== boundingClientRect.y ||
                    currentRect?.width !== boundingClientRect.width ||
                    currentRect?.height !== boundingClientRect.height ||
                    currentRect?.scrollWidth !== this.element.scrollWidth ||
                    currentRect?.scrollHeight !== this.element.scrollHeight ||
                    currentRect?.overflowX !== this.element.style.overflowX ||
                    currentRect?.overflowY !== this.element.style.overflowY
                ) {
                    if (
                        currentRect?.width !== boundingClientRect.width ||
                        currentRect?.height !== boundingClientRect.height ||
                        currentRect?.scrollWidth !== this.element.scrollWidth ||
                        currentRect?.scrollHeight !== this.element.scrollHeight ||
                        currentRect?.overflowX !== this.element.style.overflowX ||
                        currentRect?.overflowY !== this.element.style.overflowY
                    ) {
                        this.onShapeChange?.();
                    }
                    currentRect = {
                        width: boundingClientRect.width,
                        height: boundingClientRect.height,
                        x: boundingClientRect.x,
                        y: boundingClientRect.y,
                        scrollWidth: this.element.scrollWidth,
                        scrollHeight: this.element.scrollHeight,
                        overflowX: this.element.style.overflowX,
                        overflowY: this.element.style.overflowY,
                    };
                }

                if (
                    typeof verticalDragOriginalTop === 'number' &&
                    verticalDragOriginalTop > 0 &&
                    typeof verticalDragCurrentTop === 'number' &&
                    verticalDragCurrentTop > 0
                ) {
                    this.element.scrollTop =
                        verticalInitialScrollTop +
                        ((verticalDragCurrentTop - verticalDragOriginalTop) / verticalTrackSize) *
                            this.element.scrollHeight;
                }

                if (
                    typeof horizontalDragOriginalLeft === 'number' &&
                    horizontalDragOriginalLeft > 0 &&
                    typeof horizontalDragCurrentLeft === 'number' &&
                    horizontalDragCurrentLeft > 0
                ) {
                    this.element.scrollLeft =
                        horizontalInitialScrollLeft +
                        ((horizontalDragCurrentLeft - horizontalDragOriginalLeft) / horizontalTrackSize) *
                            this.element.scrollWidth;
                }

                verticalTrackElement.style.width = `${trackerSize}px`;
                verticalTrackElement.style.top = `${boundingClientRect.top + verticalOffset}px`;
                verticalTrackElement.style.height = `${verticalTrackSize}px`;
                if (this.element.dir === 'rtl') {
                    verticalTrackElement.style.removeProperty('right');
                    verticalTrackElement.style.left = `${boundingClientRect.left}px`;
                } else {
                    verticalTrackElement.style.removeProperty('left');
                    verticalTrackElement.style.right = `${Math.max(document.documentElement.clientWidth, documentBoundingClientRect.width) - boundingClientRect.right}px`;
                }

                verticalThumbElement.style.width = `${thumbSize}px`;
                verticalThumbElement.style.height = `${(boundingClientRect.height / this.element.scrollHeight) * verticalTrackSize}px`;
                verticalThumbElement.style.top = `${(this.element.scrollTop / this.element.scrollHeight) * verticalTrackSize}px`;

                horizontalTrackElement.style.height = `${trackerSize}px`;
                horizontalTrackElement.style.left =
                    this.element.dir === 'rtl'
                        ? `${boundingClientRect.left + trackerSize}px`
                        : `${boundingClientRect.left + horizontalOffset}px`;
                horizontalTrackElement.style.width = `${horizontalTrackSize}px`;
                horizontalTrackElement.style.bottom = `${Math.max(document.documentElement.clientHeight, documentBoundingClientRect.height) - boundingClientRect.bottom}px`;

                horizontalThumbElement.style.height = `${thumbSize}px`;
                horizontalThumbElement.style.width = `${(boundingClientRect.width / this.element.scrollWidth) * horizontalTrackSize}px`;
                if (this.element.dir === 'rtl') {
                    horizontalThumbElement.style.removeProperty('left');
                    horizontalThumbElement.style.right = `${0 - (this.element.scrollLeft / this.element.scrollWidth) * horizontalTrackSize}px`;
                } else {
                    horizontalThumbElement.style.removeProperty('right');
                    horizontalThumbElement.style.left = `${(this.element.scrollLeft / this.element.scrollWidth) * horizontalTrackSize}px`;
                }

                start();
            });
        };

        start();

        return () => {
            _.attempt(() => cancelAnimationFrame(animateId));
            _.attempt(() => verticalThumbElement.removeEventListener('mousedown', handleVerticalThumbMouseDown, true));
            _.attempt(() =>
                horizontalThumbElement.removeEventListener('mousedown', handleHorizontalThumbMouseDown, true),
            );
            _.attempt(() => verticalThumbElement.remove());
            _.attempt(() => verticalTrackElement.remove());
            _.attempt(() => horizontalThumbElement.remove());
            _.attempt(() => horizontalThumbElement.remove());
            _.attempt(() => document.documentElement.removeEventListener('mouseup', handleDocumentMouseUp, true));
            _.attempt(() => document.documentElement.removeEventListener('mousemove', handleDocumentMouseMove, true));
        };
    }
}

const ScrollableContext = React.createContext<EventEmitter | null>(null);

export const ScrollableProvider: React.FC<
    React.PropsWithChildren<React.ComponentProps<typeof ScrollableBaseProvider>>
> = ({ children, ...props }) => {
    const emitter = React.useMemo(() => new EventEmitter(), []);
    const observerMapRef = React.useRef(new Map<string, ScrollableObserver>());

    React.useEffect(() => {
        if (!(emitter instanceof EventEmitter)) return;

        const handleInit = (id: string, element: HTMLElement, options: ScrollableObserverOptions) => {
            if (observerMapRef.current.has(id) && observerMapRef.current.get(id) instanceof ScrollableObserver) {
                observerMapRef.current.get(id).updateOptions(options);
                return;
            }
            observerMapRef.current.set(
                id,
                new ScrollableObserver(
                    id,
                    element,
                    options,
                    () => {
                        emitter.emit(EVENT_SHAPE_CHANGE, id);
                    },
                    () => {
                        emitter.emit(EVENT_SCROLL_DRAG_START, id);
                    },
                    () => {
                        emitter.emit(EVENT_SCROLL_DRAG_END, id);
                    },
                    () => {
                        observerMapRef.current.delete(id);
                    },
                ),
            );
        };

        emitter.on(EVENT_INIT, handleInit);

        return () => {
            emitter.off(EVENT_INIT, handleInit);
        };
    }, [emitter]);

    return (
        <ScrollableBaseProvider {...props}>
            <ScrollableContext.Provider value={emitter}>{children}</ScrollableContext.Provider>
        </ScrollableBaseProvider>
    );
};

export const Scrollable = React.forwardRef<HTMLDivElement, ScrollableProps>((inputProps, ref) => {
    const {
        autoHide = true,
        thumbClassName,
        thumbSizeRatio,
        trackerClassName,
        trackerSize,
        trackerOffset,
        ...props
    } = useScrollableBaseComponentConfig(inputProps);
    const idRef = React.useRef(UUIDUtil.generateV4());
    const innerRef = React.useRef<HTMLDivElement | null>(null);
    const emitter = React.useContext(ScrollableContext);
    const direction = useDirection();
    const [isScrollDragging, setIsScrollDragging] = React.useState(false);
    const [additionalClassName, setAdditionalClassName] = React.useState('');
    const [size, setSize] = React.useState<{
        height: number;
        overflowX: string;
        overflowY: string;
        scrollHeight: number;
        scrollWidth: number;
        width: number;
    } | null>(null);

    React.useImperativeHandle(ref, () => innerRef.current);

    React.useEffect(() => {
        if (!(emitter instanceof EventEmitter)) return;

        const handleScrollDragStart = (id: string) => {
            if (id !== idRef.current) return;
            setIsScrollDragging(true);
        };

        const handleScrollDragEnd = (id: string) => {
            if (id !== idRef.current) return;
            setIsScrollDragging(false);
        };

        const handleShapeChange = (id: string) => {
            if (id !== idRef.current) return;
            const boundingClientRect = innerRef.current?.getBoundingClientRect?.();
            setSize({
                width: boundingClientRect?.width,
                height: boundingClientRect?.height,
                overflowX: innerRef.current?.style?.overflowX,
                overflowY: innerRef.current?.style?.overflowY,
                scrollWidth: innerRef.current?.scrollWidth,
                scrollHeight: innerRef.current?.scrollHeight,
            });
        };

        emitter.on(EVENT_SCROLL_DRAG_START, handleScrollDragStart);
        emitter.on(EVENT_SCROLL_DRAG_END, handleScrollDragEnd);
        emitter.on(EVENT_SHAPE_CHANGE, handleShapeChange);

        return () => {
            emitter.off(EVENT_SCROLL_DRAG_START, handleScrollDragStart);
            emitter.off(EVENT_SCROLL_DRAG_END, handleScrollDragEnd);
            emitter.off(EVENT_SHAPE_CHANGE, handleShapeChange);
        };
    }, [emitter, idRef.current, innerRef.current]);

    React.useEffect(() => {
        if (!(emitter instanceof EventEmitter && innerRef.current instanceof HTMLElement)) return;
        emitter.emit(EVENT_INIT, idRef.current, innerRef.current, {
            thumbClassName,
            thumbSizeRatio,
            trackerClassName,
            trackerSize,
            trackerOffset,
        });
    }, [
        emitter,
        innerRef.current,
        thumbClassName,
        trackerOffset,
        thumbSizeRatio,
        trackerClassName,
        trackerSize,
        idRef.current,
    ]);

    React.useEffect(() => {
        setAdditionalClassName(
            cx({
                [verticalTrackerHideClassName]:
                    size?.scrollHeight <= size?.height || !SCROLLABLE_OVERFLOW_VALUES.includes(size?.overflowY),
                [horizontalTrackerHideClassName]:
                    size?.scrollWidth <= size?.width || !SCROLLABLE_OVERFLOW_VALUES.includes(size?.overflowX),
                [autoHideVerticalTrackerClassName]:
                    autoHide &&
                    !isScrollDragging &&
                    size?.scrollHeight > size?.height &&
                    SCROLLABLE_OVERFLOW_VALUES.includes(size?.overflowY),
                [autoHideHorizontalTrackerClassName]:
                    autoHide &&
                    !isScrollDragging &&
                    size?.scrollWidth > size?.width &&
                    SCROLLABLE_OVERFLOW_VALUES.includes(size?.overflowX),
            }),
        );
    }, [size, isScrollDragging, autoHide]);

    return (
        <div
            {..._.omit(props, ['children', 'position'])}
            dir={['rtl', 'ltr'].includes(props?.dir) ? props.dir : direction}
            style={{
                ...props?.style,
                overflow: 'auto',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
                position: props?.position || 'relative',
            }}
            className={cx(
                css({ zIndex: 0 }),
                props?.className,
                additionalClassName,
                css({ '&::-webkit-scrollbar': { display: 'none' } }),
            )}
            ref={innerRef}
        >
            {props?.children}
        </div>
    );
});
