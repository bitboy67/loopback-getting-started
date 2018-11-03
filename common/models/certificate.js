'use strict';

var _ = require('underscore');

module.exports = function (Certificate) {

  Certificate.afterRemote('find', function (ctx, cert, next) {
    if (ctx.result) {
      ctx.result = {
        'data': cert
      };
    }
    next();
  });

};
