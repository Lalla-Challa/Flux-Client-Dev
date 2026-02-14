import * as https from 'https';

// ─── Types ───────────────────────────────────────────────────────

export interface GitHubRepo {
    id: number;
    name: string;
    full_name: string;
    description: string | null;
    private: boolean;
    html_url: string;
    clone_url: string;
    ssh_url: string;
    owner: {
        login: string;
        avatar_url: string;
    };
    default_branch: string;
    language: string | null;
    stargazers_count: number;
    forks_count: number;
    updated_at: string;
    pushed_at: string;
    created_at: string;
    archived: boolean;
    fork: boolean;
}

export interface CreateRepoOptions {
    name: string;
    description?: string;
    private?: boolean;
    auto_init?: boolean;
    gitignore_template?: string;
    license_template?: string;
}

export interface UpdateRepoOptions {
    name?: string;
    description?: string;
    private?: boolean;
    default_branch?: string;
}

// ─── GitHub Service ─────────────────────────────────────────────

export class GitHubService {
    private readonly baseUrl = 'api.github.com';

    /**
     * Fetch all repositories for the authenticated user
     */
    async getUserRepos(token: string): Promise<GitHubRepo[]> {
        console.log('Starting comprehensive repo fetch...');

        // 1. Fetch user's repos (includes personal and some org repos)
        // We explicitly ask for 'all' types to get private ones
        const userReposPromise = this.fetchPaginatedRepos(token, '/user/repos?type=all&sort=updated');

        // 2. Fetch user's organizations
        let orgs: any[] = [];
        try {
            orgs = await this.request<any[]>(token, 'GET', '/user/orgs');
            console.log(`Found ${orgs.length} organizations`);
        } catch (e) {
            console.error('Failed to fetch orgs:', e);
        }

        // 3. Fetch repos for each organization explicitly
        // This handles cases where /user/repos misses some restricted org repos
        const orgReposPromises = orgs.map(org =>
            this.fetchPaginatedRepos(token, `/orgs/${org.login}/repos?type=all&sort=updated`)
                .catch(err => {
                    console.error(`Failed to fetch repos for org ${org.login}:`, err);
                    return [];
                })
        );

        // Execute all requests in parallel
        const [userRepos, ...orgReposArrays] = await Promise.all([userReposPromise, ...orgReposPromises]);

        // 4. Merge and Deduplicate
        const allRepos = [...userRepos, ...orgReposArrays.flat()];
        const uniqueReposMap = new Map<number, GitHubRepo>();

        allRepos.forEach(repo => {
            if (!uniqueReposMap.has(repo.id)) {
                uniqueReposMap.set(repo.id, repo);
            }
        });

        const uniqueRepos = Array.from(uniqueReposMap.values());
        console.log(`Fetch complete. Total unique repos: ${uniqueRepos.length} (Private: ${uniqueRepos.filter(r => r.private).length})`);

        return uniqueRepos;
    }

    private async fetchPaginatedRepos(token: string, path: string): Promise<GitHubRepo[]> {
        const repos: GitHubRepo[] = [];
        let page = 1;
        let hasMore = true;
        const separator = path.includes('?') ? '&' : '?';

        while (hasMore) {
            const url = `${path}${separator}per_page=100&page=${page}`;
            // console.log(`Fetching: ${url}`);

            try {
                const pageRepos = await this.request<GitHubRepo[]>(token, 'GET', url);
                if (!Array.isArray(pageRepos) || pageRepos.length === 0) break;

                repos.push(...pageRepos);
                hasMore = pageRepos.length === 100;
                page++;
            } catch (error) {
                console.error(`Error fetching page ${page} of ${path}:`, error);
                break;
            }
        }
        return repos;
    }

    /**
     * Create a new GitHub repository
     */
    async createRepo(token: string, options: CreateRepoOptions): Promise<GitHubRepo> {
        return this.request<GitHubRepo>(token, 'POST', '/user/repos', options);
    }

    /**
     * Update repository settings
     */
    async updateRepo(
        token: string,
        owner: string,
        repo: string,
        updates: UpdateRepoOptions
    ): Promise<GitHubRepo> {
        return this.request<GitHubRepo>(token, 'PATCH', `/repos/${owner}/${repo}`, updates);
    }

    /**
     * Delete a repository
     */
    async deleteRepo(token: string, owner: string, repo: string): Promise<void> {
        await this.request<void>(token, 'DELETE', `/repos/${owner}/${repo}`);
    }

    /**
     * Get detailed repository information
     */
    async getRepoDetails(token: string, owner: string, repo: string): Promise<GitHubRepo> {
        return this.request<GitHubRepo>(token, 'GET', `/repos/${owner}/${repo}`);
    }

    /**
     * Check if a repository name is available
     */
    async checkRepoExists(token: string, owner: string, repo: string): Promise<boolean> {
        try {
            await this.getRepoDetails(token, owner, repo);
            return true;
        } catch (error: any) {
            if (error.message?.includes('404')) return false;
            throw error;
        }
    }

