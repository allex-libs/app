function create (lib, Hierarchy, bufferableeventlib) {
  'use strict';

  var ChangeableListenable = lib.ChangeableListenable,
    Destroyable = lib.Destroyable,
    Parent = Hierarchy.Parent,
    Listenable = lib.Listenable,
    BufferableHookCollectionContainerMixin = bufferableeventlib.BufferableHookCollectionContainerMixin,
    BufferableHookCollection = bufferableeventlib.BufferableHookCollection;

  function BasicParent () {
    Parent.call(this);
    Destroyable.call(this);
    ChangeableListenable.call(this);
    BufferableHookCollectionContainerMixin.call(this);
  }
  lib.inherit(BasicParent, Parent);
  BasicParent.prototype.destroy = Destroyable.prototype.destroy;
  BasicParent.prototype.extendTo = Destroyable.prototype.extendTo;
  BasicParent.prototype.shouldDie = Destroyable.prototype.shouldDie;
  ChangeableListenable.addMethods (BasicParent);
  BufferableHookCollectionContainerMixin.addMethods (BasicParent);

  BasicParent.prototype.__cleanUp = function () {
    BufferableHookCollectionContainerMixin.prototype.destroy.call(this);
    ChangeableListenable.prototype.__cleanUp.call(this);
    Parent.prototype.__cleanUp.call(this);
  };
  BasicParent.prototype.attachListener = function (evntname, cborpropname, cb){
    var ret = Listenable.prototype.attachListener.call(this, evntname, cborpropname, cb);
    if ('changed' === evntname && lib.isString(cborpropname)) {
      lib.runNext (fireOnAttach.bind(null, this, cborpropname, cb));
    }
    return ret;
  };
  BasicParent.prototype.justAttachListener = function (evntname, cborpropname, cb){
    return Listenable.prototype.attachListener.call(this, evntname, cborpropname, cb);
  };

  function fireOnAttach (self, propname, cb) {
    cb(self.get(propname));
  }

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

  BasicParent.prototype.createBufferableHookCollection = function () {
    return new BufferableHookCollection();
  };

  BasicParent.prototype.isBufferableHookCollection = function (thingy) {
    return thingy instanceof BufferableHookCollection;
  };

  BasicParent.prototype.bufferAllBufferableHookCollections = function () {
    this.__children.traverse(bufferAllBufferableHookCollections);
    BufferableHookCollectionContainerMixin.prototype.bufferAllBufferableHookCollections.call(this);
  };

  function bufferAllBufferableHookCollections (thingy) {
    thingy.bufferAllBufferableHookCollections();
  };

  BasicParent.prototype.unbufferAllBufferableHookCollections = function () {
    this.__children.traverse(unbufferAllBufferableHookCollections);
    BufferableHookCollectionContainerMixin.prototype.unbufferAllBufferableHookCollections.call(this);
  };

  function unbufferAllBufferableHookCollections (thingy) {
    thingy.unbufferAllBufferableHookCollections();
  };


  return BasicParent;
}

module.exports = create;
