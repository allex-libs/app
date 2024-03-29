function createElementsCreator (lib, BasicElement, descriptorapi, mylib) {
  'use strict';

  var q = lib.q,
    DescriptorArrayJobCore = mylib.DescriptorArrayJobCore;

  function ElementsCreatorJobCore (descriptorloaderjobcore, creationcb) {
    DescriptorArrayJobCore.call(this, descriptorloaderjobcore, 'elements');
    this.creationCB = lib.isFunction(creationcb) ? creationcb : lib.dummyFunc;
  }
  lib.inherit(ElementsCreatorJobCore, DescriptorArrayJobCore);
  ElementsCreatorJobCore.prototype.destroy = function () {
    this.creationCB = null;
    DescriptorArrayJobCore.prototype.destroy.call(this);
  };
  ElementsCreatorJobCore.prototype.doOneItem = function (elemdesc) {
    var elem, d, ret;
    d = q.defer();
    ret = d.promise;
    elemdesc.options = elemdesc.options || {};
    descriptorapi.pushToArraySafe('onInitiallyLoaded', elemdesc.options, onLoadResolver.bind(null, d));
    descriptorapi.pushToArraySafe('onInitialized', elemdesc.options, onInitResolver.bind(null, d));
    elem = this.doCreate(elemdesc);
    d = null;
    return ret;
  };
  ElementsCreatorJobCore.prototype.doCreate = function (elemdesc) {
    var parentandfinalname, makeupdesc, createdbyparent;
    parentandfinalname = parentAndFinalNameForElementDescriptor(this.app(), elemdesc);
    if (!parentandfinalname) {
      throw new lib.Error('INVALID_ELEMENT_DESCRIPTOR', JSON.stringify(elemdesc)+' is not a valid element descriptor');
    }
    if (parentandfinalname.parent) {
      makeupdesc = lib.extend(lib.pickExcept(elemdesc, ['name']), {name: parentandfinalname.name});
      createdbyparent = parentandfinalname.parent.createElement(makeupdesc);
      this.creationCB(createdbyparent);
      return createdbyparent;
    }
    return BasicElement.createElement (elemdesc, this.creationCB);
  };


  function parentAndFinalNameForElementDescriptor (app, desc) {
    var namearry, possiblename;
    if (!desc) {
      return null;
    }
    if (!desc.name) {
      return null;
    }
    namearry = desc.name.split('.');
    if (namearry.length>1) {
      possiblename = namearry.pop();
      try {
        return {parent: app.getElement('element.'+namearry.join('.')), name: possiblename};
      }
      catch (e) {
        return {parent: null, name: desc.name};
      }
    }
    return {parent: null, name: desc.name};
  }

  function onLoadResolver (d, elem) {
    d.resolve(elem);
  }
  function onInitResolver (d, elem) {
    if (elem && elem.get('actual')) {
      return; //wait for load
    }
    d.resolve(elem);
  }

  ElementsCreatorJobCore.prototype.parallel = true;
  mylib.ElementsCreatorJobCore = ElementsCreatorJobCore;
}
module.exports = createElementsCreator;