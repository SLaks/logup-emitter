/*jshint node: true, camelcase: true, eqeqeq: true, forin: true, immed: true, latedef: true, newcap: true, noarg: true, undef: true, globalstrict: true*/
/*global describe:false, it:false, mocha: false */
"use strict";

require("es5-shim/es5-sham");
var expect = require('expect.js');

var CollectingHub = require('./utils/CollectingHub');

describe("Logger.source", function () {
	if (!module.filename && !module.parent) {
		describe("when module.filename or module.parent don't work", function () {
			it("cannot find regular sources");

			it("should create a dummy package", function () {
				var logger = require('./fixtures/dummy-app');

				expect(logger.source.filename).to.not.be.ok();
				expect(logger.source.packageInfo).to.have.property('isDummy', true);
				expect(logger.source.packageInfo.name).to.match(/^unknown-module/);
			});

			describe("when the two loggers are created for the same module", function () {
				it("should use the same module name", function () {
					var logger1 = require('./fixtures/export-emitter')();
					var logger2 = require('./fixtures/export-emitter')();

					expect(logger1.source.packageInfo.name).to.be(logger2.source.packageInfo.name);
				});
			});

			describe("when the two loggers are created for different modules", function () {
				it("should use the same module name", function () {
					var logger1 = require('./fixtures/myapp/bin/run');
					var logger2 = require('./fixtures/myapp/stuff');

					expect(logger1.source.packageInfo.name).to.not.eql(logger2.source.packageInfo.name);
				});
			});

			describe("when used in a subpackage", function () {
				it("should make a named dummy package", function () {
					var logger = require('./fixtures/package-wrapper');

					expect(logger.source.filename).to.not.be.ok();
					expect(logger.source.packageInfo).to.eql({
						"name": "library",
						"isDummy": true
					});
				});
			});
		});
		return;
	}

	describe("when not in any module folder", function () {
		it("should still find the containing package.json", function () {
			var appPackage = {
				"name": "myapp",
				"version": "0.0.0"
			};

			var logger = require('./fixtures/myapp/bin/run');
			expect(logger.source.filename).to.contain("run.js");
			expect(logger.source.packageInfo).to.eql(appPackage);

			logger = require('./fixtures/myapp/stuff');
			expect(logger.source.filename).to.contain("stuff.js");
			expect(logger.source.packageInfo).to.eql(appPackage);
		});
		describe("when the package has been stripped by browserify", function () {
			it("should find the package.json and add a dummy name", function () {
				var logger = require('./fixtures/dummy-app');

				expect(logger.source.filename).to.contain("run.js");
				expect(logger.source.packageInfo).to.eql({
					"name": "dummy-app",
					"isDummy": true,
					"main": "bin/run.js"
				});
			});
		});
	});
	describe("when in a node_module", function () {
		it("should find the package.json", function () {
			var logger = require('./fixtures/node_modules/library');
			expect(logger.source.filename).to.contain("index.js");
			expect(logger.source.packageInfo).to.eql({
				"name": "library",
				"version": "0.0.0",
				"main": "lib/index.js"
			});
		});
		describe("when the package has been stripped by browserify", function () {
			it("should find the package.json and add a dummy name", function () {
				var logger = require('./fixtures/node_modules/dummy');

				expect(logger.source.filename).to.contain("index.js");
				expect(logger.source.packageInfo).to.eql({
					"name": "dummy",
					"isDummy": true,
					"main": "lib/index.js"
				});
			});
		});
	});
	describe("when in a nested node_module", function () {
		it("should find the package.json for the inner module", function () {
			var logger = require('./fixtures/node_modules/library/node_modules/common');
			expect(logger.source.filename).to.contain("utils.js");
			expect(logger.source.packageInfo).to.eql({
				"name": "common",
				"version": "0.0.0",
				"main": "utils.js"
			});
		});
	});

	describe("when used in a subpackage", function () {
		it("should find the package.json", function () {
			var logger = require('./fixtures/package-wrapper');
			expect(logger.source.filename).to.not.be.ok();
			expect(logger.source.packageInfo).to.eql({
				"name": "library",
				"version": "0.0.0",
				"main": "lib/index.js"
			});
		});
	});
});