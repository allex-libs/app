function createModifiers (execlib, misc) {
  'use strict';

  var lib = execlib.lib, 
    modifiers = new lib.Map (),
    Configurable = lib.Configurable;

  /**
   * @class
   * @param {Object} options The configuration object
   * @memberof allex_applib
   * @classdesc
   * The base class for Modifiers
   *
   * Modifiers work like this:
   *
   * ### Inherit from BasicModifier
   * You will need to implement the following methods:
   * - `doProcess(name, options, links, logic, resources)` - your job is done here
   * - `DEFAULT_CONFIG()` - you have to return the default configuration, if none is given
   *
   * Optionally, you may override the `ALLOWED_ON()` method, to specify the names of Element types 
   * your inherited Modifier class will run on.
   *
   * ### Register
   * call {@link allex_applib.registerModifier} with
   * 1. the name you're registering under (a String, like `'MySpecialModifier'`)
   * 2. the class you produced when you inherited from BasicModifier
   *
   * **Note**: the call will result in your class (_not an instance_ of it)
   * being registered under the name you provided.
   * 
   *
   * ### Configure
   * In the descriptor of the App or Element, do configure the modifier.
   *
   * Configuration object for Modifiers is an Array.
   * Each element of the Array may be
   * - A String (the trivial case)
   * - A (`name`-`options`) Object (the general case)
   *
   * #### String configuration element
   * This String is the name under which the Modifier is registered.
   * The Modifier will be invoked with no particular configuration.
   *
   * #### (`name`-`options`) Object as a configuration element
   * In this case, the configuration Object has the following properties:
   * - `name` is the name under which the Modifier is registered.
   * - `options` is the configuration object.
   *
   * ### Configuration example
   * Trivial configuration:
   * ```javascript
   *  {
   *    links: [...],
   *    logic: [...],
   *    modifiers: ['MyModifier', 'AnotherModifierOfMine']
   *  }
   * ```
   *
   * The same trivial configuration from above, 
   * rewritten in the general form:
   * ```javascript
   *  {
   *    links: [...],
   *    logic: [...],
   *    modifiers: [{
   *      name: 'MyModifier',
   *      options: null
   *    },{
   *      name: 'AnotherModifierOfMine',
   *      options: null
   *    }]
   *  }
   *  ```
   *
   * Configuration in the case when Modifiers have to be particularly configured:
   * ```javascript
   *  {
   *    links: [...],
   *    logic: [...],
   *    modifiers: [{
   *      name: 'MyModifier',
   *      options: {
   *        color: 'red',
   *        encryption: true
   *      }
   *    },{
   *      name: 'AnotherModifierOfMine',
   *      options: {
   *        rows: 5,
   *        columns: 7
   *      }
   *    }]
   *  }
   * ```
   *
   *
   */

  function BasicModifier (options) {
    Configurable.call(this, options);
  }
  lib.inherit (BasicModifier, Configurable);

  BasicModifier.prototype.destroy = function () {
    Configurable.prototype.destroy.call(this);
  };

  BasicModifier.prototype.process = function (element) {
    this.doProcess(element.name, element.options, element.links, element.logic, element.resources);
  };

  /**
   * This method must be overriden in descendant classes.
   *
   * @function 
   * @param {String} name The name of the App/Element descriptor to be processed
   * @param {Object} options Options of the App/Element descriptor to be processed
   * @param {Array} links Links of the App/Element descriptor to be processed
   * @param {Array} logic Logic of the App/Element descriptor to be processed
   * @param {Array} resources Resources of the App/Element descriptor to be processed
   */
  BasicModifier.prototype.doProcess = function (name, options, links, logic, resources) {
    throw new Error('Not implemented');
  };

  BasicModifier.prototype.hookToArray = function (ctx, which) {
    var tp = Array.prototype.slice.call(arguments, 2);
    if (!ctx[which]) {
      ctx[which] = tp;
      return;
    }
    if (lib.isFunction(ctx[which])) {
      ctx[which] = [ctx[which]];
    }
    if (lib.isArray(ctx[which])) {
      Array.prototype.push.apply (ctx[which], tp);
    }
  };

  function registerModifier (name, ctor) {
    modifiers.add (name, ctor);
  }

  function getModifier (name) {
    return modifiers.get (name);
  }

  function executeModifier (name, options, element) {
    var ctor = modifiers.get(name);
    if (!ctor) throw new Error('Failed to load modifier: '+name);

    if (ctor.ALLOWED_ON && ctor.ALLOWED_ON.indexOf(element.type) < 0) throw new Error ('Not allowed on '+element.type);

    var instance = new ctor (options);

    instance.process(element);
    instance.destroy();
    instance = null;
  }

  function executeModifiers (element) {
    if (!element.modifiers) return;

    misc.initAll(element);

    for (var i = 0; i < element.modifiers.length; i++){
      if (lib.isString(element.modifiers[i])) {
        executeModifier (element.modifiers[i], null, element);
      }else{
        executeModifier (element.modifiers[i].name, element.modifiers[i].options, element);
      }
    }
  }

  return {
    BasicModifier : BasicModifier,
    registerModifier : registerModifier,
    getModifier : getModifier,
    executeModifiers : executeModifiers
  };
}

module.exports = createModifiers;
