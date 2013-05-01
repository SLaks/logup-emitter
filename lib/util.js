/*jshint node: true, camelcase: true, eqeqeq: true, forin: true, immed: true, latedef: false, newcap: true, noarg: true, undef: true, globalstrict: true*/
"use strict";

var nodeUtil = require('util');
var path = require('path');

exports.mixin = function mixin(target, additional) {
	for (var key in additional) {
		target[key] = additional[key];
	}
};

/**
 * Extracts a useful filename from a path to a .js file.
 * Avoids useless names like index.js or lib/
 */
exports.displayName = function (filename) {
	filename = filename.replace(/\\/g, '/');	// In case a Windows machine reports to a Linux machine, normalize all paths
	if (!/\/index\.[a-z]+$/.test(filename))
		return path.basename(filename);
	var retVal = path.basename(path.dirname(filename));
	if (retVal === 'lib')
		retVal = path.basename(path.dirname(path.dirname(filename))) + "/" + retVal;
	return retVal + '/';
};


/**
 * Extracts a useful filename from a logger source object. (including package name and filename, if available)
 */
exports.sourceLabel = function (source) {
	var filename = source.filename && source.filename.replace(/\\/g, '/');	// In case a Windows machine reports to a Linux machine, normalize all paths
	var shortFile = filename ? exports.displayName(filename) : "?";

	// Don't duplicate the package name for "node_modules/thingy/lib/index.js" or "node_modules/thingy/index.js" 
	if (shortFile === source.packageInfo.name + "/")
		shortFile = path.basename(filename);
	else if (shortFile.indexOf(source.packageInfo.name + "/") === 0)
		shortFile = shortFile.substr(source.packageInfo.name.length + 1);

	return source.packageInfo.name + "/" + shortFile;
};

// I copied this from node's util.js and added support for Error instances.
/**
 * Echoes the value of a value. Tries to print the value out
 * in the best way possible given the different types.
 *
 * @param {Object} obj The object to print out.
 * @param {Object} opts Optional options object that alters the output.
 */
/* legacy: obj, showHidden, depth, colors*/
function inspect(obj, opts) {
	// default options
	var ctx = {
		seen: [],
		stylize: stylizeNoColor
	};
	// legacy...
	if (arguments.length >= 3) ctx.depth = arguments[2];
	if (arguments.length >= 4) ctx.colors = arguments[3];
	if (typeof opts === 'boolean') {
		// legacy...
		ctx.showHidden = opts;
	} else if (opts) {
		// got an "options" object
		exports.mixin(ctx, opts);
	}
	// set default options
	if (typeof ctx.showHidden === 'undefined') ctx.showHidden = false;
	if (typeof ctx.depth === 'undefined') ctx.depth = 2;
	if (typeof ctx.colors === 'undefined') ctx.colors = false;
	if (typeof ctx.customInspect === 'undefined') ctx.customInspect = true;
	if (ctx.colors) ctx.stylize = stylizeWithColor;
	return formatValue(ctx, obj, ctx.depth);
}
exports.inspect = inspect;


// http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
inspect.colors = {
	'bold': [1, 22],
	'italic': [3, 23],
	'underline': [4, 24],
	'inverse': [7, 27],
	'white': [37, 39],
	'grey': [90, 39],
	'black': [30, 39],
	'blue': [34, 39],
	'cyan': [36, 39],
	'green': [32, 39],
	'magenta': [35, 39],
	'red': [31, 39],
	'yellow': [33, 39]
};

// Don't use 'blue' not visible on cmd.exe
inspect.styles = {
	'special': 'cyan',
	'number': 'yellow',
	'boolean': 'yellow',
	'undefined': 'grey',
	'null': 'bold',
	'string': 'green',
	'date': 'magenta',
	// "name": intentionally not styling
	'regexp': 'red',
	'stack': 'grey'
};


function stylizeWithColor(str, styleType) {
	var style = inspect.styles[styleType];

	if (style) {
		return '\u001b[' + inspect.colors[style][0] + 'm' + str +
			   '\u001b[' + inspect.colors[style][1] + 'm';
	} else {
		return str;
	}
}


function stylizeNoColor(str, styleType) {
	return str;
}


function arrayToHash(array) {
	var hash = {};

	array.forEach(function (val, idx) {
		hash[val] = true;
	});

	return hash;
}


