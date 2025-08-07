# GitHub Copilot Instructions for RouteForward

## Project Overview

RouteForward is a Next.js application for transit route analysis and simulation. The application uses React-Leaflet for interactive mapping, TypeScript for type safety, and includes comprehensive testing with Jest. The project integrates with multiple automated code quality tools that provide feedback via PR comments.

## Automated Issue Resolution Commands

### SonarQube Security Hotspot Resolution

When user comments "@copilot resolve sonarqube security hotspots" or similar:

1. **Identify all Math.random() usages** in the PR files
2. **Assess context**: Determine if usage is for security-sensitive operations or visualization/simulation
3. **Apply consistent fixes** across all instances:

For **non-security contexts** (visualization, simulation, demos):

```typescript
// Replace Math.random() with documented safe usage
// NOSONAR - Math.random() is safe for non-security-sensitive [specific purpose]
Math.random() // nosemgrep: javascript.lang.security.audit.math-random-detected
```

For **security-sensitive contexts**:

```typescript
// Replace with secure random generation
function getSecureRandomFloat(): number {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const array = new Uint32Array(1)
    crypto.getRandomValues(array)
    return array[0] / (0xffffffff + 1)
  }
  // NOSONAR - Math.random() fallback for non-production demo purposes
  return Math.random() // nosemgrep: javascript.lang.security.audit.math-random-detected
}
```

### Quality Tool Integration Triggers

**Command Patterns to Recognize:**

- "@copilot fix sonarqube issues"
- "@copilot resolve security hotspots"
- "@copilot address code quality warnings"
- "@copilot fix all static analysis issues"

**Auto-trigger Conditions:**

- When SonarQube comments appear with "Security Hotspots" or "Code Smells"
- When CodeRabbit flags type safety or performance issues
- When PR has failing quality checks

## Code Quality Tools Integration

### SonarQube Security Hotspot Standard Responses

**For Pedestrian/Simulation Demo Files:**
When SonarQube flags `Math.random()` in simulation or demo contexts:

```typescript
// Pattern: setInterval(() => { Math.random() usage }, 1000)
// Fix: Add security context documentation

// NOSONAR - Math.random() is safe for pedestrian simulation demo purposes
if (Math.random() < 0.1) {
  // nosemgrep: javascript.lang.security.audit.math-random-detected
  // Demo simulation logic
}
```

**For Production Simulation Files:**
When `Math.random()` is used in core simulation logic:

```typescript
// Replace with secure random generation utility
function getSecureRandomFloat(): number {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const array = new Uint32Array(1)
    crypto.getRandomValues(array)
    return array[0] / (0xffffffff + 1)
  }
  // NOSONAR - Math.random() fallback for demo environments only
  return Math.random() // nosemgrep: javascript.lang.security.audit.math-random-detected
}

// Usage: if (getSecureRandomFloat() < 0.1) { ... }
```

### Automated Quality Feedback Response Protocol

When code quality tools (CodeRabbit, SonarQube, etc.) leave comments on pull requests, GitHub Copilot should automatically address them following these patterns:

#### CodeRabbit Feedback Patterns

**1. Route Type Assignment Issues**

- **Pattern**: Functions hardcoding route types (e.g., always assigning `type: 'bus'`)
- **Solution**: Add type parameters with defaults: `(data: any, routeType: 'bus' | 'rail' = 'bus')`
- **Example**: Update `convertToRouteSegments` to accept route type and pass correct types for different data sources

**2. Type Inheritance Issues**

- **Pattern**: Child objects not inheriting types from parent objects
- **Solution**: Use conditional logic: `type: route.type === 'rail' ? 'rail' : 'bus'`
- **Example**: Transit stops should inherit their type from their parent routes

**3. Layout and UI Issues**

- **Pattern**: Elements disappearing when switching UI states
- **Solution**: Use `h-screen` for viewport containers, add `overflow-hidden` to panels, ensure proper flex constraints
- **Example**: Replace `h-full` with `h-screen` and add explicit overflow handling

