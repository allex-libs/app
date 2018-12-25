function createEnvironmentHelperPreprocessor (lib, preprocessingregistrylib, descriptorApi) {
  'use strict';

  var BasicProcessor = preprocessingregistrylib.BasicProcessor;

  /**
   * There are several external resources that can and should be described 
   * in the App descriptor:
   * - Data sources
   * - Commands
   * - Data commands
   *
   * All these resources share a pattern for description:
   * 1. Describe the resource in the appropriate Environment section 
   * 2. Describe the resource in the appropriate App descriptor's section
   * (`datasources`, `commands` or `datacommands`)
   *
   * The pattern above is covered by this class.
   *
   * ### Configuration
   * A single configuration object (they may come in Arrays)
   * needs to have 2 properties:
   * - `environment`
   * - `entity`
   *
   * `environment` is just a string that denotes the name of the environment
   * where the Resource should be defined
   *
   * `entity` is the appropriate configuration hash for the Resource on the environment.
   *
   * @class
   * @memberof allex_applib
   */
  function EnvironmentHelperPreprocessor () {
    BasicProcessor.call(this);
  }
  lib.inherit(EnvironmentHelperPreprocessor, BasicProcessor);

  EnvironmentHelperPreprocessor.prototype.process = function (desc) {
    if (lib.isArray(this.config)) {
      this.config.forEach(processConf.bind(null, this, desc));
      return;
    }
    processConf(this, desc, this.config);
  };
  function processConf (pp, desc, conf) {
    var targetenv;
    if (!conf.entity.name) {
      throw new Error('entity section of the configuration must have a name');
    }
    targetenv = descriptorApi.ensureDescriptorArrayElementByName(desc, 'environments', conf.environment);
    targetenv.options[pp.environmentOptionsTarget].push(conf.entity);
    if (lib.isArray(pp.appTarget)) {
      pp.appTarget.forEach(putToApp.bind(null, pp, desc, conf));
      return;
    }
    putToApp(pp, desc, conf, pp.appTarget);
  };
  function putToApp (pp, desc, conf, destdesc) {
    var appobj = lib.extend({}, desc.app, {
      environment: conf.environment
    });
    appobj[destdesc.objdest] = conf.entity.name;
    desc[destdesc.dest].push(appobj);
  }
  /**
   * This member needs to be overriden in order to define
   * the Environment secton that will get the Resource descriptor.
   * 
   * It has to be a string, namely
   * `datasources`, `commands` or `datacommands`,
   * and each descendant class of EnvironmentHelperPreprocessor
   * will be defining one of these values.
   *
   * @member
   */
  EnvironmentHelperPreprocessor.prototype.neededConfigurationNames = ['environment', 'entity'];
  EnvironmentHelperPreprocessor.prototype.environmentOptionsTarget = null; //e.g. 'datasources' or 'commands'
  /**
   * This member needs to be overriden in order to define
   * what app descriptor sections should get a reference
   * to the entity described in the `environments` section.
   *
   * If not `null`, it should be an Object with the following properties:
   * - `objdest`
   * - `dest`
   *
   * or an Array of such Objects.
   *
   *
   * @member
   */
  EnvironmentHelperPreprocessor.prototype.appTarget = null; //e.g. {objdest: 'name', dest: 'datasources'}

  return EnvironmentHelperPreprocessor; //this one is not registered

}

module.exports = createEnvironmentHelperPreprocessor;
