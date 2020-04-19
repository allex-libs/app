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
    destroyArrayOfLinks(this.linksFromLinking);
    this.linksFromLinking = null;
    destroyArrayOfLogic(this.logicFromLinking);
    this.logicFromLinking = null;
  };
  /**
   * @function
   * @param {Array} links An Array of created Link objects
   */
  LinksAndLogicDestroyableMixin.prototype.setLinks = function (links) {
    destroyArrayOfLinks(this.linksFromLinking);
    this.linksFromLinking = links;
    return q(links);
  };
  /**
   * @function
   * @param {Array} links An Array of created Logic objects
   */
  LinksAndLogicDestroyableMixin.prototype.setLogic = function (logic) {
    destroyArrayOfLogic(this.logicFromLinking);
    this.logicFromLinking = logic;
    return q(logic);
  };


  LinksAndLogicDestroyableMixin.addMethods = function (klass) {
    lib.inheritMethods(klass, LinksAndLogicDestroyableMixin
      ,'setLinks'
      ,'setLogic'
    );
  };

  /**
   * @function
   * @param {Array} links An Array of created Link objects
   */
  function destroyArrayOfLinks (links) {
    if (lib.isArray(links)) {
      links.forEach(destroyLink);
    }
  }

  function destroyLink (link) {
    console.log('should destroy link', link);
  }

  function destroyArrayOfLogic (logics) {
    if (lib.isArray(logics)) {
      logics.forEach(destroyLogic);
    }
  }
  /** 
   * @function
   * @alias LinksAndLogicDestroyableMixin~destroyLogic
   */
  function destroyLogic (logic) {
    console.log('should destroy logic', logic);
    var first, second;
    if (!lib.isArray(logic)) {
      console.error('what is logic?', logic);
      return;
    }
    if (logic.length == 1) {
      destroyLogic(logic[0]);
      return;
    }
    if (logic.length!=2) {
      console.error('what is logic?', logic);
      return;
    }
    first = logic[0];
    second = logic[1];
    if (first.instance) {
      first.instance.destroy();
      first.instance = null;
    } else {
      console.error('what is first?', first);
    }
    if (lib.isArray(second)) {
      lib.arryDestroyAll(second.splice(0));
    }
  }
  mylib.LinksAndLogicDestroyableMixin = LinksAndLogicDestroyableMixin;
}

module.exports = createLinksAndLogicDestroyableMixin;
