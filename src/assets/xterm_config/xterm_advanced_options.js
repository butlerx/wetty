window.inflateOptions([
	{
		type: "boolean",
		name: "Allow Proposed XTerm APIs",
		description: "When set to false, any experimental/proposed APIs will throw errors.",
		path: ["xterm", "allowProposedApi"],
	},
	{
		type: "boolean",
		name: "Allow Transparent Background",
		description: "Whether the background is allowed to be a non-opaque color.",
		path: ["xterm", "allowTransparency"],
	},
	{
		type: "text",
		name: "Bell Sound URI",
		description: "URI for a custom bell character sound.",
		path: ["xterm", "bellSound"],
		nullable: true,
	},
	{
		type: "enum",
		name: "Bell Style",
		description: "How the terminal will react to the bell character",
		path: ["xterm", "bellStyle"],
		enum: ["none", "sound"],
	},
	{
		type: "boolean",
		name: "Force End-Of-Line",
		description: "When enabled, any new-line characters (\\n) will be interpreted as carriage-return new-line. (\\r\\n) Typically this is done by the shell program.",
		path: ["xterm", "convertEol"],
	},
	{
		type: "boolean",
		name: "Disable Stdin",
		description: "Whether input should be disabled",
		path: ["xterm", "disableStdin"],
	},
	{
		type: "number",
		name: "Letter Spacing",
		description: "The spacing in whole pixels between characters.",
		path: ["xterm", "letterSpacing"],
	},
	{
		type: "number",
		name: "Line Height",
		description: "Line height, multiplied by the font size to get the height of terminal rows.",
		path: ["xterm", "lineHeight"],
		float: true,
	},
	{
		type: "enum",
		name: "XTerm Log Level",
		description: "Log level for the XTerm library.",
		path: ["xterm", "logLevel"],
		enum: ["debug", "info", "warn", "error", "off"],
	},
	{
		type: "boolean",
		name: "Macintosh Option Key as Meta Key",
		description: "When enabled, the Option key on Macs will be interpreted as the Meta key.",
		path: ["xterm", "macOptionIsMeta"],
	},
	{
		type: "boolean",
		name: "Macintosh Option Click Forces Selection",
		description: "Whether holding a modifier key will force normal selection behavior, regardless of whether the terminal is in mouse events mode. This will also prevent mouse events from being emitted by the terminal. For example, this allows you to use xterm.js' regular selection inside tmux with mouse mode enabled.",
		path: ["xterm", "macOptionClickForcesSelection"],
	},
	{
		type: "number",
		name: "Forced Contrast Ratio",
		description: "Miminum contrast ratio for terminal text. This will alter the foreground color dynamically to ensure the ratio is met. Goes from 1 (do nothing) to 21 (strict black and white).",
		path: ["xterm", "minimumContrastRatio"],
		float: true,
	},
	{
		type: "enum",
		name: "Renderer Type",
		description: "The terminal renderer to use. Canvas is preferred, but a DOM renderer is also available. Note: Letter spacing and cursor blink do not work in the DOM renderer.",
		path: ["xterm", "rendererType"],
		enum: ["canvas", "dom"],
	},
	{
		type: "boolean",
		name: "Right Click Selects Words",
		description: "Whether to select the word under the cursor on right click.",
		path: ["xterm", "rightClickSelectsWord"],
	},
	{
		type: "boolean",
		name: "Screen Reader Support",
		description: "Whether screen reader support is enabled. When on this will expose supporting elements in the DOM to support NVDA on Windows and VoiceOver on macOS.",
		path: ["xterm", "screenReaderMode"],
	},
	{
		type: "number",
		name: "Tab Stop Width",
		description: "The size of tab stops in the terminal.",
		path: ["xterm", "tabStopWidth"],
	},
	{
		type: "boolean",
		name: "Windows Mode",
		description: "\"Whether 'Windows mode' is enabled. Because Windows backends winpty and conpty operate by doing line wrapping on their side, xterm.js does not have access to wrapped lines. When Windows mode is enabled the following changes will be in effect:\n- Reflow is disabled.\n- Lines are assumed to be wrapped if the last character of the line is not whitespace.",
		path: ["xterm", "windowsMode"],
	},
	{
		type: "text",
		name: "Word Separator",
		description: "All characters considered word separators. Used for double-click to select word logic. Encoded as JSON in this editor for editing convienience.",
		path: ["xterm", "wordSeparator"],
		json: true,
	}
]);
		

		


