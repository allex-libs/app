function createBasicElement (lib, Hierarchy, elementFactory, BasicParent, Linker) {

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
    this._link = null;
  }
  lib.inherit (BasicElement, BasicParent);

  BasicElement.prototype.__cleanUp = function () {
    if (this._link) this._link.destroy();

    this.actual = null;
    this.id = null;

    Configurable.prototype.__cleanUp.call(this);
    Gettable.prototype.__cleanUp.call(this);
    Child.prototype.__cleanUp.call(this);
  };

  lib.inheritMethods (BasicElement, Child, 'set__parent', 'rootParent', 'leaveParent');
  lib.inheritMethods (BasicElement, Gettable, 'get');
  Configurable.addMethods(BasicElement);

  BasicElement.prototype.initialize = function () {
    var subelements = this.getConfigVal('elements');
    if (!subelements || subelements.length === 0){ return; }
    subelements.forEach(this.createElement.bind(this));
  };

  BasicElement.prototype.DEFAULT_CONFIG = function () {
    return null;
  };

  BasicElement.prototype.createElement = function (desc) {
    var el = elementFactory(desc);
    this.addChild (el);
    el.initialize();
    el._link = new Linker.LinkingEnvironment(el);
    el._link.produceLinks(desc.links);
    el._link.produceLogic(desc.logic);
    el.set('actual', desc.actual || false);
  };

  BasicElement.prototype.set_actual = function (val) {
    if (this.actual === val) return false;
    this.actual = val;
    return true;
  };

  BasicElement.prototype.childChanged = function (el, name, value) {
    if ('actual' === name && value) {
      this.set('actual', true);
      return; ///this one will emmit childChanged ....
    }
    return this.__parent ? this.__parent.childChanged(el, name, value) : undefined;
  };

  BasicElement.prototype.getElement = function () { throw new Error('Not implemented'); }
  BasicElement.prototype.addAppLink = lib.dummyFunc;

  return BasicElement;
}

module.exports = createBasicElement;
