import * as core from '@actions/core';
import { cleanup, run } from './main';

const IsPost = !!core.getState('isPost');

// Main
if (!IsPost) {
  run();
}
// Post
else {
  cleanup();
}
