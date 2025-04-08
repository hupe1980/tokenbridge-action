import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as core from '@actions/core';
import * as helpers from '../src/helpers';
import { run, cleanup } from '../src/main';

vi.mock('@actions/core', async () => ({
  ...(await vi.importActual('@actions/core') as {}),
  getInput: vi.fn(),
  setSecret: vi.fn(),
  setOutput: vi.fn(),
  exportVariable: vi.fn(),
  setFailed: vi.fn(),
  warning: vi.fn(),
}));

vi.mock('../src/helpers', () => ({
  getIDToken: vi.fn(),
  exchangeToken: vi.fn(),
  errorMessage: (e: unknown) => (e instanceof Error ? e.message : String(e)),
}));

describe('run', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SHOW_STACK_TRACE = 'false';
  });

  it('should get ID token, exchange it and set outputs', async () => {
    vi.mocked(core.getInput)
      .mockImplementation((name: string) => {
        if (name === 'audience') return 'my-audience';
        if (name === 'tokenbridge-url') return 'https://bridge.example.com';
        return '';
      });

    vi.mocked(helpers.getIDToken).mockResolvedValue('mock-id-token');
    vi.mocked(helpers.exchangeToken).mockResolvedValue({ access_token: 'mock-access-token' });

    await run();

    expect(core.setSecret).toHaveBeenCalledWith('mock-access-token');
    expect(core.setOutput).toHaveBeenCalledWith('tokenbridge-access-token', 'mock-access-token');
    expect(core.exportVariable).toHaveBeenCalledWith('TOKENBRIDGE_ACCESS_TOKEN', 'mock-access-token');
    expect(core.setFailed).not.toHaveBeenCalled();
  });

  it('should call setFailed and not throw if error occurs', async () => {
    vi.mocked(core.getInput).mockImplementation((name: string) => {
      if (name === 'tokenbridge-url') return 'https://bridge.example.com';
      return '';
    });

    vi.mocked(helpers.getIDToken).mockRejectedValue(new Error('token error'));

    await run();

    expect(core.setFailed).toHaveBeenCalledWith('Action failed: token error');
  });

  it('should rethrow error if SHOW_STACK_TRACE is true', async () => {
    process.env.SHOW_STACK_TRACE = 'true';

    vi.mocked(core.getInput).mockImplementation((name: string) => {
      if (name === 'tokenbridge-url') return 'https://bridge.example.com';
      return '';
    });

    vi.mocked(helpers.getIDToken).mockRejectedValue(new Error('critical'));

    await expect(run()).rejects.toThrow('critical');
  });
});

describe('cleanup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should clear TOKENBRIDGE_ACCESS_TOKEN', () => {
    cleanup();
    expect(core.exportVariable).toHaveBeenCalledWith('TOKENBRIDGE_ACCESS_TOKEN', '');
  });

  it('should log a warning if exportVariable fails', () => {
    vi.mocked(core.exportVariable).mockImplementation(() => {
      throw new Error('fail');
    });

    cleanup();

    expect(core.warning).toHaveBeenCalledWith('Cleanup failed: fail');
  });
});
