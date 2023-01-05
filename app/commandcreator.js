function createCommand (lib) {
  'use strict';

  var Settable = lib.Settable,
    q = lib.q;

  function AppSideCommand (command) {
    this.environment = null;
    this.command = command;
    this.target = null;
    this.args = new lib.Fifo();
  }
  lib.inherit(AppSideCommand, Settable);

  AppSideCommand.prototype.destroy = function () {
    this.drainArgs();
    if (this.args) {
      this.args.destroy();
    }
    this.args = null;
    this.environment = null;
    this.command = null;
    this.target = null;
  };

  AppSideCommand.prototype.set_environment = function (env) {
    this.environment = env;
    return true;
  };

  AppSideCommand.prototype.execute = function () {
    //if (!this.environment) return q.reject(new Error('Not connected'));
    var d, args, ret;
    args = Array.prototype.slice.call(arguments);
    if (!this.environment) {
      d = q.defer();
      this.args.push({defer: d, args: args});
      return d.promise;
    }
    ret = this.environment.commands.waitFor(this.command).then(
      executeOnTarget.bind(null, args)
    );
    //lib.qlib.promise2console(ret, this.command+'('+JSON.stringify(args)+')');
    args = null;
    return ret;
  };
      
  function executeOnTarget (args, target) {
    //var target = this.environment.commands.get(this.command);
    if (!target) {
      throw new Error('No target');
    }
    return target.execute.apply (target, args);
  };

  AppSideCommand.prototype.drainArgs = function () {
    if (this.args) {
      this.args.drain(this.executeFromDrain.bind(this));
    }
  };

  AppSideCommand.prototype.executeFromDrain = function (ex) {
    lib.qlib.promise2defer(this.execute.apply(this, ex.args), ex.defer);
  };

  return AppSideCommand;
}

module.exports = createCommand;
