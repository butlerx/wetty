const selectionColorOption = {
  type: 'color',
  name: 'Selection Color',
  description: 'Background color for selected text. Can be transparent.',
  path: ['xterm', 'theme', 'selection'],
};
const selectionColorOpacityOption = {
  type: 'number',
  name: 'Selection Color Opacity',
  description:
    'Opacity of the selection highlight. A value between 1 (fully opaque) and 0 (fully transparent).',
  path: ['wettyVoid'],
  float: true,
  min: 0,
  max: 1,
};

window.inflateOptions([
  {
    type: 'color',
    name: 'Foreground Color',
    description: 'The default foreground (text) color.',
    path: ['xterm', 'theme', 'foreground'],
  },
  {
    type: 'color',
    name: 'Background Color',
    description: 'The default background color.',
    path: ['xterm', 'theme', 'background'],
  },
  {
    type: 'color',
    name: 'Cursor Color',
    description: 'Color of the cursor.',
    path: ['xterm', 'theme', 'cursor'],
  },
  {
    type: 'color',
    name: 'Block Cursor Accent Color',
    description:
      'The accent color of the cursor, used as the foreground color for block cursors.',
    path: ['xterm', 'theme', 'cursorAccent'],
  },
  selectionColorOption,
  selectionColorOpacityOption,
  {
    type: 'color',
    name: 'Black',
    description: 'Color for ANSI Black text.',
    path: ['xterm', 'theme', 'black'],
  },
  {
    type: 'color',
    name: 'Red',
    description: 'Color for ANSI Red text.',
    path: ['xterm', 'theme', 'red'],
  },
  {
    type: 'color',
    name: 'Green',
    description: 'Color for ANSI Green text.',
    path: ['xterm', 'theme', 'green'],
  },
  {
    type: 'color',
    name: 'Yellow',
    description: 'Color for ANSI Yellow text.',
    path: ['xterm', 'theme', 'yellow'],
  },
  {
    type: 'color',
    name: 'Blue',
    description: 'Color for ANSI Blue text.',
    path: ['xterm', 'theme', 'blue'],
  },
  {
    type: 'color',
    name: 'Magenta',
    description: 'Color for ANSI Magenta text.',
    path: ['xterm', 'theme', 'magenta'],
  },
  {
    type: 'color',
    name: 'Cyan',
    description: 'Color for ANSI Cyan text.',
    path: ['xterm', 'theme', 'cyan'],
  },
  {
    type: 'color',
    name: 'White',
    description: 'Color for ANSI White text.',
    path: ['xterm', 'theme', 'white'],
  },
  {
    type: 'color',
    name: 'Bright Black',
    description: 'Color for ANSI Bright Black text.',
    path: ['xterm', 'theme', 'brightBlack'],
  },
  {
    type: 'color',
    name: 'Bright Red',
    description: 'Color for ANSI Bright Red text.',
    path: ['xterm', 'theme', 'brightRed'],
  },
  {
    type: 'color',
    name: 'Bright Green',
    description: 'Color for ANSI Bright Green text.',
    path: ['xterm', 'theme', 'brightGreen'],
  },
  {
    type: 'color',
    name: 'Bright Yellow',
    description: 'Color for ANSI Bright Yellow text.',
    path: ['xterm', 'theme', 'brightYellow'],
  },
  {
    type: 'color',
    name: 'Bright Blue',
    description: 'Color for ANSI Bright Blue text.',
    path: ['xterm', 'theme', 'brightBlue'],
  },
  {
    type: 'color',
    name: 'Bright Magenta',
    description: 'Color for ANSI Bright Magenta text.',
    path: ['xterm', 'theme', 'brightMagenta'],
  },
  {
    type: 'color',
    name: 'Bright White',
    description: 'Color for ANSI Bright White text.',
    path: ['xterm', 'theme', 'brightWhite'],
  },
]);

selectionColorOption.get = function getInput() {
  return (
    this.el.querySelector('input').value +
    Math.round(
      selectionColorOpacityOption.el.querySelector('input').value * 255,
    ).toString(16)
  );
};
selectionColorOption.set = function setInput(value) {
  this.el.querySelector('input').value = value.substring(0, 7);
  selectionColorOpacityOption.el.querySelector('input').value =
    Math.round((parseInt(value.substring(7), 16) / 255) * 100) / 100;
};
selectionColorOpacityOption.get = () => 0;
selectionColorOpacityOption.set = () => 0;
