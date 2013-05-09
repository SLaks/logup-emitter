/*jshint node: true, camelcase: true, eqeqeq: true, immed: true, latedef: false, newcap: true, noarg: true, undef: true, globalstrict: true*/
"use strict";

var browserify = require('browserify-middleware');
var express = require('express');
var path = require('path');
var fs = require('fs');

var app = express();

var port = 56487; //logup + 0
var testDir = path.dirname(__dirname) + "/test";
var testFiles = fs.readdirSync(testDir)
	.filter(RegExp.prototype.test.bind(/\btests?\b/))
	.map(function (name) { return path.join(testDir, name); });

app.get('/', function (req, res) { return res.sendfile(__dirname + "/run-tests.html"); });
app.get('/js/mocha.js', function (req, res) { return res.sendfile(require.resolve('mocha/mocha')); });
app.get('/css/mocha.css', function (req, res) { return res.sendfile(require.resolve('mocha/mocha.css')); });

app.get('/js/define-tests.js', browserify(testFiles));
app.get('/js/include-tests.js', function (req, res) {
	res.set('Content-Type', 'application/javascript');
	res.send(testFiles
		.map(function (path) { return "require(" + JSON.stringify(path) + ")"; })
		.join(';\n')
	);
});

require('http').createServer(app).listen(port);
console.log("Go to http://localhost:" + port);