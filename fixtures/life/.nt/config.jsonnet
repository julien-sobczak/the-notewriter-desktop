local nt = import 'nt.libsonnet';

local srsAlgorithmSettings = {
  easeFactor: 2.5,
};

{
  attributes: nt.DefaultAttributes {
    steps: {
      name: 'steps',
      description: 'Number of steps per day',
      type: 'integer',
      min: 0,
      max: 100000,
      shorthandPattern: '🥾 (\\d+)',
      dailyMetrics: true,
    },
    meditation: {
      name: 'meditation',
      description: 'Completed a meditation session',
      type: 'boolean',
      shorthands: {
        "🧘": true,
      },
      dailyMetrics: true,
    },
  },
  noteTypes: nt.DefaultNoteTypes {
    Journal: nt.DefaultNoteTypes.Journal {
      attributes: [
        {
          name: "date",
          required: true,
        },
        {
          name: "steps",
          promoteInline: true,
        },
        {
          name: "meditation",
          promoteInline: true,
        }
      ],
    },
    BookReview: nt.DefaultNoteTypes.Note {
      name: 'BookReview',
      hooks: ['blog_review'],
    },
    Feature: nt.DefaultNoteTypes.Task {
      name: 'Feature',
    },
  },

  searches: {
    favoriteQuotes: {
      title: 'Favorite Quotes',
      q: '-#ignore @object:quote',
    },
  },

  decks: [
    {
      name: 'Programming',
      query: 'path:skills/programming',
      newFlashcardsPerDay: 10,
      algorithmSettings: srsAlgorithmSettings,
    },
    {
      name: 'Learning',
      query: 'path:skills/learning',
      newFlashcardsPerDay: 10,
      algorithmSettings: srsAlgorithmSettings,
    },
  ],
}
