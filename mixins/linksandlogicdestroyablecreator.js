function createLinksAndLogicDestroyableMixin (lib, mylib) {
  'use strict';

  var q = lib.q;

  /**
   * A Mixin for any class that should handle Arrays of Links and Logic.
   *
   * The deal is that Links and Logic have unusual destruction behavior.
   *
   * This Mixin works on simple assumptions:
   * - it accepts an Array of Links or Logic
   * - in the destructor it will properly destroy each Link/Logic in its corresponding arrays
   * @mixin
   * @memberof allex_applib
   */
  function LinksAndLogicDestroyableMixin () {
    /** @member {Array} */
    this.linksFromLinking = null;
    /** @member {Array} */
    this.logicFromLinking = null;
  };
  LinksAndLogicDestroyableMixin.prototype.destroy = function () {
    this.destroyArrayOfLinks(this.linksFromLinking);
    this.linksFromLinking = null;
    this.destroyArrayOfLogic(this.logicFromLinking);
    this.logicFromLinking = null;
  };
  /**
   * @function
   * @param {Array} links An Array of created Link objects
   */
  LinksAndLogicDestroyableMixin.prototype.setLinks = function (links) {
    this.destroyArrayOfLinks(this.linksFromLinking);
    this.linksFromLinking = links;
    return q(links);
  };
  /**
   * @function
   * @param {Array} links An Array of created Logic objects
   */
  LinksAndLogicDestroyableMixin.prototype.setLogic = function (logic) {
    this.destroyArrayOfLogic(this.logicFromLinking);
    this.logicFromLinking = logic;
    return q(logic);
  };
  /**
   * @function
   * @param {Array} links An Array of created Link objects
   */
  LinksAndLogicDestroyableMixin.prototype.destroyArrayOfLinks = function (links) {
    if (lib.isArray(links)) {
      links.forEach(destroyLinkOrLogic.bind(null, 'link'));
    }
  };
  LinksAndLogicDestroyableMixin.prototype.destroyArrayOfLogic = function (logics) {
    if (lib.isArray(logics)) {
      logics.forEach(destroyLinkOrLogic.bind(null, 'logic'));
    }
  };


  LinksAndLogicDestroyableMixin.addMethods = function (klass) {
    lib.inheritMethods(klass, LinksAndLogicDestroyableMixin
      ,'setLinks'
      ,'setLogic'
      ,'destroyArrayOfLinks'
      ,'destroyArrayOfLogic'
    );
  };

  function destroyLinkOrLogic (name, thingy) {
    //console.log('should destroy', name, thingy);
    var first, second;
    if (isComposite(thingy)) {
      thingy.forEach(destroyLinkOrLogic.bind(null, name));
      name = null;
      return;
    }
    if (!lib.isArray(thingy)) {
      console.error('what is', name, '?', thingy);
      return;
    }
    if (thingy.length!=2) {
      console.error('what is', name, '?', thingy);
      return;
    }
    first = thingy[0];
    second = thingy[1];
    if (first.instance) {
      //first.instance.destroy();
      first.instance = null;
    } else {
      console.error('what is first in', name, '?', first);
    }
    if (lib.isArray(second)) {
      lib.arryDestroyAll(second.splice(0));
    }
  }

  function isComposite (thingy) {
    return (
      thingy &&
      lib.isArray(thingy) &&
      thingy.every(isSubComposite)
    )
  }
  
  function isSubComposite (thingy) {
    return (
      thingy &&
      lib.isArray(thingy) &&
      thingy.length==2 &&
      thingy[0].instance
    )
  }
  
  mylib.LinksAndLogicDestroyableMixin = LinksAndLogicDestroyableMixin;
}
module.exports = createLinksAndLogicDestroyableMixin;
