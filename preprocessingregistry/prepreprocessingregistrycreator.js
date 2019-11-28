function createPrePreProcessor (lib, PreProcessingRegistryBase) {
  'use strict';

  /**
   * Specialization of {@link allex_applib.PreProcessingRegistryBase}
   * that targets the `prepreprocessors` App/Element descriptor secion.
   *
   * It allows for an Array of configuration objects.
   *
   * @class
   * @memberof allex_applib
   * @augments allex_applib.PreProcessingRegistryBase
   */
  function PrePreProcessingRegistry () {
    PreProcessingRegistryBase.call(this);
  }
  lib.inherit(PrePreProcessingRegistry, PreProcessingRegistryBase);
  /**
   * Provides for the `prepreprocessors` name of the target
   * for the configurations within the descriptor
   *
   * @member
   */
  PrePreProcessingRegistry.prototype.targetDescriptorSectionName = 'prepreprocessors';
  /**
   * Overrides {@link allex://allex_applib.PreProcessingRegistryBase#allowArrayConfigs|PreProcessingRegistryBase.allowArrayConfigs}
   * to allow for an Array of configuration objects.
   *
   * @function
   * @returns `true`
   */
  PrePreProcessingRegistry.prototype.allowArrayConfigs = function () {
    return true;
  };


  return new PrePreProcessingRegistry();

}
module.exports = createPrePreProcessor;
