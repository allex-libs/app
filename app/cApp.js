function createApp (execlib){
  'use strict';

  var lib = execlib.lib,
    DataSource = require('./cDataSource')(lib);

  function toString (item) {
    return JSON.stringify(item, null, 2);
  }


  function linkDataSource (environments, datasources, desc, item) {
    if (!item.name) throw new Error ('Datasource has no name: '+toString(item));
    if (!item.environment) throw new Error('Datasource has no environment: '+toString(item));

    var ds = new DataSource(item.source || item.name);
    datasources.add(item.name, ds);
    environments.listenFor (item.environment, ds.set.bind(ds, 'environment'));
  }

  /*

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
  */

  function App(desc){
    this.environments = new lib.ListenableMap();
    this.datasources = new lib.Map();
    this.commands = new lib.Map();
    this.pages = new lib.Map ();
    this.elements = new lib.Map ();

    lib.traverseShallow (desc.datasources, linkDatasource.bind(null, this.environments, this.datasources, desc));
    lib.traverseShallow (desc.commands, linkCommand.bind(null, this.environments, this.commands));
    /*
    lib.traverseShallow (desc.elements, linkElement.bind(null, this.elements));
    lib.traverseShallow (desc.pages, linkPage.bind(null, this.pages, this.elements));
    */
  }

  return App;
}
module.exports = createApp;
