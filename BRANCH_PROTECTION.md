# Branch Protection Setup

To properly secure the `main` branch and ensure code quality, configure the following branch protection rules in GitHub:

## Steps to Enable Branch Protection

1. Go to **Settings** → **Branches** in your GitHub repository
2. Click **Add rule** under "Branch protection rules"
3. Enter `main` as the branch name pattern

## Recommended Settings

### ✅ Required Status Checks

- **Require status checks to pass before merging**
  - Check: `lint-and-test` (from CI workflow)
- **Require branches to be up to date before merging**

### ✅ Pull Request Requirements

- **Require a pull request before merging**
  - Require approvals: 1 (adjust based on team size)
  - Dismiss stale pull request approvals when new commits are pushed
  - Require review from CODEOWNERS (optional)

### ✅ Additional Protection

- **Require conversation resolution before merging**
- **Require linear history** (optional, for cleaner git history)
- **Include administrators** (recommended for consistency)

### ⚠️ Do NOT Enable

- **Allow force pushes** - This could break the release history
- **Allow deletions** - The main branch should never be deleted

## Workflow After Protection

1. **Development Flow**:

   ```bash
   git checkout -b feature/your-feature
   # Make changes
   git add .
   git commit -m "feat: your feature description"
   git push origin feature/your-feature
   ```

2. **Create PR**: GitHub will prompt you to create a PR

3. **CI Runs**: The CI workflow automatically runs on:

   - Every push to your feature branch
   - The PR itself

4. **Merge**: Once CI passes and PR is approved, merge to main

5. **CD Triggers**: After merge to main:
   - Release-please creates/updates a release PR
   - Merging the release PR triggers the actual release

## Benefits

- **No direct pushes to main** - All changes go through PR review
- **Automated quality checks** - CI must pass before merge
- **Clean release process** - Only tested code reaches main
- **Audit trail** - All changes are tracked through PRs
