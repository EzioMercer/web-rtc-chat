// The disclaimer, privacy notice and donation terms shown on the setup screen and in Settings.
export type LegalSection = {
  title: string;
  paragraphs: string[];
  list?: string[];
  // Paragraphs after the list.
  after?: string[];
};

export const LEGAL: LegalSection[] = [
  {
    title: 'Disclaimer',
    paragraphs: [
      'This is a free, non-commercial, open-source project, shared so others don\'t have to build the same thing '
      + 'from scratch. It is run by one person, EzioMercer ("the author"), in their spare time, not by a company.',
      'THE APP AND ITS CODE ARE PROVIDED "AS IS" AND "AS AVAILABLE", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR '
      + 'IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, '
      + 'SECURITY AND NON-INFRINGEMENT.',
      'You use it at your own risk. It may contain bugs or security flaws. It may stop working, change, or be shut '
      + 'down at any time. Messages, contacts or your identity may be lost, and encryption or other protections may '
      + 'fail or be broken by an attacker. Don\'t rely on it where a failure could hurt you or others, and never for '
      + 'emergencies.',
      'TO THE FULLEST EXTENT PERMITTED BY LAW, THE AUTHOR IS NOT LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, '
      + 'INCLUDING LOSS OF DATA, UNAUTHORIZED ACCESS TO OR THEFT OF MESSAGES, CALLS OR KEYS, OR ABUSE OF BUGS, '
      + 'WHETHER IN CONTRACT, TORT OR OTHERWISE, ARISING FROM OR IN CONNECTION WITH THE APP OR ITS USE.',
      'You are responsible for how you use the app and must follow the laws that apply to you.',
      'Nothing here limits any liability that cannot be limited by law. If any part of this text is found invalid, '
      + 'the rest still applies.',
    ],
  },
  {
    title: 'Privacy',
    paragraphs: [
      'The author runs no accounts, no analytics, no cookies and no message storage. Messages and calls go directly '
      + 'between the two browsers, encrypted end to end. Your keys, contacts, settings, pictures and chats (messages '
      + 'and files) are saved only on your device, encrypted (or nowhere, in Temporary mode). Your browser may delete '
      + 'them on its own, for example when the device runs low on space.',
      'If you set a picture, it goes the same way, directly to each of your contacts, who keep it on their device. '
      + 'Every contact gets the same picture.',
      'A backup file is encrypted with a password you choose. It is yours: the author never sees it, and where you '
      + 'keep it and who you give it to is up to you.',
      'To make connections work, the app uses third-party services. They can see your IP address, but not your '
      + 'messages or calls:',
    ],
    list: [
      'GitHub Pages hosts the site.',
      'Nostr relays (relay.damus.io, nos.lol, relay.primal.net, nostr.mom) pass encrypted connection setup messages.',
      'Google STUN helps find a direct path.',
      'Cloudflare relays calls (encrypted) when no direct path exists.',
    ],
    after: [
      'Each one follows its own privacy policy. The person you talk to can also see your IP address on a direct '
      + 'connection, which shows roughly where you are.',
    ],
  },
  {
    title: 'Donations',
    paragraphs: [
      'Donations are voluntary gifts to support development. They don\'t buy any service, feature, guarantee or '
      + 'support.',
    ],
  },
];
