function createCommand (lib) {
  'use strict';

  function FunctionCommand (command, f){
    this.f = f;
    this.command = command;
  }

  FunctionCommand.prototype.destroy = function () {
    this.f = null;
    this.command = null;
  };

  FunctionCommand.prototype.execute = function () {
    this.f.apply(null, arguments);
  };

  return FunctionCommand;
}

module.exports = createCommand;
