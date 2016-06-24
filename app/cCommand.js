function createCommand (lib) {
  'use strict';
  function AppSideCommand (environment, comand) {
    this.environment = environment;
    this.command = command;
    this.target = null;
  }
  lib.inherit(AppSideCommand, Settable);

  AppSideCommand.prototype.destroy = function () {
    this.environment = null;
    this.command = null;
    this.target = null;
  };

  AppSideCommand.prototype.execute = function () {
    if (!this.target) return q.reject(new Error('Not connected'));
    return this.target.execute.apply (this.target, arguments);
  };

  return AppSideCommand;
}

module.exports = createCommand;
