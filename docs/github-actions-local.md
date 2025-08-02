# Running GitHub Actions Locally with `act`

## Overview

`act` allows you to run GitHub Actions workflows locally using Docker containers, providing a way to test workflows before pushing to your repository.

## Installation

### macOS (Homebrew)

```bash
brew install act
```

### Linux

```bash
curl https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash
```

### Windows (Chocolatey)

```bash
choco install act-cli
```

## Basic Usage

### List Available Workflows

```bash
act --list
```

### Run All Workflows

```bash
act
```

### Run Specific Event (e.g., pull_request)

```bash
act pull_request
```

### Run Specific Job

```bash
act pull_request -j quality-checks
```

### For Apple Silicon Macs

Add the architecture flag to avoid compatibility issues:

```bash
act pull_request --container-architecture linux/amd64
```

## Advanced Configuration

### Custom `.actrc` File

Create a `.actrc` file in your project root:

```bash
# Use different Docker image
-P ubuntu-latest=catthehacker/ubuntu:act-latest

# Use specific architecture
--container-architecture linux/amd64

# Default secrets file
--secret-file .env.local
```

### Environment Variables and Secrets

```bash
# Pass environment variables
act -e GITHUB_TOKEN=your_token

# Use secrets file
act --secret-file .secrets

# Set individual secrets
act -s GITHUB_TOKEN=your_token
```

### Custom Event Data

```bash
# Create custom event payload
echo '{"ref": "refs/heads/main"}' > event.json
act push -e event.json
```

## Best Practices

1. **Use specific Docker images**: The default images might not have all tools you need
2. **Test incrementally**: Start with individual jobs before running full workflows
3. **Mock external services**: Use local alternatives for databases, APIs, etc.
4. **Clean up regularly**: `docker system prune` to remove unused containers
5. **Use `.actignore`**: Similar to `.gitignore` but for act runs

## Limitations

- Some GitHub-specific features won't work (e.g., GitHub API calls)
- Resource constraints may differ from GitHub runners
- Some actions may not work in local Docker environment
- Secrets and environment setup differs from GitHub

## Troubleshooting

### Common Issues

```bash
# Permission denied
sudo act

# Out of disk space
docker system prune -af

# Wrong architecture on M1 Macs
act --container-architecture linux/amd64

# Missing dependencies
act -P ubuntu-latest=catthehacker/ubuntu:full-latest
```

### Debug Mode

```bash
act --verbose
act --dry-run  # Just print what would be done
```

## Integration with Your Project

### Example .actrc for Next.js Projects

```bash
-P ubuntu-latest=catthehacker/ubuntu:act-latest
--container-architecture linux/amd64
--artifact-server-path /tmp/artifacts
```

### Pre-commit Hook Integration

Add to `.husky/pre-push`:

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# Run workflows locally before push
act pull_request --container-architecture linux/amd64 -j quality-checks
```

This setup ensures your GitHub Actions will pass before you push to the repository.
