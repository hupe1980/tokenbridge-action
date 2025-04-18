# TokenBridge Action

`tokenbridge-action` is a GitHub Action that retrieves an OIDC ID token, exchanges it via a TokenBridge service, and sets the resulting access token as an output, secret, and environment variable.

## Features

- Retrieves an OIDC ID token using GitHub's OIDC provider.
- Exchanges the ID token for an access token via a TokenBridge service.
- Exports the access token as:
  - A GitHub Action output.
  - A secret (to prevent accidental logging).
  - An environment variable for subsequent steps.

## Inputs

| Name                  | Description                                              | Required | Default       |
|-----------------------|----------------------------------------------------------|----------|---------------|
| `audience`            | The audience to use for the OIDC provider.               | No       | `tokenbridge` |
| `exchange-endpoint`     | The URL of the TokenBridge exchange endpoint.                      | Yes      |               |
| `output-access-token` | Whether to set the access token as a step output.        | No       | `false`       |
| `custom-claims`       | Custom claims to include in the token exchange request (JSON string). | No | `{}` |

## Outputs

| Name            | Description                              |
|------------------|------------------------------------------|
| `access-token`   | The access token generated by TokenBridge. |

## Environment Variables

| Name                       | Description                              |
|----------------------------|------------------------------------------|
| `TOKENBRIDGE_ACCESS_TOKEN` | The access token generated by TokenBridge. |

## Usage

Here’s an example of how to use the `tokenbridge-action` in a GitHub Actions workflow:

```yaml
name: TokenBridge Example

on:
  workflow_dispatch: # Allows manual triggering of the workflow

jobs:
  tokenbridge:
    runs-on: ubuntu-latest
    permissions:
      id-token: write # Required to retrieve the OIDC token
      contents: read  # Required for actions/checkout

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Run TokenBridge Action
        uses: hupe1980/tokenbridge-action@<tag or sha>
        with:
          audience: my-audience
          exchange-endpoint: https://bridge.example.com/exchange
          output-access-token: true
          custom-claims: '{"role": "admin", "scope": "read:all"}'

      - name: Use Access Token
        run: |
          echo "Access token: $TOKENBRIDGE_ACCESS_TOKEN"
```

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
