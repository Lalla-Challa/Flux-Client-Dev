// GitHub types matching preload interface
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

export interface CloneProgress {
    message: string;
    percentage?: number;
}
