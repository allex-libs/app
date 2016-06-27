function createApp (execlib){
  'use strict';

  var lib = execlib.lib,
    DataSource = require('./cDataSource')(lib),
    Command = require('./cCommand')(lib),
    Element = require('./cElement')(lib);

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
    elements.add (item.name, new Element(item));
  }

  function declarePages (elements, pages, item) {
  }

  function App(desc){
    this.environments = new lib.ListenableMap();
    this.datasources = new lib.Map();
    this.commands = new lib.Map();
    this.pages = new lib.Map ();
    this.elements = new lib.Map ();

    lib.traverseShallow (desc.datasources, linkDataSource.bind(null, this.environments, this.datasources, desc));
    lib.traverseShallow (desc.commands, linkCommand.bind(null, this.commands, this.environments, desc));
    lib.traverseShallow (desc.elements, declareElements.bind(null, this.elements));
    lib.traverseShallow (desc.pages, declarePages.bind(null, this.elements, this.pages));
  }

  App.prototype.go = function () {
    //NEMA TU NISTA ZA SAD...
  };

  return App;
}
module.exports = createApp;
