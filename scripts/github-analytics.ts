#!/usr/bin/env ts-node
/**
 * GitHub Organization Analytics
 * Fetches repository and commit data for digitalservicebund organization
 * Calculates milestone dates for repos and commits
 * 
 * Usage: npm run github-analytics
 * Requires: GITHUB_TOKEN environment variable
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ES module equivalents for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const GITHUB_ORG = 'digitalservicebund';
const GITHUB_API_BASE = 'https://api.github.com';
const GITHUB_GRAPHQL_ENDPOINT = 'https://api.github.com/graphql';

// Author allowlist - only commits from these authors will be counted in milestones
// Leave empty array [] to include all authors (no filtering)
const AUTHOR_ALLOWLIST: string[] = [
  "123franziska",
  "aaschlote",
  "acalmelor",
  "Agnieszka Bratek",
  "andreas-deazevedo",
  "andreasphil",
  "andrew-cenkner-digitalservice",
  "AnnaHupperth",
  "anne-ds",
  "bastipnt",
  "beliebig",
  "benjaminaaron",
  "carhartl",
  "ChaosCoder",
  "charlottevorbeckds",
  "chohner",
  "Christian Kaatz",
  "chrkaatz",
  "code28",
  "CodeWithLena",
  "danielburgmann",
  "Deeds67",
  "deen13",
  "derjan4g",
  "DirkHeider",
  "ds4g-nathan",
  "duskox",
  "eirslett",
  "ekl176",
  "elaydis",
  "eliflores",
  "Fabio Tacke",
  "FabioTacke",
  "Frederike Ramin",
  "frederike-ramin",
  "hamo225",
  "hannes-mk",
  "hannesschaletzky",
  "HartmannVolker",
  "HendrikSchmidt",
  "hmones",
  "HPrinz",
  "ingriddorio",
  "jakkemp",
  "Jan Grewe",
  "jerdesign",
  "joschka",
  "José Ernesto Rodríguez",
  "josh-nowak",
  "judithmh",
  "JulianRoesner",
  "kaibernhard",
  "karmaLtamang",
  "khallad2",
  "kiwikern",
  "Klaus Hartl",
  "leonie-koch",
  "lnschroeder",
  "lsolcher",
  "m0dh4x",
  "madebyherzblut",
  "MagdaN",
  "magnulius",
  "malte-laukoetter",
  "maltebaer",
  "manuelpuchta",
  "marcel-wollschlaeger",
  "martin-jordan",
  "MasterCarl",
  "Matt Saydam",
  "mattsaydam",
  "melgaafary",
  "monachilada",
  "mpanne",
  "na-st",
  "Nadav-B",
  "nathaliemaary",
  "Nathan Henderson",
  "nfelger",
  "patjouk",
  "pgurusinga",
  "philippmoeser",
  "phuesler",
  "Pierre Marais",
  "pripplinger",
  "punknoir101",
  "raoulus",
  "rbrtrfl",
  "reckseba",
  "Rostysaurus",
  "rvp-c",
  "SabrinaFeuerherd",
  "sanni-github",
  "Sanny Nguyen Hung",
  "SannyNguyenHung",
  "sarahstrozynski",
  "sascha-ds",
  "SebastianRossa",
  "shrzaf",
  "Simone Killian",
  "SimoneKilian",
  "Spencer6497",
  "steint23",
  "ttretter",
  "UrsKahmann",
  "VictorDelCampo",
  "weilbith",
  "xaviertremel",
  "zechmeister",
];

// GraphQL response types
interface Repo {
  name: string;
  createdAt: string;
  defaultBranchRef: {
    name: string;
  } | null;
}

interface Commit {
  oid: string;
  authoredDate: string;
  author: {
    name: string;
    user: {
      login: string;
    } | null;
  };
}

interface CacheMetadata {
  lastFetch: string;
  reposCount: number;
  totalCommits: number;
}

interface RepoData {
  repo: Repo;
  commits: Commit[];
  totalCommits: number;
}

interface Milestone {
  milestone: number;
  date: string;
  repoName: string;
  author?: string;
  commitSha?: string;
}

interface MilestonesResult {
  repos: Milestone[];
  commits: Milestone[];
  firstInfraRepo: {
    name: string;
    date: string;
  } | null;
  totals: {
    repos: number;
    commits: number;
  };
}

/**
 * Make authenticated GitHub GraphQL API request
 */
