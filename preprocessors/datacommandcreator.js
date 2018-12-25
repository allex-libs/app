function createDataCommandPreprocessor (lib, preprocessingregistrylib, EnvironmentHelperPreprocessor) {
  'use strict';

  /**
   * Specializes the {@link allex://allex_applib.EnvironmentHelperPreprocessor|EnvironmentHelperPreprocessor}
   *
   * @class
   * @memberof allex_applib
   */
  function DataCommandPreprocessor () {
    EnvironmentHelperPreprocessor.call(this);
  }
  lib.inherit(DataCommandPreprocessor, EnvironmentHelperPreprocessor);
  /**
   * Overrides {@link allex://allex_applib.EnvironmentHelperPreprocessor#appTarget|EnvironmentHelperPreprocessor.environmentOptionsTarget} with the `'datacommands'` value.
   *
   * @member
   * @override
   */
  DataCommandPreprocessor.prototype.environmentOptionsTarget = 'datacommands';
  /**
   * Overrides {@link allex://allex_applib.EnvironmentHelperPreprocessor#appTarget|EnvironmentHelperPreprocessor.appTarget}
   *
   * @member
   * @override
   */
  DataCommandPreprocessor.prototype.appTarget = [{objdest: 'name', dest: 'datasources'}, {objdest: 'command', dest: 'commands'}];

  preprocessingregistrylib.PreProcessors.register('DataCommand', DataCommandPreprocessor);
}

module.exports = createDataCommandPreprocessor;
