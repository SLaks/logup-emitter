/*jshint node: true, camelcase: true, eqeqeq: true, forin: true, immed: true, latedef: true, newcap: true, noarg: true, undef: true, globalstrict: true*/
/*global describe:false, it:false, mocha: false */
"use strict";

var expect = require('expect.js');

var CollectingHub = require('./utils/CollectingHub');

var fs = require('fs');
var exec = require('child_process').exec;

/**
 * Runs the source in the code function in a separate process.
 * This should be called sparingly, since it can't work within
 * browserify.
 */
function runProcess(code, cb) {
	if (typeof code !== 'function' || code.length !== 0)
		throw new Error("code must be a function with no parameters");
	var source = "(\n" + code.toString() + "\n)();";

	var filename = __dirname + "/runProcess-temp-" + process.pid + "-" + (runProcess.counter = (runProcess.counter || 0) + 1) + ".js";
	fs.writeFile(filename, source, "utf8", function (err) {
		if (err) {
			fs.unlink(filename);
			return cb(err);
		}
		exec('node "' + filename + '"', function () {
			fs.unlink(filename);
			cb.apply(this, arguments);
		});
	});
}

/**
 * Creates a new logger on a module loaded by the current module.
 */
function getChildLogger() {
	return require('./fixtures/export-emitter');
}

