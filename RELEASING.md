# Releasing MeshView

How to cut a release and publish to both the VS Code Marketplace and Open VSX. This happens in **two separate phases**: cutting the release in git, and publishing to the registries. They are not the same step (see [Release steps](#release-steps)).

## One-time setup

### VS Code Marketplace (publisher `OwenPKent`)

First create the publisher (needed either way):

1. Create the publisher at <https://marketplace.visualstudio.com/manage>. The publisher **ID must equal** `package.json` → `publisher` (`OwenPKent`).

Then authenticate `vsce` with a **Personal Access Token (PAT)**:

2. Create an Azure DevOps organization, signed in as the **same account that owns the publisher**. Go to <https://aex.dev.azure.com> → **Create new organization** (accept the defaults; the org name and any project are irrelevant).
3. Create the PAT: in Azure DevOps, **User Settings** (the gear icon top-right, _not_ the avatar) → **Personal access tokens** → **New Token**. Set **Organization = All accessible organizations**, then click **Show all scopes** and check **Marketplace → Manage**. Create it and copy the token (shown once).
4. Publish with the PAT at release time: `npm run publish:vsce -- -p <PAT>`, or store it once with `npx vsce login OwenPKent` and then just `npm run publish:vsce`.

### Open VSX (for Cursor / VSCodium / Windsurf)

1. Sign in at <https://open-vsx.org> with **GitHub**.
2. **Sign the Eclipse Foundation Publisher Agreement**: avatar → **Settings** → sign the agreement. This is the #1 gotcha; publishing fails until it is signed.
3. Create an access token: avatar → **Settings** → **Access Tokens** → **Generate new token**. Copy it (shown once).
4. Create the namespace once (must match the publisher): `npx ovsx create-namespace OwenPKent -p <OVSX_TOKEN>`. (If it already exists, skip.)

> Open VSX only supports token auth: there is no Entra/OIDC option, so a token is always required here.

## Publishing secrets (`.env`)

Both registries need a token (see [One-time setup](#one-time-setup) for how to mint them). The simplest, repeatable way to hold them is a local `.env` file: `vsce` reads `VSCE_PAT` and `ovsx` reads `OVSX_PAT` from the environment automatically, so once `.env` is loaded the publish commands take no extra flags.

1. Create your `.env` once from the template and paste in the two tokens:

   ```bash
   cp .env.example .env
   # then edit .env and set VSCE_PAT= and OVSX_PAT=
   ```

   `.env` is gitignored (`.env.example` is the committed template). Real tokens never get committed, and `.vscodeignore` keeps `.env*` out of the packaged `.vsix`.

2. Load `.env` into the shell you will publish from. This has to be re-run in each new shell:

   ```bash
   # Git Bash / macOS / Linux
   set -a; source .env; set +a
   ```

   ```powershell
   # PowerShell
   Get-Content .env | ForEach-Object {
     if ($_ -match '^\s*([^#=]+)=(.*)$') {
       [Environment]::SetEnvironmentVariable($matches[1].Trim(), $matches[2].Trim())
     }
   }
   ```

3. Confirm they are set before publishing:
   ```bash
   # Git Bash: should print non-empty values
   echo "vsce=${VSCE_PAT:+set} ovsx=${OVSX_PAT:+set}"
   ```
   ```powershell
   # PowerShell
   "vsce=$([bool]$env:VSCE_PAT) ovsx=$([bool]$env:OVSX_PAT)"
   ```

With `.env` loaded, the publish steps below are just `npm run publish:vsce` and `npm run publish:ovsx` with no `-p` flag. If you would rather not use a file, pass the token inline instead (`npm run publish:vsce -- -p <PAT>`) or run `vsce login` once; the `.env` flow is only a convenience.

## Pre-release checklist

Everything here happens **before** Phase 1 below; nothing in it is destructive, so it can be redone freely until it all passes.

- [ ] `main` is green in CI and your working tree is clean (`git status`).
- [ ] The local gate passes: `npm run lint && npm test && npm run format:check && npm run compile`.
- [ ] [CHANGELOG.md](CHANGELOG.md) `[Unreleased]` matches what actually shipped since the last tag (`git log v<last>..HEAD --oneline` is the ground truth), and user-facing changes are reflected in [README.md](README.md).
- [ ] The version bump you intend (patch / minor / major) matches the changelog contents.

## Release steps

Releasing has **two phases**, and it is easy to think you are done after the first. **Phase 1 puts the release in git; Phase 2 is what actually ships it to users.** Pushing a commit or tag does **not** publish anything: there is no CI automation for publishing, so the extension stays at whatever version is currently live on the Marketplace / Open VSX until you run the Phase 2 `publish:` commands by hand. Confirm what is actually live at any time with:

```bash
npx vsce show OwenPKent.meshview                       # Marketplace
curl -s https://open-vsx.org/api/OwenPKent/meshview    # Open VSX (see .version)
```

### Phase 1: cut the release in git

1. Start from a clean `main` with green CI and the [pre-release checklist](#pre-release-checklist) done.
2. Bump the version: `npm version patch` (or `minor` / `major`). This updates `package.json` and `package-lock.json`; it also creates a git tag unless you pass `--no-git-tag-version` (useful when you want to tag by hand after the changelog edit).
3. Update [CHANGELOG.md](CHANGELOG.md): move the `[Unreleased]` entries under a new `[x.y.z] - YYYY-MM-DD` heading.
4. Sanity checks: `npm run lint && npm test && npm run format:check && npm run compile`.
5. Commit, tag, and push:
   ```bash
   git add -A && git commit -m "chore: release x.y.z"
   git tag -a vx.y.z -m vx.y.z   # skip if `npm version` already created the tag
   git push --follow-tags
   ```
   The release now exists in git, but **it is not published**. Nothing is live to users yet.

### Phase 2: publish to the registries

6. Package and smoke-test:
   ```bash
   npm run vsix
   code --install-extension meshview-<version>.vsix
   ```
   Open an `.stl` file and confirm the preview, orbit/pan/zoom, and light/dark. This is a quick re-check of the packaged artifact, not a full manual pass.
7. Load your tokens (see [Publishing secrets](#publishing-secrets-env)): `set -a; source .env; set +a` (PowerShell users: use the loader in that section).
8. Publish to the Marketplace: `npm run publish:vsce` (reads `VSCE_PAT`; or pass `-- -p <PAT>` inline). The public listing page can 404 for a few minutes to an hour after a publish while it indexes; that is normal, and the version is live once `npx vsce show OwenPKent.meshview` reports it.
9. Publish to Open VSX: `npm run publish:ovsx` (reads `OVSX_PAT`; or `npx ovsx publish meshview-<version>.vsix -p <OVSX_TOKEN>`).
10. Cut the GitHub release from the pushed tag, attaching the packaged `.vsix`:
    ```bash
    gh release create v<version> meshview-<version>.vsix --notes-from-tag
    ```
11. Verify both registries show the new version (Phase 2 is done only when both report it):
    ```bash
    npx vsce show OwenPKent.meshview
    curl -s https://open-vsx.org/api/OwenPKent/meshview
    ```

## Notes

- `vscode:prepublish` runs `npm run package` automatically, so `vsce`/`ovsx` always ship a fresh production build.
- The Marketplace and Open VSX both sign extensions server-side on publish; there is no publisher-managed signing key to configure.
- Both registries require a token for this publisher: a Marketplace **PAT** for VS Code and an **Open VSX token** for Open VSX. Keep both out of git via a local `.env` (see [Publishing secrets](#publishing-secrets-env)); `.env` is gitignored and `.vscodeignore` keeps it out of the `.vsix`.
