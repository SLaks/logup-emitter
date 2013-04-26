/*jshint node: true, camelcase: true, eqeqeq: true, forin: true, immed: true, latedef: true, newcap: true, noarg: true, undef: true, globalstrict: true*/
/*global describe:false, it:false */
"use strict";

var mocha = require("mocha");
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