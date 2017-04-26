function createBasicElement (lib, Hierarchy, elementFactory, BasicParent, Linker, Resources, executeModifiers) {
  /*
    possible config params : 
      onInitialized : array of functions or function to be fired upon init
      elements : array of children elements
      onActual : array of function or function to be fired upon actual change


  */

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
    this.loadEvent = new lib.HookCollection();
    this.loading = false;
    this._hooks = new lib.Map();
    this._listeners = new lib.Map();
    this._addHook ('onInitialized');
    this._addHook ('onActual');
    this._addHook ('onLoaded');
    this.attachHook ('onInitialized', this.getConfigVal('onInitialized'));
  }
  lib.inherit (BasicElement, BasicParent);

  BasicElement.prototype.__cleanUp = function () {
    if (this._listeners) {
      this._listeners.traverse (lib.arryDestroyAll);
    }
    this._listeners.destroy();
    this._listeners = null;

    lib.containerDestroyAll (this._hooks);
    this._hooks.destroy();
    this._hooks = null;

    this.loadEvent.destroy();
    this.loadEvent = null;

    this._loading_promise = null;
    this.loading = null;
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

  BasicElement.prototype.fireInitializationDone = function () {
    this.fireHook('onInitialized', [this]);
    this._removeHook ('onInitialized'); /// no need to keep this any more ...
    this.attachHook('onActual', this.getConfigVal('onActual'));
    this.attachHook('onLoaded', this.getConfigVal('onLoaded'));
  };

  BasicElement.prototype.DEFAULT_CONFIG = function () {
    return null;
  };

  BasicElement.prototype.createElement = function (desc) {
    BasicElement.createElement(desc, this.addChild.bind(this));
  };

  BasicElement.prototype.set_actual = function (val) {
    this.actual = val;
    var ld = this.set.bind(this, 'loading', false);
    if (val) {
      if (!this._loading_promise) {
        this.set('loading', true);
        this._loading_promise = this.load();

        this._loading_promise.done(ld, ld, this.loadEvent.fire.bind(this.loadEvent));
        this._loading_promise.done(this.onLoaded.bind(this), this.onLoadFailed.bind(this), this.onLoadProgress.bind(this));
      }
    }else{
      if (this._loading_promise) {
        this._loading_promise = null;
        this.unload();
      }
      this.onUnloaded();
    }

    this.fireHook ('onActual', [this, val]);
    return true;
  };

  function getResourceAndCheckLoad (loadEvent, getResource, promisses, item) {
    //promisses.push (item.load());
    var p = item.load();
    p.done(null, null, loadEvent.fire.bind(loadEvent));
    promisses.push (p);
  }

  BasicElement.prototype.load = function () {
    var resources = this.resources;
    if (!resources) return q.resolve('ok');
    var promisses = [];
    resources.traverse (getResourceAndCheckLoad.bind(null, this.loadEvent, Resources.getResource, promisses));
    return q.all(promisses);
  };

  function unloadResource (el, resource, name) {
    resource.unload();
  }

  BasicElement.prototype.unload = function () {
    if (!this.resources) return;
    this.resources.traverse (unloadResource.bind(null, this));
  };

  BasicElement.prototype.onUnloaded = lib.dummyFunc;
  BasicElement.prototype.onLoaded = lib.dummyFunc;
  BasicElement.prototype.onLoadFailed = lib.dummyFunc;
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
    executeModifiers (desc);
    var el = elementFactory(desc);
    after_ctor(el);
    prepareResources(el, desc.requires);
    el.set('actual', desc.actual || false);
    el.initialize();
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


  BasicElement.prototype._addHook = function (name) {
    this._hooks.add (name, new lib.HookCollection());
  };

  BasicElement.prototype._getHook = function (name) {
    var hook = this._hooks.get(name);
    if (!hook) throw new Error('Hook '+name+' not supported');
    return hook;
  };

  BasicElement.prototype.attachHook = function (name, ftions) {
    if (!ftions) {
      //destroy hooks which are not needed ...
      this._removeHook (name);
      return;
    }
    var hook = this._getHook(name);

    if (lib.isFunction(ftions)) {
      ftions = [ftions];
    }
    ftions = ftions.filter(lib.isFunction);
    var listeners = new Array(ftions.length);
    for (var i = 0; i < ftions.length; i++){
      listeners[i] = hook.attach (ftions[i]);
    }
    this._listeners.add(name, listeners);
  };

  BasicElement.prototype.fireHook = function (name, args) {
    var hook = this._hooks.get(name);
    if (!hook) return;
    hook.fire.apply (hook , args);
  };

  BasicElement.prototype._removeHook = function (name) {
    var hook = this._hooks.remove(name);
    if (!hook) return;
    var _listeners = this._listeners.remove(name);
    if (_listeners) {
      lib.arryDestroyAll (_listeners);
      _listeners = null;
    }
    hook.destroy();
    hook = null;
  };

  return BasicElement;
}

module.exports = createBasicElement;
