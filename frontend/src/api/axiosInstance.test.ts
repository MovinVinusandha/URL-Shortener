import axiosInstance from './axiosInstance';
import axios from 'axios';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('axios', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    default: {
      ...actual.default,
      create: actual.default.create,
      isAxiosError: actual.default.isAxiosError,
      post: vi.fn(),
    },
  };
});

describe('axiosInstance interceptors', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    
    // Mock the adapter to simulate network responses without hitting the real network
    axiosInstance.defaults.adapter = async (config) => {
      if (config.url === '/test-200') {
        return { data: 'ok', status: 200, statusText: 'OK', headers: {}, config } as any;
      }
      if (config.url === '/test-401') {
        const error: any = new Error('Unauthorized');
        error.response = { status: 401, data: {} };
        error.isAxiosError = true;
        error.config = config;
        throw error;
      }
      return { data: 'not found', status: 404, statusText: 'Not Found', headers: {}, config } as any;
    };
  });

  it('attaches Authorization header if token exists in localStorage', async () => {
    localStorage.setItem('token', 'fake-jwt-token');
    
    const response = await axiosInstance.get('/test-200');
    
    expect(response.config.headers['Authorization']).toBe('Bearer fake-jwt-token');
  });

  it('does not attach Authorization header if token does not exist', async () => {
    const response = await axiosInstance.get('/test-200');
    
    expect(response.config.headers['Authorization']).toBeUndefined();
  });

  it('triggers silent refresh on 401 response', async () => {
    // We expect the original request to fail with 401, then interceptor catches it,
    // calls axios.post('/auth/refresh'), then retries the original request.
    
    (axios.post as any).mockResolvedValue({
      data: { token: 'new-refreshed-token' }
    });

    // To prevent the retry from failing with 401 again and throwing,
    // let's change the adapter to return 200 on the retry (it will have the new token).
    let callCount = 0;
    axiosInstance.defaults.adapter = async (config) => {
      callCount++;
      if (callCount === 1) {
        const error: any = new Error('Unauthorized');
        error.response = { status: 401, data: {} };
        error.isAxiosError = true;
        error.config = config;
        throw error;
      }
      return { data: 'retry ok', status: 200, statusText: 'OK', headers: {}, config } as any;
    };

    const response = await axiosInstance.get('/test-401');
    
    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining('/auth/refresh'),
      {},
      { withCredentials: true }
    );
    
    expect(localStorage.getItem('token')).toBe('new-refreshed-token');
    expect(response.config.headers['Authorization']).toBe('Bearer new-refreshed-token');
    expect(response.data).toBe('retry ok');
  });
});
