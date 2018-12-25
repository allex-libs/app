(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
function create (lib, Hierarchy) {
  'use strict';

  var ChangeableListenable = lib.ChangeableListenable,
    Destroyable = lib.Destroyable,
    Parent = Hierarchy.Parent,
    Listenable = lib.Listenable;

  function BasicParent () {
    Parent.call(this);
    Destroyable.call(this);
    ChangeableListenable.call(this);
  }
  lib.inherit(BasicParent, Parent);
  BasicParent.prototype.destroy = Destroyable.prototype.destroy;
  BasicParent.prototype.extendTo = Destroyable.prototype.extendTo;
  BasicParent.prototype.shouldDie = Destroyable.prototype.shouldDie;
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
function createApp (lib, dataSuite, Elements, Hierarchy, Resources, BasicParent, EnvironmentFactoryPromise, Linker, BasicElement, executeModifiers, PrePreProcessor, PreProcessor, jobondestroyablelib){
  'use strict';

  var q = lib.q,
    qlib = lib.qlib,
    joblib = require('./jobs')(lib, jobondestroyablelib, dataSuite, Resources, EnvironmentFactoryPromise, BasicElement, executeModifiers);

  /**
   * @class
   * @memberof allex_applib
   * @classdesc
   * A class that materializes the App descriptor.
   *
   * ### App Descriptor
   * This is an Object with the following properties:
   * - `environments`
   * - `elements`
   * - `links`
   * - `logic`
   * - `modifiers`
   * - `preprocessors`
   * - `prepreprocessors`
   * - `resources`
   *
   * Each of the above properties maps to the appropriate descriptor.
   * Each of the appropriate descriptors will be used
   * to produce appropriate software entities.
   *
   * You can learn more about `modifiers` at {@link allex_applib.BasicModifier}.
   * You can learn more about `preprocessors` and `prepreprocessors` at {@link allex_applib.BasicProcessor}.
   *
   */
  function App(){
    this.jobs = new qlib.JobCollection();
    this.environments = new lib.ListenableMap();
    this.datasources = new lib.Map();
    this.commands = new lib.Map();
    this.elements = new lib.Map ();
    this._link = new Linker.LinkingEnvironment(this);
    this.isReady = false;
    this.ready = new lib.HookCollection();
  }

  App.prototype.destroy = function () {
    ///TODO, big TODO ...
  };

  App.prototype._fireAppReady = function () {
    if (!this.isReady) {
      this.isReady = true;
      this.ready.fire();
    }
  };

  App.prototype.loadDescriptor = function (deschandler) {
    if (!(deschandler && deschandler.descriptor)) throw new Error('Missing descriptor');
    PrePreProcessor.process(deschandler.descriptor);
    PreProcessor.process(deschandler.descriptor);
    return this.jobs.run('desc', new joblib.DescriptorLoaderJob(deschandler, this));
  };

  App.prototype.loadDescriptors = function (descs) {
    if (!lib.isArray(descs)) {
      throw new Error('An array of descriptors needed');
    }
    if (descs.length < 1) {
      return q([]);
    }
    return q.all(descs.map(this.loadDescriptor.bind(this)));
  };

  App.prototype.unloadDescriptor = function (desc) {
    if (!desc) throw new Error('Missing descriptor');
    unloadElements (this, desc);
    return q(true);
  };

  App.prototype.unloadDescriptors = function (descs) {
    var ret, i;
    if (!lib.isArray(descs)) {
      throw new Error('An array of descriptors needed');
    }
    if (descs.length < 1) {
      return q([]);
    }
    return q.all(descs.map(this.unloadDescriptor.bind(this)));
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

    if (!entity) {
      throw new Error('Could not find '+entity_type+' named '+entity_name);
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

},{"./jobs":9}],3:[function(require,module,exports){
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
      this.start();
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
    if (lib.isEqual(filter, this.filter)) {
      return false;
    }
    this.filter = filter;
    this.set('data', null);
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
function createAppLib (lib, dataSuite, Elements, Hierarchy, Resources, BasicParent, EnvironmentFactoryPromise, Linker, BasicElement, executeModifiers, PrePreProcessor, PreProcessor, jobondestroyablelib) {
  'use strict';
  return require('./appcreator')(lib, dataSuite, Elements, Hierarchy, Resources, BasicParent, EnvironmentFactoryPromise, Linker, BasicElement, executeModifiers, PrePreProcessor, PreProcessor, jobondestroyablelib);
}

module.exports = createAppLib;

},{"./appcreator":2}],7:[function(require,module,exports){
function createAppJob (lib, jobondestroyablelib) {
  'use strict';

  var JobOnDestroyableBase = jobondestroyablelib.JobOnDestroyableBase;

  function AppJob (app, defer) {
    JobOnDestroyableBase.call(this, app, defer);
  }
  lib.inherit(AppJob, JobOnDestroyableBase);
  AppJob.prototype.destroy = function () {
    this.app = null;
    JobOnDestroyableBase.prototype.destroy.call(this);
  };
  AppJob.prototype._destroyableOk = function () {
    return this.destroyable && this.destroyable.environments;
  };

  return AppJob;
}

module.exports = createAppJob;

},{}],8:[function(require,module,exports){
function createDescriptorLoaderJob (lib, AppJob, dataSuite, Resources, EnvironmentFactoryPromise, BasicElement, executeModifiers) {
  'use strict';

  var q = lib.q,
    qlib = lib.qlib,
    Command = require('../commandcreator')(lib),
    FunctionCommand = require('../functioncommandcreator')(lib),
    DataSource = require('../datasourcecreator')(lib, dataSuite);

  function DescriptorLoaderJob (descriptorhandler, app, defer) {
    AppJob.call(this, app, defer);
    this.descriptorHandler = descriptorhandler;
  }
  lib.inherit(DescriptorLoaderJob, AppJob);
  DescriptorLoaderJob.prototype.destroy = function () {
    this.descriptorHandler = null;
    AppJob.prototype.destroy.call(this);
  };
  DescriptorLoaderJob.prototype.go = function () {
    var ok = this.okToGo(), desc;
    if (!ok.ok) {
      return ok.val;
    }
    desc = this.descriptorHandler.descriptor;
    if (!desc) {
      this.resolve(this.descriptorHandler);
      return;
    }
    lib.traverseShallow (
      desc.datasources,
      linkDataSource.bind(null, this.destroyable.datasources, this.destroyable.environments, desc)
    );
    lib.traverseShallow (
      desc.commands,
      linkCommand.bind(null, this.destroyable.commands, this.destroyable.environments, desc)
    );

    /*
    EnvironmentFactoryPromise.then(
      this.loadEnvironments.bind(this)
    ).then(
      this.handleResources.bind(this)
    );
    */
    EnvironmentFactoryPromise.then(
      this.loadEnvironments.bind(this)
    ).then(
      this.loadElements.bind(this)
    );

    return ok.val;
  };
  DescriptorLoaderJob.prototype.handleResources = function () {
    if (!this.okToProceed()) {
      return;
    }
    ///TODO: what should we do while loading common resources?
    if (this.descriptorHandler.descriptor.resources) {
      //q.all(this.descriptorHandler.descriptor.resources.map(Resources.resourceFactory.bind(Resources, this.destroyable)))
      this.descriptorHandler.descriptor.resources.map(Resources.loadResourceParams.bind(Resources));
    }
    this.onResourcesLoaded();
  };
  DescriptorLoaderJob.prototype.onResourcesLoaded = function () {
    //return this.loadElements();
    this.onAllDone();
  };
  DescriptorLoaderJob.prototype.loadElements = function () {
    var app;
    if (!this.okToProceed()) {
      return;
    }
    app = this.destroyable;
    executeModifiers(this.descriptorHandler.descriptor);
    if (lib.isArray(this.descriptorHandler.descriptor.elements)) {
      this.descriptorHandler.descriptor.elements.forEach (this.createElement.bind(this));
    }

    return EnvironmentFactoryPromise.then(
      this.produceLinks.bind(this)
    ).then(
      this.produceLogic.bind(this)
    ).then(
      this.onElementsLoaded.bind(this)
    );
  };
  DescriptorLoaderJob.prototype.onElementsLoaded = function () {
    EnvironmentFactoryPromise.then(
//      this.loadEnvironments.bind(this)
//    ).then(
      this.handleResources.bind(this)
    );
    //this.onAllDone();
  };
  DescriptorLoaderJob.prototype.createElement = function (desc) {
    if (!this.okToProceed()) {
      return;
    }
    BasicElement.createElement (desc, this.addElement.bind(this));
  };
  DescriptorLoaderJob.prototype.addElement = function (el) {
    var id;
    if (!this.okToProceed()) {
      return;
    }
    id = el.get('id');
    this.destroyable.elements.add(id, el);
    this.descriptorHandler.addElementID(id);
  };
  DescriptorLoaderJob.prototype.produceLinks = function () {
    if (!this.okToProceed()) {
      return;
    }
    var links = this.destroyable._link.produceLinks(this.descriptorHandler.descriptor.links);
    return links.then(
      this.descriptorHandler.setLinks.bind(this.descriptorHandler)
    );
  };
  DescriptorLoaderJob.prototype.produceLogic = function () {
    if (!this.okToProceed()) {
      return;
    }
    var logic = this.destroyable._link.produceLogic(this.descriptorHandler.descriptor.logic);
    return logic.then(
      this.descriptorHandler.setLogic.bind(this.descriptorHandler)
    );
  };
  DescriptorLoaderJob.prototype.loadEnvironments = function (factory) {
    if (!this.okToProceed()) {
      return;
    }
    if (!lib.isArray(this.descriptorHandler.descriptor.environments)) {
      return;
    }
    this.descriptorHandler.descriptor.environments.forEach(this.createEnvironment.bind(this, factory));
    factory = null;
  };
  DescriptorLoaderJob.prototype.createEnvironment = function (factory, envdesc) {
    console.log('createEnvironment', factory, envdesc);
    var env, name;
    if (!this.okToProceed()) {
      return;
    }
    env = factory(envdesc);
    name = envdesc.name;
    this.destroyable.environments.add(name, env);
    this.descriptorHandler.addEnvironmentName(name);
  };
  DescriptorLoaderJob.prototype.onAllDone = function () {
    var desc;
    if (!this.okToProceed()) {
      return;
    }
    desc = this.descriptorHandler.descriptor;
    if (desc && lib.isFunction (desc.onLoaded)) {
      desc.onLoaded(this);
    }
    this.resolve(this.descriptorHandler);
  };


  /* creation */
  function toString (item) {
    return JSON.stringify(item, null, 2);
  }

  function findByField (fieldname, val, item) {
    if (item[fieldname] === val) return item;
  }

  function linkDataSource (datasources, environments, desc, item) {
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
          throw new Error('Unable to find command '+c_name+' in environment descriptor');
      }
      fc = new Command (c_name);
      environments.listenFor (item.environment, fc.set.bind(fc, 'environment'));
    }
    commands.add(item.command, fc);
  }

  /* loading section done */

  return DescriptorLoaderJob;
}

module.exports = createDescriptorLoaderJob;


},{"../commandcreator":3,"../datasourcecreator":4,"../functioncommandcreator":5}],9:[function(require,module,exports){
function createAppJobs (lib, jobondestroyablelib, dataSuite, Resources, EnvironmentFactoryPromise, BasicElement, executeModifiers) {
  'use strict';

  var AppJob = require('./appjobcreator')(lib, jobondestroyablelib),
    DescriptorLoaderJob = require('./descriptorloaderjobcreator')(lib, AppJob, dataSuite, Resources, EnvironmentFactoryPromise, BasicElement, executeModifiers);

  return {
    AppJob: AppJob,
    DescriptorLoaderJob: DescriptorLoaderJob
  };
}

module.exports = createAppJobs;

},{"./appjobcreator":7,"./descriptorloaderjobcreator":8}],10:[function(require,module,exports){
ALLEX.execSuite.libRegistry.register('allex_applib',require('./libindex')(ALLEX, ALLEX.execSuite.libRegistry.get('allex_applinkinglib'), ALLEX.execSuite.libRegistry.get('allex_jobondestroyablelib'), ALLEX.execSuite.libRegistry.get('allex_environmentlib')));
ALLEX.WEB_COMPONENTS.allex_applib = ALLEX.execSuite.libRegistry.get('allex_applib');

},{"./libindex":15}],11:[function(require,module,exports){
function createDescriptorApi (lib) {
  var ArryOps = require('allex_arrayoperationslowlevellib')(lib.extend, lib.readPropertyFromDotDelimitedString, lib.isFunction, lib.Map, lib.AllexJSONizingError);

  function ensureDescriptorArrayElementByPropertyName (propertyname, desc, arryname, arryelementname, defaultelement) {
    var arry, elem, mydefault;
    if (!desc) {
      return null;
    }
    arry = desc[arryname];
    if (!arry) {
      return null;
    }
    elem = ArryOps.findElementWithProperty(arry, propertyname, arryelementname);
    if (!elem) {
      mydefault = {};
      mydefault[propertyname] = arryelementname;
      elem = lib.extend(defaultelement || {}, mydefault);
      arry.push(elem);
    }
    return elem;
  }

  function ensureDescriptorArrayElementByName (desc, arryname, arryelementname, defaultelement) {
    return ensureDescriptorArrayElementByPropertyName('name', desc, arryname, arryelementname, defaultelement);
  }

  function ensureDescriptorArrayElementByType (desc, arryname, arryelementname, defaultelement) {
    return ensureDescriptorArrayElementByPropertyName('type', desc, arryname, arryelementname, defaultelement);
  }

  return {
    ensureDescriptorArrayElementByPropertyName: ensureDescriptorArrayElementByPropertyName, 
    ensureDescriptorArrayElementByName: ensureDescriptorArrayElementByName,
    ensureDescriptorArrayElementByType: ensureDescriptorArrayElementByType
  };
}

module.exports = createDescriptorApi;
    

},{"allex_arrayoperationslowlevellib":19}],12:[function(require,module,exports){
function createDescriptorHandler (lib, LinksAndLogicDestroyableMixin, ourlib) {
  'use strict';
  var q = lib.q;

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

},{}],13:[function(require,module,exports){
function createBasicElement (lib, Hierarchy, elementFactory, BasicParent, Linker, Resources, executeModifiers, LinksAndLogicDestroyableMixin, PrePreProcessor, PreProcessor) {
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
    qlib = lib.qlib;

  function BasicElement (id, options) {
    console.log('new', this.constructor.name, id);
    BasicParent.call(this);
    Child.call(this);
    Gettable.call(this);
    Configurable.call(this, options);
    LinksAndLogicDestroyableMixin.call(this);

    this.id = id;
    this.actual = null;
    this._link = null;
    this.resources = null;
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
    console.log(this.constructor.name, this.id, 'dying');
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
    if (this.resources) {
      this.resources.destroy();
    }
    this.resources = null;
    if (this._link) this._link.destroy();

    this.actual = null;
    this.id = null;

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
    var subelements = this.getConfigVal('elements');

    this.actual = this.getConfigVal('actual') || false;
    handleLoading(this, this.getConfigVal('actual'));
    if (lib.isArray(subelements)) {
      subelements.forEach(this.createElement.bind(this));
    }
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

  function getResourceAndCheckLoad (loadEvent, getResource, promises, item) {
    //promises.push (item.load());
    var p = item.load();
    p.done(null, null, loadEvent.fire.bind(loadEvent));
    promises.push (p);
  }

  BasicElement.prototype.load = function () {
    var resources = this.resources;
    if (!resources) return q.resolve('ok');
    var promises = [];
    resources.traverse (getResourceAndCheckLoad.bind(null, this.loadEvent, Resources.getResource, promises));
    return q.all(promises);
  };

  function unloadResource (el, resource, name) {
    resource.unload();
  }

  BasicElement.prototype.unload = function () {
    if (!this.resources) return;
    this.resources.traverse (unloadResource.bind(null, this));
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
    PrePreProcessor.process(desc);
    PreProcessor.process(desc);
    executeModifiers (desc);
    var el = elementFactory(desc);
    after_ctor(el);
    prepareResources(el, desc.requires);
    if ('actual' in desc) {
      console.error(desc);
      throw new Error('actual has to be in "options"');
    }
    el.initialize();
    el._link = new Linker.LinkingEnvironment(el);
    el._link.produceLinks(desc.links).then(el.setLinks.bind(el));
    el._link.produceLogic(desc.logic).then(el.setLogic.bind(el));
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

  return BasicElement;
}

module.exports = createBasicElement;

},{}],14:[function(require,module,exports){
function createElements (lib, Hierarchy, BasicParent, Linker, Resources, executeModifiers, LinksAndLogicDestroyableMixin, PrePreProcessor, PreProcessor) {
  'use strict';

  var ElementTypeRegistry = new lib.Map (),
    BasicElement = require('./basicelementcreator.js')(lib, Hierarchy, elementFactory, BasicParent, Linker, Resources, executeModifiers, LinksAndLogicDestroyableMixin, PrePreProcessor, PreProcessor);

  function elementFactory (desc) {
    var type = desc.type;
    if (!type) throw new Error('No type in element descriptor');
    var ctor = getElementType(type);

    if (!ctor) throw new Error('No ctor found for element type: '+type);
    var instance = new ctor(desc.name, desc.options);
    return instance;
  }

  function registerElementType (elementtype_name, ctor) {
    if (!lib.isFunction (ctor)) throw new Error('Constructor must be a function');
    ElementTypeRegistry.add(elementtype_name, ctor);
  }

  function getElementType (type) {
    return ElementTypeRegistry.get(type);
  }

  return {
    BasicElement : BasicElement,
    elementFactory : elementFactory,
    registerElementType : registerElementType,
    getElementType : getElementType
  }
}

module.exports = createElements;

},{"./basicelementcreator.js":13}],15:[function(require,module,exports){
function libCreator (execlib, Linker, jobondestroyablelib, environmentlib) {
  /**
   * Library that allows one to create an Application
   * @namespace allex_applib
   * @author Andrija Petrovic <andrija.hers@gmail.com>
   */
  'use strict';
  var RESULT = {
    App : null
  },
    lib = execlib.lib,
    Hierarchy = require('allex_hierarchymixinslowlevellib')(lib.inherit, lib.DList, lib.Gettable, lib.Settable),
    LinksAndLogicDestroyableMixin = require('./mixins/linksandlogicdestroyablemixincreator')(lib),
    BasicParent = require('./abstractions/cBasicParent')(lib, Hierarchy),
    DescriptorHandler = require('./descriptorhandlercreator')(lib, LinksAndLogicDestroyableMixin, RESULT),
    Resources = require('./resources')(lib),
    misc = require('./misc')(lib),
    Modifier = require('./modifiers')(execlib, misc),
    preProcessingRegistryLib = require('./preprocessingregistry')(lib),
    PreProcessors = preProcessingRegistryLib.PreProcessors,
    PrePreProcessors = preProcessingRegistryLib.PrePreProcessors,
    Elements = require('./elements')(lib, Hierarchy, BasicParent, Linker, Resources, Modifier.executeModifiers, LinksAndLogicDestroyableMixin, PrePreProcessors, PreProcessors),
    App = require('./app')(lib, execlib.dataSuite, Elements, Hierarchy, Resources, BasicParent, environmentlib, Linker, Elements.BasicElement, Modifier.executeModifiers, PrePreProcessors, PreProcessors, jobondestroyablelib),
    descriptorApi = require('./descriptorapi')(lib);

  require('./preprocessors')(lib, preProcessingRegistryLib, descriptorApi);
  function createApp() {
    if (RESULT.App) throw new Error("You're not allowed to create more than one App");
    var ret = new App();
    RESULT.App = ret;
    /*
    if (lib.isFunction (desc.onAppCreated)) {
      ret.onReady(desc.onAppCreated.bind(null, ret));
    }
    */
    return ret;
  }

  function onResourceParams (promises, params, resourcename) {
    promises.push(Resources.resourceFactory(RESULT.App, params));
  }
  function appReadyFireer (result) {
    RESULT.App._fireAppReady();
    return lib.q(result);
  }
  function produceResources (resources) {
    var promises = [], ret;
    Resources.traverseResourceParams(onResourceParams.bind(null, promises));
    ret =  lib.q.all(promises).then(
     appReadyFireer
    );
    ret.then(null,
     console.error.bind(console, 'Error in producing Resources'));

    return ret;
  }

  /** Actually produces DescriptorHandlers */
  function dhProducerLoader (deschandlers, confdesc) {
    console.log('doing', confdesc.name);
    if (confdesc.type) {
      throw new Error('app configuration descriptor cannot have the "type" property');
    }
    var dh = new DescriptorHandler(confdesc.configuration);
    if (deschandlers && ('object' === typeof deschandlers)) {
      deschandlers[confdesc.name] = dh;
    }
    return dh.load();
  }

  /**
   * Crucial function.
   *
   * Processes the input from the outer world,
   * and produces the App object.
   *
   * @function bootstrap
   * @memberof allex_applib
   * @param {Array} descriptors An Array of App descriptors
   * @param {Array} deschandlers Optionally, an Object that will finally (when `bootstrap` resolves) have
   * all the `DescriptorHandler` instances mapped to their `name`s
   */
  function bootstrap (descriptors, deschandlers) {
    var promises = [];
    //module.APP = applib.createApp(ALLEX_CONFIGURATION.APP);
    createApp();
    if (!lib.isArray(descriptors)) {
      return lib.q(true);
    }
    lib.q.all(descriptors.map(dhProducerLoader.bind(null, deschandlers))).then(
      produceResources
    );
    //(new applib.DescriptorHandler(ALLEX_CONFIGURATION.APP)).load();
  }

  Elements.registerElementType ('BasicElement', Elements.BasicElement);

  RESULT.DescriptorHandler = DescriptorHandler;
  /**
   * @function
   * @static
   * @alias registerModifier
   * @memberof allex_applib
   * @param {String} name The name of the Modifier to be registered
   * @param {Function} modifierclass The Modifier class to be registered
   */
  RESULT.registerModifier = Modifier.registerModifier;
  /**
   * @function
   * @static
   * @alias getModifier
   * @memberof allex_applib
   * @param {String} name The name of the Modifier to get
   * @returns The Modifier class registered under the specified `name`
   */
  RESULT.getModifier = Modifier.getModifier;
  RESULT.BasicModifier = Modifier.BasicModifier;
  /**
   * @function
   * @static
   * @alias registerPrePreprocessor
   * @memberof allex_applib
   * @param {String} name The name of the PrePreProcessor to be registered
   * @param {Function} prepreprocessorclass The PrePreProcessor class to be registered
   */
  RESULT.registerPrePreprocessor = PrePreProcessors.register.bind(PrePreProcessors);
  /**
   * @function
   * @static
   * @alias getPrePreprocessor
   * @memberof allex_applib
   * @param {String} name The name of the PrePreProcessor to get
   * @returns The PrePreProcessor instance registered under the specified `name`
   */
  RESULT.getPrePreprocessor = PrePreProcessors.get.bind(PrePreProcessors);
  RESULT.prePreprocessOn = PrePreProcessors.processOn.bind(PrePreProcessors);
  /**
   * @function
   * @static
   * @alias registerPreprocessor
   * @memberof allex_applib
   * @param {String} name The name of the PreProcessor to be registered
   * @param {Function} preprocessorclass The PreProcessor class to be registered
   */
  RESULT.registerPreprocessor = PreProcessors.register.bind(PreProcessors);
  /**
   * @function
   * @static
   * @alias getPreprocessor
   * @memberof allex_applib
   * @param {String} name The name of the PreProcessor to get
   * @returns The PreProcessor instance registered under the specified `name`
   */
  RESULT.getPreprocessor = PreProcessors.get.bind(PreProcessors);
  RESULT.BasicProcessor = preProcessingRegistryLib.BasicProcessor;
  //RESULT.createApp = createApp;
  //RESULT.produceResources = produceResources;
  /**
   * @function
   * @static
   * @alias registerElementType
   * @memberof allex_applib
   * @param {String} name The name of the Element class to be registered
   * @param {Function} preprocessorclass The Element class to be registered
   */
  RESULT.registerElementType = Elements.registerElementType;
  /**
   * @function
   * @static
   * @alias getElementType
   * @memberof allex_applib
   * @param {String} name The name of the Element class to get
   * @returns The Element class registered under the specified `name`
   */
  RESULT.getElementType = Elements.getElementType;
  RESULT.BasicElement = Elements.BasicElement;
  /**
   * @function
   * @static
   * @alias registerResourceType
   * @memberof allex_applib
   * @param {String} name The name of the Resource class to be registered
   * @param {Function} preprocessorclass The Resource class to be registered
   */
  RESULT.registerResourceType = Resources.registerResourceType;
  /**
   * @function
   * @static
   * @alias getResourceType
   * @memberof allex_applib
   * @param {String} name The name of the Resource class to get
   * @returns The Resource class registered under the specified `name`
   */
  RESULT.getResourceType = Resources.getResourceType;
  RESULT.BasicResourceLoader = Resources.BasicResourceLoader;
  RESULT.misc = misc;
  RESULT.descriptorApi = descriptorApi;
  RESULT.bootstrap = bootstrap;

  return RESULT;
}

module.exports = libCreator;

},{"./abstractions/cBasicParent":1,"./app":6,"./descriptorapi":11,"./descriptorhandlercreator":12,"./elements":14,"./misc":16,"./mixins/linksandlogicdestroyablemixincreator":17,"./modifiers":18,"./preprocessingregistry":28,"./preprocessors":35,"./resources":36,"allex_hierarchymixinslowlevellib":26}],16:[function(require,module,exports){
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
      fn = s.shift(),
      els_arr, el;

    if (!name) {
      return desc;
    }
    els_arr = getElementsArr(desc);
    if (!lib.isArray(els_arr)) return null;
    if (!fn) return desc;
    el = lib.arryOperations.findElementWithProperty(els_arr, 'name', fn);

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

},{}],17:[function(require,module,exports){
function createLinksAndLogicDestroyableMixin (lib) {
  'use strict';

  var q = lib.q;

  /**
   * A Mixin for any class that should handle Arrays of Links and Logic.
   *
   * The deal is that Links and Logic have unusual destruction behavior.
   *
   * This Mixin works on simple assumptions:
   * - it accepts an Array of Links or Logic
   * - in the destructor it will properly destroy each Link/Logic in its corresponding arrays
   * @mixin
   * @memberof allex_applib
   */
  function LinksAndLogicDestroyableMixin () {
    /** @member {Array} */
    this.linksFromLinking = null;
    /** @member {Array} */
    this.logicFromLinking = null;
  };
  LinksAndLogicDestroyableMixin.prototype.destroy = function () {
    destroyArrayOfLinks(this.linksFromLinking);
    this.linksFromLinking = null;
    destroyArrayOfLogic(this.logicFromLinking);
    this.logicFromLinking = null;
  };
  /**
   * @function
   * @param {Array} links An Array of created Link objects
   */
  LinksAndLogicDestroyableMixin.prototype.setLinks = function (links) {
    destroyArrayOfLinks(this.linksFromLinking);
    this.linksFromLinking = links;
    return q(links);
  };
  /**
   * @function
   * @param {Array} links An Array of created Logic objects
   */
  LinksAndLogicDestroyableMixin.prototype.setLogic = function (logic) {
    destroyArrayOfLogic(this.logicFromLinking);
    this.logicFromLinking = logic;
    return q(logic);
  };


  LinksAndLogicDestroyableMixin.addMethods = function (klass) {
    lib.inheritMethods(klass, LinksAndLogicDestroyableMixin
      ,'setLinks'
      ,'setLogic'
    );
  };

  /**
   * @function
   * @param {Array} links An Array of created Link objects
   */
  function destroyArrayOfLinks (links) {
    if (lib.isArray(links)) {
      links.forEach(destroyLink);
    }
  }

  function destroyLink (link) {
    console.log('should destroy link', link);
  }

  function destroyArrayOfLogic (logics) {
    if (lib.isArray(logics)) {
      logics.forEach(destroyLogic);
    }
  }
  /** 
   * @function
   * @alias LinksAndLogicDestroyableMixin~destroyLogic
   */
  function destroyLogic (logic) {
    console.log('should destroy logic', logic);
    var first, second;
    if (!lib.isArray(logic)) {
      console.error('what is logic?', logic);
      return;
    }
    if (logic.length == 1) {
      destroyLogic(logic[0]);
      return;
    }
    if (logic.length!=2) {
      console.error('what is logic?', logic);
      return;
    }
    first = logic[0];
    second = logic[1];
    if (first.instance) {
      first.instance.destroy();
      first.instance = null;
    } else {
      console.error('what is first?', first);
    }
    if (lib.isArray(second)) {
      lib.arryDestroyAll(second.splice(0));
    }
  }
  return LinksAndLogicDestroyableMixin;
}

module.exports = createLinksAndLogicDestroyableMixin;

},{}],18:[function(require,module,exports){
function createModifiers (execlib, misc) {
  'use strict';

  var lib = execlib.lib, 
    modifiers = new lib.Map (),
    Configurable = lib.Configurable;

  /**
   * @class
   * @param {Object} options The configuration object
   * @memberof allex_applib
   * @classdesc
   * The base class for Modifiers
   *
   * Modifiers work like this:
   *
   * ### Inherit from BasicModifier
   * You will need to implement the following methods:
   * - `doProcess(name, options, links, logic, resources)` - your job is done here
   * - `DEFAULT_CONFIG()` - you have to return the default configuration, if none is given
   *
   * Optionally, you may override the `ALLOWED_ON()` method, to specify the names of Element types 
   * your inherited Modifier class will run on.
   *
   * ### Register
   * call {@link allex_applib.registerModifier} with
   * 1. the name you're registering under (a String, like `'MySpecialModifier'`)
   * 2. the class you produced when you inherited from BasicModifier
   *
   * **Note**: the call will result in your class (_not an instance_ of it)
   * being registered under the name you provided.
   * 
   *
   * ### Configure
   * In the descriptor of the App or Element, do configure the modifier.
   *
   * Configuration object for Modifiers is an Array.
   * Each element of the Array may be
   * - A String (the trivial case)
   * - A (`name`-`options`) Object (the general case)
   *
   * #### String configuration element
   * This String is the name under which the Modifier is registered.
   * The Modifier will be invoked with no particular configuration.
   *
   * #### (`name`-`options`) Object as a configuration element
   * In this case, the configuration Object has the following properties:
   * - `name` is the name under which the Modifier is registered.
   * - `options` is the configuration object.
   *
   * ### Configuration example
   * Trivial configuration:
   * ```javascript
   *  {
   *    links: [...],
   *    logic: [...],
   *    modifiers: ['MyModifier', 'AnotherModifierOfMine']
   *  }
   * ```
   *
   * The same trivial configuration from above, 
   * rewritten in the general form:
   * ```javascript
   *  {
   *    links: [...],
   *    logic: [...],
   *    modifiers: [{
   *      name: 'MyModifier',
   *      options: null
   *    },{
   *      name: 'AnotherModifierOfMine',
   *      options: null
   *    }]
   *  }
   *  ```
   *
   * Configuration in the case when Modifiers have to be particularly configured:
   * ```javascript
   *  {
   *    links: [...],
   *    logic: [...],
   *    modifiers: [{
   *      name: 'MyModifier',
   *      options: {
   *        color: 'red',
   *        encryption: true
   *      }
   *    },{
   *      name: 'AnotherModifierOfMine',
   *      options: {
   *        rows: 5,
   *        columns: 7
   *      }
   *    }]
   *  }
   * ```
   *
   *
   */

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

  /**
   * This method must be overriden in descendant classes.
   *
   * @function 
   * @param {String} name The name of the App/Element descriptor to be processed
   * @param {Object} options Options of the App/Element descriptor to be processed
   * @param {Array} links Links of the App/Element descriptor to be processed
   * @param {Array} logic Logic of the App/Element descriptor to be processed
   * @param {Array} resources Resources of the App/Element descriptor to be processed
   */
  BasicModifier.prototype.doProcess = function (name, options, links, logic, resources) {
    throw new Error('Not implemented');
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

  function getModifier (name) {
    return modifiers.get (name);
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
    BasicModifier : BasicModifier,
    registerModifier : registerModifier,
    getModifier : getModifier,
    executeModifiers : executeModifiers
  };
}

module.exports = createModifiers;

},{}],19:[function(require,module,exports){
module.exports = function createArryOperations(extend, readPropertyFromDotDelimitedString, isFunction, Map, AllexJSONizingError) {
  function union(a1, a2) {
    var ret = a1.slice();
    appendNonExistingItems(ret, a2);
    return ret;
  }

  function appendNonExistingItems(a1, a2) {
    a2.forEach(function (a2e) {
      if (a1.indexOf(a2e)<0) {
        a1.push(a2e);
      }
    });
    a1 = null;
  }

  function finderwithindex(findobj, propname, propval, item, index){
    try {
      if (item[propname] === propval) {
        findobj.element = item;
        findobj.index = index;
        return true;
      }
    } catch (ignore) {}
  }

  function finder(findobj, propname, propval, item){
    var und;
    //if (item[propname] === propval) {
    if (propval !== und && readPropertyFromDotDelimitedString(item, propname) === propval) {
      findobj.found = item;
      return true;
    }
  }

  function findElementWithProperty(a, propname, propval) {
    if (!(a && a.some)) {
      return;
    }
    var und, findobj = {found: und}, ret;
    a.some(finder.bind(null, findobj, propname, propval));
    ret = findobj.found;
    findobj.found = null;
    findobj = null;
    return ret;
  }

  function lastfinder (propname, propval, result, item) {
    var und;
    if (propval !== und && readPropertyFromDotDelimitedString(item, propname) === propval) {
      return item;
    }
    return result;
  }

  function findLastElementWithProperty(a, propname, propval) {
    if (!(a && a.reduce)) {
      return;
    }
    return a.reduce(lastfinder.bind(null, propname, propval), void 0);
  }

  function findElementAndIndexWithProperty(a, propname, propval) {
    if (!(a && a.some)) {
      return;
    }
    var und, findobj = {element: und, index: und};
    a.some(finderwithindex.bind(null, findobj, propname, propval));
    return findobj;
  }

  function findToMatchFilter (a, filter) {
    var ret = [];
    for (var i = 0; i < a.length; i++) {
      if (filter.isOK(a[i])) ret.push (a[i]);
    }
    return ret;
  }

  function findFirstToMatchFilter (a, filter) {
    for (var i = 0; i < a.length; i++) {
      if (filter.isOK(a[i])) return a[i];
    }
  }

  function findWithProperty (arr, propname, propval) {
    return arr.filter (finder.bind(null, {}, propname, propval));
  }

  function checkerForPropertyName(propertyname, propertyprocessor, arry, object, index) {
    if (!object.hasOwnProperty(propertyname)) {
      throw(new AllexJSONizingError('NO_PROPERTY', object, 'No propertyname'));
      return;
    }
    var prop = object[propertyname], existing;
    if (propertyprocessor) {
      prop = propertyprocessor(prop);
    }
    existing = findElementAndIndexWithProperty(arry, propertyname, prop);
    if (existing.element) {
      arry[existing.index] = extend(existing.element, object);
    } else {
      arry.push(object);
    }
  }

  function appendNonExistingObjects(a1, a2, propertyname, propertyprocessor) {
    a2.forEach(checkerForPropertyName.bind(null, propertyname, propertyprocessor, a1));
  }

  function unionObjects(a1, a2, propertyname, propertyprocessor) {
    var ret = a1.slice();
    appendNonExistingObjects(ret, a2, propertyname, propertyprocessor);
    return ret;
  }

  function execute_eqf (what, eqf, item){
    if (eqf(item, what)) {
      return true;
    }
  }

  function contains (arr, what, eqf) {
    if (!isFunction (eqf)) {
      return arr.indexOf(what) > -1;
    }
    return arr.some(execute_eqf.bind(null, what, eqf));
  }

  function notcontains (arr, what, eqf){
    return !contains(arr, what, eqf);
  }


  function _filter_notcontains (arr, eqf, what){
    return notcontains(arr, what, eqf);
  };


  function difference (arr1, arr2, eqf) {
    return arr1.filter(_filter_notcontains.bind(null, arr2, eqf));
  }

  function isConsistent (arr1, arr2) { ///means arr2 has to have starting elements equal to elements of arr1
    if (arr2.length < arr1.length) return false;
    for (var i = 0 ; i < arr1.length; i++) {
      if (arr2[i] !== arr1[i]) return false;
    }
    return true;
  }

  function _intersect_check (ret, arr2, eqf, item) {
    if (notcontains(arr2, item, eqf)) { return; }
    if (contains(ret, item, eqf)) { return; }
    ret.push (item);
  }

  function intersect (arr1, arr2, eqf) {
    if (!(arr1 && arr1.length)) return [];
    if (!(arr2 && arr2.length)) return [];

    var ret = [];
    arr1.forEach(_intersect_check.bind(null, ret, arr2, eqf));
    return ret;
  }


  function pivot (source, options) {
    var p = new Pivoter(options);
    return p.pivot(source);
  }

  function unpivot (source, options) {
    var p = new Pivoter(options);
    return p.unpivot(source);
  }


  /* options: 
    x_field : this field is used for x axis ...
    y_field : this field is used for y axis ...
    value_field : this field is used for value ...
    x_fields_list : list of fields accross x axis ...
    init_empty_rows : should empty rows be inited,
    to_y : converting function to y ...
    from_y : convert back y value to original value ...
    pivot_init_value : what should we put as initial value ...
  */

  function Pivoter (options) {
    this.options = extend ({}, Pivoter.DEFAULT_OPTIONS, options);
    if (!this.options.x_field) throw new Error('No x_field config');
    if (!this.options.y_field) throw new Error('No y_field config');
    if (!this.options.value_field) throw new Error('No value_field config');
    if (!this.options.x_fields_list) throw new Error('No x_fields_list config');
  }

  Pivoter.prototype.pivot = function (source) {
    var ret = [];
    source.forEach (this._processPivotSourceItem.bind(this, ret));

    if (!this.options.init_empty_rows) return ret;
    for (var i = 0; i < ret.length; i++) {
      if (ret[i]) continue;
      ret[i] = this.initializeEmptyPivotRecord();
    }
    return ret;
  };

  Pivoter.prototype._processPivotSourceItem = function (ret, item) {
    var y = this.options.to_y(item[this.options.y_field], item);

    if (!ret[y]) {
      ret[y] = this.initializeEmptyPivotRecord();
    }

    var x = item[this.options.x_field];
    if (!(x in ret[y])) throw new Error(x+' is not in filed list ...');
    //console.log('PROCESSING PIVOT SOURCE ITEM', y, ret[y], item);
    ret[y][x] = item[this.options.value_field];
  };

  Pivoter.prototype.initializeEmptyPivotRecord = function () {
    var ret = {};
    this.options.x_fields_list.forEach (this._createEmptyPivotField.bind(this, ret));
    return ret;
  };

  Pivoter.prototype._createEmptyPivotField = function (ret, name) {
    return ret[name] = 'pivot_init_value' in this.options ? this.options.pivot_init_value : null;
  };

  Pivoter.prototype.unpivot = function (source, removeNonExistingValueFromUnpivot) {
    var ret = [];
    source.forEach (this._processPivotedItem.bind(this, removeNonExistingValueFromUnpivot, ret));
    return ret;
  };

  Pivoter.prototype._processPivotedItem = function (removeNonExistingValueFromUnpivot, ret, item, index) {
    this.options.x_fields_list.forEach (this._fromPivoted.bind(this, removeNonExistingValueFromUnpivot, ret, index, item));
  };

  Pivoter.prototype._fromPivoted = function (removeNonExistingValueFromUnpivot, ret, y, item, field){
    var o = {};
    o[this.options.value_field] = item[field];
    o[this.options.y_field] = this.options.from_y(y, item);
    o[this.options.x_field] = field;
    if (this._shouldAccountUnpivot(o, removeNonExistingValueFromUnpivot)) {
      ret.push (this._processUnpivotRecord(o));
    }
  };

  Pivoter.prototype._shouldAccountUnpivot = function (o, removeNonExistingValueFromUnpivot) {
    if (removeNonExistingValueFromUnpivot) {
      if (o[this.options.value_field] === this.options.nonexisting_value) {
        return false;
      }
    }
    var f = this.options.shouldAccountUnpivot;

    return isFunction(f) ? f(o) : true;
  };

  Pivoter.prototype._processUnpivotRecord = function (rec) {
    var f = this.options.processUnpivotRecord;
    return isFunction(f) ? f(rec) : rec;
  };

  Pivoter.DEFAULT_OPTIONS = {
    nonexisting_value : null,
    init_empty_rows : false,
    to_y: function (s) {return parseInt(s);},
    from_y : function (s) {return s+'';}
  };

  function toRet (ret, val, name) {
    ret.push (name);
  }

  function unique (arr) {
    var map = new Map ();
    for (var i = 0; i < arr.length; i++) {
      if (!map.get(arr[i])) map.add(arr[i], true);
    }

    var ret = [];
    map.traverse (toRet.bind(null, ret));
    return ret;
  }

	function randomizeArray(array) {
    var length = array.length;
    var last = length - 1;

    for (var index = 0; index < length; index++) {
      var rand = Math.floor ((index+1)*Math.random());
      var temp = array[index];
      array[index] = array[rand];
      array[rand] = temp;
    }
    return array;
	}


  var ret = {
    intersect : intersect,
    isConsistent : isConsistent,
    contains : contains,
    notcontains : notcontains,
    difference : difference,
    union: union,
    appendNonExistingItems: appendNonExistingItems,
    findElementWithProperty: findElementWithProperty,
    findLastElementWithProperty: findLastElementWithProperty,
    findElementAndIndexWithProperty: findElementAndIndexWithProperty,
    pivot : pivot,
    unpivot : unpivot,
    Pivoter : Pivoter,
    findToMatchFilter : findToMatchFilter,
    findFirstToMatchFilter : findFirstToMatchFilter,
    unique : unique,
    randomizeArray : randomizeArray,
    findWithProperty : findWithProperty,
    appendNonExistingObjects: appendNonExistingObjects,
    unionObjects: unionObjects
  };
  return ret;
}; 

},{}],20:[function(require,module,exports){
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

},{}],21:[function(require,module,exports){
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

},{}],22:[function(require,module,exports){
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

},{}],23:[function(require,module,exports){
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

},{}],24:[function(require,module,exports){
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

},{}],25:[function(require,module,exports){

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
    this.purge();
    this.__children.destroy();
    this.__children = null;
  };

  StaticParent.prototype.purge = function () {
    this.__children.traverse(this.destroyChild.bind(this));
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

},{}],26:[function(require,module,exports){
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

},{"./Child.js":20,"./DestroyableChild.js":21,"./DestroyableParent.js":22,"./Parent":23,"./StaticChild.js":24,"./StaticParent":25}],27:[function(require,module,exports){
function createPreProcessingRegistry (lib) {
  'use strict';

  /**
   * @class
   * @memberOf allex_applib
   * @classdesc
   * The base class for Processors (PreProcessors and PrePreProcessors).
   *
   * Processors work like this:
   *
   * #### Inherit from BasicProcessor
   * The only method you _need_ to implement is `process (desc)`.
   * In this implementation you will alter the given descriptor `desc`.
   *
   * This alteration may need to take care about the particular configuration 
   * that was specified in the descriptor `desc`.
   *
   * When your `process` method is called, your configuration will not be in `desc` any more,
   * for consistency/sanity/security reasons.
   * Instead, it will be in `this.config` of your Class.
   *
   * #### Register
   * Depending on the nature of your Processor,
   * call {@link allex_applib.registerPrePreprocessor}
   * or {@link allex_applib.registerPreprocessor} with
   * 1. the name you're registering under (a String, like `'MySpecialProcessor'`)
   * 2. the class you produced when you inherited from BasicProcessor
   *
   * **Note**: the call will result in an _instance_ of your class
   * being registered under the name you provided.
   * 
   * That is why the constructor of BasicProcessor (and all the classes that inherit from it)
   * does not take any parameters.
   *
   * #### Configure
   * In the descriptor of the App or Element (may depend on the very nature of
   * a particular Processor, because certain Processors may be built for use only on App descriptors),
   * configure the (pre)preprocessor.
   *
   * The configuration for both preprocessors and prepreprocessors is an Object.
   * It maps the configurations to registered names of (pre)preprocessors.
   *
   * Example for the `preprocessors` configuration:
   * ```javascript
   *  {
   *    ...
   *    links: [...],
   *    logic: [...],
   *    preprocessors: {
   *      MySpecialProcessor: {
   *        color: 'red',
   *        rows: 5,
   *        columns: 8
   *      }
   *    }
   *  }
   * ```
   *
   * Example for the `prepreprocessors` configuration:
   * ```javascript
   *  {
   *    ...
   *    links: [...],
   *    logic: [...],
   *    prepreprocessors: {
   *      MySpecialPreProcessor: {
   *        role: 'admin',
   *        height: 50,
   *        apply: true
   *      }
   *    }
   *  }
   * ```
   *
   * In the case of `prepreprocessors`, the configuration object **may also** be an array of objects, like
   * ```javascript
   *  {
   *    ...
   *    links: [...],
   *    logic: [...],
   *    prepreprocessors: [{
   *      MyInitPrePreprocessor: {
   *        automaticlogin: false,
   *        usehttps: true
   *      }
   *    },
   *    {
   *      MySpecialPreProcessor: {
   *        role: 'admin',
   *        height: 50,
   *        apply: true
   *      }
   *    }]
   *  }
   * ```
   * This is because you may need to perform prepreprocessing on the given descriptor in several phases,
   * so the preprocessors may need to perform their `process`ing in phases.
   * Each configuration object in the configuration array will define a prepreprocessing phase
   * by defining prepreprocessors that need to run in the given phase - with their appropriate
   * configurations.
   *
   */
  function BasicProcessor () {
    this.config = null;
  } 
  /**
   * @function 
   * @abstract
   * @param {Object} desc The App/Element descriptor to be processed
   */
  BasicProcessor.prototype.process = function (desc) {
    throw new Error('Not implemented');
  };
  BasicProcessor.prototype.destroy = function () {
    this.config = null;
  };

  /**
   * @function
   * @param {Object} config The configuration object - obtained from the descriptor 
   * that is to be `process`ed.
   *
   * This method is called internally, during the process of building the App
   * from the descriptor.
   */
  BasicProcessor.prototype.configure = function (config) {
    if (this.neededConfigurationNames) {
      if (lib.isArray(config)) {
        config.forEach(checkNeededConfigurationNames.bind(null, this.constructor.name, this.neededConfigurationNames));
      } else {
        checkNeededConfigurationNames(this.constructor.name, this.neededConfigurationNames, config);
      }
    }
    this.config = config;
  };

  function checkNeededConfigurationNames (ctorname, names, config) {
    var i, name;
    if (!lib.isArray(names)) {
      return;
    }
    if (!(config && 'object' === typeof config)) {
      return;
    }
    for (i=0; i<names.length; i++) {
      if (!(names[i] in config)) {
        throw new Error('The configuration provided to an instance of '+ctorname+' has to have a property named '+names[i]);
      }
    }
  }

  BasicProcessor.prototype.isAppDesc = function (desc) {
    return !desc.type;
  };
  BasicProcessor.prototype.elementsOf = function (desc) {
    return this.isAppDesc(desc) ? desc.elements : desc.options.elements;
  };
  BasicProcessor.prototype.elementReferenceStringOf = function (desc, str) {
    return this.isAppDesc(desc) ? ('element.'+str) : ('.'+str);
  };

  /**
   * PreProcessingRegistryBase is a specialization of {@link allex://allex_maplowlevellib.Map|Map}
   * that introduces methods
   * - {@link allex://allex_applib.PreProcessingRegistryBase#process|process}
   * - {@link allex://allex_applib.PreProcessingRegistryBase#register|register}
   *
   * @class
   * @memberof allex_applib
   */
  function PreProcessingRegistryBase () {
    lib.Map.call(this);
  }
  lib.inherit(PreProcessingRegistryBase, lib.Map);
  /**
   * Registers an __instance__ (_not the class!_) of the (Pre)PreProcessor class provided
   * under a given `name`.
   *
   * @function
   * @param {String} name Name of the (Pre)PreProcessor class to register
   * @param {Function} ctor The (Pre)PreProcessor class constructor to register
   */
  PreProcessingRegistryBase.prototype.register = function (name, ctor) {
    var instance = new ctor();
    if (!(instance instanceof BasicProcessor)) throw new Error('PreProcessor must be instance of BasicProcessor');

    console.log(this.constructor.name, 'add', name);
    this.add (name, instance);
  };
  /**
   * @function
   * @param {Object} desc The App/Element descriptor to process
   */
  PreProcessingRegistryBase.prototype.process = function (desc) {
    if (!this.targetDescriptorSectionName) {
      throw new Error(this.constructor.name+' cannot process a descriptor because it has no targetDescriptorSectionName');
    }
    if (!(this.targetDescriptorSectionName in desc)) {
      return lib.q(true);
    }
    var configs = desc[this.targetDescriptorSectionName];
    desc[this.targetDescriptorSectionName] = null;
    return this.processOn(desc, configs);
  };
  PreProcessingRegistryBase.prototype.processOn = function (desc, configs) {
    if (lib.isArray(configs)) {
      if (!this.allowArrayConfigs()) {
        throw new Error('configs cannot be an Array');
      }
      configs.forEach(_doProcessForEach.bind(null, this, desc));
    } else {
      _doProcessForEach(this, desc, configs);
    }
    return lib.q(true);
  };
  /**
   * Returns `true` if an Array of configuration objects is allowed
   *
   * @function
   * @returns `false`
   */
  PreProcessingRegistryBase.prototype.allowArrayConfigs = function () {
    return false;
  };

  function _doProcessForEach(registry, desc, configs) {
    lib.traverseShallow(configs, _doProcess.bind(null, registry, desc));
  }

  function _doProcess(registry, desc, config, configname) {
    var preprocessor = registry.get(configname);
    if (!preprocessor) {
      console.warn(registry.constructor.name, 'has no processor registered for name', configname);
      return;
    }
    preprocessor.configure(config);
    preprocessor.process(desc);
  }

  return {
    PreProcessingRegistryBase: PreProcessingRegistryBase,
    BasicProcessor: BasicProcessor
  };
}

module.exports = createPreProcessingRegistry;

},{}],28:[function(require,module,exports){
function createPreProcessingRegistries (lib) {
  'use strict';

  var plib = require('./basecreator')(lib),
    BasicProcessor = plib.BasicProcessor,
    RegistryBase = plib.PreProcessingRegistry;

  return {
    BasicProcessor: BasicProcessor,
    PreProcessors: require('./preprocessingregistrycreator.js')(lib, plib.PreProcessingRegistryBase),
    PrePreProcessors: require('./prepreprocessingregistrycreator')(lib, plib.PreProcessingRegistryBase)
  };
}

module.exports = createPreProcessingRegistries;

},{"./basecreator":27,"./prepreprocessingregistrycreator":29,"./preprocessingregistrycreator.js":30}],29:[function(require,module,exports){
function createPrePreProcessor (lib, PreProcessingRegistryBase) {
  'use strict';

  /**
   * Specialization of {@link allex_applib.PreProcessingRegistryBase}
   * that targets the `prepreprocessors` App/Element descriptor secion.
   *
   * It allows for an Array of configuration objects.
   *
   * @class
   * @memberof allex_applib
   */
  function PrePreProcessingRegistry () {
    PreProcessingRegistryBase.call(this);
  }
  lib.inherit(PrePreProcessingRegistry, PreProcessingRegistryBase);
  /**
   * Provides for the `prepreprocessors` name of the target
   * for the configurations within the descriptor
   *
   * @member
   */
  PrePreProcessingRegistry.prototype.targetDescriptorSectionName = 'prepreprocessors';
  /**
   * Overrides {@link allex://allex_applib.PreProcessingRegistryBase#allowArrayConfigs|PreProcessingRegistryBase.allowArrayConfigs}
   * to allow for an Array of configuration objects.
   *
   * @function
   * @returns `true`
   */
  PrePreProcessingRegistry.prototype.allowArrayConfigs = function () {
    return true;
  };


  return new PrePreProcessingRegistry();

}
module.exports = createPrePreProcessor;

},{}],30:[function(require,module,exports){
function createPreProcessor (lib, PreProcessingRegistryBase) {
  'use strict';

  /**
   * @class
   * @memberof allex_applib
   * @classdesc
   * Specialization of {@link allex_applib.PreProcessingRegistryBase}
   * that targets the `preprocessors` App/Element descriptor secion.
   *
   * It doesn't allow for an Array of configuration objects.
   *
   */
  function PreProcessingRegistry () {
    PreProcessingRegistryBase.call(this);
  }
  lib.inherit(PreProcessingRegistry, PreProcessingRegistryBase);
  /**
   * Provides for the `preprocessors` name of the target
   * for the configurations within the descriptor
   *
   * @member
   */
  PreProcessingRegistry.prototype.targetDescriptorSectionName = 'preprocessors';


  return new PreProcessingRegistry();

}
module.exports = createPreProcessor;

},{}],31:[function(require,module,exports){
function createCommandPreprocessor (lib, preprocessingregistrylib, EnvironmentHelperPreprocessor) {
  'use strict';

  /**
   * Specializes the {@link allex://allex_applib.EnvironmentHelperPreprocessor|EnvironmentHelperPreprocessor}
   *
   * @class
   * @memberof allex_applib
   */
  function CommandPreprocessor () {
    EnvironmentHelperPreprocessor.call(this);
  }
  lib.inherit(CommandPreprocessor, EnvironmentHelperPreprocessor);
  /**
   * Overrides {@link allex://allex_applib.EnvironmentHelperPreprocessor#appTarget|EnvironmentHelperPreprocessor.environmentOptionsTarget} with the `'commands'` value.
   *
   * @member
   * @override
   */
  CommandPreprocessor.prototype.environmentOptionsTarget = 'commands';
  /**
   * Overrides {@link allex://allex_applib.EnvironmentHelperPreprocessor#appTarget|EnvironmentHelperPreprocessor.appTarget}
   *
   * @member
   * @override
   */
  CommandPreprocessor.prototype.appTarget = [{objdest: 'command', dest: 'commands'}];

  preprocessingregistrylib.PreProcessors.register('Command', CommandPreprocessor);
}

module.exports = createCommandPreprocessor;

},{}],32:[function(require,module,exports){
function createDataCommandPreprocessor (lib, preprocessingregistrylib, EnvironmentHelperPreprocessor) {
  'use strict';

  /**
   * Specializes the {@link allex://allex_applib.EnvironmentHelperPreprocessor|EnvironmentHelperPreprocessor}
   *
   * @class
   * @memberof allex_applib
   */
  function DataCommandPreprocessor () {
    EnvironmentHelperPreprocessor.call(this);
  }
  lib.inherit(DataCommandPreprocessor, EnvironmentHelperPreprocessor);
  /**
   * Overrides {@link allex://allex_applib.EnvironmentHelperPreprocessor#appTarget|EnvironmentHelperPreprocessor.environmentOptionsTarget} with the `'datacommands'` value.
   *
   * @member
   * @override
   */
  DataCommandPreprocessor.prototype.environmentOptionsTarget = 'datacommands';
  /**
   * Overrides {@link allex://allex_applib.EnvironmentHelperPreprocessor#appTarget|EnvironmentHelperPreprocessor.appTarget}
   *
   * @member
   * @override
   */
  DataCommandPreprocessor.prototype.appTarget = [{objdest: 'name', dest: 'datasources'}, {objdest: 'command', dest: 'commands'}];

  preprocessingregistrylib.PreProcessors.register('DataCommand', DataCommandPreprocessor);
}

module.exports = createDataCommandPreprocessor;

},{}],33:[function(require,module,exports){
function createDataSourcePreprocessor (lib, preprocessingregistrylib, EnvironmentHelperPreprocessor) {
  'use strict';

  /**
   *
   * Specializes the
   * {@link allex://allex_applib.EnvironmentHelperPreprocessor|EnvironmentHelperPreprocessor}
   * in order to specify
   * - {@link allex://allex_applib.DataSourcePreprocessor#environmentOptionsTarget|environmentOptionsTarget}
   * - {@link allex://allex_applib.DataSourcePreprocessor#appTarget|appTarget}
   *
   * @class
   * @memberof allex_applib
   */

  function DataSourcePreprocessor () {
    EnvironmentHelperPreprocessor.call(this);
  }
  lib.inherit(DataSourcePreprocessor, EnvironmentHelperPreprocessor);
  /**
   * Overrides {@link allex://allex_applib.EnvironmentHelperPreprocessor#environmentOptionsTarget|EnvironmentHelperPreprocessor.environmentOptionsTarget} with the `'datasources'` value.
   *
   * @member
   * @override
   */
  DataSourcePreprocessor.prototype.environmentOptionsTarget = 'datasources';
  /**
   * Overrides {@link allex://allex_applib.EnvironmentHelperPreprocessor#appTarget|EnvironmentHelperPreprocessor.appTarget}
   *
   * @member
   * @override
   */
  DataSourcePreprocessor.prototype.appTarget = {objdest: 'name', dest: 'datasources'};

  preprocessingregistrylib.PreProcessors.register('DataSource', DataSourcePreprocessor);
}

module.exports = createDataSourcePreprocessor;

},{}],34:[function(require,module,exports){
function createEnvironmentHelperPreprocessor (lib, preprocessingregistrylib, descriptorApi) {
  'use strict';

  var BasicProcessor = preprocessingregistrylib.BasicProcessor;

  /**
   * There are several external resources that can and should be described 
   * in the App descriptor:
   * - Data sources
   * - Commands
   * - Data commands
   *
   * All these resources share a pattern for description:
   * 1. Describe the resource in the appropriate Environment section 
   * 2. Describe the resource in the appropriate App descriptor's section
   * (`datasources`, `commands` or `datacommands`)
   *
   * The pattern above is covered by this class.
   *
   * ### Configuration
   * A single configuration object (they may come in Arrays)
   * needs to have 2 properties:
   * - `environment`
   * - `entity`
   *
   * `environment` is just a string that denotes the name of the environment
   * where the Resource should be defined
   *
   * `entity` is the appropriate configuration hash for the Resource on the environment.
   *
   * @class
   * @memberof allex_applib
   */
  function EnvironmentHelperPreprocessor () {
    BasicProcessor.call(this);
  }
  lib.inherit(EnvironmentHelperPreprocessor, BasicProcessor);

  EnvironmentHelperPreprocessor.prototype.process = function (desc) {
    if (lib.isArray(this.config)) {
      this.config.forEach(processConf.bind(null, this, desc));
      return;
    }
    processConf(this, desc, this.config);
  };
  function processConf (pp, desc, conf) {
    var targetenv;
    if (!conf.entity.name) {
      throw new Error('entity section of the configuration must have a name');
    }
    targetenv = descriptorApi.ensureDescriptorArrayElementByName(desc, 'environments', conf.environment);
    targetenv.options[pp.environmentOptionsTarget].push(conf.entity);
    if (lib.isArray(pp.appTarget)) {
      pp.appTarget.forEach(putToApp.bind(null, pp, desc, conf));
      return;
    }
    putToApp(pp, desc, conf, pp.appTarget);
  };
  function putToApp (pp, desc, conf, destdesc) {
    var appobj = lib.extend({}, desc.app, {
      environment: conf.environment
    });
    appobj[destdesc.objdest] = conf.entity.name;
    desc[destdesc.dest].push(appobj);
  }
  /**
   * This member needs to be overriden in order to define
   * the Environment secton that will get the Resource descriptor.
   * 
   * It has to be a string, namely
   * `datasources`, `commands` or `datacommands`,
   * and each descendant class of EnvironmentHelperPreprocessor
   * will be defining one of these values.
   *
   * @member
   */
  EnvironmentHelperPreprocessor.prototype.neededConfigurationNames = ['environment', 'entity'];
  EnvironmentHelperPreprocessor.prototype.environmentOptionsTarget = null; //e.g. 'datasources' or 'commands'
  /**
   * This member needs to be overriden in order to define
   * what app descriptor sections should get a reference
   * to the entity described in the `environments` section.
   *
   * If not `null`, it should be an Object with the following properties:
   * - `objdest`
   * - `dest`
   *
   * or an Array of such Objects.
   *
   *
   * @member
   */
  EnvironmentHelperPreprocessor.prototype.appTarget = null; //e.g. {objdest: 'name', dest: 'datasources'}

  return EnvironmentHelperPreprocessor; //this one is not registered

}

module.exports = createEnvironmentHelperPreprocessor;

},{}],35:[function(require,module,exports){
function createPreProcessors (lib, preprocessingregistrylib, descriptorApi) {
  'use strict';

  var EnvironmentHelperPreprocessor = require('./environmenthelpercreator')(lib, preprocessingregistrylib, descriptorApi);

  require('./datasourcecreator')(lib, preprocessingregistrylib, EnvironmentHelperPreprocessor);
  require('./datacommandcreator')(lib, preprocessingregistrylib, EnvironmentHelperPreprocessor);
  require('./commandcreator')(lib, preprocessingregistrylib, EnvironmentHelperPreprocessor);

}

module.exports = createPreProcessors;

},{"./commandcreator":31,"./datacommandcreator":32,"./datasourcecreator":33,"./environmenthelpercreator":34}],36:[function(require,module,exports){
function createResourcesModule (lib) {
  var q = lib.q,
    ResourceTypeRegistry = new lib.Map (),
    ResourceRegistry = new lib.Map (),
    ResourceParams = new lib.Map ();

  function resourceFactory (app, desc) {
    var ctor, instance, promise;
    console.log('creating Resource', desc.name||desc.type, 'for', desc.options);
    ctor = ResourceTypeRegistry.get(desc.type);
    if (!lib.isFunction(ctor)) return q.reject(new Error('Unable to find resource type '+desc.type));
    instance = new ctor(desc.options, app);
    promise = instance._load(desc.lazy);
    ResourceRegistry.add (desc.name||desc.type, {instance: instance, promise : promise});
    return promise;
  }

  function loadResourceParams (desc) {
    ResourceParams.replace(desc.name||desc.type, lib.extendWithConcat(
      ResourceParams.get(desc.name||desc.type) || {},
      desc
    ));
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

  function destroyResource (name) {
    var c = ResourceRegistry.remove(name);
    if (c) {
      if (c.instance) {
        c.instance.destroy();
      }
      //TODO: the promise has to reject finally
    }
  }

  return {
    registerResourceType : ResourceTypeRegistry.add.bind(ResourceTypeRegistry),
    getResourceType : ResourceTypeRegistry.get.bind(ResourceTypeRegistry),
    resourceFactory : resourceFactory,
    loadResourceParams : loadResourceParams,
    getResource : getResource,//ResourceRegistry.get.bind(ResourceRegistry),
    destroyResource : destroyResource,
    BasicResourceLoader : BasicResourceLoader,
    traverseResources : ResourceRegistry.traverse.bind(ResourceRegistry),
    traverseResourceParams : ResourceParams.traverse.bind(ResourceParams)
  }
}

module.exports = createResourcesModule;

},{}]},{},[10]);
