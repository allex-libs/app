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
function createApp (lib, dataSuite, Elements, Hierarchy, Resources, BasicParent, EnvironmentFactoryPromise, Linker, BasicElement){
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
    if (!e_datasource) throw new Error('Unable to find datasource within environment description');

    var ds = new DataSource(source_name);
    datasources.add(item.name, ds);
    if ('should_running' in item) {
      ds.set('should_running', item.should_running);
    }
    if ('filter' in item) {
      ds.set('filter', item.filter);
    }
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

      if (!c) throw new Error('Unable to find command in environment descriptor');
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
    if (desc.elements) {
      desc.elements.forEach (createElement.bind(null, app));
    }
    EnvironmentFactoryPromise.done (app._link.produceLinks.bind(app._link, desc.links));
    EnvironmentFactoryPromise.done (app._link.produceLogic.bind(app._link, desc.logic));
    app._app_ready_defer.resolve('ok');
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

    this._app_ready_defer = lib.q.defer();

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

  App.prototype.ready = function (cb) {
    if (!lib.isFunction (cb)) return;
    this._app_ready_defer.promise.done(cb);
  };

  App.prototype.getReadyPromise = function () {
    return this._app_ready_defer.promise;
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

  function AppSideDataSource (source_name) {
    CLDestroyable.call(this);
    this.should_running = true;
    this.running = false;
    this.source_name = source_name;
    this.data = null;
    this.environment = null;
    this._esl = null;
    this.filter = null;
  }

  lib.inherit (AppSideDataSource, CLDestroyable);
  AppSideDataSource.prototype.__cleanUp = function () {
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
function createBasicElement (lib, Hierarchy, elementFactory, BasicParent, Linker, Resources) {

  'use strict';
  var Child = Hierarchy.Child,
    Gettable = lib.Gettable,
    Configurable = lib.Configurable,
    q = lib.q,
    qlib = lib.qlib;

  function BasicElement (id, options) {
    BasicParent.call(this);
    Child.call(this);
    Gettable.call(this);
    Configurable.call(this, options);

    this.id = id;
    this.actual = null;
    this._link = null;
    this.resources = null;
  }
  lib.inherit (BasicElement, BasicParent);

  BasicElement.prototype.__cleanUp = function () {
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
    return true;
  };

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

  BasicElement.createElement = function (desc, after_ctor) {
    var el = elementFactory(desc);
    after_ctor(el);
    prepareResources(el, desc.requires);
    el.initialize();
    el._link = new Linker.LinkingEnvironment(el);
    el._link.produceLinks(desc.links);
    el._link.produceLogic(desc.logic);
    el.set('actual', desc.actual || false);
  }

  function prepareResources (el, requires) {
    if (!requires || !requires.length || !lib.isArray(requires)) return;
    el.resources = new lib.Map();
    requires.forEach (prepareResource.bind(null, el));
  };

  function prepareResource (el, resource) {
    var resid, resalias;
    if (lib.isString(resource)) {
      resid = resource;
      resalias = resource;
    }else{
      resid = resource.resource;
      resalias = resource.alias;
    }
    el.resources.add(resalias, Resources.getResource(resid));
  }

  return BasicElement;
}

module.exports = createBasicElement;

},{}],8:[function(require,module,exports){
function createElements (lib, Hierarchy, BasicParent, Linker, Resources) {
  'use strict';

  var ElementTypeRegistry = new lib.Map (),
    BasicElement = require('./basicelementcreator.js')(lib, Hierarchy, elementFactory, BasicParent, Linker, Resources);

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
    Elements = require('./elements')(lib, Hierarchy, BasicParent,Linker, Resources),
    App = require('./app/cApp')(lib, execlib.dataSuite, Elements, Hierarchy, Resources, BasicParent, execlib.execSuite.libRegistry.get('allex_environmentlib'), Linker, Elements.BasicElement);

  function createApp(desc, pagector) {
    if (RESULT.App) throw new Error("You're not allowed to create more than one App");
    var ret = new App(desc, pagector);
    RESULT.App = ret;
    return ret;
  }

  var RESULT = {
    createApp: createApp,
    registerElementType : Elements.registerElementType,
    BasicElement : Elements.BasicElement,
    registerResourceType : Resources.registerResourceType,
    BasicResourceLoader : Resources.BasicResourceLoader,
    getResource : Resources.getResource,
    resourceFactory: Resources.resourceFactory,
    traverseResources : Resources.traverseResources,
    App : null
  };

  return RESULT;
}

module.exports = createLib;

},{"./abstractions/cBasicParent":1,"./app/cApp":2,"./elements":8,"./resources":17,"allex_hierarchymixinslowlevellib":16}],10:[function(require,module,exports){
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

},{}],11:[function(require,module,exports){
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

},{}],12:[function(require,module,exports){
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

},{}],13:[function(require,module,exports){
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

},{}],14:[function(require,module,exports){
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

},{}],15:[function(require,module,exports){

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

},{}],16:[function(require,module,exports){
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

},{"./Child.js":10,"./DestroyableChild.js":11,"./DestroyableParent.js":12,"./Parent":13,"./StaticChild.js":14,"./StaticParent":15}],17:[function(require,module,exports){
function createResourcesModule (lib) {
  var q = lib.q,
    ResourceTypeRegistry = new lib.Map (),
    ResourceRegistry = new lib.Map ();

  function resourceFactory (app, desc) {
    var ctor = ResourceTypeRegistry.get(desc.type);
    if (!lib.isFunction(ctor)) return q.reject(new Error('Unable to find resource type '+name));
    var instance = new ctor(desc.options, app);
    var promise = instance.load();
    ResourceRegistry.add (desc.name, {instance: instance, promise : promise});
    return promise;
  }
  function BasicResourceLoader (options) {
    lib.Configurable.call(this, options);
  }
  lib.inherit (BasicResourceLoader, lib.Configurable);
  BasicResourceLoader.prototype.destroy = function () {
    lib.Configurable.prototype.destroy.call(this);
  };

  BasicResourceLoader.prototype.load = function () {
    throw new Error('not implementsd');
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
