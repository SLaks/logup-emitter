/*jshint node: true, camelcase: true, eqeqeq: true, forin: true, immed: true, latedef: true, newcap: true, noarg: true, undef: true, globalstrict: true*/
/*global describe:false, it:false, mocha: false */
"use strict";

require("es5-shim/es5-sham");
var expect = require('expect.js');

var testUtils = require('./utils');

function strip(output){
	return output.replace(/\u001b\[\d+m/g, '');
}

describe("StubHub", function () {
	// All of these tests work by starting a new process
	// and reading the output after it exits. This can't
	// be done in browserify.
	if (process.browser) return;
	process.env.LOGUP_DEFAULTS = "*:info";
	it("should include messages for error instances", function (done) {
		testUtils.runProcess(
			function () {
				var logger = require('..').createLogger(module);
				logger.error("Oh no!", new Error("Evil occurred!"));
			},
			function (err, stdout, stderr) {
				if (err) return done(err);
				expect(stderr.toString()).to.match(/Oh no!.*Evil occurred!/);
				done();
			}
		);
	});
	it("should include custom properties on error instances", function (done) {
		testUtils.runProcess(
			function () {
				var logger = require('..').createLogger(module);
				var err = new Error("Evil occurred!");
				err.index = 42;
				err.source = "XSS!";
				logger.error("Oh no!", err);
			},
			function (err, stdout, stderr) {
				if (err) return done(err);
				expect(strip(stderr)).to.match(/Oh no!.*Evil occurred![\s\S]*index: 42[\s\S]*source: 'XSS!'/);
				done();
			}
		);
	});
	it("should include stack traces for error instances", function (done) {
		testUtils.runProcess(
			function () {
				var logger = require('..').createLogger(module);
				function explode() {
					logger.error("Oh no!", new Error("Evil occurred!"));
				}

				function MyClass() {
				}

				MyClass.prototype.startGoing = function startGoing() {
					explode();
				};
				new MyClass().startGoing();
			},
			function (err, stdout, stderr) {
				if (err) return done(err);
				expect(strip(stderr)).to.match(/Oh no!.*Evil occurred![\s\S]*\n {4,}at explode.*\n {4}at MyClass\.startGoing/);
				done();
			}
		);
	});
	it("should include stack traces for error instances inside arrays", function (done) {
		testUtils.runProcess(
			function () {
				var logger = require('..').createLogger(module);
				function explode() {
					logger.error("Oh no!", ["This user", { cause: new Error("Evil occurred!") }]);
				}
				explode();
			},
			function (err, stdout, stderr) {
				if (err) return done(err);
				expect(strip(stderr)).to.match(/Oh no!.*'This user',[\s\S]*cause: [\s\S]*Evil occurred![\s\S]*\n {4,}at explode/);
				done();
			}
		);
	});
	it("should not duplicate error messages", function (done) {
		testUtils.runProcess(
			function () {
				var logger = require('..').createLogger(module);
				logger.error("Oh no!", new Error("Evil"));
			},
			function (err, stdout, stderr) {
				if (err) return done(err);
				expect(strip(stderr)).to.not.match(/Evil[\s\S]*Evil/);
				done();
			}
		);
	});
});