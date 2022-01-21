function createElements (lib, Hierarchy, BasicParent, Linker, Resources, executeModifiers, mixins, PrePreProcessor, PreProcessor, DescriptorHandler) {
  'use strict';

  var ElementTypeRegistry = new lib.Map (),
    BasicElement = require('./basicelementcreator.js')(lib, Hierarchy, elementFactory, BasicParent, Linker, Resources, executeModifiers, mixins.LinksAndLogicDestroyableMixin, PrePreProcessor, PreProcessor, DescriptorHandler),
    mylib;

  function elementFactory (desc) {
    var type = desc.type;
    if (!type) throw new Error('No type in element descriptor');
    var ctor = getElementType(type);

    if (!ctor) throw new Error('No ctor found for element type: '+type);
    var instance = new ctor(desc.name, desc.options);
    return instance;
  }

  function registerElementType (elementtype_name, ctor) {
    if (!lib.isFunction (ctor)) throw new Error('Constructor must be a function');
    ElementTypeRegistry.add(elementtype_name, ctor);
  }

  function getElementType (type) {
    return ElementTypeRegistry.get(type);
  }

  registerElementType ('BasicElement', BasicElement);

  mylib =  {
    BasicElement : BasicElement,
    elementFactory : elementFactory,
    registerElementType : registerElementType,
    getElementType : getElementType
  };
  return mylib;
}

module.exports = createElements;
