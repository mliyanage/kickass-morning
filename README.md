# KickAss Morning - AI-Powered Wake-up Call Service

An AI-powered motivational wake-up service that delivers personalized, inspirational morning calls to help users start their day with energy and purpose.

## Key Features

- **AI-Generated Voice Calls**: Get wake-up calls from AI-generated voices of inspirational figures
- **Personalized Motivation**: Customized messages based on your goals and struggles
- **Flexible Scheduling**: Set one-time or recurring wake-up calls
- **Passwordless Authentication**: Simple and secure login via email verification
- **Phone Verification**: Optional until you're ready to schedule calls

## Tech Stack

- **Frontend**: React, TypeScript, TailwindCSS, Shadcn/UI
- **Backend**: Node.js, Express
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Custom passwordless email OTP system
- **Integrations**: OpenAI for voice generation, Twilio for call delivery

## Development

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables (see below)
4. Run the development server: `npm run dev`

## Environment Variables

Create a `.env` file with the following variables:

```
DATABASE_URL=your_postgresql_connection_string
OPENAI_API_KEY=your_openai_api_key
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number
```

## License

MIT