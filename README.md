# NidahAI

An AI voice assistant for clinic appointment management. NidahAI helps callers
book, reschedule, and cancel appointments through natural conversation in
English or Arabic, with a staff dashboard for managing the clinic workflow.

**[Try the live demo → nidahai.com](https://nidahai.com/)**

## What it handles

- **Appointment booking:** finds available slots and captures the details needed
  to book a visit.
- **Rescheduling and cancellation:** updates existing appointments through a
  voice conversation.
- **Appointment lookup:** helps callers check their upcoming visits.
- **Clinic information:** answers questions using the clinic's configured
  information.
- **English and Arabic calls:** lets callers select their language for the
  conversation.
- **Staff follow-up:** records call activity and supports escalation to a human
  when needed.
- **WhatsApp follow-up:** supports booking confirmations and appointment-related
  replies when the messaging integration is configured.

## How it works

1. A visitor starts a browser call on the website or dials the demo number.
2. Twilio connects the call to a Pipecat voice pipeline, which transcribes the
   caller's speech and generates spoken replies.
3. The assistant uses appointment tools to check availability and read or update
   the clinic's records in Supabase.
4. Clinic staff can review bookings, patients, call transcripts, and activity in
   the dashboard.

## Inside the project

The public website, voice service, and staff dashboard are maintained together
in this repository.

| Component | Built with | Source |
| --- | --- | --- |
| Website and browser calling | React, TanStack Start, Twilio Voice SDK | [src](src/) |
| Voice assistant | Python, Pipecat, AWS Transcribe, Claude via Amazon Bedrock, Polly / Munsit | [clinic/bot](clinic/bot/) |
| Staff dashboard | Next.js, React, Supabase | [clinic/dashboard](clinic/dashboard/) |
| Clinic database | Supabase Postgres | [clinic/supabase](clinic/supabase/) |

For installation, configuration, and deployment, see the
[development guide](docs/DEVELOPMENT.md).
