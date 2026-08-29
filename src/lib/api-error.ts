
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function handleApiError(response: Response): Promise<never> {
  let errorMessage = 'An unexpected error occurred';
  let errorDetails: unknown;

  try {
    const errorData = await response.json();
    errorDetails = errorData;
    if (errorData.error && typeof errorData.error === 'string') {
      errorMessage = errorData.error;
    }
  } catch {
    // Ignore JSON parse errors
  }

  switch (response.status) {
    case 400:
      throw new ApiError(400, errorMessage || 'Invalid request', errorDetails);
    case 401:
      throw new ApiError(401, 'Please log in to continue', errorDetails);
    case 403:
      throw new ApiError(403, 'You do not have permission to perform this action', errorDetails);
    case 404:
      throw new ApiError(404, 'The requested resource was not found', errorDetails);
    case 429:
      throw new ApiError(429, 'Too many requests. Please try again later', errorDetails);
    case 500:
      throw new ApiError(500, 'Something went wrong on our end. Please try again later', errorDetails);
    case 502:
    case 503:
    case 504:
      throw new ApiError(response.status, 'Service temporarily unavailable. Please try again later', errorDetails);
    default:
      throw new ApiError(response.status, errorMessage, errorDetails);
  }
}

export async function safeFetch<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001';
    const absoluteUrl = url.startsWith('http') ? url : `${baseUrl}${url}`;

    const response = await fetch(absoluteUrl, options);
    
    if (!response.ok) {
      await handleApiError(response);
    }
    
    return await response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    
    if (error instanceof TypeError && (error.message.includes('fetch') || error.message.includes('Invalid URL'))) {
      throw new ApiError(0, 'Network error. Please check your connection.');
    }
    
    console.error('Unexpected error in safeFetch:', error);
    throw new ApiError(0, 'An unexpected error occurred');
  }
}