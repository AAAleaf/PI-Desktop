# ADR 0307: OpenRouter endpoint metadata fills models.dev gaps

- Status: Accepted
- Date: 2026-09-23
- Amends: ADR 0134

## Context

ADR 0134 makes `https://models.dev/api.json` the sole model metadata source.
Models absent from its snapshot fall back to the generic conservative shape
(128k context / 8k output), and the settings rows now say so explicitly. For
providers configured against OpenRouter's own endpoint this is avoidably
pessimistic: OpenRouter publishes per-model context and output limits on its
public `/api/v1/models` route, and a freshly added OpenRouter model routinely
reaches that route before the next models.dev release snapshot.

## Decision

For a provider whose configured base URL is OpenRouter's own API
(`https://openrouter.ai/api/v1`, compared through the same URL normalizer as
models.dev), the endpoint's published limits fill the generic fallback only:

1. `models.dev` keeps absolute precedence. An ID with a models.dev record is
   never re-decorated from OpenRouter.
2. When models.dev has no record, the endpoint-published `context_length` and
   `top_provider.max_completion_tokens` replace the generic seed's numbers.
   Fields OpenRouter does not publish stay unset (an absent output limit
   renders as an em dash, not a seed value).
3. The endpoint is fetched without credentials (the route is public), with a
   bounded timeout, at most once per 10-minute window per process, and with a
   60-second back off after a failure. Any failure keeps the generic shape.
4. Rows enriched this way carry `catalogSource: "openrouter"`, extending the
   renderer-facing annotation union. The generic-limits annotation treats any
   catalog source as matched.
5. The runtime-side `ModelConfig` stays `source: "generic"`: models.dev
   remains the only authority that can mark a model as known to the runtime.
   Runtime catalog-window pinning for OpenRouter-sourced values is future
   work, not part of this change.
6. Cache hydration (the `source: "cache"` list) stays network-free and keeps
   whatever metadata it stored; the live refresh that follows applies the
   endpoint enrichment.

Relay or aggregator endpoints that proxy OpenRouter-style IDs are out of
scope: their base URLs do not match OpenRouter's, so their unknown IDs keep
the generic shape until models.dev lists them.

## Consequences

- A new OpenRouter model shows its real context/output sizes in Settings
  immediately after the provider's live discovery, without waiting for a new
  release snapshot; once models.dev lists it, models.dev metadata takes over.
- The single-authority invariant survives: provider-published numbers can
  fill an absence but never replace a models.dev record, and no credential
  ever reaches the metadata request.
- Two catalogs can momentarily disagree about a known model's numbers;
  models.dev wins deterministically, and Settings "Refresh model catalog"
  remains the way to pull a newer curated snapshot.

## Alternatives

### Let OpenRouter override models.dev for known models

Rejected: it breaks the "provider claims cannot replace catalog capabilities"
invariant, makes numbers depend on fetch timing, and reopens the dual-
authority problem ADR 0134 closed.

### Match `openrouter/`-prefixed IDs on any endpoint

Deferred: useful for aggregators, but it widens the matching surface beyond
what this change needs; models.dev already covers common proxied models.

### Enrich inside discovery only

Rejected: `decorate` also serves configured bindings, cache rows and the
catalog fallback path; a shared endpoint snapshot with a TTL serves all of
them uniformly.

## References

- `apps/desktop/electron/main/openrouter-catalog.ts`
- `apps/desktop/electron/main/ipc/provider-ipc.ts` (`decorate`)
- `apps/desktop/electron/main/models-dev-catalog.ts`
- `packages/shared/src/types/models.ts` (`catalogSource`)
- `docs/spec/03-runtime/13-model-catalog-and-selection.md` §8, §11.3
