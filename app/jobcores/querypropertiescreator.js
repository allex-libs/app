function createQueryPropertiesJobCore (lib, mylib) {
  'use strict';

  var Base = mylib.Base;

  function QueryPropertiesJobCore (app, queryobj) {
    Base.call(this, app);
    this.queryobj = queryobj;
    this.promises = [];
    this.queryResult = {};
  }
  lib.inherit(QueryPropertiesJobCore, Base);
  QueryPropertiesJobCore.prototype.destroy = function () {
    this.queryResult = null;
    this.promises = [];
    this.queryobj = null;
    Base.prototype.destroy.call(this);
  };

  QueryPropertiesJobCore.prototype.init = function () {
    this.promises = [];
    lib.traverseShallow(this.queryobj, this.onQueryItem.bind(this));
    if (this.promises && this.promises.length>0) {
      return lib.q.all(this.promises);
    }
    return null;
  };

  QueryPropertiesJobCore.prototype.finalize = function () {
    return this.queryResult;
  };

  QueryPropertiesJobCore.prototype.steps = [
    'init',
    'finalize'
  ];

  QueryPropertiesJobCore.prototype.onQueryItem = function (itemval, itemname) {
    this.promises.push(this.app.queryProperty(itemval).then(this.onQueryItemValue.bind(this, itemname)));
    itemname = null;
  };
  QueryPropertiesJobCore.prototype.onQueryItemValue = function (itemname, itemvalue) {
    lib.writePropertyFromDotDelimitedString(this.queryResult, itemname, itemvalue, true);
  };

  mylib.QueryProperties = QueryPropertiesJobCore;
}
module.exports = createQueryPropertiesJobCore;