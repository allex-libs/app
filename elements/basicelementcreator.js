function createBasicElement (lib, Hierarchy, elementFactory, BasicParent, Linker, Resources, executeModifiers, LinksAndLogicDestroyableMixin, PrePreProcessor, PreProcessor, jobondestroyablelib) {
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
    jobs = require('./jobs')(lib, jobondestroyablelib, Resources),
    ElementLoaderJob = jobs.ElementLoaderJob,
    ElementUnloaderJob = jobs.ElementUnloaderJob;

  /**
   * The base class for all descendant Element classes.
   *
   * @class
   * @memberof allex_applib
   */

  function BasicElement (id, options) {
    //console.log('new', this.constructor.name, id);
    BasicParent.call(this);
    Child.call(this);
    Gettable.call(this);
    Configurable.call(this, options);
    LinksAndLogicDestroyableMixin.call(this);

    this.jobs = new qlib.JobCollection();
    this.id = id;
    this.actual = null;
    this._link = null;
    this.resourcedescs = null;
    this.resourcereqs = null;
    this.resourcealiases = null;
    this._loading_promise = null;
    this.loadEvent = new lib.HookCollection();
    this.loading = false;
    this.initialized = false;
    this._hooks = new lib.Map();
    this._listeners = new lib.Map();
    this._addHook ('onInitialized');
    this._addHook ('onActual');
    this._addHook ('onLoaded');
    this.attachHook ('onInitialized', this.getConfigVal('onInitialized'));
  }
  lib.inherit (BasicElement, BasicParent);
  LinksAndLogicDestroyableMixin.addMethods(BasicElement);

  BasicElement.prototype.__cleanUp = function () {
    //console.log(this.constructor.name, this.id, 'dying');
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
    this.initialized = null;
    this.loading = null;
    if (this.resourcealiases) {
      this.resourcealiases.destroy();
    }
    this.resourcealiases = null;
    this.resourcereqs = null;
    this.resourcedescs = null;
    if (this._link) this._link.destroy();

    this.actual = null;
    this.id = null;
    if (this.jobs) {
      this.jobs.destroy();
    }
    this.jobs = null;

    LinksAndLogicDestroyableMixin.prototype.destroy.call(this);
    Configurable.prototype.__cleanUp.call(this);
    Gettable.prototype.__cleanUp.call(this);
    Child.prototype.__cleanUp.call(this);
    BasicParent.prototype.__cleanUp.call(this);
  };

  lib.inheritMethods (BasicElement, Child, 'set__parent', 'rootParent', 'leaveParent');
  lib.inheritMethods (BasicElement, Gettable, 'get');
  Configurable.addMethods(BasicElement);

  BasicElement.prototype.initialize = function () {
    var subelements;
    preInitialize(this);
    this.actual = this.getConfigVal('actual') || false;
    handleLoading(this, this.getConfigVal('actual'));
    subelements = this.getConfigVal('elements');
    if (lib.isArray(subelements)) {
      subelements.forEach(this.createElement.bind(this));
    }
    postInitialize(this);
    this.fireInitializationDone();
  };

  function handleLoading (be, newactual) {
    if (newactual) {
      if (!be._loading_promise) {
        be.set('loading', true);
        be._loading_promise = be.load();
        be._loading_promise.then(be.onLoaded.bind(be), be.onLoadFailed.bind(be), be.onLoadProgress.bind(be));
      }
    }else{
      if (be._loading_promise) {
        be._loading_promise = null;
        be.unload();
      }
      be.onUnloaded();
    }
  };

  function preInitialize (elem) {
    traverseMethodNames(elem, elem.preInitializationMethodNames);
  }

  function postInitialize (elem) {
    traverseMethodNames(elem, elem.postInitializationMethodNames);
  }

  function traverseMethodNames (elem, methodnames) {
    if (!lib.isArray(methodnames)) {
      return;
    }
    methodnames.forEach(applier.bind(null, elem));
    elem = null;
  }

  function applier (elem, methodname) {
    if (!lib.isFunction(elem[methodname])) {
      throw new Error(methodname+' is not a name of a method of '+elem.constructor.name);
    }
    elem[methodname]();
  }

  BasicElement.prototype.fireInitializationDone = function () {
    this.fireHook('onInitialized', [this]);
    this._removeHook ('onInitialized'); /// no need to keep this any more ...
    this.set('initialized', true);
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
    if (!this.loadEvent) {
      return;
    }
    this.actual = val;
    handleLoading(this, val);

    this.fireHook ('onActual', [this, val]);
    return true;
  };

  BasicElement.prototype.load = function () {
    return this.jobs.run('.', new ElementLoaderJob(this));
  };

  BasicElement.prototype.unload = function () {
    return this.jobs.run('.', new ElementUnloaderJob(this));
  };

  BasicElement.prototype.onLoaded = function () {
    this.set('loading', false);
    this.loadEvent.fire(this);
  };

  BasicElement.prototype.onLoadFailed = function (reason) {
    console.error(reason);
    this.onUnloaded();
  };

  BasicElement.prototype.onUnloaded = function () {
    this.set('loading', false);
  };

  BasicElement.prototype.onLoadProgress = lib.dummyFunc;

  BasicElement.prototype.childChanged = function (el, name, value) {
    var icac;
    if ('actual' === name && value) {
      icac = this.getConfigVal('ignorechildactualchange');
      if (!icac) {
        this.set('actual', true); ///this will emit childChanged ....
      }
      if (lib.isArray(icac) && icac.indexOf(el.id)<0) {
        this.set('actual', true); ///this will emit childChanged ....
      }
      return;
    }
    return this.__parent ? this.__parent.childChanged(el, name, value) : undefined;
  };

  BasicElement.prototype.getElement = function () { throw new Error('Not implemented'); }
  BasicElement.prototype.addAppLink = lib.dummyFunc;

  function realResourceNameFinder(targetname, result, resourcename) {
    if (targetname===resourcename) {
      return targetname;
    }
    if (targetname===resourcename.alias) {
      return resourcename.resource;
    }
    return result;
  }
  BasicElement.prototype.getResource = function (name) {
    return Resources.getResource(this.realResourceName(name));
  };
  BasicElement.prototype.realResourceName = function (name) {
    var ret;
    if (this.resourcealiases) {
      ret = this.resourcealiases.get(name);
      if (ret) {
        return ret;
      }
    }
    return name;
  };

  BasicElement.prototype.updateResource = function (resource){ //resource : string or hash
    if (resource && lib.isString(resource.alias) && lib.isString(resource.alias)) {
      if (!this.resourcealiases) {
        this.resourcealiases = new lib.Map();
      }
      this.resourcealiases.replace(resource.alias, resource.resource)
    }
  };

  BasicElement.createElement = function (desc, after_ctor) {
    PrePreProcessor.process(desc);
    PreProcessor.process(desc);
    executeModifiers (true, desc);
    var el = elementFactory(desc);
    after_ctor(el);
    el.resourcedescs = desc ? (desc.resources||[]) : [];
    el.resourcereqs = desc ? (desc.requires||[]) : [];
    //prepareResources(el, desc.requires);
    if ('actual' in desc) {
      console.error(desc);
      throw new Error('actual has to be in "options"');
    }
    el.initialize();
    el._link = new Linker.LinkingEnvironment(el);
    el._link.produceLinks(desc.links).then(el.setLinks.bind(el));
    el._link.produceLogic(desc.logic).then(el.setLogic.bind(el));
  }

  /*
  function prepareResources (el, requires) {
    if (!requires || !requires.length || !lib.isArray(requires)) return;
    requires.forEach (prepareResource.bind(null, el));
  };
  */

  /*
  function prepareResource (el, resource) {
    if (!el.resourcereqs) {
      el.resourcereqs = new lib.Map();
    }
    var resid, resalias;
    if (lib.isString(resource)) {
      resid = resource;
      resalias = resource;
    }else{
      resid = resource.resource;
      resalias = resource.alias;
    }
    el.resourcereqs.replace(resalias, Resources.getResource(resid));
  }
  */


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
    if (!this._hooks) {
      console.error('already dead');
      return;
    }
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

  BasicElement.prototype.preInitializationMethodNames = [];
  BasicElement.prototype.postInitializationMethodNames = [];

  return BasicElement;
}

module.exports = createBasicElement;
