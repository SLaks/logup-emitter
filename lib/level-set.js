/*jshint node: true, camelcase: true, eqeqeq: true, forin: true, immed: true, latedef: false, newcap: true, noarg: true, undef: true, globalstrict: true*/
"use strict";

var levels = require('./levels');

function LevelSet() {
	this.packages = {};
	this.all = 999;
}
LevelSet.prototype.forPackage = function (name) {
	if (this.packages.hasOwnProperty(name))
		return this.packages[name];
	else
		return this.all;
};

function parseDefaults(str) {
	var retVal = new LevelSet();
	if (!str)
		return retVal;

	var items = str.split(/\s*,\s*/);
	for (var i = 0; i < items.length; i++) {
		var split = items[i].split(/\s*:\s*/);
		if (split.length !== 2)
			throw new Error("Invalid LogUp default string '" + items[i] + "'");

		var value = levels.values[split[1]];
		if (typeof value !== 'number')
			throw new Error("Unknown level in LogUp default string '" + items[i] + "'");

		if (split[0] === "*")
			retVal.all = value;
		else
			retVal.packages[split[0]] = value;
	}
	return retVal;
}
module.exports = {
	parse: parseDefaults,
	env: parseDefaults(process.env.LOGUP_DEFAULTS)
};