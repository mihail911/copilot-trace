### Shell / process control (local execution)

1. **bash** — Run a bash command in a persistent interactive session.
2. **write_bash** — Send keystrokes/text input to a running async bash session/command.
3. **read_bash** — Read incremental stdout/stderr output from a running async bash session/command.
4. **stop_bash** — Terminate a running bash session/command (kills the session).
5. **list_bash** — List active bash sessions and their status/IDs.

### Local filesystem editing & inspection

6. **view** — View a file (with line numbers) or list a directory (up to 2 levels).
7. **create** — Create a new file at an absolute path with provided contents (must not already exist).
8. **edit** — Replace a single exact string occurrence in an existing file (absolute path).

### Local code search & discovery

9. **grep** — Search file contents with ripgrep (regex) with optional filters/output modes.
10. **glob** — Find files by name/path patterns using glob matching.

### Web retrieval & search

11. **web_fetch** — Fetch a URL and return simplified markdown or raw HTML (paged via start_index).
12. **web_search** — AI web search that returns a synthesized answer with citations.

### Session orchestration / UX

13. **report_intent** — Set a short “what I’m doing” status shown in the UI (only alongside other tool calls).
14. **fetch_copilot_cli_documentation** — Retrieve authoritative Copilot CLI docs for capability/how-to questions.
15. **update_todo** — Maintain a markdown checklist of tasks and completion status.
16. **ask_user** — Ask the user a question (optionally multiple-choice) and wait for input.

### Sub-agents (delegated work)

17. **task** — Launch a specialized agent (explore/task/general-purpose/code-review/custom) to do work in parallel.
18. **read_agent** — Poll or wait for a background agent’s status/results by agent_id.
19. **list_agents** — List background agents and their statuses (optionally exclude completed).

### GitHub API / repo intelligence (MCP)

20. **github-mcp-server-actions_get** — Get details for a specific GitHub Actions resource (workflow/run/job/artifact/usage/logs URL).
21. **github-mcp-server-actions_list** — List Actions resources (workflows, runs, jobs, artifacts) with optional filters/pagination.
22. **github-mcp-server-get_commit** — Fetch commit details (optionally including diffs/stats).
23. **github-mcp-server-get_copilot_space** — Pull extra context from a named Copilot space (owner + name).
24. **github-mcp-server-get_file_contents** — Retrieve repository file or directory contents at a ref/sha/path.
25. **github-mcp-server-get_job_logs** — Retrieve Actions job logs (single job or all failed jobs in a run; optionally return content).
26. **github-mcp-server-issue_read** — Read a specific issue’s details/comments/sub-issues/labels.
27. **github-mcp-server-list_branches** — List branches in a repository with pagination.
28. **github-mcp-server-list_commits** — List commits for a repo/branch/tag/sha with optional author filter.
29. **github-mcp-server-list_issues** — List issues in a repo with filters (state/labels/order/since) and cursor pagination.
30. **github-mcp-server-list_pull_requests** — List pull requests in a repo with basic filters/sorting/pagination.
31. **github-mcp-server-pull_request_read** — Read PR details (diff/status/files/reviews/review threads/comments) for a given PR number.
32. **github-mcp-server-search_code** — GitHub-wide code search using native query syntax (with sorting/pagination).
33. **github-mcp-server-search_issues** — Search issues using GitHub issues search syntax (optionally scoped to owner/repo).
34. **github-mcp-server-search_pull_requests** — Search PRs using GitHub issues search syntax scoped to `is:pr`.
35. **github-mcp-server-search_repositories** — Search repositories by metadata (topics/name/stars/etc.) with optional minimal output.
36. **github-mcp-server-search_users** — Search GitHub users by profile fields (name/location/followers/etc.).
