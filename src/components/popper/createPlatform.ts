import type { Platform, Rect } from '@floating-ui/core';
import Taro from '@tarojs/taro';

type RectResult = {
  left: number;
  top: number;
  width: number;
  height: number;
};

type PlatformOptions = {
  sameScrollView?: boolean;
  offsetParentId?: string;
  debug?: boolean;
};

function toSelector(id: string) {
  return id.startsWith('#') ? id : `#${id}`;
}

function isVirtualElement(
  element: unknown,
): element is { getBoundingClientRect: () => Rect } {
  return (
    !!element &&
    typeof element === 'object' &&
    typeof (element as { getBoundingClientRect?: unknown }).getBoundingClientRect === 'function'
  );
}

function resolveId(element: unknown) {
  if (typeof element === 'string') {
    return element;
  }

  if (element && typeof element === 'object') {
    const id = (element as { id?: unknown }).id;
    if (typeof id === 'string' && id.length > 0) {
      return id;
    }
  }

  return undefined;
}

function normalizeRect(rect: { width: number; height: number; x?: number; y?: number; left?: number; top?: number }): RectResult {
  return {
    left: rect.left ?? rect.x ?? 0,
    top: rect.top ?? rect.y ?? 0,
    width: rect.width,
    height: rect.height,
  };
}

async function queryRect(selector: string) {
  const query = Taro.createSelectorQuery();
  query.select(selector).boundingClientRect();

  const [rect] = await new Promise<Array<RectResult | null>>((resolve, reject) => {
    query.exec((result) => {
      if (!result || result.length === 0 || !result[0]) {
        reject(new Error(`Unable to measure ${selector}`));
        return;
      }

      resolve(result as Array<RectResult | null>);
    });
  });

  return rect as RectResult;
}

async function queryOffsetParentRect(offsetParentId: string) {
  return queryRect(toSelector(offsetParentId));
}

export const createPlatform = ({
  sameScrollView = true,
  offsetParentId,
  debug = false,
}: PlatformOptions = {}): Platform => ({
  async getElementRects({ reference, floating, strategy: _strategy }) {
    const log = (...args: unknown[]) => {
      if (debug) {
        // eslint-disable-next-line no-console
        console.log('[floating-ui-taro][platform:getElementRects]', ...args);
      }
    };

    const referenceRect = isVirtualElement(reference)
      ? normalizeRect(reference.getBoundingClientRect())
      : await queryRect(toSelector(resolveId(reference) ?? '')).catch(() => {
          throw new Error('reference must have a valid id');
        });

    const floatingRect = isVirtualElement(floating)
      ? normalizeRect(floating.getBoundingClientRect())
      : await queryRect(toSelector(resolveId(floating) ?? '')).catch(() => {
          throw new Error('floating must have a valid id');
        });

    const offsetParentRect = !sameScrollView && offsetParentId
      ? await queryOffsetParentRect(offsetParentId)
      : null;

    log({
      referenceRect,
      floatingRect,
      offsetParentId,
      offsetParentRect,
    });

    return {
      reference: {
        width: referenceRect.width,
        height: referenceRect.height,
        x: referenceRect.left - (offsetParentRect?.left ?? 0),
        y: referenceRect.top - (offsetParentRect?.top ?? 0),
      },
      floating: {
        width: floatingRect.width,
        height: floatingRect.height,
        x: 0,
        y: 0,
      },
    };
  },

  async getClippingRect() {
    const { windowWidth, windowHeight } = Taro.getSystemInfoSync();
    if (debug) {
      // eslint-disable-next-line no-console
      console.log('[floating-ui-taro][platform:getClippingRect]', {
        windowWidth,
        windowHeight,
      });
    }

    return {
      x: 0,
      y: 0,
      width: windowWidth,
      height: windowHeight,
    };
  },

  async convertOffsetParentRelativeRectToViewportRelativeRect({ rect }) {
    if (sameScrollView || !offsetParentId) {
      return rect;
    }

    const parentRect = await queryOffsetParentRect(offsetParentId);
    if (debug) {
      // eslint-disable-next-line no-console
      console.log('[floating-ui-taro][platform:convertOffsetParentRelativeRectToViewportRelativeRect]', {
        rect,
        parentRect,
      });
    }

    return {
      ...rect,
      x: rect.x + parentRect.left,
      y: rect.y + parentRect.top,
    };
  },

  async getDimensions(element: unknown) {
    if (isVirtualElement(element)) {
      const rect = normalizeRect(element.getBoundingClientRect());
      if (debug) {
        // eslint-disable-next-line no-console
        console.log('[floating-ui-taro][platform:getDimensions][virtual]', rect);
      }
      return {
        width: rect.width,
        height: rect.height,
      };
    }

    const id = resolveId(element);
    if (!id) {
      throw new Error('element must have a valid id');
    }

    const rect = await queryRect(toSelector(id));
    if (debug) {
      // eslint-disable-next-line no-console
      console.log('[floating-ui-taro][platform:getDimensions]', {
        id,
        rect,
      });
    }
    return {
      width: rect.width,
      height: rect.height,
    };
  },
});
