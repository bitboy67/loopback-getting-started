'use strict';

module.exports = function(Job) {

  Job.afterRemote('find', function(ctx, job, next) {
    if(ctx.result) {
      ctx.result = {'data': job};
    }
    next();
  });


};
