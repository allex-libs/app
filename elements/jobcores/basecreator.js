function createBaseBasicElementJobCore (lib, mylib) {
  'use strict';
  function BaseBasicElementJobCore (element) {
    this.element = element;
  }
  BaseBasicElementJobCore.prototype.destroy = function () {
    this.element = null;
  };
  BaseBasicElementJobCore.prototype.shouldContinue = function () {
    if (!this.element) {
      return new lib.Error('NO_ELEMENT', this.constructor.name+' cannot proceed without an Element');
    }
    if (!this.element.destroyed) {
      return new lib.Error('ELEMENT_ALREADY_DESTROYED', this.constructor.name+' cannot proceed, the Element is already destroyed');
    }
  };

  mylib.Base = BaseBasicElementJobCore;
}
module.exports = createBaseBasicElementJobCore;