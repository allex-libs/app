function createMethodInvokerJobCore (lib, mylib) {
  'use strict';
  var Base = mylib.Base;

  function MethodInvokerJobCore (element, method, args) {
    Base.call(this, element);
    this.method = method;
    this.args = args;
  }
  lib.inherit(MethodInvokerJobCore, Base);
  MethodInvokerJobCore.prototype.shouldContinue = function () {
    var ret = Base.prototype.shouldContinue.call(this);
    if (ret) {
      return ret;
    }
    if (!lib.isArray(this.args)) {
      throw new lib.Error('ARGS_NOT_AN_ARRAY', this.constructor.name+' must get args as an Array');
    }
  };
  MethodInvokerJobCore.prototype.invoke = function () {
    return this.element[this.method].apply(this.element, this.args);
  };

  MethodInvokerJobCore.prototype.steps = [
    'invoke'
  ];

  mylib.MethodInvoker = MethodInvokerJobCore;
}
module.exports = createMethodInvokerJobCore;