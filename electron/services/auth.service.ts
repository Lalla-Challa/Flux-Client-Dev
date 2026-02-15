import { shell } from 'electron';
import * as https from 'https';
import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { app } from 'electron';

// ─── Types ───────────────────────────────────────────────────────

export interface Account {
    id: string;
    username: string;
    avatarUrl: string;
    label: string;
    type: 'personal' | 'work' | 'client';
}

interface StoredAccount extends Account {
    token: string;
}

interface AuthConfig {
    clientId: string;
    clientSecret: string;
    scopes: string[];
    callbackPort: number;
}

// ─── Simple Encrypted File Store ─────────────────────────────────

class SecureStore {
    private filePath: string;
    private encryptionKey: Buffer;

    constructor(fileName: string) {
        const userDataPath = app.getPath('userData');
        this.filePath = path.join(userDataPath, `${fileName}.enc`);
        this.encryptionKey = crypto
            .createHash('sha256')
            .update('gitflow-secure-key-2024')
            .digest();
    }

    private encrypt(text: string): string {
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv('aes-256-cbc', this.encryptionKey, iv);
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return iv.toString('hex') + ':' + encrypted;
    }

    private decrypt(text: string): string {
        const parts = text.split(':');
        const iv = Buffer.from(parts.shift()!, 'hex');
        const encryptedText = parts.join(':');
        const decipher = crypto.createDecipheriv('aes-256-cbc', this.encryptionKey, iv);
        let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }

    read(): Record<string, any> {
        try {
            if (!fs.existsSync(this.filePath)) return {};
            const raw = fs.readFileSync(this.filePath, 'utf8');
            return JSON.parse(this.decrypt(raw));
        } catch {
            return {};
        }
    }

    write(data: Record<string, any>): void {
        const dir = path.dirname(this.filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(this.filePath, this.encrypt(JSON.stringify(data)), 'utf8');
    }

    get<T>(key: string, defaultValue: T): T {
        const data = this.read();
        return (data[key] as T) ?? defaultValue;
    }

    set(key: string, value: any): void {
        const data = this.read();
        data[key] = value;
        this.write(data);
    }
}

// ─── AuthService Class ──────────────────────────────────────────

export class AuthService {
    private store: SecureStore;
    private config: AuthConfig;
    private callbackServer: http.Server | null = null;

    constructor() {
        this.store = new SecureStore('gitflow-auth');

        this.config = {
            clientId: process.env.GITHUB_CLIENT_ID || '',
            clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
            scopes: ['repo', 'workflow', 'read:user', 'user:email'],
            callbackPort: 48462,
        };
    }

    private get redirectUri(): string {
        return `http://localhost:${this.config.callbackPort}/auth/callback`;
    }

    /**
     * Initiates the GitHub OAuth flow:
     * 1. Starts a temporary local HTTP server to receive the callback
     * 2. Opens the GitHub authorization page in the browser
     * 3. Waits for the callback, exchanges code for token
     * 4. Returns the account info
     */
    async initiateOAuth(): Promise<StoredAccount> {
        return new Promise((resolve, reject) => {
            // Kill any existing callback server
            if (this.callbackServer) {
                this.callbackServer.close();
                this.callbackServer = null;
            }

            const server = http.createServer(async (req, res) => {
                try {
                    const reqUrl = new URL(req.url || '', `http://localhost:${this.config.callbackPort}`);

                    if (reqUrl.pathname === '/auth/callback') {
                        const code = reqUrl.searchParams.get('code');
                        const error = reqUrl.searchParams.get('error');

                        if (error) {
                            res.writeHead(200, { 'Content-Type': 'text/html' });
                            res.end(this.buildResultPage(false, `Authorization denied: ${error}`));
                            server.close();
                            this.callbackServer = null;
                            reject(new Error(`OAuth error: ${error}`));
                            return;
                        }

                        if (code) {
                            try {
                                const account = await this.exchangeCodeForToken(code);
                                res.writeHead(200, { 'Content-Type': 'text/html' });
                                res.end(this.buildResultPage(true, `Welcome, ${account.username}!`));
                                server.close();
                                this.callbackServer = null;
                                resolve(account);
                            } catch (err: any) {
                                res.writeHead(200, { 'Content-Type': 'text/html' });
                                res.end(this.buildResultPage(false, err.message));
                                server.close();
                                this.callbackServer = null;
                                reject(err);
                            }
                            return;
                        }
                    }

                    res.writeHead(404);
                    res.end('Not found');
                } catch (err: any) {
                    res.writeHead(500);
                    res.end('Internal error');
                    server.close();
                    this.callbackServer = null;
                    reject(err);
                }
            });

            server.listen(this.config.callbackPort, '127.0.0.1', () => {
                this.callbackServer = server;

                const scope = this.config.scopes.join(' ');

                const params = new URLSearchParams({
                    client_id: this.config.clientId,
                    redirect_uri: this.redirectUri,
                    state: this.generateState(),
                    prompt: 'consent',
                });

                // Manually append scope to ensure %20 encoding instead of +
                const authUrl = `https://github.com/login/oauth/authorize?${params.toString()}&scope=${encodeURIComponent(scope)}`;

                shell.openExternal(authUrl);
            });

            server.on('error', (err) => {
                this.callbackServer = null;
                reject(new Error(`Failed to start auth server: ${err.message}`));
            });

            // Timeout after 5 minutes
            setTimeout(() => {
                if (this.callbackServer) {
                    this.callbackServer.close();
                    this.callbackServer = null;
                    reject(new Error('OAuth timed out after 5 minutes'));
                }
            }, 5 * 60 * 1000);
        });
    }

