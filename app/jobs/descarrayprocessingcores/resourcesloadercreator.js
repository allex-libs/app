function createResourcesLoader (lib, Resources, mylib) {
  'use strict';

  var DescriptorArrayJobCore = mylib.DescriptorArrayJobCore,
    Command = require('../../commandcreator')(lib),
    FunctionCommand = require('../../functioncommandcreator')(lib);

  function ResourcesLoaderJobCore (descriptorloaderjobcore) {
    DescriptorArrayJobCore.call(this, descriptorloaderjobcore, 'resources');
  }
  lib.inherit(ResourcesLoaderJobCore, DescriptorArrayJobCore);
  ResourcesLoaderJobCore.prototype.doOneItem = function (resourcedesc) {
    return Resources.loadResourceParams(resourcedesc);
  };

  mylib.ResourcesLoaderJobCore = ResourcesLoaderJobCore;
}
module.exports = createResourcesLoader;