function create (lib, Hierarchy) {
  'use strict';

  var ChangeableListenable = lib.ChangeableListenable,
    Parent = Hierarchy.Parent;

  function BasicParent () {
    Parent.call(this);
    ChangeableListenable.call(this);
  }
  lib.inherit(BasicParent, Parent);
  ChangeableListenable.addMethods (BasicParent);

  BasicParent.prototype.__cleanUp = function () {
    ChangeableListenable.prototype.__cleanUp.call(this);
    Parent.prototype.__cleanUp.call(this);
  };

  function findById (id, item) {
    if (id === item.get('id')) return item;
  }

  BasicParent.prototype.findById = function (id) {
    return this.__children.traverseConditionally (findById.bind(null, id));
  };

  function processReplacer (replacers, item, index, arr){
    var regexp;
    for (var i in replacers) {
      regexp = new RegExp ('\{'+i+'\}', 'g');
      item = item.replace(regexp, replacers[i]);
      regexp = null;
      arr[index] = item;
    }
  }

  function processReplacers (path, replacers) {
    path.forEach(processReplacer.bind(null, replacers));
  }

  BasicParent.prototype.childAtPath = function (path, replacers) {
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


  return BasicParent;
}

module.exports = create;
