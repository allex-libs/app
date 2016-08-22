function createApp (lib, Elements, Hierarchy, Resources, BasicParent, EnvironmentFactoryPromise, Linker, BasicElement){
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
    if ('should_running' in item) {
      ds.set('should_running', item.should_running);
    }
    if ('filter' in item) {
      ds.set('filter', item.filter);
    }
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
