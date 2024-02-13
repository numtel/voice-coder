const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const {minimatch} = require('minimatch');

const hostname = '127.0.0.1';
const port = 3000;

const allowed = {
  '/': {file: 'index.html', mime: 'text/html'},
  '/main.js': {mime: 'application/javascript'},
  '/style.css': {mime: 'text/css'},
  '/lib/*.js': {mime: 'application/javascript'},
};

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // Serve frontend files
  if (Object.keys(allowed).some(pattern => minimatch(pathname, pattern))) {
    const matchedPattern = Object.keys(allowed).find(pattern => minimatch(pathname, pattern));
    const indexPath = path.join(__dirname, allowed[matchedPattern].file || pathname.slice(1));
    fs.readFile(indexPath, (err, data) => {
      if (err) {
        res.statusCode = 500;
        res.end('Error loading the index page');
        return;
      }
      res.setHeader('Content-Type', allowed[matchedPattern].mime || 'text/plain');
      res.end(data);
    });
    return;
  }

  // Process API requests for files
  if (pathname.startsWith('/file/')) {
    const filename = pathname.replace('/file/', '');
    const filePath = path.join(__dirname, filename);
    if(!filePath.startsWith(__dirname)) {
      res.statusCode = 403;
      res.end('Forbidden');
      return;
    }

    // Handle GET request to load file content
    if (req.method === 'GET') {
      fs.readFile(filePath, (err, data) => {
        if (err) {
          res.statusCode = 404;
          res.end('File not found');
          return;
        }
        res.setHeader('Content-Type', 'text/plain');
        res.end(data);
      });
    }
    // Handle POST request to save file content
    else if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });
      req.on('end', () => {
        fs.writeFile(filePath, body, err => {
          if (err) {
            res.statusCode = 500;
            res.end('Failed to save the file');
            return;
          }
          res.end('File saved successfully');
        });
      });
    } else {
      res.statusCode = 405;
      res.end('Method Not Allowed');
    }
    return;
  }

  // For all other requests, return 404
  res.statusCode = 404;
  res.end('Not Found');
});

server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});

