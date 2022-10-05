function createDataSourcesCreator (lib, dataSuite, arryopslib, mylib) {
  'use strict';

  var DescriptorArrayJobCore = mylib.DescriptorArrayJobCore,
    DataSource = require('../../datasourcecreator')(lib, dataSuite);

  function DataSourcesCreatorJobCore (descriptorloaderjobcore) {
    DescriptorArrayJobCore.call(this, descriptorloaderjobcore, 'datasources');
  }
  lib.inherit(DataSourcesCreatorJobCore, DescriptorArrayJobCore);
  DataSourcesCreatorJobCore.prototype.doOneItem = function (dsdesc) {
    var source_name, desc, environment, e_datasource, ds;
    if (!dsdesc.name) throw new Error ('Datasource has no name: '+toString(dsdesc));
    if (!dsdesc.environment) throw new Error('Datasource has no environment: '+toString(dsdesc));

    desc = this.descriptor();
    source_name = dsdesc.source || dsdesc.name;
    environment = arryopslib.findElementWithProperty(desc.environments, 'name', dsdesc.environment);

    if (!environment) throw new Error('Unable to find environment descriptor '+dsdesc.environment);
    e_datasource = arryopslib.findElementWithProperty(environment.options.datasources, 'name', source_name);
    if (!e_datasource) {
      e_datasource = arryopslib.findElementWithProperty(environment.options.datacommands, 'name', source_name);
      if (!e_datasource)
        console.warn('Unable to find datasource '+source_name+' within environment description');
    }

    if (this.app().datasources.get(dsdesc.name)) {
      return;
    }
    return {
      desc: dsdesc,
      ds: new DataSource(source_name, 'should_running' in dsdesc ? dsdesc.should_running : true, 'filter' in dsdesc ? dsdesc.filter : null, 'initial_value' in dsdesc ? dsdesc.initial_value : null)
    };

  };
  DataSourcesCreatorJobCore.prototype.parallel = true;

  mylib.DataSourcesCreatorJobCore = DataSourcesCreatorJobCore;
}
module.exports = createDataSourcesCreator;