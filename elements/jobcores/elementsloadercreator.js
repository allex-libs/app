function createElementsLoaderJobCore (lib, DescriptorHandler, mylib) {
  'use strict';

  var Base = mylib.Base;

  function ELementsLoaderJobCore (element) {
    Base.call(this, element);
  }
  lib.inherit(ELementsLoaderJobCore, Base);
  ELementsLoaderJobCore.prototype.destroy = function () {
    Base.prototype.destroy.call(this);
  };

  ELementsLoaderJobCore.prototype.doLoad = function () {
    var subelems = this.element.getConfigVal('elements');
    var fullname, envdesc;
    if (!lib.isArray(subelems)) {
      return [];
    }
    fullname = this.element.myNameOnMasterEnvironment();
    envdesc = new DescriptorHandler({
      elements: subelems.map(namenormalizer.bind(null, fullname))
    });
    fullname = null;
    return envdesc.load();
  };
  ELementsLoaderJobCore.prototype.finalize = function (res) {
    return res;
  };

  ELementsLoaderJobCore.prototype.steps = [
    'doLoad',
    'finalize'
  ];

  function namenormalizer (fullname, desc) {
    var ret = lib.pickExcept(desc, ['name']);
    ret.name = fullname+'.'+desc.name;
    return ret;
  }

  mylib.ElementsLoader = ELementsLoaderJobCore;
}
module.exports = createElementsLoaderJobCore;