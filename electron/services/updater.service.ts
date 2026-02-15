import { autoUpdater, UpdateInfo } from 'electron-updater';
import { BrowserWindow } from 'electron';

export interface UpdateStatus {
    status: 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error';
    version?: string;
    releaseNotes?: string;
    progress?: { percent: number; bytesPerSecond: number; transferred: number; total: number };
    error?: string;
}

export class UpdaterService {
    private mainWindow: BrowserWindow | null = null;

    constructor() {
        autoUpdater.autoDownload = false;
        autoUpdater.autoInstallOnAppQuit = true;

        autoUpdater.on('checking-for-update', () => {
            this.sendStatus({ status: 'checking' });
        });

        autoUpdater.on('update-available', (info: UpdateInfo) => {
            this.sendStatus({
                status: 'available',
                version: info.version,
                releaseNotes: typeof info.releaseNotes === 'string' ? info.releaseNotes : undefined,
            });
        });

        autoUpdater.on('update-not-available', () => {
            this.sendStatus({ status: 'not-available' });
        });

        autoUpdater.on('download-progress', (progress) => {
            this.sendStatus({
                status: 'downloading',
                progress: {
                    percent: progress.percent,
                    bytesPerSecond: progress.bytesPerSecond,
                    transferred: progress.transferred,
                    total: progress.total,
                },
            });
        });

        autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
            this.sendStatus({
                status: 'downloaded',
                version: info.version,
            });
        });

        autoUpdater.on('error', (err: Error) => {
            this.sendStatus({
                status: 'error',
                error: err.message,
            });
        });
    }

    setWindow(win: BrowserWindow): void {
        this.mainWindow = win;
    }

    async checkForUpdates(): Promise<UpdateStatus> {
        try {
            const result = await autoUpdater.checkForUpdates();
            if (result && result.updateInfo) {
                return {
                    status: 'available',
                    version: result.updateInfo.version,
                    releaseNotes: typeof result.updateInfo.releaseNotes === 'string' ? result.updateInfo.releaseNotes : undefined,
                };
            }
            return { status: 'not-available' };
        } catch (err: any) {
            return { status: 'error', error: err.message };
        }
    }

    async downloadUpdate(): Promise<void> {
        await autoUpdater.downloadUpdate();
    }

    quitAndInstall(): void {
        autoUpdater.quitAndInstall(false, true);
    }

    private sendStatus(status: UpdateStatus): void {
        this.mainWindow?.webContents.send('update:status', status);
    }
}
