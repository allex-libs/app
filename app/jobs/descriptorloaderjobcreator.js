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
        linkDataSource.bind(null, this.destroyable.datasources, this.destroyable.environments, desc)
      );
      lib.traverseShallow (
        desc.commands,
        linkCommand.bind(null, this.destroyable.commands, this.destroyable.environments, desc)
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
      env = environmentFactory(envdesc);
      name = envdesc.name;
      this.destroyable.environments.add(name, env);
      this.descriptorHandler.addEnvironmentName(name);
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
        console.warn('Unable to find datasource '+source_name+' within environment description');
    }

    var ds = new DataSource(source_name, 'should_running' in item ? item.should_running : true, 'filter' in item ? item.filter : null, 'initial_value' in item ? item.initial_value : null);
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
          console.warn('Unable to find command '+c_name+' in environment descriptor');
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

