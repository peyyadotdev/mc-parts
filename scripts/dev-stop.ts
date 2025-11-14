#!/usr/bin/env bun

import { $ } from "bun";
import { resolve } from "node:path";

type ProcessInfo = {
	pid: number;
	command: string;
	ports: Set<number>;
};

const workspaceRoot = resolve(process.cwd());

async function listListeningProcesses(): Promise<Map<number, ProcessInfo>> {
	const output = await $`lsof -nP -iTCP -sTCP:LISTEN -Fpcn`.text();
	const processes = new Map<number, ProcessInfo>();

	let currentPid: number | null = null;

	for (const line of output.split("\n")) {
		if (!line) continue;
		const prefix = line[0];
		const value = line.slice(1);

		if (prefix === "p") {
			currentPid = Number.parseInt(value, 10);
			if (!Number.isNaN(currentPid) && !processes.has(currentPid)) {
				processes.set(currentPid, {
					pid: currentPid,
					command: "",
					ports: new Set<number>(),
				});
			}
		} else if (prefix === "c" && currentPid !== null) {
			const info = processes.get(currentPid);
			if (info) {
				info.command = value;
			}
		} else if (prefix === "n" && currentPid !== null) {
			const info = processes.get(currentPid);
			if (!info) continue;
			const portStr = value.split(":").pop() ?? "";
			const port = Number.parseInt(portStr, 10);
			if (!Number.isNaN(port)) {
				info.ports.add(port);
			}
		}
	}

	return processes;
}

async function resolveCwd(pid: number): Promise<string | null> {
	try {
		const cwdOutput = await $`lsof -a -p ${pid} -d cwd -Fn`.text();
		for (const line of cwdOutput.split("\n")) {
			if (line.startsWith("n")) {
				return resolve(line.slice(1));
			}
		}
	} catch {
		return null;
	}
	return null;
}

type ProcessGroup = {
	pgid: number;
	pids: Set<number>;
	ports: Set<number>;
};

async function getProcessGroup(pid: number): Promise<number | null> {
	try {
		const pgidRaw = await $`ps -o pgid= -p ${pid}`.text();
		const pgid = Number.parseInt(pgidRaw.trim(), 10);
		return Number.isNaN(pgid) ? null : pgid;
	} catch {
		return null;
	}
}

async function killProcessGroup(group: ProcessGroup) {
	const portList = Array.from(group.ports).join(", ") || "unknown";
	const pidList = Array.from(group.pids).join(", ");
	console.log(
		`\n⚠️  Killing process group ${group.pgid} (pids: ${pidList}; ports: ${portList})`,
	);
	try {
		await $`kill -TERM -- -${group.pgid}`;
	} catch (error) {
		console.warn(
			`  ❌ Failed graceful kill for group ${group.pgid}, forcing...`,
			error,
		);
		await $`kill -KILL -- -${group.pgid}`;
	}
	console.log(`  ✅ Process group ${group.pgid} terminated`);
}

const processes = await listListeningProcesses();
const workspacePids: Array<[number, ProcessInfo]> = [];

for (const [pid, info] of processes.entries()) {
	const cwd = await resolveCwd(pid);
	if (!cwd) continue;
	if (cwd === workspaceRoot || cwd.startsWith(`${workspaceRoot}/`)) {
		workspacePids.push([pid, info]);
	}
}

if (workspacePids.length === 0) {
	console.log("✅ No listening ports belong to this workspace.");
	process.exit(0);
}

const groups = new Map<number, ProcessGroup>();

for (const [pid, info] of workspacePids) {
	const pgid = await getProcessGroup(pid);
	if (pgid === null) continue;
	const group =
		groups.get(pgid) ??
		{
			pgid,
			pids: new Set<number>(),
			ports: new Set<number>(),
		};
	group.pids.add(pid);
	for (const port of info.ports) {
		group.ports.add(port);
	}
	groups.set(pgid, group);
}

for (const group of groups.values()) {
	await killProcessGroup(group);
}

console.log("\n✅ Workspace dev servers stopped and ports freed.");
