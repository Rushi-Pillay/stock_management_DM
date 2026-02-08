const GITHUB_API_BASE = 'https://api.github.com';

/**
 * Make an authenticated request to GitHub API
 * @param {string} endpoint
 * @param {string} token
 * @param {object} options
 * @returns {Promise<Response>}
 */
export async function githubRequest(endpoint, token, options = {}) {
    if (!token) {
        throw new Error('Not authenticated');
    }

    const response = await fetch(`${GITHUB_API_BASE}${endpoint}`, {
        ...options,
        headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
            'Content-Type': 'application/json',
            ...options.headers
        }
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || `GitHub API error: ${response.status}`);
    }

    return response;
}
