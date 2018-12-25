function createDataSourcePreprocessor (lib, preprocessingregistrylib, EnvironmentHelperPreprocessor) {
  'use strict';

  /**
   *
   * Specializes the
   * {@link allex://allex_applib.EnvironmentHelperPreprocessor|EnvironmentHelperPreprocessor}
   * in order to specify
   * - {@link allex://allex_applib.DataSourcePreprocessor#environmentOptionsTarget|environmentOptionsTarget}
   * - {@link allex://allex_applib.DataSourcePreprocessor#appTarget|appTarget}
   *
   * @class
   * @memberof allex_applib
   */

  function DataSourcePreprocessor () {
    EnvironmentHelperPreprocessor.call(this);
  }
  lib.inherit(DataSourcePreprocessor, EnvironmentHelperPreprocessor);
  /**
   * Overrides {@link allex://allex_applib.EnvironmentHelperPreprocessor#environmentOptionsTarget|EnvironmentHelperPreprocessor.environmentOptionsTarget} with the `'datasources'` value.
   *
   * @member
   * @override
   */
  DataSourcePreprocessor.prototype.environmentOptionsTarget = 'datasources';
  /**
   * Overrides {@link allex://allex_applib.EnvironmentHelperPreprocessor#appTarget|EnvironmentHelperPreprocessor.appTarget}
   *
   * @member
   * @override
   */
  DataSourcePreprocessor.prototype.appTarget = {objdest: 'name', dest: 'datasources'};

  preprocessingregistrylib.PreProcessors.register('DataSource', DataSourcePreprocessor);
}

module.exports = createDataSourcePreprocessor;
