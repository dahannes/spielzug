import { PollyClient, SynthesizeSpeechCommand } from '@aws-sdk/client-polly'
import { VOICE } from '../../shared/dictation/audio.js'

let client: PollyClient | undefined

/** MP3 of an SSML text with the dictation voice (Amazon Polly, eu-central-1; ADR-022). */
export async function synthesize(ssml: string): Promise<Uint8Array> {
  // Credentials from AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY (an IAM user that may only synthesize speech).
  client ??= new PollyClient({ region: process.env.AWS_REGION ?? 'eu-central-1' })
  const res = await client.send(
    new SynthesizeSpeechCommand({ Engine: VOICE.engine, VoiceId: VOICE.id, LanguageCode: 'de-DE', OutputFormat: 'mp3', TextType: 'ssml', Text: ssml }),
  )
  if (!res.AudioStream) throw new Error('polly returned no audio')
  return res.AudioStream.transformToByteArray()
}
