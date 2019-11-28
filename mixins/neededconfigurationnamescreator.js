function createNeededConfigurationNamesMixin (lib) {
  'use strict';

  function NeededConfigurationNamesMixin () {
  }
  NeededConfigurationNamesMixin.prototype.destroy = lib.dummyFunc;
  NeededConfigurationNamesMixin.prototype.checkNeededConfigurationNames = function (config) {
    if (this.neededConfigurationNames) {
      if (lib.isArray(config)) {
        config.forEach(checkNeededConfigurationNames.bind(null, this.constructor.name, this.neededConfigurationNames));
      } else {
        checkNeededConfigurationNames(this.constructor.name, this.neededConfigurationNames, config);
      }
    }
  };
  NeededConfigurationNamesMixin.addMethods = function (klass) {
    lib.inheritMethods(klass, NeededConfigurationNamesMixin,
      'checkNeededConfigurationNames'
    );
  };

  function checkNeededConfigurationNames (ctorname, names, config) {
    var i, name;
    if (!lib.isArray(names)) {
      return;
    }
    if (!(config && 'object' === typeof config)) {
      return;
    }
    for (i=0; i<names.length; i++) {
      if (!(names[i] in config)) {
        throw new Error('The configuration provided to an instance of '+ctorname+' has to have a property named '+names[i]);
      }
    }
  }

  return NeededConfigurationNamesMixin;
}

module.exports = createNeededConfigurationNamesMixin;
