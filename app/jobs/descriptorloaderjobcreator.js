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
    //console.log('adding', id);
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