describe("Logger", function () {
	describe("when there is no hub", function () {
		describe("when the process exists", function () {
			// All of these tests work by starting a new process
			// and reading the output after it exits. This can't
			// be done in browserify.
			if (process.browser) return;
			describe("when the entire process is synchronous", function () {
				it("should write logged messages to stderr on exit", function (done) {
					runProcess(
						function () {
							var logger = require('..').createLogger(module);
							logger.info("Line 1");
							console.error("Line 2");
							logger.warn("Line 3");
						},
						function (err, stdout, stderr) {
							if (err) return done(err);
							expect(stdout.length).to.be(0);
							expect(stderr.toString()).to.match(/.*Line 2\n.*Line 1\n.*Line 3\n$/);
							done();
						}
					);
				});
				it("should not emit trace logs", function (done) {
					runProcess(
						function () {
							var logger = require('..').createLogger(module);
							logger.trace("You shouldn't see me!");
						},
						function (err, stdout, stderr) {
							if (err) return done(err);
							expect(stdout.length).to.be(0);
							expect(stderr.length).to.be(0);
							done();
						}
					);
				});
				it("should write log messages with original timestamps", function (done) {
					function extractDate(line) {
						return Date.parse(/^warn ([\d\-TZ.:]+) /.exec(line)[1]);
					}

					runProcess(
						function () {
							var logger = require('..').createLogger(module);
							logger.warn("Early message");
							var now = Date.now();
							while (Date.now() === now);	// Wait for time to pass
							console.info(Date.now());
							now = Date.now();
							while (Date.now() === now);	// Wait for time to pass
							logger.warn("Late message");
						},
						function (err, stdout, stderr) {
							if (err) return done(err);
							var middleDate = parseInt(stdout, 10);
							var lines = stderr.toString().split('\n');
							expect(extractDate(lines[0])).to.be.below(middleDate);
							expect(extractDate(lines[1])).to.be.above(middleDate);
							done();
						}
					);
				});
			});
			describe("when another tick occurs", function () {
				it("should write logged messages to stderr after nextTick", function (done) {
					runProcess(
						function () {
							var logger = require('..').createLogger(module);
							logger.info("Line 1");
							console.error("Line 2");
							logger.warn("Line 3");
							process.nextTick(function () {
								logger.error("Line 4");
								console.error("Line 5");
							});
						},
						function (err, stdout, stderr) {
							if (err) return done(err);
							expect(stdout.length).to.be(0);
							expect(stderr.toString()).to.match(/.*Line 2\n.*Line 1\n.*Line 3\n.*Line 4\n.*Line 5\n$/);
							done();
						}
					);
				});
			});

			// process.exit() doesn't flush pending IOs, so this appears to be
			// impossible to test.  https://github.com/joyent/node/issues/3737
			describe.skip("when the process.exit is called", function () {
				it("should write logged messages to stderr on exit", function (done) {
					runProcess(
						function () {
							var logger = require('..').createLogger(module);
							logger.info("Line 1");
							console.error("Line 2");
							logger.warn("Line 3");
							process.exit();
							logger.info("After exit!");
						},
						function (err, stdout, stderr) {
							if (err) return done(err);
							expect(stdout.length).to.be(0);
							expect(stderr.toString()).to.match(/.*Line 2\n.*Line 1\n.*Line 3\n$/);
							done();
						}
					);
				});
			});
		});
	});

	describe("when a hub is created before the logger", function () {
		it("should write all logs to the emitter", function () {
			var hub = new CollectingHub('info');
			hub.install(module);
			var logger = getChildLogger();

			logger.info("Hi!");
			logger.warn("Ouch!");

			expect(hub.messages.info[0]).to.have.property('message', 'Hi!');
			expect(hub.messages.warn[0]).to.have.property('message', 'Ouch!');

			hub.uninstall();
		});
		it("should ignore lower-level messages", function () {
			var hub = new CollectingHub('warn');
			hub.install(module);
			var logger = getChildLogger();

			logger.info("Hi!");
			logger.warn("Ouch!");

			expect(hub.messages.info).to.be.empty();
			expect(hub.messages.warn[0]).to.have.property('message', 'Ouch!');

			hub.uninstall();
		});
		it("should preserve relative time gaps", function () {
			var hub = new CollectingHub('info');
			hub.install(module);
			var logger = getChildLogger();

			logger.warn("Early message");
			var now = Date.now();
			while (Date.now() === now);	// Wait for time to pass
			var middle = Date.now();
			now = Date.now();
			while (Date.now() === now);	// Wait for time to pass
			logger.warn("Late message");

			expect(hub.messages.warn[0]).to.have.property('message', 'Early message');
			expect(hub.messages.warn[0].timestamp).to.be.below(middle);
			expect(hub.messages.warn[1]).to.have.property('message', 'Late message');
			expect(hub.messages.warn[1].timestamp).to.be.above(middle);

			hub.uninstall();
		});
	});
	describe("when a hub is created after the logger", function () {
		it("should write all logs to the emitter", function (done) {
			var logger = getChildLogger();

			logger.info("Hi!");
			logger.warn("Ouch!");

			var hub = new CollectingHub('info');
			hub.install(module);
			process.nextTick(function () {
				expect(hub.messages.info[0]).to.have.property('message', 'Hi!');
				expect(hub.messages.warn[0]).to.have.property('message', 'Ouch!');

				hub.uninstall();
				done();
			});
		});
		it("should ignore lower-level messages", function (done) {
			var logger = getChildLogger();

			logger.info("Hi!");
			logger.warn("Ouch!");

			var hub = new CollectingHub('warn');
			hub.install(module);
			process.nextTick(function () {
				expect(hub.messages.info).to.be.empty();
				expect(hub.messages.warn[0]).to.have.property('message', 'Ouch!');

				hub.uninstall();
				done();
			});
		});
		it("should preserve relative time gaps", function (done) {
			var logger = getChildLogger();

			logger.warn("Early message");
			var now = Date.now();
			while (Date.now() === now);	// Wait for time to pass
			var middle = Date.now();
			now = Date.now();
			while (Date.now() === now);	// Wait for time to pass
			logger.warn("Late message");

			var hub = new CollectingHub('info');
			hub.install(module);
			process.nextTick(function () {
				expect(hub.messages.warn[0]).to.have.property('message', 'Early message');
				expect(hub.messages.warn[0].timestamp).to.be.below(middle);
				expect(hub.messages.warn[1]).to.have.property('message', 'Late message');
				expect(hub.messages.warn[1].timestamp).to.be.above(middle);

				hub.uninstall();
				done();
			});
		});
	});
});