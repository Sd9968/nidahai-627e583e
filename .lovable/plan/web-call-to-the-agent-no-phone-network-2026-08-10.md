# Web call to the agent (no phone network)

Today the green call button opens a browser call, then Twilio dials the agent's phone number over PSTN — and that number is blocked by the carrier (error 13225), so the call dies at hangup.

Since the agent is Pipecat listening on a Twilio Media Streams WebSocket, the phone number is unnecessary. The browser call can be handed straight to the bot's WebSocket, keeping the whole path inside Twilio.

## What changes

```text
before:  browser -> Twilio -> <Dial> phone number -> (blocked)
after:   browser -> Twilio -> <Connect><Stream> -> Pipecat bot
```

1. The voice webhook returns a stream connect instruction pointing at the Pipecat WebSocket URL instead of dialing a number.
2. The WebSocket URL is stored as a project secret (`PIPECAT_STREAM_URL`), so it is never in the page source.
3. If that secret is missing, the webhook falls back to the existing phone-number dial, so nothing breaks while it is being configured.
4. The diagnostics panel gains a "Bot stream" line showing which mode was used (stream vs. dial) and the stream host, so a bad URL is visible on the page.
5. The call-status callback keeps logging provider errors; the blacklist path is simply no longer used.

## What you need to provide

The public WebSocket URL of your Pipecat server's Twilio Media Streams endpoint, for example
`wss://bot.yourdomain.com/ws` — it must be publicly reachable over TLS (`wss://`), not localhost.
I will request it through the secure secret form.

Also confirm on the Pipecat side that the transport is the Twilio serializer (Media Streams frames),
since that is what Twilio will send.

## Technical notes

- `src/routes/api/public/twiml-voice.ts`: emit
  `<Response><Connect><Stream url="..."><Parameter name="callSid" .../></Stream></Connect></Response>`
  when `PIPECAT_STREAM_URL` is set; keep the current `<Dial>` branch as fallback. Read env inside the handler.
- `<Connect><Stream>` is bidirectional (the bot talks back), unlike `<Start><Stream>`, which is one-way.
- `src/lib/twilio-call.ts`: the webhook probe already fetches the TwiML; extend the parser to report
  stream-vs-dial mode into the diagnostics steps.
- No frontend/token changes needed; the existing browser SDK call and token endpoint stay as they are.
- Requires a publish for the live domain, since Twilio calls `nidahai.com`.
