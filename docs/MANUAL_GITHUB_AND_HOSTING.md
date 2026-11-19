# Manual GitHub push and container hosting

## 1. Grant GitHub write access

The repository is:

`https://github.com/thirthanreddy-maker/namma-rytha-app`

The GitHub connection currently has read access to the repository API but cannot push. Reconnect or update the GitHub credential used for this task with repository write access.

For a fine-grained personal access token, select only `thirthanreddy-maker/namma-rytha-app` under **Repository access** and grant:

- **Contents: Read and write**
- **Actions: Read and write** if you want the token to manage workflow runs
- **Metadata: Read-only**

If using a classic personal access token, the token needs the `repo` scope. Treat the token as a secret and never commit it or paste it into a repository file.

GitHub collaborators on a personal repository need write access to push changes. See the official [repository permission documentation](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/repository-access-and-collaboration/permission-levels-for-a-personal-account-repository).

## 2. Push the prepared project manually

The local project already has commit `cd228a6` and the remote is configured as `origin`. From the project directory, run:

```bash
git remote set-url origin https://github.com/thirthanreddy-maker/namma-rytha-app.git
git fetch origin main
git merge origin/main --allow-unrelated-histories --no-edit
git push -u origin main
```

The merge is needed because the new GitHub repository currently contains its initial `README.md`, while the local project has its own initial commit. If Git reports a conflict, resolve it, then run:

```bash
git add -A
git commit -m "Merge GitHub repository initialization"
git push -u origin main
```

Confirm that secrets are ignored before pushing:

```bash
git check-ignore -v .env .env.production .project-config.json
```

Then open the repository's **Actions** tab. The workflow runs tests and builds the Docker image on pushes to `main`. A semantic version tag also publishes to GHCR:

```bash
git tag v1.0.0
git push origin v1.0.0
```

## 3. Required runtime configuration

The application should receive its secrets from the hosting provider, not from Git. Configure the variables documented in `docs/DEPLOYMENT.md`, including the database connection, OAuth, cookie secret, Redis/OTP, storage, and enabled provider integrations. The project must have a reachable MySQL-compatible database and Redis where those features are enabled.

## 4. Deploy on Railway

Railway is the shortest path for this Dockerized project.

1. Open [Railway](https://railway.com/) and create a project.
2. Choose **Deploy from GitHub repo** and select `thirthanreddy-maker/namma-rytha-app`.
3. Select the `main` branch and create the service.
4. Railway detects the root file named `Dockerfile` automatically. No custom Dockerfile path is needed.
5. Open the service's **Variables** tab and add the production runtime variables. Do not add secrets to GitHub or the Dockerfile.
6. Deploy the staged changes.
7. Open **Settings → Networking → Public Networking → Generate Domain**. Railway provisions a public HTTPS `railway.app` domain with SSL.
8. Verify the generated URL, then test the landing page and sign-in flow.

Railway's official documentation covers [Dockerfile detection](https://docs.railway.com/builds/dockerfiles), [service variables](https://docs.railway.com/variables), and [public networking/domains](https://docs.railway.com/networking/public-networking).

## 5. Deploy on Render

1. Open [Render](https://dashboard.render.com/) and choose **New → Web Service**.
2. Connect GitHub and select `thirthanreddy-maker/namma-rytha-app`.
3. Set **Language** to **Docker**.
4. Keep **Dockerfile Path** as `Dockerfile` at the repository root.
5. Set the health check path to `/`. The image already includes a Docker health check and the app serves an unauthenticated landing page.
6. Add the production runtime variables in **Environment**. Use **Save, rebuild, and deploy** after adding them.
7. Deploy the service. Render builds the image with BuildKit from the repository Dockerfile.
8. Use the Render-provided service URL, or add a custom domain from the service settings.

Render's official documentation covers [Docker services](https://render.com/docs/docker), [environment variables](https://render.com/docs/configure-environment-variables), and [health checks](https://render.com/docs/health-checks).

## Recommendation

Use Railway if you want the fastest route to a permanent public URL from the existing Dockerfile. Use Render if you prefer its GitHub-connected web-service workflow and dashboard-based environment groups. Neither platform can complete a healthy production deployment until the database, OAuth, storage, and Redis/OTP variables are configured.
