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

  queries: {
    favoriteQuotes: {
      title: 'Favorite Quotes',
      q: '-#ignore @type:quote',
    },
    dailyQuote: {
      title: 'Daily Quote',
      q: 'path:references @type:Quote',
      tags: ['daily-quote'],
    },
    inspirationLife: {
      title: 'Life',
      q: 'path:references/quotes (#life or #life-changing) @type:Quote',
      tags: ['inspiration'],
    },
    inspirationArt: {
      title: 'Art',
      q: 'path:references/art @type:Artwork',
      tags: ['inspiration'],
    },
    sideProjects: {
      title: 'Side Projects',
      q: 'path:projects @title:Synopsis',
      tags: ['project'],
    },
    personalBacklog: {
      title: 'Personal Backlog',
      q: 'path:projects/ @type:Todo',
      tags: ['task'],
    },
    zenQuotes: {
      title: 'Zen Quotes',
      q: 'path:references @type:Quote',
      tags: ['zen'],
    },
    zenThoughts: {
      title: 'Zen Thoughts',
      q: 'path:thoughts',
      tags: ['zen'],
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

  journals: [
    {
      name: 'My Diary',
      path: 'journal/${year}/${year}-${month}-${day}.md',
      defaultContent: 'Journal: ${year}-${month}-${day}',
      routines: [
        {
          name: 'Morning Routine',
          template: |||
            # 💪 Affirmation

            <Affirmation wikilink="journaling#List: Affirmations" tags="success,optimism" />

            # ✍️ Morning Pages

            <MorningPages throwAway />

            # 😘 Gratitude Journal

            3 things I appreciate:

            * <Input />
            * <Input />
            * <Input />

            # 🤔 Prompt

            <Prompt wikilink="journaling#List: Prompts" />

            # 🎯 My BIG thing for today

            <Input />
          |||,
        },
        {
          name: 'Shutdown Routine',
          template: |||
            # ❓ How was my day? Why?

            <Input />

            # 📋 3+1 tasks to complete tomorrow:

            * [ ] <Input /> (work)
            * [ ] <Input />
            * [ ] <Input />
            * [ ] <Input />
          |||,
        },
      ],
    },
  ],

  desks: [
    {
      name: 'My Project',
      root: {
        layout: 'vertical',  // vertical | horizontal | container (default)
        elements: [
          {
            name: 'Notes',
            size: '70%',
            query: 'path:projects/the-notewriter (@type:Note)',
          },
          {
            layout: 'horizontal',
            elements: [
              {
                name: 'Backlog',
                query: 'path:projects/the-notewriter @type:Todo @title:Backlog',
                view: 'single',  // single | grid (default) | list | free
                size: '30%',
              },
              {
                name: 'Features',
                query: 'path:projects/the-notewriter (@type:Feature)',
              },
            ],
          },
        ],
      },
    },
  ],

  stats: [
    {
      name: 'Quotes by nationality',
      query: '@type:Quote',
      groupBy: 'nationality',
      visualization: 'pie',
    },
    {
      name: "Steps by day",
      query: "@type:Journal",
      groupBy: 'date',
      value: 'steps',
      visualization: 'calendar',
    },
    {
      name: "Steps by day",
      query: "@type:Journal",
      groupBy: 'date',
      value: 'steps',
      visualization: 'timeline',
    },
    {
      name: 'World Inspiration',
      query: '@type:Quote',
      groupBy: 'nationality',
      visualization: 'map',
      mapping: {
        # https://en.wikipedia.org/wiki/ISO_3166-1_alpha-3
        'Roman': 'ITA',
        'Greek': 'GRC',
        'German': 'DEU',
        'French': 'FRA',
        'American': 'USA',
        'English': 'GBR',
      },
    },
  ],
}
