var term;
var ws;

function Wetty(argv) {
    this.argv_ = argv;
    this.io = null;
    this.pid_ = -1;
}

Wetty.prototype.run = function() {
    this.io = this.argv_.io.push();

    this.io.onVTKeystroke = this.sendString_.bind(this);
    this.io.sendString = this.sendString_.bind(this);
    this.io.onTerminalResize = this.onTerminalResize.bind(this);
}

Wetty.prototype.sendString_ = function(str) {
    ws.send(JSON.stringify({
        data: str
    }));
};

Wetty.prototype.onTerminalResize = function(col, row) {
    if (ws)
        ws.send(JSON.stringify({
            rowcol: true,
            col: col,
            row: row
        }));
};

ws = new WebSocket(((window.location.protocol === 'https:') ? 'wss://' : 'ws://') + window.location.host + window.location.pathname, 'wetty');
ws.onopen = function() {
    lib.init(function() {
        term = new hterm.Terminal();
        window.term = term;
        term.decorate(document.getElementById('terminal'));

        term.setCursorPosition(0, 0);
        term.setCursorVisible(true);
        term.runCommandClass(Wetty, document.location.hash.substr(1));
        ws.send(JSON.stringify({
            rowcol: true,
            col: term.screenSize.width,
            row: term.screenSize.height
        }));
    });
}
ws.onmessage = function(msg) {
    if (!msg || !msg.data)
        return;
    var data = JSON.parse(msg.data);
    if (term)
        term.io.writeUTF16(data.data);
}
ws.onerror = function(e) {
    console.log("WebSocket connection error");
}
ws.onclose = function() {
    console.log("WebSocket connection closed");
}
