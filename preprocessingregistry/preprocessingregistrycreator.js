function createPreProcessor (lib, PreProcessingRegistryBase) {
  'use strict';

  /**
   * @class
   * @memberof allex_applib
   * @classdesc
   * Specialization of {@link allex_applib.PreProcessingRegistryBase}
   * that targets the `preprocessors` App/Element descriptor secion.
   *
   * It doesn't allow for an Array of configuration objects.
   *
   */
  function PreProcessingRegistry () {
    PreProcessingRegistryBase.call(this);
  }
  lib.inherit(PreProcessingRegistry, PreProcessingRegistryBase);
  /**
   * Provides for the `preprocessors` name of the target
   * for the configurations within the descriptor
   *
   * @member
   */
  PreProcessingRegistry.prototype.targetDescriptorSectionName = 'preprocessors';


  return new PreProcessingRegistry();

}
module.exports = createPreProcessor;
