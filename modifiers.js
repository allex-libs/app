function createModifiers (execlib, misc) {
  'use strict';

  var lib = execlib.lib, 
    modifiers = new lib.Map (),
    Configurable = lib.Configurable;


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
    registerModifier : registerModifier,
    BasicModifier : BasicModifier,
    executeModifiers : executeModifiers
  };
}

module.exports = createModifiers;