<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Combined repository

- The repository root is the Lovable/TanStack website. Keep its build entry point here.
- `clinic/bot` is the Python voice service; `clinic/dashboard` is a separate Next.js app.
- Run clinic database tooling from `clinic/`; root `supabase/` belongs to the website.
- Keep each application's dependencies and environment files separate. Never copy
  local `.env` files, virtual environments, database passwords, or generated assets.
- See the root README for build commands and voice routing. A code change alone
  does not deploy the voice service or restore an offline tunnel.
