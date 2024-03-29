function createDataSource (lib, dataSuite) {
  'use strict';

  var CLDestroyable = lib.CLDestroyable;

  function AppSideDataSource (source_name, should_running, filter, initial_value) {
    CLDestroyable.call(this);
    this.subSources = new lib.Map();
    this.should_running = should_running;
    this.running = false;
    this.source_name = source_name;
    this.initial_value = initial_value;
    this.data = initial_value;
    this.environment = null;
    this._esl = null;
    this.filter = filter;
    this.busy = false;
  }

  lib.inherit (AppSideDataSource, CLDestroyable);
  AppSideDataSource.prototype.__cleanUp = function () {
    this._unbindDS();
    this.busy = true;
    this.filter = null;
    if (this._esl) {
      this._esl.destroy();
    }
    this._esl = null;
    this.environment = null;
    this.data = null;
    this.initial_value = null;
    this.source_name = null;
    this.running = null;
    this.should_running = null;
    if (this.subSources) {
      lib.containerDestroyAll(this.subSources);
      this.subSources.destroy();
    }
    this.subSources = null;
    CLDestroyable.prototype.__cleanUp.call(this);
  };

  AppSideDataSource.prototype.getElement = function (elemname) {
    var numcheck, elem;
    if (!lib.isString(elemname)) {
      console.warn('element name', elemname, 'might be problematic?');
      throw new Error('Teach me how to deal with non-String element names...');
    }
    numcheck = parseInt(elemname);
    if (lib.isNumber(numcheck)) {
      elemname = numcheck;
    }
    elem = this.subSources.get(elemname);
    if (elem) {
      return elem;
    }
    elem = new AppSideDataSource(elemname, this.should_running, {}, this.initial_value);
    this.subSources.add(elemname, elem);
    return elem;
  };

  AppSideDataSource.prototype._processShouldRunning  = function () {
    if (this.should_running) {
      this.start();
    }else{
      this.stop();
    }
  };

  AppSideDataSource.prototype.set_should_running = function (val) {
    if (val === this.should_running) return false;
    this._processShouldRunning(val);
    return true;
  };

  AppSideDataSource.prototype.set_data = function (val) {
    if (this.data === val) return false;
    if (!this.subSources) return false;
    this.data = val;
    this.subSources.reduce(valsetter, val);
    val = null;
    return true;
  };
  AppSideDataSource.prototype.get_environmentdata = function () {
    return this.data;
  };
  AppSideDataSource.prototype.set_environmentdata = function (data) {
    var envds = this.environment ? this.environment.dataSources.get(this.source_name) : null;
    if (envds && lib.isFunction(envds.setData)) {
      envds.setData(data);
      return true;
    }
    return false;
  };
  function valsetter (val, subsource, subsourcename) {
    subsource.set('data', val ? val[subsourcename] : null);
    return val;
  }

  AppSideDataSource.prototype.set_environment = function (val) {
    if (this.environment === val) return false;
    if (this._esl) this._esl.destroy();
    this._esl = null;
    this._unbindDS();
    this.environment = val;
    if (!val) return true; //nothing to be done ...

    this._esl = this.environment.attachListener ('state', this._onEnvStateChanged.bind(this));
    //this._onEnvStateChanged(this.environment.state);
    return true;
  };

  AppSideDataSource.prototype._onEnvStateChanged = function (state) {
    if (!this.environment.isEstablished()) return this._unbindDS();
    this._processShouldRunning();
  };

  AppSideDataSource.prototype._bindToDS = function () {
    if (!this.environment || !this.environment.isEstablished()) return;
    var ds = this.environment.dataSources.get(this.source_name);
    if (!ds) {
      this.environment.dataSources.waitFor(this.source_name).then(
        this._doTheBindingToDS.bind(this)
      );
      return;
    }
    this._doTheBindingToDS(ds);
  };
  AppSideDataSource.prototype._doTheBindingToDS = function (ds) {
    ds.setFilter(this.filter);
    ds.setTarget(this);
    this.set('running', true);
  };

  AppSideDataSource.prototype._unbindDS = function () {
    var ds;
    if (!this.environment || !this.environment.isEstablished()) return;
    ds = this.environment.dataSources.get(this.source_name);
    if (ds) {
      ds.setTarget(null);
    }
    this.set('running', false);
  };

  AppSideDataSource.prototype.stop = function () {
    this.should_running = false;
    this._unbindDS();
  };

  AppSideDataSource.prototype.start = function () {
    this.should_running = true;
    this._bindToDS();
  };

  AppSideDataSource.prototype.set_filter = function (filter) {
    if (lib.isEqual(filter, this.filter)) {
      return false;
    }
    this.filter = filter;
    this.set('data', null);
    if (this.should_running && this.environment) {
      var ds = this.environment.dataSources.get(this.source_name);
      if (ds) ds.setFilter(this.filter);
    }
  };

  AppSideDataSource.prototype.filterData = function (fd) {
    var filter = ALLEX.dataSuite.filterFactory.createFromDescriptor(fd);
    var ret = null, data = this.get('data');
    if (lib.isArray(data)) {
      ret = lib.arryOperations.findToMatchFilter(data, fd);
    }
    filter.destroy();
    filter = null;
    return ret;
  };

  AppSideDataSource.prototype.findFirst = function (fd) {
    var filter = dataSuite.filterFactory.createFromDescriptor(fd);
    var ret = null, data = this.get('data');

    if (lib.isArray(data)) {
      ret = lib.arryOperations.findFirstToMatchFilter(data, fd);
    }

    filter.destroy();
    filter = null;
    return ret;
  };

  return AppSideDataSource;
}

module.exports = createDataSource;
