import type {Derivable, Middleware, ArrowOptions} from '@floating-ui/core';
import {arrow as arrowCore} from '@floating-ui/core';

/**
 * A data provider that provides data to position an inner element of the
 * floating element (usually a triangle or caret) so that it is centered to the
 * reference element.
 * This wraps the core `arrow` middleware to allow React refs as the element.
 * @see https://floating-ui.com/docs/arrow
 */
export const arrow = (
  options: ArrowOptions | Derivable<ArrowOptions>,
): Middleware => {
  function isRef(value: unknown) {
    return !!value && typeof value === 'object' && 'current' in value;
  }

  function resolveElement(element: unknown) {
    if (isRef(element)) {
      return (element as {current: unknown}).current;
    }

    return element;
  }

  return {
    name: 'arrow',
    options,
    fn(state) {
      const {element, padding} =
        typeof options === 'function' ? options(state) : options;

      const resolvedElement = resolveElement(element);
      if (resolvedElement == null) {
        return {};
      }

      return arrowCore({element: resolvedElement, padding}).fn(state);
    },
  };
};
