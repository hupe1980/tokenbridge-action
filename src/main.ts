import * as core from '@actions/core';
import { errorMessage, exchangeToken, getIDToken } from './helpers';

const ENV_VAR_NAME = 'TOKENBRIDGE_ACCESS_TOKEN';

/**
 * Main GitHub Action entrypoint.
 *
 * Retrieves an OIDC ID token, exchanges it via TokenBridge,
 * and sets the resulting access token as an output, secret, and env variable.
 */
export async function run(): Promise<void> {
  try {
    const audience = core.getInput('audience', { required: false });
    const exchangeEndpoint = core.getInput('exchange-endpoint', { required: true });
    const outputAccessToken = core.getBooleanInput('output-access-token', { required: false });
    const customAttributesInput = core.getInput('custom-attributes', { required: false });

    // Parse custom attributes
    let customAttributes = {};
    if (customAttributesInput) {
      customAttributes = JSON.parse(customAttributesInput);
    }

    core.startGroup('TokenBridge Id2Access Token Exchange');
    core.info(`Audience: ${audience}`);
    core.info(`Exchange Endpoint: ${exchangeEndpoint}`);
    core.info(`Custom Attributes: ${JSON.stringify(customAttributes)}`);

    const idToken = await getIDToken(audience);

    const exchangedToken = await exchangeToken(exchangeEndpoint, idToken, customAttributes);

    core.endGroup();

    const { access_token: accessToken } = exchangedToken;

    core.setSecret(accessToken);

    core.exportVariable(ENV_VAR_NAME, accessToken);

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
    core.exportVariable(ENV_VAR_NAME, '');
    core.info(`Cleared ${ENV_VAR_NAME} from environment variables.`);
  } catch (error) {
    core.warning(`Cleanup failed: ${errorMessage(error)}`);
  }
}
