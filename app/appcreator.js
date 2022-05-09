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
