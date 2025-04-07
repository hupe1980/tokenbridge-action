import * as core from '@actions/core';
import { errorMessage } from '../helpers';

export function cleanup() {
  try {
  } catch (error) {
    core.setFailed(errorMessage(error));
  }
}

if (require.main === module) {
  try {
    cleanup();
  } catch (error) {
    core.setFailed(errorMessage(error));
  }
}
