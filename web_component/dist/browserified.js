(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
function create (lib, Hierarchy) {
  'use strict';

  var ChangeableListenable = lib.ChangeableListenable,
    Parent = Hierarchy.Parent;

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

  function findById (id, item) {
    if (id === item.get('id')) return item;
  }

  BasicParent.prototype.findById = function (id) {
    return this.__children.traverseConditionally (findById.bind(null, id));
  };

  function processReplacer (replacers, item, index, arr){
    for (var i in replacers) {
      let regexp = new RegExp ('\{'+i+'\}', 'g');
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
function createApp (lib, BasicElement, Hierarchy, Resources, BasicParent){
  'use strict';

  var DataSource = require('./cDataSource')(lib),
    Command = require('./cCommand')(lib),
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
    environments.listenFor (item.environment, ds.set.bind(ds, 'environment'));
  }


  function linkCommand (commands, environments, desc, item) {
    if (!item.command) throw new Error('No command in '+toString(item));
    if (!item.environment) throw new Error('No environment in '+toString(item));

    var e = lib.traverseConditionally (desc.environments, findByField.bind(null, 'name', item.environment));
    if (!e) throw new Error('Unable to find environment '+item.environment);

    var c_name = item.ecommand || item.command, 
      c = lib.traverseConditionally (e.options.commands, findByField.bind(null, 'name', c_name));

    if (!c) throw new Error('Unable to find command in environment descriptor');
    var ci = new Command (c_name);
    environments.listenFor (item.environment, ci.set.bind(ci, 'environment'));
    commands.add(item.command, ci);
  }

  function declareElements (elements, item) {

    if (!item.name) throw new Error('Missing name for AppElement');
    if (!item.type) throw new Error('Missing type for AppElement');

    elements.add (item.name, item);
  }

  function resolveReferences (app, desc) {
    if (!lib.isString(desc)) return desc;

    var ret = app.elements.get(desc);
    if (!ret) throw new Error ('Expecting app to have declared page '+desc);
    return ret;
  }

  function declarePages (app, item) {
    if (!item) throw new Error('No item set');
    if (!item.name) throw new Error('Page requires a name');
    if (!item.options || !item.options.elements || !item.options.elements.length) throw new Error('Page with no elements? No way');

    item.options.elements = item.options.elements.map (resolveReferences.bind(null, app));

    var page = new app.pagector(item.name, item.options);
    app.addChild(page);
    page.initialize();
  }

  function loadPages (app, desc) {
    lib.traverseShallow (desc.elements, declareElements.bind(null, app.elements));
    desc.pages.forEach(declarePages.bind(null, app));
    var initial_page = desc.initial_page || desc.pages[0].name;
    app.set('page', initial_page);
  }

  function App(desc, pagector){
    if (!desc) throw new Error('Missing descriptor');
    BasicParent.call(this);
    this.environments = new lib.ListenableMap();
    this.datasources = new lib.Map();
    this.commands = new lib.Map();
    this.elements = new lib.Map ();
    this.pagector = pagector;

    if (!lib.isFunction (pagector)) throw new Error('Expecting Page Constructor as a paramenter');

    this.page = null;

    lib.traverseShallow (desc.datasources, linkDataSource.bind(null, this.environments, this.datasources, desc));
    lib.traverseShallow (desc.commands, linkCommand.bind(null, this.commands, this.environments, desc));


    ///TODO: what should we do while loading common resources?
    if (desc.resources) {
      q.all(desc.resources.map(Resources.resourceFactory.bind(Resources)))
        .done (loadPages.bind(null, this, desc));
    }
    else{
      loadPages(this, desc);
    }
  }
  lib.inherit(App, BasicParent);

  App.prototype.__cleanUp = function () {
    ///TODO, big TODO ...
  };

  App.prototype.childChanged = function () {
    //TODO: nothing for now ...
  };

  App.prototype.set_page = function (page) {
    if (this.page) {
      this.page.set('actual', false);
    }
    this.page = null;
    if (!page) return;

    var p = this.findById (page);
    if (!p) throw new Error('Unable to find page '+page);

    this.page = p;
    this.page.set('actual', true);
  };

  return App;
}
module.exports = createApp;

},{"./cCommand":3,"./cDataSource":4}],3:[function(require,module,exports){
function createCommand (lib) {
  'use strict';

  var Settable = lib.Settable;

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

    return target.execute.apply (this.target, arguments);
  };

  return AppSideCommand;
}

module.exports = createCommand;

},{}],4:[function(require,module,exports){
function createDataSource (lib) {
  'use strict';

  var CLDestroyable = lib.CLDestroyable;

  function AppSideDataSource (source_name) {
    CLDestroyable.call(this);
    this.should_running = false;
    this.running = false;
    this.source_name = source_name;
    this.data = null;
    this.environment = null;
  }

  lib.inherit (AppSideDataSource, CLDestroyable);
  AppSideDataSource.prototype.__cleanUp = function () {
    this.should_running = null;
    this.running = null;
    this.environment = null;
    this.source_name = null;
    this.data = null;
    CLDestroyable.prototype.__cleanUp.call(this);
  };


  AppSideDataSource.prototype.set_environment = function (val) {
    var should_running = this.should_running;
    if (this.environment) {
      this.stop();
    }
    this.should_running = should_running;
    this.environment = val;

    if (!this.environment) return;
    if (this.should_running) {
      this.start();
    }
  };

  AppSideDataSource.prototype.stop = function () {
    this.should_running = false;
    if (this.environment) {
      this.environment.stopDataSource(this.source_name, this);
      this.set('running', false);
    }
  };

  AppSideDataSource.prototype.start = function () {
    this.should_running = true;
    if (this.environment) {
      this.environment.startDataSource(this.source_name, this);
      this.set('running', true);
    }
  };

  return AppSideDataSource;
}

module.exports = createDataSource;

},{}],5:[function(require,module,exports){
ALLEX.execSuite.libRegistry.register('allex_applib',require('./index')(ALLEX));
ALLEX.WEB_COMPONENTS.allex_applib = ALLEX.execSuite.libRegistry.get('allex_applib');

},{"./index":8}],6:[function(require,module,exports){
function createBasicElement (lib, Hierarchy, elementFactory, BasicParent) {

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
  }
  lib.inherit (BasicElement, BasicParent);

  BasicElement.prototype.__cleanUp = function () {
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
    //should be called right after child has been added to the parent
    var subelements = this.getConfigVal('elements');
    if (!subelements || subelements.length === 0){ return; }
    subelements.forEach(this.createElement.bind(this));
  };

  BasicElement.prototype.DEFAULT_CONFIG = function () {
    return null;
  };

  BasicElement.prototype.createElement = function (desc) {
    var el = elementFactory(desc);
    this.addChild (el);
    el.initialize();
    el.set('actual', desc.actual || false);
  };

  BasicElement.prototype.set_actual = function (val) {
    this.actual = val;
  };

  BasicElement.prototype.childChanged = function (el, name, value) {
    if ('actual' === name && value) {
      this.set('actual', true);
      return; ///this one will emmit childChanged ....
    }
    return this.__parent ? this.__parent.childChanged(el, name, value) : undefined;
  };

  return BasicElement;
}

module.exports = createBasicElement;

},{}],7:[function(require,module,exports){
function createElements (lib, Hierarchy, BasicParent) {
  'use strict';

  var ElementTypeRegistry = new lib.Map (),
    BasicElement = require('./basicelementcreator.js')(lib, Hierarchy, elementFactory, BasicParent);

  function elementFactory (desc) {
    //TODO: a sta sa parent-ima? who's your daddy? :D
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

},{"./basicelementcreator.js":6}],8:[function(require,module,exports){
function createLib(execlib) {
  'use strict';
  var lib = execlib.lib,
    Hierarchy = require('allex_hierarchymixinslowlevellib')(lib.inherit, lib.DList, lib.Gettable, lib.Settable),
    BasicParent = require('./abstractions/cBasicParent')(lib, Hierarchy),
    Elements = require('./elements')(lib, Hierarchy, BasicParent),
    Resources = require('./resources')(lib),
    App = require('./app/cApp')(lib, Elements.BasicElement, Hierarchy, Resources, BasicParent);

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
    App : null
  };

  return RESULT;
}

module.exports = createLib;

},{"./abstractions/cBasicParent":1,"./app/cApp":2,"./elements":7,"./resources":16,"allex_hierarchymixinslowlevellib":15}],9:[function(require,module,exports){
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

},{}],10:[function(require,module,exports){
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

},{}],11:[function(require,module,exports){
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

},{}],12:[function(require,module,exports){
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

},{}],13:[function(require,module,exports){
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

},{}],14:[function(require,module,exports){

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

},{}],15:[function(require,module,exports){
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

},{"./Child.js":9,"./DestroyableChild.js":10,"./DestroyableParent.js":11,"./Parent":12,"./StaticChild.js":13,"./StaticParent":14}],16:[function(require,module,exports){
function createResourcesModule (lib) {
  var q = lib.q,
    ResourceTypeRegistry = new lib.Map (),
    ResourceRegistry = new lib.Map ();

  function resourceFactory (desc) {
    var ctor = ResourceTypeRegistry.get(desc.type);
    if (!lib.isFunction(ctor)) return q.reject(new Error('Unable to find resource type '+name));
    var instance = new ctor(desc.options)
    ResourceRegistry.add (desc.name, instance);
    return instance.load();
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

  return {
    registerResourceType : ResourceTypeRegistry.add.bind(ResourceTypeRegistry),
    resourceFactory : resourceFactory,
    getResource : ResourceRegistry.get.bind(ResourceRegistry),
    BasicResourceLoader : BasicResourceLoader
  }
}

module.exports = createResourcesModule;

},{}]},{},[5]);
