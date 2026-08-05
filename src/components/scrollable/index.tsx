import * as React from 'react';
import * as _ from 'lodash';
import { css, cx } from '@emotion/css';
import { useDirection } from '../../hooks/use-direction';
import { ComponentProviderUtil } from '../../utilities/component-provider-util.class';

const SCROLLABLE_OVERFLOW_VALUES = ['auto', 'scroll', 'overlay'];
const baseThumbClassName = css({
  backgroundColor: '#CFCFCF',
  opacity: 0.75,
  position: 'absolute',
  shadow: '0 0 1px 0 #333333',
});

export interface ScrollableObserverOptions {
  thumbClassName?: string;
  thumbSizeRatio?: number;
  trackerClassName?: string;
  trackerOffset?: [number | null, number | null, number | null, number | null];
  trackerSize?: number;
}

export interface ScrollableProps extends React.ComponentProps<'div'>, ScrollableObserverOptions {
  autoHide?: boolean;
  position?: 'absolute' | 'fixed' | 'relative';
}

const { Provider: ScrollableProvider, useComponentConfig: useScrollableBaseComponentConfig } =
  ComponentProviderUtil.create<ScrollableProps>({
    defaultProps: () => ({
      autoHide: true,
      trackerSize: 12,
      thumbSizeRatio: 0.5,
    }),
  });

export { ScrollableProvider };

