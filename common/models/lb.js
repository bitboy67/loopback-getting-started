'use strict';

module.exports = function(Lb) {

  Lb.afterRemote('find', function(ctx, lb, next) {
    if(ctx.result) {
      ctx.result = {'data': lb};
    }
    next();
  });

};