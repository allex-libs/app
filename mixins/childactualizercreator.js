function createChildActualizerMixin (lib, mylib) {
  'use strict';

  function ChildActualizerMixin () {
    this.actualchildren = null;
  }
  ChildActualizerMixin.prototype.destroy = function () {
    this.actualchildren = null;
  };
  ChildActualizerMixin.prototype.set_actualchildren = function (val) {
    this.actualchildren = val;
    traverseChildrenForActual.call(this, actualizer.bind(null, val));
  };
  ChildActualizerMixin.prototype.initChildActualizer = function () {
    var initiallyactual = this.getConfigVal('initiallyactualchildren');
    traverseChildrenForActual.call(this, actualizer.bind(null, initiallyactual));
    initiallyactual = null;
  };

  ChildActualizerMixin.addMethods = function (klass) {
    lib.inheritMethods(klass, ChildActualizerMixin
      ,'set_actualchildren'
      ,'initChildActualizer'
    );
    klass.prototype.postInitializationMethodNames = klass.prototype.postInitializationMethodNames.concat(['initChildActualizer']);
  };

  //statics
  function initiallySetActualChildren (initact) {
  }

  function traverseChildrenForActual (cb) {
    var chsforact;
    if (!lib.isFunction(cb)) {
      return;
    }
    chsforact = this.getConfigVal('childrenforactualization');
    if (lib.isString(chsforact)) {
      cbTraverserForElementName.call(this, cb, elname);
      cb = null;
      return;
    }
    if (lib.isArray(chsforact)) {
      chsforact.forEach(cbTraverserForElementName.bind(this, cb));
      cb = null;
      return;
    }
    if (this.__children) {
      this.__children.traverse(cbTraverserForElement.bind(this, cb));
      cb = null;
      return;
    }
  }

  function cbTraverserForElementName (cb, elname) {
    var el;
    try {
      el = this.getElement(elname); 
    } catch(e) { return; }
    if (!el) {
      return;
    }
    cbTraverserForElement(cb, el);
  }
  //endof statics

  //locals
  function cbTraverserForElement (cb, el) {
    cb(el);
  }
  function actualizer (shouldbeactual, el) {
    if (lib.isString(shouldbeactual)) {
      el.set('actual', el.id === shouldbeactual);
      return;
    }
    if (lib.isArray(shouldbeactual)) {
      el.set('actual', shouldbeactual.indexOf(el.id)>=0);
      return;
    }
    el.set('actual', false);
  }
  //endof locals

  mylib.ChildActualizer = ChildActualizerMixin;
}
module.exports = createChildActualizerMixin;
