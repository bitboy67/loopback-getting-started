'use strict';

module.exports = function(Application) {

  Application.afterRemote('find', function(ctx, application, next) {
    if(ctx.result) {
      ctx.result = {'data': application};
    }
    next();
  });

};
