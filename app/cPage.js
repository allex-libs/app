function createPage (lib, BasicElement){
  'use strict';

  function Page (id, options){
    BasicElement.call(this, id, options);
  }
  lib.inherit (Page, BasicElement);
  Page.prototype.__cleanUp = function () {
    BasicElement.prototype.__cleanUp.call(this);
  };

  Page.prototype.createElement = function (desc) {
    if (!lib.isString(desc)) {
      return BasicElement.prototype.createElement.call(this, desc);
    }

    let app = this.__parent;
    ///load element from app ....

    let el = app.elements.get(desc);
    if (!el) throw new Error ('Expecting app to have declared page '+desc);
    this.addChild (this.createElement(el));
  };

  return Page;
}

module.exports = createPage;
