# Music delivery operations

The music Worker serves approved tracks from a private R2 bucket at
`/console/music/:trackId`. The bucket has no public endpoint. The Worker maps each stable ID
in `workers/music/catalog.ts` to one object key and never lists the bucket.

Browser playback receives the audio bytes. The private bucket, allowlist, rate limit, and
same-origin hotlink check reduce public discovery and casual reuse. They cannot prevent a
listener from capturing delivered audio.

## Access and secrets

Use Wrangler OAuth for an interactive release. Automation can use a temporary Cloudflare API
token with these permissions:

- Account: Workers Scripts, Edit
- Account: Workers R2 Storage, Edit
- Zone: Workers Routes, Edit for `openfray.app`

Limit the token to the OpenFray account and zone. Put it in `CLOUDFLARE_API_TOKEN` only for the
command that needs it. Never put a token, access key, account ID, or audio encode in Git.
The deployed Worker uses an R2 binding, so it has no R2 credential.

## Provision the private bucket

Run these commands once from a trusted workstation:

```bash
npx wrangler login
npx wrangler r2 bucket create openfray-music
npx wrangler r2 bucket dev-url disable openfray-music
```

Then open **R2 > openfray-music > Settings** in Cloudflare. Confirm **Public Development URL**
is disabled and **Custom Domains** is empty. Remove every custom domain if one is present.
The Worker route in `wrangler.music.jsonc` is the only public path.

## Prepare a track

Keep masters and web encodes under `local/`. Confirm commercial use, console use,
redistribution, transcoding, and browser delivery before preparing the release. Record the
public attribution and changes in `CREDITS.md`.

Create an Ogg Vorbis encode, then print its immutable release metadata:

```bash
npm run music:fingerprint -- local/music-encodes/track.ogg
```

Define the stable ID, title, and route in `src/music/catalog.ts`. Reference that ID from
`workers/music/catalog.ts`, then add the versioned object key, byte count, SHA-256, release
budget, content type, and rights decisions. Use a new stable ID for different music. Never
reassign an ID or overwrite an existing object.

Verify the encode before any upload:

```bash
npm run music:check -- TRACK_ID local/music-encodes/track.ogg
```

This command checks OGG format, release budget, exact bytes, SHA-256, rights, stable ID, and
catalog parity.

## Upload and deploy

Upload through the private R2 API:

```bash
npm run music:upload -- TRACK_ID local/music-encodes/track.ogg
npm run music:deploy
```

The upload command refuses an existing object, writes the approved content type, downloads the
new object through Wrangler, and verifies it byte for byte. Deployment binds the private bucket
to the allowlisted Worker and installs the `openfray.app/console/music/*` route.

## Verify delivery

Verify the private object and public route after deployment:

```bash
npm run music:verify -- TRACK_ID
curl -I https://openfray.app/console/music/TRACK_ID
curl -i -H 'Range: bytes=0-31' https://openfray.app/console/music/TRACK_ID
curl -i https://openfray.app/console/music/unknown
```

The full request returns `200` with `Content-Type: audio/ogg`, `Content-Length`,
`Accept-Ranges: bytes`, `ETag`, and immutable cache headers. The range request returns `206`
with a matching `Content-Range`. The unknown ID returns `404`.

Open the console anonymously and play the track. Test once with the network disabled and once
with the Worker route blocked. The player should report the failure while encounter controls
continue to work.

## Replace or roll back a release

A new encode of the same track keeps its stable ID and receives a new object key containing its
SHA-256. Upload the new object, deploy the mapping, and retain the previous object until the
release is verified. Different music receives a new stable ID.

The stable route can retain its previous cached response after an encode changes. Open
**Caching > Configuration > Purge Cache > Custom Purge**. Purge only
`https://openfray.app/console/music/TRACK_ID`, then repeat the full and range checks. Never
overwrite a versioned object.

To roll back, list the Worker deployments in Cloudflare and copy the previous version ID. Roll
back so the stable route maps to the retained object:

```bash
npm run music:deployments
npm run music:rollback -- VERSION_ID
```

Purge the stable route and confirm the old track plays. Then delete the unused new object with
its exact key:

```bash
npm run music:delete -- TRACK_ID tracks/TRACK_ID/SHA256.ogg
```

Do not delete an object referenced by the deployed Worker. Roll back and verify the route before
removing its replacement object.