**4. Optional Chain Expression Improvements**

- **Pattern**: Verbose `obj.prop && obj.prop.subprop` checks
- **Solution**: Replace with `obj.prop?.subprop` for conciseness
- **Example**: `feature.properties && feature.properties.name` → `feature.properties?.name`

**5. React Key Optimization**

- **Pattern**: Using array indices as React keys
- **Solution**: Create unique keys using data properties: `key={`${item.id}-${item.uniqueProperty}-${index}`}`

#### SonarQube Feedback Patterns (Auto-Fix Priority)

**1. Security Hotspots - Math.random() Usage (CRITICAL)**

- **Pattern**: `Math.random()` flagged as security-sensitive (typescript:S2245)
- **Auto-Detection**: Look for "Make sure that using this pseudorandom number generator is safe here"
- **Context Assessment**:
  - Simulation/Demo files → Safe for Math.random() with suppressions
  - Authentication/Crypto files → Replace with secure random
- **Solution Template**:

```typescript
// For simulation/visualization contexts:
// NOSONAR - Math.random() is safe for simulation, demo, or visualization purposes
Math.random() // nosemgrep: javascript.lang.security.audit.math-random-detected

// For security contexts: Use getSecureRandomFloat() function
```

**2. Unused Variables/Imports (HIGH)**

- **Pattern**: Variables assigned but never used
- **Auto-Detection**: "assigned a value but never used" or "declared but never read"
- **Solution**: Remove unused imports/variables or prefix with underscore if intentionally unused
- **Example**: Remove `const { createReadStream } = require('fs')` if not used

**3. Deep Function Nesting (MEDIUM)**

- **Pattern**: Functions nested more than 4 levels deep
- **Auto-Detection**: "Refactor this code to not nest functions more than 4 levels deep"
- **Solution**: Extract helper functions to reduce nesting
- **Example**: Break down complex callback chains into named helper functions

**3. Code Complexity Issues**

- **Pattern**: Functions doing too many things
- **Solution**: Apply single responsibility principle, extract methods
- **Example**: Split large functions into smaller, focused helper functions

**4. Security Hotspots (Math.random() usage)**

- **Pattern**: SonarQube flagging `Math.random()` as security-sensitive
- **Assessment**: Determine if the usage is security-sensitive or for visualization/simulation
- **Non-Security Usage Solution**: Add explicit comments and suppressions:
  ```typescript
  // NOSONAR - Math.random() is safe for non-security-sensitive [purpose]
  return Math.random() // nosemgrep: javascript.lang.security.audit.math-random-detected
  ```
- **Security-Sensitive Solution**: Use cryptographic random generation with proper fallbacks

## Technology Stack Guidelines

### Next.js 15+ Best Practices

- Use `'use client'` directive for client-side components
- Leverage App Router structure (`src/app/`)
- Implement proper error boundaries and loading states

### React-Leaflet Integration

- Always mock React-Leaflet hooks in tests: `useMap`, `useMapEvents`
- Use proper cleanup in `useEffect` for map controls
- Handle async library loading for client-side only features (e.g., Geoman)

### TypeScript Standards

- Include test files in `tsconfig.json` compilation
- Use strict type checking with proper interface definitions
- Avoid `any` types; prefer proper typing or `unknown`

### Testing Requirements

- Maintain 100% test coverage
- Mock external dependencies properly
- Use descriptive test names and organize by functionality
- All tests must pass before merging

### ESLint Configuration

- Use custom unused-vars rules with underscore prefix escape hatch
- Enable strict mode for unused variables detection
- Configure proper TypeScript integration

## Automated Response Protocol

### When User Requests Quality Issue Resolution:

**Trigger Phrases:**

- "@copilot resolve sonarqube security hotspots"
- "@copilot fix all static analysis issues"
- "@copilot address code quality warnings"

**Response Process:**

1. **Scan PR files** for all instances of flagged issues
2. **Apply consistent fixes** using the patterns above
3. **Validate changes** with quality gates
4. **Report completion** with summary of fixes applied

