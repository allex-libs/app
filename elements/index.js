function createElements (lib) {
  'use strict';

  var ElementTypeRegistry = new lib.Map (),
    Hierarchy = require('allex_hierarchymixinslowlevellib')(lib.inherit, lib.DList, lib.Gettable, lib.Settable),
    BasicElement = require('./basicelementcreator.js')(lib, Hierarchy, elementFactory);

  function elementFactory (desc) {
    //TODO: a sta sa parent-ima? who's your daddy? :D
    var type = desc.type;
    if (!type) throw new Error('No type in element descriptor');
    var ctor = ElementTypeRegistry.get(type);

    if (!ctor) throw new Error('No ctor found for element type: '+type);
    var instance = new ctor(desc.name, desc.options);
    instance.set('actual', desc.actual);
    return instance;
  }

  function registerElementType (elementtype_name, ctor) {
    if (!lib.isFunction (ctor)) throw new Error('Constructor must be a function');
    ElementTypeRegistry.add(elementtype_name, ctor);
  }

  return {
    BasicElement : BasicElement,
    elementFactory : elementFactory,
    registerElementType : registerElementType
  }
}

module.exports = createElements;