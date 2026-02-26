# Build and Verify

Run TypeScript compilation and verify the build succeeds.

## Steps

1. Run the TypeScript compiler:
```bash
npm run build
```

2. If build succeeds, verify the output:
```bash
ls -la build/
```

3. If build fails, analyze the error:
   - Read the error messages carefully
   - Identify the failing file and line
   - Fix the TypeScript errors
   - Re-run build

4. Report the build status to user

## Common Build Issues

- **Missing imports**: Check `src/tools/index.ts` and `src/services/clickup/index.ts` for exports
- **Type errors**: Check `src/services/clickup/types.ts` for type definitions
- **Module resolution**: Ensure `.js` extensions in import paths (NodeNext modules)

## Success Criteria

Build is successful when:
- No compilation errors
- `build/` directory contains compiled `.js` files
- Entry point `build/index.js` exists
