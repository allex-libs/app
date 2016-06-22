function createApp(execlib, UserRepresentation) {
  'use strict';
  var lib = execlib.lib;

  function App (options) {
  }

  function LocalApp (options) {
    App.call(this, options);
  }
  lib.inherit(LocalApp, App);

  function RemoteApp (options) {
    App.call(this, options);
    this.address = options.entrypoint.address;
    this.port = options.entrypoint.port;
    this.identity = options.entrypoint.identity;
    this.userRepresentation = new UserRepresentation();
  }
  lib.inherit(RemoteApp, App);
  RemoteApp.prototype.go = function () {
    execlib.loadDependencies('client', [
      '.',
      'allex:users'
    ], this.sendRequest.bind(this));
  };
  RemoteApp.prototype.sendRequest = function () {
    lib.request('http://'+this.address+':'+this.port+'/letMeIn', {
      parameters: {
        username: this.identity.username,
        password: this.identity.password
      },
      onComplete: this.onResponse.bind(this),
      onError: console.error.bind(console, 'oopsie')
    });
  }
  RemoteApp.prototype.onResponse = function (response) {
    if (!response) {
      //error handling
    }
    if (response.data) {
      try {
        var response = JSON.parse(response.data);
        execlib.execSuite.taskRegistry.run('acquireSink', {
          connectionString: 'ws://'+response.ipaddress+':'+response.port,
          session: response.session,
          onSink:this._onSink.bind(this)
        });
      } catch(e) {
        console.error(e.stack);
        console.error(e);
        //error handling
      }
    }
  };
  RemoteApp.prototype._onSink = function (sink) {
    execlib.execSuite.taskRegistry.run('acquireUserServiceSink', {
      sink: sink,
      cb: this._onAcquired.bind(this)
    });
  };
  RemoteApp.prototype._onAcquired = function (sink) {
    this.userRepresentation.setSink(sink);
    console.log(this.userRepresentation);
  };

  function createApp (desc) {
    var ctor;
    switch (desc.type) {
      case 'local':
        ctor = LocalApp;
        break;
      case 'remote':
        ctor = RemoteApp;
        break;
      default:
        throw new lib.JSONizedError('UNSUPPORTED_APP_TYPE', desc, 'Unsupported type:');
    }
    return new ctor(desc.options);
  }

  return createApp;
}

module.exports = createApp;
