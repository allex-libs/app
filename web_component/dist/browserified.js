(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
function createApp (lib, BasicElement, Hierarchy){
  'use strict';

  var DataSource = require('./cDataSource')(lib),
    Command = require('./cCommand')(lib),
    Element = require('./cElement')(lib),
    Page = require('./cPage')(lib, BasicElement),
    ChangeableListenable = lib.ChangeableListenable,
    Parent = Hierarchy.Parent;

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

  function declarePages (app, item) {
    if (!item) throw new Error('No item set');
    if (!item.name) throw new Error('Page requires a name');
    if (!item.options || !item.options.elements || !item.options.elements.length) throw new Error('Page with no elements? No way');
    var page = new Page(item.name, item.options);
    app.addChild(page);
    page.createElements (item.options.elements);
  }

  function App(desc){
    if (!desc) throw new Error('Missing descriptor');
    ChangeableListenable.call(this);
    Parent.call(this);
    this.environments = new lib.ListenableMap();
    this.datasources = new lib.Map();
    this.commands = new lib.Map();
    this.elements = new lib.Map ();

    this.page = null;

    lib.traverseShallow (desc.datasources, linkDataSource.bind(null, this.environments, this.datasources, desc));
    lib.traverseShallow (desc.commands, linkCommand.bind(null, this.commands, this.environments, desc));
    lib.traverseShallow (desc.elements, declareElements.bind(null, this.elements));
    lib.traverseShallow (desc.pages, declarePages.bind(null, this));

    ///STANI, nije jos gotovo ...

    this.initial_page = desc.initial_page || desc.pages[0].name;
  }
  lib.inherit(App, Parent);
  ChangeableListenable.addMethods(App);

  App.prototype.__cleanUp = function () {
    ///TODO, big TODO ...
  };

  App.prototype.childChanged = function () {
    //TODO: nothing for now ...
  };

  App.prototype.go = function () {
    this.set('page', this.initial_page);
  };

  return App;
}
module.exports = createApp;

},{"./cCommand":2,"./cDataSource":3,"./cElement":4,"./cPage":5}],2:[function(require,module,exports){
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

},{}],3:[function(require,module,exports){
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

},{}],4:[function(require,module,exports){
function createAppSideElement (lib) {
  'use strict';

  function AppElement (desc) {
    this.name = desc.name;
    this.type = desc.type

    if (!this.name) throw new Error('Missing name for AppElement');
    if (!this.type) throw new Error('Missing type for AppElement');
    this.options = desc.options;
  }

  AppElement.prototype.destroy = function () {
    this.name = null;
    this.type = null;
    this.options = null;
  };

  return AppElement;
}

module.exports = createAppSideElement;

},{}],5:[function(require,module,exports){
function createPage (lib, BasicElement){
  'use strict';

  function Page (id, options){
    BasicElement.call(this, id, options);
  }
  lib.inherit (Page, BasicElement);
  Page.prototype.__cleanUp = function () {
    BasicElement.prototype.__cleanUp.call(this);
  };

  Page.prototype.createElement = function (desc) {
    if (!lib.isString(desc)) {
      return BasicElement.prototype.createElement.call(this, desc);
    }

    let app = this.__parent;
    ///load element from app ....

    let el = app.elements.get(desc);
    if (!el) throw new Error ('Expecting app to have declared page '+desc);
    this.addChild (this.createElement(el));
  };

  return Page;
}

module.exports = createPage;

},{}],6:[function(require,module,exports){
ALLEX.execSuite.libRegistry.register('allex_applib',require('./index')(ALLEX));

},{"./index":9}],7:[function(require,module,exports){
function createBasicElement (lib, Hierarchy, elementFactory) {

  'use strict';

  var Parent = Hierarchy.Parent,
    Child = Hierarchy.Child,
    ChangeableListenable = lib.ChangeableListenable,
    Gettable = lib.Gettable;

  function BasicElement (id, options) {
    Parent.call(this);
    Child.call(this);
    ChangeableListenable.call(this);
    Gettable.call(this);

    this.id = id;
    this.actual = null;
  }
  lib.inherit (BasicElement, Parent);

  BasicElement.prototype.__cleanUp = function () {
    this.actual = null;
    this.id = null;
    Gettable.prototype.__cleanUp.call(this);
    Child.prototype.__cleanUp.call(this);
    Parent.prototype.__cleanUp.call(this);
    ChangeableListenable.__cleanUp.call(this);
  };

  lib.inheritMethods (BasicElement, Child, 'set__parent', 'rootParent', 'leaveParent');
  lib.inheritMethods (BasicElement, Gettable, 'get');
  ChangeableListenable.addMethods (BasicElement);

  BasicElement.prototype.createElements = function (elements) {
    elements.forEach(this.createElement.bind(this));
  };

  BasicElement.prototype.createElement = function (desc) {
    this.addChild (elementFactory(desc));
  };

  function findById (id, item) {
    if (id === item.get('id')) return item;
  }

  BasicElement.prototype.findById = function (id) {
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

  BasicElement.prototype.childAtPath = function (path, replacers) {
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

},{}],8:[function(require,module,exports){
function createElements (lib, Hierarchy) {
  'use strict';

  var ElementTypeRegistry = new lib.Map (),
    BasicElement = require('./basicelementcreator.js')(lib, Hierarchy, elementFactory);

  function elementFactory (desc) {
    //TODO: a sta sa parent-ima? who's your daddy? :D
    var type = desc.type;
    if (!type) throw new Error('No type in element descriptor');
    var ctor = ElementTypeRegistry.get(type);

    if (!ctor) throw new Error('No ctor found for element type: '+type);
    var instance = new ctor(desc.name, desc.options);

    if (desc.options && desc.options.elements) { 
      instance.createElements(desc.options.elements);
    }
    instance.set('actual', desc.actual);
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
    Elements = require('./elements')(lib, Hierarchy),
    App = require('./app/cApp')(lib, Elements.BasicElement, Hierarchy);

  function createApp(desc) {
    return new App(desc);
  }

  return {
    createApp: createApp,
    registerElementType : Elements.registerElementType,
    BasicElement : Elements.BasicElement
  };
}

module.exports = createLib;

},{"./app/cApp":1,"./elements":8,"allex_hierarchymixinslowlevellib":16}],10:[function(require,module,exports){
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

},{"./Child.js":10,"./DestroyableChild.js":11,"./DestroyableParent.js":12,"./Parent":13,"./StaticChild.js":14,"./StaticParent":15}]},{},[6]);