async function githubGraphQLRequest<T>(query: string, variables: Record<string, any> = {}): Promise<T> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error('GITHUB_TOKEN environment variable is required');
  }

  const response = await fetch(GITHUB_GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers: {
      'Authorization': `bearer ${token}`,
      'Content-Type': 'application/json',
      'User-Agent': 'github-analytics-script',
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`GraphQL API error: ${response.status} ${response.statusText}`);
  }

  const result = await response.json();

  // Check for GraphQL errors
  if (result.errors) {
    throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
  }

  // Check rate limit
  const remaining = parseInt(response.headers.get('X-RateLimit-Remaining') || '0', 10);
  if (remaining < 10) {
    console.log(`⚠️  Rate limit warning: ${remaining} requests remaining`);
  }

  return result.data as T;
}

/**
 * Get all repositories for the organization using GraphQL
 */
async function fetchRepos(): Promise<Repo[]> {
  console.log('📦 Fetching repository list...');
  const allRepos: Repo[] = [];
  let hasNextPage = true;
  let cursor: string | null = null;

  while (hasNextPage) {
    const query = `
      query($org: String!, $cursor: String) {
        organization(login: $org) {
          repositories(first: 100, after: $cursor, orderBy: {field: CREATED_AT, direction: ASC}) {
            nodes {
              name
              createdAt
              defaultBranchRef {
                name
              }
            }
            pageInfo {
              hasNextPage
              endCursor
            }
          }
        }
      }
    `;

    interface ReposResponse {
      organization: {
        repositories: {
          nodes: Repo[];
          pageInfo: {
            hasNextPage: boolean;
            endCursor: string | null;
          };
        };
      };
    }

    const data = await githubGraphQLRequest<ReposResponse>(query, {
      org: GITHUB_ORG,
      cursor,
    });

    allRepos.push(...data.organization.repositories.nodes);
    hasNextPage = data.organization.repositories.pageInfo.hasNextPage;
    cursor = data.organization.repositories.pageInfo.endCursor;

    if (allRepos.length % 100 === 0 && hasNextPage) {
      console.log(`   Fetched ${allRepos.length} repositories...`);
    }
  }

  console.log(`   ✓ Found ${allRepos.length} repositories`);
  return allRepos;
}

/**
 * Get all commits for a repository using GraphQL
 */
async function fetchCommitsForRepo(owner: string, repoName: string, defaultBranch: string): Promise<Commit[]> {
  const allCommits: Commit[] = [];
  let hasNextPage = true;
  let cursor: string | null = null;

  while (hasNextPage) {
    const query = `
      query($owner: String!, $name: String!, $cursor: String) {
        repository(owner: $owner, name: $name) {
          defaultBranchRef {
            target {
              ... on Commit {
                history(first: 100, after: $cursor) {
                  nodes {
                    oid
                    authoredDate
                    author {
                      name
                      user {
                        login
                      }
                    }
                  }
                  pageInfo {
                    hasNextPage
                    endCursor
                  }
                }
              }
            }
          }
        }
      }
    `;

    interface CommitsResponse {
      repository: {
        defaultBranchRef: {
          target: {
            history: {
              nodes: Commit[];
              pageInfo: {
                hasNextPage: boolean;
                endCursor: string | null;
              };
            };
          };
        } | null;
      };
    }

    const data = await githubGraphQLRequest<CommitsResponse>(query, {
      owner,
      name: repoName,
      cursor,
    });

    // Handle repos without a default branch
    if (!data.repository.defaultBranchRef) {
      break;
    }

    const commits = data.repository.defaultBranchRef.target.history.nodes;
    allCommits.push(...commits);
    hasNextPage = data.repository.defaultBranchRef.target.history.pageInfo.hasNextPage;
    cursor = data.repository.defaultBranchRef.target.history.pageInfo.endCursor;

    // Progress indicator for large repos
    if (allCommits.length % 1000 === 0 && hasNextPage) {
      console.log(`      ... ${allCommits.length} commits fetched so far`);
    }
  }

  return allCommits;
}

