function createResourcesModule (lib) {
  var q = lib.q,
    ResourceTypeRegistry = new lib.Map (),
    ResourceRegistry = new lib.Map ();

  function resourceFactory (desc) {
    var ctor = ResourceTypeRegistry.get(desc.type);
    if (!lib.isFunction(ctor)) return q.reject(new Error('Unable to find resource type '+name));
    var instance = new ctor(desc.options)
    ResourceRegistry.add (desc.name, instance);
    return instance.load();
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

  return {
    registerResourceType : ResourceTypeRegistry.add.bind(ResourceTypeRegistry),
    resourceFactory : resourceFactory,
    getResource : ResourceRegistry.get.bind(ResourceRegistry),
    BasicResourceLoader : BasicResourceLoader
  }
}

module.exports = createResourcesModule;
