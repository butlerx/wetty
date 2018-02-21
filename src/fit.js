import { isUndefined } from 'lodash';

export function proposeGeometry({ element, renderer }) {
  if (!element.parentElement) return null;

  const parentElementStyle = window.getComputedStyle(element.parentElement);

  return {
    cols: Math.floor(
      Math.max(0, parseInt(parentElementStyle.getPropertyValue('width'), 10)) /
        renderer.dimensions.actualCellWidth,
    ),
    rows: Math.floor(
      parseInt(parentElementStyle.getPropertyValue('height'), 10) /
        renderer.dimensions.actualCellHeight,
    ),
  };
}

export function fit(term) {
  const { rows, cols } = proposeGeometry(term);
  if (!isUndefined(rows) && !isUndefined(cols)) {
    // Force a full render
    if (term.rows !== rows || term.cols !== cols) {
      term.renderer.clear();
      term.resize(cols, rows);
    }
  }
}

export function apply({ prototype }) {
  prototype.proposeGeometry = function proProposeGeometry() {
    return proposeGeometry(this);
  };

  prototype.fit = function proFit() {
    return fit(this);
  };
}
