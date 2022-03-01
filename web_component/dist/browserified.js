(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
function create (lib, Hierarchy, bufferableeventlib) {
  'use strict';

  var ChangeableListenable = lib.ChangeableListenable,
    Destroyable = lib.Destroyable,
    Parent = Hierarchy.Parent,
    Listenable = lib.Listenable,
    BufferableHookCollectionContainerMixin = bufferableeventlib.BufferableHookCollectionContainerMixin,
    BufferableHookCollection = bufferableeventlib.BufferableHookCollection;

  function BasicParent () {
    Parent.call(this);
    Destroyable.call(this);
    ChangeableListenable.call(this);
    BufferableHookCollectionContainerMixin.call(this);
  }
  lib.inherit(BasicParent, Parent);
  BasicParent.prototype.destroy = Destroyable.prototype.destroy;
  BasicParent.prototype.extendTo = Destroyable.prototype.extendTo;
  BasicParent.prototype.shouldDie = Destroyable.prototype.shouldDie;
  ChangeableListenable.addMethods (BasicParent);
  BufferableHookCollectionContainerMixin.addMethods (BasicParent);

  BasicParent.prototype.__cleanUp = function () {
    BufferableHookCollectionContainerMixin.prototype.destroy.call(this);
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
  BasicParent.prototype.justAttachListener = function (evntname, cborpropname, cb){
    return Listenable.prototype.attachListener.call(this, evntname, cborpropname, cb);
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

  BasicParent.prototype.createBufferableHookCollection = function () {
    return new BufferableHookCollection();
  };

  BasicParent.prototype.isBufferableHookCollection = function (thingy) {
    return thingy instanceof BufferableHookCollection;
  };

  BasicParent.prototype.bufferAllBufferableHookCollections = function () {
    this.__children.traverse(bufferAllBufferableHookCollections);
    BufferableHookCollectionContainerMixin.prototype.bufferAllBufferableHookCollections.call(this);
  };

  function bufferAllBufferableHookCollections (thingy) {
    thingy.bufferAllBufferableHookCollections();
  };

  BasicParent.prototype.unbufferAllBufferableHookCollections = function () {
    this.__children.traverse(unbufferAllBufferableHookCollections);
    BufferableHookCollectionContainerMixin.prototype.unbufferAllBufferableHookCollections.call(this);
  };

  function unbufferAllBufferableHookCollections (thingy) {
    thingy.unbufferAllBufferableHookCollections();
  };


  return BasicParent;
}

module.exports = create;

},{}],2:[function(require,module,exports){
function createApp (lib, dataSuite, Elements, Hierarchy, Resources, BasicParent, environtmentFactory, Linker, BasicElement, executeModifiers, PrePreProcessor, PreProcessor){
  'use strict';

  var q = lib.q,
    qlib = lib.qlib,
    joblib = require('./jobs')(lib, dataSuite, Resources, environtmentFactory, BasicElement, executeModifiers);

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
    this.args = new lib.Fifo();
  }
  lib.inherit(AppSideCommand, Settable);

  AppSideCommand.prototype.destroy = function () {
    this.drainArgs();
    if (this.args) {
      this.args.destroy();
    }
    this.args = null;
    this.environment = null;
    this.command = null;
    this.target = null;
  };

  AppSideCommand.prototype.set_environment = function (env) {
    this.environment = env;
    return true;
  };

  AppSideCommand.prototype.execute = function () {
    //if (!this.environment) return q.reject(new Error('Not connected'));
    var d, args, ret;
    args = Array.prototype.slice.call(arguments);
    if (!this.environment) {
      d = q.defer();
      this.args.push({defer: d, args: args});
      return d.promise;
    }
    ret = this.environment.commands.waitFor(this.command).then(
      executeOnTarget.bind(null, args)
    );
    args = null;
    return ret;
  };
      
  function executeOnTarget (args, target) {
    //var target = this.environment.commands.get(this.command);
    if (!target) return q.reject(new Error('No target'));

    return target.execute.apply (target, args);
  };

  AppSideCommand.prototype.drainArgs = function () {
    if (this.args) {
      this.args.drain(this.executeFromDrain.bind(this));
    }
  };

  AppSideCommand.prototype.executeFromDrain = function (ex) {
    lib.qlib.promise2defer(this.execute.apply(this, ex.args), ex.defer);
  };

  return AppSideCommand;
}

module.exports = createCommand;

},{}],4:[function(require,module,exports){
function createDataSource (lib, dataSuite) {
  'use strict';

  var CLDestroyable = lib.CLDestroyable;

  function AppSideDataSource (source_name, should_running, filter, initial_value) {
    CLDestroyable.call(this);
    this.subSources = new lib.Map();
    this.should_running = should_running;
    this.running = false;
    this.source_name = source_name;
    this.initial_value = initial_value;
    this.data = initial_value;
    this.environment = null;
    this._esl = null;
    this.filter = filter;
    this.busy = false;
  }

  lib.inherit (AppSideDataSource, CLDestroyable);
  AppSideDataSource.prototype.__cleanUp = function () {
    this._unbindDS();
    this.busy = true;
    this.filter = null;
    if (this._esl) {
      this._esl.destroy();
    }
    this._esl = null;
    this.environment = null;
    this.data = null;
    this.initial_value = null;
    this.source_name = null;
    this.running = null;
    this.should_running = null;
    if (this.subSources) {
      lib.containerDestroyAll(this.subSources);
      this.subSources.destroy();
    }
    this.subSources = null;
    CLDestroyable.prototype.__cleanUp.call(this);
  };

  AppSideDataSource.prototype.getElement = function (elemname) {
    var numcheck, elem;
    if (!lib.isString(elemname)) {
      console.warn('element name', elemname, 'might be problematic?');
      throw new Error('Teach me how to deal with non-String element names...');
    }
    numcheck = parseInt(elemname);
    if (lib.isNumber(numcheck)) {
      elemname = numcheck;
    }
    elem = this.subSources.get(elemname);
    if (elem) {
      return elem;
    }
    elem = new AppSideDataSource(elemname, this.should_running, {}, this.initial_value);
    this.subSources.add(elemname, elem);
    return elem;
  };

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
    if (!this.subSources) return false;
    this.data = val;
    this.subSources.traverse(valsetter.bind(null, val));
    val = null;
    return true;
  };
  AppSideDataSource.prototype.get_environmentdata = function () {
    return this.data;
  };
  AppSideDataSource.prototype.set_environmentdata = function (data) {
    var envds = this.environment ? this.environment.dataSources.get(this.source_name) : null;
    if (envds && lib.isFunction(envds.setData)) {
      envds.setData(data);
      return true;
    }
    return false;
  };
  function valsetter (val, subsource, subsourcename) {
    subsource.set('data', val[subsourcename]);
  }

  AppSideDataSource.prototype.set_environment = function (val) {
    if (this.environment === val) return false;
    if (this._esl) this._esl.destroy();
    this._esl = null;
    this._unbindDS();
    this.environment = val;
    if (!val) return true; //nothing to be done ...

    this._esl = this.environment.attachListener ('state', this._onEnvStateChanged.bind(this));
    //this._onEnvStateChanged(this.environment.state);
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
      this.environment.dataSources.waitFor(this.source_name).then(
        this._doTheBindingToDS.bind(this)
      );
      return;
    }
    this._doTheBindingToDS(ds);
  };
  AppSideDataSource.prototype._doTheBindingToDS = function (ds) {
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
function createAppLib (lib, dataSuite, Elements, Hierarchy, Resources, BasicParent, EnvironmentFactoryPromise, Linker, BasicElement, executeModifiers, PrePreProcessor, PreProcessor) {
  'use strict';
  return require('./appcreator')(lib, dataSuite, Elements, Hierarchy, Resources, BasicParent, EnvironmentFactoryPromise, Linker, BasicElement, executeModifiers, PrePreProcessor, PreProcessor);
}

module.exports = createAppLib;

},{"./appcreator":2}],7:[function(require,module,exports){
function createAppJob (lib) {
  'use strict';

  var JobOnDestroyableBase = lib.qlib.JobOnDestroyableBase;

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
function createDescriptorLoaderJob (lib, AppJob, dataSuite, Resources, environmentFactory, BasicElement, executeModifiers) {
  'use strict';

  var q = lib.q,
    qlib = lib.qlib,
    Command = require('../commandcreator')(lib),
    FunctionCommand = require('../functioncommandcreator')(lib),
    DataSource = require('../datasourcecreator')(lib, dataSuite);

  //supporting the "no environmentlib" case

  function DescriptorLoaderJob (descriptorhandler, app, defer) {
    AppJob.call(this, app, defer);
    this.descriptorHandler = descriptorhandler;
  }
  lib.inherit(DescriptorLoaderJob, AppJob);
  DescriptorLoaderJob.prototype.destroy = function () {
    this.descriptorHandler = null;
    AppJob.prototype.destroy.call(this);
  };
  DescriptorLoaderJob.prototype._destroyableOk = function () {
    var ret = AppJob.prototype._destroyableOk.call(this);
    if (!ret) {
      return ret;
    }
    if (!this.descriptorHandler) {
      throw new lib.Error('ALREADY_DESTROYED', 'No descriptorHandler');
    }
    if (!this.descriptorHandler.environmentNames) {
      throw new lib.Error('DESCHANDLER_ALREADY_DESTROYED', 'No descriptorHandler.environmentNames');
    }
    return true;
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
    try {
      lib.traverseShallow (
        desc.datasources,
        linkDataSource.bind(null, this.destroyable.datasources, this.destroyable.environments, this.descriptorHandler)
      );
      lib.traverseShallow (
        desc.commands,
        linkCommand.bind(null, this.destroyable.commands, this.destroyable.environments, this.descriptorHandler)
      );
    } catch(e) {
      console.error(e);
      this.reject(e);
      return ok.val;
    }

    this.loadEnvironments().then(
      this.handleResources.bind(this)
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
    return this.loadElements();
    //this.onAllDone();
  };
  DescriptorLoaderJob.prototype.loadElements = function () {
    if (!this.okToProceed()) {
      return;
    }
    try {
      executeModifiers(false, this.descriptorHandler.descriptor);
      if (lib.isArray(this.descriptorHandler.descriptor.elements)) {
        this.descriptorHandler.descriptor.elements.forEach (this.createElement.bind(this));
      }

      this.produceLinks().then(
        this.produceLogic.bind(this)
      ).then(
        this.onElementsLoaded.bind(this)
      );
    } catch(e) {
      console.error(e);
      this.reject(e);
    }
  };
  DescriptorLoaderJob.prototype.onElementsLoaded = function () {
    this.onAllDone();
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
    var links;
    try {
      links = this.destroyable._link.produceLinks(this.descriptorHandler.descriptor.links);
      return links.then(
        this.descriptorHandler.setLinks.bind(this.descriptorHandler)
      );
    } catch (e) {
      console.error(e);
      this.reject(e);
    }
  };
  DescriptorLoaderJob.prototype.produceLogic = function () {
    if (!this.okToProceed()) {
      return;
    }
    var logic;
    try {
      logic = this.destroyable._link.produceLogic(this.descriptorHandler.descriptor.logic);
      return logic.then(
        this.descriptorHandler.setLogic.bind(this.descriptorHandler)
      );
    } catch (e) {
      console.error(e);
      this.reject(e);
    }
  };
  DescriptorLoaderJob.prototype.loadEnvironments = function () {
    if (!lib.isFunction(environmentFactory)) {
      console.warn('Environment factory not found. Did you load allex_environmentlib?')
      return q(true);
    }
    if (!this.okToProceed()) {
      return;
    }
    if (!lib.isArray(this.descriptorHandler.descriptor.environments)) {
      return q(true);
    }
    this.descriptorHandler.descriptor.environments.forEach(this.createEnvironment.bind(this));
    return q(true);
  };
  DescriptorLoaderJob.prototype.createEnvironment = function (envdesc) {
    console.log('createEnvironment', envdesc);
    var env, name;
    if (!this.okToProceed()) {
      return;
    }
    try {
      name = envdesc.name;
      env = this.destroyable.environments.get(name);
      if (!env) {
        env = environmentFactory(envdesc);
        this.destroyable.environments.add(name, env);
        this.descriptorHandler.environmentNames.push(name);
      } else {
        env.addDataSources(envdesc.options.datasources);
        env.addCommands(envdesc.options.commands);
        env.addDataCommands(envdesc.options.datacommands);
      }
    } catch (e) {
      console.error(e);
      this.reject(e);
    }
  };
  DescriptorLoaderJob.prototype.onAllDone = function () {
    var desc;
    if (!this.okToProceed()) {
      return;
    }
    this.destroyable.elements.traverse(unbuffer);
    desc = this.descriptorHandler.descriptor;
    if (desc && lib.isFunction (desc.onLoaded)) {
      desc.onLoaded(this);
    }
    this.resolve(this.descriptorHandler);
  };

  function unbuffer (el) {
    el.unbufferAllBufferableHookCollections();
  }


  /* creation */
  function toString (item) {
    return JSON.stringify(item, null, 2);
  }

  function findByField (fieldname, val, item) {
    if (item[fieldname] === val) return item;
  }

  function linkDataSource (datasources, environments, deschandler, item) {
    var source_name, desc, environment, e_datasource, ds;
    if (!item.name) throw new Error ('Datasource has no name: '+toString(item));
    if (!item.environment) throw new Error('Datasource has no environment: '+toString(item));

    desc = deschandler.descriptor;
    source_name = item.source || item.name;
    environment = lib.traverseConditionally (desc.environments, findByField.bind(null, 'name', item.environment));

    if (!environment) throw new Error('Unable to find environment descriptor '+item.environment);
    e_datasource = lib.traverseConditionally (environment.options.datasources, findByField.bind(null, 'name', source_name));
    if (!e_datasource) {
      e_datasource = lib.traverseConditionally (environment.options.datacommands, findByField.bind(null, 'name', source_name));
      if (!e_datasource)
        console.warn('Unable to find datasource '+source_name+' within environment description');
    }

    ds = datasources.get(item.name);
    if (ds) {
      return;
    }
    ds = new DataSource(source_name, 'should_running' in item ? item.should_running : true, 'filter' in item ? item.filter : null, 'initial_value' in item ? item.initial_value : null);
    datasources.add(item.name, ds);
    deschandler.dataSourceNames.push(item.name);
    environments.listenFor (item.environment, ds.set.bind(ds, 'environment'));
  }


  function linkCommand (commands, environments, deschandler, item) {
    var fc = null, desc, e, c, c_name;
    if (!item.command) throw new Error('No command in '+toString(item));
    desc = deschandler.descriptor;
    fc = commands.get(item.command);
    if (fc) {
      return;
    }
    if (lib.isFunction(item.handler)){
      fc = new FunctionCommand(item.command, item.handler);
    }else{
      if (!item.environment) throw new Error('No environment in '+toString(item));
      e = item.environment ? lib.traverseConditionally (desc.environments, findByField.bind(null, 'name', item.environment)) : null;
      if (!e && !lib.isFunction(item.handler)) throw new Error('Unable to find environment '+item.environment);

      if (!e && lib.isFunction (item.handler)) {
      }

      c_name = item.ecommand || item.command; 
      c = lib.traverseConditionally (e.options.commands, findByField.bind(null, 'name', c_name));

      if (!c) {
        c = lib.traverseConditionally (e.options.datacommands, findByField.bind(null, 'name', c_name));
        if (!c)
          console.warn('Unable to find command '+c_name+' in environment descriptor');
      }
      fc = new Command (c_name);
      environments.listenFor (item.environment, fc.set.bind(fc, 'environment'));
    }
    deschandler.commandNames.push(item.command);
    commands.add(item.command, fc);
  }

  /* loading section done */

  return DescriptorLoaderJob;
}

module.exports = createDescriptorLoaderJob;


},{"../commandcreator":3,"../datasourcecreator":4,"../functioncommandcreator":5}],9:[function(require,module,exports){
function createAppJobs (lib, dataSuite, Resources, environtmentFactory, BasicElement, executeModifiers) {
  'use strict';

  var AppJob = require('./appjobcreator')(lib),
    DescriptorLoaderJob = require('./descriptorloaderjobcreator')(lib, AppJob, dataSuite, Resources, environtmentFactory, BasicElement, executeModifiers);

  return {
    AppJob: AppJob,
    DescriptorLoaderJob: DescriptorLoaderJob
  };
}

module.exports = createAppJobs;

},{"./appjobcreator":7,"./descriptorloaderjobcreator":8}],10:[function(require,module,exports){
ALLEX.execSuite.libRegistry.register('allex_applib',require('./libindex')(
  ALLEX,
  ALLEX.execSuite.libRegistry.get('allex_applinkinglib'),
  ALLEX.execSuite.libRegistry.get('allex_hierarchymixinslib'),
  ALLEX.execSuite.libRegistry.get('allex_environmentlib'),
  ALLEX.execSuite.libRegistry.get('allex_bufferableeventlib'),
  ALLEX.execSuite.libRegistry.get('allex_datafilterslib')
));
ALLEX.WEB_COMPONENTS.allex_applib = ALLEX.execSuite.libRegistry.get('allex_applib');

},{"./libindex":24}],11:[function(require,module,exports){
function createDataElementMixin (lib, mylib) {
  'use strict';

  var q = lib.q,
    DataUpdaterMixin = mylib.DataUpdaterMixin;

  function DataElementMixIn () {
    this.data = null;
    this.busy = false;
  }

  DataElementMixIn.prototype.__cleanUp = function () {
    this.data = null;
    this.busy = null;
  };

  DataElementMixIn.prototype.preInitializeData = function () {
    //this.data = null;
    this.set('data', null);
  };
  DataElementMixIn.prototype.postInitializeData = function () {
    var data = this.getConfigVal('data');
    if (lib.isVal(data)) {
      this.set('data', data);
    }
  };

  DataElementMixIn.prototype.set_data = function (data) {
    var f;
    this.tryDataMarkup(data);
    f = this.getConfigVal('dataHandler');
    if (lib.isFunction(f)) return f(this.$element, data);

    if (this.data === data) return false;
    this.onNullData(null === data);
    this.onEmptyDataArray(lib.isArray(data) && data.length===0);
    this.data = data;
    return true;
  };

  DataElementMixIn.prototype.onNullData = function () {
  };

  DataElementMixIn.prototype.onEmptyDataArray = function () {
  };

  DataElementMixIn.prototype.extendDatWith = function (data) {
    this.set('data', lib.extend({}, this.get('data'), data));
  };

  DataElementMixIn.prototype.hasDataChanged = function (ret) {
    return lib.isUndef(ret) || ret === true;
  };

  DataElementMixIn.prototype.set_busy = function (val) {
    this.busy = val;
    console.log(this.get('id'), 'reported busy', val);
  };

  DataElementMixIn.prototype.tryDataMarkup = function (data) {
    var dm, m;
    if (!this.$element) {
      return;
    }
    dm = this.getConfigVal('data_markup');
    if (!dm) {
      return;
    }
    m = this.produceDataMarkup(dm, data);
    this.$element.html(m);
    this.__children.traverse(function (c) {c.initialize();});
    //this.$element.html(this.produceDataMarkup.bind(this, dm, data));
  };

  var _dmre = new RegExp('{{(.*?)}}', 'gm');
  DataElementMixIn.prototype.produceDataMarkup = function (dm, item) {
    var m;
    if (lib.isArray(item)) {
      return item.map(this.produceDataMarkup.bind(this, dm)).join(' ');
    }
    if (!lib.isString(dm)) {
      return '';
    }
    return dm.replace(_dmre, this.doubleBracesSubstituter.bind(this, item));
  }
  DataElementMixIn.prototype.doubleBracesSubstituter = function (item, ignoretotalstr, str) {
    var ret;
    try {
      ret = pretty(eval(str));
    }
    catch (ignore) {
      ret = '';
    }
    return ret;
  }
  function pretty (thingy) {
    if (!lib.isVal(thingy)) {
      return thingy;
    }
    if (lib.isNumber(thingy)) {
      return thingy;
    }
    if (lib.isString(thingy)) {
      return thingy;
    }
    if (lib.isBoolean(thingy)) {
      return thingy;
    }
    return JSON.stringify(thingy);
  }

  DataElementMixIn.addMethods = function (klass) {
    DataUpdaterMixin.addMethods(klass);
    lib.inheritMethods (klass, DataElementMixIn
      ,'preInitializeData'
      ,'postInitializeData'
      ,'set_data'
      ,'onNullData'
      ,'onEmptyDataArray'
      ,'extendDatWith'
      ,'hasDataChanged'
      ,'set_busy'
      ,'tryDataMarkup'
      ,'produceDataMarkup'
      ,'doubleBracesSubstituter'
    );
  };

  mylib.DataElementMixin = DataElementMixIn;
}

module.exports = createDataElementMixin;

},{}],12:[function(require,module,exports){
function createDataElementFollowerMixin (lib, mylib) {
  'use strict';

  function DataElementFollowerMixin () {
    this.datamaster = null;
    this.masterDataListener = null;
  }
  DataElementFollowerMixin.prototype.destroy = function () {
    this.purgeDataMaster();
  };
  DataElementFollowerMixin.prototype.purgeDataMaster = function () {
    if (this.masterDataListener) {
      this.masterDataListener.destroy();
    }
    this.masterDataListener = null;
    this.datamaster = null;
  };
  DataElementFollowerMixin.prototype.startFollowingDataOn = function (dataemitter) {
    this.purgeDataMaster();
    if (!dataemitter) {
      this.onMasterDataChanged(null);
      return;
    }
    if (!lib.isFunction(dataemitter.attachListener)) {
      console.warn('Method named "attachListener" was not found on dataemitter');
      return;
    }
    this.masterDataListener = dataemitter.attachListener('changed', 'data', this.onMasterDataChanged.bind(this));
    if (dataemitter.destroyed && (dataemitter.destroyed instanceof lib.HookCollection)) {
      dataemitter.destroyed.attachForSingleShot(this.purgeDataMaster.bind(this));
    }
  };
  DataElementFollowerMixin.prototype.startListeningToParentData = function () {
    this.startFollowingDataOn(this.__parent);
  };
  DataElementFollowerMixin.prototype.onMasterDataChanged = function (data) {
    var onMasterDataChanged = this.getConfigVal('onMasterDataChanged');
    if (lib.isFunction(onMasterDataChanged)) {
      onMasterDataChanged(this, data);
    }
  };
  DataElementFollowerMixin.prototype.set_datamaster = function (datamaster) {
    this.startFollowingDataOn(datamaster);
    this.datamaster = datamaster;
    return true;
  };
  DataElementFollowerMixin.addMethods = function (klass) {
    lib.inheritMethods(klass, DataElementFollowerMixin
      ,'purgeDataMaster'
      ,'startFollowingDataOn'
      ,'startListeningToParentData'
      ,'onMasterDataChanged'
      ,'set_datamaster'
    );
  };

  mylib.DataElementFollowerMixin = DataElementFollowerMixin;
}

module.exports = createDataElementFollowerMixin;

},{}],13:[function(require,module,exports){
function createDataUpdaterMixin (lib, mylib) {
  'use strict';

  function DataUpdaterMixin () {
  }
  DataUpdaterMixin.prototype.destroy = lib.dummyFunc;

  DataUpdaterMixin.prototype.updateHashField = function (name, value) {
    var val = {};
    val[name] = value;
    this.set('data', lib.extend ({}, this.get('data'), val));
  };

  DataUpdaterMixin.prototype.updateArrayElement = function (index, value) {
    var old = this.get('data'),
      n = old ? old.slice() : [];

    n[index] = value;
    this.set('data', n);
  };

  DataUpdaterMixin.addMethods = function (klass) {
    lib.inheritMethods (klass, DataUpdaterMixin
      ,'updateHashField'
      ,'updateArrayElement'
    );
  };

  mylib.DataUpdaterMixin = DataUpdaterMixin;
}
module.exports = createDataUpdaterMixin;

},{}],14:[function(require,module,exports){
function createFromDataCreatorMixin (lib, elements, datafilterslib, mylib) {
  'use strict';

  function FromDataCreatorMixin () {
    if (!lib.isFunction(this.super_set_data)) {
      throw new lib.Error('FROMDATACREATORMIXIN_NOT_APPLICABLE', this.constructor.name+' must have the super_set_data method, that calls set_data on the super class');
    }
    this.subElements = [];
  }
  FromDataCreatorMixin.prototype.destroy = function () {
    if (this.subElements) {
      lib.arryDestroyAll(this.subElements);
    }
    this.subElements = null;
  };
  FromDataCreatorMixin.prototype.set_data = function (data) {
    //Implementor MUST have the super_set_data method!
    this._purgeSubElements(data);
    if (lib.isArray(data)) {
      this.createFromArryData(data);
    }
    return this.super_set_data(data);
  };
  FromDataCreatorMixin.prototype.createFromArryData = function (data) {
    if (this.getConfigVal('prependsubelements')) {
      data = data.slice();
      data.reverse();
    }
    data.forEach(this.createFromArryItem.bind(this));
  };
  FromDataCreatorMixin.prototype.createFromArryItem = function (item) {
    var desc = this.createDescriptorFromArryItem(item),
      testel;
    if (desc) {
      try {
        testel = this.getElement(desc.name);
        if(testel) {
          testel.set('data', item);
          return;
        }
      } catch(e) {}
      desc.options = desc.options || {};
      if (this.getConfigVal('prependsubelements')) {
        desc.options.attach_to_parent = 'prepend';
      }
      desc.options.data = item;
      elements.BasicElement.createElement(desc, this.addFromDataChild.bind(this));
      return;
    }
    console.warn(this.constructor.name, 'created no descriptor from', item, 'so no child will be produced');
  };
  FromDataCreatorMixin.prototype.addFromDataChild = function (chld) {
    this.subElements.push(this.destructableForSubElements(chld));
    this.addChild(chld);
  };
  FromDataCreatorMixin.prototype.destructableForSubElements = function (chld) {
    return chld;
  };
  FromDataCreatorMixin.prototype.createDescriptorFromArryItem = function (item) {
    if (lib.isFunction(this.config.subDescriptorFromData)) {
      return this.config.subDescriptorFromData.call(this, item);
    }
    /*
    lib.extend({
      name: this.config.data2Name(item)
    }, this.config.subDescriptor)
    */
  };
  FromDataCreatorMixin.prototype.prependData = function (data) {
    var myprependsubelements = this.getConfigVal('prependsubelements') || false;
    this.setConfigVal('prependsubelements', true, true);
    this.set('data', data);
    this.setConfigVal('prependsubelements', myprependsubelements, true);
  };
  FromDataCreatorMixin.prototype.appendData = function (data) {
    var myprependsubelements = this.getConfigVal('prependsubelements') || false;
    this.setConfigVal('prependsubelements', false, true);
    this.set('data', data);
    this.setConfigVal('prependsubelements', myprependsubelements, true);
  };
  FromDataCreatorMixin.prototype._purgeSubElements = function (data) {
    if (data === null || !this.getConfigVal('skip_purge_subelements')) {
      lib.arryDestroyAll(this.subElements);
      this.subElements = [];
    }
  };
  FromDataCreatorMixin.prototype.filterSubElements = function (filterdesc, bothmatchingandunmatching) {
    var f, ret, _ret;
    ret = bothmatchingandunmatching ? {matching: [], unmatching: []} : [];
    if (!(lib.isArray(this.subElements) && this.subElements.length>0)) {
      return ret;
    }
    f = datafilterslib.createFromDescriptor(filterdesc);
    if (!f) {
      return;
    }
    _ret = ret;
    this.subElements.forEach(filterer.bind(null, f, bothmatchingandunmatching, _ret));
    _ret = null;
    bothmatchingandunmatching = null;
    f.destroy();
    f = null;
    return ret;
  };
  function filterer (f, bothmatchingandunmatching, ret, chld) {
    var data = chld.get('data');
    if (f.isOK(data)) {
      if (bothmatchingandunmatching) {
        ret.matching.push(chld);
        return;
      }
      ret.push(chld);
      return;
    }
    if (bothmatchingandunmatching) {
      ret.unmatching.push(chld);
    }
  }
  FromDataCreatorMixin.prototype.traverseSubElementsWithFilter = function (filterdesc, cb) {
    var f;
    if (!(lib.isArray(this.subElements) && this.subElements.length>0)) {
      return;
    }
    if (!lib.isFunction(cb)) {
      return;
    }
    f = datafilterslib.createFromDescriptor(filterdesc);
    if (!f) {
      return;
    }
    this.subElements.forEach(filtertraverser.bind(null, f, cb));
    f.destroy();
    f = null;
    cb = null;
  };
  function filtertraverser (f, cb, chld) {
    cb (chld, f.isOK(chld.get('data')));
    /*
    var d = chld.get('data');
    console.log('data', d, 'f.isOK', f.isOK(d));
    cb(chld, f.isOK(d));
    */
  }
  FromDataCreatorMixin.prototype.actualizeSubElementsWithFilter = function (filterdesc) {
    this.traverseSubElementsWithFilter(filterdesc, function (chld, isok) {chld.set('actual', isok);});
  };

  FromDataCreatorMixin.addMethods = function (klass) {
    lib.inheritMethods(klass, FromDataCreatorMixin
      ,'set_data'
      ,'createFromArryData'
      ,'createFromArryItem'
      ,'addFromDataChild'
      ,'destructableForSubElements'
      ,'createDescriptorFromArryItem'
      ,'prependData'
      ,'appendData'
      ,'filterSubElements'
      ,'traverseSubElementsWithFilter'
      ,'actualizeSubElementsWithFilter'
      ,'_purgeSubElements'
    );
  };

  mylib.FromDataCreator = FromDataCreatorMixin;
}
module.exports = createFromDataCreatorMixin;

},{}],15:[function(require,module,exports){
function createDataMixins (lib, elements, datafilterslib, mixins) {
  'use strict';

  require('./dataupdatercreator')(lib, mixins);
  require('./dataelementcreator')(lib, mixins);
  require('./dataelementfollowercreator')(lib, mixins);
  require('./fromdatacreator')(lib, elements, datafilterslib, mixins);
}
module.exports = createDataMixins;

},{"./dataelementcreator":11,"./dataelementfollowercreator":12,"./dataupdatercreator":13,"./fromdatacreator":14}],16:[function(require,module,exports){
function createDescriptorApi (lib) {
  var ArryOps = require('allex_arrayoperationslowlevellib')(lib.extend, lib.readPropertyFromDotDelimitedString, lib.isFunction, lib.Map, lib.AllexJSONizingError);

  function ensureDescriptorArrayElementByPropertyName (propertyname, desc, arryname, arryelementname, defaultelement) {
    var arry, elem, mydefault;
    if (!desc) {
      return null;
    }
    arry = desc[arryname];
    if (!arry) {
      arry = [];
      desc[arryname] = arry;
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
    

},{"allex_arrayoperationslowlevellib":32}],17:[function(require,module,exports){
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

},{}],18:[function(require,module,exports){
function createBasicElement (lib, Hierarchy, elementFactory, BasicParent, Linker, Resources, executeModifiers, LinksAndLogicDestroyableMixin, PrePreProcessor, PreProcessor, DescriptorHandler) {
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
    jobs = require('./jobs')(lib, Resources, DescriptorHandler),
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
    this.loadedEnvironmentAndElements = {
      static: null,
      dynamic: null
    };
    this._addHook ('onInitialized');
    this._addHook ('onActual');
    this._addHook ('onLoaded');
    this.attachHook ('onInitialized', this.getConfigVal('onInitialized'));
  }
  lib.inherit (BasicElement, BasicParent);
  LinksAndLogicDestroyableMixin.addMethods(BasicElement);

  BasicElement.prototype.__cleanUp = function () {
    //console.log(this.constructor.name, this.id, 'dying');
    if (this.loadedEnvironmentAndElements) {
      if (this.loadedEnvironmentAndElements.dynamic) {
        this.loadedEnvironmentAndElements.dynamic.destroy();
      }
      this.loadedEnvironmentAndElements.dynamic = null;
      if (this.loadedEnvironmentAndElements.static) {
        this.loadedEnvironmentAndElements.static.destroy();
      }
      this.loadedEnvironmentAndElements.static = null;
    }
    this.loadedEnvironmentAndElements = null;
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

  BasicElement.prototype.initialize = function () {
    var subelements;
    preInitialize(this);
    this.actual = this.getConfigVal('actual') || false;
    subelements = this.getConfigVal('elements');
    if (lib.isArray(subelements)) {
      subelements.forEach(this.createElement.bind(this));
    }
    (new jobs.LoadStaticEnvironmentAndElements(this)).go().then(
      this.fireInitializationDone.bind(this),
      this.destroy.bind(this)
    );
  };

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
    this.set('initialized', true);
    this.attachHook('onActual', this.getConfigVal('onActual'));
    this.attachHook('onLoaded', this.getConfigVal('onLoaded'));
    handleLoading(this, this.getConfigVal('actual'));
    postInitialize(this);
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

  //BasicElement.prototype.getElement = function () { throw new Error('Not implemented'); }
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
      throw new lib.Error('INVALID_PATH', 'Path '+path+' did not produce a valid first element');
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
    //prepareResources(el, desc.requires);
    if ('actual' in desc) {
      console.error(desc);
      throw new Error('actual has to be in "options"');
    }
    el.initialize();
    el._link = new Linker.LinkingEnvironment(el);
    el._link.produceLinks(desc.links).then(el.setLinks.bind(el));
    el._link.produceLogic(desc.logic).then(el.setLogic.bind(el));
    return el;
    } catch (e) {
      console.error('Could not create element from desc', desc);
      console.error(e);
      throw e;
    }
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

},{"./jobs":23}],19:[function(require,module,exports){
function createElements (lib, Hierarchy, BasicParent, Linker, Resources, executeModifiers, mixins, PrePreProcessor, PreProcessor, DescriptorHandler) {
  'use strict';

  var ElementTypeRegistry = new lib.Map (),
    BasicElement = require('./basicelementcreator.js')(lib, Hierarchy, elementFactory, BasicParent, Linker, Resources, executeModifiers, mixins.LinksAndLogicDestroyableMixin, PrePreProcessor, PreProcessor, DescriptorHandler),
    mylib;

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

  registerElementType ('BasicElement', BasicElement);

  mylib =  {
    BasicElement : BasicElement,
    elementFactory : elementFactory,
    registerElementType : registerElementType,
    getElementType : getElementType
  };
  return mylib;
}

module.exports = createElements;

},{"./basicelementcreator.js":18}],20:[function(require,module,exports){
function createElementLoaderJob (lib, JobOnDestroyable, Resources, DescriptorHandler, mylib) {
  'use strict';

  var q = lib.q,
    qlib = lib.qlib;

  function ElementLoaderJob (el, defer) {
    JobOnDestroyable.call (this, el, defer);
  }
  lib.inherit(ElementLoaderJob, JobOnDestroyable);
  ElementLoaderJob.prototype.destroy = function () {
    JobOnDestroyable.prototype.destroy.call(this);
  };
  ElementLoaderJob.prototype.resolve = function (thingy) {
    if (this.destroyable) {
      try {
        this.destroyable.onLoaded();
      } catch(e) {
        this.reject(e);
        return;
      }
    }
    JobOnDestroyable.prototype.resolve.call(this, thingy);
  };
  ElementLoaderJob.prototype.reject = function (reason) {
    if (this.destroyable.id) {
      console.error('Element loading failed for', this.destroyable.id, this.destroyable.constructor.name);
      console.error(reason);
    }
    JobOnDestroyable.prototype.reject.call(this, reason);
  };
  ElementLoaderJob.prototype.go = function () {
    var ok = this.okToGo(), resreqs, resdescs, promises, p, intenvdesc;
    if (!ok.ok) {
      return ok.val;
    }
    this.destroyable.set('loading', true);
    promises = [];
    resreqs = this.destroyable.resourcereqs;
    resdescs = this.destroyable.resourcedescs;
    this.destroyable.resourcereqs = null;
    this.destroyable.resourcedescs = null;
    
    if (lib.isArray(resreqs)) {
      promises.push.apply(promises, resreqs.map(this.getResource.bind(this)));
    }
    if (lib.isArray(resdescs)) {
      promises.push.apply(promises, resdescs.map(this.loadResourceParams.bind(this)));
    }
    if (this.destroyable.createIntegrationEnvironmentDescriptor) {
      console.error(this.destroyable.constructor.name, 'has to move createIntegrationEnvironmentDescriptor to actualEnvironmentDescriptor')
      lib.runNext(this.reject.bind(this, new lib.Error('IMPLEMENTATION_OBSOLETE', 'createIntegrationEnvironmentDescriptor is obsolete')));
      return;
    }
    if (this.destroyable.lateElementDescriptors) {
      console.error(this.destroyable.constructor.name, 'has to move lateElementDescriptors to actualElementDescriptors')
      lib.runNext(this.reject.bind(this, new lib.Error('IMPLEMENTATION_OBSOLETE', 'lateElementDescriptors is obsolete')));
      return;
    }
    /*
    if (!this.destroyable.integrationEnvironment) {
      try {
        intenvdesc = this.destroyable.actualEnvironmentDescriptor(this.destroyable.myNameOnMasterEnvironment());
        if (intenvdesc) {
          promises.push(this.loadIntegrationEnvironment(intenvdesc));
        }
      } catch (e) {
        console.error('loadIntegrationEnvironment failed', e);
        lib.runNext(this.reject.bind(this, e));
        return ok.val;
      }
    }
    */
    p = q.all(promises);
    //qlib.promise2defer(p, this);
    /*
    p.then(
      this.createLateElements.bind(this),
      this.reject.bind(this)
    );
    */
    p.then(
      this.loadDynamicEnvironmentAndElements.bind(this),
      this.reject.bind(this)
    )
    return ok.val;
  };

  ElementLoaderJob.prototype.getResource = function (resourcename) {
    var pktp = this.peekToProceed(), resourceid, p;
    if (!pktp.ok) {
      return pktp.val;
    }
    resourceid = resourcename.resource || resourcename;
    console.log('will waitForResource', resourceid); 
    p = Resources.waitForResource(resourceid).then(resourceLoader);
    p.then(this.doUpdateResource.bind(this, resourcename), null, null);
    return p;
  };

  ElementLoaderJob.prototype.loadResourceParams = function (resourcename) {
    var pktp = this.peekToProceed();
    if (!pktp.ok) {
      return pktp.val;
    }
    console.log('loadResource?', resourcename);
    Resources.loadResourceParams(resourcename);
    return q({});
  };

  ElementLoaderJob.prototype.doUpdateResource = function (resourcename) {
    var pktp = this.peekToProceed();
    if (!pktp.ok) {
      return pktp.val;
    }
    this.destroyable.updateResource(resourcename);
  };

  ElementLoaderJob.prototype.loadIntegrationEnvironment = function (intenvdesc) {
    var pktp = this.peekToProceed(), env;
    if (!pktp.ok) {
      return pktp.val;
    }
    env = new DescriptorHandler(intenvdesc);
    return env.load().then(
      this.onIntegrationEnvironment.bind(this),
      this.onIntegrationEnvironmentFailed.bind(this)
    );
  };
  ElementLoaderJob.prototype.onIntegrationEnvironment = function (result) {
    this.destroyable.integrationEnvironment = result;
    return result;
  };
  ElementLoaderJob.prototype.onIntegrationEnvironmentFailed = function (reason) {
    console.error(reason);
    throw reason;
  };

  ElementLoaderJob.prototype.createLateElements = function (resultuptonow) {
    var lateelemdescs;
    if (!this.okToProceed()) {
      return;
    }
    if (!this.destroyable.lateElementsCreated) {
      lateelemdescs = this.destroyable.actualElementDescriptors();
      if (lib.isArray(lateelemdescs)) {
        q.all(lateelemdescs.map(this.createLateElement.bind(this))).then(
          this.onLateElementsCreated.bind(this, resultuptonow),
          this.reject.bind(this)
        );
        return;
      }
    }
    this.resolve(resultuptonow);
  };
  ElementLoaderJob.prototype.createLateElement = function (lateelemdesc) {
    var elem = this.destroyable.createElement(lateelemdesc), d = q.defer(), ret = d.promise;
    if (lateelemdesc && lateelemdesc.options && lateelemdesc.options.actual) {
      elem.loadEvent.attachForSingleShot(elemLoaded.bind(null, d));
      d = null;
      return ret;
    }
    d.resolve(elem);
    return ret;
  };
  function elemLoaded (defer, elem) {
    defer.resolve(elem);
  }
  ElementLoaderJob.prototype.onLateElementsCreated = function (firststageresult, lateelemsresult) {
    if (!this.okToProceed()) {
      return;
    }
    this.destroyable.lateElementsCreated = true;
    this.resolve(firststageresult.concat(lateelemsresult));
  };

  ElementLoaderJob.prototype.loadDynamicEnvironmentAndElements = function (resultuptonow) {
    if (!this.okToProceed()) {
      return;
    }
    (new mylib.LoadActualEnvironmentAndElements(this.destroyable)).go().then(
      this.resolve.bind(this, resultuptonow),
      this.reject.bind(this)
    );
  };

  function resourceLoader (resource) {
    console.log('got resource', resource, 'will load it');
    return resource.load().then(qlib.returner(resource));
  }

  mylib.ElementLoaderJob = ElementLoaderJob;
}

module.exports = createElementLoaderJob;

},{}],21:[function(require,module,exports){
function createElementUnloaderJob (lib, JobOnDestroyable, Resources, mylib) {
  'use strict';

  var q = lib.q,
    qlib = lib.qlib;
    
  function ElementUnloaderJob (el, defer) {
    JobOnDestroyable.call (this, el, defer);
  }
  lib.inherit(ElementUnloaderJob, JobOnDestroyable);
  ElementUnloaderJob.prototype.go = function () {
    var ok = this.okToGo();
    if (!ok.ok) {
      return ok.val;
    }
    var promises = lib.isArray(this.destroyable.resourcereqs)
      ?
      this.destroyable.resourcereqs.map(this.unloadResourceReq.bind(this))
      :
      [];
    if (lib.isArray(this.destroyable.resources)) {
      promises.concat(this.destroyable.resources.map(this.unloadResource.bind(this)));
    }
    q.all(promises).then(
      this.finalStep.bind(this),
      this.reject.bind(this)
    );
    return ok.val;
  };

  ElementUnloaderJob.prototype.unloadResourceReq = function (resourcename) {
    if (!this.peekToProceed()) {
      return q(null);
    }
    var resource = Resources.get(resourcename.resource || resourcename);
    if (resource) {
      resource.unload();
    }
    return q(true);
  };

  ElementUnloaderJob.prototype.unloadResource = function (resourcename) {
    console.log('how to unloadResource', resourcename, '?');
    throw new Error('blah, sort this out');
  };

  ElementUnloaderJob.prototype.finalStep = function (resultuptonow) {
    if (!this.okToProceed()){
      return;
    }
    if (this.destroyable) {
      try {
        if (this.destroyable.loadedEnvironmentAndElements.dynamic) {
          this.destroyable.loadedEnvironmentAndElements.dynamic.destroy();
          this.destroyable.loadedEnvironmentAndElements.dynamic = null;
        }
        this.destroyable.onUnloaded();
      } catch (e) {
        console.error('Unload finalizing produced an error', e);
        this.reject(e)
      }
    }
    this.resolve(resultuptonow);
  };

  ElementUnloaderJob.prototype.fireLoadEvent = function () {
    if (!this.peekToProceed()) {
      return;
    }
    this.destroyable.loadEvent.fire.apply(this.destroyable, arguments);
  };

  mylib.ElementUnloaderJob = ElementUnloaderJob;
}

module.exports = createElementUnloaderJob;

},{}],22:[function(require,module,exports){
function createEnvironmentAndElementsFunctionality (lib, DescriptorHandler, mylib) {
  'use strict';

  var q = lib.q,
    qlib = lib.qlib,
    SteppedJobOnSteppedInstance = qlib.SteppedJobOnSteppedInstance;

  function EnvironmentAndElements () {
    this.envLoader = null;
    this.elements = [];
  }
  EnvironmentAndElements.prototype.destroy = function () {
    if (this.envLoader) {
      this.envLoader.destroy();
    }
    this.envLoader = null;
    if (lib.isArray(this.elements)) {
      lib.arryDestroyAll(this.elements);
    }
    this.elements = null;
  }

  function LoadEnvironmentAndElementsJobCore (elem) {
    this.elem = elem;
    this.envAndElements = new EnvironmentAndElements();
    this.envDesc = null;
    this.elemDescs = null;
  }
  LoadEnvironmentAndElementsJobCore.prototype.destroy = function () {
    this.elemDescs = null;
    this.envDesc = null;
    this.envAndElements = null;
    this.elem = null;
  };
  LoadEnvironmentAndElementsJobCore.prototype.shouldContinue = function () {
    if (this.elem && this.elem.destroyed) {
      return;
    }
    return new lib.Error('ELEMENT_DESTROYED', 'No Element to load Environment and Elements on');
  }
  LoadEnvironmentAndElementsJobCore.prototype.init = function () {
    if (this.elem.createIntegrationEnvironmentDescriptor) {
      console.error(this.elem.constructor.name, 'has to move createIntegrationEnvironmentDescriptor to actualEnvironmentDescriptor')
      return new lib.Error('IMPLEMENTATION_OBSOLETE', 'createIntegrationEnvironmentDescriptor is obsolete');
    }
    if (this.elem.lateElementDescriptors) {
      console.error(this.elem.constructor.name, 'has to move lateElementDescriptors to actualElementDescriptors')
      return new lib.Error('IMPLEMENTATION_OBSOLETE', 'lateElementDescriptors is obsolete');
    }
  };
  LoadEnvironmentAndElementsJobCore.prototype.getEnvironmentDescriptor = function () {
    return this.elem[this.environmentDescriptorMethodName](this.elem.myNameOnMasterEnvironment());
  };
  LoadEnvironmentAndElementsJobCore.prototype.onEnvironmentDescriptor = function (envdesc) {
    this.envDesc = envdesc ? new DescriptorHandler(envdesc) : null;
  };
  LoadEnvironmentAndElementsJobCore.prototype.createEnvironment = function () {
    if (!this.envDesc) {
      return null;
    }
    return this.envDesc.load();
  };
  LoadEnvironmentAndElementsJobCore.prototype.onEnvironment = function (env) {
    this.envAndElements.envLoader = env;
  };
  LoadEnvironmentAndElementsJobCore.prototype.getElementDescriptors = function () {
    return this.elem[this.elementDescriptorsMethodName]();
  };
  LoadEnvironmentAndElementsJobCore.prototype.onElementDescriptors = function (elemdescs) {
    this.elemDescs = elemdescs;
  };
  LoadEnvironmentAndElementsJobCore.prototype.createElements = function () {
    if (!lib.isArray(this.elemDescs)) {
      return [];
    }
    return q.all(this.elemDescs.map(this.createOneElement.bind(this)));
  };
  LoadEnvironmentAndElementsJobCore.prototype.onElements = function (elems) {
    this.envAndElements.elements = elems;
  };
  LoadEnvironmentAndElementsJobCore.prototype.finalize = function () {
    this.elem.loadedEnvironmentAndElements[this.loadedEnvironmentAndElementsPropertyName] = this.envAndElements;
  };

  LoadEnvironmentAndElementsJobCore.prototype.steps = [
    'init',
    'getEnvironmentDescriptor',
    'onEnvironmentDescriptor',
    'createEnvironment',
    'onEnvironment',
    'getElementDescriptors',
    'onElementDescriptors',
    'createElements',
    'onElements',
    'finalize'
  ];
  LoadEnvironmentAndElementsJobCore.prototype.createOneElement = function (elemdesc) {
    var elem = this.elem.createElement(elemdesc), d = q.defer(), ret = d.promise;
    if (elemdesc && elemdesc.options && elemdesc.options.actual) {
      elem.loadEvent.attachForSingleShot(elemLoaded.bind(null, d));
      d = null;
      return ret;
    }
    d.resolve(elem);
    return ret;
  };
  function elemLoaded (defer, elem) {
    defer.resolve(elem);
  }

  function LoadStaticEnvironmentAndElementsJobCore (elem) {
    LoadEnvironmentAndElementsJobCore.call(this, elem);
  }
  lib.inherit(LoadStaticEnvironmentAndElementsJobCore, LoadEnvironmentAndElementsJobCore);
  LoadStaticEnvironmentAndElementsJobCore.prototype.environmentDescriptorMethodName = 'staticEnvironmentDescriptor';
  LoadStaticEnvironmentAndElementsJobCore.prototype.elementDescriptorsMethodName = 'staticElementDescriptors';
  LoadStaticEnvironmentAndElementsJobCore.prototype.loadedEnvironmentAndElementsPropertyName = 'static';
  
  function LoadStaticEnvironmentAndElementsJob (elem, defer) {
    SteppedJobOnSteppedInstance.call(this, new LoadStaticEnvironmentAndElementsJobCore(elem), defer);
  }
  lib.inherit(LoadStaticEnvironmentAndElementsJob, SteppedJobOnSteppedInstance);
  mylib.LoadStaticEnvironmentAndElements = LoadStaticEnvironmentAndElementsJob;

  function LoadActualEnvironmentAndElementsJobCore (elem) {
    LoadEnvironmentAndElementsJobCore.call(this, elem);
  }
  lib.inherit(LoadActualEnvironmentAndElementsJobCore, LoadEnvironmentAndElementsJobCore);
  LoadActualEnvironmentAndElementsJobCore.prototype.environmentDescriptorMethodName = 'actualEnvironmentDescriptor';
  LoadActualEnvironmentAndElementsJobCore.prototype.elementDescriptorsMethodName = 'actualElementDescriptors';
  LoadActualEnvironmentAndElementsJobCore.prototype.loadedEnvironmentAndElementsPropertyName = 'dynamic';

  function LoadActualEnvironmentAndElementsJob (elem, defer) {
    SteppedJobOnSteppedInstance.call(this, new LoadActualEnvironmentAndElementsJobCore(elem), defer);
  }
  lib.inherit(LoadActualEnvironmentAndElementsJob, SteppedJobOnSteppedInstance);
  mylib.LoadActualEnvironmentAndElements = LoadActualEnvironmentAndElementsJob;
}
module.exports = createEnvironmentAndElementsFunctionality;
},{}],23:[function(require,module,exports){
function createElementJobs (lib, Resources, DescriptorHandler) {
  'use strict';

  var JobOnDestroyable = lib.qlib.JobOnDestroyable;

  var ret = {};

  require('./environmentandelementscreator')(lib, DescriptorHandler, ret);
  require('./elementloadercreator')(lib, JobOnDestroyable, Resources, DescriptorHandler, ret);
  require('./elementunloadercreator')(lib, JobOnDestroyable, Resources, ret);

  return ret;
}

module.exports = createElementJobs;

},{"./elementloadercreator":20,"./elementunloadercreator":21,"./environmentandelementscreator":22}],24:[function(require,module,exports){
function libCreator (execlib, Linker, Hierarchy, environmentlib, bufferableeventlib, datafilterslib) {
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
    mixins = require('./mixins')(lib),
    BasicParent = require('./abstractions/basicparentcreator')(lib, Hierarchy, bufferableeventlib),
    DescriptorHandler = require('./descriptorhandlercreator')(lib, mixins, RESULT),
    Resources = require('./resources')(lib),
    misc = require('./misc')(lib),
    Modifier = require('./modifiers')(execlib, mixins, misc),
    preProcessingRegistryLib = require('./preprocessingregistry')(lib, mixins),
    PreProcessors = preProcessingRegistryLib.PreProcessors,
    PrePreProcessors = preProcessingRegistryLib.PrePreProcessors,
    Elements = require('./elements')(lib, Hierarchy, BasicParent, Linker, Resources, Modifier.executeModifiers, mixins, PrePreProcessors, PreProcessors, DescriptorHandler),
    datamixins_ignored = require('./datamixins')(lib, Elements, datafilterslib, mixins),
    App = require('./app')(lib, execlib.dataSuite, Elements, Hierarchy, Resources, BasicParent, environmentlib, Linker, Elements.BasicElement, Modifier.executeModifiers, PrePreProcessors, PreProcessors),
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

  RESULT.mixins = mixins;
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

  RESULT.BasicProcessor.prototype.firePreprocessor = function (name, config, desc) {
    preProcessingRegistryLib._doProcess(PreProcessors, desc, config, name);
  };
  RESULT.BasicProcessor.prototype.firePrePreprocessor = function (name, config, desc) {
    preProcessingRegistryLib._doProcess(PrePreProcessors, desc, config, name);
  };

  return RESULT;
}

module.exports = libCreator;

},{"./abstractions/basicparentcreator":1,"./app":6,"./datamixins":15,"./descriptorapi":16,"./descriptorhandlercreator":17,"./elements":19,"./misc":25,"./mixins":28,"./modifiers":31,"./preprocessingregistry":34,"./preprocessors":41,"./resources":42}],25:[function(require,module,exports){
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

},{}],26:[function(require,module,exports){
function createChildActualizerMixin (lib, mylib) {
  'use strict';

  function ChildActualizerMixin () {
    this.actualchildren = null;
  }
  ChildActualizerMixin.prototype.destroy = function () {
    this.actualchildren = null;
  };
  ChildActualizerMixin.prototype.set_actualchildren = function (val) {
    this.actualchildren = val;
    traverseChildrenForActual.call(this, actualizer.bind(null, val));
  };
  ChildActualizerMixin.prototype.initChildActualizer = function () {
    var initiallyactual = this.getConfigVal('initiallyactualchildren');
    traverseChildrenForActual.call(this, actualizer.bind(null, initiallyactual));
    initiallyactual = null;
  };

  ChildActualizerMixin.addMethods = function (klass) {
    lib.inheritMethods(klass, ChildActualizerMixin
      ,'set_actualchildren'
      ,'initChildActualizer'
    );
    klass.prototype.postInitializationMethodNames = klass.prototype.postInitializationMethodNames.concat(['initChildActualizer']);
  };

  //statics
  function initiallySetActualChildren (initact) {
  }

  function traverseChildrenForActual (cb) {
    var chsforact;
    if (!lib.isFunction(cb)) {
      return;
    }
    chsforact = this.getConfigVal('childrenforactualization');
    if (lib.isString(chsforact)) {
      cbTraverserForElementName.call(this, cb, elname);
      cb = null;
      return;
    }
    if (lib.isArray(chsforact)) {
      chsforact.forEach(cbTraverserForElementName.bind(this, cb));
      cb = null;
      return;
    }
    if (this.__children) {
      this.__children.traverse(cbTraverserForElement.bind(this, cb));
      cb = null;
      return;
    }
  }

  function cbTraverserForElementName (cb, elname) {
    var el;
    try {
      el = this.getElement(elname); 
    } catch(e) { return; }
    if (!el) {
      return;
    }
    cbTraverserForElement(cb, el);
  }
  //endof statics

  //locals
  function cbTraverserForElement (cb, el) {
    cb(el);
  }
  function actualizer (shouldbeactual, el) {
    if (lib.isString(shouldbeactual)) {
      el.set('actual', el.id === shouldbeactual);
      return;
    }
    if (lib.isArray(shouldbeactual)) {
      el.set('actual', shouldbeactual.indexOf(el.id)>=0);
      return;
    }
    el.set('actual', false);
  }
  //endof locals

  mylib.ChildActualizer = ChildActualizerMixin;
}
module.exports = createChildActualizerMixin;

},{}],27:[function(require,module,exports){
function createFormMixin (lib, mylib) {
  'use strict';

  function FormMixin (options) {
    this.$form = null;
    this.change = this.createBufferableHookCollection(); //new lib.HookCollection();
    this.submit = this.createBufferableHookCollection(); //new lib.HookCollection();
    this.partialSubmit = this.createBufferableHookCollection(); //new lib.HookCollection();
    this.valid = null;
    this.validfields = {}; 
    this.initial = options ? options.initial : null;
    this.ftion_status = null;
    this.progress = null;
    this.array_keys = options ? options.array_keys : null;
    this._default_values = {};
  }
  FormMixin.prototype.destroy = function () {
    this._default_values = null;
    this.array_keys = null;
    this.progress = null;
    this.ftion_status = null;
    this.initial = null;
    this.validfields = null;
    this.valid = false;
    if (this.partialSubmit) {
      this.partialSubmit.destroy();
    }
    this.partialSubmit = null;
    if (this.submit) {
      this.submit.destroy();
    }
    this.submit = null;
    if (this.change) {
      this.change.destroy();
    }
    this.change = null;
    this.$form = null;
  };
  FormMixin.prototype._setInitial = function (ext) {
    this.set('data', lib.extend ({}, this.initial, ext));
    for (var i in this.initial) {
      this.change.fire(i, this.initial[i]);
    }
  };
  FormMixin.prototype._onChanged = function (data, field, name) {
    this.changed.fire('data', data);
    this.change.fire(field, name);
  };
  FormMixin.prototype.resetElement = function (ext) {
    BasicAngularElement.prototype.resetElement.call(this, ext);
    this.resetForm(ext);
  };
  FormMixin.prototype.resetForm = function (ext) {
    this._setInitial(ext);
  };
  FormMixin.prototype.set_valid = function (val) {
    if (this.valid === val) return false;
    this.valid = val;
    return true;
  };

  FormMixin.prototype.set_ftion_status = function (val) {
    var was_active = false, closeOnSuccess;
    if (val) {
      if (this.ftion_status) {
        was_active = this.ftion_status.working && val.result;
      }else{
        if (val.result){
          was_active = true;
        }
      }
    }
    this.ftion_status = val;
    closeOnSuccess = this.getConfigVal('closeOnSuccess');
    //console.log('was active?', was_active, closeOnSuccess);

    if (/*this.isScopeReady() &&*/ was_active) {
      if (true === closeOnSuccess || lib.isNumber(closeOnSuccess)){
        this.doCloseOnSuccess(closeOnSuccess);
      }
      if (this.getConfigVal('clearOnSuccess')){
        this.set('data', null);
      }
    }
    return true;
  };
  FormMixin.prototype.doCloseOnSuccess = function (val) {
    if (true === val) val = 0;
    lib.runNext (this.set.bind(this, 'actual', false), val);
  };
  FormMixin.prototype.set_progress = function (val) {
    this.progress = val;
    return true;
  };
  FormMixin.prototype.set_actual = function (val) {
    //reset ftion_status and progress on any change of actual
    this.set('ftion_status', null);
    this.set('progress', null);
  };
  FormMixin.prototype.initialize = function () {
    this.appendHiddenFields(this.getConfigVal('hidden_fields'));
    this.appendSyntheticFields(this.getConfigVal('synthetic_fields'));
    this.traverseFormFields(this._prepareField.bind(this));
  };
  FormMixin.prototype.empty = function () {
    this.set('data', {});
  };
  FormMixin.prototype.traverseFormFields = function (func) {
  };
  FormMixin.prototype.appendHiddenFields = function (fields) {
    if (!lib.isArray(fields) || !fields.length) return;
    fields.forEach (this._appendHiddenField.bind(this));
  };
  FormMixin.prototype._appendHiddenField = function (fieldname_or_record) {
  };
  FormMixin.prototype.appendSyntheticFields = function (fields) {
    if (!lib.isArray(fields) || !fields.length) return;
    fields.forEach (this._appendSyntheticField.bind(this));
  };
  FormMixin.prototype._appendSyntheticField = function (fieldname_or_record) {
  };
  FormMixin.prototype._prepareField = function (fieldel) {
  };
  FormMixin.prototype.findByFieldName = function (name) {
  };
  FormMixin.prototype.toArray = function (keys) {
    return lib.hashToArray(keys, this.get('data'));
  };
  FormMixin.prototype.fireSubmit = function () {
    this.submit.fire(this.dataForFireSubmit());
  };
  FormMixin.prototype.dataForFireSubmit = function () {
    return this.array_keys ? this.toArray(this.array_keys) : this.get('data');
  };
  FormMixin.prototype.firePartialSubmit = function (field) {
    if (!this.isFieldValid(field)) return;
    this.partialSubmit.fire (field, this.data ? this.data[field] : null);
  };
  FormMixin.prototype.isFieldValid = function (field) {
    return true;
  };
  FormMixin.prototype.isFormValid = function () {
    for (var i in this.validfields) {
      if (!this.isFieldValid(i)) return false;
    }
    return true;
  };
  FormMixin.prototype.setInputEnabled = function (fieldname, enabled) {
  };
  FormMixin.prototype.disableInput = function (fieldname) {
    this.setInputEnabled(fieldname, false);
  };
  FormMixin.prototype.enableInput = function (fieldname) {
    this.setInputEnabled(fieldname, true);
  };


  function setDefaultVals (data, value, key) {
    if (key in data) return;
    data[key] = value;
  }
  FormMixin.prototype.fillObjectWithDefaultValues = function (obj) {
    var _o = obj;
    lib.traverseShallow (this._default_values, setDefaultVals.bind(null, _o));
    _o = null;
  };


  FormMixin.addMethods = function (klass) {
    lib.inheritMethods(klass, FormMixin
      ,'_setInitial'
      ,'_onChanged'
      ,'resetElement'
      ,'resetForm'
      ,'set_valid'
      ,'set_ftion_status'
      ,'doCloseOnSuccess'
      ,'set_progress'
      ,'empty'
      ,'traverseFormFields'
      ,'appendHiddenFields'
      ,'_appendHiddenField'
      ,'appendSyntheticFields'
      ,'_appendSyntheticField'
      ,'_prepareField'
      ,'findByFieldName'
      ,'toArray'
      ,'fireSubmit'
      ,'dataForFireSubmit'
      ,'firePartialSubmit'
      ,'isFieldValid'
      ,'isFormValid'
      ,'setInputEnabled'
      ,'disableInput'
      ,'enableInput'
    );
    // methods that need to be called directly, no inherit:
    // set_actual
    // set_progress
    // initialize
    // fillObjectWithDefaultValues
  };

  mylib.FormMixin = FormMixin;
}
module.exports = createFormMixin;

},{}],28:[function(require,module,exports){
function createMixins (lib) {
  'use strict';

  var ret = {};
  require('./linksandlogicdestroyablecreator')(lib, ret);
  require('./neededconfigurationnamescreator')(lib, ret);

  require('./childactualizercreator')(lib, ret);
  require('./formcreator')(lib, ret);
  return ret;
}

module.exports = createMixins;

},{"./childactualizercreator":26,"./formcreator":27,"./linksandlogicdestroyablecreator":29,"./neededconfigurationnamescreator":30}],29:[function(require,module,exports){
function createLinksAndLogicDestroyableMixin (lib, mylib) {
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
    this.destroyArrayOfLinks(this.linksFromLinking);
    this.linksFromLinking = null;
    this.destroyArrayOfLogic(this.logicFromLinking);
    this.logicFromLinking = null;
  };
  /**
   * @function
   * @param {Array} links An Array of created Link objects
   */
  LinksAndLogicDestroyableMixin.prototype.setLinks = function (links) {
    this.destroyArrayOfLinks(this.linksFromLinking);
    this.linksFromLinking = links;
    return q(links);
  };
  /**
   * @function
   * @param {Array} links An Array of created Logic objects
   */
  LinksAndLogicDestroyableMixin.prototype.setLogic = function (logic) {
    this.destroyArrayOfLogic(this.logicFromLinking);
    this.logicFromLinking = logic;
    return q(logic);
  };
  /**
   * @function
   * @param {Array} links An Array of created Link objects
   */
  LinksAndLogicDestroyableMixin.prototype.destroyArrayOfLinks = function (links) {
    if (lib.isArray(links)) {
      links.forEach(destroyLink);
    }
  };
  LinksAndLogicDestroyableMixin.prototype.destroyArrayOfLogic = function (logics) {
    if (lib.isArray(logics)) {
      logics.forEach(destroyLogic);
    }
  };


  LinksAndLogicDestroyableMixin.addMethods = function (klass) {
    lib.inheritMethods(klass, LinksAndLogicDestroyableMixin
      ,'setLinks'
      ,'setLogic'
      ,'destroyArrayOfLinks'
      ,'destroyArrayOfLogic'
    );
  };


  function destroyLink (link) {
    console.log('should destroy link', link);
  }

  /** 
   * @function
   * @alias LinksAndLogicDestroyableMixin~destroyLogic
   */
  function destroyLogic (logic) {
    //console.log('should destroy logic', logic);
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
  mylib.LinksAndLogicDestroyableMixin = LinksAndLogicDestroyableMixin;
}

module.exports = createLinksAndLogicDestroyableMixin;

},{}],30:[function(require,module,exports){
function createNeededConfigurationNamesMixin (lib, mylib) {
  'use strict';

  function NeededConfigurationNamesMixin () {
  }
  NeededConfigurationNamesMixin.prototype.destroy = lib.dummyFunc;
  NeededConfigurationNamesMixin.prototype.checkNeededConfigurationNames = function (config) {
    if (this.neededConfigurationNames) {
      if (lib.isArray(config)) {
        config.forEach(checkNeededConfigurationNames.bind(null, this.constructor.name, this.neededConfigurationNames));
      } else {
        checkNeededConfigurationNames(this.constructor.name, this.neededConfigurationNames, config);
      }
    }
  };
  NeededConfigurationNamesMixin.addMethods = function (klass) {
    lib.inheritMethods(klass, NeededConfigurationNamesMixin,
      'checkNeededConfigurationNames'
    );
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

  mylib.NeededConfigurationNamesMixin = NeededConfigurationNamesMixin;
}

module.exports = createNeededConfigurationNamesMixin;

},{}],31:[function(require,module,exports){
function createModifiers (execlib, mixins, misc) {
  'use strict';

  var lib = execlib.lib, 
    modifiers = new lib.Map (),
    Configurable = lib.Configurable,
    NeededConfigurationNamesMixin = mixins.NeededConfigurationNamesMixin;

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
   * Optionally, you may set the `ALLOWED_ON` property of your class (static),
   * to specify the names of Element types 
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
    NeededConfigurationNamesMixin.call(this);
    this.checkNeededConfigurationNames(options);
  }
  lib.inherit (BasicModifier, Configurable);
  NeededConfigurationNamesMixin.addMethods(BasicModifier);

  BasicModifier.prototype.destroy = function () {
    NeededConfigurationNamesMixin.prototype.destroy.call(this);
    Configurable.prototype.destroy.call(this);
  };

  BasicModifier.prototype.processAppDescriptor = function (element) {
    this.doProcess(element.name, element, element.links, element.logic, element.resources);
  };

  BasicModifier.prototype.processElementDescriptor = function (element) {
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

  function executeModifier (iselementdescriptor, name, options, element) {
    var ctor = modifiers.get(name);
    if (!ctor) throw new Error('Failed to load modifier: '+name);

    if (ctor.ALLOWED_ON && ctor.ALLOWED_ON.indexOf(element.type) < 0) throw new Error ('Not allowed on '+element.type);

    var instance = new ctor (options);

    iselementdescriptor ? instance.processElementDescriptor(element) : instance.processAppDescriptor(element);
    instance.destroy();
    instance = null;
  }

  function executeModifiers (iselementdescriptor, element) {
    if (!lib.isBoolean(iselementdescriptor)) {
      throw new Error('first parameter of executeModifiers has to be a boolean (iselementdescriptor)');
    }
    if (!element.modifiers) return;

    misc.initAll(element);

    for (var i = 0; i < element.modifiers.length; i++){
      if (lib.isString(element.modifiers[i])) {
        executeModifier (iselementdescriptor, element.modifiers[i], null, element);
      }else{
        executeModifier (iselementdescriptor, element.modifiers[i].name, element.modifiers[i].options, element);
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

},{}],32:[function(require,module,exports){
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

},{}],33:[function(require,module,exports){
function createPreProcessingRegistry (lib, NeededConfigurationNamesMixin) {
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
    NeededConfigurationNamesMixin.call(this);
    this.config = null;
  } 
  NeededConfigurationNamesMixin.addMethods(BasicProcessor);
  BasicProcessor.prototype.destroy = function () {
    this.config = null;
    NeededConfigurationNamesMixin.prototype.destroy.call(this);
  };
  /**
   * @function 
   * @abstract
   * @param {Object} desc The App/Element descriptor to be processed
   */
  BasicProcessor.prototype.process = function (desc) {
    throw new Error('Not implemented');
  };
  /**
   * @function 
   * @param {String} name The name of the registered Preprocessor
   * @param {Object} config The config for the PreProcessor registered by `name`
   * @param {Object} desc The App/Element descriptor to be processed
   */
  BasicProcessor.prototype.firePreprocessor = null;
  /**
   * @function 
   * @param {String} name The name of the registered PrePreprocessor
   * @param {Object} config The config for the PrePreProcessor registered by `name`
   * @param {Object} desc The App/Element descriptor to be processed
   */
  BasicProcessor.prototype.firePrePreprocessor = null;


  /**
   * @function
   * @param {Object} config The configuration object - obtained from the descriptor 
   * that is to be `process`ed.
   *
   * This method is called internally, during the process of building the App
   * from the descriptor.
   */
  BasicProcessor.prototype.configure = function (config) {
    this.checkNeededConfigurationNames(config);
    this.config = config;
  };

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

    //console.log(this.constructor.name, 'add', name);
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
    BasicProcessor: BasicProcessor,
    _doProcess: _doProcess
  };
}

module.exports = createPreProcessingRegistry;

},{}],34:[function(require,module,exports){
function createPreProcessingRegistries (lib, mixins) {
  'use strict';

  var plib = require('./basecreator')(lib, mixins.NeededConfigurationNamesMixin),
    BasicProcessor = plib.BasicProcessor,
    RegistryBase = plib.PreProcessingRegistry;

  return {
    _doProcess: plib._doProcess,
    BasicProcessor: BasicProcessor,
    PreProcessors: require('./preprocessingregistrycreator.js')(lib, plib.PreProcessingRegistryBase),
    PrePreProcessors: require('./prepreprocessingregistrycreator')(lib, plib.PreProcessingRegistryBase)
  };
}

module.exports = createPreProcessingRegistries;

},{"./basecreator":33,"./prepreprocessingregistrycreator":35,"./preprocessingregistrycreator.js":36}],35:[function(require,module,exports){
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
   * @augments allex_applib.PreProcessingRegistryBase
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

},{}],36:[function(require,module,exports){
function createPreProcessor (lib, PreProcessingRegistryBase) {
  'use strict';

  /**
   * @class
   * @memberof allex_applib
   * @augments allex_applib.PreProcessingRegistryBase
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

},{}],37:[function(require,module,exports){
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

},{}],38:[function(require,module,exports){
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

},{}],39:[function(require,module,exports){
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

},{}],40:[function(require,module,exports){
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
    if (!targetenv.options) {
      targetenv.options = {};
    }
    if (!lib.isArray(targetenv.options[pp.environmentOptionsTarget])) {
      targetenv.options[pp.environmentOptionsTarget] = [];
    }
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
    }, conf.app_options);
    appobj[destdesc.objdest] = conf.entity.name;
    if (!lib.isArray(desc[destdesc.dest])) {
      desc[destdesc.dest] = [];
    }
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

},{}],41:[function(require,module,exports){
function createPreProcessors (lib, preprocessingregistrylib, descriptorApi) {
  'use strict';

  var EnvironmentHelperPreprocessor = require('./environmenthelpercreator')(lib, preprocessingregistrylib, descriptorApi);

  require('./datasourcecreator')(lib, preprocessingregistrylib, EnvironmentHelperPreprocessor);
  require('./datacommandcreator')(lib, preprocessingregistrylib, EnvironmentHelperPreprocessor);
  require('./commandcreator')(lib, preprocessingregistrylib, EnvironmentHelperPreprocessor);

}

module.exports = createPreProcessors;

},{"./commandcreator":37,"./datacommandcreator":38,"./datasourcecreator":39,"./environmenthelpercreator":40}],42:[function(require,module,exports){
function createResourcesModule (lib) {
  var q = lib.q,
    ResourceTypeRegistry = new lib.Map (),
    ResourceRegistry = new lib.DIContainer (),
    ResourceParams = new lib.Map ();

  function resourceFactory (app, desc) {
    var ctor, instance, promise;
    console.log('creating Resource', desc.name||desc.type, 'with options', desc.options);
    ctor = ResourceTypeRegistry.get(desc.type);
    if (!lib.isFunction(ctor)) return q.reject(new Error('Unable to find resource type '+desc.type));
    instance = new ctor(desc.options, app);
    promise = instance._load(desc.lazy);
    ResourceRegistry.register (desc.name||desc.type, {instance: instance, promise : promise});
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

  function afterWait (item) {
    return q(item ? (item.instance || null) : null);
  }
  function waitForResource (name) {
    return ResourceRegistry.waitFor(name).then(afterWait);
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
    waitForResource: waitForResource,
    destroyResource : destroyResource,
    BasicResourceLoader : BasicResourceLoader,
    traverseResources : ResourceRegistry.traverse.bind(ResourceRegistry),
    traverseResourceParams : ResourceParams.traverse.bind(ResourceParams)
  }
}

module.exports = createResourcesModule;

},{}]},{},[10]);
