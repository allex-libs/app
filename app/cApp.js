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