    async renameRepo(token: string, owner: string, repo: string, newName: string): Promise<GitHubRepo> {
        return this.request(token, 'PATCH', `/repos/${owner}/${repo}`, { name: newName });
    }

    async setRepoVisibility(token: string, owner: string, repo: string, isPrivate: boolean): Promise<GitHubRepo> {
        return this.request(token, 'PATCH', `/repos/${owner}/${repo}`, { private: isPrivate });
    }

    async getCollaborators(token: string, owner: string, repo: string): Promise<any[]> {
        return this.request(token, 'GET', `/repos/${owner}/${repo}/collaborators`);
    }

    async addCollaborator(token: string, owner: string, repo: string, username: string): Promise<void> {
        await this.request(token, 'PUT', `/repos/${owner}/${repo}/collaborators/${username}`);
    }

    async removeCollaborator(token: string, owner: string, repo: string, username: string): Promise<void> {
        await this.request(token, 'DELETE', `/repos/${owner}/${repo}/collaborators/${username}`);
    }

    async getPullRequests(token: string, owner: string, repo: string): Promise<any[]> {
        return this.request(token, 'GET', `/repos/${owner}/${repo}/pulls?state=open`);
    }

    /**
     * Update repository default branch
     */
    async updateDefaultBranch(token: string, owner: string, repo: string, branch: string): Promise<void> {
        await this.request(token, 'PATCH', `/repos/${owner}/${repo}`, {
            default_branch: branch
        });
    }

    /**
     * Get protected branches for a repository
     */
    async getProtectedBranches(token: string, owner: string, repo: string): Promise<any[]> {
        try {
            return await this.request<any[]>(token, 'GET', `/repos/${owner}/${repo}/branches?protected=true`);
        } catch (error) {
            console.error('Failed to fetch protected branches:', error);
            return [];
        }
    }

    /**
     * Get branch protection rules
     */
    async getBranchProtection(token: string, owner: string, repo: string, branch: string): Promise<any> {
        return await this.request(token, 'GET', `/repos/${owner}/${repo}/branches/${branch}/protection`);
    }

    /**
     * Add branch protection
     */
    async addBranchProtection(
        token: string,
        owner: string,
        repo: string,
        branch: string,
        rules?: {
            required_status_checks?: any;
            enforce_admins?: boolean;
            required_pull_request_reviews?: any;
            restrictions?: any;
        }
    ): Promise<void> {
        const defaultRules = {
            required_status_checks: null,
            enforce_admins: false,
            required_pull_request_reviews: {
                required_approving_review_count: 1
            },
            restrictions: null
        };

        await this.request(token, 'PUT', `/repos/${owner}/${repo}/branches/${branch}/protection`, {
            ...defaultRules,
            ...rules
        });
    }

    /**
     * Remove branch protection
     */
    async removeBranchProtection(token: string, owner: string, repo: string, branch: string): Promise<void> {
        await this.request(token, 'DELETE', `/repos/${owner}/${repo}/branches/${branch}/protection`);
    }

    // ─── Helpers ────────────────────────────────────────────────────

    private request<T = any>(
        token: string,
        method: string,
        path: string,
        body?: any
    ): Promise<T> {
        return new Promise((resolve, reject) => {
            const postData = body ? JSON.stringify(body) : undefined;

            const options = {
                hostname: this.baseUrl,
                port: 443,
                path,
                method,
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: 'application/vnd.github.v3+json',
                    'User-Agent': 'GitFlow-Desktop',
                    'Content-Type': 'application/json',
                    ...(postData ? { 'Content-Length': Buffer.byteLength(postData) } : {}),
                },
            };

            const req = https.request(options, (res) => {
                let data = '';
                res.on('data', (chunk) => {
                    data += chunk;
                });
                res.on('end', () => {
                    if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                        try {
                            // DELETE returns 204 with no content
                            if (res.statusCode === 204) {
                                resolve(undefined as T);
                            } else {
                                resolve(JSON.parse(data));
                            }
                        } catch {
                            reject(new Error('Failed to parse GitHub API response'));
                        }
                    } else {
                        try {
                            const error = JSON.parse(data);
                            let errorMessage = `GitHub API error (${res.statusCode}): ${error.message || 'Unknown error'}`;
                            if (error.errors && Array.isArray(error.errors)) {
                                const details = error.errors.map((e: any) => e.message || e.code).join(', ');
                                errorMessage += ` (${details})`;
                            }
                            reject(new Error(errorMessage));
                        } catch {
                            reject(new Error(`GitHub API error (${res.statusCode})`));
                        }
                    }
                });
            });

            req.on('error', (err) => {
                reject(new Error(`GitHub API request failed: ${err.message}`));
            });

            if (postData) {
                req.write(postData);
            }
            req.end();
        });
    }
}
