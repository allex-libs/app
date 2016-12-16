function createMisc (lib) {
  function initLinks (desc) {
    if (!desc) throw new Error('How do you think to do this with no descriptor?');
    if (!desc.links) desc.links = [];
  }

  function initLogic (desc) {
    if (!desc) throw new Error('How do you think to do this with no descriptor?');
    if (!desc.logic) desc.logic = [];
  }

  function initElements (desc) {
    if (!desc) throw new Error('How do you think to do this with no descriptor?');
    if (desc.name) {
      if (!desc.options) desc.options = {};
      if (!desc.options.elements) desc.options.elements = [];
    }else{
      if (!desc.elements) desc.elements = [];
    }
  }

  function traverseElements (desc, cb) {
    if (!lib.isFunction (cb)) throw new Error('Not a function');
    cb(desc);

    var elements = null;

    if (desc.name) {
      elements = desc.options && desc.options.elements ? desc.options.elements : null;
    }else{
      elements = desc.elements ? desc.elements : null;
    }

    if (!elements) return;
    for (var i = 0; i < elements.length; i++) {
      traverseElements(elements[i], cb);
    }
  }

  function findModifier (desc, name) {
    if (!desc.modifiers) return null;
    var ret = [];
    for (var i = 0; i < desc.modifiers.length; i++) {
      if (desc.modifiers[i] === name  || desc.modifiers[i].name === name) {
        ret.push (desc.modifiers[i]);
      }
    }

    return ret.length ? ret : null;
  }

  function initOptions (desc) {
    if (!desc.name) return;
    if (!desc.options) desc.options = {};
  }


  function initResources (desc) {
    if (!desc.resources) desc.resources = [];
  }

  function initAll (desc) {
    initResources(desc);
    initLogic(desc);
    initLinks(desc);
    initElements (desc);
  }

  function getElementsArr (desc) {
    return desc.name ? desc.options.elements : desc.elements;
  }

  function findElement (desc, name) {
    return lib.arryOperations.findElementWithProperty(getElementsArr(desc), 'name', name);
  }

  function forgetModifier (desc, mod) {
    if (!desc.modifiers) return;
    var index = desc.modifiers.indexOf(mod);
    if (index < 0) return;

    desc.modifiers.splice(index, 1);
  }

  return {
    findElement : findElement,
    getElementsArr : getElementsArr,
    initAll : initAll,
    initElements : initElements,
    initLinks : initLinks,
    initLogic : initLogic,
    initOptions : initOptions, 
    initResources : initResources,
    traverseElements : traverseElements,
    findModifier : findModifier,
    forgetModifier : forgetModifier,
  };
}

module.exports = createMisc;