interface Size {
  height: number;
  scrollHeight: number;
  scrollWidth: number;
  width: number;
  x: number;
  y: number;
  overflowX?: string;
  overflowY?: string;
}

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
  const innerRef = React.useRef<HTMLDivElement | null>(null);
  const verticalTrackElementRef = React.useRef<HTMLDivElement | null>(null);
  const horizontalTrackElementRef = React.useRef<HTMLDivElement | null>(null);
  const verticalThumbElementRef = React.useRef<HTMLDivElement | null>(null);
  const horizontalThumbElementRef = React.useRef<HTMLDivElement | null>(null);
  const direction = useDirection();
  const [isScrollDragging, setIsScrollDragging] = React.useState(false);
  const [size, setSize] = React.useState<Size | null>(null);
  const verticalDragOriginalTopRef = React.useRef<number | null>(null);
  const verticalDragCurrentTopRef = React.useRef<number | null>(null);
  const verticalInitialScrollTopRef = React.useRef<number | null>(null);
  const horizontalDragOriginalLeftRef = React.useRef<number | null>(null);
  const horizontalDragCurrentLeftRef = React.useRef<number | null>(null);
  const horizontalInitialScrollLeftRef = React.useRef<number | null>(null);
  const [hovering, setHovering] = React.useState(false);

  React.useImperativeHandle(ref, () => innerRef.current!);

  React.useEffect(() => {
    let stopped = false;

    const start = () => {
      if (stopped) return;
      requestAnimationFrame(() => {
        if (
          !(innerRef.current instanceof HTMLElement) ||
          !(verticalTrackElementRef.current instanceof HTMLElement) ||
          !(horizontalTrackElementRef.current instanceof HTMLElement) ||
          !(verticalThumbElementRef.current instanceof HTMLElement) ||
          !(horizontalThumbElementRef.current instanceof HTMLElement)
        ) {
          start();
          return;
        }

        const boundingClientRect = innerRef.current.getBoundingClientRect();
        const documentBoundingClientRect = document.documentElement.getBoundingClientRect();
        const newSize: Size = {
          height: boundingClientRect.height,
          overflowX: innerRef.current.computedStyleMap().get('overflow-x')?.toString?.(),
          overflowY: innerRef.current.computedStyleMap().get('overflow-y')?.toString?.(),
          scrollHeight: innerRef.current.scrollHeight,
          scrollWidth: innerRef.current.scrollWidth,
          width: boundingClientRect.width,
          x: boundingClientRect.x,
          y: boundingClientRect.y,
        };

        if (!_.isEqual(size, newSize)) {
          setSize(newSize);
        }

        const thumbSize = (trackerSize || 0) * (thumbSizeRatio! > 1 || thumbSizeRatio! <= 0 ? 1 : thumbSizeRatio!);
        const topOffset = typeof trackerOffset?.[0] === 'number' && trackerOffset[0] > 0 ? trackerOffset[0] : 0;
        let rightOffset = Math.max(
          trackerSize!,
          typeof trackerOffset?.[1] === 'number' && trackerOffset[1] > 0 ? trackerOffset[1] : 0,
        );
        const bottomOffset = Math.max(
          trackerSize!,
          typeof trackerOffset?.[2] === 'number' && trackerOffset[2] > 0 ? trackerOffset[2] : 0,
        );
        let leftOffset = typeof trackerOffset?.[3] === 'number' && trackerOffset[3] > 0 ? trackerOffset[3] : 0;

        if (innerRef.current.dir === 'rtl') {
          const temp = rightOffset;
          rightOffset = leftOffset;
          leftOffset = temp;
        }

        verticalThumbElementRef.current.style.borderRadius = `${thumbSize / 2}px`;
        horizontalThumbElementRef.current.style.borderRadius = `${thumbSize / 2}px`;

        const verticalTrackSize = boundingClientRect.height - topOffset - bottomOffset;
        const horizontalTrackSize = boundingClientRect.width - leftOffset - rightOffset;

        if (
          typeof verticalDragOriginalTopRef.current === 'number' &&
          verticalDragOriginalTopRef.current > 0 &&
          typeof verticalDragCurrentTopRef.current === 'number' &&
          verticalDragCurrentTopRef.current > 0
        ) {
          innerRef.current.scrollTop =
            verticalInitialScrollTopRef.current! +
            ((verticalDragCurrentTopRef.current - verticalDragOriginalTopRef.current) / verticalTrackSize) *
              innerRef.current.scrollHeight;
        }

        if (
          typeof horizontalDragOriginalLeftRef.current === 'number' &&
          horizontalDragOriginalLeftRef.current > 0 &&
          typeof horizontalDragCurrentLeftRef.current === 'number' &&
          horizontalDragCurrentLeftRef.current > 0
        ) {
          innerRef.current.scrollLeft =
            horizontalInitialScrollLeftRef.current! +
            ((horizontalDragCurrentLeftRef.current - horizontalDragOriginalLeftRef.current) / horizontalTrackSize) *
              innerRef.current.scrollWidth;
        }

        verticalTrackElementRef.current.style.width = `${trackerSize}px`;
        verticalTrackElementRef.current.style.top = `${boundingClientRect.top + topOffset}px`;
        verticalTrackElementRef.current.style.height = `${verticalTrackSize}px`;
        if (innerRef.current.dir === 'rtl') {
          verticalTrackElementRef.current.style.removeProperty('right');
          verticalTrackElementRef.current.style.left = `${boundingClientRect.left}px`;
        } else {
          verticalTrackElementRef.current.style.removeProperty('left');
          verticalTrackElementRef.current.style.right = `${Math.max(document.documentElement.clientWidth, documentBoundingClientRect.width) - boundingClientRect.right}px`;
        }

        verticalThumbElementRef.current.style.width = `${thumbSize}px`;
        verticalThumbElementRef.current.style.height = `${(boundingClientRect.height / innerRef.current.scrollHeight) * verticalTrackSize}px`;
        verticalThumbElementRef.current.style.top = `${(innerRef.current.scrollTop / innerRef.current.scrollHeight) * verticalTrackSize}px`;

        horizontalTrackElementRef.current.style.height = `${trackerSize}px`;
        horizontalTrackElementRef.current.style.left = `${boundingClientRect.left + leftOffset}px`;
        horizontalTrackElementRef.current.style.width = `${horizontalTrackSize}px`;
        horizontalTrackElementRef.current.style.bottom = `${Math.max(document.documentElement.clientHeight, documentBoundingClientRect.height) - boundingClientRect.bottom}px`;

        horizontalThumbElementRef.current.style.height = `${thumbSize}px`;
        horizontalThumbElementRef.current.style.width = `${(boundingClientRect.width / innerRef.current.scrollWidth) * horizontalTrackSize}px`;
        if (innerRef.current.dir === 'rtl') {
          horizontalThumbElementRef.current.style.removeProperty('left');
          horizontalThumbElementRef.current.style.right = `${0 - (innerRef.current.scrollLeft / innerRef.current.scrollWidth) * horizontalTrackSize}px`;
        } else {
          horizontalThumbElementRef.current.style.removeProperty('right');
          horizontalThumbElementRef.current.style.left = `${(innerRef.current.scrollLeft / innerRef.current.scrollWidth) * horizontalTrackSize}px`;
        }

        start();
      });
    };

    start();

    return () => {
      stopped = true;
    };
  }, [size, trackerOffset, thumbSizeRatio, trackerSize]);

  React.useMemo(() => {
    const handleDocumentMouseMove = (event: MouseEvent) => {
      event.stopPropagation();
      event.preventDefault();
      setHovering(event?.composedPath?.()?.includes?.(innerRef.current!));
      if (isScrollDragging) {
        verticalDragCurrentTopRef.current = event.clientY;
        horizontalDragCurrentLeftRef.current = event.clientX;
      }
    };

    const handleDocumentMouseUp = () => {
      setIsScrollDragging(false);

      verticalInitialScrollTopRef.current = 0;
      verticalDragOriginalTopRef.current = null;
      verticalDragCurrentTopRef.current = null;

      horizontalInitialScrollLeftRef.current = 0;
      horizontalDragOriginalLeftRef.current = null;
      horizontalDragCurrentLeftRef.current = null;
    };

    const handleRemoveHoveringState = (event: MouseEvent) => {
      if (
        event.clientY < 0 ||
        event.clientX < 0 ||
        event.clientX > window.innerWidth ||
        event.clientY > window.innerHeight
      ) {
        setHovering(false);
      }
    };

    document.addEventListener('mouseleave', handleRemoveHoveringState, true);
    document.documentElement.addEventListener('mouseup', handleDocumentMouseUp, true);
    document.documentElement.addEventListener('mousemove', handleDocumentMouseMove, true);

    return () => {
      document.removeEventListener('mouseleave', handleRemoveHoveringState, true);
      document.documentElement.removeEventListener('mouseup', handleDocumentMouseUp, true);
      document.documentElement.removeEventListener('mousemove', handleDocumentMouseMove, true);
    };
  }, [isScrollDragging, size]);

  return (
    <div
      {..._.omit(props, ['children', 'position'])}
      dir={['rtl', 'ltr'].includes(props?.dir || '') ? props.dir : direction}
      style={{
        ...props?.style,
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
        position: props?.position || 'relative',
      }}
      className={cx(
        css({ zIndex: 0, overflow: 'auto' }),
        props?.className,
        css({ '&::-webkit-scrollbar': { display: 'none' } }),
      )}
      ref={innerRef}
    >
      <div
        ref={verticalTrackElementRef}
        className={cx(css({ position: 'fixed', zIndex: 9999 }), trackerClassName)}
        style={(() => {
          if (
            !SCROLLABLE_OVERFLOW_VALUES.includes(size?.overflowY || '') ||
            (size?.scrollHeight || 0) <= (size?.height || 0) ||
            (autoHide && !isScrollDragging && !hovering)
          ) {
            return {
              display: 'none',
            };
          }
          return {};
        })()}
      >
        <div
          ref={verticalThumbElementRef}
          className={cx(baseThumbClassName, css({ left: '50%', transform: 'translateX(-50%)' }), thumbClassName)}
          onMouseDownCapture={(event) => {
            event.stopPropagation();
            event.preventDefault();
            setIsScrollDragging(true);
            verticalInitialScrollTopRef.current = innerRef.current?.scrollTop || null;
            verticalDragOriginalTopRef.current = event.clientY;
          }}
        />
      </div>
      <div
        ref={horizontalTrackElementRef}
        className={cx(css({ position: 'fixed', zIndex: 9999 }), trackerClassName)}
        style={(() => {
          if (
            !SCROLLABLE_OVERFLOW_VALUES.includes(size?.overflowX || '') ||
            (size?.scrollWidth || 0) <= (size?.width || 0) ||
            (autoHide && !isScrollDragging && !hovering)
          ) {
            return {
              display: 'none',
            };
          }
          return {};
        })()}
      >
        <div
          ref={horizontalThumbElementRef}
          className={cx(baseThumbClassName, css({ top: '50%', transform: 'translateY(-50%)' }), thumbClassName)}
          onMouseDownCapture={(event) => {
            event.stopPropagation();
            event.preventDefault();
            setIsScrollDragging(true);
            horizontalInitialScrollLeftRef.current = innerRef.current?.scrollLeft || null;
            horizontalDragOriginalLeftRef.current = event.clientX;
          }}
        />
      </div>
      {props?.children}
    </div>
  );
});
