import * as core from '@actions/core';
import { cleanup, run } from './main';

const IsPost = core.getState('isPost') === 'true';

if (!IsPost) {
  core.saveState('isPost', 'true')
}

// Main
if (!IsPost) {
  run();
}
// Post
else {
  cleanup();
}
