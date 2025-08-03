# MCP Server Configuration for RouteForward

## Overview

This document provides the specific MCP server configuration recommendations for the RouteForward transit visualization project, tailored to accelerate development velocity and minimize errors.

## Recommended MCP Server Configuration

### Complete Configuration

Add this to your GitHub Copilot MCP settings at: https://github.com/PatNeedham/RouteForward/settings/copilot/coding_agent

```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "your-github-pat-here"
      }
    },
    "brave-search": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-brave-search"],
      "env": {
        "BRAVE_API_KEY": "your-brave-api-key-here"
      }
    },
    "postgres": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres"],
      "env": {
        "POSTGRES_CONNECTION_STRING": "postgresql://username:password@host:port/database"
      }
    },
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem"],
      "env": {
        "ALLOWED_DIRECTORIES": "/Users/patneedham/dev/RouteForward/route-forward"
      }
    }
  }
}
```

## Individual Server Benefits

### 1. GitHub MCP Server (CRITICAL)

**Setup Steps:**

1. Create GitHub Personal Access Token: https://github.com/settings/tokens
2. Permissions needed: `repo`, `issues`, `pull_requests`, `actions`
3. Add token to MCP configuration

**Project-Specific Benefits:**

- **Autonomous Issue Management:** Auto-create issues for missing Jersey City transit data
- **Smart PR Reviews:** Validate GeoJSON data accuracy and mapping logic
- **Progress Tracking:** Generate milestone reports and sprint summaries
- **Community Management:** Triage community contributions and feature requests
- **Release Automation:** Create changelogs based on merged features
- **Election Timeline Tracking:** Monitor progress against November 2025 deadline

**Example Use Cases:**

```
@copilot Create issues for all missing NJ Transit bus routes in Jersey City data
@copilot Review this PR for geospatial data accuracy and performance impact
@copilot Generate a progress report for Milestone 1 completion status
```

### 2. Brave Search MCP Server (HIGH PRIORITY)

**Setup Steps:**

1. Get API key: https://api.search.brave.com/app/keys
2. Free tier: 2000 queries/month
3. Add to MCP configuration

**Project-Specific Benefits:**

- **Transit Data Discovery:** Find GTFS feeds for multi-city expansion
- **Academic Research:** Discover simulation algorithms and best practices
- **Government APIs:** Locate official city data sources and APIs
- **Competitive Analysis:** Research similar transit visualization tools
- **Real-time Updates:** Monitor Jersey City transit news and policy changes
- **Open Source Resources:** Find relevant libraries and tools

**Example Use Cases:**

```
@copilot Find GTFS feeds for Hoboken and Newark transit systems
@copilot Research agent-based pedestrian simulation algorithms
@copilot Locate Jersey City open data portal for current bus stop locations
```

### 3. PostgreSQL MCP Server (MEDIUM PRIORITY)

**Setup Steps:**

1. Choose hosting: Supabase (free tier), Railway, or local
2. Create database for user simulations and community features
3. Add connection string to MCP config

**Project-Specific Benefits:**

- **User Simulations Storage:** Save and share community-created scenarios
- **Analytics Collection:** Track most popular transit improvements
- **Community Features:** Comments, voting, and collaboration data
- **Performance Caching:** Store processed simulation results
- **Multi-city Data:** Centralized storage for all city datasets
- **A/B Testing:** Track feature usage and user preferences

**Database Schema Suggestions:**

```sql
-- User simulations
CREATE TABLE simulations (
  id UUID PRIMARY KEY,
  city VARCHAR(50),
  name VARCHAR(255),
  description TEXT,
  geojson JSONB,
  created_at TIMESTAMP,
  user_id VARCHAR(100),
  is_public BOOLEAN,
  likes_count INTEGER DEFAULT 0
);

-- Community feedback
CREATE TABLE simulation_comments (
  id UUID PRIMARY KEY,
  simulation_id UUID REFERENCES simulations(id),
  comment TEXT,
  author VARCHAR(100),
  created_at TIMESTAMP
);
```

### 4. Filesystem MCP Server (MEDIUM PRIORITY)

**Setup Steps:**

