/*jshint node: true, camelcase: true, eqeqeq: true, forin: true, immed: true, latedef: true, newcap: true, noarg: true, undef: true, globalstrict: true*/
/*global describe:false, it:false, mocha: false */
"use strict";

var expect = require('expect.js');

var testUtils = require('./utils');

/**
 * Creates a new logger on a module loaded by the current module.
 */
function getChildLogger() {
	return require('./fixtures/export-emitter')();
}

describe("Logger", function () {
	describe("when there is no hub", function () {
		describe("when the process exits", function () {
			// All of these tests work by starting a new process
			// and reading the output after it exits. This can't
			// be done in browserify.
			if (process.browser) return;
			describe("when the entire process is synchronous", function () {
				it("should write logged messages to stderr on exit", function (done) {
					testUtils.runProcess(
						function () {
							var logger = require('..').createLogger(module);
							logger.info("Line 1");
							console.error("Line 2");
							logger.warn("Line 3");
						},
						function (err, stdout, stderr) {
							if (err) return done(err);
							expect(stdout).to.be.empty();
							expect(stderr.toString()).to.match(/.*Line 2\n.*Line 1\n.*Line 3\n$/);
							done();
						}
					);
				});
				it("should not emit trace logs", function (done) {
					testUtils.runProcess(
						function () {
							var logger = require('..').createLogger(module);
							logger.trace("You shouldn't see me!");
						},
						function (err, stdout, stderr) {
							if (err) return done(err);
							expect(stdout).to.be.empty();
							expect(stderr).to.be.empty();
							done();
						}
					);
				});
				it("should write log messages with original timestamps", function (done) {
					function extractDate(line) {
						return Date.parse(/^warn ([\d\-TZ.:]+) /.exec(line)[1]);
					}

					testUtils.runProcess(
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
					testUtils.runProcess(
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
							expect(stdout).to.be.empty();
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
					testUtils.runProcess(
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
							expect(stdout).to.be.empty();
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
			var hub = new testUtils.CollectingHub('info');
			hub.install(module);
			var logger = getChildLogger();

			logger.info("Hi!");
			logger.error("Ouch!");

			expect(hub.messages.info[0]).to.have.property('message', 'Hi!');
			expect(hub.messages.error[0]).to.have.property('message', 'Ouch!');

			hub.uninstall();
		});
		it("should ignore lower-level messages", function () {
			var hub = new testUtils.CollectingHub('warn');
			hub.install(module);
			var logger = getChildLogger();

			logger.info("Hi!");
			logger.error("Ouch!");

			expect(hub.messages.info).to.be.empty();
			expect(hub.messages.error[0]).to.have.property('message', 'Ouch!');

			hub.uninstall();
		});
		it("should preserve relative time gaps", function () {
			var hub = new testUtils.CollectingHub('info');
			hub.install(module);
			var logger = getChildLogger();

			logger.error("Early message");
			var now = Date.now();
			while (Date.now() === now);	// Wait for time to pass
			var middle = Date.now();
			now = Date.now();
			while (Date.now() === now);	// Wait for time to pass
			logger.error("Late message");

			expect(hub.messages.error[0]).to.have.property('message', 'Early message');
			expect(hub.messages.error[0].timestamp).to.be.below(middle);
			expect(hub.messages.error[1]).to.have.property('message', 'Late message');
			expect(hub.messages.error[1].timestamp).to.be.above(middle);

			hub.uninstall();
		});
	});
	describe("when a hub is created after the logger", function () {
		it("should write all logs to the emitter", function (done) {
			var logger = getChildLogger();

			logger.info("Hi!");
			logger.error("Ouch!");

			var hub = new testUtils.CollectingHub('info');
			hub.install(module);
			process.nextTick(function () {
				expect(hub.messages.info[0]).to.have.property('message', 'Hi!');
				expect(hub.messages.error[0]).to.have.property('message', 'Ouch!');

				hub.uninstall();
				done();
			});
		});
		it("should ignore lower-level messages", function (done) {
			var logger = getChildLogger();

			logger.info("Hi!");
			logger.error("Ouch!");

			var hub = new testUtils.CollectingHub('warn');
			hub.install(module);
			process.nextTick(function () {
				expect(hub.messages.info).to.be.empty();
				expect(hub.messages.error[0]).to.have.property('message', 'Ouch!');

				hub.uninstall();
				done();
			});
		});
		it("should preserve relative time gaps", function (done) {
			var logger = getChildLogger();

			logger.error("Early message");
			var now = Date.now();
			while (Date.now() === now);	// Wait for time to pass
			var middle = Date.now();
			now = Date.now();
			while (Date.now() === now);	// Wait for time to pass
			logger.error("Late message");

			var hub = new testUtils.CollectingHub('info');
			hub.install(module);
			process.nextTick(function () {
				expect(hub.messages.error[0]).to.have.property('message', 'Early message');
				expect(hub.messages.error[0].timestamp).to.be.below(middle);
				expect(hub.messages.error[1]).to.have.property('message', 'Late message');
				expect(hub.messages.error[1].timestamp).to.be.above(middle);

				hub.uninstall();
				done();
			});
		});
	});
});