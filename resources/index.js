function createResourcesModule (lib) {
  var q = lib.q,
    ResourceTypeRegistry = new lib.Map (),
    ResourceRegistry = new lib.Map ();

  function resourceFactory (app, desc) {
    var ctor = ResourceTypeRegistry.get(desc.type);
    if (!lib.isFunction(ctor)) return q.reject(new Error('Unable to find resource type '+name));
    var instance = new ctor(desc.options, app);
    var promise = instance.load();
    ResourceRegistry.add (desc.name, {instance: instance, promise : promise});
    return promise;
  }
  function BasicResourceLoader (options) {
    lib.Configurable.call(this, options);
  }
  lib.inherit (BasicResourceLoader, lib.Configurable);
  BasicResourceLoader.prototype.destroy = function () {
    lib.Configurable.prototype.destroy.call(this);
  };

  BasicResourceLoader.prototype.load = function () {
    throw new Error('not implementsd');
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
