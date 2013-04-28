/*jshint node: true, camelcase: true, eqeqeq: true, forin: true, immed: true, latedef: true, newcap: true, noarg: true, undef: true, globalstrict: true*/
/*global describe:false, it:false, mocha: false */
"use strict";

var expect = require('expect.js');

var CollectingHub = require('./utils/CollectingHub');

describe("Logger.source", function () {
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
			expect(logger.filename).to.not.be.ok();
			expect(logger.source.packageInfo).to.eql({
				"name": "library",
				"version": "0.0.0",
				"main": "lib/index.js"
			});
		});
	});
});