1. Set allowed directories to your project root
2. Ensure proper file permissions
3. Configure for city data management

**Project-Specific Benefits:**

- **City Data Management:** Automated GeoJSON file generation and validation
- **Multi-city Architecture:** Create templated data structures for new cities
- **Data Quality Assurance:** Validate coordinate accuracy and format consistency
- **Bulk Operations:** Process multiple city datasets simultaneously
- **Documentation Generation:** Auto-generate API docs from data schemas
- **Asset Optimization:** Compress and optimize mapping assets

**File Structure Automation:**

```
/data/cities/
├── templates/
│   ├── city-template.json
│   └── validation-schema.json
├── jersey-city/
│   ├── transit-routes.geojson
│   ├── demographics.json
│   └── traffic-patterns.json
└── hoboken/
    ├── transit-routes.geojson
    └── demographics.json
```

## Advanced Configuration Options

### 5. SQLite MCP Server (OPTIONAL)

For local development and testing:

```json
{
  "sqlite": {
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-sqlite"],
    "env": {
      "DB_PATH": "./data/routeforward.db"
    }
  }
}
```

### 6. Puppeteer MCP Server (FUTURE)

For automated testing and screenshots:

```json
{
  "puppeteer": {
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-puppeteer"]
  }
}
```

## Workflow Integration Examples

### Daily Development Workflow

1. **Morning Standup:** GitHub MCP generates progress report
2. **Data Research:** Brave Search finds new transit APIs
3. **Code Review:** GitHub MCP validates mapping accuracy
4. **Testing:** Filesystem MCP manages test data
5. **Community Engagement:** PostgreSQL MCP tracks user feedback

### Election Campaign Integration

1. **Candidate Scenarios:** Auto-create issues for politician requests
2. **Media Outreach:** Search for transit reporters and journalists
3. **Data Validation:** Ensure accuracy for public presentations
4. **Performance Monitoring:** Track usage during campaign events
5. **Community Polls:** Analyze most popular transit improvements

### Multi-City Expansion

1. **Research Phase:** Search for city data sources and APIs
2. **Data Collection:** Automated file management for new cities
3. **Schema Validation:** Ensure consistent data formats
4. **Community Building:** Manage local contributor onboarding
5. **Performance Testing:** Monitor system load with multiple cities

## Security Considerations

### GitHub Token Permissions

- Use fine-grained tokens with minimal required permissions
- Regularly rotate tokens
- Monitor usage in GitHub settings

### Database Security

- Use connection pooling for PostgreSQL
- Implement proper user authentication
- Regular backup strategies
- Environment variable management

### API Key Management

- Store all keys in environment variables
- Use different keys for development vs production
- Monitor usage limits and quotas
- Implement rate limiting in application

## Getting Started Checklist

### Phase 1: Essential Setup (This Week)

- [ ] Configure GitHub MCP server
- [ ] Set up Brave Search MCP server
- [ ] Test basic automation workflows
- [ ] Create first automated issue from MCP

### Phase 2: Data Management (Next Week)

- [ ] Configure Filesystem MCP server
- [ ] Set up PostgreSQL database (Supabase recommended)
- [ ] Migrate existing Jersey City data to new structure
- [ ] Implement data validation workflows

### Phase 3: Advanced Features (Month 2)

- [ ] Set up advanced search workflows
- [ ] Implement community database features
- [ ] Create automated testing with MCP
- [ ] Build election timeline automation

## Success Metrics

### Development Velocity

- **Issue Resolution Time:** 50% faster with automated triaging
- **Code Review Quality:** 75% fewer bugs through MCP validation
- **Data Accuracy:** 90% reduction in GeoJSON coordinate errors
- **Community Contributions:** 5x increase in external PR quality

### Project-Specific Goals

- **Jersey City Data Completeness:** 100% NJ Transit routes by August 2025
- **Community Engagement:** 50+ user-generated simulations by election
- **Multi-city Readiness:** Framework tested with 3+ cities by year-end
- **Performance:** Sub-2s load times for complex simulations

This MCP configuration positions RouteForward to achieve your ambitious timeline while maintaining high code quality and community engagement during the crucial Jersey City election period.
