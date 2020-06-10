function createDataElementMixin (lib, mylib) {
  'use strict';

  var q = lib.q,
    DataUpdaterMixin = mylib.DataUpdaterMixin;

  function DataElementMixIn () {
    this.data = null;
    this.busy = false;
  }

  DataElementMixIn.prototype.__cleanUp = function () {
    this.data = null;
    this.busy = null;
  };

  DataElementMixIn.prototype.preInitializeData = function () {
    //this.data = null;
    this.set('data', null);
  };
  DataElementMixIn.prototype.postInitializeData = function () {
    var data = this.getConfigVal('data');
    if (lib.isVal(data)) {
      this.set('data', data);
    }
  };

  DataElementMixIn.prototype.set_data = function (data) {
    var f;
    this.tryDataMarkup(data);
    f = this.getConfigVal('dataHandler');
    if (lib.isFunction(f)) return f(this.$element, data);

    if (this.data === data) return false;
    this.onNullData(null === data);
    this.onEmptyDataArray(lib.isArray(data) && data.length===0);
    this.data = data;
    return true;
  };

  DataElementMixIn.prototype.onNullData = function () {
  };

  DataElementMixIn.prototype.onEmptyDataArray = function () {
  };

  DataElementMixIn.prototype.extendDatWith = function (data) {
    this.set('data', lib.extend({}, this.get('data'), data));
  };

  DataElementMixIn.prototype.hasDataChanged = function (ret) {
    return lib.isUndef(ret) || ret === true;
  };

  DataElementMixIn.prototype.set_busy = function (val) {
    this.busy = val;
    console.log(this.get('id'), 'reported busy', val);
  };

  DataElementMixIn.prototype.tryDataMarkup = function (data) {
    var dm, m;
    if (!this.$element) {
      return;
    }
    dm = this.getConfigVal('data_markup');
    if (!dm) {
      return;
    }
    m = this.produceDataMarkup(dm, data);
    this.$element.html(m);
    this.__children.traverse(function (c) {c.initialize();});
    //this.$element.html(this.produceDataMarkup.bind(this, dm, data));
  };

  var _dmre = new RegExp('{{(.*?)}}', 'gm');
  DataElementMixIn.prototype.produceDataMarkup = function (dm, item) {
    var m;
    if (lib.isArray(item)) {
      return item.map(this.produceDataMarkup.bind(this, dm)).join(' ');
    }
    if (!lib.isString(dm)) {
      return '';
    }
    return dm.replace(_dmre, this.doubleBracesSubstituter.bind(this, item));
  }
  DataElementMixIn.prototype.doubleBracesSubstituter = function (item, ignoretotalstr, str) {
    var ret;
    try {
      ret = pretty(eval(str));
    }
    catch (ignore) {
      ret = '';
    }
    return ret;
  }
  function pretty (thingy) {
    if (!lib.isVal(thingy)) {
      return thingy;
    }
    if (lib.isNumber(thingy)) {
      return thingy;
    }
    if (lib.isString(thingy)) {
      return thingy;
    }
    if (lib.isBoolean(thingy)) {
      return thingy;
    }
    return JSON.stringify(thingy);
  }

  DataElementMixIn.addMethods = function (klass) {
    DataUpdaterMixin.addMethods(klass);
    lib.inheritMethods (klass, DataElementMixIn
      ,'preInitializeData'
      ,'postInitializeData'
      ,'set_data'
      ,'onNullData'
      ,'onEmptyDataArray'
      ,'extendDatWith'
      ,'hasDataChanged'
      ,'set_busy'
      ,'tryDataMarkup'
      ,'produceDataMarkup'
      ,'doubleBracesSubstituter'
    );
  };

  mylib.DataElementMixin = DataElementMixIn;
}

module.exports = createDataElementMixin;
