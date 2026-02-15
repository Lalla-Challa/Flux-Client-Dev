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

export interface UpdateRepoOptions {
    name?: string;
    description?: string;
    private?: boolean;
    default_branch?: string;
}

export interface CloneProgress {
    message: string;
    percentage?: number;
}

export interface GitHubWorkflow {
    id: number;
    node_id: string;
    name: string;
    path: string;
    state: string;
    created_at: string;
    updated_at: string;
    url: string;
    html_url: string;
    badge_url: string;
}

export interface GitHubWorkflowRun {
    id: number;
    name: string | null;
    node_id: string;
    head_branch: string;
    head_sha: string;
    path: string;
    display_title: string;
    status: string;
    conclusion: string | null;
    workflow_id: number;
    url: string;
    event: string;
    html_url: string;
    created_at: string;
    updated_at: string;
    actor: {
        login: string;
        avatar_url: string;
    };
    run_attempt: number;
    run_started_at: string;
    triggering_actor: {
        login: string;
        avatar_url: string;
    };
    duration_ms?: number;
}

export interface GitHubJob {
    id: number;
    run_id: number;
    run_url: string;
    node_id: string;
    head_sha: string;
    url: string;
    html_url: string | null;
    status: string;
    conclusion: string | null;
    started_at: string;
    completed_at: string | null;
    name: string;
    steps: {
        name: string;
        status: string;
        conclusion: string | null;
        number: number;
        started_at: string | null;
        completed_at: string | null;
    }[];
    check_run_url: string;
    labels: string[];
    runner_id: number | null;
    runner_name: string | null;
    runner_group_id: number | null;
    runner_group_name: string | null;
}
