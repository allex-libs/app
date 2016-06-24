function createAppSuite (execlib){
  'use strict';

  var lib = execlib.lib,
    environmentFactory = require('./environments/factorycreator.js')(execlib, require('./datasources')(execlib)),
    elementFactory,
    pageFactory;

  function toString (item) {
    return JSON.stringify(item, null, 2);
  }


  function linkEnvironment (environments, item) {
    if (!item.name) throw new Error('Environment has no name: '+toString(item));
    environments.add (item.name, environmentFactory (item));
  }

  function linkDataSource (environments, datasources, item) {
    if (!item.name) throw new Error ('Datasource has no name: '+toString(item));
    if (!item.environment) throw new Error('Datasource has no environment: '+toString(item));

    var e = environments.get(item.environment);
    if (!e) throw new Error ('Unknown environment '+item.environment);

    var ds_name = item.source || item.name, ds = environments.dataSources.get(ds_name);
    if (!ds) throw new Error ('Data source not found '+ds_name);
    datasources.add(item.name, e.dataSources.get(item.source || item.name));
  }

  function linkCommand (commands, environments, item) {
    if (!item.command) throw new Error('No command in '+toString(item));
    if (!item.environment) throw new Error('No environment in '+toString(item));

    var e = environments.get(item.environment);
    if (!e) throw new Error('Unable to find environment '+item.environment);
    var c_name = item.ecommand || item.command, c = e.commands.get(c_name);

    if (!c) throw new Error('Unable to find command '+c_name+' in environment '+item.environment);
    commands.add(item.command, c);
  }

  function linkElements (elements, item){
    if (!item.name) throw new Error('Element has no name '+toString(item));
    if (!item.type) throw new Error('Element has no type '+toString(item));
    elements.add(item.name, elementFactory(item));
  }

  function linkPage (pages, elements, item) {
    if (!item.name) throw new Error('Page must have a name '+toString(item));
    if (!item.elements || !item.elements.length) throw new Error('Page must have at least one element');

    pages.add (item.name, pageFactory(item));
  }

  function App(desc){
    this.environments = new lib.ListenableMap();
    this.datasources = new lib.Map();
    this.commands = new lib.Map();
    this.pages = new lib.Map ();
    this.elements = new lib.Map ();

    lib.traverseShallow (desc.environments, linkEnvironment.bind(null, this.environments));
    lib.traverseShallow (desc.datasources, linkDatasource.bind(null,this.environments, this.datasources));
    lib.traverseShallow (desc.commands, linkCommand.bind(null, this.environments, this.commands));
    lib.traverseShallow (desc.elements, linkElement.bind(null, this.elements));
    lib.traverseShallow (desc.pages, linkPage.bind(null, this.pages, this.elements));
  }

  return App;
}

module.exports = createAppSuite;
