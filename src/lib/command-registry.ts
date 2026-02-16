export interface Command {
    id: string;
    label: string;
    category: string;
    shortcut?: string;
    keywords?: string[];
    handler: () => void | Promise<void>;
    isAvailable?: () => boolean;
}

function fuzzyScore(query: string, text: string): number {
    const q = query.toLowerCase();
    const t = text.toLowerCase();

    // Exact match
    if (t === q) return 100;
    // Starts with
    if (t.startsWith(q)) return 80;
    // Contains
    if (t.includes(q)) return 60;
    // Character-by-character fuzzy
    let qi = 0;
    for (let ti = 0; ti < t.length && qi < q.length; ti++) {
        if (t[ti] === q[qi]) qi++;
    }
    if (qi === q.length) return 40;

    return 0;
}

class CommandRegistry {
    private commands = new Map<string, Command>();

    register(command: Command): void {
        this.commands.set(command.id, command);
    }

    unregister(id: string): void {
        this.commands.delete(id);
    }

    getAll(): Command[] {
        return Array.from(this.commands.values());
    }

    getAvailable(): Command[] {
        return this.getAll().filter((cmd) => !cmd.isAvailable || cmd.isAvailable());
    }

    search(query: string): Command[] {
        if (!query.trim()) return this.getAvailable();

        const q = query.toLowerCase();
        const scored = this.getAvailable()
            .map((cmd) => {
                const labelScore = fuzzyScore(q, cmd.label);
                const categoryScore = fuzzyScore(q, cmd.category) * 0.5;
                const keywordScore = (cmd.keywords || []).reduce(
                    (max, kw) => Math.max(max, fuzzyScore(q, kw)),
                    0
                ) * 0.7;
                return {
                    command: cmd,
                    score: Math.max(labelScore, categoryScore, keywordScore),
                };
            })
            .filter((r) => r.score > 0)
            .sort((a, b) => b.score - a.score);

        return scored.map((r) => r.command);
    }

    get(id: string): Command | undefined {
        return this.commands.get(id);
    }
}

export const commandRegistry = new CommandRegistry();
