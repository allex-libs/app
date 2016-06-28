function createBasicElement (lib, Hierarchy, elementFactory) {

  'use strict';

  var Parent = Hierarchy.Parent,
    Child = Hierarchy.Child,
    ChangeableListenable = lib.ChangeableListenable,
    Gettable = lib.Gettable;

  function BasicElement (id, options) {
    Parent.call(this);
    Child.call(this);
    ChangeableListenable.call(this);
    Gettable.call(this);

    this.id = id;
    this.actual = null;
  }
  lib.inherit (BasicElement, Parent);

  BasicElement.prototype.__cleanUp = function () {
    this.actual = null;
    this.id = null;
    Gettable.prototype.__cleanUp.call(this);
    Child.prototype.__cleanUp.call(this);
    Parent.prototype.__cleanUp.call(this);
    ChangeableListenable.__cleanUp.call(this);
  };

  lib.inheritMethods (BasicElement, Child, 'set__parent', 'rootParent', 'leaveParent');
  lib.inheritMethods (BasicElement, Gettable, 'get');
  ChangeableListenable.addMethods (BasicElement);

  BasicElement.prototype.createElements = function (elements) {
    elements.forEach(this.createElement.bind(this));
  };

  BasicElement.prototype.createElement = function (desc) {
    this.addChild (elementFactory(desc));
  };

  function findById (id, item) {
    if (id === item.get('id')) return item;
  }

  BasicElement.prototype.findById = function (id) {
    return this.__children.traverseConditionally (findById.bind(null, id));
  };

  function processReplacer (replacers, item, index, arr){
    for (var i in replacers) {
      let regexp = new RegExp ('\{'+i+'\}', 'g');
      item = item.replace(regexp, replacers[i]);
      regexp = null;
      arr[index] = item;
    }
  }

  function processReplacers (path, replacers) {
    path.forEach(processReplacer.bind(null, replacers));
  }

  BasicElement.prototype.childAtPath = function (path, replacers) {
    if (!path || !path.length) return null;

    if (lib.isString(path)) {
      path = path.split('.');
    }

    if (replacers) {
      processReplacers(path, replacers);
    }

    var sp = this, 
      cursor = 0;
  
    while (sp && cursor < path.length) {
      sp = sp.findById(path[cursor]);
      cursor++;
    }

    return sp;
  };

  BasicElement.prototype.set_actual = function (val) {
    this.actual = val;
  };

  BasicElement.prototype.childChanged = function (el, name, value) {
    if ('actual' === name && value) {
      this.set('actual', true);
      return; ///this one will emmit childChanged ....
    }
    return this.__parent ? this.__parent.childChanged(el, name, value) : undefined;
  };

  return BasicElement;
}

module.exports = createBasicElement;
