function createResourcesModule (lib) {
  var q = lib.q,
    ResourceTypeRegistry = new lib.Map (),
    ResourceRegistry = new lib.DIContainer (),
    ResourceParams = new lib.Map ();

  function resourceFactory (app, desc) {
    var ctor, instance, promise;
    console.log('creating Resource', desc.name||desc.type, 'with options', desc.options);
    ctor = ResourceTypeRegistry.get(desc.type);
    if (!lib.isFunction(ctor)) return q.reject(new Error('Unable to find resource type '+desc.type));
    instance = new ctor(desc.options, app);
    promise = instance._load(desc.lazy);
    ResourceRegistry.register (desc.name||desc.type, {instance: instance, promise : promise});
    return promise;
  }

  function loadResourceParams (desc) {
    ResourceParams.replace(desc.name||desc.type, lib.extendWithConcat(
      ResourceParams.get(desc.name||desc.type) || {},
      desc
    ));
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
    if (!lib.isArray(names)) throw new Error ('Must be an array');
    return names.map (getResource);
  };

  function getResource (name) {
    var c = ResourceRegistry.get(name);
    return c ? c.instance : null;
  }

  function afterWait (item) {
    return q(item ? (item.instance || null) : null);
  }
  function waitForResource (name) {
    return ResourceRegistry.waitFor(name).then(afterWait);
  }

  function destroyResource (name) {
    var c = ResourceRegistry.remove(name);
    if (c) {
      if (c.instance) {
        c.instance.destroy();
      }
      //TODO: the promise has to reject finally
    }
  }

  return {
    registerResourceType : ResourceTypeRegistry.add.bind(ResourceTypeRegistry),
    getResourceType : ResourceTypeRegistry.get.bind(ResourceTypeRegistry),
    resourceFactory : resourceFactory,
    loadResourceParams : loadResourceParams,
    getResource : getResource,//ResourceRegistry.get.bind(ResourceRegistry),
    waitForResource: waitForResource,
    destroyResource : destroyResource,
    BasicResourceLoader : BasicResourceLoader,
    traverseResources : ResourceRegistry.traverse.bind(ResourceRegistry),
    traverseResourceParams : ResourceParams.traverse.bind(ResourceParams)
  }
}

module.exports = createResourcesModule;
