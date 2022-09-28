function createPreProcessingRegistry (lib, NeededConfigurationNamesMixin) {
  'use strict';

  /**
   * @class
   * @memberOf allex_applib
   * @classdesc
   * The base class for Processors (PreProcessors and PrePreProcessors).
   *
   * Processors work like this:
   *
   * #### Inherit from BasicProcessor
   * The only method you _need_ to implement is `process (desc)`.
   * In this implementation you will alter the given descriptor `desc`.
   *
   * This alteration may need to take care about the particular configuration 
   * that was specified in the descriptor `desc`.
   *
   * When your `process` method is called, your configuration will not be in `desc` any more,
   * for consistency/sanity/security reasons.
   * Instead, it will be in `this.config` of your Class.
   *
   * #### Register
   * Depending on the nature of your Processor,
   * call {@link allex_applib.registerPrePreprocessor}
   * or {@link allex_applib.registerPreprocessor} with
   * 1. the name you're registering under (a String, like `'MySpecialProcessor'`)
   * 2. the class you produced when you inherited from BasicProcessor
   *
   * **Note**: the call will result in an _instance_ of your class
   * being registered under the name you provided.
   * 
   * That is why the constructor of BasicProcessor (and all the classes that inherit from it)
   * does not take any parameters.
   *
   * #### Configure
   * In the descriptor of the App or Element (may depend on the very nature of
   * a particular Processor, because certain Processors may be built for use only on App descriptors),
   * configure the (pre)preprocessor.
   *
   * The configuration for both preprocessors and prepreprocessors is an Object.
   * It maps the configurations to registered names of (pre)preprocessors.
   *
   * Example for the `preprocessors` configuration:
   * ```javascript
   *  {
   *    ...
   *    links: [...],
   *    logic: [...],
   *    preprocessors: {
   *      MySpecialProcessor: {
   *        color: 'red',
   *        rows: 5,
   *        columns: 8
   *      }
   *    }
   *  }
   * ```
   *
   * Example for the `prepreprocessors` configuration:
   * ```javascript
   *  {
   *    ...
   *    links: [...],
   *    logic: [...],
   *    prepreprocessors: {
   *      MySpecialPreProcessor: {
   *        role: 'admin',
   *        height: 50,
   *        apply: true
   *      }
   *    }
   *  }
   * ```
   *
   * In the case of `prepreprocessors`, the configuration object **may also** be an array of objects, like
   * ```javascript
   *  {
   *    ...
   *    links: [...],
   *    logic: [...],
   *    prepreprocessors: [{
   *      MyInitPrePreprocessor: {
   *        automaticlogin: false,
   *        usehttps: true
   *      }
   *    },
   *    {
   *      MySpecialPreProcessor: {
   *        role: 'admin',
   *        height: 50,
   *        apply: true
   *      }
   *    }]
   *  }
   * ```
   * This is because you may need to perform prepreprocessing on the given descriptor in several phases,
   * so the preprocessors may need to perform their `process`ing in phases.
   * Each configuration object in the configuration array will define a prepreprocessing phase
   * by defining prepreprocessors that need to run in the given phase - with their appropriate
   * configurations.
   *
   */
  function BasicProcessor () {
    NeededConfigurationNamesMixin.call(this);
    this.config = null;
  } 
  NeededConfigurationNamesMixin.addMethods(BasicProcessor);
  BasicProcessor.prototype.destroy = function () {
    this.config = null;
    NeededConfigurationNamesMixin.prototype.destroy.call(this);
  };
  /**
   * @function 
   * @abstract
   * @param {Object} desc The App/Element descriptor to be processed
   */
  BasicProcessor.prototype.process = function (desc) {
    throw new Error('Not implemented');
  };
  /**
   * @function 
   * @param {String} name The name of the registered Preprocessor
   * @param {Object} config The config for the PreProcessor registered by `name`
   * @param {Object} desc The App/Element descriptor to be processed
   */
  BasicProcessor.prototype.firePreprocessor = null;
  /**
   * @function 
   * @param {String} name The name of the registered PrePreprocessor
   * @param {Object} config The config for the PrePreProcessor registered by `name`
   * @param {Object} desc The App/Element descriptor to be processed
   */
  BasicProcessor.prototype.firePrePreprocessor = null;


  /**
   * @function
   * @param {Object} config The configuration object - obtained from the descriptor 
   * that is to be `process`ed.
   *
   * This method is called internally, during the process of building the App
   * from the descriptor.
   */
  BasicProcessor.prototype.configure = function (config) {
    this.checkNeededConfigurationNames(config);
    this.config = config;
  };

  BasicProcessor.prototype.isAppDesc = function (desc) {
    return !desc.type;
  };
  BasicProcessor.prototype.elementsOf = function (desc) {
    return this.isAppDesc(desc) ? desc.elements : desc.options.elements;
  };
  BasicProcessor.prototype.elementReferenceStringOf = function (desc, str) {
    return this.isAppDesc(desc) ? ('element.'+str) : ('.'+str);
  };

  /**
   * PreProcessingRegistryBase is a specialization of {@link allex://allex_maplowlevellib.Map|Map}
   * that introduces methods
   * - {@link allex://allex_applib.PreProcessingRegistryBase#process|process}
   * - {@link allex://allex_applib.PreProcessingRegistryBase#register|register}
   *
   * @class
   * @memberof allex_applib
   */
  function PreProcessingRegistryBase () {
    lib.Map.call(this);
  }
  lib.inherit(PreProcessingRegistryBase, lib.Map);
  /**
   * Registers an __instance__ (_not the class!_) of the (Pre)PreProcessor class provided
   * under a given `name`.
   *
   * @function
   * @param {String} name Name of the (Pre)PreProcessor class to register
   * @param {Function} ctor The (Pre)PreProcessor class constructor to register
   */
  PreProcessingRegistryBase.prototype.register = function (name, ctor) {
    var instance = new ctor();
    if (!(instance instanceof BasicProcessor)) throw new Error('PreProcessor must be instance of BasicProcessor');

    //console.log(this.constructor.name, 'add', name);
    this.add (name, instance);
  };
  /**
   * @function
   * @param {Object} desc The App/Element descriptor to process
   */
  PreProcessingRegistryBase.prototype.process = function (desc) {
    if (!this.targetDescriptorSectionName) {
      throw new Error(this.constructor.name+' cannot process a descriptor because it has no targetDescriptorSectionName');
    }
    if (!(this.targetDescriptorSectionName in desc)) {
      return lib.q(true);
    }
    var configs = desc[this.targetDescriptorSectionName];
    desc[this.targetDescriptorSectionName] = null;
    return this.processOn(desc, configs);
  };
  PreProcessingRegistryBase.prototype.processOn = function (desc, configs) {
    if (lib.isArray(configs)) {
      if (!this.allowArrayConfigs()) {
        throw new Error('configs cannot be an Array');
      }
      configs.forEach(_doProcessForEach.bind(null, this, desc));
    } else {
      _doProcessForEach(this, desc, configs);
    }
    return lib.q(true);
  };
  /**
   * Returns `true` if an Array of configuration objects is allowed
   *
   * @function
   * @returns `false`
   */
  PreProcessingRegistryBase.prototype.allowArrayConfigs = function () {
    return false;
  };

  function _doProcessForEach(registry, desc, configs) {
    lib.traverseShallow(configs, _doProcess.bind(null, registry, desc));
  }

  function _doProcess(registry, desc, config, configname) {
    var preprocessor = registry.get(configname);
    if (!preprocessor) {
      console.warn(registry.constructor.name, 'has no processor registered for name', configname);
      return;
    }
    preprocessor.configure(config);
    return preprocessor.process(desc);
  }

  return {
    PreProcessingRegistryBase: PreProcessingRegistryBase,
    BasicProcessor: BasicProcessor,
    _doProcess: _doProcess
  };
}

module.exports = createPreProcessingRegistry;
