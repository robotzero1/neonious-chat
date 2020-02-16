let http = require('http');
let fs = require('fs');
let WebSocket = require('ws');
let wss = new WebSocket.Server({ noServer: true });
let avatarsFolder = fs.readdirSync('www/images/gif');

let httpServer = http.createServer((req, res) => {

    var url = req.url;

    if (url == '/getimages') {
        var jsonAvatars = [];
        avatarsFolder.forEach(file => {
            jsonAvatars.push({ 'name': file.split('.')[0] })
        });
        res.writeHead(200, {"Content-Type": "text/text"});
        res.end(JSON.stringify(jsonAvatars));
        return;
    }


    var contentType;

    switch (url.substr(-4)) {
        case '.png':
            contentType = 'image/png';
            break;
        case '.gif':
            contentType = 'image/gif';
           // const data = fs.readFileSync('/www/' + req.url);
           // res.writeHead(200, {"Content-Type": contentType});
           // res.end(data);
           // return;
            break;
        case '.css':
            contentType = 'text/css';
            break;
        case '.mp3':
            contentType = 'audio/mpeg';
            break
        default:
            contentType = 'text/html';
    }

    fs.readFile('/www/' + (req.url == '/' ? 'index.html' : req.url), (err, data) => {
        if (err) {
            res.end('fs.readFile error: ' + err);
        } else {
        res.writeHead(200, {"Content-Type": contentType});
        //console.log(req.url);
        res.end(data);
        }
    });


    //var stream = fs.createReadStream('www/' + url);
    //stream.on('error', function (err) {
    //    res.statusCode = 404;
    //    res.end(err.message);
    //});
    //stream.pipe(res);

}).listen(80);

wss.on('connection', function connection(ws) {
    ws.on('message', function incoming(data) {

        messageDetail = JSON.parse(data);

        var numberMessages = Object.keys(chatHistory).length;
        // Add an object after the last one (chatHistory starts at 0)
        chatHistory[numberMessages] = { person: messageDetail.messageUser, message: messageDetail.messageText };

        //console.log(chatHistory);
        writeToChatHistory(chatHistory);

        wss.clients.forEach(function each(client) {
            //console.log('sending to client(s)');
            if (client.readyState === WebSocket.OPEN){
                client.send(data);
                //console.log('sent');
            }
        });
    });
    ws.send(JSON.stringify({ type: 'history', data: chatHistory }));
});

function upgradeToWSS(req, socket, head) {
 //console.log("upgradeToWSS");   
    if (req.url === '/Chat') {
        //console.log("webbrowser connected to chat");

        wss.handleUpgrade(req, socket, head, function done(ws) {
            wss.emit('connection', ws, req);
        });

    } else
        socket.destroy();
}

function writeToChatHistory(chatHistory) {
    
    fs.writeFile('/chat-history.json', JSON.stringify(chatHistory), (err) => {
        if (err) throw err;
        //console.log(JSON.stringify(chatHistory) + ' has been saved!');
    });
}


fs.readFile('/chat-history.json', function read(err, data) {
    if (err) {
        console.log('new history');
        chatHistory = {
            0: { person: 'Server', message: 'Hello, Welcome to Chat' }
        }
    } else {
        console.log('read history');
        chatHistory = JSON.parse(data);
    }
});




/*

try {
    chatHistory = JSON.parse(fs.readFileSync('/mydata.json', 'utf8'));
    //var jsondata = fs.readFileSync('/mydata.json');
    //console.log(jsondata.toString());    
} catch (e) {
    console.log('new history');
    // file does not exist or not valid, so reset object
    chatHistory = {
        0: { person: 'server', message: 'Hello, Welcome to Chat' }
    }
}
*/
httpServer.on('upgrade', upgradeToWSS);