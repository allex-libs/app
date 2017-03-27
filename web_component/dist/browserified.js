(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
function create (lib, Hierarchy) {
  'use strict';

  var ChangeableListenable = lib.ChangeableListenable,
    Parent = Hierarchy.Parent,
    Listenable = lib.Listenable;

  function BasicParent () {
    Parent.call(this);
    ChangeableListenable.call(this);
  }
  lib.inherit(BasicParent, Parent);
  ChangeableListenable.addMethods (BasicParent);

  BasicParent.prototype.__cleanUp = function () {
    ChangeableListenable.prototype.__cleanUp.call(this);
    Parent.prototype.__cleanUp.call(this);
  };
  BasicParent.prototype.attachListener = function (evntname, cborpropname, cb){
    var ret = Listenable.prototype.attachListener.call(this, evntname, cborpropname, cb);
    if ('changed' === evntname && lib.isString(cborpropname)) {
      lib.runNext (fireOnAttach.bind(null, this, cborpropname, cb));
    }
    return ret;
  };

  function fireOnAttach (self, propname, cb) {
    cb(self.get(propname));
  }

  function findById (id, item) {
    if (id === item.get('id')) return item;
  }

  BasicParent.prototype.findById = function (id) {
    return this.__children.traverseConditionally (findById.bind(null, id));
  };

  function processReplacer (replacers, item, index, arr){
    var regexp;
    for (var i in replacers) {
      regexp = new RegExp ('\{'+i+'\}', 'g');
      item = item.replace(regexp, replacers[i]);
      regexp = null;
      arr[index] = item;
    }
  }

  function processReplacers (path, replacers) {
    path.forEach(processReplacer.bind(null, replacers));
  }

  BasicParent.prototype.childAtPath = function (path, replacers) {
    if (!path || !path.length) return null;

    if (lib.isString(path)) {
      path = path.split('.');
    }

    if (replacers) {
      processReplacers(path, replacers);
    }

    var sp = this, 
      cursor = 0;
  
    while (sp && cursor < path.length) {
      sp = sp.findById(path[cursor]);
      cursor++;
    }

    return sp;
  };


  return BasicParent;
}

module.exports = create;

},{}],2:[function(require,module,exports){
function createApp (lib, dataSuite, Elements, Hierarchy, Resources, BasicParent, EnvironmentFactoryPromise, Linker, BasicElement, executeModifiers){
  'use strict';

  var DataSource = require('./cDataSource')(lib, dataSuite),
    Command = require('./cCommand')(lib),
    FunctionCommand = require('./cFunctionCommand')(lib),
    q = lib.q;

  function toString (item) {
    return JSON.stringify(item, null, 2);
  }

  function findByField (fieldname, val, item) {
    if (item[fieldname] === val) return item;
  }

  function linkDataSource (environments, datasources, desc, item) {
    if (!item.name) throw new Error ('Datasource has no name: '+toString(item));
    if (!item.environment) throw new Error('Datasource has no environment: '+toString(item));

    var source_name = item.source || item.name,
      environment = lib.traverseConditionally (desc.environments, findByField.bind(null, 'name', item.environment));

    if (!environment) throw new Error('Unable to find environment descriptor '+item.environment);
    var e_datasource = lib.traverseConditionally (environment.options.datasources, findByField.bind(null, 'name', source_name));
    if (!e_datasource) {
      e_datasource = lib.traverseConditionally (environment.options.datacommands, findByField.bind(null, 'name', source_name));
      if (!e_datasource)
        throw new Error('Unable to find datasource '+source_name+' within environment description');
    }

    var ds = new DataSource(source_name, 'should_running' in item ? item.should_running : true, 'filter' in item ? item.filter : null);
    datasources.add(item.name, ds);
    environments.listenFor (item.environment, ds.set.bind(ds, 'environment'));
  }


  function linkCommand (commands, environments, desc, item) {
    var fc = null;
    if (!item.command) throw new Error('No command in '+toString(item));
    if (lib.isFunction(item.handler)){
      fc = new FunctionCommand(item.command, item.handler);
    }else{
      if (!item.environment) throw new Error('No environment in '+toString(item));
      var e = item.environment ? lib.traverseConditionally (desc.environments, findByField.bind(null, 'name', item.environment)) : null;
      if (!e && !lib.isFunction(item.handler)) throw new Error('Unable to find environment '+item.environment);

      if (!e && lib.isFunction (item.handler)) {
      }

      var c_name = item.ecommand || item.command, 
        c = lib.traverseConditionally (e.options.commands, findByField.bind(null, 'name', c_name));

      if (!c) {
        c = lib.traverseConditionally (e.options.datacommands, findByField.bind(null, 'name', c_name));
        if (!c)
          throw new Error('Unable to find command in environment descriptor');
      }
      fc = new Command (c_name);
      environments.listenFor (item.environment, fc.set.bind(fc, 'environment'));
    }
    commands.add(item.command, fc);
  }

  function addElement (app, el) {
    app.elements.add(el.get('id'), el);
  }

  function createElement (app, desc) {
    BasicElement.createElement (desc, addElement.bind(null, app));
  };

  function loadElements (app, desc) {
    executeModifiers(desc);
    if (desc.elements) {
      desc.elements.forEach (createElement.bind(null, app));
    }

    EnvironmentFactoryPromise.then(function () {
      return app._link.produceLinks (desc.links);
    }).then(function () {
      return app._link.produceLogic (desc.logic);
    })
    .done (app._fireAppReady.bind(app));
  }

  function createEnvironment (environments, factory, desc) {
    var env = factory(desc);
    environments.add(desc.name, env);
  }

  function loadEnvironments (environments, desc, factory) {
    lib.traverseShallow(desc, createEnvironment.bind(null, environments, factory));
  }

  function App(desc){
    if (!desc) throw new Error('Missing descriptor');
    this.environments = new lib.ListenableMap();
    this.datasources = new lib.Map();
    this.commands = new lib.Map();
    this.elements = new lib.Map ();
    this._link = new Linker.LinkingEnvironment(this);
    this.isReady = false;
    this.ready = new lib.HookCollection();

    lib.traverseShallow (desc.datasources, linkDataSource.bind(null, this.environments, this.datasources, desc));
    lib.traverseShallow (desc.commands, linkCommand.bind(null, this.commands, this.environments, desc));

    EnvironmentFactoryPromise.done(loadEnvironments.bind(null, this.environments, desc.environments));


    ///TODO: what should we do while loading common resources?
    if (desc.resources) {
      q.all(desc.resources.map(Resources.resourceFactory.bind(Resources, this)))
        .done (loadElements.bind(null, this, desc));
    }
    else{
      loadElements(this, desc);
    }
  }

  App.prototype.destroy = function () {
    ///TODO, big TODO ...
  };

  App.prototype._fireAppReady = function () {
    this.isReady = true;
    this.ready.fire();
  };



  App.prototype.onReady = function (cb) {
    if (!lib.isFunction (cb)) return;
    if (this.isReady){
      lib.runNext(cb);
      return;
    }
    this.ready.attach (cb);
  };


  App.prototype.childChanged = function () {
    //TODO: nothing for now ...
  };

  App.prototype.getElement = function (string) {
    if (string === '.') return this;
    var splitted = string.split('.'),
      entity_type = splitted.shift(),
      entity_name = splitted.shift(),
      entity = null;

    string = splitted.join('.');

    switch (entity_type) {
      case 'element' : entity = this.elements.get(entity_name); break;
      case 'environment': entity = this.environments.get(entity_name); break;
      case 'datasource' : entity = this.datasources.get(entity_name); break;
      case 'command' : entity = this.commands.get(entity_name); break;
      default : throw new Error('Entity type '+entity_type+' not recognized');
    }

    return (splitted.length) ? entity.getElement(string) : entity;
  };

  App.prototype.getMethodByName = function (commandname) {
    var c = this.commands.get(commandname);
    if (c) {
      return c.execute.bind(c);
    }
  };

  App.prototype.addAppLink = lib.dummyFunc;

  return App;
}
module.exports = createApp;

},{"./cCommand":3,"./cDataSource":4,"./cFunctionCommand":5}],3:[function(require,module,exports){
function createCommand (lib) {
  'use strict';

  var Settable = lib.Settable,
    q = lib.q;

  function AppSideCommand (command) {
    this.environment = null;
    this.command = command;
    this.target = null;
  }
  lib.inherit(AppSideCommand, Settable);

  AppSideCommand.prototype.destroy = function () {
    this.environment = null;
    this.command = null;
    this.target = null;
  };

  AppSideCommand.prototype.execute = function () {
    if (!this.environment) return q.reject(new Error('Not connected'));
    var target = this.environment.commands.get(this.command);
    if (!target) return q.reject(new Error('No target'));

    return target.execute.apply (target, arguments);
  };

  return AppSideCommand;
}

module.exports = createCommand;

},{}],4:[function(require,module,exports){
function createDataSource (lib, dataSuite) {
  'use strict';

  var CLDestroyable = lib.CLDestroyable;

  function AppSideDataSource (source_name, should_running, filter) {
    CLDestroyable.call(this);
    this.should_running = should_running;
    this.running = false;
    this.source_name = source_name;
    this.data = null;
    this.environment = null;
    this._esl = null;
    this.filter = filter;
    this.busy = false;
  }

  lib.inherit (AppSideDataSource, CLDestroyable);
  AppSideDataSource.prototype.__cleanUp = function () {
    this.busy = true;
    if (this._esl) this._esl.destroy();
    this._esl = null;
    this.filter = null;
    this.should_running = null;
    this.running = null;
    this.environment = null;
    this.source_name = null;
    this.data = null;
    CLDestroyable.prototype.__cleanUp.call(this);
  };

  //TODO: ovde sad treba jos da se radi ... kad se env ukaci, prevezi data source - ove ...
  AppSideDataSource.prototype._processShouldRunning  = function () {
    if (this.should_running) {
      this.start()
    }else{
      this.stop();
    }
  };

  AppSideDataSource.prototype.set_should_running = function (val) {
    if (val === this.should_running) return false;
    this._processShouldRunning(val);
    return true;
  };

  AppSideDataSource.prototype.set_data = function (val) {
    if (this.data === val) return false;
    this.data = val;
    return true;
  };

  AppSideDataSource.prototype.set_environment = function (val) {
    if (this.environment === val) return false;
    if (this._esl) this._esl.destroy();
    this._esl = null;
    this._unbindDS();
    this.environment = val;
    if (!val) return true; //nothing to be done ...

    this._esl = this.environment.attachListener ('state', this._onEnvStateChanged.bind(this));
    this._onEnvStateChanged(this.environment.state);
    return true;
  };

  AppSideDataSource.prototype._onEnvStateChanged = function (state) {
    if (!this.environment.isEstablished()) return this._unbindDS();
    this._processShouldRunning();
  };

  AppSideDataSource.prototype._bindToDS = function () {
    if (!this.environment || !this.environment.isEstablished()) return;
    var ds = this.environment.dataSources.get(this.source_name);
    if (!ds) {
      return; ///no datasource ...
    }
    ds.setFilter(this.filter);
    ds.setTarget(this);
    this.set('running', true);
  };

  AppSideDataSource.prototype._unbindDS = function () {
    if (!this.environment || !this.environment.isEstablished()) return;
    this.environment.dataSources.get(this.source_name).setTarget(null);
    this.set('running', false);
  };

  AppSideDataSource.prototype.stop = function () {
    this.should_running = false;
    this._unbindDS();
  };

  AppSideDataSource.prototype.start = function () {
    this.should_running = true;
    this._bindToDS();
  };

  AppSideDataSource.prototype.set_filter = function (filter) {
    this.filter = filter;
    if (this.should_running && this.environment) {
      var ds = this.environment.dataSources.get(this.source_name);
      if (ds) ds.setFilter(this.filter);
    }
  };

  AppSideDataSource.prototype.filterData = function (fd) {
    var filter = ALLEX.dataSuite.filterFactory.createFromDescriptor(fd);
    var ret = null, data = this.get('data');
    if (lib.isArray(data)) {
      ret = lib.arryOperations.findToMatchFilter(data, fd);
    }
    filter.destroy();
    filter = null;
    return ret;
  };

  AppSideDataSource.prototype.findFirst = function (fd) {
    var filter = dataSuite.filterFactory.createFromDescriptor(fd);
    var ret = null, data = this.get('data');

    if (lib.isArray(data)) {
      ret = lib.arryOperations.findFirstToMatchFilter(data, fd);
    }

    filter.destroy();
    filter = null;
    return ret;
  };

  return AppSideDataSource;
}

module.exports = createDataSource;

},{}],5:[function(require,module,exports){
function createCommand (lib) {
  'use strict';

  function FunctionCommand (command, f){
    this.f = f;
    this.command = command;
  }

  FunctionCommand.prototype.destroy = function () {
    this.f = null;
    this.command = null;
  };

  FunctionCommand.prototype.execute = function () {
    this.f.apply(null, arguments);
  };

  return FunctionCommand;
}

module.exports = createCommand;

},{}],6:[function(require,module,exports){
ALLEX.execSuite.libRegistry.register('allex_applib',require('./index')(ALLEX));
ALLEX.WEB_COMPONENTS.allex_applib = ALLEX.execSuite.libRegistry.get('allex_applib');

},{"./index":9}],7:[function(require,module,exports){
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

        this._loading_promise.done(ld, ld);
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

},{}],8:[function(require,module,exports){
function createElements (lib, Hierarchy, BasicParent, Linker, Resources, executeModifiers) {
  'use strict';

  var ElementTypeRegistry = new lib.Map (),
    BasicElement = require('./basicelementcreator.js')(lib, Hierarchy, elementFactory, BasicParent, Linker, Resources, executeModifiers);

  function elementFactory (desc) {
    var type = desc.type;
    if (!type) throw new Error('No type in element descriptor');
    var ctor = ElementTypeRegistry.get(type);

    if (!ctor) throw new Error('No ctor found for element type: '+type);
    var instance = new ctor(desc.name, desc.options);
    return instance;
  }

  function registerElementType (elementtype_name, ctor) {
    if (!lib.isFunction (ctor)) throw new Error('Constructor must be a function');
    ElementTypeRegistry.add(elementtype_name, ctor);
  }

  return {
    BasicElement : BasicElement,
    elementFactory : elementFactory,
    registerElementType : registerElementType
  }
}

module.exports = createElements;

},{"./basicelementcreator.js":7}],9:[function(require,module,exports){
function createLib(execlib) {
  'use strict';
  var lib = execlib.lib,
    Hierarchy = require('allex_hierarchymixinslowlevellib')(lib.inherit, lib.DList, lib.Gettable, lib.Settable),
    BasicParent = require('./abstractions/cBasicParent')(lib, Hierarchy),
    Linker = execlib.execSuite.libRegistry.get('allex_applinkinglib'),
    Resources = require('./resources')(lib),
    misc = require('./misc')(lib),
    Modifier = require('./modifiers')(execlib, misc),
    Elements = require('./elements')(lib, Hierarchy, BasicParent,Linker, Resources, Modifier.executeModifiers),
    App = require('./app/cApp')(lib, execlib.dataSuite, Elements, Hierarchy, Resources, BasicParent, execlib.execSuite.libRegistry.get('allex_environmentlib'), Linker, Elements.BasicElement, Modifier.executeModifiers),
    PreProcessor = require('./preprocessor.js')(lib);

  function createApp(desc, pagector) {
    if (RESULT.App) throw new Error("You're not allowed to create more than one App");
    PreProcessor.process(desc);
    var ret = new App(desc, pagector);
    RESULT.App = ret;
    if (lib.isFunction (desc.onAppCreated)) {
      ret.onReady(desc.onAppCreated.bind(null, ret));
    }
    return ret;
  }

  Elements.registerElementType ('BasicElement', Elements.BasicElement);

  var RESULT = {
    registerModifier : Modifier.registerModifier,
    BasicModifier : Modifier.BasicModifier,
    registerPreprocessor : PreProcessor.registerPreprocessor,
    BasicProcessor : PreProcessor.BasicProcessor,
    createApp: createApp,
    registerElementType : Elements.registerElementType,
    BasicElement : Elements.BasicElement,
    registerResourceType : Resources.registerResourceType,
    BasicResourceLoader : Resources.BasicResourceLoader,
    App : null,
    misc : misc
  };

  return RESULT;
}

module.exports = createLib;

},{"./abstractions/cBasicParent":1,"./app/cApp":2,"./elements":8,"./misc":10,"./modifiers":11,"./preprocessor.js":19,"./resources":20,"allex_hierarchymixinslowlevellib":18}],10:[function(require,module,exports){
function createMisc (lib) {
  function initLinks (desc) {
    if (!desc) throw new Error('How do you think to do this with no descriptor?');
    if (!desc.links) desc.links = [];
  }

  function initLogic (desc) {
    if (!desc) throw new Error('How do you think to do this with no descriptor?');
    if (!desc.logic) desc.logic = [];
  }

  function initElements (desc) {
    if (!desc) throw new Error('How do you think to do this with no descriptor?');
    if (desc.name) {
      if (!desc.options) desc.options = {};
      if (!desc.options.elements) desc.options.elements = [];
    }else{
      if (!desc.elements) desc.elements = [];
    }
  }

  function traverseElements (desc, cb, path) {
    if (!lib.isFunction (cb)) throw new Error('Not a function');
    if (!path) path = [];
    cb(desc, path);

    var elements = null;

    if (desc.name) {
      elements = desc.options && desc.options.elements ? desc.options.elements : null;
    }else{
      elements = desc.elements ? desc.elements : null;
    }

    if (!elements) return;
    for (var i = 0; i < elements.length; i++) {
      traverseElements(elements[i], cb, path.concat([elements[i].name]));
    }
  }

  function anyOfModifiers (desc, modifiers) {
    for (var i in modifiers) {
      if (findModifier(desc, modifiers[i])) return true;
    }
    return false;
  }

  function findModifier (desc, name) {
    if (!desc.modifiers) return null;
    var ret = [];
    for (var i = 0; i < desc.modifiers.length; i++) {
      if (desc.modifiers[i] === name  || desc.modifiers[i].name === name) {
        ret.push (desc.modifiers[i]);
      }
    }

    return ret.length ? ret : null;
  }

  function initOptions (desc) {
    if (!desc.name) return;
    if (!desc.options) desc.options = {};
  }


  function initResources (desc) {
    if (!desc.resources) desc.resources = [];
  }

  function initAll (desc) {
    initResources(desc);
    initLogic(desc);
    initLinks(desc);
    initElements (desc);
  }

  function getElementsArr (desc) {
    if (!desc.name) {
      return desc.elements;
    }

    return desc.options ? desc.options.elements : null;
  }

  function findElement (desc, name) {
    var s = name.split('.'),
      fn = s.shift();

    var els_arr = getElementsArr(desc);
    if (!els_arr) return null;
    var el = lib.arryOperations.findElementWithProperty(els_arr, 'name', fn);

    while (s.length) {
      fn = s.shift();
      els_arr = getElementsArr(el);
      if (!els_arr) return null;
      el = lib.arryOperations.findElementWithProperty(els_arr, 'name', fn);
      if (!el) return null;
    }
    return el;
  }

  function forgetModifier (desc, mod) {
    if (!desc.modifiers) return;
    var index = desc.modifiers.indexOf(mod);
    if (index < 0) return;

    desc.modifiers.splice(index, 1);
  }

  function addHook (options, name, cb) {
    if (options[name] && !lib.isArray(options[name])) {
      options[name] = [options[name]];
    }
    if (!options[name]) options[name] = [];
    options[name].push (cb);
  }

  return {
    addHook : addHook,
    findElement : findElement,
    getElementsArr : getElementsArr,
    initAll : initAll,
    initElements : initElements,
    initLinks : initLinks,
    initLogic : initLogic,
    initOptions : initOptions, 
    initResources : initResources,
    traverseElements : traverseElements,
    findModifier : findModifier,
    forgetModifier : forgetModifier,
    anyOfModifiers : anyOfModifiers
  };
}

module.exports = createMisc;

},{}],11:[function(require,module,exports){
function createModifiers (execlib, misc) {
  'use strict';

  var lib = execlib.lib, 
    modifiers = new lib.Map (),
    Configurable = lib.Configurable;


  function BasicModifier (options) {
    Configurable.call(this, options);
  }
  lib.inherit (BasicModifier, Configurable);

  BasicModifier.prototype.destroy = function () {
    Configurable.prototype.destroy.call(this);
  };

  BasicModifier.prototype.process = function (element) {
    this.doProcess(element.name, element.options, element.links, element.logic, element.resources);
  };

  BasicModifier.prototype.hookToArray = function (ctx, which) {
    var tp = Array.prototype.slice.call(arguments, 2);
    if (!ctx[which]) {
      ctx[which] = tp;
      return;
    }
    if (lib.isFunction(ctx[which])) {
      ctx[which] = [ctx[which]];
    }
    if (lib.isArray(ctx[which])) {
      Array.prototype.push.apply (ctx[which], tp);
    }
  };

  function registerModifier (name, ctor) {
    modifiers.add (name, ctor);
  }

  function executeModifier (name, options, element) {
    var ctor = modifiers.get(name);
    if (!ctor) throw new Error('Failed to load modifier: '+name);

    if (ctor.ALLOWED_ON && ctor.ALLOWED_ON.indexOf(element.type) < 0) throw new Error ('Not allowed on '+element.type);

    var instance = new ctor (options);

    instance.process(element);
    instance.destroy();
    instance = null;
  }

  function executeModifiers (element) {
    if (!element.modifiers) return;

    misc.initAll(element);

    for (var i = 0; i < element.modifiers.length; i++){
      if (lib.isString(element.modifiers[i])) {
        executeModifier (element.modifiers[i], null, element);
      }else{
        executeModifier (element.modifiers[i].name, element.modifiers[i].options, element);
      }
    }
  }

  return {
    registerModifier : registerModifier,
    BasicModifier : BasicModifier,
    executeModifiers : executeModifiers
  };
}

module.exports = createModifiers;

},{}],12:[function(require,module,exports){
module.exports = function (inherit, DestroyableChild){
  'use strict';
  function Child(parnt){
    this.__parntChangedListener = null;
    DestroyableChild.call(this,parnt);
  }
  inherit(Child,DestroyableChild);
  Child.prototype.__cleanUp = function(){
    if (this.__parntChangedListener) {
      this.__parntChangedListener.destroy();
    }
    this.__parntChangedListener = null;
    DestroyableChild.prototype.__cleanUp.call(this);
  };
  return Child;
};

},{}],13:[function(require,module,exports){
module.exports = function (inherit, StaticChild){
  'use strict';

  function DestroyableChild(parnt){
    this.__parntDestroyedListener = null;
    StaticChild.call(this,parnt);
  }
  inherit(DestroyableChild,StaticChild);
  DestroyableChild.prototype.__cleanUp = function(){
    if (this.__parntDestroyedListener) {
      this.__parntDestroyedListener.destroy();
    }
    this.__parntDestroyedListener = null;
    StaticChild.prototype.__cleanUp.call(this);
  };
  return DestroyableChild;
};

},{}],14:[function(require,module,exports){
module.exports = function (inherit,StaticParent) {
  'use strict';

  function DestroyableParent(){
    StaticParent.call(this);
  }
  inherit(DestroyableParent,StaticParent);
  DestroyableParent.prototype.addChild = function(child){
    child = StaticParent.prototype.addChild.call(this,child);
    child.__parntDestroyedListener = child.attachListener('destroyed',this.removeChild.bind(this,child));
    return child;
  };
  DestroyableParent.prototype.removeChild = function(child){
    if (child.__parntDestroyedListener) {
      child.__parntDestroyedListener.destroy();
    }
    child.__parntDestroyedListener = null;
    StaticParent.prototype.removeChild.call(this,child);
  };
  return DestroyableParent;
};

},{}],15:[function(require,module,exports){
module.exports = function (inherit,DestroyableParent) {
  'use strict';

  function Parent(){
    DestroyableParent.call(this);
  }
  inherit(Parent,DestroyableParent);
  Parent.prototype.addChild = function(child){
    child = DestroyableParent.prototype.addChild.call(this,child);
    child.__parntChangedListener = child.attachListener('changed',this.childChanged.bind(this,child));
    return child;
  };
  Parent.prototype.removeChild = function(child){
    if(child.__parntChangedListener){
      child.__parntChangedListener.destroy();
    }
    child.__parntChangedListener = null;
    DestroyableParent.prototype.removeChild.call(this,child);
  };
  return Parent;
};

},{}],16:[function(require,module,exports){
module.exports = function () {
  'use strict';
  function StaticChild(parnt){
    this.__childindex = null;
    this.__parent = null;
    if(parnt){
      parnt.addChild(this);
    }
  }
  StaticChild.prototype.set___parent = function(parnt){
    this.__parent = parnt;
  };
  StaticChild.prototype.rootParent = function(){
    var ret = this.__parent, tempret = ret;
    while(tempret){
      tempret = ret.__parent;
      if(!tempret){
        return ret;
      }else{
        ret = tempret;
      }
    }
    return ret;
  };
  StaticChild.prototype.leaveParent = function(){
    if(this.__parent){
      this.__parent.removeChild(this);
    }
  };
  StaticChild.prototype.__cleanUp = function(){
    this.__parent = null;
    this.__childindex = null;
  };
  return StaticChild;
};

},{}],17:[function(require,module,exports){

function traverseChild(cb, methodname,child,childindex){
  'use strict';
  var method = child[methodname];
  if(method){
    return method.call(child,cb);
  }else{
    cb(child,childindex);
  }
}

module.exports = function (DList,get,set) {
  'use strict';
  function StaticParent(){
    this.__children = new DList();
  }
  StaticParent.prototype.__cleanUp = function(){
    this.__children.traverse(this.destroyChild.bind(this));
    this.__children.destroy();
    this.__children = null;
  };
  StaticParent.prototype.addChild = function(child){
    var op = get(child,'__parent');
    if(op){
      console.trace();
      throw "Child has parent";
    }
    set('__parent',this,child);
    this.setIndexOnChild(child);
    return child;
  };
  StaticParent.prototype.setIndexOnChild = function(child){
    child.__childindex = this.__children.push(child);
  };
  StaticParent.prototype.destroyChild = function(child){
    this.removeChild(child);
    child.destroy();
  };
  StaticParent.prototype.removeChild = function(child){
    this.__children.remove(child.__childindex);
    child.__childindex = null;
    set('__parent',null,child);
  };
  StaticParent.prototype.traverseChildrenFirst  = function(cb){
    var r = this.__children.traverse(traverseChild.bind(null,cb,'traverseChildrenFirst'));
    if(r){
      cb = null;
      return r;
    }
    r = cb(this,this.__childindex);
    cb = null;
    return r;
  };
  StaticParent.prototype.traverseChildrenAfter = function(cb){
    var r = cb(this,this.__childindex);
    if(r){return r;}
    r = this.__children.traverse(traverseChild.bind(null,cb,'traverseChildrenAfter'));
    cb = null;
    return r;
  };
  return StaticParent;
};

},{}],18:[function(require,module,exports){
module.exports = function (inherit, DList, Gettable, Settable) {
  'use strict';
  var StaticParent = require('./StaticParent')(DList,Gettable.get,Settable.set),
    StaticChild = require('./StaticChild.js')(),
    DestroyableChild = require('./DestroyableChild.js')(inherit, StaticChild),
    DestroyableParent = require('./DestroyableParent.js')(inherit,StaticParent),
    Parent = require('./Parent')(inherit,DestroyableParent);
  return {
    DestroyableChild:DestroyableChild,
    DestroyableParent:DestroyableParent,
    Parent:Parent,
    StaticChild:StaticChild,
    Child:require('./Child.js')(inherit, DestroyableChild),
    StaticParent:StaticParent
  };
};

},{"./Child.js":12,"./DestroyableChild.js":13,"./DestroyableParent.js":14,"./Parent":15,"./StaticChild.js":16,"./StaticParent":17}],19:[function(require,module,exports){
function createPreProcessor (lib) {
  'use strict';

  var PreProcessors = new lib.Map ();

  function registerPreprocessor (name, ctor) {

    var instance = new ctor();
    if (!(instance instanceof BasicProcessor)) throw new Error('PreProcessor must be instance of BasicProcessor'); //za sad ...

    PreProcessors.add (name, instance);
  }

  function _doProcess (configs, desc, item, name) {
    item.configure ( configs ? configs[name] : null);
    item.process(desc);
    item.destroy();
  }

  function process (desc) {
    var configs = desc.preprocessors;
    desc.preprocessors = null;
    PreProcessors.traverse (_doProcess.bind(null, configs, desc));
    lib.containerDestroyAll (PreProcessors);
    PreProcessors.destroy();
    PreProcessors = null;
  }


  function BasicProcessor () {
    this.config = null;
  } 
  BasicProcessor.prototype.process = function (desc) {
    throw new Error('Not implemented');
  };
  BasicProcessor.prototype.destroy = function () {
    this.config = null;
  };

  BasicProcessor.prototype.configure = function (config) {
    this.config = config;
  };

  //TODO: cinfig interface ?

  return  {
    registerPreprocessor : registerPreprocessor,
    process : process,
    BasicProcessor : BasicProcessor
  };
}
module.exports = createPreProcessor;

},{}],20:[function(require,module,exports){
function createResourcesModule (lib) {
  var q = lib.q,
    ResourceTypeRegistry = new lib.Map (),
    ResourceRegistry = new lib.Map ();

  function resourceFactory (app, desc) {
    var ctor = ResourceTypeRegistry.get(desc.type);
    if (!lib.isFunction(ctor)) return q.reject(new Error('Unable to find resource type '+name));
    var instance = new ctor(desc.options, app);
    var promise = instance._load(desc.lazy);
    ResourceRegistry.add (desc.name, {instance: instance, promise : promise});
    return promise;
  }

  function BasicResourceLoader (options) {
    lib.Configurable.call(this, options);
    this._loading_defer = null;
  }
  lib.inherit (BasicResourceLoader, lib.Configurable);
  BasicResourceLoader.prototype.destroy = function () {
    this._loading_defer = null; //TODO: samo?
    lib.Configurable.prototype.destroy.call(this);
  };

  //lazy should be subject to review ...
  BasicResourceLoader.prototype._load = function (lazy) {
    if (this.loadOnDemand()){
      //do not load until explicit load command is issued ...
      return lazy ? q.resolve('ok') : this.load();
    }else{
      //load anyway, signal that it is ready right away ...
      var ret = this.load();
      return lazy ? q.resolve('ok') : ret;
    }
  };


  BasicResourceLoader.prototype.load = function () {
    if (!this._loading_defer) {
      //we are not loading ... 
      this._loading_defer = this.doLoad();
    }
    return this._loading_defer.promise;
  };

  BasicResourceLoader.prototype.doLoad = function () {
    /// return a defer which will be stored in _loading_defer
    throw new Error ('Not implemented');
  };


  BasicResourceLoader.prototype.unload = function () {
    if (this.getConfigVal('ispermanent')) {
      console.log('Resource should never be unloaded ...');
      return;
    }
    this._loading_defer = null;
    this.doUnload();
  };

  BasicResourceLoader.prototype.doUnload = function () {
    ///TODO ...
  };
  BasicResourceLoader.prototype.loadOnDemand = function () { return false; }
  BasicResourceLoader.getResourceFromName = function (name) {
    return getResource(name);
  };

  BasicResourceLoader.getResourcesFromNames = function (names) {
    if (!lib.isArray(names)) throw new Error ('Must be an array');
    return names.map (getResource);
  };

  function getResource (name) {
    var c = ResourceRegistry.get(name);
    return c ? c.instance : null;
  }

  return {
    registerResourceType : ResourceTypeRegistry.add.bind(ResourceTypeRegistry),
    resourceFactory : resourceFactory,
    getResource : getResource,//ResourceRegistry.get.bind(ResourceRegistry),
    BasicResourceLoader : BasicResourceLoader,
    traverseResources : ResourceRegistry.traverse.bind(ResourceRegistry)
  }
}

module.exports = createResourcesModule;

},{}]},{},[6]);
