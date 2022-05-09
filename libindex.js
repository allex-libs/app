function libCreator (execlib, Linker, Hierarchy, environmentlib, bufferableeventlib, datafilterslib, arryopslib) {
  /**
   * Library that allows one to create an Application
   * @namespace allex_applib
   * @author Andrija Petrovic <andrija.hers@gmail.com>
   */
  'use strict';
  var RESULT = {
    App : null
  },
    lib = execlib.lib,
    mixins = require('./mixins')(lib),
    BasicParent = require('./abstractions/basicparentcreator')(lib, Hierarchy, bufferableeventlib),
    DescriptorHandler = require('./descriptorhandlercreator')(lib, mixins, RESULT),
    Resources = require('./resources')(lib),
    misc = require('./misc')(lib),
    Modifier = require('./modifiers')(execlib, mixins, misc),
    preProcessingRegistryLib = require('./preprocessingregistry')(lib, mixins),
    PreProcessors = preProcessingRegistryLib.PreProcessors,
    PrePreProcessors = preProcessingRegistryLib.PrePreProcessors,
    Elements = require('./elements')(lib, Hierarchy, BasicParent, Linker, Resources, Modifier.executeModifiers, mixins, PrePreProcessors, PreProcessors, DescriptorHandler),
    datamixins_ignored = require('./datamixins')(lib, Elements, datafilterslib, mixins),
    descriptorApi = require('./descriptorapi')(lib, arryopslib),
    App = require('./app')(lib, execlib.dataSuite, Elements, Hierarchy, Resources, BasicParent, environmentlib, Linker, Elements.BasicElement, Modifier.executeModifiers, PrePreProcessors, PreProcessors, descriptorApi, arryopslib);

  require('./preprocessors')(lib, preProcessingRegistryLib, descriptorApi);
  function createApp() {
    if (RESULT.App) throw new Error("You're not allowed to create more than one App");
    var ret = new App();
    RESULT.App = ret;
    /*
    if (lib.isFunction (desc.onAppCreated)) {
      ret.onReady(desc.onAppCreated.bind(null, ret));
    }
    */
    return ret;
  }

  function onResourceParams (promises, params, resourcename) {
    promises.push(Resources.resourceFactory(RESULT.App, params));
  }
  function appReadyFireer (result) {
    RESULT.App._fireAppReady();
    return lib.q(result);
  }
  function produceResources (resources) {
    var promises = [], ret;
    Resources.traverseResourceParams(onResourceParams.bind(null, promises));
    ret =  lib.q.all(promises).then(
     appReadyFireer
    );
    ret.then(null,
     console.error.bind(console, 'Error in producing Resources'));

    return ret;
  }

  /** Actually produces DescriptorHandlers */
  function dhProducerLoader (deschandlers, confdesc) {
    console.log('doing', confdesc.name);
    if (confdesc.type) {
      throw new Error('app configuration descriptor cannot have the "type" property');
    }
    var dh = new DescriptorHandler(confdesc.configuration);
    if (deschandlers && ('object' === typeof deschandlers)) {
      deschandlers[confdesc.name] = dh;
    }
    return dh.load();
  }

  /**
   * Crucial function.
   *
   * Processes the input from the outer world,
   * and produces the App object.
   *
   * @function bootstrap
   * @memberof allex_applib
   * @param {Array} descriptors An Array of App descriptors
   * @param {Array} deschandlers Optionally, an Object that will finally (when `bootstrap` resolves) have
   * all the `DescriptorHandler` instances mapped to their `name`s
   */
  function bootstrap (descriptors, deschandlers) {
    var promises = [];
    //module.APP = applib.createApp(ALLEX_CONFIGURATION.APP);
    createApp();
    if (!lib.isArray(descriptors)) {
      return lib.q(true);
    }
    lib.q.all(descriptors.map(dhProducerLoader.bind(null, deschandlers))).then(
      produceResources
    );
    //(new applib.DescriptorHandler(ALLEX_CONFIGURATION.APP)).load();
  }

  RESULT.mixins = mixins;
  RESULT.DescriptorHandler = DescriptorHandler;
  /**
   * @function
   * @static
   * @alias registerModifier
   * @memberof allex_applib
   * @param {String} name The name of the Modifier to be registered
   * @param {Function} modifierclass The Modifier class to be registered
   */
  RESULT.registerModifier = Modifier.registerModifier;
  /**
   * @function
   * @static
   * @alias getModifier
   * @memberof allex_applib
   * @param {String} name The name of the Modifier to get
   * @returns The Modifier class registered under the specified `name`
   */
  RESULT.getModifier = Modifier.getModifier;
  RESULT.BasicModifier = Modifier.BasicModifier;
  /**
   * @function
   * @static
   * @alias registerPrePreprocessor
   * @memberof allex_applib
   * @param {String} name The name of the PrePreProcessor to be registered
   * @param {Function} prepreprocessorclass The PrePreProcessor class to be registered
   */
  RESULT.registerPrePreprocessor = PrePreProcessors.register.bind(PrePreProcessors);
  /**
   * @function
   * @static
   * @alias getPrePreprocessor
   * @memberof allex_applib
   * @param {String} name The name of the PrePreProcessor to get
   * @returns The PrePreProcessor instance registered under the specified `name`
   */
  RESULT.getPrePreprocessor = PrePreProcessors.get.bind(PrePreProcessors);
  RESULT.prePreprocessOn = PrePreProcessors.processOn.bind(PrePreProcessors);
  /**
   * @function
   * @static
   * @alias registerPreprocessor
   * @memberof allex_applib
   * @param {String} name The name of the PreProcessor to be registered
   * @param {Function} preprocessorclass The PreProcessor class to be registered
   */
  RESULT.registerPreprocessor = PreProcessors.register.bind(PreProcessors);
  /**
   * @function
   * @static
   * @alias getPreprocessor
   * @memberof allex_applib
   * @param {String} name The name of the PreProcessor to get
   * @returns The PreProcessor instance registered under the specified `name`
   */
  RESULT.getPreprocessor = PreProcessors.get.bind(PreProcessors);
  RESULT.BasicProcessor = preProcessingRegistryLib.BasicProcessor;
  //RESULT.createApp = createApp;
  //RESULT.produceResources = produceResources;
  /**
   * @function
   * @static
   * @alias registerElementType
   * @memberof allex_applib
   * @param {String} name The name of the Element class to be registered
   * @param {Function} preprocessorclass The Element class to be registered
   */
  RESULT.registerElementType = Elements.registerElementType;
  /**
   * @function
   * @static
   * @alias getElementType
   * @memberof allex_applib
   * @param {String} name The name of the Element class to get
   * @returns The Element class registered under the specified `name`
   */
  RESULT.getElementType = Elements.getElementType;
  RESULT.BasicElement = Elements.BasicElement;
  /**
   * @function
   * @static
   * @alias registerResourceType
   * @memberof allex_applib
   * @param {String} name The name of the Resource class to be registered
   * @param {Function} preprocessorclass The Resource class to be registered
   */
  RESULT.registerResourceType = Resources.registerResourceType;
  /**
   * @function
   * @static
   * @alias getResourceType
   * @memberof allex_applib
   * @param {String} name The name of the Resource class to get
   * @returns The Resource class registered under the specified `name`
   */
  RESULT.getResourceType = Resources.getResourceType;
  RESULT.BasicResourceLoader = Resources.BasicResourceLoader;
  RESULT.misc = misc;
  RESULT.descriptorApi = descriptorApi;
  RESULT.bootstrap = bootstrap;

  RESULT.BasicProcessor.prototype.firePreprocessor = function (name, config, desc) {
    preProcessingRegistryLib._doProcess(PreProcessors, desc, config, name);
  };
  RESULT.BasicProcessor.prototype.firePrePreprocessor = function (name, config, desc) {
    preProcessingRegistryLib._doProcess(PrePreProcessors, desc, config, name);
  };

  return RESULT;
}

module.exports = libCreator;
