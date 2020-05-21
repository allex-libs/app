function createDataElementFollowerMixin (lib, mylib) {
  'use strict';

  function DataElementFollowerMixin () {
    this.datamaster = null;
    this.masterDataListener = null;
  }
  DataElementFollowerMixin.prototype.destroy = function () {
    this.purgeDataMaster();
  };
  DataElementFollowerMixin.prototype.purgeDataMaster = function () {
    if (this.masterDataListener) {
      this.masterDataListener.destroy();
    }
    this.masterDataListener = null;
    this.datamaster = null;
  };
  DataElementFollowerMixin.prototype.startFollowingDataOn = function (dataemitter) {
    this.purgeDataMaster();
    if (!lib.isFunction(dataemitter.attachListener)) {
      console.warn('Method named "attachListener" was not found on dataemitter');
      return;
    }
    this.masterDataListener = dataemitter.attachListener('changed', 'data', this.onMasterDataChanged.bind(this));
    if (dataemitter.destroyed && (dataemitter.destroyed instanceof lib.HookCollection)) {
      dataemitter.destroyed.attachForSingleShot(this.purgeDataMaster.bind(this));
    }
  };
  DataElementFollowerMixin.prototype.startListeningToParentData = function () {
    this.startFollowingDataOn(this.__parent);
  };
  DataElementFollowerMixin.prototype.onMasterDataChanged = function (data) {
    var onMasterDataChanged = this.getConfigVal('onMasterDataChanged');
    if (lib.isFunction(onMasterDataChanged)) {
      onMasterDataChanged(this, data);
    }
  };
  DataElementFollowerMixin.prototype.set_datamaster = function (datamaster) {
    if (this.datamaster === datamaster) {
      return false;
    }
    this.startFollowingDataOn(datamaster);
    return true;
  };
  DataElementFollowerMixin.addMethods = function (klass) {
    lib.inheritMethods(klass, DataElementFollowerMixin
      ,'purgeDataMaster'
      ,'startFollowingDataOn'
      ,'startListeningToParentData'
      ,'onMasterDataChanged'
      ,'set_datamaster'
    );
  };

  mylib.DataElementFollowerMixin = DataElementFollowerMixin;
}

module.exports = createDataElementFollowerMixin;
