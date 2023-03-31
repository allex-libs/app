function createBasicElementInitializer (lib, DescriptorHandler, Linker, jobs, mylib) {
  'use strict';
  var Base = mylib.Base;
  var qlib = lib.qlib;

  function BasicElementInitializerJobCore (element, desc) {
    Base.call(this, element);
    this.descriptor = desc;
  }
  lib.inherit(BasicElementInitializerJobCore, Base);
  BasicElementInitializerJobCore.prototype.destroy = function () {
    this.descriptor = null;
  };

  BasicElementInitializerJobCore.prototype.loadElements = function () {
    return qlib.newSteppedJobOnSteppedInstance(
      new mylib.ElementsLoader(this.element)
    ).go();
  };
  BasicElementInitializerJobCore.prototype.loadInitialEnvironment = function () {
    return (new jobs.LoadInitialEnvironment(this.element)).go();
  };
  BasicElementInitializerJobCore.prototype.loadStaticEnvironment = function () {
    return (new jobs.LoadStaticEnvironment(this.element)).go();
  };
  BasicElementInitializerJobCore.prototype.produceLinks = function () {
    this.element._link = new Linker.LinkingEnvironment(this.element);
    return (this.descriptor && lib.isArray(this.descriptor.links))
    ?
    this.element._link.produceLinks(this.descriptor.links)
    :
    null;
  };
  BasicElementInitializerJobCore.prototype.onLinks = function (links) {
    this.element.setLinks(links);
  };
  BasicElementInitializerJobCore.prototype.produceLogic = function () {
    return (this.descriptor && lib.isArray(this.descriptor.logic))
    ?
    this.element._link.produceLogic(this.descriptor.logic)
    :
    null;
  };
  BasicElementInitializerJobCore.prototype.onLogic = function (logic) {
    this.element.setLogic(logic);
  };
  BasicElementInitializerJobCore.prototype.finalize = function () {
    this.element.fireInitializationDone();
  };

  BasicElementInitializerJobCore.prototype.steps = [
    'loadElements',
    'loadInitialEnvironment',
    'loadStaticEnvironment',
    'produceLinks',
    'onLinks',
    'produceLogic',
    'onLogic',
    'finalize'
  ];

  mylib.Initializer = BasicElementInitializerJobCore;
}
module.exports = createBasicElementInitializer;