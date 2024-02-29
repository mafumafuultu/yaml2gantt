const http = require('http');
const fs = require('fs');
const mime = require('mime-types');
const path = require('path');
const {Server} = require('socket.io');
const jsyaml = require('js-yaml')
const taskfile = './tasks/task.yml';

const CONFIG = {
	port: 9000,
	host: 'localhost'
};
const server = http.createServer((req, res) => {
	var filePath = '.' + req.url;
	if (filePath == './') {
		filePath = './index.html';
	}
	
	var extname = String(path.extname(filePath)).toLowerCase();
	var contentType = mime.lookup(filePath) || 'application/octet-stream';
	fs.readFile(filePath, function(err, content) {
		if (err) {
			if (err.code == 'ENOENT') {
				fs.readFile('./404.html', function(err, content) {
					res.writeHead(404, {'Content-Type': 'text/html'});
					res.end(content, 'utf-8');
				});
			} else {
				res.writeHead(500);
				res.end('Sorry, check with the site admin for err: ' + err.code + ' ..\n');
			}
		} else {
			res.writeHead(200, {'Content-Type': contentType});
			res.end(content, 'utf-8');
		}
	});
});

server.listen(CONFIG.port, CONFIG.host, () => {
	const url = `http://${CONFIG.host}:${CONFIG.port}`;
	console.info(`Server running at ${url}/`);
});


const io = new Server(server);
io.on('connection', socket => {
	console.debug('connected');
	socket.on(`connect`, () => {
		console.debug(`connect`);
	});
	socket.on(`disconnect`, () => {
		console.debug(`disconnect`);
	});

	socket.on('save', saveYaml);
});

function saveYaml(data) {
	try {
		fs.writeFileSync(taskfile, jsyaml.dump(data), 'utf-8');
	} catch (e) {
		console.error('faild save', data);
	}
}
const readFile = name => {
	if (name) taskfile = name;
	fs.readFile(taskfile, 'utf-8', function(err, data) {
		if (err) throw err;
		io.emit('fswatch', data);
	})
};

fs.watch(taskfile, (e, fname) => fname ? readFile() : void 0);