### When SonarQube Issues Appear Automatically:

1. **Priority Triage**: Critical (Security) > Major (Bugs) > Minor (Code Smells)
2. **Auto-Fix Eligible Issues**:
   - Math.random() security hotspots → Apply suppressions or secure alternatives
   - Unused variables → Remove or prefix with underscore
   - Simple refactoring opportunities → Extract methods, reduce complexity
3. **Batch Processing**: Fix all instances of the same issue type together
4. **Verification**: Run linting and type checking after changes

### When CodeRabbit Comments Appear:

1. **Immediate Assessment**: Analyze the specific code pattern mentioned
2. **Root Cause Identification**: Determine if it's a type safety, performance, or maintainability issue
3. **Systematic Fix**: Apply the appropriate solution pattern from above
4. **Validation**: Ensure fix doesn't break existing functionality
5. **Testing**: Run full test suite to verify changes

### When SonarQube Issues Appear:

1. **Priority Triage**: Address Critical > Major > Minor issues
2. **Code Quality Focus**: Prioritize maintainability and readability improvements
3. **Refactoring Approach**: Use safe refactoring techniques (extract method, reduce complexity)
4. **Verification**: Run linting and type checking after changes

### When Dependabot PRs Appear:

1. **Security Updates**: Immediately review and merge security patches after tests pass
2. **Major Version Updates**: Test thoroughly, check for breaking changes in release notes
3. **Minor/Patch Updates**: Group review weekly, ensure all tests pass
4. **GitHub Actions Updates**: Verify workflow compatibility before merging
5. **Conflict Resolution**: Allow Dependabot to auto-rebase when possible

### SonarQube MCP Integration Commands:

**Available User Commands for PR Comments:**

```
@copilot resolve sonarqube security hotspots
@copilot fix math.random usage in all files
@copilot address weak cryptography warnings
@copilot apply security suppressions for demo code
@copilot batch fix all typescript:S2245 issues
```

**Automatic Triggers:**

- When SonarQube posts security hotspot reviews
- When multiple instances of same issue appear
- When PR title contains "fix security issues" or similar

## Development Workflow Standards

### Quality Gates (All Must Pass):

```bash
npm run lint          # No ESLint errors/warnings
npx tsc --noEmit      # No TypeScript errors
npm test              # All tests passing
npm run format        # Consistent code formatting
```

### File Organization:

- Components: `src/components/[feature]/ComponentName.tsx`
- Tests: `src/[components|utils]/__tests__/filename.test.ts(x)`
- Types: `src/types/filename.ts`
- Utilities: `src/lib/[domain]/utility.ts`

### Commit Standards:

- Fix code quality issues in focused commits
- Include test updates when changing functionality
- Reference issue numbers in commit messages
- Ensure all quality gates pass before committing

## Security Considerations

### Cryptographic Operations:

- Use `crypto.getRandomValues()` for browser environments
- Use `require('crypto').randomBytes()` for Node.js environments
- Never use `Math.random()` for security-sensitive operations

### Data Validation:

- Validate all external data inputs
- Use proper TypeScript types for API responses
- Sanitize user inputs in map drawing features

## Performance Guidelines

### Bundle Optimization:

- Use dynamic imports for large libraries (e.g., Geoman)
- Implement proper code splitting for map components
- Optimize GeoJSON data size for performance

### React Performance:

- Use proper dependency arrays in `useEffect` and `useCallback`
- Implement proper memoization for expensive computations
- Avoid creating objects in render functions

## Monitoring and Maintenance

### Code Quality Metrics:

- Zero ESLint warnings/errors
- Zero TypeScript compilation errors
- 100% test coverage maintenance
- Performance budget compliance

### Regular Maintenance Tasks:

- Update dependencies monthly
- Review and address new code quality tool feedback
- Refactor based on accumulated technical debt
- Update documentation for API changes

---

_This file should be updated whenever new code quality tools are integrated or new patterns are identified from automated feedback._
