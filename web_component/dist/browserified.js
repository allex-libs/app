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
function createApp (lib, dataSuite, Elements, Hierarchy, Resources, BasicParent, environtmentFactory, Linker, BasicElement, executeModifiers, PrePreProcessor, PreProcessor, descriptorapi, arryopslib){
  'use strict';

  var q = lib.q,
    qlib = lib.qlib,
    joblib = require('./jobs')(lib, dataSuite, Resources, environtmentFactory, BasicElement, executeModifiers, descriptorapi, arryopslib);

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
    this.environments = new lib.ListenableMap();
    this.datasources = new lib.Map();
    this.commands = new lib.Map();
    this.elements = new lib.Map ();
    this._link = new Linker.LinkingEnvironment(this);
    this.isReady = false;
    this.ready = new lib.HookCollection();
  }

  App.prototype.destroy = function () {
    if (this.ready) {
      this.ready.destroy();
    }
    this.ready = null;
    if (this._link) {
      this._link.destroy();
    }
    this._link = null;
    if (this.elements) {
      lib.containerDestroyAll(this.elements);
      this.elements.destroy();
    }
    this.elements = null;
    if (this.commands) {
      lib.containerDestroyAll(this.commands);
      this.commands.destroy();
    }
    this.commands = null;
    if(this.datasources) {
      lib.containerDestroyAll(this.datasources);
      this.datasources.destroy();
    }
    this.datasources = null;
    if (this.environments) {
      lib.containerDestroyAll(this.environments);
      this.environments.destroy();
    }
    this.environments = null;
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
    return (new joblib.DescriptorLoaderJob(deschandler, this)).go().then(null, function (reason) {console.error(reason); throw reason});
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

},{"./jobs":17}],3:[function(require,module,exports){
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
    //lib.qlib.promise2console(ret, this.command+'('+JSON.stringify(args)+')');
    args = null;
    return ret;
  };
      
  function executeOnTarget (args, target) {
    //var target = this.environment.commands.get(this.command);
    if (!target) {
      throw new Error('No target');
    }
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
    subsource.set('data', val ? val[subsourcename] : null);
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
function createAppLib (lib, dataSuite, Elements, Hierarchy, Resources, BasicParent, EnvironmentFactoryPromise, Linker, BasicElement, executeModifiers, PrePreProcessor, PreProcessor, descriptorapi, arryopslib) {
  'use strict';
  return require('./appcreator')(lib, dataSuite, Elements, Hierarchy, Resources, BasicParent, EnvironmentFactoryPromise, Linker, BasicElement, executeModifiers, PrePreProcessor, PreProcessor, descriptorapi, arryopslib);
}

module.exports = createAppLib;

},{"./appcreator":2}],7:[function(require,module,exports){
function createAppJobCore (lib) {
  'use strict';

  function AppJobCore (app) {
    this.app = app;
  }
  AppJobCore.prototype.destroy = function () {
    this.app = null;
  };
  AppJobCore.prototype.shouldContinue = function () {
    if (!this.app) {
      return new lib.Error('ALREADY_DESTROYED', 'This instance of'+this.constructor.name+' is already destroyed');
    }
    if (!this.app.environments) {
      return new lib.Error('APP_ALREADY_DESTROYED', 'App '+this.app.constructor.name+' is already destroyed');
    }
  };

  return AppJobCore;
}
module.exports = createAppJobCore;
},{}],8:[function(require,module,exports){
function createAppJob (lib) {
  'use strict';

  var JobOnDestroyableBase = lib.qlib.JobOnDestroyableBase;

  function AppJob (app, defer) {
    JobOnDestroyableBase.call(this, app, defer);
  }
  lib.inherit(AppJob, JobOnDestroyableBase);
  AppJob.prototype.destroy = function () {
    JobOnDestroyableBase.prototype.destroy.call(this);
  };
  AppJob.prototype._destroyableOk = function () {
    return this.destroyable && this.destroyable.environments;
  };

  return AppJob;
}

module.exports = createAppJob;

},{}],9:[function(require,module,exports){
function createBaseDescriptorArrayProcessingCore (lib, mylib) {
  'use strict';

  var q = lib.q,
    qlib = lib.qlib;

  function DescriptorArrayJobCore (descriptorloaderjobcore, arrayname) {
    this.descriptorLoaderJobCore = descriptorloaderjobcore;
    this.arrayName = arrayname;
    this.index = -1;
    this.results = [];
  }
  DescriptorArrayJobCore.prototype.destroy = function () {
    this.results = null;
    this.index = null;
    this.arrayName = null;
    this.descriptorLoaderJobCore = null;
  };
  DescriptorArrayJobCore.prototype.shouldContinue = function () {
    if (!this.descriptorLoaderJobCore) {
      return new lib.Error('ALREADY_DESTROYED', 'This instance of '+this.constructor.name+' is already destroyed');
    }
    if (!this.descriptorLoaderJobCore.descriptor) {
      return new lib.Error('INVALID_DESCRIPTOR_LOADER_JOB_CORE', 'This instance of '+this.constructor.name+' needs a valid DescriptorLoaderJobCore, but this one does not have a descriptor');
    }
    return this.descriptorLoaderJobCore.shouldContinue();
  };
  DescriptorArrayJobCore.prototype.app = function () {
    return this.descriptorLoaderJobCore.app;
  };
  DescriptorArrayJobCore.prototype.descriptor = function () {
    return this.descriptorLoaderJobCore.descriptor;
  };
  DescriptorArrayJobCore.prototype.array = function () {
    return this.descriptor()[this.arrayName];
  };
  DescriptorArrayJobCore.prototype.stepOne = function (prevres) {
    var arry = this.array(), oneres;
    if (!lib.isArray(arry)) {
      return [];
    }
    if (this.parallel) {
      return this.goParallel(arry);
    }
    if (this.index >= 0) {
      this.onItem(prevres);
    }
    this.index ++;
    if (this.index >= arry.length) {
      return this.results;
    }
    oneres = this.doOneItem(arry[this.index]);
    if (q.isThenable(oneres)) {
      return oneres.then(this.stepOne.bind(this));
    }
    return this.stepOne(oneres);
  };
  DescriptorArrayJobCore.prototype.doOneItem = function (item) {
    throw new lib.Error('NOT_IMPLEMENTED', this.constructor.name+' has to implement doOneItem');
  };
  DescriptorArrayJobCore.prototype.onItem = function (item) {
    this.results.push(item);
  };
  DescriptorArrayJobCore.prototype.steps = [
    'stepOne'
  ];

  DescriptorArrayJobCore.prototype.goParallel = function (arry) {
    var i, results, elem, oneres, _ress, _i, promises;
    results = [];
    _ress = results;
    promises = [];
    for (i=0; i<arry.length; i++) {
      elem = arry[i];
      oneres = this.doOneItem(elem);
      if (q.isThenable(oneres)) {
        results.push(null);
        _i = i;
        oneres.then(setter.bind(null, _ress, _i));
        promises.push(oneres);
        _i = null;
        continue;
      }
      results.push(oneres);
    }
    _ress = null;
    return promises.length>0 ? q.all(promises).then(qlib.returner(results)) : results;
  };

  function setter (results, index, result) {
    results[index] = result;
  }

  mylib.DescriptorArrayJobCore = DescriptorArrayJobCore;

  /*
  function DescriptorArrayNotifyingJobCore (descriptorloaderjobcore, arrayname) {
    DescriptorArrayJobCore.call(this, descriptorloaderjobcore, arrayname);
    this.notify = new lib.HookCollection();
  }
  lib.inherit(DescriptorArrayNotifyingJobCore, DescriptorArrayJobCore);
  DescriptorArrayNotifyingJobCore.prototype.destroy = function () {
    if (this.notify) {
      this.notify.destroy();
    }
    this.notify = null;
    DescriptorArrayJobCore.prototype.destroy.call(this);
  };
  DescriptorArrayNotifyingJobCore.prototype.onItem = function (item) {
    DescriptorArrayJobCore.prototype.onItem.call(this, item);
    this.notify.fire(item);
  };

  mylib.DescriptorArrayNotifyingJobCore = DescriptorArrayNotifyingJobCore;
  */
}
module.exports = createBaseDescriptorArrayProcessingCore;
},{}],10:[function(require,module,exports){
function createCommandsCreator (lib, dataSuite, arryopslib, mylib) {
  'use strict';

  var DescriptorArrayJobCore = mylib.DescriptorArrayJobCore,
    Command = require('../../commandcreator')(lib),
    FunctionCommand = require('../../functioncommandcreator')(lib);

  function CommandsCreatorJobCore (descriptorloaderjobcore) {
    DescriptorArrayJobCore.call(this, descriptorloaderjobcore, 'commands');
  }
  lib.inherit(CommandsCreatorJobCore, DescriptorArrayJobCore);
  CommandsCreatorJobCore.prototype.doOneItem = function (commdesc) {
    var fc = null, desc, e, c, c_name;
    if (!commdesc.command) throw new Error('No command in '+toString(commdesc));
    desc = this.descriptor();
    fc = this.app().commands.get(commdesc.command);
    if (fc) {
      return;
    }
    if (lib.isFunction(commdesc.handler)){
      return {
        desc:commdesc,
        comm: new FunctionCommand(commdesc.command, commdesc.handler),
        isfunc: true
      };
    }else{
      if (!commdesc.environment) throw new Error('No environment in '+toString(commdesc));
      e = commdesc.environment ? arryopslib.findElementWithProperty(desc.environments, 'name', commdesc.environment) : null;
      if (!e && !lib.isFunction(commdesc.handler)) throw new Error('Unable to find environment '+commdesc.environment);

      c_name = commdesc.ecommand || commdesc.command; 
      c = arryopslib.findElementWithProperty(e.options.commands, 'name', c_name);

      if (!c) {
        c = arryopslib.findElementWithProperty(e.options.datacommands, 'name', c_name);
        if (!c)
          console.warn('Unable to find command '+c_name+' in environment descriptor');
      }
      return {
        desc: commdesc,
        comm: new Command (c_name),
        isfunc: false
      };
    }
  };
  CommandsCreatorJobCore.prototype.parallel = true;

  mylib.CommandsCreatorJobCore = CommandsCreatorJobCore;
}
module.exports = createCommandsCreator;
},{"../../commandcreator":3,"../../functioncommandcreator":5}],11:[function(require,module,exports){
function createDataSourcesCreator (lib, dataSuite, arryopslib, mylib) {
  'use strict';

  var DescriptorArrayJobCore = mylib.DescriptorArrayJobCore,
    DataSource = require('../../datasourcecreator')(lib, dataSuite);

  function DataSourcesCreatorJobCore (descriptorloaderjobcore) {
    DescriptorArrayJobCore.call(this, descriptorloaderjobcore, 'datasources');
  }
  lib.inherit(DataSourcesCreatorJobCore, DescriptorArrayJobCore);
  DataSourcesCreatorJobCore.prototype.doOneItem = function (dsdesc) {
    var source_name, desc, environment, e_datasource, ds;
    if (!dsdesc.name) throw new Error ('Datasource has no name: '+toString(dsdesc));
    if (!dsdesc.environment) throw new Error('Datasource has no environment: '+toString(dsdesc));

    desc = this.descriptor();
    source_name = dsdesc.source || dsdesc.name;
    environment = arryopslib.findElementWithProperty(desc.environments, 'name', dsdesc.environment);

    if (!environment) throw new Error('Unable to find environment descriptor '+dsdesc.environment);
    e_datasource = arryopslib.findElementWithProperty(environment.options.datasources, 'name', source_name);
    if (!e_datasource) {
      e_datasource = arryopslib.findElementWithProperty(environment.options.datacommands, 'name', source_name);
      if (!e_datasource)
        console.warn('Unable to find datasource '+source_name+' within environment description');
    }

    if (this.app().datasources.get(dsdesc.name)) {
      return;
    }
    return {
      desc: dsdesc,
      ds: new DataSource(source_name, 'should_running' in dsdesc ? dsdesc.should_running : true, 'filter' in dsdesc ? dsdesc.filter : null, 'initial_value' in dsdesc ? dsdesc.initial_value : null)
    };

  };
  DataSourcesCreatorJobCore.prototype.parallel = true;

  mylib.DataSourcesCreatorJobCore = DataSourcesCreatorJobCore;
}
module.exports = createDataSourcesCreator;
},{"../../datasourcecreator":4}],12:[function(require,module,exports){
function createElementsCreator (lib, BasicElement, descriptorapi, mylib) {
  'use strict';

  var q = lib.q,
    DescriptorArrayJobCore = mylib.DescriptorArrayJobCore;

  function ElementsCreatorJobCore (descriptorloaderjobcore, creationcb) {
    DescriptorArrayJobCore.call(this, descriptorloaderjobcore, 'elements');
    this.creationCB = lib.isFunction(creationcb) ? creationcb : lib.dummyFunc;
  }
  lib.inherit(ElementsCreatorJobCore, DescriptorArrayJobCore);
  ElementsCreatorJobCore.prototype.destroy = function () {
    this.creationCB = null;
    DescriptorArrayJobCore.prototype.destroy.call(this);
  };
  ElementsCreatorJobCore.prototype.doOneItem = function (elemdesc) {
    var elem, d, ret;
    d = q.defer();
    ret = d.promise;
    elemdesc.options = elemdesc.options || {};
    descriptorapi.pushToArraySafe('onInitiallyLoaded', elemdesc.options, onLoadResolver.bind(null, d));
    descriptorapi.pushToArraySafe('onInitialized', elemdesc.options, onInitResolver.bind(null, d));
    elem = this.doCreate(elemdesc);
    d = null;
    return ret;
  };
  ElementsCreatorJobCore.prototype.doCreate = function (elemdesc) {
    var parentandfinalname, makeupdesc, createdbyparent;
    parentandfinalname = parentAndFinalNameForElementDescriptor(this.app(), elemdesc);
    if (!parentandfinalname) {
      throw new lib.Error('INVALID_ELEMENT_DESCRIPTOR', JSON.stringify(elemdesc)+' is not a valid element descriptor');
    }
    if (parentandfinalname.parent) {
      makeupdesc = lib.extend(lib.pickExcept(elemdesc, ['name']), {name: parentandfinalname.name});
      createdbyparent = parentandfinalname.parent.createElement(makeupdesc);
      this.creationCB(createdbyparent);
      return createdbyparent;
    }
    return BasicElement.createElement (elemdesc, this.creationCB);
  };


  function parentAndFinalNameForElementDescriptor (app, desc) {
    var namearry, possiblename;
    if (!desc) {
      return null;
    }
    if (!desc.name) {
      return null;
    }
    namearry = desc.name.split('.');
    if (namearry.length>1) {
      possiblename = namearry.pop();
      try {
        return {parent: app.getElement('element.'+namearry.join('.')), name: possiblename};
      }
      catch (e) {
        return {parent: null, name: desc.name};
      }
    }
    return {parent: null, name: desc.name};
  }

  function onLoadResolver (d, elem) {
    d.resolve(elem);
  }
  function onInitResolver (d, elem) {
    if (elem && elem.get('actual')) {
      return; //wait for load
    }
    d.resolve(elem);
  }

  ElementsCreatorJobCore.prototype.parallel = true;
  mylib.ElementsCreatorJobCore = ElementsCreatorJobCore;
}
module.exports = createElementsCreator;
},{}],13:[function(require,module,exports){
function createEnvironmentsCreator (lib, environmentFactory, mylib) {
  'use strict';

  var DescriptorArrayJobCore = mylib.DescriptorArrayJobCore;

  function EnvironmentsCreatorJobCore (descriptorloaderjobcore) {
    DescriptorArrayJobCore.call(this, descriptorloaderjobcore, 'environments');
  }
  lib.inherit(EnvironmentsCreatorJobCore, DescriptorArrayJobCore);
  EnvironmentsCreatorJobCore.prototype.doOneItem = function (envdesc) {
    var env, name, res = {env: null, new: false, envdesc: envdesc};
    try {
      name = envdesc.name;
      env = this.app().environments.get(name);
      if (!env) {
        console.log('createEnvironment', envdesc);
        env = environmentFactory(envdesc);
        res.env = env;
        res.new = true;
      } else {
       res.env = env;
       res.new = false;
      }
      return res;
    } catch (e) {
      console.error(e);
      throw e;
    }
  };

  mylib.EnvironmentsCreatorJobCore = EnvironmentsCreatorJobCore;
}
module.exports = createEnvironmentsCreator;
},{}],14:[function(require,module,exports){
function createDescriptorArrayProcessingCores (lib, dataSuite, Resources, environtmentFactory, BasicElement, descriptorapi, arryopslib) {
  'use strict';
  var mylib = {};

  require('./basecreator')(lib, mylib);
  require('./environmentscreatorcreator')(lib, environtmentFactory, mylib);
  require('./elementscreatorcreator')(lib, BasicElement, descriptorapi, mylib);
  require('./datasourcescreatorcreator')(lib, dataSuite, arryopslib, mylib);
  require('./commandsscreatorcreator')(lib, dataSuite, arryopslib, mylib);
  require('./resourcesloadercreator')(lib, Resources, mylib);

  return mylib;
}
module.exports = createDescriptorArrayProcessingCores;
},{"./basecreator":9,"./commandsscreatorcreator":10,"./datasourcescreatorcreator":11,"./elementscreatorcreator":12,"./environmentscreatorcreator":13,"./resourcesloadercreator":15}],15:[function(require,module,exports){
function createResourcesLoader (lib, Resources, mylib) {
  'use strict';

  var DescriptorArrayJobCore = mylib.DescriptorArrayJobCore,
    Command = require('../../commandcreator')(lib),
    FunctionCommand = require('../../functioncommandcreator')(lib);

  function ResourcesLoaderJobCore (descriptorloaderjobcore) {
    DescriptorArrayJobCore.call(this, descriptorloaderjobcore, 'resources');
  }
  lib.inherit(ResourcesLoaderJobCore, DescriptorArrayJobCore);
  ResourcesLoaderJobCore.prototype.doOneItem = function (resourcedesc) {
    return Resources.loadResourceParams(resourcedesc);
  };

  mylib.ResourcesLoaderJobCore = ResourcesLoaderJobCore;
}
module.exports = createResourcesLoader;
},{"../../commandcreator":3,"../../functioncommandcreator":5}],16:[function(require,module,exports){
function createDescriptorLoaderJob (lib, AppJobCore, descarryprocessingcoreslib, dataSuite, Resources, environmentFactory, BasicElement, executeModifiers) {
  'use strict';

  var q = lib.q,
    qlib = lib.qlib;

  var _stackDepth = 0;

  function DescriptorLoaderJobCore (descriptorhandler, app) {
    AppJobCore.call(this, app);
    this.descriptorHandler = descriptorhandler;
    this.descriptor = null;
  }
  lib.inherit(DescriptorLoaderJobCore, AppJobCore);
  DescriptorLoaderJobCore.prototype.destroy = function () {
    this.descriptor = null;
    this.descriptorHandler = null;
    AppJobCore.prototype.destroy.call(this);
  };
  DescriptorLoaderJobCore.prototype.shouldContinue = function () {
    var ret = AppJobCore.prototype.shouldContinue.call(this);
    if (ret) {
      return ret;
    }
    if (!this.descriptorHandler) {
      return new lib.Error('ALREADY_DESTROYED', 'This instance of '+this.contructor.name+' has no descriptorhandler');
    }
    if (!this.descriptorHandler.environmentNames) {
      return new lib.Error('DESCHANDLER_ALREADY_DESTROYED', 'This instance of '+this.contructor.name+' has no descriptorHandler.environmentNames');
    }
  };
  DescriptorLoaderJobCore.prototype.init = function () {
    _stackDepth ++;
    return this.descriptorHandler.descriptor;
  };
  DescriptorLoaderJobCore.prototype.onInit = function (desc) {
    this.descriptor = desc;
    if (this.descriptor) {
      executeModifiers(false, this.descriptor);
    }
  };
  DescriptorLoaderJobCore.prototype.createEnvironments = function () {
    if (!this.descriptor) {
      return;
    }
    return (qlib.newSteppedJobOnSteppedInstance(
      new descarryprocessingcoreslib.EnvironmentsCreatorJobCore(this)
    )).go();
  };
  DescriptorLoaderJobCore.prototype.onEnvironments = function (envresults) {
    if (lib.isArray(envresults)) {
      envresults.forEach(this.loadEnvironment.bind(this));
      return;
    }
  };
  DescriptorLoaderJobCore.prototype.createDataSources = function () {
    if (!this.descriptor) {
      return;
    }
    return (qlib.newSteppedJobOnSteppedInstance(
      new descarryprocessingcoreslib.DataSourcesCreatorJobCore(this)
    )).go();
  };
  DescriptorLoaderJobCore.prototype.onDataSources = function (dsresults) {
    if (lib.isArray(dsresults)) {
      dsresults.forEach(this.handleDataSource.bind(this));
    }
  };
  DescriptorLoaderJobCore.prototype.createCommands = function () {
    if (!this.descriptor) {
      return;
    }
    return (qlib.newSteppedJobOnSteppedInstance(
      new descarryprocessingcoreslib.CommandsCreatorJobCore(this)
    )).go();
  };
  DescriptorLoaderJobCore.prototype.onCommands = function (commandresults) {
    if (lib.isArray(commandresults)) {
      commandresults.forEach(this.handleCommand.bind(this));
    }
  };
  DescriptorLoaderJobCore.prototype.loadResources = function () {
    if (!this.descriptor) {
      return;
    }
    return (qlib.newSteppedJobOnSteppedInstance(
      new descarryprocessingcoreslib.ResourcesLoaderJobCore(this)
    )).go();
  };
  DescriptorLoaderJobCore.prototype.onResourcesLoaded = function (rsrcs) {
  };
  DescriptorLoaderJobCore.prototype.createElements = function () {
    if (!this.descriptor) {
      return;
    }
    return qlib.newSteppedJobOnSteppedInstance(
      new descarryprocessingcoreslib.ElementsCreatorJobCore(this, this.addElement.bind(this))
    ).go();
  };
  DescriptorLoaderJobCore.prototype.onCreateElements = function (elems) {
    var a = elems;
    /*
    if (lib.isArray(elems)) {
      elems.forEach(this.addElement.bind(this));
    }
    */
  };
  DescriptorLoaderJobCore.prototype.createLinks = function () {
    return this.app._link.produceLinks(this.descriptor.links);
  };
  DescriptorLoaderJobCore.prototype.onLinks = function (links) {
    this.descriptorHandler.setLinks(links);
  };
  DescriptorLoaderJobCore.prototype.createLogic = function () {
    return this.app._link.produceLogic(this.descriptor.logic);
  };
  DescriptorLoaderJobCore.prototype.onLogic = function (logic) {
    this.descriptorHandler.setLogic(logic);
  };
  DescriptorLoaderJobCore.prototype.finalize = function () {
    _stackDepth --;
    if (_stackDepth==0) {
      this.app.elements.traverse(unbuffer);
    }
    if (this.descriptor && lib.isFunction (this.descriptor.onLoaded)) {
      this.descriptor.onLoaded(this);
    }
    return this.descriptorHandler;
  };

  DescriptorLoaderJobCore.prototype.loadEnvironment = function (envres) {
    var name, env;
    if (!(envres && envres.envdesc && envres.env)) {return;}
    name = envres.envdesc.name;
    env = envres.env;
    if (envres.new) {
      this.app.environments.add(name, env);
      this.descriptorHandler.environmentNames.push(name);
      return;
    }
    env.addDataSources(envres.envdesc.options.datasources);
    env.addCommands(envres.envdesc.options.commands);
    env.addDataCommands(envres.envdesc.options.datacommands);
  };
  DescriptorLoaderJobCore.prototype.addElement = function (el) {
    var id = el.myNameOnMasterEnvironment(); //el.get('id');
    var check = this.app.elements.get(id);
    if (check) {
      console.log('wut?', check);
    }
    this.app.elements.add(id, el);
    this.descriptorHandler.addElementID(id);
  };
  DescriptorLoaderJob.prototype.addJustCreatedElement = function (elobj) {
    if (!(elobj && elobj.__justcreated)) {
      return;
    }
    this.addElement(elobj.__justcreated);
  }
  DescriptorLoaderJobCore.prototype.handleDataSource = function (dsresult) {
    var ds, dsdesc;
    if (!(dsresult && dsresult.desc && dsresult.ds)) {return;} //was already found in this.app.datasources
    ds = dsresult.ds;
    dsdesc = dsresult.desc;
    this.app.datasources.add(dsdesc.name, ds);
    this.descriptorHandler.dataSourceNames.push(dsdesc.name);
    this.app.environments.listenFor (dsdesc.environment, ds.set.bind(ds, 'environment'));
    ds = null;
  };
  DescriptorLoaderJobCore.prototype.handleCommand = function (commresult) {
    var commdesc, fc;
    if (!(commresult && commresult.desc && commresult.comm)) {
      return;
    }
    commdesc = commresult.desc;
    fc = commresult.comm;
    this.descriptorHandler.commandNames.push(commdesc.command);
    this.app.commands.add(commdesc.command, fc);
    this.app.environments.listenFor (commdesc.environment, fc.set.bind(fc, 'environment'));
  };
  DescriptorLoaderJobCore.prototype.handleLink = function (links) {
    this.descriptorHandler.setLinks(links);
  };

  DescriptorLoaderJobCore.prototype.steps = [
    'init',
    'onInit',
    'createEnvironments',
    'onEnvironments',
    'createDataSources',
    'onDataSources',
    'createCommands',
    'onCommands',
    'loadResources',
    'onResourcesLoaded',
    'createElements',
    'onCreateElements',
    'createLinks',
    'onLinks',
    'createLogic',
    'onLogic',
    'finalize'
  ];

  function unbuffer (el) {
    el.unbufferAllBufferableHookCollections();
  }

  function DescriptorLoaderJob (descriptorhandler, app, defer) {
    qlib.SteppedJobOnSteppedInstance.call(
      this, 
      new DescriptorLoaderJobCore(descriptorhandler, app),
      defer
    );
  }
  lib.inherit(DescriptorLoaderJob, qlib.SteppedJobOnSteppedInstance);

  return DescriptorLoaderJob;
}

module.exports = createDescriptorLoaderJob;


},{}],17:[function(require,module,exports){
function createAppJobs (lib, dataSuite, Resources, environtmentFactory, BasicElement, executeModifiers, descriptorapi, arryopslib) {
  'use strict';

  var AppJob = require('./appjobcreator')(lib),
    AppJobCore = require('./appjobcorecreator')(lib),
    descarryprocessingcoreslib = require('./descarrayprocessingcores')(lib, dataSuite, Resources, environtmentFactory, BasicElement, descriptorapi, arryopslib),
    DescriptorLoaderJob = require('./descriptorloaderjobcreator')(lib, AppJobCore, descarryprocessingcoreslib, dataSuite, Resources, environtmentFactory, BasicElement, executeModifiers);

  return {
    AppJob: AppJob,
    DescriptorLoaderJob: DescriptorLoaderJob
  };
}

module.exports = createAppJobs;

},{"./appjobcorecreator":7,"./appjobcreator":8,"./descarrayprocessingcores":14,"./descriptorloaderjobcreator":16}],18:[function(require,module,exports){
ALLEX.execSuite.libRegistry.register('allex_applib',require('./libindex')(
  ALLEX,
  ALLEX.execSuite.libRegistry.get('allex_applinkinglib'),
  ALLEX.execSuite.libRegistry.get('allex_hierarchymixinslib'),
  ALLEX.execSuite.libRegistry.get('allex_environmentlib'),
  ALLEX.execSuite.libRegistry.get('allex_bufferableeventlib'),
  ALLEX.execSuite.libRegistry.get('allex_datafilterslib'),
  ALLEX.lib.arryOperations
));
ALLEX.WEB_COMPONENTS.allex_applib = ALLEX.execSuite.libRegistry.get('allex_applib');

},{"./libindex":37}],19:[function(require,module,exports){
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
    this.__children.traverse(function (c) {
      //c.destroy();
    });
    dm = this.getConfigVal('data_markup');
    if (!dm) {
      return;
    }
    m = this.produceDataMarkup(dm, data);
    this.$element.html(m);
    this.__children.traverse(function (c) {
      c.initializeFrom({});
    });
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

},{}],20:[function(require,module,exports){
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

},{}],21:[function(require,module,exports){
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

},{}],22:[function(require,module,exports){
function createFromDataCreatorMixin (lib, elements, datafilterslib, mylib) {
  'use strict';

  var q = lib.q;

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
  FromDataCreatorMixin.prototype.allSubElementsActual = function () {
    if (!lib.isArray(this.subElements)) {
      return q(0);
    }
    return q.all(this.subElements.map(actualWaiter));
  };
  function actualWaiter (elem) {
    var listenerobj, ret;
    if (elem.get('actual')) {
      return q([]);
    }
    listenerobj = {listener: null, defer: q.defer()};
    ret = listenerobj.defer.promise;
    listenerobj.listener = elem.attachListener('changed', 'actual', onActualized.bind(null, listenerobj));
    listenerobj = null;
    return ret;
  }
  function onActualized (listenerobj, act) {
    if (act) {
      listenerobj.listener.destroy();
      listenerobj.defer.resolve(true);
    }
  }

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
      ,'allSubElementsActual'
      ,'_purgeSubElements'
    );
  };

  mylib.FromDataCreator = FromDataCreatorMixin;
}
module.exports = createFromDataCreatorMixin;

},{}],23:[function(require,module,exports){
function createDataMixins (lib, elements, datafilterslib, mixins) {
  'use strict';

  require('./dataupdatercreator')(lib, mixins);
  require('./dataelementcreator')(lib, mixins);
  require('./dataelementfollowercreator')(lib, mixins);
  require('./fromdatacreator')(lib, elements, datafilterslib, mixins);
}
module.exports = createDataMixins;

},{"./dataelementcreator":19,"./dataelementfollowercreator":20,"./dataupdatercreator":21,"./fromdatacreator":22}],24:[function(require,module,exports){
function createDescriptorApi (lib, ArryOps) {
  function pushToArraySafe (arryname, desc, element) {
    if (!lib.isString(arryname)) {
      throw new lib.Error('NOT_A_STRING', 'The first parameter has to be a string');
    }
    if (!desc) {
      throw new lib.Error('INVALID_DESCRIPTOR', 'The second parameter has to be an object');
    }
    var arry = desc[arryname];
    if (!arry) {
      arry = [];
      desc[arryname] = arry;
    }
    arry.push(element);
  }
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
    pushToArraySafe: pushToArraySafe,
    ensureDescriptorArrayElementByPropertyName: ensureDescriptorArrayElementByPropertyName, 
    ensureDescriptorArrayElementByName: ensureDescriptorArrayElementByName,
    ensureDescriptorArrayElementByType: ensureDescriptorArrayElementByType
  };
}

module.exports = createDescriptorApi;
    

},{}],25:[function(require,module,exports){
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

},{}],26:[function(require,module,exports){
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
      console.error('already dead');
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

},{"./jobcores":30,"./jobs":36}],27:[function(require,module,exports){
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

},{"./basicelementcreator.js":26}],28:[function(require,module,exports){
function createBaseBasicElementJobCore (lib, mylib) {
  'use strict';
  function BaseBasicElementJobCore (element) {
    this.element = element;
  }
  BaseBasicElementJobCore.prototype.destroy = function () {
    this.element = null;
  };
  BaseBasicElementJobCore.prototype.shouldContinue = function () {
    if (!this.element) {
      return new lib.Error('NO_ELEMENT', this.constructor.name+' cannot proceed without an Element');
    }
    if (!this.element.destroyed) {
      return new lib.Error('ELEMENT_ALREADY_DESTROYED', this.constructor.name+' cannot proceed, the Element is already destroyed');
    }
  };

  mylib.Base = BaseBasicElementJobCore;
}
module.exports = createBaseBasicElementJobCore;
},{}],29:[function(require,module,exports){
function createElementsLoaderJobCore (lib, DescriptorHandler, mylib) {
  'use strict';

  var Base = mylib.Base;

  function ELementsLoaderJobCore (element) {
    Base.call(this, element);
  }
  lib.inherit(ELementsLoaderJobCore, Base);
  ELementsLoaderJobCore.prototype.destroy = function () {
    Base.prototype.destroy.call(this);
  };

  ELementsLoaderJobCore.prototype.doLoad = function () {
    var subelems = this.element.getConfigVal('elements');
    var fullname, envdesc;
    if (!lib.isArray(subelems)) {
      return [];
    }
    fullname = this.element.myNameOnMasterEnvironment();
    envdesc = new DescriptorHandler({
      elements: subelems.map(namenormalizer.bind(null, fullname))
    });
    fullname = null;
    return envdesc.load();
  };
  ELementsLoaderJobCore.prototype.finalize = function (res) {
    return res;
  };

  ELementsLoaderJobCore.prototype.steps = [
    'doLoad',
    'finalize'
  ];

  function namenormalizer (fullname, desc) {
    var ret = lib.pickExcept(desc, ['name']);
    ret.name = fullname+'.'+desc.name;
    return ret;
  }

  mylib.ElementsLoader = ELementsLoaderJobCore;
}
module.exports = createElementsLoaderJobCore;
},{}],30:[function(require,module,exports){
function createBasicElementJobCores(lib, Resources, DescriptorHandler, Linker, jobs) {
  'use strict';
  var mylib = {};

  require('./basecreator')(lib, mylib);
  require('./elementsloadercreator')(lib, DescriptorHandler, mylib);
  require('./initializercreator')(lib, DescriptorHandler, Linker, jobs, mylib);

  require('./methodinvokercreator')(lib, mylib);

  return mylib;
}
module.exports = createBasicElementJobCores;
},{"./basecreator":28,"./elementsloadercreator":29,"./initializercreator":31,"./methodinvokercreator":32}],31:[function(require,module,exports){
function createBasicElementInitializer (lib, DescriptorHandler, Linker, jobs, mylib) {
  'use strict';
  var Base = mylib.Base;
  var qlib = lib.qlib;

  function BasicElementInitializerJobCore (element, desc) {
    Base.call(this, element);
    this.descriptor = desc;
  }
  lib.inherit(BasicElementInitializerJobCore, Base);
  BasicElementInitializerJobCore.prototype.destroy = function () {
    this.descriptor = null;
  };

  BasicElementInitializerJobCore.prototype.loadElements = function () {
    return qlib.newSteppedJobOnSteppedInstance(
      new mylib.ElementsLoader(this.element)
    ).go();
  };
  BasicElementInitializerJobCore.prototype.loadInitialEnvironment = function () {
    return (new jobs.LoadInitialEnvironment(this.element)).go();
  };
  BasicElementInitializerJobCore.prototype.loadStaticEnvironment = function () {
    return (new jobs.LoadStaticEnvironment(this.element)).go();
  };
  BasicElementInitializerJobCore.prototype.produceLinks = function () {
    this.element._link = new Linker.LinkingEnvironment(this.element);
    return (this.descriptor && lib.isArray(this.descriptor.links))
    ?
    this.element._link.produceLinks(this.descriptor.links)
    :
    null;
  };
  BasicElementInitializerJobCore.prototype.onLinks = function (links) {
    this.element.setLinks(links);
  };
  BasicElementInitializerJobCore.prototype.produceLogic = function () {
    return (this.descriptor && lib.isArray(this.descriptor.logic))
    ?
    this.element._link.produceLogic(this.descriptor.logic)
    :
    null;
  };
  BasicElementInitializerJobCore.prototype.onLogic = function (logic) {
    this.element.setLogic(logic);
  };
  BasicElementInitializerJobCore.prototype.finalize = function () {
    this.element.fireInitializationDone();
  };


  BasicElementInitializerJobCore.prototype.steps = [
    'loadElements',
    'loadInitialEnvironment',
    'loadStaticEnvironment',
    'produceLinks',
    'onLinks',
    'produceLogic',
    'onLogic',
    'finalize'
  ];

  mylib.Initializer = BasicElementInitializerJobCore;
}
module.exports = createBasicElementInitializer;
},{}],32:[function(require,module,exports){
function createMethodInvokerJobCore (lib, mylib) {
  'use strict';
  var Base = mylib.Base;

  function MethodInvokerJobCore (element, method, args) {
    Base.call(this, element);
    this.method = method;
    this.args = args;
  }
  lib.inherit(MethodInvokerJobCore, Base);
  MethodInvokerJobCore.prototype.shouldContinue = function () {
    var ret = Base.prototype.shouldContinue.call(this);
    if (ret) {
      return ret;
    }
    if (!lib.isArray(this.args)) {
      throw new lib.Error('ARGS_NOT_AN_ARRAY', this.constructor.name+' must get args as an Array');
    }
  };
  MethodInvokerJobCore.prototype.invoke = function () {
    return this.element[this.method].apply(this.element, this.args);
  };

  MethodInvokerJobCore.prototype.steps = [
    'invoke'
  ];

  mylib.MethodInvoker = MethodInvokerJobCore;
}
module.exports = createMethodInvokerJobCore;
},{}],33:[function(require,module,exports){
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
    p = q.all(promises);
    //qlib.promise2defer(p, this);
    /*
    p.then(
      this.createLateElements.bind(this),
      this.reject.bind(this)
    );
    */
    p.then(
      this.loadDynamicEnvironment.bind(this),
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

  ElementLoaderJob.prototype.loadDynamicEnvironment = function (resultuptonow) {
    if (!this.okToProceed()) {
      return;
    }
    (new mylib.LoadActualEnvironment(this.destroyable)).go().then(
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

},{}],34:[function(require,module,exports){
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
    if (this.destroyable.loadedEnvironment && this.destroyable.loadedEnvironment.dynamic) {
      this.destroyable.loadedEnvironment.dynamic.destroy();
      this.destroyable.loadedEnvironment.dynamic = null;
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
        if (this.destroyable.loadedEnvironment.dynamic) {
          this.destroyable.loadedEnvironment.dynamic.destroy();
          this.destroyable.loadedEnvironment.dynamic = null;
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

},{}],35:[function(require,module,exports){
function createEnvironmentFunctionality (lib, DescriptorHandler, mylib) {
  'use strict';

  var q = lib.q,
    qlib = lib.qlib,
    SteppedJobOnSteppedInstance = qlib.SteppedJobOnSteppedInstance;

  function LoadEnvironmentJobCore (elem) {
    this.elem = elem;
    this.envLoader = null;
    this.envDesc = null;
  }
  LoadEnvironmentJobCore.prototype.destroy = function () {
    this.envDesc = null;
    this.envLoader = null;
    this.elem = null;
  };
  LoadEnvironmentJobCore.prototype.shouldContinue = function () {
    if (this.elem && this.elem.destroyed) {
      return;
    }
    return new lib.Error('ELEMENT_DESTROYED', 'No Element to load Environment and Elements on');
  }
  LoadEnvironmentJobCore.prototype.init = function () {
    if (this.elem.createIntegrationEnvironmentDescriptor) {
      console.error(this.elem.constructor.name, 'has to move createIntegrationEnvironmentDescriptor to actualEnvironmentDescriptor')
      return new lib.Error('IMPLEMENTATION_OBSOLETE', 'createIntegrationEnvironmentDescriptor is obsolete');
    }
    if (this.elem.lateElementDescriptors) {
      console.error(this.elem.constructor.name, 'has to move lateElementDescriptors to actualElementDescriptors')
      return new lib.Error('IMPLEMENTATION_OBSOLETE', 'lateElementDescriptors is obsolete');
    }
  };
  LoadEnvironmentJobCore.prototype.getEnvironmentDescriptor = function () {
    return this.elem[this.environmentDescriptorMethodName](this.elem.myNameOnMasterEnvironment());
  };
  LoadEnvironmentJobCore.prototype.onEnvironmentDescriptor = function (envdesc) {
    this.envDesc = envdesc ? new DescriptorHandler(envdesc) : null;
  };
  LoadEnvironmentJobCore.prototype.createEnvironment = function () {
    if (!this.envDesc) {
      return null;
    }
    return this.envDesc.load();
  };
  LoadEnvironmentJobCore.prototype.onEnvironment = function (env) {
    this.envLoader = env;
  };
  LoadEnvironmentJobCore.prototype.finalize = function () {
    this.elem.loadedEnvironment[this.loadedEnvironmentPropertyName] = this.envLoader;
  };

  LoadEnvironmentJobCore.prototype.steps = [
    'init',
    'getEnvironmentDescriptor',
    'onEnvironmentDescriptor',
    'createEnvironment',
    'onEnvironment',
    'finalize'
  ];
  LoadEnvironmentJobCore.prototype.createOneElement = function (elemdesc) {
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

  function LoadInitialEnvironmentJobCore (elem) {
    LoadEnvironmentJobCore.call(this, elem);
  }
  lib.inherit(LoadInitialEnvironmentJobCore, LoadEnvironmentJobCore);
  LoadInitialEnvironmentJobCore.prototype.environmentDescriptorMethodName = 'initialEnvironmentDescriptor';
  LoadInitialEnvironmentJobCore.prototype.loadedEnvironmentPropertyName = 'initial';
  
  function LoadInitialEnvironmentJob (elem, defer) {
    SteppedJobOnSteppedInstance.call(this, new LoadInitialEnvironmentJobCore(elem), defer);
  }
  lib.inherit(LoadInitialEnvironmentJob, SteppedJobOnSteppedInstance);
  mylib.LoadInitialEnvironment = LoadInitialEnvironmentJob;

  function LoadStaticEnvironmentJobCore (elem) {
    LoadEnvironmentJobCore.call(this, elem);
  }
  lib.inherit(LoadStaticEnvironmentJobCore, LoadEnvironmentJobCore);
  LoadStaticEnvironmentJobCore.prototype.environmentDescriptorMethodName = 'staticEnvironmentDescriptor';
  LoadStaticEnvironmentJobCore.prototype.loadedEnvironmentPropertyName = 'static';
  
  function LoadStaticEnvironmentJob (elem, defer) {
    SteppedJobOnSteppedInstance.call(this, new LoadStaticEnvironmentJobCore(elem), defer);
  }
  lib.inherit(LoadStaticEnvironmentJob, SteppedJobOnSteppedInstance);
  mylib.LoadStaticEnvironment = LoadStaticEnvironmentJob;

  function LoadActualEnvironmentJobCore (elem) {
    LoadEnvironmentJobCore.call(this, elem);
  }
  lib.inherit(LoadActualEnvironmentJobCore, LoadEnvironmentJobCore);
  LoadActualEnvironmentJobCore.prototype.environmentDescriptorMethodName = 'actualEnvironmentDescriptor';
  LoadActualEnvironmentJobCore.prototype.loadedEnvironmentPropertyName = 'dynamic';

  function LoadActualEnvironmentJob (elem, defer) {
    SteppedJobOnSteppedInstance.call(this, new LoadActualEnvironmentJobCore(elem), defer);
  }
  lib.inherit(LoadActualEnvironmentJob, SteppedJobOnSteppedInstance);
  mylib.LoadActualEnvironment = LoadActualEnvironmentJob;
}
module.exports = createEnvironmentFunctionality;
},{}],36:[function(require,module,exports){
function createElementJobs (lib, Resources, DescriptorHandler) {
  'use strict';

  var JobOnDestroyable = lib.qlib.JobOnDestroyable;

  var ret = {};

  require('./environmentloadingcreator')(lib, DescriptorHandler, ret);
  require('./elementloadercreator')(lib, JobOnDestroyable, Resources, DescriptorHandler, ret);
  require('./elementunloadercreator')(lib, JobOnDestroyable, Resources, ret);

  return ret;
}

module.exports = createElementJobs;

},{"./elementloadercreator":33,"./elementunloadercreator":34,"./environmentloadingcreator":35}],37:[function(require,module,exports){
function libCreator (execlib, Linker, Hierarchy, environmentlib, bufferableeventlib, datafilterslib, arryopslib) {
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
    descriptorApi = require('./descriptorapi')(lib, arryopslib),
    Elements = require('./elements')(lib, Hierarchy, BasicParent, Linker, Resources, Modifier.executeModifiers, mixins, PrePreProcessors, PreProcessors, DescriptorHandler, descriptorApi),
    datamixins_ignored = require('./datamixins')(lib, Elements, datafilterslib, mixins),
    App = require('./app')(lib, execlib.dataSuite, Elements, Hierarchy, Resources, BasicParent, environmentlib, Linker, Elements.BasicElement, Modifier.executeModifiers, PrePreProcessors, PreProcessors, descriptorApi, arryopslib);

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
    var ret = lib.initUid().then(realbootstrap.bind(null, descriptors, deschandlers));
    descriptors = null;
    deschandlers = null;
    return ret;
  }
  function realbootstrap (descriptors, deschandlers) {
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
    return preProcessingRegistryLib._doProcess(PreProcessors, desc, config, name);
  };
  RESULT.BasicProcessor.prototype.firePrePreprocessor = function (name, config, desc) {
    return preProcessingRegistryLib._doProcess(PrePreProcessors, desc, config, name);
  };

  return RESULT;
}

module.exports = libCreator;

},{"./abstractions/basicparentcreator":1,"./app":6,"./datamixins":23,"./descriptorapi":24,"./descriptorhandlercreator":25,"./elements":27,"./misc":38,"./mixins":42,"./modifiers":45,"./preprocessingregistry":47,"./preprocessors":54,"./resources":55}],38:[function(require,module,exports){
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

},{}],39:[function(require,module,exports){
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

},{}],40:[function(require,module,exports){
function createChildrenStackMixin (lib, mylib) {
  'use strict';

  function ChildrenStackElement (actualchangecb, options, index) {
    this.actualChangeCb = actualchangecb;
    this.name = options.name;
    this.title = options.title;
    this.index = index;
    this.elem = null;
    this.elementDestroyedListener = null;
    this.elementActualChangedListener = null;
  }
  ChildrenStackElement.prototype.destroy = function () {
    this.purgeListeners();
    this.elem = null;
    this.index = null;
    this.title = null;
    this.name = null;
    this.actualChangeCb = null;
  };
  ChildrenStackElement.prototype.attachTo = function (elem) {
    if (this.elementDestroyedListener) {
      throw new lib.Error('ALREADY_LISTENING_TO_ACTUAL_CHANGE', 'There is already an elementDestroyedListener');
    }
    if (this.elementActualChangedListener) {
      throw new lib.Error('ALREADY_LISTENING_TO_ACTUAL_CHANGE', 'There is already an elementActualChangedListener');
    }
    this.elem = elem;
    this.elementDestroyedListener = elem.destroyed.attach(this.onElementDestroyed.bind(this));
    this.elementActualChangedListener = elem.attachListener('changed', 'actual', this.onElementActualChanged.bind(this));
  };
  ChildrenStackElement.prototype.onElementDestroyed = function () {
    this.purgeListeners();
  };
  ChildrenStackElement.prototype.onElementActualChanged = function (act) {
    if (lib.isFunction(this.actualChangeCb)) {
      this.actualChangeCb(this, act);
    }
  };
  ChildrenStackElement.prototype.purgeListeners = function () {
    if (this.elementActualChangedListener) {
      this.elementActualChangedListener.destroy();
    }
    this.elementActualChangedListener = null;
    if (this.elementDestroyedListener) {
      this.elementDestroyedListener.destroy();
    }
    this.elementDestroyedListener = null;
  };

  function checkChildOption (childoption) {
    if (!childoption) {
      throw new lib.Error('NO_CHILD_IN_CHILDRENSTACK_CHILDREN', 'There must be a child option in childrenstack.children');
    }
    if (!(lib.isString(childoption.name) && childoption.name)) {
      throw new lib.Error('NO_NAME_IN_CHILDRENSTACK_CHILDREN_CHILD', 'Child option in childrenstack.children must have a name (String)');
    }
    if (!(lib.isString(childoption.title) && childoption.title)) {
      throw new lib.Error('NO_TITLE_IN_CHILDRENSTACK_CHILDREN_CHILD', 'Child option in childrenstack.children must have a title (String)');
    }
  }
  function checkOptions (myoptions) {
    if (!lib.isArray(myoptions.children)) {
      throw new lib.Error('NO_CHILDREN_IN_CHILDRENSTACK');
    }
    myoptions.children.forEach(checkChildOption);
  }
  function ChildrenStackMixin (options) {
    this.childrenStackElementMap = new lib.Map();
    this.childrenStackStack = [];
    this.childrenStackTopChanged = this.createBufferableHookCollection();
    if (options && options.childrenstack) {
      checkOptions(options.childrenstack);
      options.childrenstack.children.forEach(this.addStackElement.bind(this));
    }
  }
  function destroyer (thingy) {
    thingy.destroy();
  }
  ChildrenStackMixin.prototype.destroy = function () {
    if (this.childrenStackTopChanged) {
      this.childrenStackTopChanged.destroy();
    }
    this.childrenStackTopChanged = null;
    this.childrenStackStack = null;
    if (this.childrenStackElementMap) {
      this.childrenStackElementMap.traverse(destroyer);
      this.childrenStackElementMap.destroy();
    }
    this.childrenStackElementMap = null;
  };
  ChildrenStackMixin.prototype.addStackElement = function (options, index) {
    this.childrenStackElementMap.add(
      options.name,
      new ChildrenStackElement(
        this.onStackElementActualChanged.bind(this),
        options,
        index
      )
    );
  };
  ChildrenStackMixin.prototype.popChildrenStack = function () {
    var topel = stackTop.call(this);
    if (topel) {
      topel.elem.set('actual', false);
    }
  };
  ChildrenStackMixin.prototype.onStackElementActualChanged = function (myelem, val) {
    var stack, topel;
    if (!lib.isArray(this.childrenStackStack)) {
      return;
    }
    //console.log('actual changed', myelem, val);
    stack = this.childrenStackStack;
    topel = stackTop.call(this);
    if (val) {
      if (topel == myelem) {
        this.childrenStackTopChanged.fire(myelem, stack.length);
        return;
      }
      stack.push(myelem);
      this.childrenStackTopChanged.fire(myelem, stack.length);
      if (topel) {
        topel.elem.set('actual', false);
      }
      return;
    }
    if (topel == myelem) {
      stack.pop();
      topel = stackTop.call(this);
      if (topel) {
        topel.elem.set('actual', true);
      }
    }
  };

  //statics
  function stackTop () {
    if (!lib.isArray(this.childrenStackStack)) {
      return null;
    }
    if (this.childrenStackStack.length<1) {
      return null;
    }
    return this.childrenStackStack[this.childrenStackStack.length-1];
  }
  function addChild (chld) {
    if (!this.childrenStackElementMap) {
      return;
    }
    var stackelem = this.childrenStackElementMap.get(chld.id);
    if (stackelem) {
      stackelem.attachTo(chld);
    }
  }

  //statics end

  function addChildProducer (klass) {
    return function (chld) {
      addChild.call(this, chld);
      return klass.prototype.addChild.call(this, chld);
    };
  }

  ChildrenStackMixin.addMethods = function (klass, baseklass) {
    lib.inheritMethods(klass, ChildrenStackMixin
      , 'addStackElement'
      , 'popChildrenStack'
      , 'onStackElementActualChanged'
    );
    klass.prototype.addChild = addChildProducer(baseklass);
    baseklass = null;
  };

  mylib.ChildrenStack = ChildrenStackMixin;
}
module.exports = createChildrenStackMixin;
},{}],41:[function(require,module,exports){
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

},{}],42:[function(require,module,exports){
function createMixins (lib) {
  'use strict';

  var ret = {};
  require('./linksandlogicdestroyablecreator')(lib, ret);
  require('./neededconfigurationnamescreator')(lib, ret);

  require('./childactualizercreator')(lib, ret);
  require('./childrenstackcreator')(lib, ret);
  require('./formcreator')(lib, ret);
  return ret;
}

module.exports = createMixins;

},{"./childactualizercreator":39,"./childrenstackcreator":40,"./formcreator":41,"./linksandlogicdestroyablecreator":43,"./neededconfigurationnamescreator":44}],43:[function(require,module,exports){
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
      links.forEach(destroyLinkOrLogic.bind(null, 'link'));
    }
  };
  LinksAndLogicDestroyableMixin.prototype.destroyArrayOfLogic = function (logics) {
    if (lib.isArray(logics)) {
      logics.forEach(destroyLinkOrLogic.bind(null, 'logic'));
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

  function destroyLinkOrLogic (name, thingy) {
    //console.log('should destroy', name, thingy);
    var first, second;
    if (isComposite(thingy)) {
      thingy.forEach(destroyLinkOrLogic.bind(null, name));
      name = null;
      return;
    }
    if (!lib.isArray(thingy)) {
      console.error('what is', name, '?', thingy);
      return;
    }
    if (thingy.length!=2) {
      console.error('what is', name, '?', thingy);
      return;
    }
    first = thingy[0];
    second = thingy[1];
    if (first.instance) {
      //first.instance.destroy();
      first.instance = null;
    } else {
      console.error('what is first in', name, '?', first);
    }
    if (lib.isArray(second)) {
      lib.arryDestroyAll(second.splice(0));
    }
  }

  function isComposite (thingy) {
    return (
      thingy &&
      lib.isArray(thingy) &&
      thingy.every(isSubComposite)
    )
  }
  
  function isSubComposite (thingy) {
    return (
      thingy &&
      lib.isArray(thingy) &&
      thingy.length==2 &&
      thingy[0].instance
    )
  }
  
  mylib.LinksAndLogicDestroyableMixin = LinksAndLogicDestroyableMixin;
}
module.exports = createLinksAndLogicDestroyableMixin;

},{}],44:[function(require,module,exports){
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

},{}],45:[function(require,module,exports){
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

},{}],46:[function(require,module,exports){
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
    return preprocessor.process(desc);
  }

  return {
    PreProcessingRegistryBase: PreProcessingRegistryBase,
    BasicProcessor: BasicProcessor,
    _doProcess: _doProcess
  };
}

module.exports = createPreProcessingRegistry;

},{}],47:[function(require,module,exports){
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

},{"./basecreator":46,"./prepreprocessingregistrycreator":48,"./preprocessingregistrycreator.js":49}],48:[function(require,module,exports){
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

},{}],49:[function(require,module,exports){
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

},{}],50:[function(require,module,exports){
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

},{}],51:[function(require,module,exports){
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

},{}],52:[function(require,module,exports){
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

},{}],53:[function(require,module,exports){
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

},{}],54:[function(require,module,exports){
function createPreProcessors (lib, preprocessingregistrylib, descriptorApi) {
  'use strict';

  var EnvironmentHelperPreprocessor = require('./environmenthelpercreator')(lib, preprocessingregistrylib, descriptorApi);

  require('./datasourcecreator')(lib, preprocessingregistrylib, EnvironmentHelperPreprocessor);
  require('./datacommandcreator')(lib, preprocessingregistrylib, EnvironmentHelperPreprocessor);
  require('./commandcreator')(lib, preprocessingregistrylib, EnvironmentHelperPreprocessor);

}

module.exports = createPreProcessors;

},{"./commandcreator":50,"./datacommandcreator":51,"./datasourcecreator":52,"./environmenthelpercreator":53}],55:[function(require,module,exports){
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

},{}]},{},[18]);
