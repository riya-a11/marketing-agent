# X Publishing Integration

The attachment's X publishing changes are integrated into the existing project routes.

- `POST /api/v1/publish/x` publishes a text-only post when given `{"caption":"..."}`.
- The same endpoint uploads an MP4 in chunks and publishes it when given `video_url` and `caption`; `alt_text` is optional.
- The dashboard publishes the selected generated post as text. Video Studio sends its video URL and caption.
- Backend dependency: `requests==2.32.3`.

Configure `X_ACCESS_TOKEN` in the backend environment. It must be an X user-context token with the necessary write/media permissions. Never put it in a `NEXT_PUBLIC_` variable or commit it. The checked-in `.env.example` contains placeholders only; the local `.env` has an empty X token until configured.

## Current limitations

- X API publishing has not been live-tested; a missing token returns a configuration error.
- The current video-render endpoint is still a mock and returns an example URL, not a rendered MP4. Video publishing requires a real, publicly reachable MP4 URL.
- The endpoint currently uses a single server token and accepts caller-provided video URLs. Before public deployment, add caller authentication/rate limits and restrict video URL destinations and download size to prevent abuse and SSRF.