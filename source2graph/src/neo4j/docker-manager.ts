import { execSync, spawnSync, spawn } from 'child_process'
import { join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
// docker-compose.yml is at the project root (two levels up from src/neo4j/)
const COMPOSE_DIR = join(__dirname, '../..')

function run(cmd: string, args: string[], cwd?: string): { ok: boolean; output: string } {
  const result = spawnSync(cmd, args, { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'], cwd })
  const output = (result.stdout ?? '') + (result.stderr ?? '')
  return { ok: result.status === 0, output }
}

function dockerCompose(args: string[]): { ok: boolean; output: string } {
  // Try `docker compose` plugin first, fall back to `docker-compose`
  // Use cwd instead of -f to avoid flag compatibility issues
  const r = run('docker', ['compose', ...args], COMPOSE_DIR)
  if (r.ok || !r.output.includes('is not a docker command')) return r
  return run('docker-compose', args, COMPOSE_DIR)
}

export interface ContainerStatus {
  running: boolean
  healthy: boolean
  browserUrl: string
  boltUri: string
}

export function getStatus(): ContainerStatus {
  const r = dockerCompose(['ps', '--format', 'json'])
  const running = r.ok && r.output.includes('"s2g-neo4j"') && r.output.includes('"running"')
  const healthy = running && r.output.includes('"healthy"')
  return {
    running,
    healthy,
    browserUrl: 'http://localhost:7474',
    boltUri: 'bolt://localhost:7687',
  }
}

export function startNeo4j(opts: { detach?: boolean } = {}): { ok: boolean; output: string } {
  const args = ['up', '--wait']
  if (opts.detach !== false) args.push('-d')
  return dockerCompose(args)
}

export function stopNeo4j(): { ok: boolean; output: string } {
  return dockerCompose(['stop'])
}

export function destroyNeo4j(): { ok: boolean; output: string } {
  return dockerCompose(['down', '-v'])
}

export function pullNeo4jImage(): { ok: boolean; output: string } {
  return dockerCompose(['pull'])
}

/** Wait until Neo4j is accepting Bolt connections (polls up to maxWait ms). */
export async function waitForNeo4j(
  boltUri: string,
  auth: { user: string; password: string },
  maxWaitMs = 60_000,
): Promise<boolean> {
  const { default: neo4j } = await import('neo4j-driver')
  const driver = neo4j.driver(boltUri, neo4j.auth.basic(auth.user, auth.password))
  const deadline = Date.now() + maxWaitMs

  while (Date.now() < deadline) {
    try {
      await driver.verifyConnectivity()
      await driver.close()
      return true
    } catch {
      await new Promise((r) => setTimeout(r, 1500))
    }
  }
  await driver.close()
  return false
}

/** Open Neo4j Browser in the default system browser. */
export function openBrowser(url = 'http://localhost:7474'): void {
  const platform = process.platform
  const cmd = platform === 'darwin' ? 'open'
    : platform === 'win32' ? 'start'
    : 'xdg-open'
  spawn(cmd, [url], { stdio: 'ignore', detached: true, shell: platform === 'win32' }).unref()
}