    /**
     * Exchanges the OAuth code for an access token, fetches user profile,
     * and stores the account securely.
     */
    async exchangeCodeForToken(code: string): Promise<StoredAccount> {
        const tokenData = await this.requestToken(code);
        const accessToken = tokenData.access_token;
        console.log(`Token obtained. Prefix: ${accessToken.substring(0, 4)}...`);

        if (!accessToken) {
            throw new Error('Failed to obtain access token');
        }

        const userProfile = await this.fetchUserProfile(accessToken);

        const account: StoredAccount = {
            id: userProfile.id.toString(),
            username: userProfile.login,
            avatarUrl: userProfile.avatar_url,
            label: userProfile.login,
            type: 'personal',
            token: accessToken,
        };

        this.saveAccount(account);

        return account;
    }

    async getAccounts(): Promise<Account[]> {
        const accounts = this.store.get<StoredAccount[]>('accounts', []);
        return accounts.map(({ token, ...account }) => account);
    }

    async getToken(username: string): Promise<string | null> {
        const accounts = this.store.get<StoredAccount[]>('accounts', []);
        const account = accounts.find((a) => a.username === username);
        return account?.token || null;
    }

    async removeAccount(username: string): Promise<void> {
        const accounts = this.store.get<StoredAccount[]>('accounts', []);
        this.store.set(
            'accounts',
            accounts.filter((a) => a.username !== username)
        );
    }

    // ── Private Helpers ──

    private saveAccount(account: StoredAccount): void {
        const accounts = this.store.get<StoredAccount[]>('accounts', []);
        const existingIdx = accounts.findIndex((a) => a.id === account.id);

        if (existingIdx >= 0) {
            accounts[existingIdx] = account;
        } else {
            accounts.push(account);
        }

        this.store.set('accounts', accounts);
    }

    private generateState(): string {
        return Math.random().toString(36).substring(2, 15);
    }

    private buildResultPage(success: boolean, message: string): string {
        return `<!DOCTYPE html>
<html>
<head><title>GitFlow - ${success ? 'Success' : 'Error'}</title></head>
<body style="
    background: #09090b; color: #fafafa; font-family: 'Inter', system-ui, sans-serif;
    display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0;
">
    <div style="text-align: center; padding: 40px;">
        <div style="font-size: 48px; margin-bottom: 16px;">${success ? '✅' : '❌'}</div>
        <h1 style="font-size: 24px; font-weight: 600; margin-bottom: 8px;">
            ${success ? 'Account Connected!' : 'Authentication Failed'}
        </h1>
        <p style="color: #a1a1aa; font-size: 14px;">${message}</p>
        <p style="color: #52525b; font-size: 12px; margin-top: 24px;">
            You can close this tab and return to GitFlow.
        </p>
    </div>
</body>
</html>`;
    }

    private requestToken(
        code: string
    ): Promise<{ access_token: string; token_type: string; scope: string }> {
        return new Promise((resolve, reject) => {
            const postData = JSON.stringify({
                client_id: this.config.clientId,
                client_secret: this.config.clientSecret,
                code,
                redirect_uri: this.redirectUri,
            });

            const options = {
                hostname: 'github.com',
                port: 443,
                path: '/login/oauth/access_token',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'Content-Length': Buffer.byteLength(postData),
                    'User-Agent': 'GitFlow-Desktop',
                },
            };

            const req = https.request(options, (res) => {
                let data = '';
                res.on('data', (chunk) => {
                    data += chunk;
                });
                res.on('end', () => {
                    try {
                        resolve(JSON.parse(data));
                    } catch {
                        reject(new Error('Failed to parse token response'));
                    }
                });
            });

            req.on('error', reject);
            req.write(postData);
            req.end();
        });
    }

    private fetchUserProfile(token: string): Promise<{
        id: number;
        login: string;
        avatar_url: string;
        name: string;
        email: string;
    }> {
        return new Promise((resolve, reject) => {
            const options = {
                hostname: 'api.github.com',
                port: 443,
                path: '/user',
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: 'application/vnd.github.v3+json',
                    'User-Agent': 'GitFlow-Desktop',
                },
            };

            const req = https.request(options, (res) => {
                let data = '';
                res.on('data', (chunk) => {
                    data += chunk;
                });
                res.on('end', () => {
                    try {
                        resolve(JSON.parse(data));
                    } catch {
                        reject(new Error('Failed to parse user profile'));
                    }
                });
            });

            req.on('error', reject);
            req.end();
        });
    }
}