/**
 * Load cached repo data if exists
 */
function loadCachedRepo(repoName: string): RepoData | null {
  const cachePath = path.join(__dirname, '..', 'github_data', 'repos', `${repoName}.json`);
  if (fs.existsSync(cachePath)) {
    try {
      const content = fs.readFileSync(cachePath, 'utf-8');
      return JSON.parse(content) as RepoData;
    } catch (error) {
      console.warn(`   Warning: Failed to parse cached data for ${repoName}`);
      return null;
    }
  }
  return null;
}

/**
 * Cache repo data
 */
function cacheRepoData(repoName: string, data: RepoData): void {
  const cachePath = path.join(__dirname, '..', 'github_data', 'repos', `${repoName}.json`);
  fs.writeFileSync(cachePath, JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * Calculate repository milestones
 */
function calculateRepoMilestones(repos: Repo[], milestones: number[]): Milestone[] {
  const results: Milestone[] = [];
  
  for (const milestone of milestones) {
    if (milestone <= repos.length) {
      const repo = repos[milestone - 1]; // 0-indexed
      results.push({
        milestone,
        date: repo.createdAt,
        repoName: repo.name,
      });
    }
  }
  
  return results;
}

/**
 * Calculate commit milestones
 */
function calculateCommitMilestones(allCommits: Array<{ commit: Commit; repoName: string }>, milestones: number[]): Milestone[] {
  // Sort all commits by author date
  const sorted = allCommits.sort((a, b) => 
    new Date(a.commit.authoredDate).getTime() - new Date(b.commit.authoredDate).getTime()
  );

  const results: Milestone[] = [];
  
  for (const milestone of milestones) {
    if (milestone <= sorted.length) {
      const commitData = sorted[milestone - 1]; // 0-indexed
      results.push({
        milestone,
        date: commitData.commit.authoredDate,
        repoName: commitData.repoName,
        author: commitData.commit.author.user?.login || commitData.commit.author.name,
        commitSha: commitData.commit.oid.substring(0, 7),
      });
    }
  }
  
  return results;
}

/**
 * Find first repo with '-infra' in name
 */
function findFirstInfraRepo(repos: Repo[]): { name: string; date: string } | null {
  const infraRepos = repos.filter(repo => repo.name.includes('-infra'));
  if (infraRepos.length === 0) {
    return null;
  }
  
  // Already sorted by creation date
  const first = infraRepos[0];
  return {
    name: first.name,
    date: first.createdAt,
  };
}

/**
 * Format date as YYYY-MM-DD for CSV
 */
function formatDateForCSV(dateString: string): string {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Generate CSV output for milestones in events.csv format
 */
function generateMilestonesCSV(
  repoMilestones: Milestone[],
  commitMilestones: Milestone[],
  firstInfraRepo: { name: string; date: string } | null
): string {
  const rows: string[] = [];
  
  // CSV header
  rows.push('date,name,isKeyMoment,photo filename,caption');
  
  // Repository milestones
  for (const milestone of repoMilestones) {
    const date = formatDateForCSV(milestone.date);
    const name = `${milestone.milestone} GitHub repos (latest: ${milestone.repoName})`;
    rows.push(`${date},${name},false,,`);
  }
  
  // Commit milestones
  for (const milestone of commitMilestones) {
    const date = formatDateForCSV(milestone.date);
    const author = milestone.author || 'unknown';
    const name = `${milestone.milestone} git commits across all repos (${author} in ${milestone.repoName})`;
    rows.push(`${date},${name},false,,`);
  }
  
  // First -infra repo
  if (firstInfraRepo) {
    const date = formatDateForCSV(firstInfraRepo.date);
    const name = `1st -infra repo (${firstInfraRepo.name})`;
    rows.push(`${date},${name},false,,`);
  }
  
  return rows.join('\n');
}

/**
 * Main function
 */
async function runAnalytics(force: boolean = false): Promise<void> {
  const projectRoot = path.resolve(__dirname, '..');
  const dataDir = path.join(projectRoot, 'github_data');
  const metadataPath = path.join(dataDir, 'cache_metadata.json');

  console.log('🔍 GitHub Organization Analytics');
  console.log(`   Organization: ${GITHUB_ORG}`);
  console.log('');

  // Check cache
  let cacheMetadata: CacheMetadata | null = null;
  if (fs.existsSync(metadataPath) && !force) {
    try {
      const content = fs.readFileSync(metadataPath, 'utf-8');
      cacheMetadata = JSON.parse(content);
      if (cacheMetadata) {
        console.log(`📂 Using cached data from ${cacheMetadata.lastFetch}`);
        console.log(`   Cached: ${cacheMetadata.reposCount} repos, ${cacheMetadata.totalCommits} commits`);
        console.log('   Use --force to re-fetch data');
        console.log('');
      }
    } catch (error) {
      console.warn('   Warning: Failed to read cache metadata');
    }
  }

  // Fetch or load repos
  let repos: Repo[];
  if (!cacheMetadata || force) {
    repos = await fetchRepos();
    // Save repo list
    const reposPath = path.join(dataDir, 'repos_list.json');
    fs.writeFileSync(reposPath, JSON.stringify(repos, null, 2), 'utf-8');
  } else {
    const reposPath = path.join(dataDir, 'repos_list.json');
    if (fs.existsSync(reposPath)) {
      repos = JSON.parse(fs.readFileSync(reposPath, 'utf-8')) as Repo[];
      console.log(`📦 Loaded ${repos.length} repositories from cache`);
    } else {
      repos = await fetchRepos();
      const reposPath = path.join(dataDir, 'repos_list.json');
      fs.writeFileSync(reposPath, JSON.stringify(repos, null, 2), 'utf-8');
    }
  }

  // Fetch commits for each repo
  console.log('');
  console.log('📝 Fetching commits for each repository...');
  const allCommits: Array<{ commit: Commit; repoName: string }> = [];
  let totalCommits = 0;

  for (let i = 0; i < repos.length; i++) {
    const repo = repos[i];
    const progress = `[${i + 1}/${repos.length}]`;
    
    // Check cache first
    let repoData: RepoData | null = null;
    if (!force) {
      repoData = loadCachedRepo(repo.name);
      if (repoData) {
        console.log(`   ${progress} ${repo.name} (cached, ${repoData.totalCommits} commits)`);
      }
    }

    if (!repoData || force) {
      // Skip repos without a default branch
      if (!repo.defaultBranchRef) {
        console.log(`   ${progress} ${repo.name} - skipping (no default branch)`);
        continue;
      }
      
      console.log(`   ${progress} ${repo.name} - fetching commits...`);
      const commits = await fetchCommitsForRepo(GITHUB_ORG, repo.name, repo.defaultBranchRef.name);
      console.log(`      ✓ Found ${commits.length} commits`);
      repoData = {
        repo,
        commits,
        totalCommits: commits.length,
      };
      cacheRepoData(repo.name, repoData);
      
      // Small delay to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Add to aggregate list
    for (const commit of repoData.commits) {
      allCommits.push({ commit, repoName: repo.name });
    }
    totalCommits += repoData.totalCommits;
  }

  // Update cache metadata
  cacheMetadata = {
    lastFetch: new Date().toISOString(),
    reposCount: repos.length,
    totalCommits,
  };
  fs.writeFileSync(metadataPath, JSON.stringify(cacheMetadata, null, 2), 'utf-8');

  console.log('');
  console.log(`✓ Aggregated ${allCommits.length} commits from ${repos.length} repositories`);

  // Print unique commit authors
  console.log('');
  console.log('👥 Unique commit authors:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  const uniqueAuthors = new Set<string>();
  for (const { commit } of allCommits) {
    const login = commit.author.user?.login;
    const name = commit.author.name;
    const authorId = login || name;
    uniqueAuthors.add(authorId);
  }
  const sortedAuthors = Array.from(uniqueAuthors).sort();
  for (const author of sortedAuthors) {
    console.log(`   ${author}`);
  }
  console.log(`   Total: ${uniqueAuthors.size} unique authors`);

  // Filter commits by allowlist if configured
  let filteredCommits = allCommits;
  if (AUTHOR_ALLOWLIST.length > 0) {
    console.log('');
    console.log('🔍 Filtering commits by allowlist...');
    const beforeCount = allCommits.length;
    filteredCommits = allCommits.filter(({ commit }) => {
      const login = commit.author.user?.login;
      const name = commit.author.name;
      const authorId = login || name;
      return AUTHOR_ALLOWLIST.includes(authorId);
    });
    const afterCount = filteredCommits.length;
    const filtered = beforeCount - afterCount;
    console.log(`   ✓ Kept ${afterCount.toLocaleString()} commits from allowlist (filtered ${filtered.toLocaleString()})`);
  }

  // Calculate milestones
  console.log('');
  console.log('🎯 Calculating milestones...');

  // Determine repo milestone thresholds
  const repoMilestones = [1, 5, 10, 25, 50, 100, 200, 500].filter(m => m <= repos.length);
  
  // Determine commit milestone thresholds (use filtered count)
  const commitMilestones = [1, 100, 500, 1000, 5000, 10000, 25000, 50000].filter(m => m <= filteredCommits.length);

  const repoMilestoneResults = calculateRepoMilestones(repos, repoMilestones);
  const commitMilestoneResults = calculateCommitMilestones(filteredCommits, commitMilestones);
  const firstInfraRepo = findFirstInfraRepo(repos);

  const results: MilestonesResult = {
    repos: repoMilestoneResults,
    commits: commitMilestoneResults,
    firstInfraRepo,
    totals: {
      repos: repos.length,
      commits: filteredCommits.length,
    },
  };

  // Save JSON results (for reference)
  const jsonPath = path.join(dataDir, 'milestones.json');
  fs.writeFileSync(jsonPath, JSON.stringify(results, null, 2), 'utf-8');

  // Generate and save CSV
  const csv = generateMilestonesCSV(repoMilestoneResults, commitMilestoneResults, firstInfraRepo);
  const csvPath = path.join(dataDir, 'milestones.csv');
  fs.writeFileSync(csvPath, csv, 'utf-8');

  // Display CSV output
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📊 Total: ${repos.length} repositories, ${filteredCommits.length.toLocaleString()} commits`);
  if (AUTHOR_ALLOWLIST.length > 0) {
    console.log(`   (filtered from ${totalCommits.toLocaleString()} total commits using allowlist)`);
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('📄 Milestones (CSV format):');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(csv);
  console.log('');
  console.log(`✅ Results saved to:`);
  console.log(`   CSV: ${csvPath}`);
  console.log(`   JSON: ${jsonPath}`);
}

// Parse command line arguments
const args = process.argv.slice(2);
const force = args.includes('--force');

// Run analytics
try {
  runAnalytics(force);
} catch (error) {
  console.error('❌ Error:', error);
  process.exit(1);
}

