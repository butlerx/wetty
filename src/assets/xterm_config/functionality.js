function optionGenericGet() { return this.el.querySelector("input").value; }
function optionGenericSet(value) { this.el.querySelector("input").value = value; }
function optionEnumGet() { return this.el.querySelector("select").value; }
function optionEnumSet(value) { this.el.querySelector("select").value = value; }

const allOptions = [];
function inflateOptions(optionsSchema) {
	const booleanOption = document.querySelector("#boolean_option.templ");
	const enumOption = document.querySelector("#enum_option.templ");
	const textOption = document.querySelector("#text_option.templ");
	const numberOption = document.querySelector("#number_option.templ");
	const colorOption = document.querySelector("#color_option.templ");

	function copyOver(element) {
		while (element.children.length > 0) document.body.append(element.children[0]);
	}

	optionsSchema.forEach(option => {
		let el;
		option.get = optionGenericGet.bind(option);
		option.set = optionGenericSet.bind(option);

		switch (option.type) {
			case "boolean":
				el = booleanOption.cloneNode(true);
				break;

			case "enum":
				el = enumOption.cloneNode(true);
				option.enum.forEach(varriant => {
					const optionEl = document.createElement("option");
					optionEl.innerText = varriant;
					optionEl.value = varriant;
					el.querySelector("select").appendChild(optionEl);
				});
				option.get = optionEnumGet.bind(option);
				option.set = optionEnumSet.bind(option);
				break;

			case "text":
				el = textOption.cloneNode(true);
				break;

			case "number":
				el = numberOption.cloneNode(true);
				break;

			case "color":
				el = colorOption.cloneNode(true);
				break;

			default:
				throw new Error(`Unknown option type ${  option.type}`);
		}

		el.querySelector(".title").innerText = option.name;
		el.querySelector(".desc").innerText = option.description;
		[ option.el ] = el.children;
		copyOver(el);
		allOptions.push(option);
	});
}

function getItem(json, path) {
	const mypath = path[0];
	if (path.length === 1) return json[mypath];
	if (json[mypath] != null) return getItem(json[mypath], path.slice(1));
	return null;
}
function setItem(json, path, item) {
	const mypath = path[0];
	if (path.length === 1) json[mypath] = item;
	else {
		if (json[mypath] == null) json[mypath] = {};
		setItem(json[mypath], path.slice(1), item);
	}
}

window.loadOptions = function(config) {
	allOptions.forEach(option => {
		let value = getItem(config, option.path);
		if (option.nullable === true && option.type === "text" && value == null) value = null;
		else if (option.nullable === true && option.type === "number" && value == null) value = -1;
		else if (value == null) return;
		if (option.json === true && option.type === "text") value = JSON.stringify(value);
		option.set(value);
		option.el.classList.remove("unbounded");
	});
}

if (window.top === window) alert("Error: Page is top level. This page is supposed to be accessed from inside Wetty.");

document.querySelector("#save_button").addEventListener("click", () => {
	const newConfig = {};
	allOptions.forEach(option => {
		let newValue = option.get();
		if (option.nullable === true && option.type === "text" && newValue === "") newValue = null;
		else if (option.nullable === true && option.type === "number" && newValue < 0) newValue = null;
		if (option.json === true && option.type === "text") newValue = JSON.parse(newValue);
		setItem(newConfig, option.path, newValue);
	});
	window.wetty_apply_config(newConfig);
	window.wetty_close_config();
});
document.querySelector("#cancel_button").addEventListener("click", () => {
	window.wetty_close_config();
});
