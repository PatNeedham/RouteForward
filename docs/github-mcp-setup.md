# GitHub MCP (Model Context Protocol) Server Setup Guide

## What is GitHub MCP?

The GitHub MCP server provides AI assistants with enhanced access to GitHub repositories, pull requests, issues, and workflows. It enables more sophisticated GitHub integrations beyond basic API calls.

## Installation

### Prerequisites

- Node.js 18+
- GitHub account with appropriate repository permissions
- Personal Access Token (PAT) or GitHub App credentials

### Install GitHub MCP Server

```bash
npm install -g @github/mcp-server
```

### Alternative: Using npx (no global install)

```bash
npx @github/mcp-server
```

## Configuration

### 1. Create GitHub Personal Access Token

1. Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Generate new token with these scopes:
   - `repo` (full repository access)
   - `workflow` (update GitHub Action workflows)
   - `read:org` (read organization data)
   - `read:user` (read user profile data)
   - `project` (access projects)

### 2. Configure Environment Variables

Create a `.env` file:

```bash
GITHUB_TOKEN=your_personal_access_token
GITHUB_API_URL=https://api.github.com  # Optional, defaults to public GitHub
```

### 3. VS Code Configuration (Claude Desktop)

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["@github/mcp-server"],
      "env": {
        "GITHUB_TOKEN": "your_token_here"
      }
    }
  }
}
```

### 4. Configuration for Other MCP Clients

```json
{
  "mcpServers": {
    "github": {
      "command": "node",
      "args": ["/path/to/mcp-server/dist/index.js"],
      "env": {
        "GITHUB_TOKEN": "your_token_here",
        "GITHUB_API_URL": "https://api.github.com"
      }
    }
  }
}
```

## Available Tools and Capabilities

### Repository Management

- **List repositories**: Access user/organization repositories
- **Repository details**: Get repository information, statistics, and metadata
- **Branch management**: List, create, and manage branches
- **File operations**: Read, write, and manage repository files

### Pull Request Operations

- **List PRs**: Get all pull requests with filters
- **PR details**: Comprehensive PR information including reviews, comments, and status checks
- **Create PRs**: Programmatically create pull requests
- **Review management**: Submit reviews, approve, or request changes
- **Merge operations**: Merge, squash, or rebase pull requests

### Issue Management

- **Issue tracking**: List, create, update, and close issues
- **Labels and milestones**: Manage issue categorization
- **Comments**: Read and write issue comments
- **Assignee management**: Assign users to issues

### GitHub Actions Integration

- **Workflow management**: List and trigger workflows
- **Run history**: Access workflow run logs and status
- **Artifact handling**: Download and manage workflow artifacts
- **Secrets management**: Read (not write) workflow secrets

### Advanced Features

- **Search capabilities**: Advanced repository and code search
- **Webhook management**: Configure repository webhooks
- **Team management**: Access team and organization data
- **Project boards**: Interact with GitHub Projects

## Usage Examples

### Basic Repository Information

```javascript
// The MCP server provides these capabilities to AI assistants
// Example of what becomes available:

// Get repository details
await github.getRepository('owner/repo')

// List pull requests
await github.listPullRequests('owner/repo', { state: 'open' })

// Get PR details including reviews and checks
await github.getPullRequest('owner/repo', 123)
```

### Workflow Operations

```javascript
// List workflow runs
await github.listWorkflowRuns('owner/repo')

// Get specific workflow run details
await github.getWorkflowRun('owner/repo', 12345)

// Download workflow logs
await github.getWorkflowRunLogs('owner/repo', 12345)
```

## Security Considerations

### Token Permissions

- Use the principle of least privilege
- Consider using GitHub Apps instead of PATs for production
- Regularly rotate tokens
- Use organization-level restrictions where possible

### Environment Security

```bash
# Store tokens securely
export GITHUB_TOKEN="your_token"

# Don't commit tokens to repositories
echo "GITHUB_TOKEN" >> .gitignore

# Use encrypted storage for production
```

### Network Security

```bash
# For enterprise GitHub installations
GITHUB_API_URL=https://your-github-enterprise.com/api/v3
```

## Troubleshooting

### Common Issues

#### Authentication Failures

```bash
# Verify token permissions
curl -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/user

# Check token scopes
curl -H "Authorization: token $GITHUB_TOKEN" -I https://api.github.com/user
```

#### Rate Limiting

```bash
# Check rate limit status
curl -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/rate_limit
```

#### Connection Issues

```bash
# Test MCP server directly
npx @github/mcp-server --help

# Verify Node.js version
node --version  # Should be 18+
```

### Debug Mode

```bash
# Enable debug logging
DEBUG=mcp:* npx @github/mcp-server
```

## Integration with Development Workflow

### Pre-commit Hooks

```bash
#!/usr/bin/env sh
# .husky/pre-commit
# Use MCP to check PR status before committing
```

### CI/CD Integration

```yaml
# .github/workflows/mcp-integration.yml
name: MCP Integration
on: [push, pull_request]
jobs:
  mcp-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup MCP
        run: npm install -g @github/mcp-server
      - name: Run MCP checks
        run: # Your MCP integration commands
```

## Advanced Configuration

### Custom GitHub App

```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["@github/mcp-server"],
      "env": {
        "GITHUB_APP_ID": "123456",
        "GITHUB_APP_PRIVATE_KEY_PATH": "/path/to/private-key.pem",
        "GITHUB_INSTALLATION_ID": "789012"
      }
    }
  }
}
```

### Enterprise Configuration

```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["@github/mcp-server"],
      "env": {
        "GITHUB_TOKEN": "your_token",
        "GITHUB_API_URL": "https://your-github-enterprise.com/api/v3",
        "GITHUB_GRAPHQL_URL": "https://your-github-enterprise.com/api/graphql"
      }
    }
  }
}
```

This setup provides comprehensive GitHub integration capabilities for AI assistants, enabling sophisticated repository management and automation workflows.
