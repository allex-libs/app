function createBasicElement (lib, Hierarchy, elementFactory, BasicParent) {

  'use strict';

  var Child = Hierarchy.Child,
    Gettable = lib.Gettable,
    Configurable = lib.Configurable,
    q = lib.q,
    qlib = lib.qlib;

  function BasicElement (id, options) {
    BasicParent.call(this);
    Child.call(this);
    Gettable.call(this);
    Configurable.call(this, options);

    this.id = id;
    this.actual = null;
  }
  lib.inherit (BasicElement, BasicParent);

  BasicElement.prototype.__cleanUp = function () {
    this.actual = null;
    this.id = null;

    Configurable.prototype.__cleanUp.call(this);
    Gettable.prototype.__cleanUp.call(this);
    Child.prototype.__cleanUp.call(this);
  };

  lib.inheritMethods (BasicElement, Child, 'set__parent', 'rootParent', 'leaveParent');
  lib.inheritMethods (BasicElement, Gettable, 'get');
  Configurable.addMethods(BasicElement);


  function createElement (be, desc) {
    return be.createElement.bind(be, desc);
  }

  BasicElement.prototype.initialize = function () {
    var ret = this.doInitialize(),
      inipromise = q.isPromise(ret) ? ret : q.resolve(true),
      subelements = this.getConfigVal('elements');

    if (!subelements || subelements.length === 0){
      return inipromise;
    }

    var job = new qlib.PromiseExecutorJob (subelements.map (createElement.bind(null, this))),
      final_p  = inipromise.then(job.go.bind(job));

    return final_p;
  };

  BasicElement.prototype.DEFAULT_CONFIG = function () {
    return null;
  };

  BasicElement.prototype.createElement = function (desc) {
    var el = elementFactory(desc);
    this.addChild (el);
    var ret = el.initialize();
    ret.done (el.set.bind(el, 'actual', desc.actual || false));
    return ret;
  };

  BasicElement.prototype.set_actual = function (val) {
    this.actual = val;
  };

  BasicElement.prototype.childChanged = function (el, name, value) {
    if ('actual' === name && value) {
      this.set('actual', true);
      return; ///this one will emmit childChanged ....
    }
    return this.__parent ? this.__parent.childChanged(el, name, value) : undefined;
  };

  return BasicElement;
}

module.exports = createBasicElement;
