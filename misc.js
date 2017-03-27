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

  function traverseElements (desc, cb, path) {
    if (!lib.isFunction (cb)) throw new Error('Not a function');
    if (!path) path = [];
    cb(desc, path);

    var elements = null;

    if (desc.name) {
      elements = desc.options && desc.options.elements ? desc.options.elements : null;
    }else{
      elements = desc.elements ? desc.elements : null;
    }

    if (!elements) return;
    for (var i = 0; i < elements.length; i++) {
      traverseElements(elements[i], cb, path.concat([elements[i].name]));
    }
  }

  function anyOfModifiers (desc, modifiers) {
    for (var i in modifiers) {
      if (findModifier(desc, modifiers[i])) return true;
    }
    return false;
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
    if (!desc.name) {
      return desc.elements;
    }

    return desc.options ? desc.options.elements : null;
  }

  function findElement (desc, name) {
    var s = name.split('.'),
      fn = s.shift();

    var els_arr = getElementsArr(desc);
    if (!els_arr) return null;
    var el = lib.arryOperations.findElementWithProperty(els_arr, 'name', fn);

    while (s.length) {
      fn = s.shift();
      els_arr = getElementsArr(el);
      if (!els_arr) return null;
      el = lib.arryOperations.findElementWithProperty(els_arr, 'name', fn);
      if (!el) return null;
    }
    return el;
  }

  function forgetModifier (desc, mod) {
    if (!desc.modifiers) return;
    var index = desc.modifiers.indexOf(mod);
    if (index < 0) return;

    desc.modifiers.splice(index, 1);
  }

  function addHook (options, name, cb) {
    if (options[name] && !lib.isArray(options[name])) {
      options[name] = [options[name]];
    }
    if (!options[name]) options[name] = [];
    options[name].push (cb);
  }

  return {
    addHook : addHook,
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
    anyOfModifiers : anyOfModifiers
  };
}

module.exports = createMisc;
