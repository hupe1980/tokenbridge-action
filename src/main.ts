import * as core from '@actions/core';
import { errorMessage, exchangeToken, getIDToken } from './helpers';

/**
 * Main GitHub Action entrypoint.
 *
 * Retrieves an OIDC ID token, exchanges it via TokenBridge,
 * and sets the resulting access token as an output, secret, and env variable.
 */
export async function run(): Promise<void> {
  try {
    const audience = core.getInput('audience', { required: false });
    const tokenbridgeUrl = core.getInput('tokenbridge-url', { required: true });
    const outputAccessToken = core.getBooleanInput('output-access-token', { required: false });
    const customClaimsInput = core.getInput('custom-claims', { required: false });

    // Parse custom claims
    let customClaims = {};
    if (customClaimsInput) {
      customClaims = JSON.parse(customClaimsInput);
    }

    core.startGroup('TokenBridge Id2Access Token Exchange');
    core.info(`Audience: ${audience}`);
    core.info(`TokenBridge URL: ${tokenbridgeUrl}`);
    core.info(`Custom Claims: ${JSON.stringify(customClaims)}`);

    const idToken = await getIDToken(audience);

    const exchangedToken = await exchangeToken(tokenbridgeUrl, idToken, customClaims);

    core.endGroup();

    const { access_token: accessToken } = exchangedToken;

    core.setSecret(accessToken);

    core.exportVariable('TOKENBRIDGE_ACCESS_TOKEN', accessToken);

    if (outputAccessToken) {
      core.setOutput('access-token', accessToken);
    }
  } catch (error) {
    core.setFailed(`Action failed: ${errorMessage(error)}`);

    if (process.env.SHOW_STACK_TRACE === 'true') {
      throw error;
    }
  }
}

/**
 * Post-execution cleanup step.
 *
 * Clears sensitive environment variables to prevent exposure in subsequent steps.
 */
export function cleanup(): void {
  try {
    core.exportVariable('TOKENBRIDGE_ACCESS_TOKEN', '');
    core.info('Cleared TOKENBRIDGE_ACCESS_TOKEN from environment variables.');
  } catch (error) {
    core.warning(`Cleanup failed: ${errorMessage(error)}`);
  }
}
