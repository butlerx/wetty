// NOTE text selection on double click or select
const copyToClipboard = (text: string) : boolean => {
    if (window.clipboardData && window.clipboardData.setData) {
        window.clipboardData.setData("Text", text);
        return true;
    } if (document.queryCommandSupported && document.queryCommandSupported("copy")) {
        const textarea = document.createElement("textarea");
        textarea.textContent = text;
        textarea.style.position = "fixed";
        document.body.appendChild(textarea);
        textarea.select();
        try {
            document.execCommand("copy");
            return true;
        } catch (ex) {
            console.warn("Copy to clipboard failed.", ex);
            return false;
        } finally {
            document.body.removeChild(textarea);
        }
    }
    console.warn("Copy to clipboard failed.");
    return false;
}

export default copyToClipboard;