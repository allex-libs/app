function createEnvironmentsCreator (lib, environmentFactory, mylib) {
  'use strict';

  var DescriptorArrayJobCore = mylib.DescriptorArrayJobCore;

  function EnvironmentsCreatorJobCore (descriptorloaderjobcore) {
    DescriptorArrayJobCore.call(this, descriptorloaderjobcore, 'environments');
  }
  lib.inherit(EnvironmentsCreatorJobCore, DescriptorArrayJobCore);
  EnvironmentsCreatorJobCore.prototype.doOneItem = function (envdesc) {
    var env, name, res = {env: null, new: false, envdesc: envdesc};
    try {
      name = envdesc.name;
      env = this.app().environments.get(name);
      if (!env) {
        console.log('createEnvironment', envdesc);
        env = environmentFactory(envdesc);
        res.env = env;
        res.new = true;
      } else {
       res.env = env;
       res.new = false;
      }
      return res;
    } catch (e) {
      console.error(e);
      throw e;
    }
  };

  mylib.EnvironmentsCreatorJobCore = EnvironmentsCreatorJobCore;
}
module.exports = createEnvironmentsCreator;