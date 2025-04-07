import * as core from '@actions/core';
import { errorMessage, retryAndBackoff } from './helpers';

async function getIDToken(audience: string): Promise<string> {
  try {
    return await retryAndBackoff(
      async () => {
        return core.getIDToken(audience);
      },
      false,
      5,
    );
  } catch (error) {
    throw new Error(`getIDToken call failed: ${errorMessage(error)}`);
  }
}

async function exchangeToken(tokenbridgeUrl: string, idToken: string): Promise<any> {
  try {
    const response = await fetch(`${tokenbridgeUrl}/exchange/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ idToken }),
    });

    if (!response.ok) {
      throw new Error(`Token exchange failed with status: ${response.status} - ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    throw new Error(`exchangeToken call failed: ${errorMessage(error)}`);
  }
}

export async function run() {
  try {
    const audience = core.getInput('audience', { required: false });
    const tokenbridgeUrl = core.getInput('tokenbridge-url', { required: true});

    const idToken = await getIDToken(audience);
    const exchangedToken = await exchangeToken(tokenbridgeUrl, idToken);

    core.info(`Exchanged token: ${JSON.stringify(exchangedToken)}`);
    
  } catch (error) {
    core.setFailed(`Action failed with error: ${errorMessage(error)}`);

    const showStackTrace = process.env.SHOW_STACK_TRACE;
    if (showStackTrace === 'true') {
      throw error;
    }
  }
}

if (require.main === module) {
  (async () => {
    await run();
  })().catch((error) => {
    core.setFailed(errorMessage(error));
  });
}
