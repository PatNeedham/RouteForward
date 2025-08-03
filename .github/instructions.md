# GitHub Copilot Instructions for RouteForward

## Project Overview

RouteForward is a Next.js application for transit route analysis and simulation. The application uses React-Leaflet for interactive mapping, TypeScript for type safety, and includes comprehensive testing with Jest. The project integrates with multiple automated code quality tools that provide feedback via PR comments.

## Code Quality Tools Integration

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

#### SonarQube Feedback Patterns

**1. Unused Variables/Imports**

- **Pattern**: Variables assigned but never used
- **Solution**: Remove unused imports/variables or prefix with underscore if intentionally unused
- **Example**: Remove `const { createReadStream } = require('fs')` if not used

**2. Deep Function Nesting (>4 levels)**

- **Pattern**: Functions nested more than 4 levels deep
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
