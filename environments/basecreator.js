function createEnvironmentBase (execlib) {
  'use strict';

  var lib = execlib.lib,
    Configurable = lib.Configurable;

  function EnvironmentBase (config) {
    this.dataSources = new lib.Map();
    this.commands = new lib.Map();
    if (lib.isArray(config.datasources)) {
      config.datasources.forEach(this.toDataSource.bind(this));
    }
    if (lib.isArray(config.commands)) {
      config.datasources.forEach(this.toCommand.bind(this));
    }
  }
  EnvironmentBase.prototype.destroy = function () {
    if (this.commands) {
      lib.containerDestroyAll(this.commands);
      this.commands.destroy();
    }
    this.commands = null;
    if (this.dataSources) {
      lib.containerDestroyAll(this.dataSources);
      this.dataSources.destroy();
    }
    this.dataSources = null;
  };
  EnvironmentBase.prototype.toDataSource = function (desc) {
    if (!desc.name) {
      throw new lib.JSONizingError('NO_DATASOURCE_NAME', desc, 'No name:');
    }
    if (!desc.type) {
      throw new lib.JSONizingError('NO_DATASOURCE_TYPE', desc, 'No type:');
    }
    this.dataSources.add(desc.name, this.createDataSource(desc.type, desc.options);
  };
  EnvironmentBase.prototype.toCommand = function (desc) {
    if (!desc.name) {
      throw new lib.JSONizingError('NO_COMMAND_NAME', desc, 'No name:');
    }
    this.dataSources.add(desc.name, this.createCommand(desc.options);
  };

  return EnvironmentBase;
}

module.exports = createEnvironmentBase;
