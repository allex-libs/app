function createPreProcessor (lib) {
  'use strict';

  var PreProcessors = new lib.Map ();

  function registerPreprocessor (name, ctor) {

    var instance = new ctor();
    if (!(instance instanceof BasicProcessor)) throw new Error('PreProcessor must be instance of BasicProcessor'); //za sad ...

    PreProcessors.add (name, instance);
  }

  function _doProcess (configs, desc, item, name) {
    item.configure ( configs ? configs[name] : null);
    item.process(desc);
    item.destroy();
  }

  function process (desc) {
    var configs = desc.preprocessors;
    desc.preprocessors = null;
    PreProcessors.traverse (_doProcess.bind(null, configs, desc));
    lib.containerDestroyAll (PreProcessors);
    PreProcessors.destroy();
    PreProcessors = null;
  }


  function BasicProcessor () {
    this.config = null;
  } 
  BasicProcessor.prototype.process = function (desc) {
    throw new Error('Not implemented');
  };
  BasicProcessor.prototype.destroy = function () {
    this.config = null;
  };

  BasicProcessor.prototype.configure = function (config) {
    this.config = config;
  };

  //TODO: cinfig interface ?

  return  {
    registerPreprocessor : registerPreprocessor,
    process : process,
    BasicProcessor : BasicProcessor
  };
}
module.exports = createPreProcessor;
