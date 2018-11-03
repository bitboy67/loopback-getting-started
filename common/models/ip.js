'use strict';

var _ = require('underscore');

module.exports = function(Ip) {

  Ip.afterRemote('find', function(ctx, ip, next) {
    if(ctx.result) {

        var data = [];
        var ipobj = {}
        _.each(ip[0].data, function(val, index) {
                data.push(val.json.result)
        })
	var flat = _.flatten(data)
        _.each(flat, function(e,i) {
                e.actions = null
        })

      ctx.result = {"data": flat}
    }
    next();
  });

};
