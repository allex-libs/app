function createCommandPreprocessor (lib, preprocessingregistrylib, EnvironmentHelperPreprocessor) {
  'use strict';

  /**
   * Specializes the {@link allex://allex_applib.EnvironmentHelperPreprocessor|EnvironmentHelperPreprocessor}
   *
   * @class
   * @memberof allex_applib
   */
  function CommandPreprocessor () {
    EnvironmentHelperPreprocessor.call(this);
  }
  lib.inherit(CommandPreprocessor, EnvironmentHelperPreprocessor);
  /**
   * Overrides {@link allex://allex_applib.EnvironmentHelperPreprocessor#appTarget|EnvironmentHelperPreprocessor.environmentOptionsTarget} with the `'commands'` value.
   *
   * @member
   * @override
   */
  CommandPreprocessor.prototype.environmentOptionsTarget = 'commands';
  /**
   * Overrides {@link allex://allex_applib.EnvironmentHelperPreprocessor#appTarget|EnvironmentHelperPreprocessor.appTarget}
   *
   * @member
   * @override
   */
  CommandPreprocessor.prototype.appTarget = [{objdest: 'command', dest: 'commands'}];

  preprocessingregistrylib.PreProcessors.register('Command', CommandPreprocessor);
}

module.exports = createCommandPreprocessor;
