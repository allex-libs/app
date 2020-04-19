function createDataUpdaterMixin (lib, mylib) {
  'use strict';

  function DataUpdaterMixin () {
  }
  DataUpdaterMixin.prototype.destroy = lib.dummyFunc;

  DataUpdaterMixin.prototype.updateHashField = function (name, value) {
    var val = {};
    val[name] = value;
    this.set('data', lib.extend ({}, this.get('data'), val));
  };

  DataUpdaterMixin.prototype.updateArrayElement = function (index, value) {
    var old = this.get('data'),
      n = old ? old.slice() : [];

    n[index] = value;
    this.set('data', n);
  };

  DataUpdaterMixin.addMethods = function (klass) {
    lib.inheritMethods (klass, DataUpdaterMixin
      ,'updateHashField'
      ,'updateArrayElement'
    );
  };

  mylib.DataUpdaterMixin = DataUpdaterMixin;
}
module.exports = createDataUpdaterMixin;
