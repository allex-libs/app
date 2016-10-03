function createBasicElement (lib, Hierarchy, elementFactory, BasicParent, Linker, Resources) {

  'use strict';
  var Child = Hierarchy.Child,
    Gettable = lib.Gettable,
    Configurable = lib.Configurable,
    q = lib.q,
    qlib = lib.qlib,
    resourceFactory = Resources.resourceFactory;

  function BasicElement (id, options) {
    BasicParent.call(this);
    Child.call(this);
    Gettable.call(this);
    Configurable.call(this, options);

    this.id = id;
    this.actual = null;
    this._link = null;
    this.resources = null;
    this._loading_promise = null;
  }
  lib.inherit (BasicElement, BasicParent);

  BasicElement.prototype.__cleanUp = function () {
    this._loading_promise = null;
    if (this.resources) {
      this.resources.destroy();
    }
    this.resources = null;
    if (this._link) this._link.destroy();

    this.actual = null;
    this.id = null;

    Configurable.prototype.__cleanUp.call(this);
    Gettable.prototype.__cleanUp.call(this);
    Child.prototype.__cleanUp.call(this);
  };

  lib.inheritMethods (BasicElement, Child, 'set__parent', 'rootParent', 'leaveParent');
  lib.inheritMethods (BasicElement, Gettable, 'get');
  Configurable.addMethods(BasicElement);

  BasicElement.prototype.initialize = function () {
    var subelements = this.getConfigVal('elements');
    if (!subelements || subelements.length === 0){ return; }
    subelements.forEach(this.createElement.bind(this));
  };

  BasicElement.prototype.DEFAULT_CONFIG = function () {
    return null;
  };

  BasicElement.prototype.createElement = function (desc) {
    BasicElement.createElement(desc, this.addChild.bind(this));
  };

  BasicElement.prototype.set_actual = function (val) {
    if (this.actual === val) return false;
    this.actual = val;
    if (val) {
      if (!this._loading_promise) {
        this._loading_promise = this.load();
        this._loading_promise.done(this.onLoaded.bind(this), this.onLoadFailed.bind(this), this.onLoadProgress.bind(this));
      }
    }else{
      if (this._loading_promise) {
        this._loading_promise = null;
        this.unload();
      }
      //console.log('will call onUnloaded' ,this.get('id'));
      this.onUnloaded();
    }
    return true;
  };

  function getResourceAndCheckLoad (getResource, promisses, item) {
    promisses.push (item.load());
  }

  BasicElement.prototype.load = function () {
    var resources = this.resources;
    if (!resources) return q.resolve('ok');
    var promisses = [];
    resources.traverse (getResourceAndCheckLoad.bind(null, Resources.getResource, promisses));
    return q.all(promisses);
  };

  function unloadResource (el, resource, name) {
    resource.unload();
  }

  BasicElement.prototype.unload = function () {
    if (!this.resources) return;
    this.resources.traverse (unloadResource.bind(null, this));
  };

  BasicElement.prototype.onLoaded = function () {
    throw new Error('onLoaded not implemented');
  };

  BasicElement.prototype.onLoadFailed = function () {
    throw new Error('onLoadFailed not implemented');
  };

  BasicElement.prototype.onLoadProgress = lib.dummyFunc;

  BasicElement.prototype.childChanged = function (el, name, value) {
    if ('actual' === name && value) {
      this.set('actual', true);
      return; ///this one will emmit childChanged ....
    }
    return this.__parent ? this.__parent.childChanged(el, name, value) : undefined;
  };

  BasicElement.prototype.getElement = function () { throw new Error('Not implemented'); }
  BasicElement.prototype.addAppLink = lib.dummyFunc;

  BasicElement.prototype.getResource = function (name) {
    return this.resources ? this.resources.get(name) : null;
  };

  BasicElement.prototype.updateResource = function (resource){ //resource : string or hash
    prepareResource (this, resource);
  };

  BasicElement.createElement = function (desc, after_ctor) {
    var el = elementFactory(desc);
    after_ctor(el);
    prepareResources(el, desc.requires);
    el.initialize();
    el.set('actual', desc.actual || false);
    el._link = new Linker.LinkingEnvironment(el);
    el._link.produceLinks(desc.links);
    el._link.produceLogic(desc.logic);
  }

  function prepareResources (el, requires) {
    if (!requires || !requires.length || !lib.isArray(requires)) return;
    requires.forEach (prepareResource.bind(null, el));
  };

  function prepareResource (el, resource) {
    if (!el.resources) {
      el.resources = new lib.Map();
    }
    var resid, resalias;
    if (lib.isString(resource)) {
      resid = resource;
      resalias = resource;
    }else{
      resid = resource.resource;
      resalias = resource.alias;
    }
    el.resources.replace(resalias, Resources.getResource(resid));
  }

  return BasicElement;
}

module.exports = createBasicElement;
