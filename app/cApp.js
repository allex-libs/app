function createApp (lib, BasicElement, Hierarchy, Resources, BasicParent){
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

  function resolveReferences (app, desc) {
    if (!lib.isString(desc)) return desc;

    var ret = app.elements.get(desc);
    if (!ret) throw new Error ('Expecting app to have declared page '+desc);
    return ret;
  }

  function declarePages (app, item) {
    if (!item) throw new Error('No item set');
    if (!item.name) throw new Error('Page requires a name');
    if (!item.options || !item.options.elements || !item.options.elements.length) throw new Error('Page with no elements? No way');

    item.options.elements = item.options.elements.map (resolveReferences.bind(null, app));

    var page = new app.pagector(item.name, item.options);
    app.addChild(page);
    page.initialize();
  }

  function loadPages (app, desc) {
    lib.traverseShallow (desc.elements, declareElements.bind(null, app.elements));
    desc.pages.forEach(declarePages.bind(null, app));
    var initial_page = desc.initial_page || (desc.pages.length ? desc.pages[0].name : null);
    app.set('page', initial_page);
  }

  function App(desc, pagector){
    if (!desc) throw new Error('Missing descriptor');
    BasicParent.call(this);
    this.environments = new lib.ListenableMap();
    this.datasources = new lib.Map();
    this.commands = new lib.Map();
    this.elements = new lib.Map ();
    this.pagector = pagector;

    if (!lib.isFunction (pagector)) throw new Error('Expecting Page Constructor as a paramenter');

    this.page = null;

    lib.traverseShallow (desc.datasources, linkDataSource.bind(null, this.environments, this.datasources, desc));
    lib.traverseShallow (desc.commands, linkCommand.bind(null, this.commands, this.environments, desc));


    ///TODO: what should we do while loading common resources?
    if (desc.resources) {
      q.all(desc.resources.map(Resources.resourceFactory.bind(Resources)))
        .done (loadPages.bind(null, this, desc));
    }
    else{
      loadPages(this, desc);
    }
  }
  lib.inherit(App, BasicParent);

  App.prototype.__cleanUp = function () {
    ///TODO, big TODO ...
  };

  App.prototype.childChanged = function () {
    //TODO: nothing for now ...
  };

  App.prototype.set_page = function (page) {
    if (this.page) {
      this.page.set('actual', false);
    }
    this.page = null;
    if (!page) return;

    var p = this.findById (page);
    if (!p) throw new Error('Unable to find page '+page);

    this.page = p;
    this.page.set('actual', true);
  };

  return App;
}
module.exports = createApp;
