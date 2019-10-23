// NOTE text selection on double click or select
const copyToClipboard = (text: string) : any => {
    if (window.clipboardData && window.clipboardData.setData) {
        return window.clipboardData.setData("Text", text);
    } if (document.queryCommandSupported && document.queryCommandSupported("copy")) {
        const textarea = document.createElement("textarea");
        textarea.textContent = text;
        textarea.style.position = "fixed";
        document.body.appendChild(textarea);
        textarea.select();
        try {
            return document.execCommand("copy");
        } catch (ex) {
            console.warn("Copy to clipboard failed.", ex);
            return false;
        } finally {
            document.body.removeChild(textarea);
        }
    }
}

export default copyToClipboard;