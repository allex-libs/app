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
    this.dataSourceNames = [];
    this.commandNames = [];
    this.elementIDs = [];
  }
  LinksAndLogicDestroyableMixin.addMethods(DescriptorHandler);
  DescriptorHandler.prototype.destroy = function () {
    this.unload();
    this.elementIDs = null;
    this.commandNames = null;
    this.dataSourceNames = null;
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
    if (lib.isArray(this.dataSourceNames)) {
      this.dataSourceNames.forEach(destroyMapElement.bind(null, this.app.datasources));
      this.dataSourceNames = [];
    }
    if (lib.isArray(this.commandNames)) {
      this.commandNames.forEach(destroyMapElement.bind(null, this.app.commands));
      this.commandNames = [];
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


  //on element destruction
  DescriptorHandler.ackElementLosingParent = function (el) {
    var app = ourlib.App, elements;
    if (!(app && app.elements)) {
      return;
    }
    if (!(el && el.__parent && el.__parent.id)) {
      return;
    }
    elements = app.elements;
    //console.log('==> ackElementLosingParent', el.myNameOnMasterEnvironment());
    removeElementFromElements(elements, el);
    //console.log('============');
    elements = null;
    app = null;
  };

  function removeElementFromElements (elems, el) {
    var id = el.myNameOnMasterEnvironment(), check;
    el.__children.traverse(removeElementFromElements.bind(null, elems));
    check = elems.remove(id);
    //console.log('removing', id, el.__parent ? 'with' : 'w/o', 'parent', check ? 'success' : 'fail');
    elems = null;
  }

  //endof on element destruction

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