function formatValue(ctx, value, recurseTimes) {
	// Provide a hook for user-specified inspect functions.
	// Check that value is an object with an inspect function on it
	if (ctx.customInspect && value && typeof value.inspect === 'function' &&
		// Filter out the util module, it's inspect function is special
		value.inspect !== exports.inspect &&
		// Also filter out any prototype objects using the circular check.
		!(value.constructor && value.constructor.prototype === value)) {
		var ret = value.inspect(recurseTimes);
		if ('string' !== typeof ret) {
			ret = formatValue(ctx, ret, recurseTimes);
		}
		return ret;
	}

	// Primitive types cannot have properties
	var primitive = formatPrimitive(ctx, value);
	if (primitive) {
		return primitive;
	}

	// Look up the keys of the object.
	var keys = Object.keys(value);
	var visibleKeys = arrayToHash(keys);

	if (ctx.showHidden) {
		keys = Object.getOwnPropertyNames(value);
	}

	// Force stack to show up even if it isn't enumerable
	if (nodeUtil.isError(value) && value.stack && !Object.getOwnPropertyDescriptor(value, 'stack').enumerable) {
		keys.push("stack");
	}

	// Some type of object without properties can be shortcutted.
	if (keys.length === 0) {
		if (typeof value === 'function') {
			var name = value.name ? ': ' + value.name : '';
			return ctx.stylize('[Function' + name + ']', 'special');
		}
		if (nodeUtil.isRegExp(value)) {
			return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
		}
		if (nodeUtil.isDate(value)) {
			return ctx.stylize(Date.prototype.toString.call(value), 'date');
		}
		if (nodeUtil.isError(value)) {
			return formatError(value);
		}
	}

	var base = '', array = false, braces = ['{', '}'];

	// Make Array say that they are Array
	if (nodeUtil.isArray(value)) {
		array = true;
		braces = ['[', ']'];
	}

	// Make functions say that they are functions
	if (typeof value === 'function') {
		var n = value.name ? ': ' + value.name : '';
		base = ' [Function' + n + ']';
	}

	// Make RegExps say that they are RegExps
	if (nodeUtil.isRegExp(value)) {
		base = ' ' + RegExp.prototype.toString.call(value);
	}

	// Make dates with properties first say the date
	if (nodeUtil.isDate(value)) {
		base = ' ' + Date.prototype.toUTCString.call(value);
	}

	// Make error with message first say the error
	if (nodeUtil.isError(value)) {
		base = ' ' + formatError(value);
	}

	if (keys.length === 0 && (!array || value.length === 0)) {
		return braces[0] + base + braces[1];
	}

	if (recurseTimes < 0) {
		if (nodeUtil.isRegExp(value)) {
			return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
		} else {
			return ctx.stylize('[Object]', 'special');
		}
	}

	ctx.seen.push(value);

	var output;
	if (array) {
		output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
	} else {
		output = keys.map(function (key) {
			return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
		});
	}

	ctx.seen.pop();

	return reduceToSingleString(output, base, braces);
}


function formatPrimitive(ctx, value) {
	switch (typeof value) {
		case 'undefined':
			return ctx.stylize('undefined', 'undefined');

		case 'string':
			var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
													 .replace(/'/g, "\\'")
													 .replace(/\\"/g, '"') + '\'';
			return ctx.stylize(simple, 'string');

		case 'number':
			return ctx.stylize('' + value, 'number');

		case 'boolean':
			return ctx.stylize('' + value, 'boolean');
	}
	// For some reason typeof null is "object", so special case here.
	if (value === null) {
		return ctx.stylize('null', 'null');
	}
}


function formatError(value) {
	return '[' + Error.prototype.toString.call(value) + ']';
}


function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
	var output = [];
	for (var i = 0, l = value.length; i < l; ++i) {
		if (Object.prototype.hasOwnProperty.call(value, String(i))) {
			output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
				String(i), true));
		} else {
			output.push('');
		}
	}
	keys.forEach(function (key) {
		if (!key.match(/^\d+$/)) {
			output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
				key, true));
		}
	});
	return output;
}


function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
	var name, str, desc;

	if (key === 'stack' && nodeUtil.isError(value)) {
		// Print stack traces even if they're getters.
		// Don't escape them to keep newlines readable
		str = value[key];

		// We print the default first line of .stack as
		// the original message. Remove it, unless it's
		// not the same
		var prefix = "Error: " + value.message;
		if (str.indexOf(prefix + '\n') === 0)
			str = str.substr(prefix.length);	// Keep the trailing newline so that the stack lines line up
		str = ctx.stylize(str, 'stack');
	} else {
		desc = Object.getOwnPropertyDescriptor(value, key) || { value: value[key] };
		if (desc.get) {
			if (desc.set) {
				str = ctx.stylize('[Getter/Setter]', 'special');
			} else {
				str = ctx.stylize('[Getter]', 'special');
			}
		} else {
			if (desc.set) {
				str = ctx.stylize('[Setter]', 'special');
			}
		}
	}
	if (!Object.prototype.hasOwnProperty.call(visibleKeys, key)) {
		name = '[' + key + ']';
	}
	if (!str) {
		if (ctx.seen.indexOf(desc.value) < 0) {
			if (recurseTimes === null) {
				str = formatValue(ctx, desc.value, null);
			} else {
				str = formatValue(ctx, desc.value, recurseTimes - 1);
			}
			if (str.indexOf('\n') > -1) {
				if (array) {
					str = str.split('\n').map(function (line) {
						return '  ' + line;
					}).join('\n').substr(2);
				} else {
					str = '\n' + str.split('\n').map(function (line) {
						return '   ' + line;
					}).join('\n');
				}
			}
		} else {
			str = ctx.stylize('[Circular]', 'special');
		}
	}
	if (typeof name === 'undefined') {
		if (array && key.match(/^\d+$/)) {
			return str;
		}
		name = JSON.stringify('' + key);
		if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
			name = name.substr(1, name.length - 2);
			name = ctx.stylize(name, 'name');
		} else {
			name = name.replace(/'/g, "\\'")
					   .replace(/\\"/g, '"')
					   .replace(/(^"|"$)/g, "'");
			name = ctx.stylize(name, 'string');
		}
	}

	return name + ': ' + str;
}


function reduceToSingleString(output, base, braces) {
	var numLinesEst = 0;
	var length = output.reduce(function (prev, cur) {
		numLinesEst++;
		if (cur.indexOf('\n') >= 0) numLinesEst++;
		return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
	}, 0);

	if (length > 60) {
		return braces[0] +
			   (base === '' ? '' : base + '\n ') +
			   ' ' +
			   output.join(',\n  ') +
			   ' ' +
			   braces[1];
	}

	return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
}