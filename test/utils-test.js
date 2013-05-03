/*jshint node: true, camelcase: true, eqeqeq: true, forin: true, immed: true, latedef: true, newcap: true, noarg: true, undef: true, globalstrict: true*/
/*global describe:false, it:false, mocha: false */
"use strict";

require("es5-shim/es5-sham");
var expect = require('expect.js');

var util = require('..').util;

describe('util.displayName', function () {
	it('should return the base filename for non-boring names', function () {
		expect(util.displayName('/pack/lib/do-this.js')).to.be('do-this.js');
		expect(util.displayName('\\pack\\tests.coffee')).to.be('tests.coffee');
	});

	it('should return the containing directory for index files', function () {
		expect(util.displayName('/pack/routes/index.js')).to.be('routes/');
		expect(util.displayName('\\pack\\views\\index.coffee')).to.be('views/');
	});

	it('should return the parent directory for lib/', function () {
		expect(util.displayName('/pack/lib/index.js')).to.be('pack/lib/');
		expect(util.displayName('\\pack\\views\\lib\\index.coffee')).to.be('views/lib/');
	});
});

describe('util.sourceLabel', function () {
	it('should return the package name and the base filename for non-boring names', function () {
		expect(util.sourceLabel({
			packageInfo: { name: "thingy" },
			filename: '/node_modules/thingy/lib/do-this.js'
		})).to.be('thingy/do-this.js');
	});

	it('should skip duplicate package name for ./lib/', function () {
		expect(util.sourceLabel({
			packageInfo: { name: "thingy" },
			filename: '/node_modules/thingy/lib/index.js'
		})).to.be('thingy/lib/');
	});

	it('should skip duplicate package name for ./index.js', function () {
		expect(util.sourceLabel({
			packageInfo: { name: "thingy" },
			filename: '/node_modules/thingy/index.js'
		})).to.be('thingy/index.js');
	});
});