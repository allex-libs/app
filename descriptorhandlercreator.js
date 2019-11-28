function createDescriptorHandler (lib, mixins, ourlib) {
  'use strict';
  var q = lib.q,
    LinksAndLogicDestroyableMixin = mixins.LinksAndLogicDestroyableMixin;

  function DescriptorHandler (descriptor) {
    LinksAndLogicDestroyableMixin.call(this);
    if (!ourlib.App) {
      throw new Error('Allex App object has not yet been created');
    }
    if (!descriptor) {
      throw new Error('A descriptor is needed to instantiate a DescriptorHandler');
    }
    this.descriptor = descriptor;
    this.app = ourlib.App;
    this.environmentNames = [];
    this.elementIDs = [];
  }
  LinksAndLogicDestroyableMixin.addMethods(DescriptorHandler);
  DescriptorHandler.prototype.destroy = function () {
    this.unload();
    this.elementIDs = null;
    this.environmentNames = null;
    this.app = null;
    this.descriptor = null;
  };
  DescriptorHandler.prototype.load = function () {
    if (!this.app) {
      return q.reject(new lib.Error('ALREADY_DESTROYED'));
    }
    return this.app.loadDescriptor(this);
  };
  DescriptorHandler.prototype.unload = function () {
    LinksAndLogicDestroyableMixin.prototype.destroy.call(this);
    if (!this.app) {
      return q(true);
    }
    if (lib.isArray(this.environmentNames)) {
      this.environmentNames.forEach(destroyMapElement.bind(null, this.app.environments));
      this.environmentNames = [];
    }
    if (lib.isArray(this.elementIDs)) {
      this.elementIDs.forEach(destroyMapElement.bind(null, this.app.elements));
      this.elementIDs = [];
    }
    return q(true);
  };
  DescriptorHandler.prototype.addElementID = function (id) {
    this.elementIDs.push(id);
  };
  DescriptorHandler.prototype.addEnvironmentName = function (name) {
    this.environmentNames.push(name);
  };

  function destroyMapElement (map, elementid) {
    if (!elementid) {
      return;
    }
    var e = map.remove(elementid);
    if (e) {
      e.destroy();
    }
    e = map.get(elementid);
    if (e) {
      console.error('destroyMapElement failed, there is still', e, 'at', elementid);
    }
  }

  return DescriptorHandler;
}

module.exports = createDescriptorHandler;
