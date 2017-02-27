function createResourcesModule (lib) {
  var q = lib.q,
    ResourceTypeRegistry = new lib.Map (),
    ResourceRegistry = new lib.Map ();

  function resourceFactory (app, desc) {
    var ctor = ResourceTypeRegistry.get(desc.type);
    if (!lib.isFunction(ctor)) return q.reject(new Error('Unable to find resource type '+name));
    var instance = new ctor(desc.options, app);
    var promise = instance._load(desc.lazy);
    ResourceRegistry.add (desc.name, {instance: instance, promise : promise});
    return promise;
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
    if (!lib.isArray(names)) throw new Error 'Must be an array';
    return names.map (getResource);
  };

  function getResource (name) {
    var c = ResourceRegistry.get(name);
    return c ? c.instance : null;
  }

  return {
    registerResourceType : ResourceTypeRegistry.add.bind(ResourceTypeRegistry),
    resourceFactory : resourceFactory,
    getResource : getResource,//ResourceRegistry.get.bind(ResourceRegistry),
    BasicResourceLoader : BasicResourceLoader,
    traverseResources : ResourceRegistry.traverse.bind(ResourceRegistry)
  }
}

module.exports = createResourcesModule;
