/*jshint node: true, camelcase: true, eqeqeq: true, forin: true, immed: true, latedef: false, newcap: true, noarg: true, undef: true, globalstrict: true*/
"use strict";

var path = require('path');

var myPackage = require('../package.json');

var Logger;	// Assigned in createLogger(), since require('./logger') calls createLogger() before returning.
exports.util = require('./util');
exports.levels = require('./levels');
exports.defaults = require('./env-defaults');
var protocolVersion = exports.protocolVersion = myPackage.protocolVersion;

if (!module.require)
	module.require = require;	// Fix missing member in browserify v1

// This function must be exported first so
// that files in this package can call it.

/**
 * Creates a logger object that emits logs associated with the given module.
 */
exports.createLogger = function (module) {
	if (!Logger)		// This is called as we first require logger (to create its logger), before we assign its export
		Logger = require('./logger');

	return new Logger(module, {
		protocolVersion: protocolVersion,
		packageInfo: ensurePackage(findPackage(module)),
		filename: module.filename
	});
};

var logger = require('../').createLogger(module);

exports.Emitter = require('./emitter');

/**
 * Creates a logger object that emits logs associated with a package required by the given module.
 */
exports.createSubpackageLogger = function (module, subPackageName) {
	var subPackage = tryRequire(module, subPackageName + "/package.json");

	if (!subPackage) {
		logger.warn("Couldn't require('" + subPackageName + "/package.json').  Falling back to dummy package info. Are you running in Browserify without browserify-logup-packages?");
		subPackage = { name: subPackageName, isDummy: true };
	}
	if (!subPackage.name) {
		logger.warn("require('" + subPackageName + "/package.json') doesn't have package name.  Falling back to dummy package info. Are you running in Browserify without browserify-logup-packages?");
		subPackage.name = subPackageName;
		subPackage.isDummy = true;
	}

	return new Logger(module, {
		protocolVersion: exports.protocolVersion,
		packageInfo: subPackage
	});
};

/**
 * Requires a file, returning null if the file doesn't exist.
 * @param {Module} [fromModule]	The module to load the file relative to.  If omitted, will load from the current module.
 * @param {String} path			The path to load
 */
function tryRequire(fromModule, path) {
	if (arguments.length === 1) {
		path = fromModule;
		fromModule = module;
	}
	if (!fromModule.require)
		return null;
	try {
		return fromModule.require(path);
	} catch (e) {
		if (/^Cannot find module '/.test(e.message))
			return null;
		throw e;
	}
}

/**
 * Attempts to find the path and contents of the npm package.json file containing a calling module.
 * @param {Module}	module	The module object from a file within the package
 */
function findPackage(module) {
	if (!module.filename) {
		return {
			body: {
				isDummy: true,
				name: "unknown-module-" + (module['logup-unnamed-id']
										|| (module['logup-unnamed-id']
											= (global['logup-next-id'] = 1 + (global['logup-next-id'] || 0)))
										   )
			}
		};
	}

	// First, try to find a file of the form .../node_modules/package.json
	// Use a greedy wildcard to find the last /node_modules/ in the path.
	var dir = module.filename.replace(/^((?:.*\/)?node_modules\/[^\/]+)\/.+$/, "$1");
	var packageInfo = tryRequire(dir + "/package.json");

	if (packageInfo)
		return { dir: dir, body: packageInfo };

	// If the path doesn't have any node_modules folder (eg,
	// the entry-point app), iterate through the directories
	// and look for any package.json
	dir = module.filename;
	while (true) {
		var parent = path.dirname(dir);
		if (parent === dir)	// path.dirname(root) === root
			break;
		dir = parent;

		packageInfo = tryRequire(dir + "/package.json");

		if (packageInfo)
			return { dir: dir, body: packageInfo };
	}
	// If we can't find anything, give up and return the original path only
	return { dir: module.filename };
}

/**
 * Ensures that a located package.json exists and has relevant information.
 * @param {Object}	info	The object returned by findPackage()
 */
function ensurePackage(info) {
	// If we already found a package, and it has a name, it's usable
	if (info.body && info.body.name)
		return info.body;

	if (!info.body) {
		logger.warn("Couldn't locate package.json for " + info.dir + ".  Falling back to dummy package info. Are you running in Browserify without browserify-logup-packages?");
		info.body = {};
	} else
		logger.warn("require('" + info.dir + "/package.json') doesn't have package name.  Falling back to dummy package info. Are you running in Browserify without browserify-logup-packages?");

	info.body.isDummy = true;

	// If we couldn't find a package.json at all,
	// or if we found one without a package name,
	// try to guess a likely package name. First,
	// check whether it has a /node_modules/ dir,
	// and extract the folder after the last one.
	var parsedPath = /^(?:.*\/)?node_modules\/([^\/]+)\//.exec(info.dir);
	if (parsedPath)
		info.body.name = parsedPath[1];
	else {
		var basename, parentDir = info.dir;
		do {
			basename = path.basename(parentDir);
			parentDir = path.dirname(parentDir);
		} while (/\.(js(on)?|coffee)$/.test(basename) || basename === 'lib' || basename === 'node_modules');
		info.body.name = basename;
	}
	return info.body;
}