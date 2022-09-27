function createBaseDescriptorArrayProcessingCore (lib, mylib) {
  'use strict';

  var q = lib.q;

  function DescriptorArrayJobCore (descriptorloaderjobcore, arrayname) {
    this.descriptorLoaderJobCore = descriptorloaderjobcore;
    this.arrayName = arrayname;
    this.index = -1;
    this.results = [];
  }
  DescriptorArrayJobCore.prototype.destroy = function () {
    this.results = null;
    this.index = null;
    this.arrayName = null;
    this.descriptorLoaderJobCore = null;
  };
  DescriptorArrayJobCore.prototype.shouldContinue = function () {
    if (!this.descriptorLoaderJobCore) {
      return new lib.Error('ALREADY_DESTROYED', 'This instance of '+this.constructor.name+' is already destroyed');
    }
    if (!this.descriptorLoaderJobCore.descriptor) {
      return new lib.Error('INVALID_DESCRIPTOR_LOADER_JOB_CORE', 'This instance of '+this.constructor.name+' needs a valid DescriptorLoaderJobCore, but this one does not have a descriptor');
    }
    return this.descriptorLoaderJobCore.shouldContinue();
  };
  DescriptorArrayJobCore.prototype.app = function () {
    return this.descriptorLoaderJobCore.app;
  };
  DescriptorArrayJobCore.prototype.descriptor = function () {
    return this.descriptorLoaderJobCore.descriptor;
  };
  DescriptorArrayJobCore.prototype.array = function () {
    return this.descriptor()[this.arrayName];
  };
  DescriptorArrayJobCore.prototype.stepOne = function (prevres) {
    var arry = this.array(), oneres;
    if (this.index >= 0) {
      this.onItem(prevres);
    }
    if (!lib.isArray(arry)) {
      return [];
    }
    this.index ++;
    if (this.index >= arry.length) {
      return this.results;
    }
    oneres = this.doOneItem(arry[this.index]);
    if (q.isThenable(oneres)) {
      return oneres.then(this.stepOne.bind(this));
    }
    return this.stepOne(oneres);
  };
  DescriptorArrayJobCore.prototype.doOneItem = function (item) {
    throw new lib.Error('NOT_IMPLEMENTED', this.constructor.name+' has to implement doOneItem');
  };
  DescriptorArrayJobCore.prototype.onItem = function (item) {
    this.results.push(item);
  };
  DescriptorArrayJobCore.prototype.steps = [
    'stepOne'
  ];

  mylib.DescriptorArrayJobCore = DescriptorArrayJobCore;

  /*
  function DescriptorArrayNotifyingJobCore (descriptorloaderjobcore, arrayname) {
    DescriptorArrayJobCore.call(this, descriptorloaderjobcore, arrayname);
    this.notify = new lib.HookCollection();
  }
  lib.inherit(DescriptorArrayNotifyingJobCore, DescriptorArrayJobCore);
  DescriptorArrayNotifyingJobCore.prototype.destroy = function () {
    if (this.notify) {
      this.notify.destroy();
    }
    this.notify = null;
    DescriptorArrayJobCore.prototype.destroy.call(this);
  };
  DescriptorArrayNotifyingJobCore.prototype.onItem = function (item) {
    DescriptorArrayJobCore.prototype.onItem.call(this, item);
    this.notify.fire(item);
  };

  mylib.DescriptorArrayNotifyingJobCore = DescriptorArrayNotifyingJobCore;
  */
}
module.exports = createBaseDescriptorArrayProcessingCore;