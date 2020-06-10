function createFromDataCreatorMixin (lib, elements, datafilterslib, mylib) {
  'use strict';

  function FromDataCreatorMixin () {
    if (!lib.isFunction(this.super_set_data)) {
      throw new lib.Error('FROMDATACREATORMIXIN_NOT_APPLICABLE', this.constructor.name+' must have the super_set_data method, that calls set_data on the super class');
    }
    this.subElements = [];
  }
  FromDataCreatorMixin.prototype.destroy = function () {
    if (this.subElements) {
      lib.arryDestroyAll(this.subElements);
    }
    this.subElements = null;
  };
  FromDataCreatorMixin.prototype.set_data = function (data) {
    //Implementor MUST have the super_set_data method!
    this._purgeSubElements(data);
    if (lib.isArray(data)) {
      this.createFromArryData(data);
    }
    return this.super_set_data(data);
  };
  FromDataCreatorMixin.prototype.createFromArryData = function (data) {
    if (this.getConfigVal('prependsubelements')) {
      data = data.slice();
      data.reverse();
    }
    data.forEach(this.createFromArryItem.bind(this));
  };
  FromDataCreatorMixin.prototype.createFromArryItem = function (item) {
    var desc = this.createDescriptorFromArryItem(item),
      testel;
    if (desc) {
      try {
        testel = this.getElement(desc.name);
        if(testel) {
          testel.set('data', item);
          return;
        }
      } catch(e) {}
      desc.options = desc.options || {};
      if (this.getConfigVal('prependsubelements')) {
        desc.options.attach_to_parent = 'prepend';
      }
      desc.options.data = item;
      elements.BasicElement.createElement(desc, this.addFromDataChild.bind(this));
      return;
    }
    console.warn(this.constructor.name, 'created no descriptor from', item, 'so no child will be produced');
  };
  FromDataCreatorMixin.prototype.addFromDataChild = function (chld) {
    this.subElements.push(this.destructableForSubElements(chld));
    this.addChild(chld);
  };
  FromDataCreatorMixin.prototype.destructableForSubElements = function (chld) {
    return chld;
  };
  FromDataCreatorMixin.prototype.createDescriptorFromArryItem = function (item) {
    if (lib.isFunction(this.config.subDescriptorFromData)) {
      return this.config.subDescriptorFromData.call(this, item);
    }
    /*
    lib.extend({
      name: this.config.data2Name(item)
    }, this.config.subDescriptor)
    */
  };
  FromDataCreatorMixin.prototype.prependData = function (data) {
    var myprependsubelements = this.getConfigVal('prependsubelements') || false;
    this.setConfigVal('prependsubelements', true, true);
    this.set('data', data);
    this.setConfigVal('prependsubelements', myprependsubelements, true);
  };
  FromDataCreatorMixin.prototype.appendData = function (data) {
    var myprependsubelements = this.getConfigVal('prependsubelements') || false;
    this.setConfigVal('prependsubelements', false, true);
    this.set('data', data);
    this.setConfigVal('prependsubelements', myprependsubelements, true);
  };
  FromDataCreatorMixin.prototype._purgeSubElements = function (data) {
    if (data === null || !this.getConfigVal('skip_purge_subelements')) {
      lib.arryDestroyAll(this.subElements);
      this.subElements = [];
    }
  };
  FromDataCreatorMixin.prototype.filterSubElements = function (filterdesc, bothmatchingandunmatching) {
    var f, ret, _ret;
    ret = bothmatchingandunmatching ? {matching: [], unmatching: []} : [];
    if (!(lib.isArray(this.subElements) && this.subElements.length>0)) {
      return ret;
    }
    f = datafilterslib.createFromDescriptor(filterdesc);
    if (!f) {
      return;
    }
    _ret = ret;
    this.subElements.forEach(filterer.bind(null, f, bothmatchingandunmatching, _ret));
    _ret = null;
    bothmatchingandunmatching = null;
    f.destroy();
    f = null;
    return ret;
  };
  function filterer (f, bothmatchingandunmatching, ret, chld) {
    var data = chld.get('data');
    if (f.isOK(data)) {
      if (bothmatchingandunmatching) {
        ret.matching.push(chld);
        return;
      }
      ret.push(chld);
      return;
    }
    if (bothmatchingandunmatching) {
      ret.unmatching.push(chld);
    }
  }
  FromDataCreatorMixin.prototype.traverseSubElementsWithFilter = function (filterdesc, cb) {
    var f;
    if (!(lib.isArray(this.subElements) && this.subElements.length>0)) {
      return;
    }
    if (!lib.isFunction(cb)) {
      return;
    }
    f = datafilterslib.createFromDescriptor(filterdesc);
    if (!f) {
      return;
    }
    this.subElements.forEach(filtertraverser.bind(null, f, cb));
    f.destroy();
    f = null;
    cb = null;
  };
  function filtertraverser (f, cb, chld) {
    cb (chld, f.isOK(chld.get('data')));
    /*
    var d = chld.get('data');
    console.log('data', d, 'f.isOK', f.isOK(d));
    cb(chld, f.isOK(d));
    */
  }
  FromDataCreatorMixin.prototype.actualizeSubElementsWithFilter = function (filterdesc) {
    this.traverseSubElementsWithFilter(filterdesc, function (chld, isok) {chld.set('actual', isok);});
  };

  FromDataCreatorMixin.addMethods = function (klass) {
    lib.inheritMethods(klass, FromDataCreatorMixin
      ,'set_data'
      ,'createFromArryData'
      ,'createFromArryItem'
      ,'addFromDataChild'
      ,'destructableForSubElements'
      ,'createDescriptorFromArryItem'
      ,'prependData'
      ,'appendData'
      ,'filterSubElements'
      ,'traverseSubElementsWithFilter'
      ,'actualizeSubElementsWithFilter'
      ,'_purgeSubElements'
    );
  };

  mylib.FromDataCreator = FromDataCreatorMixin;
}
module.exports = createFromDataCreatorMixin;
