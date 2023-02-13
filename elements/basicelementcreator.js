function createBasicElement (lib, Hierarchy, elementFactory, BasicParent, Linker, Resources, executeModifiers, LinksAndLogicDestroyableMixin, PrePreProcessor, PreProcessor, DescriptorHandler, descriptorapi) {
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
    jobs = require('./jobs')(lib, Resources, DescriptorHandler, descriptorapi),
    jobcores = require('./jobcores')(lib, Resources, DescriptorHandler, Linker, jobs),
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
    this.loadEvent = this.createBufferableHookCollection(); //new lib.HookCollection();
    this.loading = false;
    this.initialized = false;
    this._hooks = new lib.Map();
    this._listeners = new lib.Map();
    this.loadedEnvironment = {
      initial: null,
      static: null,
      dynamic: null
    };
    this._addHook ('onInitialized');
    this._addHook('onInitiallyLoaded');
    this._addHook ('onActual');
    this._addHook ('onLoaded');
    this.attachHook ('onInitialized', this.getConfigVal('onInitialized'));
  }
  lib.inherit (BasicElement, BasicParent);
  LinksAndLogicDestroyableMixin.addMethods(BasicElement);

  BasicElement.prototype.__cleanUp = function () {
    //console.log(this.constructor.name, this.id, 'dying');
    //DescriptorHandler.ackElementDestroyed(this);
    this.clearConfigHooks('onInitialized');
    this.clearConfigHooks('onInitiallyLoaded');
    this.clearConfigHooks('onLoaded');
    this.clearConfigHooks('onActual');
    if (this.loadedEnvironment) {
      if (this.loadedEnvironment.dynamic) {
        this.loadedEnvironment.dynamic.destroy();
      }
      this.loadedEnvironment.dynamic = null;
      if (this.loadedEnvironment.static) {
        this.loadedEnvironment.static.destroy();
      }
      this.loadedEnvironment.static = null;
      if (this.loadedEnvironment.initial) {
        this.loadedEnvironment.initial.destroy();
      }
      this.loadedEnvironment.initial = null;
    }
    this.loadedEnvironment = null;
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

  BasicElement.prototype.removeChild = function (child) {
    DescriptorHandler.ackElementLosingParent(child);
    return BasicParent.prototype.removeChild.call(this, child);
  };

  BasicElement.prototype.initializeFrom = function (desc) {
    var subelements;
    preInitialize(this);
    this.actual = this.getConfigVal('actual') || false;
    this.jobs.run('.', qlib.newSteppedJobOnSteppedInstance(
      new jobcores.Initializer(this, desc)
    )).then(null, onInitializeFailed.bind(this));
  };

  function onInitializeFailed (reason) {
    console.error(this.id, 'failed to initialize', reason);
    this.destroy(reason);
  }

  function handleLoading (be, newactual) {
    be[newactual ? 'load' : 'unload']();
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
    this.attachHook ('onInitiallyLoaded', this.getConfigVal('onInitiallyLoaded'));
    this.attachHook('onLoaded', this.getConfigVal('onLoaded'));
    this.attachHook('onActual', this.getConfigVal('onActual'));

    this.set('initialized', true);
    handleLoading(this, this.getConfigVal('actual'));
    postInitialize(this);
  };

  BasicElement.prototype.queueMethodInvocation = function (methodname, args) {
    return this.jobs.run('.', qlib.newSteppedJobOnSteppedInstance(
      new jobcores.MethodInvoker(
        this,
        methodname,
        args
      )
    ));
  };

  BasicElement.prototype.DEFAULT_CONFIG = function () {
    return null;
  };

  BasicElement.prototype.createElement = function (desc) {
    return BasicElement.createElement(desc, this.addChild.bind(this));
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
    this.fireHook('onInitiallyLoaded', [this]);
    this._removeHook('onInitiallyLoaded');
    this.fireHook('onLoaded', [this]);
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

  function splitAtDot (str) {
    var dotpos = str.indexOf('.');
    if (dotpos>=0) {
      return [str.slice(0,dotpos), str.slice(dotpos+1)];
    }
    return [str, null];
  }

  BasicElement.prototype.getElement = function (path) { 
    var splits, elem;
    splits = splitAtDot(path);
    //console.log(path, '=>', splits);
    if (!splits[0]) {
      elem = this;
    } else {
      elem = this.findById(splits[0]);
    }
    if (!elem) {
      throw new lib.Error('INVALID_PATH', 'Element '+this.id+' does not have element '+path);
    }
    return splits[1] ? elem.getElement(splits[1]) : elem;
  };
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
    try {
      PrePreProcessor.process(desc);
      PreProcessor.process(desc);
      executeModifiers (true, desc);
      var el = elementFactory(desc);
      el.bufferAllBufferableHookCollections();
      after_ctor(el);
      el.resourcedescs = desc ? (desc.resources||[]) : [];
      el.resourcereqs = desc ? (desc.requires||[]) : [];
      if ('actual' in desc) {
        console.error(desc);
        throw new Error('actual has to be in "options"');
      }
      el.initializeFrom(desc);
      return el;
    } catch (e) {
      console.error('Could not create element from desc', desc);
      console.error(e);
      throw e;
    }
  }

  BasicElement.prototype._addHook = function (name) {
    this._hooks.add (name, new lib.HookCollection());
  };

  BasicElement.prototype._getHook = function (name) {
    var hook = this._hooks.get(name);
    //if (!hook) throw new Error('Hook '+name+' not supported');
    return hook;
  };

  BasicElement.prototype.attachHook = function (name, ftions) {
    if (!ftions) {
      //destroy hooks which are not needed ...
      this._removeHook (name);
      return;
    }
    var hook = this._getHook(name);
    if (!hook) {
      return;
    }

    if (lib.isFunction(ftions)) {
      ftions = [ftions];
    }
    ftions = ftions.filter(lib.isFunction);
    var listeners = new Array(ftions.length);
    for (var i = 0; i < ftions.length; i++){
      listeners[i] = hook.attach (ftions[i]);
    }
    this._listeners.replace(name, listeners);
  };

  BasicElement.prototype.fireHook = function (name, args) {
    if (!this._hooks) {
      return;
    }
    var hook = this._hooks.get(name);
    if (!hook) return;
    hook.fire.apply (hook, args);
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

  BasicElement.prototype.clearConfigHooks = function (configvalname) {
    var cfh = this.getConfigVal(configvalname);
    if (lib.isArray(cfh)) {
      cfh.splice(0, cfh.length);
    }
  };

  BasicElement.prototype.initialEnvironmentDescriptor = function () {
    return null;
  };
  BasicElement.prototype.initialElementDescriptors = function () {
    return null;
  };
  BasicElement.prototype.staticEnvironmentDescriptor = function () {
    return null;
  };
  BasicElement.prototype.staticElementDescriptors = function () {
    return null;
  };
  BasicElement.prototype.actualEnvironmentDescriptor = function () {
    return null;
  };
  BasicElement.prototype.actualElementDescriptors = function () {
    return null;
  };

  BasicElement.prototype.myNameOnMasterEnvironment = function () {
    var ret = this.id, parent = this.__parent;
    while(parent) {
      ret = parent.id+'.'+ret;
      parent = parent.__parent;
    }
    return ret;
  };

  BasicElement.prototype.preInitializationMethodNames = [];
  BasicElement.prototype.postInitializationMethodNames = [];

  return BasicElement;
}

module.exports = createBasicElement;
