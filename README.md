[![build status](https://secure.travis-ci.org/SLaks/logup-emitter.png)](http://travis-ci.org/SLaks/logup-emitter)

#LogUp Emitter
_One logger to rule them all_

This package emits log messages to a [logup-hub](https://github.com/SLaks/logup-hub) running in the same process.  If there is no logup-hub, messages (info or higher) are printed to the console.

#About LogUp

logup is a powerful logging system that decouples logging from configuration.  Library packages use logup-emitter to write their logs, without needing to know where the log output is sent.  Applications can then use logup-hub to configure the log output and decides what gets sent where.

#How to get started
LogUp is very simple to use.  How to use it depends on what you're doing:

##For libraries
If you're writing a reusable package (something that will be invoked by other code using `require()`; not a command-line application), you only need the emitter.  
First,

    npm install logup-emitter --save

Next, you need to require the logger:

```js
var logger = require('logup-emitter').createLogger(module);
```

Passing `module` allows me to figure out what file and package created the logger; this gives more context in the logged messages and allows applications to configure logs from different packages separately.

Finally, you need to log things:

```js
logger.trace("Something boring happened!");
logger.info("Something interesting happened!", { message: someObject });
logger.warn("Uh-oh!", { retriesLeft: 4, error: new Error("Connection timed out!") });
logger.error("Boom!", new Error("Invalid credentials"));
```

##For applications
If you're writing an application, you should still use the emitter to log things from your application logic.  However, you will also want to use the hub to configure what should happen to the logs.

First, install the emitter as described above.  (this is not required to use the hub, but should be used elsewhere)

Then,

    npm install logup-hub --save

Finally, add some configuration.  See the [LogUp Hub documentation](https://github.com/SLaks/logup-hub) for more information.
#Usage
logup-emitter allows code to create logger objects that forward to the active hub.  
Each logger object knows which npm package it's used by, and ideally which file.  
Thus, you should not expose loggers across files; instead, each file should create a single logger and use it throughout.

##Creating loggers
To create a standard logger, call `require('logup-emitter').createLogger(module)`.  `module` is Node's [standard `module` object](http://nodejs.org/api/modules.html#modules_the_module_object); LogUp uses it to find the filename and npm package creating the logger, and to crawl the module tree looking for a hub.  (see below)

To create a logger for a package that you depend on, but don't control, call `createSubpackageLogger(module, "dependency name")`.  This call will call `yourModule.require(packageName + "/package.json")` to find the package that the logger is for, and will again use your `module` to crawl up and find a hub.  `"package name"` must be the same string you pass to `require()` to load the package that you're creating the module for.  These loggers do not record the source filename.  

##Logger objects
LogUp uses the following log levels:

 - trace
 - debug
 - info
 - warn
 - error

Logger objects have a method for each level, to emit a log message at that level.  
These methods must always be passed a string, and can optionally be passed an object containing additional information.  Depending on the transports configured by the hub, this object will typically be serialized as JSON.  All transports are guaranteed to also support `Error` instances, whether as the sole metadata parameter or as a property inside an object.  If multiple parameters are passed, they will be merged into a single array of metadata.

Logger objects also have a general `log()` method, which takes a level parameter (string or index), followed by the same parameters as the specific log methods.

If your code uses a different set of levels, you can call `logger.mapLevels({ myWarnLevel: "warn" })` to create a new logger instance that wraps the original one and converts `myWarnLevel` logs to `warn`.  Any levels not mapped in the object will not be exposed in the returned object.  Multiple names can be mapped to the same level.  If `log` is specified, the returned object will not have the general-purpose `log()` method; otherwise, the `log()` method will only respect the new parameter names.  
This is particularly useful when adapting older code to use LogUp. (see [below](#compatibility))

###Context
LogUp can associate metadata (eg, user ID or requesting IP address) with the current asynchronous call stack, including it with all logged messages.  Context is tracked using Node [domains](http://nodejs.org/api/domain.html).  
Since entering domains is a complicated decision, LogUp will not manage domains for you.  If your code is running in a domain, context will work; when not in a domain, context will be silently ignored.  
This allows libraries to add contextual information without knowing whether the actual application is using domains or not.

To add context, call `logger.addContext("key", value)` or `logger.addContext({ key1: value1, key2: value2 })`.  Values can be arbitrary JSON structures; it is up to the transports at the hub to consume them meaningfully.


#Compatibility

##For new libraries
If your library uses logup-emitter, but the application using it does not set up logup-hub, the emitter will print all `info` or higher messages to console.  
Your libraries can be used without knowing anything about LogUp.  When the applications need more control over their logging, they can install logup-hub, add some configuration, and everything will work beautifully.

##For existing libraries
If you have an existing library that takes a `log()` function as a configuration parameter, you can still switch to logup-emitter, without breaking existing uses.  This allows new applications to get the benefits of logup-hub's central configuration, without breaking existing applications that pass a log callback.

To do this, use logup-interceptor to create a fake hub at the root of your library.  When a logged message is received, this hub would run your existing logging logic (calling the user-provided `log()` function if present), then forward the message upstream to a higher-level hub, if present.  If your existing logic prints to console in the absence of a configured `log()` callback, do that only if there is no upstream logger.
Then, replace all calls to the existing logging logic with ordinary logup-emitter calls.

This way, existing users of your library will not notice any change (whether or not they provide a log callback).  
If your library is used by an application that has a LogUp hub, all logs will go to the hub instead, and it will work just like any other logup-emitting library.  If there is both a configured `log()` callback and an upstream LogUp hub, all log messages will go to both.

_code sample coming soon_

##For applications
If your application uses a library that logs through some mechanism other than logup-emitter, you should submit a pull request that switches it to use logup-emitter &#x263a;.  See above for guidelines. 
However, LogUp can probably help you even without pull requesting.  

 - If the library does all of its logging through `console.log()`, you're out of luck; I can't override that for you.

 - If the library takes a `log` callback (eg, MongoDB, Socket.IO < 1.0, or generic-pool), you can create a LogUp emitter for that package and pass it to the callback.  You will need to check the library's documentation to see what signature and levels it uses, and wrap or modify the logger to fit the library's use.  
For example:  
```js
var mongoLogger = require('logup-emitter').createSubpackageLogger(module, "mongodb");
mongoLogger = mongoLogger.mapLevels({debug: 'debug', log: 'info', error: 'error' });
var server = new Server("127.0.0.1", 27017, { logger: mongoLogger });
```  
 - If the library does its logging though [visionmedia/debug](https://github.com/visionmedia/debug), I also can't help you (yet).  
It would be possible for the debug library to add support for forwarding messages to a LogUp hub.  

 - If the library has some other technique, [open an issue](https://github.com/SLaks/logup-emitter/issues/new) and I'll see what I can do.


#How it works
When a logger is created, it will walk the calling `module`'s [`parent` tree](http://nodejs.org/api/modules.html#modules_module_parent) until it finds a module that has a LogUp hub.  If it finds a hub, it will attach itself to the hub, and all log messages will be emitted on the hub, together with the originating logger object (for source information).  

If an emitter does not find a hub, it will wait for the next tick, then look again.  This prevents the following scenario:

```js
// application.js
var mongo = require('mongodb');		// Creates a logup-emitter
var hub = require('logup-hub');
hub.transports.add(mongo);			// Syntax & API TBD
hub.install(module);
```

Since the mongodb module creates LogUp emitters before the hub is installed, they won't find any hub.  However, once the next tick happens, the hub will have been installed.  
As long as all hubs are created in top-level source (and not inside callbacks), this will always work.

If it does not find any hub at the next tick either, it will fall back to writing `info` or higher messages to the console.  This allows LogUp-using libraries to be used without setting up an emitter.

Any log messages emitted before it finds a hub (if it doesn't find one immediately) will be queued until a hub is found in the next tick, then emitted to the hub.  The timestamps are computed when `log()` is called, so message timestamps are not affected by this behavior.  
In case the process exits during the first tick, an `exit` handler is used to drain the queued messages.

The protocol used to communicate between emitters and hubs will be documented and versioned using semver.  When a breaking change is introduced, the newer hub will have an adapter to convert messages from older emitters to the new format.  This way, older packages with fixed dependencies on older versions of the emitter will always be usable without problems (although they won't get new emitter-side features).  

If a hub receives a connection from a _newer_ emitter, the hub will immediately throw an error.  Thus, if an application uses an older version of the hub, and a dependency upgrades to a newer emitter, the application will be forced to upgrade the hub.  Since the application is under your control, this shouldn't cause hardships.

There will also be a separate logup-interceptor package.  This can be used by a library to create a hub that catches log messages from packages below the library in the module tree.  
The interceptor will allow messages to be filtered or modified, and it will then forward them up the module tree to an application-level hub, if present.  
The interceptor module will not care about the protocol version (although filter / modification callbacks probably will).  
If there is no upstream hub for the interceptor to connect to, it will do nothing at all (and by default will not install itself in the module, so that downstream emitters will still fallback).
