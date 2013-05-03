#LogUp Protocol
This document describes the in-memory communication protocol used between LogUp hubs and LogUp emitters.


#Basic concepts
There are three components in the protocol:

 - **Hubs** receive messages from loggers and act on them appropriately.
 - **Emitters** emit messages to hubs.
 - **Loggers** generate log messages in the first place.

Every logger is also an emitter.  
It is also possible to create _proxies_, which act as hubs on the downstream end, receiving messages from loggers, and act as emitters on the upstream end, forwarding those messages to a different hub.  
Proxies are typically used to forward messages to a different server (eg, from a browser), or to filter / modify messages emitted from a library (although that should probably be done in the host configuration).

## Design goals
The protocol is designed to meet the following requirements:

 - Version safety
  - Older versions of the emitter must work perfectly with all newer versions of the hub, even if the newer hub version adds new protocol-level features
  - This guarantees that dependencies out of your control will never prevent you from upgrading the hub.
  - I do not guarantee that older hubs will work with newer emitters; you (the application developer) can always upgrade the hub if needed.
  - If a library upgrades to a version of logup-emitter with a breaking change in the protocol, that should be considered a breaking change in the library and should warrant a major version bump (since it requires applications that use the library to upgrade to a new major version of logup-hub).
 - Interprocess / cross-machine communication
  - It will be possible to forward messages from emitters in a browser (running on browserify) to a hub on the server over Socket.io (or other transports).
  - This means that every interaction must be asynchronous
 - Hubs should not know about the individual loggers connected to them
  - Instead, they just need to be aware of _connections_ to zero or more loggers.
  - This greatly simplifies cross-process proxy implementation.
  - This also means that a hub or proxy cannot know what versions are connected to it, in case one of its emitters is a proxy with multiple sources.
 - Proxy independence
  - A proxy should need to understand as little of the protocol as possible, so that an older proxy sitting between newer hubs and emitters won't break anything.
  - For example, a proxy should not need to know what methods exist.

## Core protocol layer
This layer describes how communication takes place, and how version resilience is guaranteed.  This part is set in stone and cannot change in a later release.

###Registration
Hubs register themselves in the node `module` object as a `logup-hub` property.  

When an emitter is created, it walks up the `module.parent` tree until it finds a module with a `logup-hub` property.  It then calls the hub's `attach` method, passing the emitter object, to make the hub aware of the emitter.

In environments where `module.parent` doesn't exist (eg, browserify), hubs register themselves in `global['logup-hub']`, and emitters will look there directly.  
Note that loggers also use `module.parent` to help determine their package names, so metadata will be less reliable in such environments.

###Emitter -> hub invocation
An emitter can send a message up to its hub by calling `hub.invoke(methodName, args)`.  `methodName` is the name of the method to invoke; `args` is the array of arguments to pass to the method.  
`args` can contain arbitrary JSON-serializable objects / primitives.  
However, the first arg must include a `protocolVersion` property with a semver string describing the version implemented by the original emitter that sent the invocation.  
The hub should check the version of each invocation it receives.  If it gets an invocation from an earlier protocol version, it should handle it gracefully, preserving as much functionality as possible.  If it gets an invocation from a later protocol version, it is encouraged to log an error.  (it must not break anything, since attackers can send arbitrary versions in public web scenarios)
  
At the moment, only loggers will initiate invocations, so the first arg should always be the logger's `source` object.  
However, proxies must not assume this to be true, in case future versions allow messages to originate from a downstream proxy.

To allow the hub to communicate directly with an emitter (since the hub cannot communicate directly to a single logger), any object in the args can include a `respond` method, which the hub can call with arbitrary arguments.  Proxies must forward `respond` calls to original function passed from the original downstream emitter.

###Hub -> emitter broadcasts
Hubs can broadcast messages to all emitters, by calling the `onBroadcast(name, versionRange, args)` function on every registered emitter (from `attach()`).  
`versionRange` must be a semver range string indicating what versions of the protocol this message applies to.  Proxies must always ignore this field and broadcast the message to all downstream clients.  Emitters, and proxies that handle the message themselves, should ignore the message unless their protocol version falls within the range.  
`args` can contain arbitrary JSON-serializable objects / primitives.   
An individual emitter can reply to a broadcast simply by calling `invoke()`.

## Application Layer