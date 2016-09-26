function createPreProcessor (lib) {
  'use strict';

  var PreProcessors = [];

  function registerPreprocessor (instance) {
    if (!(instance instanceof BasicProcessor)) throw new Error('PreProcessor must be instance of BasicProcessor'); //za sad ...
    PreProcessors.push (instance);
  }

  function process (desc) {
    if (!PreProcessors.length) return;

    for (var i in PreProcessors) {
      PreProcessors[i].process(desc);
      PreProcessors[i].destroy();
      PreProcessors[i] = null;
    }

    PreProcessors = null;
  }


  function BasicProcessor () {} 
  BasicProcessor.prototype.process = function (desc) {
    throw new Error('Not implemented');
  };
  BasicProcessor.prototype.destroy = lib.dummyFunc;

  return  {
    registerPreprocessor : registerPreprocessor,
    process : process,
    BasicProcessor : BasicProcessor
  };
}
module.exports = createPreProcessor;
