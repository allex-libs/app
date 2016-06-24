function createDataSource (lib) {
  'use strict';

  var CLDestroyable = lib.CLDestroyable;

  function AppSideDataSource () {
    CLDestroyable.call(this);
    this.data = null;
  }

  lib.inherit (AppSideDataSource, CLDestroyable);
  AppSideDataSource.prototype.__cleanUp = function () {
    this.data = null;
    CLDestroyable.prototype.__cleanUp.call(this);
  };

  return AppSideDataSource;
}

module.exports = createDataSource;
