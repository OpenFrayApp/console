# Patreon sign-in

The console uses the Supabase custom OAuth provider `custom:patreon`.
Patreon returns a nested JSON:API profile. The `patreon-userinfo` Edge Function
unwraps it into the top-level claims Supabase Auth expects.

## Deploy the adapter

From the console repository, authenticate the Supabase CLI and deploy to the
intended project:

```sh
supabase functions deploy patreon-userinfo --project-ref <project-ref> --use-api
```

The function requires no extra secrets. The Patreon client secret stays in the
Supabase Auth provider configuration. The function does not use a database client
or a Supabase service-role key.

`supabase/config.toml` sets `verify_jwt = false` for this function only.
Supabase Auth calls it before issuing a session, using a Patreon access token.
The handler validates that token by fetching Patreon's fixed HTTPS identity URL.
Other functions retain their own JWT settings.

## Configure Supabase Auth

Update the enabled custom provider with these settings:

| Field             | Value                                                             |
| ----------------- | ----------------------------------------------------------------- |
| Identifier        | `custom:patreon`                                                  |
| Authorization URL | `https://www.patreon.com/oauth2/authorize`                        |
| Token URL         | `https://www.patreon.com/api/oauth2/token`                        |
| UserInfo URL      | `https://<project-ref>.supabase.co/functions/v1/patreon-userinfo` |
| Scopes            | `identity identity[email]`                                        |

Keep the callback URL shown by Supabase registered in the Patreon client.
Allow the console URL in Supabase Auth's redirect URL configuration.
Do not add tokens, client secrets, or API keys to the UserInfo URL.

The adapter returns the Patreon user ID as `sub`, the shared email as `email`,
and optional `name` and `picture` fields. It returns `email_verified: false`:
Patreon's v2 user resource does not document a verification claim.
Do not override that field to `true` in the provider's attribute mapping.
Supabase may require email confirmation under the project's existing settings.
Do not disable confirmation or weaken account-linking checks to bypass it.
A matching email alone does not guarantee linking to an existing Google or Discord
account. Test that case before enabling Patreon for existing users.

## Verify the integration

Run the adapter tests and project checks:

```sh
npx vitest run tests/auth/patreonUserinfo.test.ts
npm run typecheck
npm run lint
```

After deployment, a GET without a bearer token must return HTTP 401:

```sh
curl -i 'https://<project-ref>.supabase.co/functions/v1/patreon-userinfo'
```

Then choose **Continue with Patreon** in the console. Complete Patreon consent
and confirm that Supabase returns a session, subject to email confirmation.
Check the profile's provider label and display name.
Test a new account and an existing identity separately; verify the resulting user
ID before assuming an existing account's encounters will appear.

An HTTP 422 from the adapter means Patreon did not share a valid email.
Check the `identity[email]` scope and consent. HTTP 401 means the token is missing
or rejected; HTTP 403 means Patreon denied profile access. HTTP 502 means the
upstream request or profile shape failed validation.

The handler accepts GET only, rejects redirects, uses an eight-second upstream
timeout, and marks every response `no-store`. It logs neither tokens nor profiles
and forwards no upstream error body. It reads no encounter data and changes no RLS
policy. Possession of a valid Patreon token grants access only to that token's
Patreon profile.

## References

- [Patreon identity endpoint](https://docs.patreon.com/#get-api-oauth2-v2-identity)
- [Supabase custom OAuth providers](https://supabase.com/docs/guides/auth/custom-oauth-providers)
- [Supabase Edge Function authentication](https://supabase.com/docs/guides/functions/auth)
- [Supabase Edge Function deployment](https://supabase.com/docs/guides/functions/deploy)
