'use strict';

var request = require("request");

module.exports = function (Request) {

  Request.afterRemote('find', function (ctx, request, next) {
    if (ctx.result) {
      ctx.result = {
        'data': request
      };
    }
    next();
  });

};